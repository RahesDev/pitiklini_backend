const mongoose = require('mongoose');

const supportcategorySchema = mongoose.Schema({
    category: { type: String },
    status: { type: String },
    created_at: {type: Date, default: Date.now()},
    updated_at: {type: Date, default: Date.now()},
});

module.exports = mongoose.model('supportcategory', supportcategorySchema);