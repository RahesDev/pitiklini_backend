const mongoose    = require('mongoose');

const faqSchema   = mongoose.Schema({
    question      : { type: String },
    answer        : { type: String },
    status        : { type: String },
    created_at    : {type: Date, default: Date.now()},
    updated_at    : {type: Date, default: Date.now()},
});

module.exports = mongoose.model('faq', faqSchema);