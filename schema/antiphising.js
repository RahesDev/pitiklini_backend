const mongoose = require('mongoose');

const antiphishingSchema = mongoose.Schema({
    userid: {
        type:mongoose.Schema.Types.ObjectId, ref: 'Users', index:true
    },
    APcode: { type: String, default: '' },
    dupApcode: { type: String, default: '' },
    email: { type: String, default: '' },
    Status: { type: String, default: 'true' },
    emailOtp: { type: String, default: '' },
    otpGenerateAt: { type: Date, default: Date.now },
    createdDate: { type: Date, default: Date.now() },
    modifiedDate: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('antiphishing', antiphishingSchema);