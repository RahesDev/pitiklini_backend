var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var referralSchema = new Schema({

    "spotReferral": {
        type: Number,
        default: 0
    },
    "stakingReferral_fixed": {
        type: Number,
        default: 0
    },
    "stakingReferral_flexible": {
        type: Number,
        default: 0
    },
    "stakingReferral_yield": {
        type: Number,
        default: 0
    },
    "spotDiscount": { // referee
        type: Number,
        default: 0
    },
    "spotStatus": {
        type: Number,
        default: 0
    },
    "stakingStatus": {
        type: Number,
        default: 0
    },
    "date": {
        type: Date,
        default: Date.now
    },
});
module.exports = mongoose.model('referral', referralSchema, 'referral')