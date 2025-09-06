const mongoose = require("mongoose");

const CmsSchema = mongoose.Schema({
  heading: {type: String},
  title: {type: String},
  meta_keyword: {type: String},
  meta_description: {type: String},
  link: {type: String},
  content_description: {type: String},
  status: {type: String},
  created_at: {type: Date, default: Date.now()},
  updated_at: {type: Date, default: Date.now()},
  page: {type: String},
});

module.exports = mongoose.model("cms", CmsSchema, "cms");
