var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tempSchema = new Schema({
  "sellorderId"    : { type: mongoose.Schema.Types.ObjectId, ref:'orderPlace', index:true },
  "sellerUserId"   : { type: mongoose.Schema.Types.ObjectId, ref:'users', index:true },
  "seller_ordertype"  : { type: String, default:''},
  "askAmount"         : { type: Number, default:0 },
  "askPrice"          : { type: Number, default:0 },
  "type"              : { type: String, default:'' },
  "firstCurrency"     : { type: String, index:true },
  "secondCurrency"    : { type: String, index:true },
  "filledAmount"      : { type: Number, default:0 },
  "marginAmount"      : { type: Number, default:0 },
  "fxAmount"          : { type: Number, default:1 },
  "fxAmountRev"       : { type: Number, default:1 },
  "buyorderId"        : { type: mongoose.Schema.Types.ObjectId, ref:'orderPlace', index:true },
  "buyerUserId"       : { type: mongoose.Schema.Types.ObjectId, ref:'users', index:true },
  "buyer_ordertype"   : { type: String, default:''},
  "total"             : { type: Number, default:0 },
  "buy_fee"           : { type: Number, default:0 },
  "sell_fee"          : { type: Number, default:0 },
  "pair"              : { type: String, index:true },
  "liquid_spread"     : { type: Number, default:0 },
  "liquid_fee"        : { type: Number, default:0 },
  "cancel_id"         : { type: String, default:null },
  "cancel_order"      : { type: String, default:"" },
  "site"              : { type: String, default:"Sample" },
  "position"          : { type: Number, default:0 },
  "lendIntrest"       : { type: Number, default:0 },
  "datetime"          : { type: Date, default:Date.now },
  "created_at"        : { type: Date, default:Date.now },
  'orderId':{
    type: String,
    default: function() {
      return new Date().getTime();
    },
    unique: true
  },
 });
module.exports = mongoose.model('futureconfrimOrder', tempSchema, 'futureconfrimOrder')
