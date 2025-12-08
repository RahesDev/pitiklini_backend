const mongoose = require("mongoose");

const vipUserSchema = mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, ref: "user", index: true },
  currency: { type: String },
  amount: { type: Number },
  status: { type: String, default: "active" }, // active / deactive
  date: { type: Date, default: Date.now },
  reminderSent: { type: Boolean, default: false },
  reminderSent: { type: Boolean, default: false },
  renewAttempted: { type: Boolean, default: false },
});

module.exports = mongoose.model("vipUser", vipUserSchema, "vipUser");
