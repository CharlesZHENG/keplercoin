/******************************************************************************
 * Copyright © 2013-2016 The kpl Core Developers.                             *
 *                                                                            *
 * See the AUTHORS.txt, DEVELOPER-AGREEMENT.txt and LICENSE.txt files at      *
 * the top-level directory of this distribution for the individual copyright  *
 * holder information and the developer policies on copyright and licensing.  *
 *                                                                            *
 * Unless otherwise agreed in a custom licensing agreement, no part of the    *
 * kpl software, including this file, may be copied, modified, propagated,    *
 * or distributed except according to the terms contained in the LICENSE.txt  *
 * file.                                                                      *
 *                                                                            *
 * Removal or modification of this copyright notice is prohibited.            *
 *                                                                            *
 ******************************************************************************/
//Kiwi:Made
package kpl;

import java.util.Calendar;
import java.util.TimeZone;

public final class Constants {

    public static final boolean isTestnet = Kpl.getBooleanProperty("kpl.isTestnet");
    public static final boolean isOffline = Kpl.getBooleanProperty("kpl.isOffline");
    public static final boolean isLightClient = Kpl.getBooleanProperty("kpl.isLightClient");

    public static final int MAX_NUMBER_OF_TRANSACTIONS = 255;
    public static final int MIN_TRANSACTION_SIZE = 176;
    public static final int MAX_PAYLOAD_LENGTH = MAX_NUMBER_OF_TRANSACTIONS * MIN_TRANSACTION_SIZE;
    public static final long MAX_BALANCE_kpl = 150000000;
    public static final long ONE_kpl = 100000000;
    public static final long MAX_BALANCE_NQT = MAX_BALANCE_kpl * ONE_kpl;
    public static final long INITIAL_BASE_TARGET = 153722867;
    public static final long MAX_BASE_TARGET = MAX_BALANCE_kpl * INITIAL_BASE_TARGET;
    public static final long MAX_BASE_TARGET_2 = isTestnet ? MAX_BASE_TARGET : INITIAL_BASE_TARGET * 50;
    public static final long MIN_BASE_TARGET = INITIAL_BASE_TARGET * 9 / 10;
    public static final int MIN_BLOCKTIME_LIMIT = 53;
    public static final int MAX_BLOCKTIME_LIMIT = 67;
    public static final int BASE_TARGET_GAMMA = 64;
    public static final int MAX_ROLLBACK = Math.max(Kpl.getIntProperty("kpl.maxRollback"), 720);
    public static final int GUARANTEED_BALANCE_CONFIRMATIONS = isTestnet ? Kpl.getIntProperty("kpl.testnetGuaranteedBalanceConfirmations", 1440) : 1440;
    public static final int LEASING_DELAY = isTestnet ? Kpl.getIntProperty("kpl.testnetLeasingDelay", 1440) : 1440;
    public static final long MIN_FORGING_BALANCE_NQT = 1000 * ONE_kpl;

    public static final int MAX_TIMEDRIFT = 15; // allow up to 15 s clock difference
    public static final int FORGING_DELAY = Kpl.getIntProperty("kpl.forgingDelay");
    public static final int FORGING_SPEEDUP = Kpl.getIntProperty("kpl.forgingSpeedup");

    public static final byte MAX_PHASING_VOTE_TRANSACTIONS = 10;
    public static final byte MAX_PHASING_WHITELIST_SIZE = 10;
    public static final byte MAX_PHASING_LINKED_TRANSACTIONS = 10;
    public static final int MAX_PHASING_DURATION = 14 * 1440;
    public static final int MAX_PHASING_REVEALED_SECRET_LENGTH = 100;

    public static final int MAX_ALIAS_URI_LENGTH = 1000;
    public static final int MAX_ALIAS_LENGTH = 100;

    public static final int MAX_ARBITRARY_MESSAGE_LENGTH = 160;
    public static final int MAX_ENCRYPTED_MESSAGE_LENGTH = 160 + 16;

    public static final int MAX_PRUNABLE_MESSAGE_LENGTH = 42 * 1024;
    public static final int MAX_PRUNABLE_ENCRYPTED_MESSAGE_LENGTH = 42 * 1024;

