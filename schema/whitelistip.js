const mongoose = require('mongoose');

const IpwhitelistSchema = mongoose.Schema({
    ip_address: { type: String, default: 0 },
    status: { type: String, default: "Active"}
},{timestamps:true});

module.exports = mongoose.model('whitelistip', IpwhitelistSchema);