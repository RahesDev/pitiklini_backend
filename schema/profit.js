var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var profitSchema = new Schema({
  "user_id"     : { type: mongoose.Schema.Types.ObjectId, ref: 'user', index:true},
  "currencyid"  : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
  "fees"        : { type: Number, default: 0 },
  "fullfees"    : { type: Number, default: 0 },
  "liquidity"   : { type: Number, default: 0 },
  "type"        : { type: String, default: '' },
  "orderid"     : { type: mongoose.Schema.Types.ObjectId },
  "date"        : { type: Date, default: Date.now },
});
module.exports = mongoose.model('profit', profitSchema, 'profit')