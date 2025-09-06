const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");

const adminBankDetailSchema = mongoose.Schema({
    adminID: {  type: mongoose.Schema.ObjectId, required: true, trim: true},
    currency_id  : {type: mongoose.Types.ObjectId,ref: 'currency',index:true},
    Account_Number: { type: Number, default: 0, unique : true},
    Bank_Name: { type: String, default: ''},
    IFSC_code: { type: String, default: ''},
    Branch_Name: { type: String, default: ''},
    Name: { type: String, default: ''},
    Account_type: {type:String},
    currency: {type:String},
    status: {type: String, default: '0'} // 1 - active, 0 - inactive
},{ timestamps: true });
adminBankDetailSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('adminBankdetails', adminBankDetailSchema);