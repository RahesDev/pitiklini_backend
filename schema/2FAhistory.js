const mongoose = require('mongoose');

const twoFAhistort = mongoose.Schema({

    userId     : {type: mongoose.Types.ObjectId,ref: 'user',index:true},
    email: { type: String },
    ipAddress   : { type: String ,default:''},
    browser     : { type: String,default:'' },
    OS          : { type: String,default:''},
    Status : {type : String},
    createdDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date, default: Date.now },
})

module.exports = mongoose.model('2FAhistory', twoFAhistort,'2FAhistory');

