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

package kpl;

import kpl.kplException.ValidationException;
import kpl.util.Convert;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import java.nio.ByteBuffer;
import java.util.Arrays;

/**
 * Class for handling phasing parameters shared between {@link Appendix.Phasing} and {@link AccountRestrictions.PhasingOnly}
 */
public final class PhasingParams {

    private final long quorum;
    private final long[] whitelist;
    private final VoteWeighting voteWeighting;
    
    PhasingParams(ByteBuffer buffer) {
        byte votingModel = buffer.get();
        quorum = buffer.getLong();
        long minBalance = buffer.getLong();
        byte whitelistSize = buffer.get();
        if (whitelistSize > 0) {
            whitelist = new long[whitelistSize];
            for (int i = 0; i < whitelistSize; i++) {
                whitelist[i] = buffer.getLong();
            }
        } else {
            whitelist = Convert.EMPTY_LONG;
        }
        long holdingId = buffer.getLong();
        byte minBalanceModel = buffer.get();
        voteWeighting = new VoteWeighting(votingModel, holdingId, minBalance, minBalanceModel);
    }
    
    PhasingParams(JSONObject attachmentData) {
        quorum = Convert.parseLong(attachmentData.get("phasingQuorum"));
        long minBalance = Convert.parseLong(attachmentData.get("phasingMinBalance"));
        byte votingModel = ((Long) attachmentData.get("phasingVotingModel")).byteValue();
        long holdingId = Convert.parseUnsignedLong((String) attachmentData.get("phasingHolding"));
        JSONArray whitelistJson = (JSONArray) (attachmentData.get("phasingWhitelist"));
        if (whitelistJson != null && whitelistJson.size() > 0) {
            whitelist = new long[whitelistJson.size()];
            for (int i = 0; i < whitelist.length; i++) {
                whitelist[i] = Convert.parseUnsignedLong((String) whitelistJson.get(i));
            }
        } else {
            whitelist = Convert.EMPTY_LONG;
        }
        byte minBalanceModel = ((Long) attachmentData.get("phasingMinBalanceModel")).byteValue();
        voteWeighting = new VoteWeighting(votingModel, holdingId, minBalance, minBalanceModel);
    }
    
    public PhasingParams(byte votingModel, long holdingId, long quorum, long minBalance, byte minBalanceModel, long[] whitelist) {
        this.quorum = quorum;
        this.whitelist = Convert.nullToEmpty(whitelist);
        if (this.whitelist.length > 0) {
            Arrays.sort(this.whitelist);
        }
        voteWeighting = new VoteWeighting(votingModel, holdingId, minBalance, minBalanceModel);
    }
    
    int getMySize() {
        return 1 + 8 + 8 + 1 + 8 * whitelist.length + 8 + 1;
    }
    
    void putMyBytes(ByteBuffer buffer) {
        buffer.put(voteWeighting.getVotingModel().getCode());
        buffer.putLong(quorum);
        buffer.putLong(voteWeighting.getMinBalance());
        buffer.put((byte) whitelist.length);
        for (long account : whitelist) {
            buffer.putLong(account);
        }
        buffer.putLong(voteWeighting.getHoldingId());
        buffer.put(voteWeighting.getMinBalanceModel().getCode());
    }
    
    void putMyJSON(JSONObject json) {
        json.put("phasingQuorum", quorum);
        json.put("phasingMinBalance", voteWeighting.getMinBalance());
        json.put("phasingVotingModel", voteWeighting.getVotingModel().getCode());
        json.put("phasingHolding", Long.toUnsignedString(voteWeighting.getHoldingId()));
        json.put("phasingMinBalanceModel", voteWeighting.getMinBalanceModel().getCode());
        if (whitelist.length > 0) {
            JSONArray whitelistJson = new JSONArray();
            for (long accountId : whitelist) {
                whitelistJson.add(Long.toUnsignedString(accountId));
            }
            json.put("phasingWhitelist", whitelistJson);
        }
    }

