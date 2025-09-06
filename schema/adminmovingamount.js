const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");

const adminMove = mongoose.Schema({
    from_address: { type: String, default: ''},
    to_address: { type: String, default: ''},
    amount: { type: String, default: ''},
    transaction_has: { type: String, default: ''},
    depsoitid: { type: String, default: ''},
},{ timestamps: true });
adminMove.plugin(mongoosePaginate);

module.exports = mongoose.model('adminmovingdeposits', adminMove);