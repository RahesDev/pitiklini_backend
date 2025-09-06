const mongoose = require('mongoose');

const AdminSchema = mongoose.Schema({
    email         : { type: String },
    adminEmail         : { type: String },
    userName      : { type: String },
    password      : { type: String },
    forgotPass    : { type: Number, default: 0 },
    forgotEmailotp : {type: String, default: ""},
    admintype     : { type: Number, default: 0 },
    changeMail    : { type: Number, default: 0 },
    createdDate   : {type: Date, default: Date.now()},
    modifiedDate  : {type: Date, default: Date.now()},
    Account_Number: { type: Number, default: 0},
    Bank_Name: { type: String, default: ''},
    IFSC_code: { type: String, default: ''},
    Branch_Name: { type: String, default: ''},
    tfa_code: {type:String,default:""},
	tfa_url: {type:String,default:""},
    tfaenablekey: {type: String, default: ""},
	tfa_status: {type:Number,default:0},
    wallet_password: { type: String },
    key_auth_otp : {type: Number, default : 0 },
    // user_management: { type: Number,default:0 }, //1-active 0-deactive
    // wallet_management: { type: Number,default:0 }, //1-active 0-deactive
    // trade_management: { type: Number,default:0 }, //1-active 0-deactive
    // userip_management: { type: Number,default:0 }, //1-active 0-deactive
    // settings_management: { type: Number,default:0 }, //1-active 0-deactive
    // currency_management: { type: Number,default:0 }, //1-active 0-deactive
    // cryptodeposit_management: { type: Number,default:0 }, //1-active 0-deactive
    // cryptowithdraw_management: { type: Number,default:0 }, //1-active 0-deactive
    // tradepair_management: { type: Number,default:0 }, //1-active 0-deactive
    // mailtemplate_management: { type: Number,default:0 }, //1-active 0-deactive
    // home_management: { type: Number,default:0 }, //1-active 0-deactive
    // about_management: { type: Number,default:0 }, //1-active 0-deactive
    // cms_management: { type: Number,default:0 }, //1-active 0-deactive
    // faq_management: { type: Number,default:0 }, //1-active 0-deactive
    // supportcategory_management: { type: Number,default:0 }, //1-active 0-deactive
    // support_management: { type: Number,default:0 }, //1-active 0-deactive
    // contactus_management: { type: Number,default:0 }, //1-active 0-deactive
    type: { type: Number, default: 0 },//1-admin 0-subadmin
    status: {type:String,default:"active"},
    reset_password_timer: { type: Date },
    permissions_id: {type:[Number]},
    permissions: {type:[String]},
    loginOTP	 : {type:String, default:''},
    withdrawOTP	 : {type:String, default:''},
    expireTime	 : {type:Date,index:true},
    username:{type:String, default:''},
    key_auth_expireTime : {type:Date,index:true}
});

module.exports = mongoose.model('admin', AdminSchema);