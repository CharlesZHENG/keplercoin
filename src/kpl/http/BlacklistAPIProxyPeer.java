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

import kpl.kplException;
import kpl.peer.Peer;
import kpl.peer.Peers;
import kpl.util.Convert;
import org.json.simple.JSONObject;
import org.json.simple.JSONStreamAware;

import javax.servlet.http.HttpServletRequest;

import static kpl.http.JSONResponses.MISSING_PEER;
import static kpl.http.JSONResponses.UNKNOWN_PEER;

public class BlacklistAPIProxyPeer extends APIServlet.APIRequestHandler {

    static final BlacklistAPIProxyPeer instance = new BlacklistAPIProxyPeer();

    private BlacklistAPIProxyPeer() {
        super(new APITag[] {APITag.NETWORK}, "peer");
    }

    @Override
    protected JSONStreamAware processRequest(HttpServletRequest request) throws kplException {
        String peerAddress = Convert.emptyToNull(request.getParameter("peer"));
        if (peerAddress == null) {
            return MISSING_PEER;
        }
        Peer peer = Peers.findOrCreatePeer(peerAddress, true);
        JSONObject response = new JSONObject();
        if (peer == null) {
            return UNKNOWN_PEER;
        } else {
            APIProxy.getInstance().blacklistHost(peer.getHost());
            response.put("done", true);
        }

        return response;
    }

    @Override
    protected final boolean requirePost() {
        return true;
    }

    @Override
    protected boolean requirePassword() {
        return true;
    }

    @Override
    protected boolean allowRequiredBlockParameters() {
        return false;
    }

    @Override
    protected boolean requireBlockchain() {
        return false;
    }
}
