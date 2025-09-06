const mongoose = require('mongoose');

const subscriberschema = mongoose.Schema({
    email       : { type: String , default : ''},
    status      : { type: String },
    created_at  : {type: Date, default: Date.now()},
    updated_at  : {type: Date, default: Date.now()},
});

module.exports = mongoose.model('subscriber', subscriberschema);