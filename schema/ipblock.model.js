const mongoose = require('mongoose');

const IpblockSchema = mongoose.Schema({
    ip_address: { type: String, default: 0 },
    status: { type: String, default: "Active"},
    expireTime	 : {type:Date,index:true}
},{timestamps:true});

module.exports = mongoose.model('ipblock', IpblockSchema);