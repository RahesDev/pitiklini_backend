const mongoose = require('mongoose');

const KeysSchema = mongoose.Schema({
    c_key1: {type: String},
    c_key2: {type: String},
    c_key3: {type: String},
    c_key4: {type: String},
    c1_key1: {type: String},
    c1_key2: { type: String},
    c1_key3: {type: String},
    c1_key4: {type: String},
    c2_key1: {type: String},
    c2_key2: { type: String}
});

module.exports = mongoose.model('Keys', KeysSchema, 'Keys');