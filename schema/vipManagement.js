const mongoose = require("mongoose");

const vipManagementSchema = new mongoose.Schema({
  USDT: {
    type: Number,
    default: 0,
  },
  PTK: {
    type: Number,
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("vipManagement", vipManagementSchema);
