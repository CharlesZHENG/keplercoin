/******************************************************************************
 * Copyright © 2013-2016 The Kpl Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * Kpl software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

package kpl.http;

import kpl.Constants;
import kpl.Kpl;
import kpl.peer.Peer;
import kpl.peer.Peers;
import kpl.util.Logger;
import kpl.util.ThreadPool;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

public class APIProxy {
    private static final APIProxy instance = new APIProxy();

    static final boolean enableAPIProxy = Constants.isLightClient ||
            (Kpl.getBooleanProperty("kpl.enableAPIProxy") && API.openAPIPort == 0 && API.openAPISSLPort == 0);
    private static final int blacklistingPeriod = Kpl.getIntProperty("kpl.apiProxyBlacklistingPeriod") / 1000;
    static final String forcedServerURL = Kpl.getStringProperty("kpl.forceAPIProxyServerURL", "");

    private volatile String forcedPeerHost;
    private volatile List<String> peersHosts = Collections.emptyList();
    private volatile String mainPeerAnnouncedAddress;

    private final ConcurrentHashMap<String, Integer> blacklistedPeers = new ConcurrentHashMap<>();

    private static final Runnable peersUpdateThread = () -> {
        int curTime = Kpl.getEpochTime();
        instance.blacklistedPeers.entrySet().removeIf((entry) -> {
            if (entry.getValue() < curTime) {
                Logger.logDebugMessage("Unblacklisting API peer " + entry.getKey());
                return true;
            }
            return false;
        });
        List<String> currentPeersHosts = instance.peersHosts;
        if (currentPeersHosts != null) {
            for (String host : currentPeersHosts) {
                Peer peer = Peers.getPeer(host);
                if (peer != null) {
                    Peers.connectPeer(peer);
                }
            }
        }
    };

    static {
        if (!Constants.isOffline && enableAPIProxy) {
            ThreadPool.scheduleThread("APIProxyPeersUpdate", peersUpdateThread, 60);
        }
    }

    private APIProxy() {

    }

    public static void init() {}

    public static APIProxy getInstance() {
        return instance;
    }

    Peer getServingPeer(String requestType) {
        if (forcedPeerHost != null) {
            return Peers.getPeer(forcedPeerHost);
        }

        APIEnum requestAPI = APIEnum.fromName(requestType);
        if (!peersHosts.isEmpty()) {
            for (String host : peersHosts) {
                Peer peer = Peers.getPeer(host);
                if (peer != null && peer.isApiConnectable() && !peer.getDisabledAPIs().contains(requestAPI)) {
                    return peer;
                }
            }
        }

        List<Peer> connectablePeers = Peers.getPeers(p -> p.isApiConnectable() && !blacklistedPeers.containsKey(p.getHost()));
        if (connectablePeers.isEmpty()) {
            return null;
        }
        // subset of connectable peers that have at least one new API enabled, which was disabled for the
        // The first peer (element 0 of peersHosts) is chosen at random. Next peers are chosen randomly from a
        // previously chosen peers. In worst case the size of peersHosts will be the number of APIs
        Peer peer = getRandomAPIPeer(connectablePeers);
        if (peer == null) {
            return null;
        }

        Peer resultPeer = null;
        List<String> currentPeersHosts = new ArrayList<>();
        EnumSet<APIEnum> disabledAPIs = EnumSet.noneOf(APIEnum.class);
        currentPeersHosts.add(peer.getHost());
        mainPeerAnnouncedAddress = peer.getAnnouncedAddress();
        if (!peer.getDisabledAPIs().contains(requestAPI)) {
            resultPeer = peer;
        }
        while (!disabledAPIs.isEmpty() && !connectablePeers.isEmpty()) {
            // remove all peers that do not introduce new enabled APIs
            connectablePeers.removeIf(p -> p.getDisabledAPIs().containsAll(disabledAPIs));
            peer = getRandomAPIPeer(connectablePeers);
            if (peer != null) {
                currentPeersHosts.add(peer.getHost());
                if (!peer.getDisabledAPIs().contains(requestAPI)) {
                    resultPeer = peer;
                }
                disabledAPIs.retainAll(peer.getDisabledAPIs());
            }
        }
        peersHosts = Collections.unmodifiableList(currentPeersHosts);
        Logger.logInfoMessage("Selected API peer " + resultPeer + " peer hosts selected " + currentPeersHosts);
        return resultPeer;
    }

    Peer setForcedPeer(Peer peer) {
        if (peer != null) {
            forcedPeerHost = peer.getHost();
            mainPeerAnnouncedAddress = peer.getAnnouncedAddress();
            return peer;
        } else {
            forcedPeerHost = null;
            mainPeerAnnouncedAddress = null;
            return getServingPeer(null);
        }
    }

    String getMainPeerAnnouncedAddress() {
        // The first client request GetBlockchainState is handled by the server
        // Not by the proxy. In order to report a peer to the client we have
        // To select some initial peer.
        if (mainPeerAnnouncedAddress == null) {
            Peer peer = getServingPeer(null);
            if (peer != null) {
                mainPeerAnnouncedAddress = peer.getAnnouncedAddress();
            }
        }
        return mainPeerAnnouncedAddress;
    }

    static boolean isActivated() {
        return Constants.isLightClient || (enableAPIProxy && Kpl.getBlockchainProcessor().isDownloading());
    }

    void blacklistHost(String host) {
        blacklistedPeers.put(host, Kpl.getEpochTime() + blacklistingPeriod);
        if (peersHosts.contains(host)) {
            peersHosts = Collections.emptyList();
            getServingPeer(null);
        }
    }

    private Peer getRandomAPIPeer(List<Peer> peers) {
        if (peers.isEmpty()) {
            return null;
        }
        int index = ThreadLocalRandom.current().nextInt(peers.size());
        return peers.remove(index);
    }
}
