const mongoose = require('mongoose');

const userWalletSchema = mongoose.Schema({
    userId     : {type: mongoose.Types.ObjectId,ref: 'user',index:true},
    wallets    :[{
            "currencyName"   :{type: String,default:''},
            "currencySymbol" :{type: String,default:''},
            "currencyId"     :{type: mongoose.Types.ObjectId,ref: 'currency'},
            "amount"         :{type: Number,default:0,index:true},
            "holdAmount"     :{type: Number,default:0,index:true},
            "p2p"            :{type: Number,default:0,index:true},
            "p2phold"        :{type: Number,default:0,index:true},
            "stakeAmount"    :{type: Number,default:0,index:true},
            "stakeHold"      :{type: Number,default:0,index:true},
            "FlexstakeAmount":{type: Number,default:0,index:true},
            "FlexstakeHold"  :{type: Number,default:0,index:true}
    }]
},{timestamps:true});

module.exports = mongoose.model('userWallet', userWalletSchema,'userWallet');