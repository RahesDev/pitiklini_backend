const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let loginattempts = new Schema({

  email: { type: String, required: true, unique: true },
  attempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null }
  
},{timestamps:true});

module.exports = mongoose.model('loginAttempts', loginattempts);