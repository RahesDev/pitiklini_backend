var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var addressSchema = new Schema({
	address         : {type: String,default: "",index:true},
	userKeyOne      : {type: String,default: ""},
	userKeyThree    : {type: String,default: ""},
	currencySymbol  : {type: String,default: ""},
	userIdKey       : {type: String,default: ""},
	date            : {type: Date, default: Date.now},
	trx_hexaddress  : {type: String,default: "",index:true},
	publicKey       : {type: String,default: ""},
	hex             : {type: String,default: ""},
	network  : {type: String,default: "",index:true},
	privateKey: {type: String,default: ""},
});

// module.exports = mongoose.model('address', addressSchema,'address');

module.exports = (connection) => {
    return connection.model('address', addressSchema,'address');
};