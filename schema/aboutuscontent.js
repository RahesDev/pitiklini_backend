const mongoose = require('mongoose');

const AboutusSchema = mongoose.Schema({
    section1_title: { type: String, default: '' },
    section1_desc: { type: String, default: '' },
    section2_title: { type: String, default: '' },
    section2_desc: { type: String, default: '' },
    section3_title: { type: String, default: '' },
    section3_desc: { type: String, default: '' },
    video_link: { type: String, default: '' },
    url1: { type: String, default: '' },
    url2: { type: String, default: ''  },
    createdDate: { type: Date, default: Date.now() },
    modifiedDate: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('AboutusContent', AboutusSchema);