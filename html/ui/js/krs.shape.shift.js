/**
 * @depends {krs.js}
 */
var krs = (function(krs, $) {
    var DEPOSIT_ADDRESSES_KEY = "shapeshift.depositAddresses.";
    var SUPPORTED_COINS = {};

    var coinToPair = function (op, coin) {
        return (op == "buy") ? "KPL-_" + coin : coin + "_KPL";
    };

    var pairToCoin = function (pair) {
        if (pair.indexOf("KPL-_") == 0) {
            return pair.substring("KPL-_".length);
        }
        if (pair.indexOf("_KPL") == pair.length - "_KPL".length) {
            return pair.substring(0, pair.indexOf("_KPL"));
        }
        throw "illegal pair " + pair;
    };

    var reversePair = function (pair) {
        var pairParts = pair.split('_');
        return pairParts[1] + '_' + pairParts[0];
    };

    var getCoins = function() {
        var coins = [];
        for (var i=0; i<3; i++) {
            coins.push(krs.settings["exchange_coin" + i]);
        }
        return coins;
    };

    var setCoins = function(coins) {
        for (var i=0; i<coins.length; i++) {
            krs.updateSettings("exchange_coin" + i, coins[i]);
        }
    };

    var addDepositAddress = function(address, pair) {
        var json = localStorage[DEPOSIT_ADDRESSES_KEY + krs.accountRS];
        var addresses;
        if (json == undefined) {
            addresses = [];
        } else {
            addresses = JSON.parse(json);
            if (addresses.length > 5) {
                addresses.splice(5, addresses.length - 5);
            }
        }
        addresses.splice(0, 0, { address: address, pair: pair, time: Date.now() });
        krs.logConsole("deposit address " + address + " pair " + pair + " added");
        localStorage[DEPOSIT_ADDRESSES_KEY + krs.accountRS] = JSON.stringify(addresses);
    };

    var apiCall = function(action, requestData, method, doneCallback, ignoreError, modal) {
        krs.logConsole("api call action: " + action + " ,data: " + JSON.stringify(requestData) + " ,method: " + method +
            (ignoreError ? " ignore " + ignoreError : "") + (modal ? " modal " + modal : ""));
        $.ajax({
            url: krs.settings.exchange_url + action,
            crossDomain: true,
            dataType: "json",
            type: method,
            timeout: 30000,
            async: true,
            data: requestData
        }).done(function(response, status) {
            if (status != "success") {
                krs.logConsole(action + ' status ' + status);
                if (modal) {
                    krs.showModalError(status, modal);
                }
            }
            if (response.error) {
                var error = response.error;
                var msg;
                if (error.code) {
                    msg = ' code ' + error.code + ' errno ' + error.errno + ' syscall ' + error.syscall;
                    krs.logConsole(action + msg);
                } else {
                    msg = error;
                    krs.logConsole(action + ' error ' + error);
                }
                if (ignoreError === false) {
                    return;
                }
                if (modal) {
                    krs.showModalError(msg, modal);
                }
                if (action.indexOf("txStat/") != 0 && action.indexOf("cancelpending") != 0) {
                    $("#shape_shift_status").html($.t("error"));
                }
            }
            doneCallback(response);
        }).fail(function (xhr, textStatus, error) {
            var message = "Request failed, action " + action + " method " + method + " status " + textStatus + " error " + error;
            krs.logConsole(message);
            throw message;
        })
    };

    function invert(rate) {
        return Math.round(100000000 / parseFloat(rate)) / 100000000;
    }

    var renderExchangeTable = function (op) {
        var coins = getCoins();
        var tasks = [];
        for (var i = 0; i < coins.length; i++) {
            tasks.push((function (i) {
                return function (callback) {
                    krs.logConsole("marketinfo iteration " + i);
                    var pair = coinToPair(op, coins[i]);
                    var counterPair = reversePair(pair);
                    krs.logConsole("counterPair " + counterPair);
                    async.waterfall([
                        function(callback) {
                            apiCall("marketinfo/" + pair, {}, "GET", function(data) {
                                callback(data.error, data);
                            })
                        },
                        function(marketInfoData, callback) {
                            var amount = 100;
                            if (op == "buy") {
                                amount = amount * marketInfoData.rate;
                            }
                            apiCall("sendamount", { "amount": amount, "pair": pair}, "POST", function(data) {
                                if (data.success && data.success.quotedRate) {
                                    marketInfoData.quotedRate = data.success.quotedRate;
                                } else {
                                    marketInfoData.quotedRate = 0;
                                }
                                callback(null, marketInfoData);
                            })
                        }
                    ], function(err, data){
                        if (err) {
                            callback(err, err);
                            return;
                        }
                        var row = "";
                        row += "<tr>";
                        row += "<td>" + SUPPORTED_COINS[coins[i]].name + " " +
                            "<img src='" + SUPPORTED_COINS[coins[i]].image + "' width='16px' height='16px'/>" +
                        "</td>";
                        row += "<td>" + coins[i] + "</td>";
                        var rate, quotedRate, diff;
                        if (op == "sell") {
                            if (parseFloat(data.rate) == 0) {
                                rate = "N/A";
                            } else {
                                rate = invert(data.rate);
                            }
                            if (parseFloat(data.quotedRate) == 0) {
                                quotedRate = "N/A";
                                diff = "N/A";
                            } else {
                                quotedRate = invert(data.quotedRate);
                                diff = -100 * (quotedRate - rate) / rate;
                            }
                        } else {
                            rate = data.rate;
                            if (parseFloat(data.quotedRate) == 0) {
                                quotedRate = "N/A";
                                diff = "N/A";
                            } else {
                                quotedRate = data.quotedRate;
                                diff = 100 * (quotedRate - rate) / rate;
                            }
                        }
                        row += "<td>" + String(rate).escapeHTML() + "</td>";
                        row += "<td>" + String(quotedRate).escapeHTML() + "</td>";
                        row += "<td>" + krs.formatAmount(diff, 2) + "%</td>";
                        row += "<td><a href='#' class='btn btn-xs btn-default' data-18n='shift' data-toggle='modal' data-target='#m_shape_shift_" + op + "_modal' " +
                            "data-pair='" + pair + "' data-rate='" + data.rate + "' data-min='" + data.minimum + "' data-max='" + data.limit +
                            "' data-fee='" + data.minerFee + "'>Shift</a>";
                        row += "<a href='#' class='btn btn-xs btn-default' data-18n='send_amount' data-toggle='modal' data-target='#m_send_amount_" + op + "_modal' " +
                            "data-pair='" + pair + "' data-rate='" + data.rate + "' data-min='" + data.minimum + "' data-max='" + data.limit +
                            "' data-fee='" + data.minerFee + "'>Send Amount</a></td>";
                        row += "</tr>";
                        krs.logConsole(row);
                        callback(null, row);
                    });
                }
            })(i));
        }
        krs.logConsole(tasks.length + " tasks ready to run");
        async.series(tasks, function (err, results) {
            var table = $("#p_shape_shift_" + op + "_KPL");
            if (err) {
                krs.logConsole("Err: ", err, "\nResults:", results);
                table.find("tbody").empty();
                krs.dataLoadFinished(table);
                return;
            }
            krs.logConsole("results", results);
            var rows = "";
            for (i = 0; i < results.length; i++) {
                rows += results[i];
            }
            krs.logConsole("rows " + rows);
            table.find("tbody").empty().append(rows);
            krs.dataLoadFinished(table);
        });
    };

    var getAddressLink = function (address, coin) {
        if (coin == "kpl") {
            return krs.getAccountLink({ accountRS: address }, "account");
        }
        if (coin == "BTC") {
            return "<a target='_blank' href='https://blockchain.info/address/" + address + "'>" + address + "</a>";
        }
        return address;
    };

    var getTransactionLink = function (transaction, coin) {
        if (coin == "kpl") {
            return "<a href='#' class='show_transaction_modal_action' data-transaction='" + transaction + "'>" + transaction + "</a>";
        }
        if (coin == "BTC") {
            return "<a target='_blank' href='https://blockchain.info/tx/" + transaction + "'>" + transaction + "</a>";
        }
        return transaction;
    };

    var renderMyExchangesTable = function () {
        var depositAddressesJSON = localStorage[DEPOSIT_ADDRESSES_KEY + krs.accountRS];
        var depositAddresses = [];
        if (depositAddressesJSON) {
            depositAddresses = JSON.parse(depositAddressesJSON);
        }
        var tasks = [];
        var empty = "<td></td>";
        for (var i = 0; i < depositAddresses.length; i++) {
            tasks.push((function (i) {
                return function (callback) {
                    krs.logConsole("txStat iteration " + i);
                    apiCall("txStat/" + depositAddresses[i].address, {}, "GET", function(data) {
                        var row = "";
                        row += "<tr>";
                        row += "<td>" + krs.formatTimestamp(depositAddresses[i].time, false, true) + "</td>";
                        row += "<td>" + data.status + "</td>";
                        if (data.status == "failed") {
                            row += "<td>" + data.error + "</td>";
                            row += empty + empty + empty + empty + empty + empty;
                            krs.logConsole(row);
                            callback(null, row);
                            return;
                        }
                        row += "<td>" + getAddressLink(data.address, depositAddresses[i].pair.split('_')[0]) + "</td>";
                        if (data.status == "no_deposits") {
                            row += empty + empty + empty + empty + empty + empty;
                            krs.logConsole(row);
                            callback(null, row);
                            return;
                        }
                        row += "<td>" + data.incomingCoin + "</td>";
                        row += "<td>" + data.incomingType + "</td>";
                        if (data.status == "received") {
                            row += empty + empty + empty + empty;
                            krs.logConsole(row);
                            callback(null, row);
                            return;
                        }
                        row += "<td>" + getAddressLink(data.withdraw, depositAddresses[i].pair.split('_')[1]) + "</td>";
                        row += "<td>" + data.outgoingCoin + "</td>";
                        row += "<td>" + data.outgoingType + "</td>";
                        row += "<td>" + getTransactionLink(data.transaction, depositAddresses[i].pair.split('_')[1]) + "</td>";
                        krs.logConsole(row);
                        callback(null, row);
                    }, true);
                }
            })(i));
        }
        krs.logConsole(tasks.length + " tasks ready to run");
        var table = $("#p_shape_shift_my_table");
        if (tasks.length == 0) {
            table.find("tbody").empty();
            krs.dataLoadFinished(table);
        }
        async.series(tasks, function (err, results) {
            if (err) {
                krs.logConsole("Err: ", err, "\nResults:", results);
                table.find("tbody").empty();
                krs.dataLoadFinished(table);
                return;
            }
            krs.logConsole("results", results);
            var rows = "";
            for (i = 0; i < results.length; i++) {
                rows += results[i];
            }
            krs.logConsole("rows " + rows);
            table.find("tbody").empty().append(rows);
            krs.dataLoadFinished(table);
        });
    };

    function renderRecentTable() {
        apiCall('recenttx/50', {}, 'GET', function (data) {
            krs.logConsole("recent");
            var rows = "";
            if (data) {
                for (var i = 0; i < data.length; i++) {
                    var transaction = data[i];
                    if (String(transaction.curIn).escapeHTML() != "kpl" && String(transaction.curOut).escapeHTML() != "kpl") {
                        continue;
                    }
                    rows += "<tr>";
                    rows += "<td>" + String(transaction.curIn).escapeHTML() + "</td>";
                    rows += "<td>" + String(transaction.curOut).escapeHTML() + "</td>";
                    rows += "<td>" + krs.formatTimestamp(1000 * transaction.timestamp, false, true) + "</td>";
                    rows += "<td>" + transaction.amount + "</td>";
                    rows += "</tr>";
                }
            }
            krs.logConsole("recent rows " + rows);
            var table = $("#p_shape_shift_table");
            table.find("tbody").empty().append(rows);
            krs.dataLoadFinished(table);
        });
    }

    function renderKPLLimit() {
        apiCall('limit/KPL_btc', {}, 'GET', function (data) {
            krs.logConsole("limit1 " + data.limit);
            if (data.limit) {
                $('#shape_shift_status').html($.t('ok'));
                $('#shape_shift_KPL_avail').html(String(data.limit).escapeHTML());
            }
        });
    }

    function loadCoins() {
        var inputFields = [];
        inputFields.push($('#shape_shift_coin_0'));
        inputFields.push($('#shape_shift_coin_1'));
        inputFields.push($('#shape_shift_coin_2'));
        var selectedCoins = [];
        selectedCoins.push(krs.settings.exchange_coin0);
        selectedCoins.push(krs.settings.exchange_coin1);
        selectedCoins.push(krs.settings.exchange_coin2);
        apiCall('getcoins', {}, 'GET', function (data) {
            SUPPORTED_COINS = data;
            for (var i = 0; i < inputFields.length; i++) {
                inputFields[i].empty();
                var isSelectionAvailable = false;
                $.each(data, function (code, coin) {
                    if (code != 'KPL' && coin['status'] == 'available') {
                        inputFields[i].append('<option value="' + code + '">' + coin['name'] + ' [' + code + ']</option>');
                        SUPPORTED_COINS[code] = coin;
                    }
                    if (selectedCoins[i] == code) {
                        isSelectionAvailable = true;
                    }
                });
                if (isSelectionAvailable) {
                    inputFields[i].val(selectedCoins[i]);
                }
            }
        });
    }
    
    krs.pages.exchange = function() {
        var exchangeDisabled = $("#exchange_disabled");
        var exchangePageHeader = $("#exchange_page_header");
        var exchangePageContent = $("#exchange_page_content");
        if (krs.settings.exchange != "1") {
			exchangeDisabled.show();
            exchangePageHeader.hide();
            exchangePageContent.hide();
            return;
		}
        exchangeDisabled.hide();
        exchangePageHeader.show();
        exchangePageContent.show();
        krs.pageLoading();
        loadCoins();
        renderKPLLimit();
        renderExchangeTable("buy");
        renderExchangeTable("sell");
        renderMyExchangesTable();
        renderRecentTable();
        krs.pageLoaded();
        setTimeout(refreshPage, 60000);
    };

    refreshPage = function() {
        if (krs.currentPage == "exchange") {
            krs.pages.exchange();
        }
    };

    $("#accept_exchange_link").on("click", function(e) {
   		e.preventDefault();
   		krs.updateSettings("exchange", "1");
        krs.pages.exchange();
   	});

    $("#clear_my_exchanges").on("click", function(e) {
   		e.preventDefault();
   		localStorage.removeItem(DEPOSIT_ADDRESSES_KEY + krs.accountRS);
        renderMyExchangesTable();
   	});

    krs.getFundAccountLink = function() {
        return '';
        /*
        return "<div class='callout callout-danger'>" +
            "<span>" + $.t("fund_account_warning_1") + "</span><br>" +
            "<span>" + $.t("fund_account_warning_2") + "</span><br>" +
            "<span>" + $.t("fund_account_warning_3") + "</span><br>" +
            "</div>" +
            "<a href='#' class='btn btn-xs btn-default' data-toggle='modal' data-target='#m_send_amount_sell_modal' " +
            "data-pair='BTC_KPL'>" + $.t("fund_account_message") + "</a>";
            */
    };

    $('.coin-select').change(function() {
        var id = $(this).attr('id');
        var coins = getCoins();
        coins[parseInt(id.slice(-1))] = $(this).val();
        setCoins(coins);
        renderExchangeTable('buy');
        renderExchangeTable('sell');
    });

	krs.setup.exchange = function() {
        // Do not implement connection to a 3rd party site here to prevent privacy leak
    };

    $("#m_shape_shift_buy_modal").on("show.bs.modal", function (e) {
        var invoker = $(e.relatedTarget);
        var pair = invoker.data("pair");
        $("#m_shape_shift_buy_pair").val(pair);
        var coin = pairToCoin(pair);
        krs.logConsole("modal invoked pair " + pair + " coin " + coin);
        $("#m_shape_shift_buy_title").html($.t("exchange_KPL_to_coin_shift", { coin: coin }));
        $("#m_shape_shift_buy_min").val(invoker.data("min"));
        $("#m_shape_shift_buy_min_coin").html("kpl");
        $("#m_shape_shift_buy_max").val(invoker.data("max"));
        $("#m_shape_shift_buy_max_coin").html("kpl");
        $("#m_shape_shift_buy_rate").val(invoker.data("rate"));
        $("#m_shape_shift_buy_rate_text").html("KPL-/" + coin);
        $("#m_shape_shift_withdrawal_address_coin").html(coin);
        $("#m_shape_shift_buy_fee").val(invoker.data("fee"));
        $("#m_shape_shift_buy_fee_coin").html(coin);
    });

    $("#m_shape_shift_buy_submit").on("click", function(e) {
        e.preventDefault();
        var modal = $(this).closest(".modal");
        var amountNQT = krs.convertToNQT($("#m_shape_shift_buy_amount").val());
        var withdrawal = $("#m_shape_shift_buy_withdrawal_address").val();
        var pair = $("#m_shape_shift_buy_pair").val();
        krs.logConsole('shift withdrawal ' + withdrawal + " pair " + pair);
        apiCall('shift', {
            withdrawal: withdrawal,
            pair: pair,
            returnAddress: krs.accountRS,
            apiKey: krs.settings.exchange_api_key
        }, 'POST', function (data) {
            krs.logConsole("shift response");
            var msg;
            if (data.error) {
                return;
            }
            if (data.depositType != "kpl") {
                msg = "incorrect deposit coin " + data.depositType;
                krs.logConsole(msg);
                krs.showModalError(msg, modal);
                return;
            }
            if (data.withdrawalType != pairToCoin(pair)) {
                msg = "incorrect withdrawal coin " + data.withdrawalType;
                krs.logConsole(msg);
                krs.showModalError(msg, modal);
                return;
            }
            if (data.withdrawal != withdrawal) {
                msg = "incorrect withdrawal address " + data.withdrawal;
                krs.logConsole(msg);
                krs.showModalError(msg, modal);
                return;
            }
            krs.logConsole("shift request done, deposit address " + data.deposit);
            krs.sendRequest("sendMoney", {
                "recipient": data.deposit,
                "amountNQT": amountNQT,
                "secretPhrase": $("#m_shape_shift_buy_password").val(),
                "deadline": "1440",
                "feeNQT": krs.convertToNQT(1)
            }, function (response) {
                if (response.errorCode) {
                    krs.logConsole("sendMoney response " + response.errorCode + " " + response.errorDescription.escapeHTML());
                    krs.showModalError(krs.translateServerError(response), modal);
                    return;
                }
                addDepositAddress(data.deposit, pair);
                renderMyExchangesTable();
                $("#m_shape_shift_buy_passpharse").val("");
                modal.modal("hide");
            })
        }, true, modal);
    });

    $("#m_send_amount_buy_modal").on("show.bs.modal", function (e) {
        var invoker = $(e.relatedTarget);
        var pair = invoker.data("pair");
        var coin = pairToCoin(pair);
        krs.logConsole("modal invoked pair " + pair + " coin " + coin);
        $("#m_send_amount_buy_title").html($.t("exchange_KPL_to_coin_send_amount", { coin: coin }));
        $("#m_send_amount_buy_withdrawal_amount_coin").html(coin);
        $("#m_send_amount_buy_rate_text").html("KPL-/" + coin);
        $("#m_send_amount_withdrawal_address_coin").html(coin + " address");
        $("#m_send_amount_buy_fee_coin").html(coin);
        $("#m_send_amount_buy_pair").val(pair);
        $("#m_send_amount_buy_submit").prop('disabled', true);
    });

    $('#m_send_amount_buy_withdrawal_amount, #m_send_amount_buy_withdrawal_address').change(function () {
        var modal = $(this).closest(".modal");
        var amount = $('#m_send_amount_buy_withdrawal_amount').val();
        var withdrawal = $('#m_send_amount_buy_withdrawal_address').val();
        var pair = $("#m_send_amount_buy_pair").val();
        var buySubmit = $("#m_send_amount_buy_submit");
        buySubmit.prop('disabled', true);
        if (amount == "" || withdrawal == "") {
            return;
        }
        modal.css('cursor','wait');
        apiCall('sendamount', {
            amount: amount,
            withdrawal: withdrawal,
            pair: pair,
            apiKey: krs.settings.exchange_api_key
        }, "POST", function(data) {
            try {
                var rate = $("#m_send_amount_buy_rate");
                var fee = $("#m_send_amount_buy_fee");
                var depositAmount = $("#m_send_amount_buy_deposit_amount");
                var depositAddress = $("#m_send_amount_buy_deposit_address");
                var expiration = $("#m_send_amount_buy_expiration");
                if (data.error) {
                    rate.val("");
                    fee.val("");
                    depositAmount.val("");
                    depositAddress.val("");
                    expiration.val("");
                    buySubmit.prop('disabled', true);
                    return;
                }
                if (amount != data.success.withdrawalAmount) {
                    krs.showModalError("amount returned from shapeshift " + data.success.withdrawalAmount +
                    " differs from requested amount " + amount, modal);
                    return;
                }
                if (withdrawal != data.success.withdrawal) {
                    krs.showModalError("withdrawal address returned from shapeshift " + data.success.withdrawal +
                    " differs from requested address " + withdrawal, modal);
                    return;
                }
                modal.find(".error_message").html("").hide();
                rate.val(data.success.quotedRate);
                fee.val(data.success.minerFee);
                // add 1 KPL fee to make sure the net amount is what requested by shape shift
                depositAmount.val(parseFloat(data.success.depositAmount) + 1);
                depositAddress.val(data.success.deposit);
                expiration.val(krs.formatTimestamp(data.success.expiration, false, true));
                buySubmit.prop('disabled', false);
            } finally {
                modal.css('cursor', 'default');
            }
        }, true, modal)
    });

    $("#m_send_amount_buy_submit").on("click", function(e) {
        e.preventDefault();
        var modal = $(this).closest(".modal");
        var pair = $("#m_send_amount_buy_pair").val();
        var depositAddress = $("#m_send_amount_buy_deposit_address").val();
        krs.logConsole("pay request submitted, deposit address " + depositAddress);
        var amountNQT = krs.convertToNQT($("#m_send_amount_buy_deposit_amount").val());
        krs.sendRequest("sendMoney", {
            "recipient": depositAddress,
            "amountNQT": amountNQT,
            "secretPhrase": $("#m_send_amount_buy_password").val(),
            "deadline": "1440",
            "feeNQT": krs.convertToNQT(1)
        }, function (response) {
            if (response.errorCode) {
                krs.logConsole('sendMoney error ' + response.errorDescription.escapeHTML());
                krs.showModalError(response.errorDescription.escapeHTML(), modal);
                return;
            }
            addDepositAddress(depositAddress, pair);
            renderMyExchangesTable();
            $("#m_send_amount_buy_passpharse").val("");
            modal.modal("hide");
        });
    });

    $("#m_shape_shift_sell_modal").on("show.bs.modal", function (e) {
        var invoker = $(e.relatedTarget);
        var modal = $(this).closest(".modal");
        var pair = invoker.data("pair");
        var coin = pairToCoin(pair);
        krs.logConsole("modal invoked pair " + pair + " coin " + coin);
        $("#m_shape_shift_sell_title").html($.t("exchange_coin_to_KPL_shift", { coin: coin }));
        $("#m_shape_shift_sell_qr_code").html("");
        var data = invoker.data;
        modal.css('cursor','wait');
        async.waterfall([
            function(callback) {
                if (data.rate) {
                    callback(null);
                } else {
                    apiCall("marketinfo/" + pair, {}, "GET", function(response) {
                        data.rate = response.rate;
                        data.min = response.minimum;
                        data.max = response.limit;
                        data.fee = response.minerFee;
                        callback(null);
                    })
                }
            },
            function(callback) {
                $("#m_shape_shift_sell_min").val(data.min);
                $("#m_shape_shift_sell_min_coin").html(coin);
                $("#m_shape_shift_sell_max").val(data.max);
                $("#m_shape_shift_sell_max_coin").html(coin);
                $("#m_shape_shift_sell_rate").val(data.rate);
                $("#m_shape_shift_sell_rate_text").html(coin + "/KPL");
                $("#m_shape_shift_sell_fee").val(data.fee);
                $("#m_shape_shift_sell_fee_coin").html("kpl");
                $("#m_shape_shift_sell_pair").val(pair);
                var publicKey = krs.publicKey;
                if (publicKey == "" && krs.accountInfo) {
                    publicKey = krs.accountInfo.publicKey;
                }
                if (!publicKey || publicKey == "") {
                    krs.showModalError("Account has no public key, please login using your passphrase", modal);
                    return;
                }
                apiCall('shift', {
                    withdrawal: krs.accountRS,
                    rsAddress: publicKey,
                    pair: pair,
                    apiKey: krs.settings.exchange_api_key
                }, "POST", function (data) {
                    krs.logConsole("shift request done");
                    var msg;
                    if (data.depositType != coin) {
                        msg = "incorrect deposit coin " + data.depositType;
                        krs.logConsole(msg);
                        krs.showModalError(msg, modal);
                        callback(null);
                        return;
                    }
                    if (data.withdrawalType != "kpl") {
                        msg = "incorrect withdrawal coin " + data.withdrawalType;
                        krs.logConsole(msg);
                        krs.showModalError(msg, modal);
                        callback(null);
                        return;
                    }
                    if (data.withdrawal != krs.accountRS) {
                        msg = "incorrect withdrawal address " + data.withdrawal;
                        krs.logConsole(msg);
                        krs.showModalError(msg, modal);
                        callback(null);
                        return;
                    }
                    krs.logConsole("shift request done, deposit address " + data.deposit);
                    $("#m_shape_shift_sell_deposit_address").html(data.deposit);
                    krs.sendRequestQRCode("#m_shape_shift_sell_qr_code", data.deposit, 125, 125);
                    callback(null);
                })
            }
        ], function (err, result) {
            modal.css('cursor', 'default');
        })
    });

    $("#m_shape_shift_sell_done").on("click", function(e) {
        e.preventDefault();
        var pair = $("#m_shape_shift_sell_pair").val();
        var deposit = $("#m_shape_shift_sell_deposit_address").html();
        if (deposit != "") {
            addDepositAddress(deposit, pair);
            renderMyExchangesTable();
            $(this).closest(".modal").modal("hide");
        }
    });

    $("#m_shape_shift_sell_cancel").on("click", function(e) {
        e.preventDefault();
        var deposit = $("#m_shape_shift_sell_deposit_address").html();
        if (deposit != "") {
            apiCall('cancelpending', { address: deposit }, 'POST', function(data) {
                var msg = data.success ? data.success : data.err;
                krs.logConsole("sell cancelled response: " + msg);
            })
        }
    });
/*
    $("#m_send_amount_sell_modal").on("show.bs.modal", function (e) {
        var invoker = $(e.relatedTarget);
        var modal = $(this).closest(".modal");
        var pair = invoker.data("pair");
        var coin = pairToCoin(pair);
        krs.logConsole("modal invoked pair " + pair + " coin " + coin);
        $("#m_send_amount_sell_title").html($.t("exchange_coin_to_KPL_send_amount", { coin: coin }));
        $("#m_send_amount_sell_rate_text").html("KPL-/" + coin);
        $("#m_send_amount_sell_fee_coin").html("kpl");
        $("#m_send_amount_sell_withdrawal_amount_coin").html("kpl");
        $("#m_send_amount_sell_deposit_amount_coin").html(coin);
        $("#m_send_amount_sell_deposit_address").html("");
        $("#m_send_amount_sell_qr_code").html("");
        $("#m_send_amount_sell_pair").val(pair);
        $("#m_send_amount_sell_done").prop('disabled', true);
    });
*/
    $('#m_send_amount_sell_withdrawal_amount').change(function () {
        var modal = $(this).closest(".modal");
        var amount = $('#m_send_amount_sell_withdrawal_amount').val();
        var pair = $('#m_send_amount_sell_pair').val();
        $("#m_send_amount_sell_done").prop('disabled', true);
        var publicKey = krs.publicKey;
        if (publicKey == "" && krs.accountInfo) {
            publicKey = krs.accountInfo.publicKey;
        }
        if (!publicKey || publicKey == "") {
            krs.showModalError("Account has no public key, please login using your passphrase", modal);
            return;
        }
        $("#m_send_amount_sell_qr_code").html("");
        modal.css('cursor','wait');
        apiCall('sendamount', { amount: amount, withdrawal: krs.accountRS, pubKey: publicKey, pair: pair, apiKey: krs.settings.exchange_api_key },
                "POST", function (data) {
            try {
                var rate = $("#m_send_amount_sell_rate");
                var fee = $("#m_send_amount_sell_fee");
                var depositAmount = $("#m_send_amount_sell_deposit_amount");
                var depositAddress = $("#m_send_amount_sell_deposit_address");
                var expiration = $("#m_send_amount_sell_expiration");
                if (data.error) {
                    rate.val("");
                    fee.val("");
                    depositAmount.val("");
                    depositAddress.html("");
                    expiration.val("");
                    return;
                }
                if (amount != data.success.withdrawalAmount) {
                    krs.showModalError("amount returned from shapeshift " + data.success.withdrawalAmount +
                    " differs from requested amount " + amount, modal);
                    return;
                }
                if (krs.accountRS != data.success.withdrawal) {
                    krs.showModalError("withdrawal address returned from shapeshift " + data.success.withdrawal +
                    " differs from requested address " + krs.accountRS, modal);
                    return;
                }
                modal.find(".error_message").html("").hide();
                rate.val(invert(data.success.quotedRate));
                fee.val(data.success.minerFee);
                depositAmount.val(parseFloat(data.success.depositAmount));
                depositAddress.html(data.success.deposit);
                expiration.val(krs.formatTimestamp(data.success.expiration, false, true));
                krs.logConsole("sendamount request done, deposit address " + data.success.deposit);
                krs.sendRequestQRCode("#m_send_amount_sell_qr_code", "bitcoin:" + data.success.deposit + "?amount=" + data.success.depositAmount, 125, 125);
                $("#m_send_amount_sell_done").prop('disabled', false);
            } finally {
                modal.css('cursor', 'default');
            }
        }, true, modal)
    });

    $("#m_send_amount_sell_done").on("click", function(e) {
        e.preventDefault();
        var pair = $("#m_send_amount_sell_pair").val();
        var deposit = $("#m_send_amount_sell_deposit_address").html();
        if (deposit != "") {
            addDepositAddress(deposit, pair);
            renderMyExchangesTable();
            $(this).closest(".modal").modal("hide");
        }
    });

    $("#m_send_amount_sell_cancel").on("click", function(e) {
        e.preventDefault();
        var deposit = $("#m_send_amount_sell_deposit_address").html();
        if (deposit != "") {
            apiCall('cancelpending', { address: deposit }, 'POST', function(data) {
                var msg = data.success ? data.success : data.err;
                krs.logConsole("sell cancelled response: " + msg);
            })
        }
    });

	return krs;
}(krs || {}, jQuery));