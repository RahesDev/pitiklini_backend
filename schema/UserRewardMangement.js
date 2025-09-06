const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rewards: [
    {
      type: {
        type: String, // e.g., 'deposit_bonus', 'trade_bonus', 'kyc_bonus', etc.
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      currency: {
        type: String, // Currency type, e.g., 'USDT', 'BTC', etc.
        required: true
      },
      dateClaimed: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

module.exports = mongoose.model('UserReward', rewardSchema);
