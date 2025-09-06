var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var depositScema = new Schema({
	"userId"      : { type: mongoose.Schema.Types.ObjectId, ref: 'user', default:null, index:true},
	"currency"    : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
	"currencySymbol" : { type : String, default : ''},
	"depamt"      : { type : Number, default : 0},
	"type"        : { type : Number, default : 0, index:true},//0-user 1-admin
	"status"      : { type : Number, default : 1, index:true},//0-pending 1-completed 2-cancelled
	"eth_admin_transfer": { type: Boolean, default: false, index:true },
	"tag"         : { type : String, default : ''},
	"depto"       : { type : String, default : ''},
	"txnid"       : { type : String, default : '', index:true, unique: true},
	"image"       : { type : String, default: '' },
	"reason"      : { type : String, default: '' },
	"depType"     : { type: Number, default: 0 }, //0-crypto 1-fiat
	"currencyMoveStatus": { type: Number, default: 0 }, //0-Notmove 1-move
	"username"      : { type : String, default: '' },
	"network"       : { type : String },
	"updateddate" : { type: Date, default: Date.now},
	"createddate" : { type: Date, default: Date.now}
});

module.exports = mongoose.model('deposit', depositScema, 'deposit');