/******************************************************************************
 * Copyright © 2013-2016 The KPL Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * KPL software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/

/**
 * @depends {krs.js}
 */
var krs = (function(krs, $) {

    function widgetVisibility(widget, depends) {
        if (krs.isApiEnabled(depends)) {
            widget.show();
        } else {
            widget.hide();
        }
    }

    $(window).load(function() {
        widgetVisibility($("#header_send_money"), { apis: [krs.constants.REQUEST_TYPES.sendMoney] });
        widgetVisibility($("#header_transfer_currency"), { apis: [krs.constants.REQUEST_TYPES.transferCurrency] });
        widgetVisibility($("#header_send_message"), { apis: [krs.constants.REQUEST_TYPES.sendMessage] });
        if (!krs.isCoinExchangePageAvailable()) {
            $("#exchange_menu_li").remove();
        }
        if (!krs.isExternalLinkVisible()) {
            $("#web_wallet_li").remove();
            $("#api_console_li").hide();
            $("#database_shell_li").hide();
        }
    });

    $("#refreshSearchIndex").on("click", function() {
        krs.sendRequest("luceneReindex", {
            adminPassword: krs.getAdminPassword()
        }, function (response) {
            if (response.errorCode) {
                $.growl(krs.escapeRespStr(response.errorDescription));
            } else {
                $.growl($.t("search_index_refreshed"));
            }
        })
    });

    $("#header_open_web_wallet").on("click", function() {
        if (java) {
            java.openBrowser(krs.accountRS);
        }
    });

    $("#ardor_distribution_modal").on("show.bs.modal", function() {
        krs.sendRequest("getFxtQuantity", {
            "account": krs.account
        }, function (response) {
            $("#ardor_distribution_start_height").html(response.distributionStart);
            $("#ardor_distribution_start_time").html(krs.getBlockHeightTimeEstimate(response.distributionStart));
            $("#ardor_distribution_end_height").html(response.distributionEnd);
            $("#ardor_distribution_end_time").html(krs.getBlockHeightTimeEstimate(response.distributionEnd));
            $("#ardor_distribution_current_balance").html(krs.formatQuantity(response.quantityQNT, 4));
            $("#ardor_distribution_expected_balance").html(krs.formatQuantity(response.totalExpectedQuantityQNT, 4));

            var duration;
            if (response.distributionStart > krs.lastBlockHeight) {
                duration = moment.duration(krs.getBlockHeightMoment(response.distributionStart).diff(moment()));
                $("#ardor_distribution_modal").find(".fomo_message").html($.t("distribution_starts_in", { interval: duration.humanize() }));
            } else {
                duration = moment.duration(krs.getBlockHeightMoment(response.distributionEnd).diff(moment()));
                $("#ardor_distribution_modal").find(".fomo_message").html($.t("distribution_ends_in", {interval: duration.humanize()}));
            }
        });
    });
    $("#client_status_modal").on("show.bs.modal", function() {
        if (krs.state.isLightClient) {
            $("#client_status_description").text($.t("light_client_description"));
        } else {
            $("#client_status_description").text($.t("api_proxy_description"));
        }
        if (krs.state.apiProxyPeer) {
            $("#client_status_remote_peer").val(String(krs.state.apiProxyPeer).escapeHTML());
            $("#client_status_set_peer").prop('disabled', true);
            $("#client_status_blacklist_peer").prop('disabled', false);
        } else {
            $("#client_status_remote_peer").val("");
            $("#client_status_set_peer").prop('disabled', false);
            $("#client_status_blacklist_peer").prop('disabled', true);
        }
    });

    $("#client_status_remote_peer").keydown(function() {
        if ($(this).val() == krs.state.apiProxyPeer) {
            $("#client_status_set_peer").prop('disabled', true);
            $("#client_status_blacklist_peer").prop('disabled', false);
        } else {
            $("#client_status_set_peer").prop('disabled', false);
            $("#client_status_blacklist_peer").prop('disabled', true);
        }
    });

    krs.forms.setAPIProxyPeer = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        data.adminPassword = krs.getAdminPassword();
        return {
            "data": data
        };
    };

    krs.forms.setAPIProxyPeerComplete = function(response) {
        var announcedAddress = response.announcedAddress;
        if (announcedAddress) {
            krs.state.apiProxyPeer = announcedAddress;
            $.growl($.t("remote_peer_updated", { peer: String(announcedAddress).escapeHTML() }));
        } else {
            $.growl($.t("remote_peer_selected_by_server"));
        }
        krs.updateDashboardMessage();
    };

    krs.forms.blacklistAPIProxyPeer = function ($modal) {
        var data = krs.getFormData($modal.find("form:first"));
        data.adminPassword = krs.getAdminPassword();
        return {
            "data": data
        };
    };

    krs.forms.blacklistAPIProxyPeerComplete = function(response) {
        if (response.done) {
            krs.state.apiProxyPeer = null;
            $.growl($.t("remote_peer_blacklisted"));
        }
        krs.updateDashboardMessage();
    };

    return krs;
}(krs || {}, jQuery));