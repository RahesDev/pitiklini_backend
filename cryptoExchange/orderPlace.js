var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var orderPlaceDB = require("../schema/orderPlace");
var mongoose = require("mongoose");
var orderTypeFunction = require("../cryptoExchange/orderTypenew");
var stopOrderToRedis = require("../cryptoExchange/stopOrderRedis");
const usersDB = require("../schema/users");
var userWalletDB = require("../schema/userWallet");
const { check, body, validationResult } = require("express-validator");

const redis = require("redis");
const sitesettings = require("../schema/sitesettings");
client = redis.createClient();

const tradeRedis = require("../tradeRedis/activeOrderRedis");

const trade_pair = require("../schema/trade_pair");

router.post(
  "/orderPlace",
  [
    body("type").isString().withMessage("Type must be a string").notEmpty().withMessage("Type cannot be empty").isIn(["buy", "sell"]).withMessage("Type must be either buy or sell"),
    body("orderType").isString().withMessage("Order type must be a string").notEmpty().withMessage("Order type cannot be empty"),
    body("amount").isNumeric().withMessage("Amount must be a number").notEmpty().withMessage("Amount cannot be empty").custom((value) => value > 0).withMessage("Amount must be greater than 0"),
    body("price").isNumeric().withMessage("Price must be a number").notEmpty().withMessage("Price cannot be empty").custom((value) => value > 0).withMessage("Price must be greater than 0"),
    body("total").isNumeric().withMessage("Total must be a number").notEmpty().withMessage("Total cannot be empty").custom((value) => value > 0).withMessage("Total must be greater than 0"),
    body("pair").isString().withMessage("Pair must be a string").notEmpty().withMessage("Pair cannot be empty"),
    body("pair_id").isString().withMessage("Pair ID must be a string").notEmpty().withMessage("Pair ID cannot be empty"),
  ],
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(200).json({ errors: errors.array() });
      }

      const { pair, amount, price, type, orderType, fromCurrency, toCurrency, pair_id, stop_price } = req.body;
      const userId = req.userId;

      // Fetch user and site data in parallel
      const [pairResult, user, siteData] = await Promise.all([
        // client.hgetAsync("tradepair", pair),
        trade_pair.findOne({ pair: pair }),
        usersDB.findOne({ _id: userId }, { kycstatus: 1, verifyEmail: 1, status: 1, tradestatus: 1, ptk_fee_status: 1 }).exec(),
        sitesettings.findOne({})
      ]);

      if (!user) return res.status(200).json({ status: false, Message: "User not found!" });

      // Precompute user status checks
      const kycMessage = "Trading is unavailable until you finish the KYC process.";
      const verifyMessage = "Please verify your account to trade.";
      const tradeMessage = "Trading is disabled for your account.";
      const siteDeactivemessage = "Trading is unavailable. Please wait for operations to resume.";

      const checkStatus = user.kycstatus != 1 ? kycMessage :
        user.verifyEmail != 1 ? verifyMessage :
          user.tradestatus != 0 ? tradeMessage :
            siteData.tradeStatus != 0 ? siteDeactivemessage : "";

      if (checkStatus) return res.status(200).json({ success: checkStatus });

      // const pairData = JSON.parse(pairResult);
      const pairData = pairResult;

      if (pairData.status !== "1") {
        return res.status(200).json({
          status: false,
          Message: "Trading for this pair is currently unavailable.",
        });
      }

      // Validate amount and price
      if (amount < pairData.min_trade_amount || amount > pairData.max_trade_amount) {
        return res.status(200).json({
          status: false,
          Message: `Trade quantity must be between ${pairData.min_trade_amount} and ${pairData.max_trade_amount}.`
        });
      }

      const balanceId = type === "buy" ? pairData.to_symbol_id : pairData.from_symbol_id;
      const balanceCheck = type === "buy" ? amount * price : amount;

      const balanceData = await userWalletDB.findOne(
        { userId },
        { wallets: { $elemMatch: { currencyId: balanceId } } }
      );

      const { amount: balance, holdAmount } = balanceData.wallets[0];

      if (balance < balanceCheck) {
        return res.status(200).json({
          status: false,
          Message: "Insufficient balance!",
        });
      }

      const orderDetails = {
        userId: mongoose.mongo.ObjectId(userId),
        amount,
        price,
        tradeType: type,
        fee: 0,
        total: amount * price,
        ordertype: orderType,
        pairId: pair_id,
        pairName: pair,
        // status: siteData.tradeStatus,
        partial_price: 0,
        stoporderprice: stop_price,
        limit_price: 0,
        trigger_price: 0,
        makerFee: pairData.makerFee,
        takerFee: pairData.takerFee,
        filledAmount: amount,
        firstCurrency: pairData.from_symbol_id,
        secondCurrency: pairData.to_symbol_id,
        firstSymbol: pairData.from_symbol,
        toSymbol: pairData.to_symbol,
        liquidity_name: pairData.liquidity_name,
        fee_currency: (user.ptk_fee_status == 1) ? "PTK" : type == "buy" ? pairData.from_symbol : pairData.to_symbol 
      };

      const createOrder = await orderPlaceDB.create(orderDetails);

      if (!createOrder) {
        return res.status(200).json({
          status: false,
          Message: "Please try again later",
        });
      }

      await userWalletDB.updateOne(
        { userId, "wallets.currencyId": balanceId },
        {
          $inc: {
            "wallets.$.amount": -balanceCheck,
            "wallets.$.holdAmount": balanceCheck,
          },
        }
      );

      // common.updateActiveOrders();

      await tradeRedis.activeOrdersSet();

      switch (orderType) {
        case "Limit":
          orderTypeFunction.limitOrderPlace(createOrder, pairData);
          break;
        case "Market":
          orderTypeFunction.marketOrderPlace(createOrder, pairData);
          break;
        case "Stop":
          orderTypeFunction.stopOrderPlace(createOrder, pairData);
          stopOrderToRedis.stopOrderSetToRedis(createOrder, pairData);
          break;
      }

      return res.status(200).json({
        status: true,
        Message: "Order Placed Successfully",
      });

    } catch (error) {
      console.log("error::err", error);
      return res.status(500).json({ error: "An error occurred" });
    }
  }
);

