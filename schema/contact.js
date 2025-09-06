const mongoose = require('mongoose');

const contactususSchema = mongoose.Schema({
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    mobile: { type: Number },
    message: { type: String, default: '' },
    status: { type: Number, default: 0 },
    createdDate: { type: Date, default: Date.now() },
    modifiedDate: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('contact', contactususSchema);