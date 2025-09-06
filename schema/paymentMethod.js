const mongoose = require('mongoose');

const paymentMethodSchema = mongoose.Schema({
    payment_name: { type: String },
    status: { type: String },
    created_at: {type: Date, default: Date.now()},
    updated_at: {type: Date, default: Date.now()},
});

module.exports = mongoose.model('paymentMethod', paymentMethodSchema);