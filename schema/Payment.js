const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  paymentStatus: { type: String, default: 'pending' },
  amount: { type: Number },
  currencySymbol: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', PaymentSchema);
