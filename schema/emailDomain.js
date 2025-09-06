var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var emailDomainSchema= new Schema({
  "email_domain": { type: String, default: "" },
  "date": { type: Date, default: Date.now },
  "status": { type: String, default: "DeActive" },
});

module.exports = mongoose.model('domainBlocks', emailDomainSchema, 'domainBlocks');