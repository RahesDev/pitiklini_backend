var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AdminReferralFees = new Schema({
    "welcome_bonus":{type: Number,default:0},	
	"referral_commision":{type: Number,default:0},
	"trading_bonus":{type: Number,default:0},
	"deposit_bonus":{type: Number,default:0},
	"minimum_deposit":{type: Number,default:0}, 
}
);

module.exports = mongoose.model('AdminReferralFees', AdminReferralFees, 'AdminReferralFees')