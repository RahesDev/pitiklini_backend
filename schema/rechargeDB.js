const mongoose = require("mongoose");

const rechargeSchema = new mongoose.Schema({
  userId: String,
  number: String,
  operatorCode: String,
  planId: String,
  transactionId: String,
  status: String,
  date: Date,
});

module.exports = mongoose.model("rechargeDB", rechargeSchema);
