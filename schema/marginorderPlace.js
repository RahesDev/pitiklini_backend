var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var orderPlaceSchema = new Schema({
	"userId"           : { type: mongoose.Schema.Types.ObjectId, ref: 'user', default:null, index:true},
    "pairId"           : { type: mongoose.Schema.Types.ObjectId, ref: 'trade_pair', index:true},
    "firstCurrency"    : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
    "secondCurrency"   : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
	"amount"           : { type : Number, default : 0},
	"price"            : { type : Number, default : 0, index:true},//0-user 1-admin
	"tradeType"        : { type : String, enum: ['buy', 'sell'], index:true},//0-pending 1-completed 2-cancelled
	"fee"              : { type: Number, default: 0, },
	"total"            : { type : Number, default : ''},
	"ordertype"        : { type : String, enum: ['Limit', 'Market','Stop'], default: ''},
	"pairName"         : { type : String, default : '', index:true},
	"status"           : { type : String, default: '' },
	"reason"           : { type : String, default: '' },
    "partial_price"    : { type: Number, default: 0 }, //0-crypto 1-fiat
    "stoporderprice"   : { type: Number, default: 0 }, //0-crypto 1-fiat
    "limit_price"      : { type: Number, default: 0 }, //0-crypto 1-fiat
    "trigger_price"    : { type: Number, default: 0 }, //0-crypto 1-fiat
    "fee_per"          : { type: Number, default: 0 }, //0-crypto 1-fiat
	"makerFee"         : { type: Number, default: 0 }, //0-crypto 1-fiat
	"takerFee"         : { type: Number, default: 0 }, //0-crypto 1-fiat
	"filledAmount"     : { type: Number, default: 0 }, //0-crypto 1-fiat
	"firstSymbol"      : { type: String, default: '' }, //0-crypto 1-fiat
    "toSymbol"         : { type: String, default: '' }, //0-crypto 1-fiat
	"liquidity_name"   : { type: String, default: '' }, //0-crypto 1-fiat
	"site"             : { type: String, default: '' }, //0-crypto 1-fiat
	"error"            : { type: String, default: '' }, //0-crypto 1-fiat

	'orderId':{
		type: String,
		default: function() {
		  return new Date().getTime();
		},
		unique: true
	  },
	"updateddate"      : { type: Date, default: Date.now},
	"createddate"      : { type: Date, default: Date.now},
	"margintype": { type: String, default: '' },
    "borrowAmount": { type: Number, default: 0 },
    "borrowInterest": { type: Number, default: 0 },
	"repayAmount": { type: Number, default: 0 },
	"repayInterest": { type: Number, default: 0 },
	"marginlimit": { type: Number, default: 0 }
});

module.exports = mongoose.model('marginorderPlace', orderPlaceSchema, 'marginorderPlace');