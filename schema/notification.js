const mongoose = require('mongoose');


var notifySchema = mongoose.Schema({
    from_user_id: {
        type: mongoose.SchemaTypes.ObjectId, ref: 'user',  index:true,
    },
    to_user_id: {
        type: mongoose.SchemaTypes.ObjectId, ref: 'user', index:true,
    },
    p2porderId: {
        type: mongoose.SchemaTypes.ObjectId, ref: 'p2pOrders',index:true,
    },
    orderId: {
        type: String,
        default : "" // p2p order id
    },
    from_user_name : {
        type: String,
        default: ""
    },
    to_user_name: {
        type: String,
        default : ""
    },
    message: {
        type: String,
        default : ""
    },
    IP: {
        type: String,
        default: "" // buy, sell
    },
    status: {
        type: Number,
        default: 0 // 0 - not read, 1-read
    },
    link: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        default: "" // buy, sell
    },
    buyer_status: {
        type: String,
        default: "" // confirm, reject, paid, dispute
    },
    seller_status: {
        type: String,
        default: "" // confirm, reject, release, dispute
    },
}, { timestamps: true });

var notifyModel = mongoose.model('notification', notifySchema, 'notification');

module.exports = notifyModel;
