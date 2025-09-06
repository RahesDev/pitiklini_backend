const mongoose = require('mongoose');

const referralHisSchema = mongoose.Schema({
    currencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'currency',
        index: true
    },
    amount: {
        type: Number,
        default: 0
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        index: true
    },
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        index: true
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    fee: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        default: ""
    },
    createdDate: {
        type: Date,
        default: Date.now()
    },
    modifiedDate: {
        type: Date,
        default: Date.now()
    }
});

module.exports = mongoose.model('referralHistory', referralHisSchema, 'referralHistory');