const mongoose = require('mongoose');

const BankDetailSchema = mongoose.Schema({
    userid: { type:mongoose.Schema.Types.ObjectId, ref: 'Users', index:true},
    Accout_HolderName: { type: String, default:"" }, // required
    Account_Number: { type: String, default: "" }, // required
    Account_Type: { type: String, default: "" },
    Bank_Name: { type: String, default: '' }, // required
    Branch_Name: { type: String, default: '' },
    Upid_ID: { type: String, default: '' },
    Paytm_ID: { type: String, default: '' },
    IFSC_code: { type: String, default: '' },
    
    QRcode: { type: String, default: '' },
    type: { type: String, default: '' },
    Status:{type:Number,dafault: 0},
    Paymentmethod_name: { type: String, default: '' },  // required
    Currency: { type: String, default: '' },  // required
    
},  
{ timestamps: true });

module.exports = mongoose.model('bankdetails', BankDetailSchema);