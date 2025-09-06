const mongoose = require('mongoose');
const currency = require('./currency');

const transferSchema = mongoose.Schema({
    currencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'currency',
        index: true
    },
    currency: {
        type: String,
        default: ""
    },
    amount: {
        type: Number,
        default: 0
    },
    fromWallet: {
        type: String,
        default: ""
    },
    toWallet: {
        type: String,
        default: ""
    },
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        index: true
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

module.exports = mongoose.model('transfer', transferSchema, 'transfer');