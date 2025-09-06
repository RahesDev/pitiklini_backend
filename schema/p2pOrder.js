const mongoose = require('mongoose');


var p2pOrderSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Users', default:null, index:true,
        required: true,
        default : ""
    },
    fromCurrency    : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
    toCurrency   : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
    pairId: {
        type: String,
        default : ""
    },
    firstCurrency: {
        type: String, index:true,
        default : ""
    },
    secondCurrnecy: {
        type: String, index:true,
        default : ""
    },
    totalAmount: {
        type: Number,
        default : 0
    },
    price: {
        type: Number,
        default : 0
    },
    fromLimit: {
        type: Number,
        default : 0
    },
    toLimit: {
        type: Number,
        default : 0
    },
    available_qty: {
        type: Number,
        default : 0
    },
    paymentMethod: {
        type: String,
        default : ""
    },
    orderType: {
        type: String,
        default : ""
    },
    status: {
        type: String, // active, filled, partially, cancelled
        default : ""
    },
    email: {
        type: String,
        default : ""
    },
    username: {
        type: String,
        default : ""
    },
    orderId: {
        type: String,
        default : ""
    },
    filledAmount: {
        type: Number,
        default: 0
    },
    processAmount: {
        type: Number,
        default: 0
    },
    order_status: {
        type: String, // processing, confirmed, paid, released, cancelled
        default : "pending"
    },
    pay_time: {
        type: String, // 15, 30, 60, 120, 150, 180, 240, 300, 360
        default : ""
    },
    requirements: {
        type: String,
        default : ""
    },
}, { timestamps: true });

var p2pModel = mongoose.model('p2pOrders', p2pOrderSchema, 'p2pOrders');

module.exports = p2pModel;
