var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var genSchema = new Schema({
  "userId" : {type: String, default: ''},
  "currId"   : { type: mongoose.Schema.Types.ObjectId, ref: 'currency'},
  "difference" : { type: Number, default: 0 },
  "amount" : { type: Number, default: 0 },
  "OldBal" : { type: Number, default: 0 },
  "LastId" : { type: String, default: '' },
  "Type"   : String,
  "datetime" : { type: Date, default: Date.now }
});
module.exports = mongoose.model('BalanceUpdation', genSchema, 'BalanceUpdation')