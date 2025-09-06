const mongoose = require("mongoose");
var userAddressDbSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      index: true,
    },
    address: {
      type: String,
      default: "",
    },
    currency: {
      type: String,
    },
    network: {
      type: String,
    },
  },
  {timestamps: true}
);

var address = mongoose.model("userAddress", userAddressDbSchema, "userAddress");

module.exports = address;