    public static final int MIN_PRUNABLE_LIFETIME = isTestnet ? 1440 * 60 : 14 * 1440 * 60;
    public static final int MAX_PRUNABLE_LIFETIME;
    public static final boolean ENABLE_PRUNING;

    static {
        int maxPrunableLifetime = Kpl.getIntProperty("kpl.maxPrunableLifetime");
        ENABLE_PRUNING = maxPrunableLifetime >= 0;
        MAX_PRUNABLE_LIFETIME = ENABLE_PRUNING ? Math.max(maxPrunableLifetime, MIN_PRUNABLE_LIFETIME) : Integer.MAX_VALUE;
    }

    public static final boolean INCLUDE_EXPIRED_PRUNABLE = Kpl.getBooleanProperty("kpl.includeExpiredPrunable");

    public static final int MAX_ACCOUNT_NAME_LENGTH = 100;
    public static final int MAX_ACCOUNT_DESCRIPTION_LENGTH = 1000;

    public static final int MAX_ACCOUNT_PROPERTY_NAME_LENGTH = 32;
    public static final int MAX_ACCOUNT_PROPERTY_VALUE_LENGTH = 160;

    public static final long MAX_ASSET_QUANTITY_QNT = 1000000000L * 100000000L;
    public static final int MIN_ASSET_NAME_LENGTH = 3;
    public static final int MAX_ASSET_NAME_LENGTH = 10;
    public static final int MAX_ASSET_DESCRIPTION_LENGTH = 1000;
    public static final int MAX_SINGLETON_ASSET_DESCRIPTION_LENGTH = 160;
    public static final int MAX_ASSET_TRANSFER_COMMENT_LENGTH = 1000;
    public static final int MAX_DIVIDEND_PAYMENT_ROLLBACK = 50000; //1441 by xiaoc 2017-06-16 14:26

    public static final int MAX_POLL_NAME_LENGTH = 100;
    public static final int MAX_POLL_DESCRIPTION_LENGTH = 1000;
    public static final int MAX_POLL_OPTION_LENGTH = 100;
    public static final int MAX_POLL_OPTION_COUNT = 100;
    public static final int MAX_POLL_DURATION = 14 * 1440;

    public static final byte MIN_VOTE_VALUE = -92;
    public static final byte MAX_VOTE_VALUE = 92;
    public static final byte NO_VOTE_VALUE = Byte.MIN_VALUE;

    public static final int MAX_DGS_LISTING_QUANTITY = 1000000000;
    public static final int MAX_DGS_LISTING_NAME_LENGTH = 100;
    public static final int MAX_DGS_LISTING_DESCRIPTION_LENGTH = 1000;
    public static final int MAX_DGS_LISTING_TAGS_LENGTH = 100;
    public static final int MAX_DGS_GOODS_LENGTH = 1000;

    public static final int MAX_HUB_ANNOUNCEMENT_URIS = 100;
    public static final int MAX_HUB_ANNOUNCEMENT_URI_LENGTH = 1000;
    public static final long MIN_HUB_EFFECTIVE_BALANCE = 1;//最小有效余额

    public static final int MIN_CURRENCY_NAME_LENGTH = 3;
    public static final int MAX_CURRENCY_NAME_LENGTH = 10;
    public static final int MIN_CURRENCY_CODE_LENGTH = 3;
    public static final int MAX_CURRENCY_CODE_LENGTH = 5;
    public static final int MAX_CURRENCY_DESCRIPTION_LENGTH = 1000;
    public static final long MAX_CURRENCY_TOTAL_SUPPLY = 1000000000L * 100000000L;
    public static final int MAX_MINTING_RATIO = 10000; // per mint units not more than 0.01% of total supply
    public static final byte MIN_NUMBER_OF_SHUFFLING_PARTICIPANTS = 3;
    public static final byte MAX_NUMBER_OF_SHUFFLING_PARTICIPANTS = 30; // max possible at current block payload limit is 51
    public static final short MAX_SHUFFLING_REGISTRATION_PERIOD = (short) 1440 * 7;
    public static final short SHUFFLING_PROCESSING_DEADLINE = (short) (isTestnet ? 10 : 100);

