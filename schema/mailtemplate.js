const mongoose = require('mongoose');

const emailSchema = mongoose.Schema({
    Subject: { type: String },
    body: { type: String },
    key: { type: String },
    status:{type:String},
    createdDate: {type: Date, default: Date.now()},
    modifiedDate: {type: Date, default: Date.now()},
});

module.exports = mongoose.model('Emailtemplate', emailSchema,'Emailtemplate');