var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var stakePayoutSchema = new Schema({
  "userId" : {
    type: mongoose.Types.ObjectId,
    ref: 'users'
  },
  "stakeId"   : { type: mongoose.Schema.Types.ObjectId, ref: 'userStaking'},
  "currencyId"   : { type: mongoose.Schema.Types.ObjectId, ref: 'currency'},
  "currency"   : { type: String},
  "amount" : { type: Number, default: 0 },
  "Type"   : String,
},{timestamps:true});
module.exports = mongoose.model('stake_payouts', stakePayoutSchema, 'stake_payouts')