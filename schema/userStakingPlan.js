var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var userStakingSchema  = new Schema({
  "userId"     : { type: mongoose.Schema.Types.ObjectId, ref: 'user', index:true},
  "currencyid"  : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
  "stakingPlan"        : { type: Number, default: 0 },
  "totalInterest"        : { type: Number, default: 0 },
  "dailyinterest"        : { type: Number, default: 0 },
  "currentAPY"        : { type: Number, default: 0 },
  "startDate"        : { type: Date, },
  "endDate"        : { type: Date,},
  "stakeAmont"        : { type: Number, default: 0 },
  "stakeCurrencsymbol"        : { type: String, default: '' },
  "stakeCurrencyName"        : { type: String, default: '' },
  "stakeId"        : { type: mongoose.Schema.Types.ObjectId, ref: 'stakingsettings', index:true },
  "currencyImage"        : { type: String, default: '' },
  "note"         : { type: String, default: '' },
  "status"        : { type: Number, default: 0 },
  "type"        : { type: String, default: "" },
  "stakeOrderID"     : { type: String,
    default: function() {
      return new Date().getTime();
    },
    unique: true },
  "date"        : { type: Date, default: Date.now },
});
module.exports = mongoose.model('userStaking', userStakingSchema, 'userStaking');