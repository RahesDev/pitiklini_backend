const mongoose = require('mongoose');

const supportlistSchema = mongoose.Schema({
    userId: { type: mongoose.Types.ObjectId, ref: 'users' },
    subject: { type: String },
    category: { type: String},
    supportcategoryId: { type: mongoose.Types.ObjectId, ref: 'supportcategory' },
    message: { type: String },
    image: { type: String },
    status: { type: String, default:"0" }, // 0-open, 1- close
    reply:[
        {
            message: { type: String},
            tag: { type: String},
            image: { type: String},
            posted_at: {type: Date, default: Date.now()}
        }
    ],
    created_at: {type: Date, default: Date.now()},
    updated_at: {type: Date, default: Date.now()},
});

module.exports = mongoose.model('supportlist', supportlistSchema);