const mongoose = require('mongoose');

const LanguageSchema = mongoose.Schema({
    name: { type: String },
    symbol: { type: String },
    status: { type: String},
    created_at: { type: Date, default: Date.now() },
    updated_at: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('Language', LanguageSchema);