const mongoose = require('mongoose');

const AirdropDistributionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    required: true,
  },
  tokensDistributed: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,  // Timestamp of when the distribution was done
  },
});

module.exports = mongoose.model('AirdropDistribution', AirdropDistributionSchema);
