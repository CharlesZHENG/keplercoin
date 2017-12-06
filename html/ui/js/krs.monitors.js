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
    var currentMonitor;

    function isErrorResponse(response) {
        return response.errorCode || response.errorDescription || response.errorMessage || response.error;
    }

    function getErrorMessage(response) {
        return response.errorDescription || response.errorMessage || response.error;
    } 

    krs.jsondata = krs.jsondata||{};

    krs.jsondata.monitors = function (response) {
        return {
            accountFormatted: krs.getAccountLink(response, "account"),
            property: krs.escapeRespStr(response.property),
            amountFormatted: krs.formatAmount(response.amount),
            thresholdFormatted: krs.formatAmount(response.threshold),
            interval: krs.escapeRespStr(response.interval),
            statusLinkFormatted: "<a href='#' class='btn btn-xs' " +
                        "onclick='krs.goToMonitor(" + JSON.stringify(response) + ");'>" +
                         $.t("status") + "</a>",
            stopLinkFormatted: "<a href='#' class='btn btn-xs' data-toggle='modal' data-target='#stop_funding_monitor_modal' " +
                        "data-account='" + krs.escapeRespStr(response.accountRS) + "' " +
                        "data-property='" + krs.escapeRespStr(response.property) + "'>" + $.t("stop") + "</a>"
        };
    };

    krs.jsondata.monitoredAccount = function (response) {
        try {
            var value = JSON.parse(response.value);
        } catch (e) {
            krs.logConsole(e.message);
        }
        return {
            accountFormatted: krs.getAccountLink(response, "recipient"),
            property: krs.escapeRespStr(response.property),
            amountFormatted: (value && value.amount) ? "<b>" + krs.formatAmount(value.amount) : krs.formatAmount(currentMonitor.amount),
            thresholdFormatted: (value && value.threshold) ? "<b>" + krs.formatAmount(value.threshold) : krs.formatAmount(currentMonitor.threshold),
            intervalFormatted: (value && value.interval) ? "<b>" + krs.escapeRespStr(value.interval): krs.escapeRespStr(currentMonitor.interval),
            removeLinkFormatted: "<a href='#' class='btn btn-xs' data-toggle='modal' data-target='#remove_monitored_account_modal' " +
                        "data-recipient='" + krs.escapeRespStr(response.recipientRS) + "' " +
                        "data-property='" + krs.escapeRespStr(response.property) + "' " +
                        "data-value='" + krs.normalizePropertyValue(response.value) + "'>" + $.t("remove") + "</a>"
        };
    };

    krs.incoming.funding_monitors = function() {
        krs.loadPage("funding_monitors");
    };

    krs.pages.funding_monitors = function () {
        krs.hasMorePages = false;
        var view = krs.simpleview.get('funding_monitors_page', {
            errorMessage: null,
            isLoading: true,
            isEmpty: false,
            monitors: []
        });
        var params = {
            "account": krs.accountRS,
            "adminPassword": krs.getAdminPassword(),
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        };
        krs.sendRequest("getFundingMonitor", params,
            function (response) {
                if (isErrorResponse(response)) {
                    view.render({
                        errorMessage: getErrorMessage(response),
                        isLoading: false,
                        isEmpty: false
                    });
                    return;
                }
                if (response.monitors.length > krs.itemsPerPage) {
                    krs.hasMorePages = true;
                    response.monitors.pop();
                }
                view.monitors.length = 0;
                response.monitors.forEach(
                    function (monitorJson) {
                        view.monitors.push(krs.jsondata.monitors(monitorJson))
                    }
                );
                view.render({
                    isLoading: false,
                    isEmpty: view.monitors.length == 0
                });
                krs.pageLoaded();
            }
        )
    };

    krs.forms.startFundingMonitorComplete = function() {
        $.growl($.t("monitor_started"));
        krs.loadPage("funding_monitors");
    };

    $("#stop_funding_monitor_modal").on("show.bs.modal", function(e) {
        var $invoker = $(e.relatedTarget);
        var account = $invoker.data("account");
        if (account) {
            $("#stop_monitor_account").val(account);
        }
        var property = $invoker.data("property");
        if (property) {
            $("#stop_monitor_property").val(property);
        }
        if (krs.getAdminPassword()) {
            $("#stop_monitor_admin_password").val(krs.getAdminPassword());
        }
    });

    krs.forms.stopFundingMonitorComplete = function() {
        $.growl($.t("monitor_stopped"));
        krs.loadPage("funding_monitors");
    };

    krs.goToMonitor = function(monitor) {
   		krs.goToPage("funding_monitor_status", function() {
            return monitor;
        });
   	};

    krs.incoming.funding_monitors_status = function() {
        krs.loadPage("funding_monitor_status");
    };

    krs.pages.funding_monitor_status = function (callback) {
        currentMonitor = callback();
        $("#monitor_funding_account").html(krs.escapeRespStr((currentMonitor.account)));
        $("#monitor_control_property").html(krs.escapeRespStr(currentMonitor.property));
        krs.hasMorePages = false;
        var view = krs.simpleview.get('funding_monitor_status_page', {
            errorMessage: null,
            isLoading: true,
            isEmpty: false,
            monitoredAccount: []
        });
        var params = {
            "setter": currentMonitor.account,
            "property": currentMonitor.property,
            "firstIndex": krs.pageNumber * krs.itemsPerPage - krs.itemsPerPage,
            "lastIndex": krs.pageNumber * krs.itemsPerPage
        };
        krs.sendRequest("getAccountProperties", params,
            function (response) {
                if (isErrorResponse(response)) {
                    view.render({
                        errorMessage: getErrorMessage(response),
                        isLoading: false,
                        isEmpty: false
                    });
                    return;
                }
                if (response.properties.length > krs.itemsPerPage) {
                    krs.hasMorePages = true;
                    response.properties.pop();
                }
                view.monitoredAccount.length = 0;
                response.properties.forEach(
                    function (propertiesJson) {
                        view.monitoredAccount.push(krs.jsondata.monitoredAccount(propertiesJson))
                    }
                );
                view.render({
                    isLoading: false,
                    isEmpty: view.monitoredAccount.length == 0,
                    fundingAccountFormatted: krs.getAccountLink(currentMonitor, "account"),
                    controlProperty: currentMonitor.property
                });
                krs.pageLoaded();
            }
        )
    };

    $("#add_monitored_account_modal").on("show.bs.modal", function() {
        $("#add_monitored_account_property").val(currentMonitor.property);
        $("#add_monitored_account_amount").val(krs.convertToKPL(currentMonitor.amount));
        $("#add_monitored_account_threshold").val(krs.convertToKPL(currentMonitor.threshold));
        $("#add_monitored_account_interval").val(currentMonitor.interval);
        $("#add_monitored_account_value").val("");
    });

    $(".add_monitored_account_value").on('change', function() {
        if (!currentMonitor) {
            return;
        }
        var value = {};
        var amount = krs.convertToNQT($("#add_monitored_account_amount").val());
        if (currentMonitor.amount != amount) {
            value.amount = amount;
        }
        var threshold = krs.convertToNQT($("#add_monitored_account_threshold").val());
        if (currentMonitor.threshold != threshold) {
            value.threshold = threshold;
        }
        var interval = $("#add_monitored_account_interval").val();
        if (currentMonitor.interval != interval) {
            value.interval = interval;
        }
        if (jQuery.isEmptyObject(value)) {
            value = "";
        } else {
            value = JSON.stringify(value);
        }
        $("#add_monitored_account_value").val(value);
    });

    $("#remove_monitored_account_modal").on("show.bs.modal", function(e) {
        var $invoker = $(e.relatedTarget);
        $("#remove_monitored_account_recipient").val($invoker.data("recipient"));
        $("#remove_monitored_account_property").val($invoker.data("property"));
        $("#remove_monitored_account_value").val(krs.normalizePropertyValue($invoker.data("value")));
    });

    return krs;

}(krs || {}, jQuery));