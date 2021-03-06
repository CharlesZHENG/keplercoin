/******************************************************************************
 * Copyright © 2013-2016 The Nxt Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * Nxt software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @depends {krs.js}
 * @depends {krs.modals.js}
 */
var krs = (function(krs, $) {
	$("body").on("click", ".show_peer_modal_action", function(event) {
		event.preventDefault();
		if (krs.fetchingModalData) {
			return;
		}
		krs.fetchingModalData = true;
        var address = $(this).data("address");
        krs.sendRequest("getPeer", { peer: address }, function(peer) {
			krs.showPeerModal(peer);
		});
	});

    krs.showPeerModal = function(peer) {
        try {
            var peerDetails = $.extend({}, peer);
            if (peerDetails.hallmark && krs.isDecodePeerHallmark()) {
                var promise = new Promise(function(resolve, reject) {
                    krs.sendRequest("decodeHallmark", { hallmark: peerDetails.hallmark }, function(response) {
                        if (response.errorCode) {
                            reject(response);
                        } else {
                            resolve(response);
                        }
                    });
                });
                promise.then(function(response) {
                    var hallmark = peerDetails.hallmark;
                    delete peerDetails.hallmark;
                    peerDetails.hallmark = hallmark;
                    peerDetails.hallmarkAccount_formatted_html = krs.getAccountLink(response, "account");
                    peerDetails.hallmarkHost = response.host;
                    peerDetails.hallmarkPort = response.port;
                    peerDetails.hallmarkWeight = response.weight;
                    peerDetails.hallmarkDate = response.date;
                    peerDetails.hallmarkValid = response.valid;
                    showPeerModalImpl(peerDetails);
                }).catch(function(response) {
                    peerDetails.hallmarkError = response.errorDescription;
                    showPeerModalImpl(peerDetails);
                })
            } else {
                showPeerModalImpl(peerDetails);
            }
        } finally {
            krs.fetchingModalData = false;
        }
	};

    function showPeerModalImpl(peerDetails) {
        $("#peer_info").html(peerDetails.announcedAddress);
        peerDetails.state = krs.getPeerState(peerDetails.state);
        if (peerDetails.lastUpdated) {
            peerDetails.lastUpdated = krs.formatTimestamp(peerDetails.lastUpdated);
        }
        if (peerDetails.lastConnectAttempt) {
            peerDetails.lastConnectAttempt = krs.formatTimestamp(peerDetails.lastConnectAttempt);
        }
        peerDetails.downloaded_formatted_html = krs.formatVolume(peerDetails.downloadedVolume);
        delete peerDetails.downloadedVolume;
        peerDetails.uploaded_formatted_html = krs.formatVolume(peerDetails.uploadedVolume);
        delete peerDetails.uploadedVolume;
        var detailsTable = $("#peer_details_table");
        detailsTable.find("tbody").empty().append(krs.createInfoTable(peerDetails));
        detailsTable.show();
        $("#peer_modal").modal("show");
    }

	return krs;
}(krs || {}, jQuery));