    void validate() throws ValidationException {
        if (whitelist.length > Constants.MAX_PHASING_WHITELIST_SIZE) {
            throw new kplException.NotValidException("Whitelist is too big");
        }

        long previousAccountId = 0;
        for (long accountId : whitelist) {
            if (accountId == 0) {
                throw new kplException.NotValidException("Invalid accountId 0 in whitelist");
            }
            if (previousAccountId != 0 && accountId < previousAccountId) {
                throw new kplException.NotValidException("Whitelist not sorted " + Arrays.toString(whitelist));
            }
            if (accountId == previousAccountId) {
                throw new kplException.NotValidException("Duplicate accountId " + Long.toUnsignedString(accountId) + " in whitelist");
            }
            previousAccountId = accountId;
        }

        if (quorum <= 0 && voteWeighting.getVotingModel() != VoteWeighting.VotingModel.NONE) {
            throw new kplException.NotValidException("quorum <= 0");
        }

        if (voteWeighting.getVotingModel() == VoteWeighting.VotingModel.NONE) {
            if (quorum != 0) {
                throw new kplException.NotValidException("Quorum must be 0 for no-voting phased transaction");
            }
            if (whitelist.length != 0) {
                throw new kplException.NotValidException("No whitelist needed for no-voting phased transaction");
            }
        }

        if (voteWeighting.getVotingModel() == VoteWeighting.VotingModel.ACCOUNT && whitelist.length > 0 && quorum > whitelist.length) {
            throw new kplException.NotValidException("Quorum of " + quorum + " cannot be achieved in by-account voting with whitelist of length "
                    + whitelist.length);
        }

        voteWeighting.validate();

        if (Kpl.getBlockchain().getHeight() < Constants.FXT_BLOCK) {
            return;
        }

        if (voteWeighting.getVotingModel() == VoteWeighting.VotingModel.CURRENCY) {
            Currency currency = Currency.getCurrency(voteWeighting.getHoldingId());
            if (currency == null) {
                throw new kplException.NotCurrentlyValidException("Currency " + Long.toUnsignedString(voteWeighting.getHoldingId()) + " not found");
            }
            if (quorum > currency.getMaxSupply()) {
                throw new kplException.NotCurrentlyValidException("Quorum of " + quorum
                        + " exceeds max currency supply " + currency.getMaxSupply());
            }
            if (voteWeighting.getMinBalance() > currency.getMaxSupply()) {
                throw new kplException.NotCurrentlyValidException("MinBalance of " + voteWeighting.getMinBalance()
                        + " exceeds max currency supply " + currency.getMaxSupply());
            }
        } else if (voteWeighting.getVotingModel() == VoteWeighting.VotingModel.ASSET) {
            Asset asset = Asset.getAsset(voteWeighting.getHoldingId());
            if (quorum > asset.getInitialQuantityQNT()) {
                throw new kplException.NotCurrentlyValidException("Quorum of " + quorum
                        + " exceeds total initial asset quantity " + asset.getInitialQuantityQNT());
            }
            if (voteWeighting.getMinBalance() > asset.getInitialQuantityQNT()) {
                throw new kplException.NotCurrentlyValidException("MinBalance of " + voteWeighting.getMinBalance()
                        + " exceeds total initial asset quantity " + asset.getInitialQuantityQNT());
            }
        } else if (voteWeighting.getMinBalance() > 0) {
            if (voteWeighting.getMinBalanceModel() == VoteWeighting.MinBalanceModel.ASSET) {
                Asset asset = Asset.getAsset(voteWeighting.getHoldingId());
                if (voteWeighting.getMinBalance() > asset.getInitialQuantityQNT()) {
                    throw new kplException.NotCurrentlyValidException("MinBalance of " + voteWeighting.getMinBalance()
                            + " exceeds total initial asset quantity " + asset.getInitialQuantityQNT());
                }
            } else if (voteWeighting.getMinBalanceModel() == VoteWeighting.MinBalanceModel.CURRENCY) {
                Currency currency = Currency.getCurrency(voteWeighting.getHoldingId());
                if (currency == null) {
                    throw new kplException.NotCurrentlyValidException("Currency " + Long.toUnsignedString(voteWeighting.getHoldingId()) + " not found");
                }
                if (voteWeighting.getMinBalance() > currency.getMaxSupply()) {
                    throw new kplException.NotCurrentlyValidException("MinBalance of " + voteWeighting.getMinBalance()
                            + " exceeds max currency supply " + currency.getMaxSupply());
                }
            }
        }

    }

    void checkApprovable() throws kplException.NotCurrentlyValidException {
        if (Kpl.getBlockchain().getHeight() < Constants.FXT_BLOCK) {
            return;
        }
        if (voteWeighting.getVotingModel() == VoteWeighting.VotingModel.CURRENCY
                && Currency.getCurrency(voteWeighting.getHoldingId()) == null) {
            throw new kplException.NotCurrentlyValidException("Currency " + Long.toUnsignedString(voteWeighting.getHoldingId()) + " not found");
        }
        if (voteWeighting.getMinBalance() > 0 && voteWeighting.getMinBalanceModel() == VoteWeighting.MinBalanceModel.CURRENCY
                && Currency.getCurrency(voteWeighting.getHoldingId()) == null) {
            throw new kplException.NotCurrentlyValidException("Currency " + Long.toUnsignedString(voteWeighting.getHoldingId()) + " not found");
        }
    }

    public long getQuorum() {
        return quorum;
    }

    public long[] getWhitelist() {
        return whitelist;
    }

    public VoteWeighting getVoteWeighting() {
        return voteWeighting;
    }
    
    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof PhasingParams)) {
            return false;
        }
        PhasingParams other = (PhasingParams)obj;
        return other.quorum == this.quorum
                && other.voteWeighting.equals(this.voteWeighting)
                && Arrays.equals(other.whitelist, this.whitelist);
    }
    
    @Override
    public int hashCode() {
        int hashCode = 17;
        hashCode = 31 * hashCode + Long.hashCode(quorum);
        for (long voter : whitelist) {
            hashCode = 31 * hashCode + Long.hashCode(voter);
        }
        hashCode = 31 * hashCode + voteWeighting.hashCode();
        return hashCode;
    }
    
    @Override
    public String toString() {
        JSONObject resultJson = new JSONObject();
        putMyJSON(resultJson);
        return resultJson.toJSONString();
    }
}
