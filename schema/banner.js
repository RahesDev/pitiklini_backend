const mongoose = require('mongoose');

const bannerSchema = mongoose.Schema({
    image: { type: String, default: '' },
    status: { type: String, default: 'active' }
});

module.exports = mongoose.model('banner', bannerSchema);