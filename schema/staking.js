const mongoose = require('mongoose');

const stakingSchema = mongoose.Schema({

    currencyId      : { type : mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
    currencySymbol  : { type : String, default: '' },
    currencyName    : { type : String, default: '' },
    currencyImage   : { type : String, default: '' },
    firstDuration   : { type: Number, default: 0 },
    secondDuration  : { type: Number, default: 0 },
    thirdDuration   : { type: Number, default: 0 },
    fourthDuration  : { type: Number, default: 0 },
    apy             : { type: String, default: "0" },
    maximumStaking  : { type: Number, default: 0 },
    minimumStaking  : { type: Number, default: 0 },
    FistDurationAPY  : { type: Number, default: 0 },
    SecondDurationAPY  : { type: Number, default: 0 },
    ThirdDurationAPY  : { type: Number, default: 0 },
    FourthDurationAPY  : { type: Number, default: 0 },
    firstDurationflex  : { type: Number, default: 0 },
    thirdDurationflex  : { type: Number, default: 0 },
    secondDurationflex  : { type: Number, default: 0 },
    fourthDurationflex  : { type: Number, default: 0 },
    maximumStakingflex  : { type: Number, default: 0 },
    minimumStakingflex  : { type: Number, default: 0 },
    firstProfit  : { type: Number, default: 0 },
    firstInterest  : { type: Number, default: 0 },
    secondProfit  : { type: Number, default: 0 },
    secondInterest  : { type: Number, default: 0 },
    thirdProfit  : { type: Number, default: 0 },
    thirdInterst  : { type: Number, default: 0 },
    fourthProfit  : { type: Number, default: 0 },
    fourthInterest  : { type: Number, default: 0 },
    APRinterest  : { type: Number, default: 0 },
    statusflex  : { type: String, default: "Active" },
    status          : { type: String, default: "Active"  },
    type          : { type: String, default: ""  },
    createdDate     : { type: Date, default: Date.now() },
    modifiedDate    : { type: Date, default: Date.now() }
});

module.exports = mongoose.model('stakingSetting', stakingSchema);