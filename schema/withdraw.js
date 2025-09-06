var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var withdraw = new Schema({
	"user_id"  		 : {type:mongoose.Schema.Types.ObjectId, ref: 'user', index:true},
	"user_name"  : {type:String, default:''},
	"email": {type:String, default:""},
	"currency_id" : {type:mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
	"currency_symbol" : {type:String},
	"fromaddress"  : {type:String, default:''},
	"withdraw_address": { type: String, default: '' },
	"amount"   : {type:Number, default:0},
	"receiveamount": {type:Number, default:0},
    "fees"				 : {type:Number, default:0},
    "type" 				 : {type:Number, default:0},//0-user,1-admin
	"withdraw_type"		 : {type:Number, default:0},//0-crypto, 1-fiat
	"status"			 : {type:Number, default:0},//0-userPending,1-adminPending,2-completed,3-usercancel,4-admincancel
	"reason": { type : String, default: '' },
    "txn_id"				 : {type:String, default:'', index:true},
	"withdrawOTP"	 : {type:String, default:''},
	"coinpayments_txn_id"				 : {type:String, default:'', index:true},
	"expireTime"	 : {type:Date,index:true},
	"created_at"	 : {type:Date, default: Date.now},
	"updated_at"     : {type:Date, default: Date.now},
	"network"  : {type:String, default:''},
});
module.exports = mongoose.model('withdraw', withdraw, 'withdraw');