    public static final int MAX_TAGGED_DATA_NAME_LENGTH = 100;
    public static final int MAX_TAGGED_DATA_DESCRIPTION_LENGTH = 1000;
    public static final int MAX_TAGGED_DATA_TAGS_LENGTH = 100;
    public static final int MAX_TAGGED_DATA_TYPE_LENGTH = 100;
    public static final int MAX_TAGGED_DATA_CHANNEL_LENGTH = 100;
    public static final int MAX_TAGGED_DATA_FILENAME_LENGTH = 100;
    public static final int MAX_TAGGED_DATA_DATA_LENGTH = 42 * 1024;

    public static final int ALIAS_SYSTEM_BLOCK = 22000;
    public static final int TRANSPARENT_FORGING_BLOCK = -1;
    public static final int ARBITRARY_MESSAGES_BLOCK = 40000;
    public static final int TRANSPARENT_FORGING_BLOCK_2 = 47000;
    public static final int TRANSPARENT_FORGING_BLOCK_3 = 51000;
    public static final int TRANSPARENT_FORGING_BLOCK_4 = 64000;
    public static final int TRANSPARENT_FORGING_BLOCK_5 = 67000;
    public static final int TRANSPARENT_FORGING_BLOCK_6 = isTestnet ? 75000 : 130000;
    public static final int TRANSPARENT_FORGING_BLOCK_7 = Integer.MAX_VALUE;
    public static final int TRANSPARENT_FORGING_BLOCK_8 = isTestnet ? 78000 : 215000;
    public static final int NQT_BLOCK = isTestnet ? 76500 : -1;
    public static final int FRACTIONAL_BLOCK = isTestnet ? NQT_BLOCK : 134000;
    public static final int ASSET_EXCHANGE_BLOCK = isTestnet ? NQT_BLOCK : 135000;
    public static final int REFERENCED_TRANSACTION_FULL_HASH_BLOCK = isTestnet ? NQT_BLOCK : 140000;
    public static final int REFERENCED_TRANSACTION_FULL_HASH_BLOCK_TIMESTAMP = isTestnet ? 13031352 : 0;
    public static final int MAX_REFERENCED_TRANSACTION_TIMESPAN = 60 * 1440 * 60;
    public static final int DIGITAL_GOODS_STORE_BLOCK = isTestnet ? 77341 : 213000;
    public static final int MONETARY_SYSTEM_BLOCK = isTestnet ? 150000 : 330000;
    public static final int PHASING_BLOCK = isTestnet ? 220000 : 445000;
    public static final int CHECKSUM_BLOCK_16 = isTestnet ? 450000 : 556000;
    public static final int SHUFFLING_BLOCK = isTestnet ? 483000 : 483000; //计算资产需要修改的地方:生成1440高度之后就变为－1，否则写为483000
    public static final int CHECKSUM_BLOCK_17 = isTestnet ? 484000 : 622000;
    public static final int CHECKSUM_BLOCK_18 = isTestnet ? 664000 : 729700;
    public static final int CHECKSUM_BLOCK_19 = isTestnet ? 789000 : 851000;
    public static final int FXT_BLOCK = isTestnet ? 779000 : 1000000;

    public static final int LAST_CHECKSUM_BLOCK = CHECKSUM_BLOCK_19;
    public static final int LAST_KNOWN_BLOCK = isTestnet ? 0 : 0;

    public static final int[] MIN_VERSION = new int[]{1, 0};
    public static final int[] MIN_PROXY_VERSION = new int[] {1, 10, 1};//Kiwi:?

    static final long UNCONFIRMED_POOL_DEPOSIT_NQT = (isTestnet ? 50 : 100) * ONE_kpl;
    public static final long SHUFFLING_DEPOSIT_NQT = (isTestnet ? 7 : 1000) * ONE_kpl;

    public static final boolean correctInvalidFees = Kpl.getBooleanProperty("kpl.correctInvalidFees");

    /*创始区块产生时间 2017-5-6 19:59:59*/
    public static final long EPOCH_BEGINNING;

    static {
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        calendar.set(Calendar.YEAR, 2017); // 几年
        calendar.set(Calendar.MONTH, 4);//Calendar.NOVEMBER （几－1）月
        calendar.set(Calendar.DAY_OF_MONTH, 6); //几日
        calendar.set(Calendar.HOUR_OF_DAY, 12); //（几－7）时
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        EPOCH_BEGINNING = calendar.getTimeInMillis();
    }

    public static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
    public static final String ALLOWED_CURRENCY_CODE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private Constants() {
    } // never

}
