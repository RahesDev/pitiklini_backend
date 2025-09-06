const mongoose = require('mongoose');

const tradePairSchema = mongoose.Schema({
    from_symbol_id: { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
    to_symbol_id: { type: mongoose.Schema.Types.ObjectId, ref: 'currency', index:true},
    from_symbol: { type:String},
    to_symbol: { type: String},
    pair: { type: String },
    status:{ type: String, default: 0  },
    marketPrice: { type: Number, default: 0 },
    makerFee : { type: Number, default: 0.01 },
    takerFee : { type: Number, default: 0.01 },
    min_trade_amount: { type: Number, default: 0.01 },
    max_trade_amount: { type: Number, default:0.01 },
    liquidity_status : { type: String, default: "1" ,index:true}, // 1-active,0-deactive
    liquidity_available : { type: String, default: "1" }, // 1-available,0-notavailable
    liquidity_name : { type: String, default: '' },
    price_decimal : { type: Number, default: 8 },
    amount_decimal  : { type: Number, default: 8 },
    buyspread  : { type: Number, default: 1 },
    sellspread : { type: Number, default: 1 },
    trade_price: {  type: Number, default: 0 },
    highest_24h: {  type: Number, default: 0 },
    lowest_24h: { type: Number, default: 0 },
    changes_24h: {  type: Number, default: 0 },
    volume_24h: {  type: Number, default: 0 },
    value_24h: {  type: Number, default: 0 },
    margin_interest : { type: Number, default: 0.01 },
    createdDate: { type: Date, default: Date.now() },
    modifiedDate: { type: Date, default: Date.now() },
    min_qty: { type: Number, default: 0.01 }, // binance liquidity
    max_qty: { type: Number, default:0.01 }, // binance liquidity
    min_price: { type: Number, default: 0.01 }, // binance liquidity
    max_price: { type: Number, default:0.01 }, // binance liquidity
    min_total: { type: Number, default: 0.01 }, // binance liquidity
    max_total: { type: Number, default:0.01 }, // binance liquidity
    liq_price_decimal : { type: Number, default: 8 }, // binance liquidity
    liq_amount_decimal  : { type: Number, default: 8 }, // binance liquidity
    liquidity_provider: { type: String, default: 'binance'}
});

module.exports = mongoose.model('trade_pair', tradePairSchema,'trade_pair');