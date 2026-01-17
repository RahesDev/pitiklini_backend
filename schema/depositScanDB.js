const mongoose = require("mongoose");

const depositScanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  address: {
    type: String,
    lowercase: true,
    index: true,
  },
  tokenContract: {
    type: String, // "BNB" or token contract address
    
    index: true,
  },
  lastScannedBlock: {
    type: Number,
    default:0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

depositScanSchema.index(
  { userId: 1, address: 1, tokenContract: 1 },
  { unique: true }
);

module.exports = mongoose.model("depositScanDB", depositScanSchema);
