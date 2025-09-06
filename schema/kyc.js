const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");

const kycSchema = mongoose.Schema({
    userId      : { type: mongoose.Types.ObjectId, ref: 'Users',index:true },
    email       : { type: String, default: '' },
   
    mobileNumber       : { type: String, default: '' },
    fullname    : { type: String, default: '' },
    dob    : { type: String, default: '' },
    nationality    : { type: String, default: '' },
    residential    : { type: String, default: '' },
    verfiType    : { type: String, default: '' },
    frontDoc    : { type: String, default: '' },
    backDoc    : { type: String, default: '' },
    selfieDoc      : { type: String, default: '' }, //addressproof
    kycStatus   : { type: Number, default: 0 }, //2=>Pending,1=>verified,2=>3reject
    username    : { type: String, default: '' },

    // doccBack      : { type: String, default: '' }, // idproof
    // proof3      : { type: String, default: '' }, // photoproof
    // IdNumber      : { type: String, default: '' },
    // kycStatus   : { type: Number, default: 0 }, //2=>Pending,1=>verified,2=>3reject
    rejectReson : { type: String, default: '' },
    approveReson: { type: String, default: '' },
    kycComment  : { type: String, default: '' },
    // kycComment  : { type: String, default: '' },
    // prrof1status  : { type: Number, default:0 },
    // prrof2status  : { type: Number, default:0 },
    // prrof3status  : { type: Number, default: 0 },
    // prrof1reject  : { type: String, default: '' },
    // prrof2reject  : { type: String, default: '' },
    // prrof3reject  : { type: String, default: '' },
    // name  : { type: String },
    // kyc_email  : { type: String },
    created_at  : {type: Date,    default: Date.now()},
    updated_at  : {type: Date,    default: Date.now()},
});
kycSchema.plugin(mongoosePaginate);

// Create an index on userId
kycSchema.index({ userId: 1 }); // 1 for ascending order

module.exports = mongoose.model('kyc', kycSchema,'kyc');