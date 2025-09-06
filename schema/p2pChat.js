const mongoose = require('mongoose');


var p2pChatSchema = mongoose.Schema({
    advertiserId: {
        type: mongoose.SchemaTypes.ObjectId, ref: 'user',  index:true,
    },
    userId: {
        type: mongoose.SchemaTypes.ObjectId, ref: 'user', index:true,
    },
    p2porderId: {
        type: mongoose.SchemaTypes.ObjectId, ref: 'p2pOrders',index:true,
    },
    adv_name : {
        type: String,
        default: ""
    },
    adv_msg: {
        type: String,
        default : ""
    },
    adv_file: {
        type: String,
        default : ""
    },
    adv_date: {
        type: Date
    },
    user_name: {
        type: String,
        default: ""
    },
    user_msg: {
        type: String,
        default : ""
    },
    user_file: {
        type: String,
        default : ""
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

var p2pModel = mongoose.model('p2pChat', p2pChatSchema, 'p2pChat');

module.exports = p2pModel;