router.get("/checking", async (req, res) => {
  const OrderData = {
    userId: "66c84943ac395a46d062b6b3",
    amount: 0.00038,
    price: 64584.74,
    fee: 0,
    total: 24.5422012,
    ordertype: 'Market',
    pairName: 'BTC_USDT',
    status: 'Active',
    reason: '',
    partial_price: 0,
    stoporderprice: 0,
    limit_price: 0,
    trigger_price: 0,
    fee_per: 0,
    makerFee: 9,
    takerFee: 0,
    filledAmount: 0,
    firstSymbol: 'BTC',
    toSymbol: 'USDT',
    liquidity_name: 'BTCUSDT',
    site: 'Pitiklini',
    error: '',
    margin: 0,
    oco: 0,
    _id: "66fa5bd39d6efb58148650e4",
    tradeType: 'buy',
    pairId: "66e44c6322a7fe237069cf62",
    firstCurrency: "66e43a6c22a7fe237069cc1d",
    secondCurrency: "66e43f0922a7fe237069cd93",
    orderId: '1727683539725',
  };
  const pairData = {
    status: '1',
    marketPrice: 58245.99,
    makerFee: 9,
    takerFee: 0,
    min_trade_amount: 0.00001,
    max_trade_amount: 9000,
    liquidity_status: '1',
    liquidity_available: '1',
    liquidity_name: 'BTCUSDT',
    price_decimal: 2,
    amount_decimal: 5,
    buyspread: null,
    sellspread: null,
    trade_price: 0,
    highest_24h: 0,
    lowest_24h: 0,
    changes_24h: 0,
    volume_24h: 0,
    value_24h: 0,
    margin_interest: 0.01,
    min_qty: 0.00001,
    max_qty: 9000,
    min_price: 0.01,
    max_price: 1000000,
    min_total: 5,
    max_total: 0.01,
    liq_price_decimal: 2,
    liq_amount_decimal: 5,
    liquidity_provider: 'binance',
    _id: "66e44c6322a7fe237069cf62",
    to_symbol_id: "66e43f0922a7fe237069cd93",
    from_symbol_id: "66e43a6c22a7fe237069cc1d",
    to_symbol: 'USDT',
    from_symbol: 'BTC',
    pair: 'BTC_USDT',
    __v: 0
  }

  orderTypeFunction.marketOrderPlace(OrderData, pairData);

});


module.exports = router;


// {
//   userId: 66c84943ac395a46d062b6b3,
//   amount: 0.00038,
//   price: 64584.74,
//   fee: 0,
//   total: 24.5422012,
//   ordertype: 'Limit',
//   pairName: 'BTC_USDT',
//   status: 'Active',
//   reason: '',
//   partial_price: 0,
//   stoporderprice: 0,
//   limit_price: 0,
//   trigger_price: 0,
//   fee_per: 0,
//   makerFee: 9,
//   takerFee: 0,
//   filledAmount: 0,
//   firstSymbol: 'BTC',
//   toSymbol: 'USDT',
//   liquidity_name: 'BTCUSDT',
//   site: 'Pitiklini',
//   error: '',
//   margin: 0,
//   oco: 0,
//   _id: 66fa5bd39d6efb58148650e4,
//   tradeType: 'buy',
//   pairId: 66e44c6322a7fe237069cf62,
//   firstCurrency: 66e43a6c22a7fe237069cc1d,
//   secondCurrency: 66e43f0922a7fe237069cd93,
//   orderId: '1727683539725',
//   updateddate: 2024-09-30T08:05:39.725Z,
//   createddate: 2024-09-30T08:05:39.725Z,
//   __v: 0
// } {
//   status: '1',
//   marketPrice: 58245.99,
//   makerFee: 9,
//   takerFee: 0,
//   min_trade_amount: 0.00001,
//   max_trade_amount: 9000,
//   liquidity_status: '1',
//   liquidity_available: '1',
//   liquidity_name: 'BTCUSDT',
//   price_decimal: 2,
//   amount_decimal: 5,
//   buyspread: null,
//   sellspread: null,
//   trade_price: 0,
//   highest_24h: 0,
//   lowest_24h: 0,
//   changes_24h: 0,
//   volume_24h: 0,
//   value_24h: 0,
//   margin_interest: 0.01,
//   createdDate: null,
//   modifiedDate: 2024-09-26T08:41:28.119Z,
//   min_qty: 0.00001,
//   max_qty: 9000,
//   min_price: 0.01,
//   max_price: 1000000,
//   min_total: 5,
//   max_total: 0.01,
//   liq_price_decimal: 2,
//   liq_amount_decimal: 5,
//   liquidity_provider: 'binance',
//   _id: 66e44c6322a7fe237069cf62,
//   to_symbol_id: 66e43f0922a7fe237069cd93,
//   from_symbol_id: 66e43a6c22a7fe237069cc1d,
//   to_symbol: 'USDT',
//   from_symbol: 'BTC',
//   pair: 'BTC_USDT',
//   __v: 0
// }