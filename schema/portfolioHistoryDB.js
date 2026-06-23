const mongoose = require("mongoose");

const portfolioHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    totalBalanceUSDT: {
      type: Number,
      default: 0,
    },

    snapshotDate: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("portfolioHistory", portfolioHistorySchema);
