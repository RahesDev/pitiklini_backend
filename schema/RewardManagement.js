const mongoose = require("mongoose");

const rewardSettingsSchema = new mongoose.Schema({
    kycStatus: {
        type: Number,
        enum: [0, 1], // 0 means inactive, 1 means active
        default: 0, // Default is inactive
    },
    kycCurrency: {
        type: String,
        required: function () {
            return this.kycStatus === 1; // Only required if KYC is active
        },
    },
    kycAmount: {
        type: Number,
        required: function () {
            return this.kycStatus === 1; // Only required if KYC is active
        },
    },
    depositStatus: {
        type: Number,
        enum: [0, 1], // 0 means inactive, 1 means active
        default: 0, // Default is inactive
    },
    depositCurrency: {
        type: String,
        required: function () {
            return this.depositStatus === 1; // Only required if Deposit is active
        },
    },
    depositAmount: {
        type: Number,
        required: function () {
            return this.depositStatus === 1; // Only required if Deposit is active
        },
    },
    minDeposit: {
        type: Number,
        required: function () {
            return this.depositStatus === 1; // Only required if Deposit is active
        },
        min: 0, // Ensure minimum value is 0
    },
    tradeStatus: {
        type: Number,
        enum: [0, 1], // 0 means inactive, 1 means active
        default: 0, // Default is inactive
    },
    tradeCurrency: {
        type: String,
        required: function () {
            return this.tradeStatus === 1; // Only required if Trade is active
        },
    },
    tradeAmount: {
        type: Number,
        required: function () {
            return this.tradeStatus === 1; // Only required if Trade is active
        },
    },
    referralStatus: {
        type: Number,
        enum: [0, 1], // 0 means inactive, 1 means active
        default: 0, // Default is inactive
    },
    referralCurrency: {
        type: String,
        required: function () {
            return this.referralStatus === 1; // Only required if referral is active
        },
    },
    referralAmount: {
        type: Number,
        required: function () {
            return this.referralStatus === 1; // Only required if referral is active
        },
    },
    createdAt: {
        type: Date,
        default: Date.now, // Automatically set the creation date
    },
    updatedAt: {
        type: Date,
        default: Date.now, // Automatically update the last modified date
    },

});

// Add a pre-save hook to update the "updatedAt" field on every save
rewardSettingsSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("RewardSettings", rewardSettingsSchema);
