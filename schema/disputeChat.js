const mongoose = require('mongoose');


var disputeChatSchema = mongoose.Schema({

    userId: {
        type: mongoose.SchemaTypes.ObjectId, ref: 'user', index: true,
    },
    userId: { type: mongoose.Types.ObjectId, ref: 'admin', index: true },
    p2porderId: {
        type: mongoose.SchemaTypes.ObjectId, ref: 'p2pOrders', index: true,
    },
    admin_name: {
        type: String,
        default: ""
    },
    admin_msg: {
        type: String,
        default: ""
    },
    admin_file: {
        type: String,
        default: ""
    },
    admin_date: {
        type: Date
    },
    user_name: {
        type: String,
        default: ""
    },
    user_msg: {
        type: String,
        default: ""
    },
    user_file: {
        type: String,
        default: ""
    },
    user_date: {
        type: Date
    },
    type: {
        type: String
    },
    default: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

var disputeModel = mongoose.model('disputeChat', disputeChatSchema, 'disputeChat');

module.exports = disputeModel;