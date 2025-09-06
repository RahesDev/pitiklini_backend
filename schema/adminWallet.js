const mongoose = require('mongoose');

const adminWalletSchema = mongoose.Schema({
    userId     : {type: mongoose.Types.ObjectId,ref: 'admin',index:true},
    wallets    :[{
            "currencyName"   :{type: String,default:''},
            "currencySymbol" :{type: String,default:''},
            "currencyId"     :{type: mongoose.Types.ObjectId,ref: 'currency'},
            "amount"         :{type: Number,default:0,index:true},
            "holdAmount"     :{type: Number,default:0,index:true},
            "withdrawAmount" :{type: Number,default:0},
            "address"         :{type: String,default:'',index:true},
            "admin_token_name" :{type: String,default:'',index:true},
            "trx_hexaddress"  :{type: String,default:'',index:true},
            "amount_erc20"         :{type: Number,default:0,index:true},
            "amount_bep20"         :{type: Number,default:0,index:true},
            "amount_trc20"         :{type: Number,default:0,index:true},
            "amount_rptc20"         :{type: Number,default:0,index:true},
            "amount_matic"         :{type: Number,default:0,index:true},
        }],
        
    status    : {type: String},
    type    : {type: Number}, // 0 - main wallet, 1 - user funded wallet
    created_at: {type: Date, default: Date.now()},
    updated_at: {type: Date, default: Date.now()},
});

module.exports = mongoose.model('adminWallet', adminWalletSchema,'adminWallet');