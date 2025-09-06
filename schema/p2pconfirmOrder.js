var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tempSchema = new Schema({
  "map_orderId"    : { type: String },
  "map_userId"   : { type: mongoose.Schema.Types.ObjectId, ref:'users', index:true },
  "p2p_orderId"   : { type: mongoose.Schema.Types.ObjectId, ref:'p2pOrders', index:true },
  "fromCurrency"    : { type: String},
  "toCurrency"    : { type: String},
  "firstCurrency"    : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
  "secondCurrency"   : { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
  "askAmount"         : { type: Number, default:0 },
  "askPrice"          : { type: Number, default:0 },
  "type"              : { type: String, default:'' },
  "paymentMethod"              : { type: String, default:'' },
  "filledAmount"      : { type: Number, default:0 },
  "userId"       : { type: mongoose.Schema.Types.ObjectId, ref:'users', index:true },
  "status": {type:Number, default:0}, // 1 - buyer paid, 2 - seller released
  "dispute_status" : { type: Number, default:0 }, // 0 - no, 1-raised, 2-solved
  "dispute_reason" : { type: String},
  "datetime"          : { type: Date, default:Date.now },
  "paytime"          : { type: Date },
  'orderId':{
    type: String
  },
  "hold_userId"   : { type: mongoose.Schema.Types.ObjectId, ref:'users', index:true },
 }, { timestamps: true });
module.exports = mongoose.model('p2pconfirmOrder', tempSchema, 'p2pconfirmOrder')
