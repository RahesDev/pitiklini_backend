var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var addressSchema = new Schema({
	user_id         : {type:mongoose.Schema.Types.ObjectId,ref: 'Users',index:true},
	address         : {type: String,default: "",index:true},
	tag             : {type: String,default: ""},
	currency        : {type: mongoose.Schema.Types.ObjectId,ref:'currency',index:true},
	currencySymbol  : {type: String,default: ""},
	userIdKey       : {type: String,default: ""},
	publicKey       : {type: String,default: ""},
	date            : {type: Date, default: Date.now},
	trx_hexaddress  : {type: String,default: "",index:true},
	network  : {type: String,default: "",index:true},
	type      : { type : Number, default : 0},
	name  : {type: String,default: ""},
});

module.exports = mongoose.model('cryptUserAddress', addressSchema,'cryptUserAddress');