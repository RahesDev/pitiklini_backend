const mongoose = require('mongoose');

const AdminloginSchema = mongoose.Schema({
    email       : { type: String },
    ipAddress   : { type: String },
    browser     : { type: String },
    OS          : { type: String},
    platform    : {type :String},
    createdDate : {type: Date, default: Date.now()},
    modifiedDate: {type: Date, default: Date.now()},
});

module.exports = mongoose.model('adminloginhistory', AdminloginSchema);