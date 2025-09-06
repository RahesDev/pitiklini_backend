const mongoose = require('mongoose');

const homeSchema = mongoose.Schema({
    bannercontent1_title: { type: String, default: '' },
    bannercontent1_desc: { type: String, default: '' },
    bannercontent2_title: { type: String, default: '' },
    bannercontent2_desc: { type: String, default: '' },
    bannercontent3_title: { type: String, default: '' },
    bannercontent3_desc: { type: String, default: '' },
    url1: { type: String, default: '' },
    url2: { type: String, default: ''  },
    url3: { type: String, default: ''  },
    featuretitle1: { type: String, default: '' },
    featuretitlec1: { type: String, default: '' },
    iconurl1: { type: String, default: '' },
    featuretitle2: { type: String, default: '' },
    featuretitlec2: { type: String, default: '' },
    iconurl2: { type: String, default: '' },
    featuretitle3: { type: String, default: '' },
    featuretitlec3: { type: String, default: '' },
    iconurl3: { type: String, default: '' },
    footertitle1: { type: String, default: '' },
    footertitlec1: { type: String, default: '' },
    createdDate: { type: Date, default: Date.now() },
    modifiedDate: { type: Date, default: Date.now() },
});

module.exports = mongoose.model('HomeContent', homeSchema);