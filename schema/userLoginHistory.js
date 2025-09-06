const mongoose = require('mongoose');

const UserloginSchema = mongoose.Schema({
    useremail       : { type: String,default:'' },
    phone       : { type: Number },
    ipAddress   : { type: String ,default:''},
    browser     : { type: String,default:'' },
    OS          : { type: String,default:''},
    platform    : {type :String,default:''},
    activitity    : {type :String,default:''},
	user_id     : {type:mongoose.Schema.Types.ObjectId, ref: 'user', index:true},
    createdDate : {type: Date, default: Date.now()},
    modifiedDate: {type: Date, default: Date.now()},
});

module.exports = mongoose.model('userloginhistory', UserloginSchema);