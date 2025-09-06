const mongoose = require('mongoose');

const launchPadHistoySchema = mongoose.Schema({
    user_id: {
        type: mongoose.Schema.ObjectId,
        required: true,
        trim: true
    },
    currencyid: {
        type: mongoose.Schema.ObjectId,
        required: true,
        trim: true
    },
    fees: {
        type: Number,
        default: 0
    },
    fullfees: {
        type: Number,
        default: 0
    },
    orderid: {
        type: String,
        default: function() {
          return new Date().getTime();
        },
        unique: true
    },
    tokenSymbol: {
        type: String,
        default: ''
    },
    tokenName: {
        type: String,
        default: ''
    },
    tokenAmount: {
        type: Number,
        default: 0
    },
    sellCurrency: {
        type: String,
        default: ''
    },
    createdDate: {
        type: Date,
        default: Date.now()
    },
    modifiedDate: {
        type: Date,
        default: Date.now()
    },
});


module.exports = mongoose.model('launchPadHisory', launchPadHistoySchema, 'launchPadHisory');