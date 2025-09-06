var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tempSchema = new Schema({
  "userId": { type: mongoose.Schema.Types.ObjectId, ref: 'users', index: true },
  "type": { type: String, default: '' },
  "query": { type: String },
  "attachment": { type: String },
  "orderId": { type: String },
  "p2p_orderId": { type: String },
  "status": {
    type: String,
    enum: ['raised', 'cancel', 'resolved', 'not_resolved'],
    default: 'raised'
  }

}, { timestamps: true });

module.exports = mongoose.model('p2pdispute', tempSchema, 'p2pdispute');
