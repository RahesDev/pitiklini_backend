const mongoose = require("mongoose");

const fundTransferSchema = new mongoose.Schema({
  fromUserId: { type: mongoose.Types.ObjectId, ref: "Users", required: true },
  toUserId: { type: mongoose.Types.ObjectId, ref: "Users", required: true },
  currencySymbol: { type: String, required: true },
  currencyId: {
    type: mongoose.Types.ObjectId,
    ref: "currency",
    required: true,
  },
  amount: { type: Number, required: true },
  txType: { type: String, default: "Internal Transfer" }, // for reference
  status: { type: String, default: "Completed" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model(
  "fundTransferHistory",
  fundTransferSchema,
  "fundTransferHistory"
);
