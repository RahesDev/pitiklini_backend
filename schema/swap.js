const mongoose = require('mongoose');

const swapSchema = mongoose.Schema({
    fromCurrID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'currency',
        index: true
    },
    toCurreID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'currency',
        index: true
    },
    fromCurrency: {
        type: String,
        default: ''
    },
    toCurrency: {
        type: String,
        default: ''
    },
    amount: {
        type: Number,
        default: 0
    },
    receivedAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    fee: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        default: 0
    },
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        index: true
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

module.exports = mongoose.model('swaping', swapSchema, 'swaping');