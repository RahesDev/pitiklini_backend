var mongoose = require("mongoose");
var orderPlaceDB = require("../schema/orderPlace");
const ObjectId = mongoose.Types.ObjectId;
const confirmOrderDB = require("../schema/confirmOrder");
const profitDb = require("../schema/profit");
const common = require("../helper/common");
const BinanceExchangeWS = require("../exchanges/binance");
const activeOrderRedis = require("../tradeRedis/activeOrderRedis");
const tradeRedis = require("../tradeRedis/activeOrderRedis");
const cron = require("node-cron");
const userWalletDB = require("../schema/userWallet");
const referralHistoryDB = require("../schema/referralHistory");
const WebSocket = require("ws");
const redis = require("redis");
client = redis.createClient();
const key = common.decryptionLevel(process.env.BINANCE_API_KEY);
const secret = common.decryptionLevel(process.env.BINANCE_SECRET_KEY);
// const key = process.env.BINANCE_API_KEY;
// const secret = process.env.BINANCE_SECRET_KEY;
const axios = require("axios");
const { MainClient } = require("binance");
const binanceClient = new MainClient({
  api_key: key,
  api_secret: secret,
});
const crypto = require("crypto");
const stopExchange = require("../cryptoExchange/stopOrderRedis");
const redisHelper = require("../services/redis");
const qs = require("qs");
const getallbalance_url = "/sapi/v1/capital/config/getall";

var request = require("request");
const baseurl = process.env.BINANCE_API;
const usersDB = require("../schema/users");
var mailtempDB = require("../schema/mailtemplate");
var mail = require("../helper/mailhelper");
const adminDB = require("../schema/admin");
const async = require("async");

var currate = 1;
client.hget("ReverseConversion", "allpair", async function (err, value) {
  currate = value;
});

const tradePairDB = require("../schema/trade_pair");

const orderTypenew = {
  limitOrderPlace: async (limitOrderData, pairdData) => {
    // Determine the action based on liquidity status
    const {
      status,
      liquidity_status,
      liquidity_provider,
      from_symbol,
      to_symbol,
      buyspread
    } = pairdData;
    console.log("pairdData",pairdData)
    const userId = limitOrderData.userId;
    const isLiquidityOff = liquidity_status === "0";
    const isLiquidityOn = liquidity_status === "1";

    if (status === "1" && isLiquidityOff) {
      // Liquidity off mode: execute our site
      matching(limitOrderData, pairdData);
      return;
    }

    if (status === "1" && isLiquidityOn) {
      // Determine the condition and sorting based on trade type
      const isBuyOrder = limitOrderData.tradeType === "buy";
      const tradeConditions = {
        firstCurrency: limitOrderData.firstCurrency,
        secondCurrency: limitOrderData.secondCurrency,
        tradeType: isBuyOrder ? "sell" : "buy",
        price: isBuyOrder
          ? { $lte: limitOrderData.price }
          : { $gte: limitOrderData.price },
        $or: [{ status: "Active" }, { status: "partially" }],
        userId: { $ne: ObjectId(userId) },
        site: "Pitiklini",
      };
      const sorting = { price: isBuyOrder ? 1 : -1, createddate: 1 };

      const activeOrders = await orderPlaceDB
        .find(tradeConditions)
        .sort(sorting)
        .exec();
      if (activeOrders.length > 0) {
        matching(limitOrderData, pairdData);
        return;
      }

      // Prepare to create a new order
      let liquid_name = pairdData.liquidity_name;
      let order_price = limitOrderData.price;
      console.log("order_price===",order_price)
      const currate =
        pairdData.to_symbol === "INR" ? getCurrencyRate(from_symbol) : 1;

      // Update liquid_name and order_price if the symbol is INR
      if (pairdData.to_symbol === "INR") {
        liquid_name = `${from_symbol}USDT`;
        liquid_name = liquid_name;
        order_price *= currate;
      }

      let price_spread = order_price * (buyspread / 100);
      let price_order = +order_price - +price_spread;
      const obj = {
        symbol: liquid_name,
        quantity: parseFloat(limitOrderData.amount).toFixed(
          pairdData.liq_amount_decimal
        ),
        // price: parseFloat(order_price).toFixed(pairdData.liq_price_decimal),
        price: parseFloat(price_order).toFixed(pairdData.liq_price_decimal),
        side: isBuyOrder ? "BUY" : "SELL",
        type: "LIMIT",
      };

      // Execute the create order function based on liquidity provider
      if (liquidity_provider === "binance") {
        binanceCreateOrder(obj, limitOrderData);
      }
    }
  },

  marketOrderPlace: async (marketOrderData, pairdData) => {
    console.log("call market matching===", marketOrderData);
    const {
      status,
      liquidity_status,
      liquidity_provider,
      from_symbol,
      to_symbol,
    } = pairdData;
    const userId = marketOrderData.userId;
    const isLiquidityOff = liquidity_status === "0";
    const isLiquidityOn = liquidity_status === "1";

    if (status === "1" && isLiquidityOff) {
      marketMatching(marketOrderData, pairdData);
      return;
    }

    if (status === "1" && isLiquidityOn) {

      console.log("Liquidity");
      const isBuyOrder = marketOrderData.tradeType === "buy";
      const tradeConditions = {
        firstCurrency: marketOrderData.firstCurrency,
        secondCurrency: marketOrderData.secondCurrency,
        tradeType: isBuyOrder ? "sell" : "buy",
        price: isBuyOrder
          ? { $lte: marketOrderData.price }
          : { $gte: marketOrderData.price },
        $or: [{ status: "Active" }, { status: "partially" }],
        userId: { $ne: ObjectId(userId) },
        site: "Pitiklini",
      };

      console.log(tradeConditions, "tradeConditions");
      const sorting = { price: isBuyOrder ? 1 : -1, createddate: 1 };

      const activeOrders = await orderPlaceDB
        .find(tradeConditions)
        .sort(sorting)
        .exec();
      console.log(activeOrders, "activeOrders");

      if (activeOrders.length > 0) {
        marketMatching(marketOrderData, pairdData);
        return;
      }

      // Prepare to create a new market order
      let liquid_name = pairdData.liquidity_name;
      let order_price = marketOrderData.price;
      const currate =
        pairdData.to_symbol === "INR" ? getCurrencyRate(from_symbol) : 1;

      if (pairdData.to_symbol === "INR") {
        liquid_name = `${from_symbol}USDT`;
        liquid_name = liquid_name;
        order_price *= currate;
      }

      const obj = {
        symbol: liquid_name,
        quantity: parseFloat(marketOrderData.amount).toFixed(
          pairdData.liq_amount_decimal
        ),
        price: parseFloat(order_price).toFixed(8),
        side: marketOrderData.tradeType.toUpperCase(),
        type: "MARKET",
      };

      if (liquidity_provider === "binance") {
        binanceCreateOrder(obj, marketOrderData);
      }
    }
  },

  stopOrderPlace: async (stopOrderData, pairdData) => {
    console.log(
      stopOrderData,
      "stopOrderData",
      "-----------stopOrderData----------"
    );
    const {
      status,
      liquidity_status,
      liquidity_provider,
      from_symbol,
      to_symbol,
    } = pairdData;
    const userId = stopOrderData.userId;
    const isLiquidityOff = liquidity_status === "0";
    const isLiquidityOn = liquidity_status === "1";

    if (status === "1" && isLiquidityOff) {
      stopOrder(stopOrderData);
      return;
    }

    if (status === "1" && isLiquidityOn) {
      const isBuyOrder = stopOrderData.tradeType === "buy";
      const tradeConditions = {
        firstCurrency: stopOrderData.firstCurrency,
        secondCurrency: stopOrderData.secondCurrency,
        tradeType: isBuyOrder ? "sell" : "buy",
        price: isBuyOrder
          ? { $lte: stopOrderData.price }
          : { $gte: stopOrderData.price },
        $or: [{ status: "Active" }, { status: "partially" }],
        userId: { $ne: ObjectId(userId) },
        site: "Pitiklini",
      };
      const sorting = { price: isBuyOrder ? 1 : -1, createddate: 1 };

      const activeOrders = await orderPlaceDB
        .find(tradeConditions)
        .sort(sorting)
        .exec();
      if (activeOrders.length > 0) {
        stopOrder(stopOrderData);
        return;
      }

      // Prepare to create a new stop order
      let liquid_name = pairdData.liquidity_name;
      let order_price = stopOrderData.price;
      let stop_price = stopOrderData.stoporderprice;
      const currate =
        pairdData.to_symbol === "INR" ? getCurrencyRate(from_symbol) : 1;

      if (pairdData.to_symbol === "INR") {
        liquid_name = `${from_symbol}USDT`;
        liquid_name = liquid_name;
        order_price *= currate;
        stop_price *= currate;
      }

      const obj = {
        symbol: liquid_name,
        quantity: parseFloat(stopOrderData.amount).toFixed(
          pairdData.liq_amount_decimal
        ),
        price: parseFloat(order_price).toFixed(pairdData.liq_price_decimal),
        side: stopOrderData.tradeType.toUpperCase(),
        type: "STOP_LOSS_LIMIT",
        stopPrice: parseFloat(stop_price).toFixed(pairdData.liq_price_decimal),
      };

      // Execute the create order function based on liquidity provider
      binanceCreateOrder(obj, stopOrderData);
    }
  },

  getBinanceOrder: async () => {
    try {
      await tradeRedis.activeOrdersSet();
      let activeOrderDatas = await redisHelper.RedisService.get(
        "site_activeOrders"
      );
      if (activeOrderDatas && activeOrderDatas != null) {
        for (var i = 0; i < activeOrderDatas.length; i++) {
          if (activeOrderDatas[i].site == "binance") {
            var pairsplit = activeOrderDatas[i].pairName.split("_");
            var liq_name =
              pairsplit[1] == "INR"
                ? pairsplit[0] + "USDT"
                : activeOrderDatas[i].liquidity_name;
            let inputData = {
              orderId: activeOrderDatas[i].orderId,
              timestamp: new Date().getTime(),
              symbol: liq_name,
            };
            //let inputData = { orderId:'18870743',timestamp: new Date().getTime() ,symbol: 'AVAXEUR'};

            const dataQueryString = qs.stringify(inputData);
            const signature = await crypto
              .createHmac("sha256", secret)
              .update(dataQueryString)
              .digest("hex");
            var headers = {
              "X-MBX-APIKEY": key,
            };
            const options = {
              method: "GET",
              url:
                baseurl +
                "/api/v3/order" +
                "?" +
                dataQueryString +
                "&signature=" +
                signature,
              headers: headers,
            };
            request(options, async function (error, response, body) {
              //console.log("order details===",response);
              if (!error && response.statusCode == 200) {
                var body = JSON.parse(body);
                //   console.log("order details body===",body);
                //   console.log("order details order id===",body.orderId);
                var order_status =
                  body.status.toLowerCase() == "new"
                    ? "Active"
                    : body.status.toLowerCase();
                orderPlaceDB
                  .findOneAndUpdate(
                    { orderId: body.orderId },
                    { $set: { status: order_status } }
                  )
                  .exec(function (err, orderPlaceUpd) {
                    if (!err) {
                      tradeRedis.activeOrdersSet();
                      // var currencyId =
                      //   orderPlaceUpd.tradeType == "buy"
                      //     ? orderPlaceUpd.firstCurrency
                      //     : orderPlaceUpd.secondCurrency;
                      // common.userOrderDetails(
                      //   orderPlaceUpd.userId,
                      //   orderPlaceUpd.pairName,
                      //   currencyId,
                      //   function (userDatas) {
                      //     var socketToken = common.encrypt(
                      //       orderPlaceUpd.userId.toString()
                      //     );
                      //     socketconnect.emit(
                      //       "userDetails" + socketToken,
                      //       userDatas
                      //     );
                      //   }
                      // );
                      if (order_status == "filled") {
                        updateLiquidity(orderPlaceUpd, body);
                      }
                    }
                  });
              }
            });
          }
        }
      } else {
        tradeRedis.activeOrdersSet();
      }
      setTimeout(() => {
        getBianaceorderDetails();
        //console.log("call here getbinance order")
      }, 1000 * 10);
    } catch (error) {
      console.log("ERROR FROM balanceUpdation function::", error);
    }
  },
};

// const matching = async (limitOrderData, pairdData, userIds) => {
//   try {
//     const userId = limitOrderData.userId;
//     const isBuyOrder = limitOrderData.tradeType === "buy";

//     // Construct the query condition and sorting based on trade type
//     const whereCondn = {
//       firstCurrency: limitOrderData.firstCurrency,
//       secondCurrency: limitOrderData.secondCurrency,
//       tradeType: isBuyOrder ? "sell" : "buy",
//       price: isBuyOrder ? { $lte: limitOrderData.price } : { $gte: limitOrderData.price },
//       $or: [{ status: "Active" }, { status: "partially" }],
//       userId: { $ne: ObjectId(userId) },
//       site: "Pitiklini",
//     };

//     const sorting = isBuyOrder ? { price: 1, createddate: 1 } : { price: -1, createddate: 1 };

//     // Find active orders
//     const getactiveRes = await orderPlaceDB.find(whereCondn).sort(sorting).exec();

//     if (!getactiveRes.length) return;

//     // Find a matching order
//     const getFindOrders = getactiveRes.filter(x => x.filledAmount > limitOrderData.filledAmount)[0] || getactiveRes.find(
//       x => x.price == limitOrderData.price && x.filledAmount == limitOrderData.filledAmount
//     );

//     if (!getFindOrders) return;

//     // Determine Order Price
//     const OrderPrice = getFindOrders.createddate < limitOrderData.createddate ? getFindOrders.price : limitOrderData.price;

//     // Assign Buy and Sell Orders
//     const BuyOrder = isBuyOrder ? limitOrderData : getFindOrders;
//     const SellOrder = isBuyOrder ? getFindOrders : limitOrderData;

//     const buyorderid = BuyOrder._id;
//     const buyuserid = BuyOrder.userId;
//     const sellorderid = SellOrder._id;
//     const selluserid = SellOrder.userId;

//     // Set fees and order type
//     const isBuyFirst = BuyOrder.createddate < SellOrder.createddate;
//     const buyFees = isBuyFirst ? pairdData.makerFee : pairdData.takerFee;
//     const sellFees = isBuyFirst ? pairdData.takerFee : pairdData.makerFee;
//     const ordertype = isBuyFirst ? "Sell" : "Buy";

//     const amount = limitOrderData.filledAmount;
//     const filledPrice = amount * OrderPrice;
//     const buyNewFee = (amount * buyFees) / 100;
//     const sellNewFee = (filledPrice * sellFees) / 100;

//     // Insert temp data into DB
//     const insertTempDbJson = {
//       sellorderId: ObjectId(sellorderid),
//       sellerUserId: ObjectId(selluserid),
//       seller_ordertype: SellOrder.ordertype,
//       askAmount: amount,
//       askPrice: OrderPrice,
//       firstCurrency: pairdData.currencySymbol,
//       secondCurrency: pairdData.currencySymbol,
//       buyorderId: ObjectId(buyorderid),
//       buyerUserId: ObjectId(buyuserid),
//       buyer_ordertype: BuyOrder.ordertype,
//       total: filledPrice,
//       buy_fee: buyNewFee,
//       sell_fee: sellNewFee,
//       pair: pairdData.pair,
//       type: ordertype.toLowerCase(),
//     };

//     const tempRes = await confirmOrderDB.create(insertTempDbJson);

//     if (tempRes) {
//       // Fetch buyer and seller referral data in parallel
//       const [sellerReferral, buyerReferral] = await Promise.all([
//         usersDB.findOne({ _id: ObjectId(selluserid) }),
//         usersDB.findOne({ _id: ObjectId(buyuserid) }),
//       ]);

//       // Handle referrals and profit
//       await handleReferralAndProfit(sellerReferral, buyerReferral, pairdData, sellNewFee, buyNewFee, selluserid, buyuserid, sellorderid, buyorderid);

//       // Update balances in parallel
//       const sellBalance = filledPrice - sellNewFee;
//       const buyBalance = amount - buyNewFee;

//       const userIds = { selluserid, buyuserid };
//       const confrmId = tempRes._id;

//       await Promise.all([
//         balanceUpdation(selluserid, pairdData.to_symbol_id, confrmId, sellBalance, SellOrder, amount, OrderPrice, sellFees, "sell", pairdData, userIds),
//         balanceUpdation(buyuserid, pairdData.from_symbol_id, confrmId, buyBalance, BuyOrder, amount, OrderPrice, buyFees, "buy", pairdData, userIds),
//         singlematchingFilled(pairdData, limitOrderData, getFindOrders, 0, limitOrderData.amount),
//         common.fetchInternalTickers(pairdData.pair, function (resp) { }),
//         common.fetchInternalTradehistory(pairdData.pair,function(resp){}),
//       ]);
//     }
//   } catch (err) {
//     console.error(err);
//   }
// };

const matching = async (limitOrderData, pairdData) => {
  try {
    const userId = limitOrderData.userId;
    const isBuyOrder = limitOrderData.tradeType === "buy";

    const whereCondn = {
      firstCurrency: limitOrderData.firstCurrency,
      secondCurrency: limitOrderData.secondCurrency,
      tradeType: isBuyOrder ? "sell" : "buy",
      price: { $eq: limitOrderData.price },
      $or: [{ status: "Active" }, { status: "partially" }],
      userId: { $ne: ObjectId(userId) },
      site: "Pitiklini",
    };

    const sorting = isBuyOrder ? { price: 1, createddate: 1 } : { price: -1, createddate: 1 };

    const getactiveRes = await orderPlaceDB.find(whereCondn).sort(sorting).exec();
    if (!getactiveRes.length) return;

    if(getactiveRes.length > 0)
    {
      for (let element of getactiveRes) {
        const getFindOrders = element;
        const OrderPrice = getFindOrders.createddate < limitOrderData.createddate ? getFindOrders.price : limitOrderData.price;
  
        const BuyOrder = isBuyOrder ? limitOrderData : getFindOrders;
        const SellOrder = isBuyOrder ? getFindOrders : limitOrderData;
  
        const matchableAmount = Math.min(+limitOrderData.filledAmount, +getFindOrders.filledAmount);
  
        if (matchableAmount > 0) {
          const filledPrice = matchableAmount * OrderPrice;
          const buyNewFee = (matchableAmount * pairdData.makerFee) / 100;
          const sellNewFee = (filledPrice * pairdData.makerFee) / 100;

          let buyer_details = await usersDB.findOne({_id:BuyOrder.userId},{ptk_fee_status:1});
          let seller_details = await usersDB.findOne({_id:SellOrder.userId},{ptk_fee_status:1});
  
          let tradetypes = isBuyOrder ? "buy" : "sell";
  
          const insertTempDbJson = {
            sellorderId: ObjectId(SellOrder._id),
            sellerUserId: ObjectId(SellOrder.userId),
            askAmount: matchableAmount,
            askPrice: OrderPrice,
            firstCurrency: pairdData.currencySymbol,
            secondCurrency: pairdData.currencySymbol,
            buyorderId: ObjectId(BuyOrder._id),
            buyerUserId: ObjectId(BuyOrder.userId),
            total: filledPrice,
            buy_fee: buyNewFee,
            sell_fee: sellNewFee,
            pair: pairdData.pair,
            type: isBuyOrder ? "buy" : "sell",
            fee_currency_buy: (buyer_details != null) ? (buyer_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol,
            fee_currency_sell: (seller_details != null) ? (seller_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol
          };
  
          const tempRes = await confirmOrderDB.create(insertTempDbJson);
  
          if(tempRes)
          {
            const [sellerReferral, buyerReferral] = await Promise.all([
              usersDB.findOne({ _id: ObjectId(SellOrder.userId) }),
              usersDB.findOne({ _id: ObjectId(BuyOrder.userId) }),
            ]);
      
            // Handle referrals and profit
            await handleReferralAndProfit(sellerReferral, buyerReferral, pairdData, sellNewFee, buyNewFee, SellOrder.userId, BuyOrder.userId, SellOrder._id, BuyOrder._id);
      
  
            limitOrderData.filledAmount -= matchableAmount;
            getFindOrders.filledAmount -= matchableAmount;
  
            if (limitOrderData.filledAmount <= 0) {
              limitOrderData.status = "filled";
            } else {
              limitOrderData.status = "partially";
            }
  
            if (getFindOrders.filledAmount <= 0) {
              getFindOrders.status = "filled";
            } else {
              getFindOrders.status = "partially";
            }
  
            await Promise.all([
              orderPlaceDB.updateOne(
                { _id: limitOrderData._id },
                { $set: { status: limitOrderData.status, filledAmount: limitOrderData.filledAmount } }
              ),
              orderPlaceDB.updateOne(
                { _id: getFindOrders._id },
                { $set: { status: getFindOrders.status, filledAmount: getFindOrders.filledAmount } }
              ),
            ]);
  
            let userIds = {
              buyuserid: BuyOrder.userId,
              selluserid: SellOrder.userId,
            }
            // Include additional asynchronous actions here
            await Promise.all([
              balanceUpdation(
                SellOrder.userId,
                pairdData.to_symbol_id,
                tempRes._id,
                filledPrice - sellNewFee,
                SellOrder,
                matchableAmount,
                OrderPrice,
                sellNewFee,
                "sell",
                pairdData,
                userIds
              ),
              balanceUpdation(
                BuyOrder.userId,
                pairdData.from_symbol_id,
                tempRes._id,
                matchableAmount - buyNewFee,
                BuyOrder,
                matchableAmount,
                OrderPrice,
                buyNewFee,
                "buy",
                pairdData,
                userIds
              ),
              common.fetchInternalTickers(pairdData.pair, () => {}),
              common.fetchInternalTradehistory(pairdData.pair, () => {}),
              activeOrderRedis.activeOrdersSet(),
              common.userOrderDetails(
                BuyOrder.userId,
                BuyOrder.firstSymbol + "_" + BuyOrder.toSymbol,
                BuyOrder.firstCurrency,
                function (userDatas) {
                  var socketToken = common.encrypt(BuyOrder.userId.toString());
                  socketconnect.emit("userDetails" + socketToken, userDatas);
                }
              ),
              common.userOrderDetails(
                SellOrder.userId,
                SellOrder.firstSymbol + "_" + SellOrder.toSymbol,
                SellOrder.firstCurrency,
                function (userDatas) {
                  var socketToken = common.encrypt(SellOrder.userId.toString());
                  socketconnect.emit("userDetails" + socketToken, userDatas);
                }
              )
            ]);
          }
  
        }
  
        if (limitOrderData.status === "filled") break;
      }
    }
    else
    {
      activeOrderRedis.activeOrdersSet();
      common.userOrderDetails(
        limitOrderData.userId,
        limitOrderData.firstSymbol + "_" + limitOrderData.toSymbol,
        limitOrderData.firstCurrency,
        function (userDatas) {
          var socketToken = common.encrypt(limitOrderData.userId.toString());
          socketconnect.emit("userDetails" + socketToken, userDatas);
        }
      );
    }
    
  } catch (err) {
    console.error(err);
  }
};


// Helper to handle referral and profit updates
const handleReferralAndProfit = async (sellerReferral, buyerReferral, pairdData, sellNewFee, buyNewFee, selluserid, buyuserid, sellorderid, buyorderid) => {
  // const updateReferral = async (referral, fee, currencyId, userId, orderType) => {
  //   const userProfit = fee * 0.5;
  //   const adminProfit = fee * 0.5;

  //   if (referral?.referred_by) {
  //     await Promise.all([
  //       userWalletDB.findOneAndUpdate(
  //         { userId: referral.referred_by, "wallets.currencyId": currencyId },
  //         { $inc: { "wallets.$.amount": userProfit } }
  //       ),
  //       referralHistoryDB.create({
  //         currencyId,
  //         userId,
  //         fee: adminProfit.toFixed(8),
  //         type: `Trade ${orderType}`,
  //         fromUser: referral.referred_by,
  //         createdDate: new Date(),
  //       }),
  //     ]);
  //   }

  //   return adminProfit;
  // };

  // Update profits for seller
 // const sellAdminProfit = await updateReferral(sellerReferral, sellNewFee, pairdData.to_symbol_id, selluserid, "Sell");

 const sellAdminProfit = sellNewFee;
  await profitDb.create({
    type: "Trade Sell",
    user_id: ObjectId(selluserid),
    currencyid: pairdData.to_symbol_id,
    fees: sellAdminProfit.toFixed(8),
    fullfees: sellAdminProfit.toFixed(8),
    orderid: ObjectId(sellorderid),
  });

  // Update profits for buyer
 // const buyAdminProfit = await updateReferral(buyerReferral, buyNewFee, pairdData.from_symbol_id, buyuserid, "Buy");

  const buyAdminProfit = buyNewFee;

  await profitDb.create({
    type: "Trade Buy",
    user_id: ObjectId(buyuserid),
    currencyid: pairdData.from_symbol_id,
    fees: buyAdminProfit.toFixed(8),
    fullfees: buyAdminProfit.toFixed(8),
    orderid: ObjectId(buyorderid),
  });
};


const limitmatching = async (limitOrderData, pairdData, userIds) => {

  try {
    var userId = limitOrderData.userId;

    if (limitOrderData.tradeType == "buy") {
      whereCondn = {
        firstCurrency: limitOrderData.firstCurrency,
        secondCurrency: limitOrderData.secondCurrency,
        tradeType: "sell",
        price: { $lte: limitOrderData.price },
        $or: [{ status: "Active" }, { status: "partially" }],
        userId: { $ne: ObjectId(userId) },
        site: "Pitiklini",
      };
      //whereCondn = { firstCurrency:limitOrderData.firstCurrency, secondCurrency:limitOrderData.secondCurrency, tradeType : "sell", price: {$lte : limitOrderData.price}, $or:[{status:'Active'},{status:'partially'}]} // same user matching
      sorting = { price: 1, createddate: 1 };
    } else {
      whereCondn = {
        firstCurrency: limitOrderData.firstCurrency,
        secondCurrency: limitOrderData.secondCurrency,
        tradeType: "buy",
        price: { $gte: limitOrderData.price },
        $or: [{ status: "Active" }, { status: "partially" }],
        userId: { $ne: ObjectId(userId) },
        site: "Pitiklini",
      };
      //whereCondn = { firstCurrency:limitOrderData.firstCurrency, secondCurrency:limitOrderData.secondCurrency, tradeType : "buy", price: {$gte : limitOrderData.price}, $or:[{status:'Active'},{status:'partially'}]}
      sorting = { price: -1, createddate: 1 };
    }
    let getactiveRes = await orderPlaceDB
      .find(whereCondn)
      .sort(sorting)
      .exec({});
    console.log("getactiveRes===", getactiveRes.length);
    if (getactiveRes.length > 0) {
      console.log("calll here 1111===");
      let indexData1 = getactiveRes.filter(
        (x) => x.filledAmount > limitOrderData.filledAmount
      );
      if (indexData1.length > 0) {
        //console.log("call 2222")
        var getFilledOrder1 = indexData1;
        var getFindOrders = getFilledOrder1[0];
        if (getFindOrders.createddate < limitOrderData.createddate) {
          var OrderPrice = getFindOrders.price;
        } else {
          var OrderPrice = limitOrderData.price;
        }

        if (limitOrderData.tradeType == "buy") {
          var BuyOrder = limitOrderData;
          var SellOrder = getFindOrders;
        } else {
          var SellOrder = limitOrderData;
          var BuyOrder = getFindOrders;
        }
        var Tot = limitOrderData.filledAmount * OrderPrice;
        var buyorderid = BuyOrder._id;
        var buyuserid = BuyOrder.userId;
        var sellorderid = SellOrder._id;
        var selluserid = SellOrder.userId;

        if (BuyOrder.createddate < SellOrder.createddate) {
          var buyFees = pairdData.makerFee;
          var sellFees = pairdData.takerFee;
          var ordertype = "Sell";
        } else {
          var buyFees = pairdData.takerFee;
          var sellFees = pairdData.makerFee;
          var ordertype = "Buy";
        }
        var amount = limitOrderData.filledAmount;
        if (amount > 0) {
          var filledprice = limitOrderData.filledAmount * OrderPrice;
          var buynewfee = (limitOrderData.filledAmount * buyFees) / 100;
          var sellnewfee = (filledprice * sellFees) / 100;

          let buyer_details = await usersDB.findOne({_id:BuyOrder.userId},{ptk_fee_status:1});
          let seller_details = await usersDB.findOne({_id:SellOrder.userId},{ptk_fee_status:1});

           let tradetypes = ordertype.toLowerCase();

          let insertTempDbJson = {
            sellorderId: mongoose.mongo.ObjectId(sellorderid),
            sellerUserId: mongoose.mongo.ObjectId(selluserid),
            seller_ordertype: SellOrder.ordertype,
            askAmount: limitOrderData.filledAmount,
            askPrice: OrderPrice,
            firstCurrency: pairdData.currencySymbol,
            secondCurrency: pairdData.currencySymbol,
            buyorderId: mongoose.mongo.ObjectId(buyorderid),
            buyerUserId: mongoose.mongo.ObjectId(buyuserid),
            buyer_ordertype: BuyOrder.ordertype,
            total: Tot,
            buy_fee: buynewfee,
            sell_fee: sellnewfee,
            pair: pairdData.pair,
            type: ordertype.toLowerCase(),
            fee_currency_buy: (buyer_details != null) ? (buyer_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol,
            fee_currency_sell: (seller_details != null) ? (seller_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol
          };

          var tempRes = await confirmOrderDB.create(insertTempDbJson);
          if (tempRes) {
            //sell order profit
            var seller_refferal_id = await usersDB.findOne({
              _id: mongoose.mongo.ObjectId(selluserid),
            });
            let sellOrderProfitToAdmin;
            if (seller_refferal_id != null) {
              // if (
              //   seller_refferal_id.referred_by != null &&
              //   seller_refferal_id.referred_by != undefined &&
              //   seller_refferal_id.referred_by != ""
              // ) {
              //   var userprofit = sellnewfee * 0.5;
              //   var adminprofit = sellnewfee * 0.5;
              //   var update = await userWalletDB.findOneAndUpdate(
              //     {
              //       userId: seller_refferal_id.referred_by,
              //       "wallets.currencyId": pairdData.to_symbol_id,
              //     },
              //     {
              //       $inc: {
              //         "wallets.$.amount": +userprofit,
              //       },
              //     },
              //     {
              //       new: true,
              //     }
              //   );
              //   //sell order profit
              //   sellOrderProfitToAdmin = {
              //     type: "Trade Sell",
              //     user_id: mongoose.mongo.ObjectId(selluserid),
              //     currencyid: pairdData.to_symbol_id,
              //     fees: adminprofit.toFixed(8),
              //     fullfees: adminprofit.toFixed(8),
              //     orderid: mongoose.mongo.ObjectId(sellorderid),
              //   };

              //   var refer_history = {
              //     currencyId: pairdData.to_symbol_id,
              //     // amount : parseFloat(discount_sell_fee).toFixed(8),
              //     userId: selluserid,
              //     fee: adminprofit.toFixed(8),
              //     type: "Trade Sell",
              //     fromUser: seller_refferal_id.referred_by,
              //     createdDate: new Date(),
              //     modifiedDate: new Date(),
              //   };
              //   console.log(
              //     refer_history,
              //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
              //   );

              //   let refHistory = await referralHistoryDB.create(refer_history);
              //   if (BuyOrder.createdDate < SellOrder.createdDate) {
              //     // let profitCreate1 = await profitDb.create(buyOrderProfitToAdmin);
              //     let profitCreate2 = await profitDb.create(
              //       sellOrderProfitToAdmin
              //     );
              //   } else {
              //     let profitCreate3 = await profitDb.create(
              //       sellOrderProfitToAdmin
              //     );
              //     // let profitCreate4 = await profitDb.create(buyOrderProfitToAdmin);
              //   }
              // } else {
                sellOrderProfitToAdmin = {
                  type: "Trade Sell",
                  user_id: mongoose.mongo.ObjectId(selluserid),
                  currencyid: pairdData.to_symbol_id,
                  fees: sellnewfee.toFixed(8),
                  fullfees: sellnewfee.toFixed(8),
                  orderid: mongoose.mongo.ObjectId(sellorderid),
                };
              //}
              if (BuyOrder.createdDate < SellOrder.createdDate) {
                // let profitCreate1 = await profitDb.create(buyOrderProfitToAdmin);
                let profitCreate2 = await profitDb.create(
                  sellOrderProfitToAdmin
                );
              } else {
                let profitCreate3 = await profitDb.create(
                  sellOrderProfitToAdmin
                );
                // let profitCreate4 = await profitDb.create(buyOrderProfitToAdmin);
              }
            } else {
              var buyer_refferal_id = await usersDB.findOne({
                _id: mongoose.mongo.ObjectId(buyuserid),
              });
              let buyOrderProfitToAdmin;
              // if (
              //   buyer_refferal_id.referred_by != null &&
              //   buyer_refferal_id.referred_by != undefined &&
              //   buyer_refferal_id.referred_by != ""
              // ) {
              //   var userprofit = buynewfee * 0.5;
              //   var adminprofit = buynewfee * 0.5;

              //   var update = await userWalletDB.findOneAndUpdate(
              //     {
              //       userId: buyer_refferal_id.referred_by,
              //       "wallets.currencyId": pairdData.from_symbol_id,
              //     },
              //     {
              //       $inc: {
              //         "wallets.$.amount": +userprofit,
              //       },
              //     },
              //     {
              //       new: true,
              //     }
              //   );
              //   buyOrderProfitToAdmin = {
              //     type: "Trade Buy",
              //     user_id: mongoose.mongo.ObjectId(buyuserid),
              //     currencyid: pairdData.from_symbol_id,
              //     fees: adminprofit.toFixed(8),
              //     fullfees: adminprofit.toFixed(8),
              //     orderid: mongoose.mongo.ObjectId(buyorderid),
              //   };

              //   var refer_history = {
              //     currencyId: pairdData.from_symbol_id,
              //     // amount : parseFloat(discount_sell_fee).toFixed(8),
              //     userId: buyuserid,
              //     fee: adminprofit.toFixed(8),
              //     type: "Trade Sell",
              //     fromUser: buyer_refferal_id.referred_by,
              //     createdDate: new Date(),
              //     modifiedDate: new Date(),
              //   };
              //   console.log(
              //     refer_history,
              //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
              //   );

              //   let refHistory = await referralHistoryDB.create(refer_history);
              //   if (BuyOrder.createdDate < SellOrder.createdDate) {
              //     let profitCreate1 = await profitDb.create(
              //       buyOrderProfitToAdmin
              //     );
              //     // let profitCreate2 = await profitDb.create(sellOrderProfitToAdmin);
              //   } else {
              //     // let profitCreate3 = await profitDb.create(sellOrderProfitToAdmin);
              //     let profitCreate4 = await profitDb.create(
              //       buyOrderProfitToAdmin
              //     );
              //   }
              // } else {
                buyOrderProfitToAdmin = {
                  type: "Trade Buy",
                  user_id: mongoose.mongo.ObjectId(buyuserid),
                  currencyid: pairdData.from_symbol_id,
                  fees: buynewfee.toFixed(8),
                  fullfees: buynewfee.toFixed(8),
                  orderid: mongoose.mongo.ObjectId(buyorderid),
                };
             //}
              if (BuyOrder.createdDate < SellOrder.createdDate) {
                let profitCreate1 = await profitDb.create(
                  buyOrderProfitToAdmin
                );
                // let profitCreate2 = await profitDb.create(sellOrderProfitToAdmin);
              } else {
                // let profitCreate3 = await profitDb.create(sellOrderProfitToAdmin);
                let profitCreate4 = await profitDb.create(
                  buyOrderProfitToAdmin
                );
              }
            }

            var sellBalance = filledprice - +sellnewfee.toFixed(8);
            var selluserId = selluserid;
            var confrmId = tempRes._id;
            // console.log("sellBalance====",sellBalance);
            // console.log("selluserId====",selluserId);
            var userids = {
              selluserid: selluserid,
              buyuserid: buyuserid,
            };
            balanceUpdation(
              selluserId,
              pairdData.to_symbol_id,
              confrmId,
              sellBalance,
              SellOrder,
              amount,
              OrderPrice,
              sellFees,
              "sell",
              pairdData,
              userids,
              function (responseData) {
                if (responseData) {
                  var buyBalance = amount - +buynewfee.toFixed(8);
                  var buyuserId = buyuserid;
                  // var tradeduserId  = selluserid;
                  // console.log("buyuserId====",buyuserId);
                  // console.log("buyBalance====",buyBalance);
                  balanceUpdation(
                    buyuserId,
                    pairdData.from_symbol_id,
                    confrmId,
                    buyBalance,
                    BuyOrder,
                    amount,
                    OrderPrice,
                    buyFees,
                    "buy",
                    pairdData,
                    userids,
                    async function (responseData) {
                      if (responseData) {
                        singlematchingFilled(
                          pairdData,
                          limitOrderData,
                          getFindOrders,
                          0,
                          limitOrderData.amount,
                          function (name) { }
                        );
                        //common.updateActiveOrders(function (balance){} );
                        common.fetchInternalTickers(
                          pairdData.pair,
                          function (resp) { }
                        );
                        common.fetchInternalTradehistory(
                          pairdData.pair,
                          function (resp) { }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        }
      } else {
        let indexData = getactiveRes.findIndex(
          (x) =>
            x.price == limitOrderData.price &&
            x.filledAmount == limitOrderData.filledAmount
        );
        if (indexData != -1) {
          //console.log("call 1111")
          var getFilledOrder = getactiveRes[indexData];

          if (limitOrderData.tradeType == "buy") {
            var BuyOrder = limitOrderData;
            var SellOrder = getFilledOrder;
          } else {
            var SellOrder = limitOrderData;
            var BuyOrder = getFilledOrder;
          }

          var buyorderid = BuyOrder._id;
          var buyuserid = BuyOrder.userId;
          var buyprice = BuyOrder.price;
          var buyType = BuyOrder.tradeType;
          var sellorderid = SellOrder._id;
          var selluserid = SellOrder.userId;
          var sellprice = SellOrder.price;
          var sellType = SellOrder.tradeType;

          //------------------FEE CALCULATIONS------------------//

          if (BuyOrder.createddate < SellOrder.createddate) {
            var buyFees = pairdData.makerFee;
            var sellFees = pairdData.takerFee;
            var ordertype = "Sell";
          } else {
            var buyFees = pairdData.takerFee;
            var sellFees = pairdData.makerFee;
            var ordertype = "Buy";
          }
          var filledprice = limitOrderData.filledAmount * limitOrderData.price;
          var buynewfee = (limitOrderData.filledAmount * buyFees) / 100;
          var sellnewfee = (filledprice * sellFees) / 100;
          var amount = limitOrderData.filledAmount;
          var price = limitOrderData.price;

           let buyer_details = await usersDB.findOne({_id:BuyOrder.userId},{ptk_fee_status:1});
          let seller_details = await usersDB.findOne({_id:SellOrder.userId},{ptk_fee_status:1});

           let tradetypes = ordertype.toLowerCase();

          if (amount > 0) {
            let insertTempDbJson = {
              sellorderId: mongoose.mongo.ObjectId(sellorderid),
              sellerUserId: mongoose.mongo.ObjectId(selluserid),
              seller_ordertype: SellOrder.ordertype,
              askAmount: limitOrderData.filledAmount,
              askPrice: limitOrderData.price,
              firstCurrency: pairdData.currencySymbol,
              secondCurrency: pairdData.currencySymbol,
              buyorderId: mongoose.mongo.ObjectId(buyorderid),
              buyerUserId: mongoose.mongo.ObjectId(buyuserid),
              buyer_ordertype: BuyOrder.ordertype,
              total: limitOrderData.total,
              buy_fee: buynewfee,
              sell_fee: sellnewfee,
              pair: pairdData.pair,
              type: ordertype.toLowerCase(),
              fee_currency_buy: (buyer_details != null) ? (buyer_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol,
              fee_currency_sell: (seller_details != null) ? (seller_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol
            };
            var tempRes = await confirmOrderDB.create(insertTempDbJson);
            if (tempRes) {
              //sell order profit
              var seller_refferal_id = await usersDB.findOne({
                _id: mongoose.mongo.ObjectId(selluserid),
              });
              let sellOrderProfitToAdmin;
              if (seller_refferal_id != null) {
                // if (
                //   seller_refferal_id.referred_by != null &&
                //   seller_refferal_id.referred_by != undefined &&
                //   seller_refferal_id.referred_by != ""
                // ) {
                //   var userprofit = sellnewfee * 0.5;
                //   var adminprofit = sellnewfee * 0.5;
                //   var update = await userWalletDB.findOneAndUpdate(
                //     {
                //       userId: seller_refferal_id.referred_by,
                //       "wallets.currencyId": pairdData.to_symbol_id,
                //     },
                //     {
                //       $inc: {
                //         "wallets.$.amount": +userprofit,
                //       },
                //     },
                //     {
                //       new: true,
                //     }
                //   );

                //   sellOrderProfitToAdmin = {
                //     type: "Trade Sell",
                //     user_id: mongoose.mongo.ObjectId(selluserid),
                //     currencyid: pairdData.to_symbol_id,
                //     fees: +adminprofit.toFixed(8),
                //     fullfees: +adminprofit.toFixed(8),
                //     orderid: mongoose.mongo.ObjectId(sellorderid),
                //   };

                //   var refer_history = {
                //     currencyId: pairdData.to_symbol_id,
                //     // amount : parseFloat(discount_sell_fee).toFixed(8),
                //     userId: selluserid,
                //     fee: adminprofit.toFixed(8),
                //     type: "Trade Sell",
                //     fromUser: seller_refferal_id.referred_by,
                //     createdDate: new Date(),
                //     modifiedDate: new Date(),
                //   };
                //   console.log(
                //     refer_history,
                //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                //   );

                //   let refHistory = await referralHistoryDB.create(
                //     refer_history
                //   );
                //   if (BuyOrder.createdDate < SellOrder.createdDate) {
                //     let profitCreate2 = await profitDb.create(
                //       sellOrderProfitToAdmin
                //     );
                //   } else {
                //     let profitCreate3 = await profitDb.create(
                //       sellOrderProfitToAdmin
                //     );
                //   }
                // } else {
                  sellOrderProfitToAdmin = {
                    type: "Trade Sell",
                    user_id: mongoose.mongo.ObjectId(selluserid),
                    currencyid: pairdData.to_symbol_id,
                    fees: sellnewfee.toFixed(8),
                    fullfees: sellnewfee.toFixed(8),
                    orderid: mongoose.mongo.ObjectId(sellorderid),
                  };

                  if (BuyOrder.createdDate < SellOrder.createdDate) {
                    let profitCreate2 = await profitDb.create(
                      sellOrderProfitToAdmin
                    );
                  } else {
                    let profitCreate3 = await profitDb.create(
                      sellOrderProfitToAdmin
                    );
                  }
                //}
              } else {
                //buy order profit
                var buyer_refferal_id = await usersDB.findOne({
                  _id: mongoose.mongo.ObjectId(buyuserid),
                });
                let buyOrderProfitToAdmin;
                console.log(buyer_refferal_id, "-------");
                // if (
                //   buyer_refferal_id.referred_by != null &&
                //   buyer_refferal_id.referred_by != undefined &&
                //   buyer_refferal_id.referred_by != ""
                // ) {
                //   var userprofit = buynewfee * 0.5;
                //   var adminprofit = buynewfee * 0.5;

                //   var update = await userWalletDB.findOneAndUpdate(
                //     {
                //       userId: buyer_refferal_id.referred_by,
                //       "wallets.currencyId": pairdData.from_symbol_id,
                //     },
                //     {
                //       $inc: {
                //         "wallets.$.amount": +userprofit,
                //       },
                //     },
                //     {
                //       new: true,
                //     }
                //   );

                //   buyOrderProfitToAdmin = {
                //     type: "Trade Buy",
                //     user_id: mongoose.mongo.ObjectId(buyuserid),
                //     currencyid: pairdData.from_symbol_id,
                //     fees: +adminprofit.toFixed(8),
                //     fullfees: +adminprofit.toFixed(8),
                //     orderid: mongoose.mongo.ObjectId(buyorderid),
                //   };

                //   var refer_history = {
                //     currencyId: pairdData.from_symbol_id,
                //     // amount : parseFloat(discount_sell_fee).toFixed(8),
                //     userId: buyuserid,
                //     fee: adminprofit.toFixed(8),
                //     type: "Trade Sell",
                //     fromUser: buyer_refferal_id.referred_by,
                //     createdDate: new Date(),
                //     modifiedDate: new Date(),
                //   };
                //   console.log(
                //     refer_history,
                //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                //   );

                //   let refHistory = await referralHistoryDB.create(
                //     refer_history
                //   );
                //   if (BuyOrder.createdDate < SellOrder.createdDate) {
                //     let profitCreate1 = await profitDb.create(
                //       buyOrderProfitToAdmin
                //     );
                //   } else {
                //     let profitCreate4 = await profitDb.create(
                //       buyOrderProfitToAdmin
                //     );
                //   }
                // } else {
                  buyOrderProfitToAdmin = {
                    type: "Trade Buy",
                    user_id: mongoose.mongo.ObjectId(buyuserid),
                    currencyid: pairdData.from_symbol_id,
                    fees: buynewfee.toFixed(8),
                    fullfees: buynewfee.toFixed(8),
                    orderid: mongoose.mongo.ObjectId(buyorderid),
                  };
                  if (BuyOrder.createdDate < SellOrder.createdDate) {
                    let profitCreate1 = await profitDb.create(
                      buyOrderProfitToAdmin
                    );
                  } else {
                    let profitCreate4 = await profitDb.create(
                      buyOrderProfitToAdmin
                    );
                  }
                //}
              }
              var sellBalance = filledprice - +sellnewfee.toFixed(8);
              var selluserId = selluserid;
              var confrmId = tempRes._id;
              // console.log("buyuserId===",buyuserid)
              // console.log("selluserId===",selluserId)
              var userids = {
                selluserid: selluserid,
                buyuserid: buyuserid,
              };
              balanceUpdation(
                selluserId,
                pairdData.to_symbol_id,
                confrmId,
                sellBalance,
                SellOrder,
                amount,
                price,
                sellFees,
                "sell",
                pairdData,
                userids,
                function (responseData) {
                  if (responseData) {
                    var buyBalance = amount - +buynewfee.toFixed(8);
                    var buyuserId = buyuserid;
                    // var tradeduserId  = selluserid;
                    balanceUpdation(
                      buyuserId,
                      pairdData.from_symbol_id,
                      confrmId,
                      buyBalance,
                      BuyOrder,
                      amount,
                      price,
                      buyFees,
                      "buy",
                      pairdData,
                      userids,
                      async function (responseData) {
                        if (responseData) {
                          singlematchingFilled(
                            pairdData,
                            limitOrderData,
                            getFilledOrder,
                            0,
                            amount,
                            function (name) { }
                          );
                          //common.updateActiveOrders(function (balance){} );
                          common.fetchInternalTickers(
                            pairdData.pair,
                            function (resp) { }
                          );
                          common.fetchInternalTradehistory(
                            pairdData.pair,
                            function (resp) { }
                          );
                        }
                      }
                    );
                  }
                }
              );

              //console.log('=-=-=-=-=-=-=-=-=-=-=====-=-=-ORDER CREATED=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-');
            } else {
              //console.log('=-=-=-=-=-=-=-=-=-=-=====-=-=-ORDER NOT CRETED=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-');
            }
          }
        } else {
          let indexData2 = getactiveRes.filter(
            (x) => x.filledAmount < limitOrderData.filledAmount
          );

          if (indexData2.length > 0) {
            // console.log("call 3333")
            var filled = 0;
            var reduceAmount = 0;
            var addAmount = 0;
            for (var i = 0; i < indexData2.length; i++) {
              var getFilledOrder1 = indexData2[i];
              //console.log(getFilledOrder1,'=-=-=-=-=-=-=-=-=-=-=====-=-=-getFilledOrder1-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-');
              var getFindOrders = getFilledOrder1;
              if (getFindOrders.createddate < limitOrderData.createddate) {
                var OrderPrice = getFindOrders.price;
              } else {
                var OrderPrice = limitOrderData.price;
              }

              if (limitOrderData.tradeType == "buy") {
                var BuyOrder = limitOrderData;
                var SellOrder = getFindOrders;
              } else {
                var SellOrder = limitOrderData;
                var BuyOrder = getFindOrders;
              }

              addAmount += getFindOrders.filledAmount;
              // console.log("addAmount===",addAmount)
              reduceAmount = limitOrderData.filledAmount - addAmount;
              //console.log("reduceAmount===",reduceAmount)
              if (limitOrderData.filledAmount > addAmount) {
                var orderAmount = getFindOrders.filledAmount;
              } else {
                var amount_rec = addAmount - limitOrderData.filledAmount;
                var orderAmount = getFindOrders.filledAmount - amount_rec;
              }
              //console.log("orderAmount===",orderAmount)
              var lessAmount = limitOrderData.filledAmount - orderAmount;

              // console.log("lessAmount===",lessAmount);

              if (orderAmount > 0) {
                var Tot = orderAmount * OrderPrice;
                var buyorderid = BuyOrder._id;
                var buyuserid = BuyOrder.userId;
                var sellorderid = SellOrder._id;
                var selluserid = SellOrder.userId;

                if (BuyOrder.createddate < SellOrder.createddate) {
                  var buyFees = pairdData.makerFee;
                  var sellFees = pairdData.takerFee;
                  var ordertype = "Sell";
                } else {
                  var buyFees = pairdData.takerFee;
                  var sellFees = pairdData.makerFee;
                  var ordertype = "Buy";
                }
                var amount = orderAmount;
                var filledprice = orderAmount * OrderPrice;
                var buynewfee = (orderAmount * buyFees) / 100;
                var sellnewfee = (filledprice * sellFees) / 100;

                let buyer_details = await usersDB.findOne({_id:BuyOrder.userId},{ptk_fee_status:1});
                let seller_details = await usersDB.findOne({_id:SellOrder.userId},{ptk_fee_status:1});

                let tradetypes = ordertype.toLowerCase();

                let insertTempDbJson = {
                  sellorderId: mongoose.mongo.ObjectId(sellorderid),
                  sellerUserId: mongoose.mongo.ObjectId(selluserid),
                  seller_ordertype: SellOrder.ordertype,
                  askAmount: orderAmount,
                  askPrice: OrderPrice,
                  firstCurrency: pairdData.currencySymbol,
                  secondCurrency: pairdData.currencySymbol,
                  buyorderId: mongoose.mongo.ObjectId(buyorderid),
                  buyerUserId: mongoose.mongo.ObjectId(buyuserid),
                  buyer_ordertype: BuyOrder.ordertype,
                  total: Tot,
                  buy_fee: buynewfee,
                  sell_fee: sellnewfee,
                  pair: pairdData.pair,
                  type: ordertype.toLowerCase(),
                  fee_currency_buy: (buyer_details != null) ? (buyer_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol,
                  fee_currency_sell: (seller_details != null) ? (seller_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol
                };

                var tempRes = await confirmOrderDB.create(insertTempDbJson);
                if (tempRes) {
                  var seller_refferal_id = await usersDB.findOne({
                    _id: mongoose.mongo.ObjectId(selluserid),
                  });
                  //console.log("0909090909090", seller_refferal_id);
                  let sellOrderProfitToAdmin;
                  if (seller_refferal_id != null) {
                    // if (
                    //   seller_refferal_id.referred_by != null &&
                    //   seller_refferal_id.referred_by != undefined &&
                    //   seller_refferal_id.referred_by != ""
                    // ) {
                    //   var userprofit = sellnewfee * 0.5;
                    //   var adminprofit = sellnewfee * 0.5;
                    //   var update = await userWalletDB.findOneAndUpdate(
                    //     {
                    //       userId: seller_refferal_id.referred_by,
                    //       "wallets.currencyId": pairdData.to_symbol_id,
                    //     },
                    //     {
                    //       $inc: {
                    //         "wallets.$.amount": +userprofit,
                    //       },
                    //     },
                    //     {
                    //       new: true,
                    //     }
                    //   );
                    //   //sell order profit
                    //   sellOrderProfitToAdmin = {
                    //     type: "Trade Sell",
                    //     user_id: mongoose.mongo.ObjectId(selluserid),
                    //     currencyid: pairdData.to_symbol_id,
                    //     fees: adminprofit.toFixed(8),
                    //     fullfees: adminprofit.toFixed(8),
                    //     orderid: mongoose.mongo.ObjectId(sellorderid),
                    //   };

                    //   var refer_history = {
                    //     currencyId: pairdData.to_symbol_id,
                    //     // amount : parseFloat(discount_sell_fee).toFixed(8),
                    //     userId: selluserid,
                    //     fee: adminprofit.toFixed(8),
                    //     type: "Trade Sell",
                    //     fromUser: seller_refferal_id.referred_by,
                    //     createdDate: new Date(),
                    //     modifiedDate: new Date(),
                    //   };
                    //   console.log(
                    //     refer_history,
                    //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                    //   );

                    //   let refHistory = await referralHistoryDB.create(
                    //     refer_history
                    //   );
                    //   if (BuyOrder.createdDate < SellOrder.createdDate) {
                    //     let profitCreate2 = await profitDb.create(
                    //       sellOrderProfitToAdmin
                    //     );
                    //   } else {
                    //     let profitCreate3 = await profitDb.create(
                    //       sellOrderProfitToAdmin
                    //     );
                    //   }
                    // } else {
                      sellOrderProfitToAdmin = {
                        type: "Trade Sell",
                        user_id: mongoose.mongo.ObjectId(selluserid),
                        currencyid: pairdData.to_symbol_id,
                        fees: sellnewfee.toFixed(8),
                        fullfees: sellnewfee.toFixed(8),
                        orderid: mongoose.mongo.ObjectId(sellorderid),
                      };
                      if (BuyOrder.createdDate < SellOrder.createdDate) {
                        let profitCreate2 = await profitDb.create(
                          sellOrderProfitToAdmin
                        );
                      } else {
                        let profitCreate3 = await profitDb.create(
                          sellOrderProfitToAdmin
                        );
                      }
                    //}
                  } else {
                    var buyer_refferal_id = await usersDB.findOne({
                      _id: mongoose.mongo.ObjectId(buyuserid),
                    });
                    let buyOrderProfitToAdmin;
                    console.log(buyer_refferal_id, "-------");
                    // if (
                    //   buyer_refferal_id.referred_by != null &&
                    //   buyer_refferal_id.referred_by != undefined &&
                    //   buyer_refferal_id.referred_by != ""
                    // ) {
                    //   var userprofit = buynewfee * 0.5;
                    //   var adminprofit = buynewfee * 0.5;

                    //   var update = await userWalletDB.findOneAndUpdate(
                    //     {
                    //       userId: buyer_refferal_id.referred_by,
                    //       "wallets.currencyId": pairdData.from_symbol_id,
                    //     },
                    //     {
                    //       $inc: {
                    //         "wallets.$.amount": +userprofit,
                    //       },
                    //     },
                    //     {
                    //       new: true,
                    //     }
                    //   );

                    //   buyOrderProfitToAdmin = {
                    //     type: "Trade Buy",
                    //     user_id: mongoose.mongo.ObjectId(buyuserid),
                    //     currencyid: pairdData.from_symbol_id,
                    //     fees: adminprofit.toFixed(8),
                    //     fullfees: adminprofit.toFixed(8),
                    //     orderid: mongoose.mongo.ObjectId(buyorderid),
                    //   };
                    //   var refer_history = {
                    //     currencyId: pairdData.to_symbol_id,
                    //     // amount : parseFloat(discount_sell_fee).toFixed(8),
                    //     userId: buyuserid,
                    //     fee: adminprofit.toFixed(8),
                    //     type: "Trade Buy",
                    //     fromUser: buyer_refferal_id.referred_by,
                    //     createdDate: new Date(),
                    //     modifiedDate: new Date(),
                    //   };
                    //   console.log(
                    //     refer_history,
                    //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                    //   );

                    //   let refHistory = await referralHistoryDB.create(
                    //     refer_history
                    //   );
                    //   if (BuyOrder.createdDate < SellOrder.createdDate) {
                    //     let profitCreate1 = await profitDb.create(
                    //       buyOrderProfitToAdmin
                    //     );
                    //   } else {
                    //     let profitCreate4 = await profitDb.create(
                    //       buyOrderProfitToAdmin
                    //     );
                    //   }
                    // } else {
                      buyOrderProfitToAdmin = {
                        type: "Trade Buy",
                        user_id: mongoose.mongo.ObjectId(buyuserid),
                        currencyid: pairdData.from_symbol_id,
                        fees: buynewfee.toFixed(8),
                        fullfees: buynewfee.toFixed(8),
                        orderid: mongoose.mongo.ObjectId(buyorderid),
                      };
                   // }
                    if (BuyOrder.createdDate < SellOrder.createdDate) {
                      let profitCreate1 = await profitDb.create(
                        buyOrderProfitToAdmin
                      );
                    } else {
                      let profitCreate4 = await profitDb.create(
                        buyOrderProfitToAdmin
                      );
                    }
                  }
                  //buy order profit

                  var sellBalance = filledprice - +sellnewfee.toFixed(8);
                  var selluserId = selluserid;

                  var buyBalance = amount - +buynewfee.toFixed(8);
                  var buyuserId = buyuserid;
                  var confrmId = tempRes._id;
                  var userids = {
                    selluserid: selluserid,
                    buyuserid: buyuserid,
                  };
                  filled += tempRes.askAmount;

                  var temp_res_amt = tempRes.askAmount;
                  matchingFilled(
                    pairdData,
                    limitOrderData,
                    getFindOrders,
                    0,
                    limitOrderData.filledAmount,
                    addAmount,
                    function (matchres) {
                      if (matchres.status) {
                        balanceUpdation(
                          selluserId,
                          pairdData.to_symbol_id,
                          confrmId,
                          sellBalance,
                          SellOrder,
                          temp_res_amt,
                          OrderPrice,
                          sellFees,
                          "sell",
                          pairdData,
                          userids,
                          async function (responseData) { }
                        );

                        balanceUpdation(
                          buyuserId,
                          pairdData.from_symbol_id,
                          confrmId,
                          buyBalance,
                          BuyOrder,
                          temp_res_amt,
                          OrderPrice,
                          buyFees,
                          "buy",
                          pairdData,
                          userids,
                          async function (responseData1) { }
                        );
                        common.updateActiveOrders(function (balance) { });
                        common.fetchInternalTickers(
                          pairdData.pair,
                          function (resp) { }
                        );
                        common.fetchInternalTradehistory(
                          pairdData.pair,
                          function (resp) { }
                        );
                      }
                    }
                  );
                }
              }
            }
          }
        }
      }
    } else {
      console.log("calll here 22222===");
      console.log("---------------- NO MATCH ORDERS FOUND----------------");
    }
  } catch (error) {
    console.log(
      "---------------- error FROM limit MATCHING----------------",
      error
    );
  }
};


const marketMatching = async (limitOrderData, pairdData, userIds) => {

  try {
    var userId = limitOrderData.userId;

    if (limitOrderData.tradeType == "buy") {
      whereCondn = {
        firstCurrency: limitOrderData.firstCurrency,
        secondCurrency: limitOrderData.secondCurrency,
        tradeType: "sell",
        price: { $lte: limitOrderData.price },
        $or: [{ status: "Active" }, { status: "partially" }],
        userId: { $ne: ObjectId(userId) },
        site: "Pitiklini",
      };
      //whereCondn = { firstCurrency:limitOrderData.firstCurrency, secondCurrency:limitOrderData.secondCurrency, tradeType : "sell", price: {$lte : limitOrderData.price}, $or:[{status:'Active'},{status:'partially'}]} // same user matching
      sorting = { price: 1, createddate: 1 };
    } else {
      whereCondn = {
        firstCurrency: limitOrderData.firstCurrency,
        secondCurrency: limitOrderData.secondCurrency,
        tradeType: "buy",
        price: { $gte: limitOrderData.price },
        $or: [{ status: "Active" }, { status: "partially" }],
        userId: { $ne: ObjectId(userId) },
        site: "Pitiklini",
      };
      //whereCondn = { firstCurrency:limitOrderData.firstCurrency, secondCurrency:limitOrderData.secondCurrency, tradeType : "buy", price: {$gte : limitOrderData.price}, $or:[{status:'Active'},{status:'partially'}]}
      sorting = { price: -1, createddate: 1 };
    }
    let getactiveRes = await orderPlaceDB
      .find(whereCondn)
      .sort(sorting)
      .exec({});
    console.log("getactiveRes===", getactiveRes.length);
    if (getactiveRes.length > 0) {
      console.log("calll here 1111===");
      let indexData1 = getactiveRes.filter(
        (x) => x.filledAmount > limitOrderData.filledAmount
      );
      if (indexData1.length > 0) {
        //console.log("call 2222")
        var getFilledOrder1 = indexData1;
        var getFindOrders = getFilledOrder1[0];
        if (getFindOrders.createddate < limitOrderData.createddate) {
          var OrderPrice = getFindOrders.price;
        } else {
          var OrderPrice = limitOrderData.price;
        }

        if (limitOrderData.tradeType == "buy") {
          var BuyOrder = limitOrderData;
          var SellOrder = getFindOrders;
        } else {
          var SellOrder = limitOrderData;
          var BuyOrder = getFindOrders;
        }
        var Tot = limitOrderData.filledAmount * OrderPrice;
        var buyorderid = BuyOrder._id;
        var buyuserid = BuyOrder.userId;
        var sellorderid = SellOrder._id;
        var selluserid = SellOrder.userId;

        if (BuyOrder.createddate < SellOrder.createddate) {
          var buyFees = pairdData.makerFee;
          var sellFees = pairdData.takerFee;
          var ordertype = "Sell";
        } else {
          var buyFees = pairdData.takerFee;
          var sellFees = pairdData.makerFee;
          var ordertype = "Buy";
        }
        var amount = limitOrderData.filledAmount;
        if (amount > 0) {
          var filledprice = limitOrderData.filledAmount * OrderPrice;
          var buynewfee = (limitOrderData.filledAmount * buyFees) / 100;
          var sellnewfee = (filledprice * sellFees) / 100;

          let buyer_details = await usersDB.findOne({_id:BuyOrder.userId},{ptk_fee_status:1});
          let seller_details = await usersDB.findOne({_id:SellOrder.userId},{ptk_fee_status:1});

          let tradetypes = ordertype.toLowerCase();

          let insertTempDbJson = {
            sellorderId: mongoose.mongo.ObjectId(sellorderid),
            sellerUserId: mongoose.mongo.ObjectId(selluserid),
            seller_ordertype: SellOrder.ordertype,
            askAmount: limitOrderData.filledAmount,
            askPrice: OrderPrice,
            firstCurrency: pairdData.currencySymbol,
            secondCurrency: pairdData.currencySymbol,
            buyorderId: mongoose.mongo.ObjectId(buyorderid),
            buyerUserId: mongoose.mongo.ObjectId(buyuserid),
            buyer_ordertype: BuyOrder.ordertype,
            total: Tot,
            buy_fee: buynewfee,
            sell_fee: sellnewfee,
            pair: pairdData.pair,
            type: ordertype.toLowerCase(),
            fee_currency_buy: (buyer_details != null) ? (buyer_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol,
            fee_currency_sell: (seller_details != null) ? (seller_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol
          };



          var tempRes = await confirmOrderDB.create(insertTempDbJson);
          if (tempRes) {
            //sell order profit
            var seller_refferal_id = await usersDB.findOne({
              _id: mongoose.mongo.ObjectId(selluserid),
            });
            let sellOrderProfitToAdmin;
            if (seller_refferal_id != null) {
              // if (
              //   seller_refferal_id.referred_by != null &&
              //   seller_refferal_id.referred_by != undefined &&
              //   seller_refferal_id.referred_by != ""
              // ) {
              //   var userprofit = sellnewfee * 0.5;
              //   var adminprofit = sellnewfee * 0.5;
              //   var update = await userWalletDB.findOneAndUpdate(
              //     {
              //       userId: seller_refferal_id.referred_by,
              //       "wallets.currencyId": pairdData.to_symbol_id,
              //     },
              //     {
              //       $inc: {
              //         "wallets.$.amount": +userprofit,
              //       },
              //     },
              //     {
              //       new: true,
              //     }
              //   );
              //   //sell order profit
              //   sellOrderProfitToAdmin = {
              //     type: "Trade Sell",
              //     user_id: mongoose.mongo.ObjectId(selluserid),
              //     currencyid: pairdData.to_symbol_id,
              //     fees: adminprofit.toFixed(8),
              //     fullfees: adminprofit.toFixed(8),
              //     orderid: mongoose.mongo.ObjectId(sellorderid),
              //   };

              //   var refer_history = {
              //     currencyId: pairdData.to_symbol_id,
              //     // amount : parseFloat(discount_sell_fee).toFixed(8),
              //     userId: selluserid,
              //     fee: adminprofit.toFixed(8),
              //     type: "Trade Sell",
              //     fromUser: seller_refferal_id.referred_by,
              //     createdDate: new Date(),
              //     modifiedDate: new Date(),
              //   };
              //   console.log(
              //     refer_history,
              //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
              //   );

              //   let refHistory = await referralHistoryDB.create(refer_history);
              //   if (BuyOrder.createdDate < SellOrder.createdDate) {
              //     // let profitCreate1 = await profitDb.create(buyOrderProfitToAdmin);
              //     let profitCreate2 = await profitDb.create(
              //       sellOrderProfitToAdmin
              //     );
              //   } else {
              //     let profitCreate3 = await profitDb.create(
              //       sellOrderProfitToAdmin
              //     );
              //     // let profitCreate4 = await profitDb.create(buyOrderProfitToAdmin);
              //   }
              // } 
              // else {
                sellOrderProfitToAdmin = {
                  type: "Trade Sell",
                  user_id: mongoose.mongo.ObjectId(selluserid),
                  currencyid: pairdData.to_symbol_id,
                  fees: sellnewfee.toFixed(8),
                  fullfees: sellnewfee.toFixed(8),
                  orderid: mongoose.mongo.ObjectId(sellorderid),
                };
             // }
              if (BuyOrder.createdDate < SellOrder.createdDate) {
                // let profitCreate1 = await profitDb.create(buyOrderProfitToAdmin);
                let profitCreate2 = await profitDb.create(
                  sellOrderProfitToAdmin
                );
              } else {
                let profitCreate3 = await profitDb.create(
                  sellOrderProfitToAdmin
                );
                // let profitCreate4 = await profitDb.create(buyOrderProfitToAdmin);
              }
            } else {
              var buyer_refferal_id = await usersDB.findOne({
                _id: mongoose.mongo.ObjectId(buyuserid),
              });
              let buyOrderProfitToAdmin;
              // if (
              //   buyer_refferal_id.referred_by != null &&
              //   buyer_refferal_id.referred_by != undefined &&
              //   buyer_refferal_id.referred_by != ""
              // ) {
              //   var userprofit = buynewfee * 0.5;
              //   var adminprofit = buynewfee * 0.5;

              //   var update = await userWalletDB.findOneAndUpdate(
              //     {
              //       userId: buyer_refferal_id.referred_by,
              //       "wallets.currencyId": pairdData.from_symbol_id,
              //     },
              //     {
              //       $inc: {
              //         "wallets.$.amount": +userprofit,
              //       },
              //     },
              //     {
              //       new: true,
              //     }
              //   );
              //   buyOrderProfitToAdmin = {
              //     type: "Trade Buy",
              //     user_id: mongoose.mongo.ObjectId(buyuserid),
              //     currencyid: pairdData.from_symbol_id,
              //     fees: adminprofit.toFixed(8),
              //     fullfees: adminprofit.toFixed(8),
              //     orderid: mongoose.mongo.ObjectId(buyorderid),
              //   };

              //   var refer_history = {
              //     currencyId: pairdData.from_symbol_id,
              //     // amount : parseFloat(discount_sell_fee).toFixed(8),
              //     userId: buyuserid,
              //     fee: adminprofit.toFixed(8),
              //     type: "Trade Sell",
              //     fromUser: buyer_refferal_id.referred_by,
              //     createdDate: new Date(),
              //     modifiedDate: new Date(),
              //   };
              //   console.log(
              //     refer_history,
              //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
              //   );

              //   let refHistory = await referralHistoryDB.create(refer_history);
              //   if (BuyOrder.createdDate < SellOrder.createdDate) {
              //     let profitCreate1 = await profitDb.create(
              //       buyOrderProfitToAdmin
              //     );
              //     // let profitCreate2 = await profitDb.create(sellOrderProfitToAdmin);
              //   } else {
              //     // let profitCreate3 = await profitDb.create(sellOrderProfitToAdmin);
              //     let profitCreate4 = await profitDb.create(
              //       buyOrderProfitToAdmin
              //     );
              //   }
              // } else {
                buyOrderProfitToAdmin = {
                  type: "Trade Buy",
                  user_id: mongoose.mongo.ObjectId(buyuserid),
                  currencyid: pairdData.from_symbol_id,
                  fees: buynewfee.toFixed(8),
                  fullfees: buynewfee.toFixed(8),
                  orderid: mongoose.mongo.ObjectId(buyorderid),
                };
             // }
              if (BuyOrder.createdDate < SellOrder.createdDate) {
                let profitCreate1 = await profitDb.create(
                  buyOrderProfitToAdmin
                );
                // let profitCreate2 = await profitDb.create(sellOrderProfitToAdmin);
              } else {
                // let profitCreate3 = await profitDb.create(sellOrderProfitToAdmin);
                let profitCreate4 = await profitDb.create(
                  buyOrderProfitToAdmin
                );
              }
            }

            var sellBalance = filledprice - +sellnewfee.toFixed(8);
            var selluserId = selluserid;
            var confrmId = tempRes._id;
            // console.log("sellBalance====",sellBalance);
            // console.log("selluserId====",selluserId);
            var userids = {
              selluserid: selluserid,
              buyuserid: buyuserid,
            };
            balanceUpdation(
              selluserId,
              pairdData.to_symbol_id,
              confrmId,
              sellBalance,
              SellOrder,
              amount,
              OrderPrice,
              sellFees,
              "sell",
              pairdData,
              userids,
              function (responseData) {
                if (responseData) {
                  var buyBalance = amount - +buynewfee.toFixed(8);
                  var buyuserId = buyuserid;
                  // var tradeduserId  = selluserid;
                  // console.log("buyuserId====",buyuserId);
                  // console.log("buyBalance====",buyBalance);
                  balanceUpdation(
                    buyuserId,
                    pairdData.from_symbol_id,
                    confrmId,
                    buyBalance,
                    BuyOrder,
                    amount,
                    OrderPrice,
                    buyFees,
                    "buy",
                    pairdData,
                    userids,
                    async function (responseData) {
                      if (responseData) {
                        singlematchingFilled(
                          pairdData,
                          limitOrderData,
                          getFindOrders,
                          0,
                          limitOrderData.amount,
                          function (name) { }
                        );
                        //common.updateActiveOrders(function (balance){} );
                        common.fetchInternalTickers(
                          pairdData.pair,
                          function (resp) { }
                        );
                        common.fetchInternalTradehistory(
                          pairdData.pair,
                          function (resp) { }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        }
      } else {
        let indexData = getactiveRes.findIndex(
          (x) =>
            x.price == limitOrderData.price &&
            x.filledAmount == limitOrderData.filledAmount
        );
        if (indexData != -1) {
          //console.log("call 1111")
          var getFilledOrder = getactiveRes[indexData];

          if (limitOrderData.tradeType == "buy") {
            var BuyOrder = limitOrderData;
            var SellOrder = getFilledOrder;
          } else {
            var SellOrder = limitOrderData;
            var BuyOrder = getFilledOrder;
          }

          var buyorderid = BuyOrder._id;
          var buyuserid = BuyOrder.userId;
          var buyprice = BuyOrder.price;
          var buyType = BuyOrder.tradeType;
          var sellorderid = SellOrder._id;
          var selluserid = SellOrder.userId;
          var sellprice = SellOrder.price;
          var sellType = SellOrder.tradeType;

          //------------------FEE CALCULATIONS------------------//

          if (BuyOrder.createddate < SellOrder.createddate) {
            var buyFees = pairdData.makerFee;
            var sellFees = pairdData.takerFee;
            var ordertype = "Sell";
          } else {
            var buyFees = pairdData.takerFee;
            var sellFees = pairdData.makerFee;
            var ordertype = "Buy";
          }
          var filledprice = limitOrderData.filledAmount * limitOrderData.price;
          var buynewfee = (limitOrderData.filledAmount * buyFees) / 100;
          var sellnewfee = (filledprice * sellFees) / 100;
          var amount = limitOrderData.filledAmount;
          var price = limitOrderData.price;

          if (amount > 0) {

          let buyer_details = await usersDB.findOne({_id:BuyOrder.userId},{ptk_fee_status:1});
          let seller_details = await usersDB.findOne({_id:SellOrder.userId},{ptk_fee_status:1});

          let tradetypes = ordertype.toLowerCase();

            let insertTempDbJson = {
              sellorderId: mongoose.mongo.ObjectId(sellorderid),
              sellerUserId: mongoose.mongo.ObjectId(selluserid),
              seller_ordertype: SellOrder.ordertype,
              askAmount: limitOrderData.filledAmount,
              askPrice: limitOrderData.price,
              firstCurrency: pairdData.currencySymbol,
              secondCurrency: pairdData.currencySymbol,
              buyorderId: mongoose.mongo.ObjectId(buyorderid),
              buyerUserId: mongoose.mongo.ObjectId(buyuserid),
              buyer_ordertype: BuyOrder.ordertype,
              total: limitOrderData.total,
              buy_fee: buynewfee,
              sell_fee: sellnewfee,
              pair: pairdData.pair,
              type: ordertype.toLowerCase(),
              fee_currency_buy: (buyer_details != null) ? (buyer_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol,
              fee_currency_sell: (seller_details != null) ? (seller_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol
            };
            var tempRes = await confirmOrderDB.create(insertTempDbJson);
            if (tempRes) {
              //sell order profit
              var seller_refferal_id = await usersDB.findOne({
                _id: mongoose.mongo.ObjectId(selluserid),
              });
              let sellOrderProfitToAdmin;
              if (seller_refferal_id != null) {
                // if (
                //   seller_refferal_id.referred_by != null &&
                //   seller_refferal_id.referred_by != undefined &&
                //   seller_refferal_id.referred_by != ""
                // ) {
                //   var userprofit = sellnewfee * 0.5;
                //   var adminprofit = sellnewfee * 0.5;
                //   var update = await userWalletDB.findOneAndUpdate(
                //     {
                //       userId: seller_refferal_id.referred_by,
                //       "wallets.currencyId": pairdData.to_symbol_id,
                //     },
                //     {
                //       $inc: {
                //         "wallets.$.amount": +userprofit,
                //       },
                //     },
                //     {
                //       new: true,
                //     }
                //   );

                //   sellOrderProfitToAdmin = {
                //     type: "Trade Sell",
                //     user_id: mongoose.mongo.ObjectId(selluserid),
                //     currencyid: pairdData.to_symbol_id,
                //     fees: +adminprofit.toFixed(8),
                //     fullfees: +adminprofit.toFixed(8),
                //     orderid: mongoose.mongo.ObjectId(sellorderid),
                //   };

                //   var refer_history = {
                //     currencyId: pairdData.to_symbol_id,
                //     // amount : parseFloat(discount_sell_fee).toFixed(8),
                //     userId: selluserid,
                //     fee: adminprofit.toFixed(8),
                //     type: "Trade Sell",
                //     fromUser: seller_refferal_id.referred_by,
                //     createdDate: new Date(),
                //     modifiedDate: new Date(),
                //   };
                //   console.log(
                //     refer_history,
                //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                //   );

                //   let refHistory = await referralHistoryDB.create(
                //     refer_history
                //   );
                //   if (BuyOrder.createdDate < SellOrder.createdDate) {
                //     let profitCreate2 = await profitDb.create(
                //       sellOrderProfitToAdmin
                //     );
                //   } else {
                //     let profitCreate3 = await profitDb.create(
                //       sellOrderProfitToAdmin
                //     );
                //   }
                // } else {
                  sellOrderProfitToAdmin = {
                    type: "Trade Sell",
                    user_id: mongoose.mongo.ObjectId(selluserid),
                    currencyid: pairdData.to_symbol_id,
                    fees: sellnewfee.toFixed(8),
                    fullfees: sellnewfee.toFixed(8),
                    orderid: mongoose.mongo.ObjectId(sellorderid),
                  };

                  if (BuyOrder.createdDate < SellOrder.createdDate) {
                    let profitCreate2 = await profitDb.create(
                      sellOrderProfitToAdmin
                    );
                  } else {
                    let profitCreate3 = await profitDb.create(
                      sellOrderProfitToAdmin
                    );
                  }
                //}
              } else {
                //buy order profit
                var buyer_refferal_id = await usersDB.findOne({
                  _id: mongoose.mongo.ObjectId(buyuserid),
                });
                let buyOrderProfitToAdmin;
                console.log(buyer_refferal_id, "-------");
                // if (
                //   buyer_refferal_id.referred_by != null &&
                //   buyer_refferal_id.referred_by != undefined &&
                //   buyer_refferal_id.referred_by != ""
                // ) {
                //   var userprofit = buynewfee * 0.5;
                //   var adminprofit = buynewfee * 0.5;

                //   var update = await userWalletDB.findOneAndUpdate(
                //     {
                //       userId: buyer_refferal_id.referred_by,
                //       "wallets.currencyId": pairdData.from_symbol_id,
                //     },
                //     {
                //       $inc: {
                //         "wallets.$.amount": +userprofit,
                //       },
                //     },
                //     {
                //       new: true,
                //     }
                //   );

                //   buyOrderProfitToAdmin = {
                //     type: "Trade Buy",
                //     user_id: mongoose.mongo.ObjectId(buyuserid),
                //     currencyid: pairdData.from_symbol_id,
                //     fees: +adminprofit.toFixed(8),
                //     fullfees: +adminprofit.toFixed(8),
                //     orderid: mongoose.mongo.ObjectId(buyorderid),
                //   };

                //   var refer_history = {
                //     currencyId: pairdData.from_symbol_id,
                //     // amount : parseFloat(discount_sell_fee).toFixed(8),
                //     userId: buyuserid,
                //     fee: adminprofit.toFixed(8),
                //     type: "Trade Sell",
                //     fromUser: buyer_refferal_id.referred_by,
                //     createdDate: new Date(),
                //     modifiedDate: new Date(),
                //   };
                //   console.log(
                //     refer_history,
                //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                //   );

                //   let refHistory = await referralHistoryDB.create(
                //     refer_history
                //   );
                //   if (BuyOrder.createdDate < SellOrder.createdDate) {
                //     let profitCreate1 = await profitDb.create(
                //       buyOrderProfitToAdmin
                //     );
                //   } else {
                //     let profitCreate4 = await profitDb.create(
                //       buyOrderProfitToAdmin
                //     );
                //   }
                // } else {
                  buyOrderProfitToAdmin = {
                    type: "Trade Buy",
                    user_id: mongoose.mongo.ObjectId(buyuserid),
                    currencyid: pairdData.from_symbol_id,
                    fees: buynewfee.toFixed(8),
                    fullfees: buynewfee.toFixed(8),
                    orderid: mongoose.mongo.ObjectId(buyorderid),
                  };
                  if (BuyOrder.createdDate < SellOrder.createdDate) {
                    let profitCreate1 = await profitDb.create(
                      buyOrderProfitToAdmin
                    );
                  } else {
                    let profitCreate4 = await profitDb.create(
                      buyOrderProfitToAdmin
                    );
                  }
                //}
              }
              var sellBalance = filledprice - +sellnewfee.toFixed(8);
              var selluserId = selluserid;
              var confrmId = tempRes._id;
              // console.log("buyuserId===",buyuserid)
              // console.log("selluserId===",selluserId)
              var userids = {
                selluserid: selluserid,
                buyuserid: buyuserid,
              };
              balanceUpdation(
                selluserId,
                pairdData.to_symbol_id,
                confrmId,
                sellBalance,
                SellOrder,
                amount,
                price,
                sellFees,
                "sell",
                pairdData,
                userids,
                function (responseData) {
                  if (responseData) {
                    var buyBalance = amount - +buynewfee.toFixed(8);
                    var buyuserId = buyuserid;
                    // var tradeduserId  = selluserid;
                    balanceUpdation(
                      buyuserId,
                      pairdData.from_symbol_id,
                      confrmId,
                      buyBalance,
                      BuyOrder,
                      amount,
                      price,
                      buyFees,
                      "buy",
                      pairdData,
                      userids,
                      async function (responseData) {
                        if (responseData) {
                          singlematchingFilled(
                            pairdData,
                            limitOrderData,
                            getFilledOrder,
                            0,
                            amount,
                            function (name) { }
                          );
                          //common.updateActiveOrders(function (balance){} );
                          common.fetchInternalTickers(
                            pairdData.pair,
                            function (resp) { }
                          );
                          common.fetchInternalTradehistory(
                            pairdData.pair,
                            function (resp) { }
                          );
                        }
                      }
                    );
                  }
                }
              );

              //console.log('=-=-=-=-=-=-=-=-=-=-=====-=-=-ORDER CREATED=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-');
            } else {
              //console.log('=-=-=-=-=-=-=-=-=-=-=====-=-=-ORDER NOT CRETED=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-');
            }
          }
        } else {
          let indexData2 = getactiveRes.filter(
            (x) => x.filledAmount < limitOrderData.filledAmount
          );

          if (indexData2.length > 0) {
            // console.log("call 3333")
            var filled = 0;
            var reduceAmount = 0;
            var addAmount = 0;
            for (var i = 0; i < indexData2.length; i++) {
              var getFilledOrder1 = indexData2[i];
              //console.log(getFilledOrder1,'=-=-=-=-=-=-=-=-=-=-=====-=-=-getFilledOrder1-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-');
              var getFindOrders = getFilledOrder1;
              if (getFindOrders.createddate < limitOrderData.createddate) {
                var OrderPrice = getFindOrders.price;
              } else {
                var OrderPrice = limitOrderData.price;
              }

              if (limitOrderData.tradeType == "buy") {
                var BuyOrder = limitOrderData;
                var SellOrder = getFindOrders;
              } else {
                var SellOrder = limitOrderData;
                var BuyOrder = getFindOrders;
              }

              addAmount += getFindOrders.filledAmount;
              // console.log("addAmount===",addAmount)
              reduceAmount = limitOrderData.filledAmount - addAmount;
              //console.log("reduceAmount===",reduceAmount)
              if (limitOrderData.filledAmount > addAmount) {
                var orderAmount = getFindOrders.filledAmount;
              } else {
                var amount_rec = addAmount - limitOrderData.filledAmount;
                var orderAmount = getFindOrders.filledAmount - amount_rec;
              }
              //console.log("orderAmount===",orderAmount)
              var lessAmount = limitOrderData.filledAmount - orderAmount;

              // console.log("lessAmount===",lessAmount);

              if (orderAmount > 0) {
                var Tot = orderAmount * OrderPrice;
                var buyorderid = BuyOrder._id;
                var buyuserid = BuyOrder.userId;
                var sellorderid = SellOrder._id;
                var selluserid = SellOrder.userId;

                if (BuyOrder.createddate < SellOrder.createddate) {
                  var buyFees = pairdData.makerFee;
                  var sellFees = pairdData.takerFee;
                  var ordertype = "Sell";
                } else {
                  var buyFees = pairdData.takerFee;
                  var sellFees = pairdData.makerFee;
                  var ordertype = "Buy";
                }
                var amount = orderAmount;
                var filledprice = orderAmount * OrderPrice;
                var buynewfee = (orderAmount * buyFees) / 100;
                var sellnewfee = (filledprice * sellFees) / 100;

                let buyer_details = await usersDB.findOne({_id:BuyOrder.userId},{ptk_fee_status:1});
                let seller_details = await usersDB.findOne({_id:SellOrder.userId},{ptk_fee_status:1});

                let tradetypes = ordertype.toLowerCase();


                let insertTempDbJson = {
                  sellorderId: mongoose.mongo.ObjectId(sellorderid),
                  sellerUserId: mongoose.mongo.ObjectId(selluserid),
                  seller_ordertype: SellOrder.ordertype,
                  askAmount: orderAmount,
                  askPrice: OrderPrice,
                  firstCurrency: pairdData.currencySymbol,
                  secondCurrency: pairdData.currencySymbol,
                  buyorderId: mongoose.mongo.ObjectId(buyorderid),
                  buyerUserId: mongoose.mongo.ObjectId(buyuserid),
                  buyer_ordertype: BuyOrder.ordertype,
                  total: Tot,
                  buy_fee: buynewfee,
                  sell_fee: sellnewfee,
                  pair: pairdData.pair,
                  type: ordertype.toLowerCase(),
                  fee_currency_buy: (buyer_details != null) ? (buyer_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol,
                  fee_currency_sell: (seller_details != null) ? (seller_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol : tradetypes == "buy" ? pairdData.from_symbol :  pairdData.to_symbol
                };

                var tempRes = await confirmOrderDB.create(insertTempDbJson);
                if (tempRes) {
                  var seller_refferal_id = await usersDB.findOne({
                    _id: mongoose.mongo.ObjectId(selluserid),
                  });
                  //console.log("0909090909090", seller_refferal_id);
                  let sellOrderProfitToAdmin;
                  if (seller_refferal_id != null) {
                    // if (
                    //   seller_refferal_id.referred_by != null &&
                    //   seller_refferal_id.referred_by != undefined &&
                    //   seller_refferal_id.referred_by != ""
                    // ) {
                    //   var userprofit = sellnewfee * 0.5;
                    //   var adminprofit = sellnewfee * 0.5;
                    //   var update = await userWalletDB.findOneAndUpdate(
                    //     {
                    //       userId: seller_refferal_id.referred_by,
                    //       "wallets.currencyId": pairdData.to_symbol_id,
                    //     },
                    //     {
                    //       $inc: {
                    //         "wallets.$.amount": +userprofit,
                    //       },
                    //     },
                    //     {
                    //       new: true,
                    //     }
                    //   );
                    //   //sell order profit
                    //   sellOrderProfitToAdmin = {
                    //     type: "Trade Sell",
                    //     user_id: mongoose.mongo.ObjectId(selluserid),
                    //     currencyid: pairdData.to_symbol_id,
                    //     fees: adminprofit.toFixed(8),
                    //     fullfees: adminprofit.toFixed(8),
                    //     orderid: mongoose.mongo.ObjectId(sellorderid),
                    //   };

                    //   var refer_history = {
                    //     currencyId: pairdData.to_symbol_id,
                    //     // amount : parseFloat(discount_sell_fee).toFixed(8),
                    //     userId: selluserid,
                    //     fee: adminprofit.toFixed(8),
                    //     type: "Trade Sell",
                    //     fromUser: seller_refferal_id.referred_by,
                    //     createdDate: new Date(),
                    //     modifiedDate: new Date(),
                    //   };
                    //   console.log(
                    //     refer_history,
                    //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                    //   );

                    //   let refHistory = await referralHistoryDB.create(
                    //     refer_history
                    //   );
                    //   if (BuyOrder.createdDate < SellOrder.createdDate) {
                    //     let profitCreate2 = await profitDb.create(
                    //       sellOrderProfitToAdmin
                    //     );
                    //   } else {
                    //     let profitCreate3 = await profitDb.create(
                    //       sellOrderProfitToAdmin
                    //     );
                    //   }
                    // } else {
                      sellOrderProfitToAdmin = {
                        type: "Trade Sell",
                        user_id: mongoose.mongo.ObjectId(selluserid),
                        currencyid: pairdData.to_symbol_id,
                        fees: sellnewfee.toFixed(8),
                        fullfees: sellnewfee.toFixed(8),
                        orderid: mongoose.mongo.ObjectId(sellorderid),
                      };
                      if (BuyOrder.createdDate < SellOrder.createdDate) {
                        let profitCreate2 = await profitDb.create(
                          sellOrderProfitToAdmin
                        );
                      } else {
                        let profitCreate3 = await profitDb.create(
                          sellOrderProfitToAdmin
                        );
                      }
                   // }
                  } else {
                    var buyer_refferal_id = await usersDB.findOne({
                      _id: mongoose.mongo.ObjectId(buyuserid),
                    });
                    let buyOrderProfitToAdmin;
                    console.log(buyer_refferal_id, "-------");
                    // if (
                    //   buyer_refferal_id.referred_by != null &&
                    //   buyer_refferal_id.referred_by != undefined &&
                    //   buyer_refferal_id.referred_by != ""
                    // ) {
                    //   var userprofit = buynewfee * 0.5;
                    //   var adminprofit = buynewfee * 0.5;

                    //   var update = await userWalletDB.findOneAndUpdate(
                    //     {
                    //       userId: buyer_refferal_id.referred_by,
                    //       "wallets.currencyId": pairdData.from_symbol_id,
                    //     },
                    //     {
                    //       $inc: {
                    //         "wallets.$.amount": +userprofit,
                    //       },
                    //     },
                    //     {
                    //       new: true,
                    //     }
                    //   );

                    //   buyOrderProfitToAdmin = {
                    //     type: "Trade Buy",
                    //     user_id: mongoose.mongo.ObjectId(buyuserid),
                    //     currencyid: pairdData.from_symbol_id,
                    //     fees: adminprofit.toFixed(8),
                    //     fullfees: adminprofit.toFixed(8),
                    //     orderid: mongoose.mongo.ObjectId(buyorderid),
                    //   };
                    //   var refer_history = {
                    //     currencyId: pairdData.to_symbol_id,
                    //     // amount : parseFloat(discount_sell_fee).toFixed(8),
                    //     userId: buyuserid,
                    //     fee: adminprofit.toFixed(8),
                    //     type: "Trade Buy",
                    //     fromUser: buyer_refferal_id.referred_by,
                    //     createdDate: new Date(),
                    //     modifiedDate: new Date(),
                    //   };
                    //   console.log(
                    //     refer_history,
                    //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                    //   );

                    //   let refHistory = await referralHistoryDB.create(
                    //     refer_history
                    //   );
                    //   if (BuyOrder.createdDate < SellOrder.createdDate) {
                    //     let profitCreate1 = await profitDb.create(
                    //       buyOrderProfitToAdmin
                    //     );
                    //   } else {
                    //     let profitCreate4 = await profitDb.create(
                    //       buyOrderProfitToAdmin
                    //     );
                    //   }
                    // } else {
                      buyOrderProfitToAdmin = {
                        type: "Trade Buy",
                        user_id: mongoose.mongo.ObjectId(buyuserid),
                        currencyid: pairdData.from_symbol_id,
                        fees: buynewfee.toFixed(8),
                        fullfees: buynewfee.toFixed(8),
                        orderid: mongoose.mongo.ObjectId(buyorderid),
                      };
                    //}
                    if (BuyOrder.createdDate < SellOrder.createdDate) {
                      let profitCreate1 = await profitDb.create(
                        buyOrderProfitToAdmin
                      );
                    } else {
                      let profitCreate4 = await profitDb.create(
                        buyOrderProfitToAdmin
                      );
                    }
                  }
                  //buy order profit

                  var sellBalance = filledprice - +sellnewfee.toFixed(8);
                  var selluserId = selluserid;

                  var buyBalance = amount - +buynewfee.toFixed(8);
                  var buyuserId = buyuserid;
                  var confrmId = tempRes._id;
                  var userids = {
                    selluserid: selluserid,
                    buyuserid: buyuserid,
                  };
                  filled += tempRes.askAmount;

                  var temp_res_amt = tempRes.askAmount;
                  matchingFilled(
                    pairdData,
                    limitOrderData,
                    getFindOrders,
                    0,
                    limitOrderData.filledAmount,
                    addAmount,
                    function (matchres) {
                      if (matchres.status) {
                        balanceUpdation(
                          selluserId,
                          pairdData.to_symbol_id,
                          confrmId,
                          sellBalance,
                          SellOrder,
                          temp_res_amt,
                          OrderPrice,
                          sellFees,
                          "sell",
                          pairdData,
                          userids,
                          async function (responseData) { }
                        );

                        balanceUpdation(
                          buyuserId,
                          pairdData.from_symbol_id,
                          confrmId,
                          buyBalance,
                          BuyOrder,
                          temp_res_amt,
                          OrderPrice,
                          buyFees,
                          "buy",
                          pairdData,
                          userids,
                          async function (responseData1) { }
                        );
                        common.updateActiveOrders(function (balance) { });
                        common.fetchInternalTickers(
                          pairdData.pair,
                          function (resp) { }
                        );
                        common.fetchInternalTradehistory(
                          pairdData.pair,
                          function (resp) { }
                        );
                      }
                    }
                  );
                }
              }
            }
          }
        }
      }
    } else {
      console.log("calll here 22222===");
      console.log("---------------- NO MATCH ORDERS FOUND----------------");
    }
  } catch (error) {
    console.log(
      "---------------- error FROM Market MATCHING----------------",
      error
    );
  }
};

//******TRADE MATCHING USER BALANCE UPDATION*******//

const balanceUpdation = async (
  tradeduserId,
  pairdData,
  tempId,
  tradedBalance,
  order,
  amount,
  OrderPrice,
  fee_per,
  type,
  pairdetail,
  userids
) => {
  try {
    // console.log("balanceUpdation type===",type);
    // console.log("balanceUpdation tradeduserId====",tradeduserId)
    // console.log("balanceUpdation amount====",amount)
    // console.log("balanceUpdation OrderPrice====",OrderPrice)
    // console.log("balanceUpdation pairdData====",pairdData)
    // console.log("balanceUpdation userids====",userids)
    // console.log("balanceUpdation tradedBalance====",tradedBalance)
    common.getUserTradeBalance(tradeduserId, pairdData, async function (balance) {
      // var balance = await common.getUserTradeBalance(tradeduserId, pairdData.to_symbol);
      var curBalance = balance.totalBalance;
      var Balance = curBalance + tradedBalance;

      let update_balance = await common.updateUserBalances(tradeduserId,pairdData,Balance,curBalance,tempId,type);
          //callback(true);
      if(update_balance)
      {
        if (type == "buy") {
          common.getUserTradeBalance(
            userids.buyuserid,
            pairdetail.to_symbol_id,
            function (hold_balance) {
              var holding = hold_balance.balanceHoldTotal;
              //console.log("buy hold_balance====",hold_balance)
              var filledprice = amount * OrderPrice;
              //console.log("buy balanceUpdation filledprice====",filledprice)
              var update_hold = holding - filledprice;
              //console.log("buy balanceUpdation update_hold====",update_hold)
              common.updateHoldAmount(
                userids.buyuserid,
                pairdetail.to_symbol_id,
                update_hold
              );

              // common.userOrderDetails(
              //   userids.buyuserid,
              //   order.firstSymbol + "_" + order.toSymbol,
              //   order.firstCurrency,
              //   function (userDatas) {
              //     var socketToken = common.encrypt(userids.buyuserid.toString());
              //     console.log("user socket token",socketToken)
              //     console.log("user socket token userDatas",userDatas)
              //     socketconnect.emit("userDetails" + socketToken, userDatas);
              //   }
              // );

              common.fetchInternalTickers(pairdetail.pair, () => {}),
              common.fetchInternalTradehistory(pairdetail.pair, () => {}),
              activeOrderRedis.activeOrdersSet(),
              common.userOrderDetails(
                order.userId,
                order.firstSymbol + "_" + order.toSymbol,
                order.firstCurrency,
                function (userDatas) {
                  var socketToken = common.encrypt(order.userId.toString());
                  socketconnect.emit("userDetails" + socketToken, userDatas);
                }
              )
              return true;
            }
          );
        } else {
          common.getUserTradeBalance(
            userids.selluserid,
            pairdetail.from_symbol_id,
            function (hold_balance) {
              var holding = hold_balance.balanceHoldTotal;
              //console.log("sell hold_balance====",hold_balance)
              var filledprice = amount;
              //console.log("sell balanceUpdation filledprice====",filledprice)
              var update_hold = holding - filledprice;
              // console.log("sell balanceUpdation update_hold====",update_hold)
              common.updateHoldAmount(
                userids.selluserid,
                pairdetail.from_symbol_id,
                update_hold
              );

              // common.userOrderDetails(
              //   userids.selluserid,
              //   order.firstSymbol + "_" + order.toSymbol,
              //   order.firstCurrency,
              //   function (userDatas) {
              //     var socketToken = common.encrypt(userids.selluserid.toString());
              //     console.log("user socket token",socketToken)
              //     console.log("user socket token userDatas",userDatas)
              //     socketconnect.emit("userDetails" + socketToken, userDatas);
              //   }
              // );

              common.fetchInternalTickers(pairdetail.pair, () => {}),
              common.fetchInternalTradehistory(pairdetail.pair, () => {}),
              activeOrderRedis.activeOrdersSet(),
              common.userOrderDetails(
                order.userId,
                order.firstSymbol + "_" + order.toSymbol,
                order.firstCurrency,
                function (userDatas) {
                  var socketToken = common.encrypt(order.userId.toString());
                  socketconnect.emit("userDetails" + socketToken, userDatas);
                }
              )
              return true;
            }
          );
        }
      }
          
    });
    // common.fetchInternalTickers(pairdData.pair, function (resp) { });
    // common.fetchInternalTradehistory(pairdData.pair, function (resp) { });
  } catch (error) {
    console.log("ERROR FROM balanceUpdation function::", error);
    return false;
  }
};

// ******MATCHING USER ORDER STATUS UPDATE************ //

var buyUserId = "";
var sellUserId = "";

const singlematchingFilled = async (
  pairdData,
  lastInsertOrder,
  dbMatchingOrders,
  inc,
  last_amt
) => {
  //console.log('matching filled',dbMatchingOrders,"('%%%%%%%%%',");
  try {
    // console.log('%%%%%###############last_amtlast_amt#######################%%%%',last_amt,"('%%%%%%%%%',");
    // console.log("dbMatchin^^^^^^^^^^^^^^^^^^^^^^^^^^^^^gOrders.amount",dbMatchingOrders.amount,"('%%%%%%%%%',");

    if (lastInsertOrder.Type == "buy") {
      var buyorderid = lastInsertOrder._id;
      var sellorderid = dbMatchingOrders._id;
      var buyAmount = last_amt;
      var sellAmount = dbMatchingOrders.filledAmount;
      buyUserId = lastInsertOrder.UserId;
      sellUserId = dbMatchingOrders.userId;
    } else {
      var buyorderid = dbMatchingOrders._id;
      var sellorderid = lastInsertOrder._id;
      var buyAmount = dbMatchingOrders.filledAmount;
      var sellAmount = last_amt;
      buyUserId = dbMatchingOrders.UserId;
      sellUserId = lastInsertOrder.userId;
    }
    // console.log('buyAmount',buyAmount,"('%%%%%%%%%',");
    // console.log("sellAmount",sellAmount,"('%%%%%%%%%',");
    if (last_amt >= dbMatchingOrders.filledAmount) {
      var amount = dbMatchingOrders.filledAmount;
    } else {
      var amount = last_amt;
    }
    //console.log('amount',amount,"('%%%%%%%%%',");
    if (dbMatchingOrders.created_at < lastInsertOrder.created_at) {
      var OrderPrice = dbMatchingOrders.Price;
    } else {
      var OrderPrice = lastInsertOrder.Price;
    }
    var newbuyAmount = buyAmount - +amount;
    var newsellAmount = sellAmount - +amount;
    // console.log('newbuyAmount',newbuyAmount,"('%%%%%%%%%',");
    // console.log('newsellAmount',newsellAmount,"('%%%%%%%%%',");
    newbuyAmount = newbuyAmount.toFixed(8);
    newsellAmount = newsellAmount.toFixed(8);
    let uptquery;
    if (+newbuyAmount == 0) {
      uptquery = "filled";
    } else {
      uptquery = "partially";
    }
    let selluptquery;
    if (+newsellAmount == 0) {
      selluptquery = "filled";
    } else {
      selluptquery = "partially";
    }

    var buyupdatearr = {};
    var sellupdatearr = {};
    buyupdatearr.status = uptquery;
    buyupdatearr.filledAmount = newbuyAmount;

    sellupdatearr.status = selluptquery;
    sellupdatearr.filledAmount = newsellAmount;

    orderPlaceDB.updateOne(
      { _id: buyorderid },
      { $set: buyupdatearr },
      function (err, resdata) {
        orderPlaceDB.findOne({ _id: buyorderid }).exec((error, orderDatas) => {
          if (!error && orderDatas) {
            var userids = orderDatas.userId;
            tradeRedis.activeOrdersSet();
            // common.userOrderDetails(
            //   userids,
            //   orderDatas.pairName,
            //   orderDatas.firstSymbol,
            //   function (userDatas) {
            //     var socketToken = common.encrypt(userids.toString());
            //     socketconnect.emit("userDetails" + socketToken, userDatas);
            //   }
            // );
            orderPlaceDB
              .find({
                userId: mongoose.Types.ObjectId(userids),
                $or: [{ status: "Active" }, { status: "partially" }],
              })
              .exec(function (err, response) {
                if (!err) {
                  var orders = [];
                  for (let index = 0; index < response.length; index++) {
                    const element = response[index];
                    var obj = {
                      orderId: element.orderId,
                      pair: element.pairName.replace("_", ""),
                      amount: element.amount,
                      price: element.price,
                      total: element.total,
                      tradeType: element.tradeType,
                      status: element.status,
                      time: Date.now(element.time),
                    };
                    orders.push(obj);
                  }
                  client.hset(
                    "getOpenOrders" + userids,
                    JSON.stringify(userids),
                    JSON.stringify(orders)
                  );
                }
              });
            orderPlaceDB
              .find({
                userId: mongoose.Types.ObjectId(userids),
                status: "filled",
              })
              .limit(10)
              .exec(function (err, response) {
                if (!err) {
                  var orders = [];
                  for (let index = 0; index < response.length; index++) {
                    const element = response[index];
                    var obj = {
                      orderId: element.orderId,
                      pair: element.pairName.replace("_", ""),
                      amount: element.amount,
                      price: element.price,
                      total: element.total,
                      tradeType: element.tradeType,
                      status: element.status,
                      time: Date.now(element.time),
                    };
                    orders.push(obj);
                    client.hset(
                      "GetLastTrade",
                      JSON.stringify(element.pairName),
                      JSON.stringify(obj)
                    );
                  }
                  client.hset(
                    "getuserTradeHistory" + userids,
                    JSON.stringify(userids),
                    JSON.stringify(orders)
                  );
                }
              });
            common.fetchInternalTickers(pairdData.pair, function (resp) { });
            common.fetchInternalTradehistory(
              pairdData.pair,
              function (resp) { }
            );
          }

          //    ================= STOP ORDER CALL =================== //
          //stopOrder(orderDatas);
        });
      }
    );
    orderPlaceDB.updateOne(
      { _id: sellorderid },
      { $set: sellupdatearr },
      function (err, resdata) {
        orderPlaceDB
          .findOne({ _id: sellorderid })
          .exec((error, orderDatass) => {
            if (!error && orderDatass) {
              var userids = orderDatass.userId;
              tradeRedis.activeOrdersSet();
              // common.userOrderDetails(
              //   userids,
              //   orderDatass.pairName,
              //   orderDatass.toSymbol,
              //   function (userDatas) {
              //     var socketToken = common.encrypt(userids.toString());
              //     socketconnect.emit("userDetails" + socketToken, userDatas);
              //   }
              // );

              orderPlaceDB
                .find({
                  userId: mongoose.Types.ObjectId(userids),
                  $or: [{ status: "Active" }, { status: "partially" }],
                })
                .exec(function (err, response) {
                  if (!err) {
                    var orders = [];
                    for (let index = 0; index < response.length; index++) {
                      const element = response[index];
                      var obj = {
                        orderId: element.orderId,
                        pair: element.pairName.replace("_", ""),
                        amount: element.amount,
                        price: element.price,
                        total: element.total,
                        tradeType: element.tradeType,
                        status: element.status,
                        time: Date.now(element.time),
                      };
                      orders.push(obj);
                    }
                    client.hset(
                      "getOpenOrders" + userids,
                      JSON.stringify(userids),
                      JSON.stringify(orders)
                    );
                  }
                });
              orderPlaceDB
                .find({
                  userId: mongoose.Types.ObjectId(userids),
                  status: "filled",
                })
                .limit(10)
                .exec(function (err, response) {
                  if (!err) {
                    var orders = [];
                    for (let index = 0; index < response.length; index++) {
                      const element = response[index];
                      var obj = {
                        orderId: element.orderId,
                        pair: element.pairName.replace("_", ""),
                        amount: element.amount,
                        price: element.price,
                        total: element.total,
                        tradeType: element.tradeType,
                        status: element.status,
                        time: Date.now(element.time),
                      };
                      orders.push(obj);
                      client.hset(
                        "GetLastTrade",
                        JSON.stringify(element.pairName),
                        JSON.stringify(obj)
                      );
                    }
                    client.hset(
                      "getuserTradeHistory" + userids,
                      JSON.stringify(userids),
                      JSON.stringify(orders)
                    );
                  }
                });
            }
            //stopOrder(orderDatass);
            common.fetchInternalTickers(pairdData.pair, function (resp) { });
            common.fetchInternalTradehistory(
              pairdData.pair,
              function (resp) { }
            );
          });

        //    =================STOP ORDER CALL =================== //
      }
    );
  } catch (error) {
    console.log("Error from matchingFilled", error);
  }
};

const matchingFilled = async (
  pairdData,
  lastInsertOrder,
  dbMatchingOrders,
  inc,
  last_amt,
  filled,
  callback
) => {
  //console.log('matching filled',dbMatchingOrders,"('%%%%%%%%%',");
  try {
    // console.log('%%%%%###############last_amtlast_amt#######################%%%%',last_amt,"('%%%%%%%%%',");
    // console.log("dbMatchin^^^^^^^^^^^^^^^^^^^^^^^^^^^^^gOrders.amount",filled,"('%%%%%%%%%',");

    if (lastInsertOrder.Type == "buy") {
      var buyorderid = lastInsertOrder._id;
      var sellorderid = dbMatchingOrders._id;
      var buyAmount = last_amt;
      var sellAmount = filled;
      buyUserId = lastInsertOrder.UserId;
      sellUserId = dbMatchingOrders.userId;
    } else {
      var buyorderid = dbMatchingOrders._id;
      var sellorderid = lastInsertOrder._id;
      var buyAmount = filled;
      var sellAmount = last_amt;
      buyUserId = dbMatchingOrders.UserId;
      sellUserId = lastInsertOrder.userId;
    }
    // console.log('buyAmount',buyAmount,"('%%%%%%%%%',");
    // console.log("sellAmount",sellAmount,"('%%%%%%%%%',");
    if (last_amt >= filled) {
      var amount = filled;
    } else {
      var amount = last_amt;
    }
    //console.log('amount',amount,"('%%%%%%%%%',");
    if (dbMatchingOrders.created_at < lastInsertOrder.created_at) {
      var OrderPrice = dbMatchingOrders.Price;
    } else {
      var OrderPrice = lastInsertOrder.Price;
    }
    var newbuyAmount = buyAmount - +amount;
    var newsellAmount = sellAmount - +amount;
    // console.log('newbuyAmount',newbuyAmount,"('%%%%%%%%%',");
    // console.log('newsellAmount',newsellAmount,"('%%%%%%%%%',");
    newbuyAmount = newbuyAmount.toFixed(8);
    newsellAmount = newsellAmount.toFixed(8);
    let uptquery;
    if (+newbuyAmount == 0) {
      uptquery = "filled";
    } else {
      uptquery = "partially";
    }
    let selluptquery;
    if (+newsellAmount == 0) {
      selluptquery = "filled";
    } else {
      selluptquery = "partially";
    }

    var buyupdatearr = {};
    var sellupdatearr = {};
    buyupdatearr.status = uptquery;
    buyupdatearr.filledAmount = newbuyAmount;

    sellupdatearr.status = selluptquery;
    sellupdatearr.filledAmount = newsellAmount;

    var resdata = await orderPlaceDB.updateOne(
      { _id: buyorderid },
      { $set: buyupdatearr }
    );
    var resdata1 = await orderPlaceDB.updateOne(
      { _id: sellorderid },
      { $set: sellupdatearr }
    );
    if (resdata && resdata1) {
      orderPlaceDB.findOne({ _id: buyorderid }).exec((error, orderDatas) => {
        if (!error && orderDatas) {
          var userids = orderDatas.userId;
          tradeRedis.activeOrdersSet();
          // common.userOrderDetails(
          //   userids,
          //   orderDatas.pairName,
          //   orderDatas.firstSymbol,
          //   function (userDatas) {
          //     var socketToken = common.encrypt(userids.toString());
          //     socketconnect.emit("userDetails" + socketToken, userDatas);
          //   }
          // );
          orderPlaceDB
            .find({
              userId: mongoose.Types.ObjectId(userids),
              $or: [{ status: "Active" }, { status: "partially" }],
            })
            .exec(function (err, response) {
              if (!err) {
                var orders = [];
                for (let index = 0; index < response.length; index++) {
                  const element = response[index];
                  var obj = {
                    orderId: element.orderId,
                    pair: element.pairName.replace("_", ""),
                    amount: element.amount,
                    price: element.price,
                    total: element.total,
                    tradeType: element.tradeType,
                    status: element.status,
                    time: Date.now(element.time),
                  };
                  orders.push(obj);
                }
                client.hset(
                  "getOpenOrders" + userids,
                  JSON.stringify(userids),
                  JSON.stringify(orders)
                );
              }
            });
          orderPlaceDB
            .find({
              userId: mongoose.Types.ObjectId(userids),
              status: "filled",
            })
            .limit(10)
            .exec(function (err, response) {
              if (!err) {
                var orders = [];
                for (let index = 0; index < response.length; index++) {
                  const element = response[index];
                  var obj = {
                    orderId: element.orderId,
                    pair: element.pairName.replace("_", ""),
                    amount: element.amount,
                    price: element.price,
                    total: element.total,
                    tradeType: element.tradeType,
                    status: element.status,
                    time: Date.now(element.time),
                  };
                  orders.push(obj);
                  client.hset(
                    "GetLastTrade",
                    JSON.stringify(element.pairName),
                    JSON.stringify(obj)
                  );
                }
                client.hset(
                  "getuserTradeHistory" + userids,
                  JSON.stringify(userids),
                  JSON.stringify(orders)
                );
              }
            });
        }

        //    ================= STOP ORDER CALL =================== //
        //stopOrder(orderDatas);
        common.fetchInternalTickers(pairdData.pair, function (resp) { });
      });
      orderPlaceDB.findOne({ _id: sellorderid }).exec((error, orderDatass) => {
        if (!error && orderDatass) {
          var userids = orderDatass.userId;
          tradeRedis.activeOrdersSet();
          // common.userOrderDetails(
          //   userids,
          //   orderDatass.pairName,
          //   orderDatass.toSymbol,
          //   function (userDatas) {
          //     var socketToken = common.encrypt(userids.toString());
          //     socketconnect.emit("userDetails" + socketToken, userDatas);
          //   }
          // );

          orderPlaceDB
            .find({
              userId: mongoose.Types.ObjectId(userids),
              $or: [{ status: "Active" }, { status: "partially" }],
            })
            .exec(function (err, response) {
              if (!err) {
                var orders = [];
                for (let index = 0; index < response.length; index++) {
                  const element = response[index];
                  var obj = {
                    orderId: element.orderId,
                    pair: element.pairName.replace("_", ""),
                    amount: element.amount,
                    price: element.price,
                    total: element.total,
                    tradeType: element.tradeType,
                    status: element.status,
                    time: Date.now(element.time),
                  };
                  orders.push(obj);
                }
                client.hset(
                  "getOpenOrders" + userids,
                  JSON.stringify(userids),
                  JSON.stringify(orders)
                );
              }
            });
          orderPlaceDB
            .find({
              userId: mongoose.Types.ObjectId(userids),
              status: "filled",
            })
            .limit(10)
            .exec(function (err, response) {
              if (!err) {
                var orders = [];
                for (let index = 0; index < response.length; index++) {
                  const element = response[index];
                  var obj = {
                    orderId: element.orderId,
                    pair: element.pairName.replace("_", ""),
                    amount: element.amount,
                    price: element.price,
                    total: element.total,
                    tradeType: element.tradeType,
                    status: element.status,
                    time: Date.now(element.time),
                  };
                  orders.push(obj);
                  client.hset(
                    "GetLastTrade",
                    JSON.stringify(element.pairName),
                    JSON.stringify(obj)
                  );
                }
                client.hset(
                  "getuserTradeHistory" + userids,
                  JSON.stringify(userids),
                  JSON.stringify(orders)
                );
              }
            });
        }
        //stopOrder(orderDatass);
        common.fetchInternalTickers(pairdData.pair, function (resp) { });
        common.fetchInternalTradehistory(pairdData.pair, function (resp) { });
      });

      //    =================STOP ORDER CALL =================== //
      callback({ status: true });
    } else {
      callback({ status: false });
    }

    // orderPlaceDB.updateOne({_id:buyorderid},{$set:buyupdatearr}, function(err,resdata){
    //     orderPlaceDB.findOne({_id:buyorderid}).exec((error, orderDatas) => {
    //         if(!error && orderDatas){
    //             var userids = orderDatas.userId
    //             tradeRedis.activeOrdersSet();
    //             common.userOrderDetails(userids, orderDatas.pairName,orderDatas.firstSymbol, function (userDatas){
    //                 var socketToken = common.encrypt((userids).toString())
    //                 socketconnect.emit('userDetails'+socketToken,userDatas);
    //            });
    //             orderPlaceDB.find({userId: mongoose.Types.ObjectId(userids), $or: [{ status: 'Active' }, { status: 'partially' }] }).exec(function (err, response) {
    //                 if (!err) {
    //                     var orders = []
    //                     for (let index = 0; index < response.length; index++) {
    //                         const element = response[index];
    //                         var obj = {
    //                             orderId: element.orderId,
    //                             pair: element.pairName.replace('_', ''),
    //                             amount: element.amount,
    //                             price: element.price,
    //                             total: element.total,
    //                             tradeType: element.tradeType,
    //                             status : element.status,
    //                             time: Date.now(element.time)
    //                         }
    //                         orders.push(obj)
    //                     }
    //                     client.hset('getOpenOrders' + userids, JSON.stringify(userids), JSON.stringify(orders))
    //                 }
    //             });
    //             orderPlaceDB.find({userId: mongoose.Types.ObjectId(userids), status : 'filled'}).limit(10).exec(function (err, response) {
    //                 if (!err) {
    //                     var orders = []
    //                     for (let index = 0; index < response.length; index++) {
    //                         const element = response[index];
    //                         var obj = {
    //                             orderId: element.orderId,
    //                             pair: element.pairName.replace('_', ''),
    //                             amount: element.amount,
    //                             price: element.price,
    //                             total: element.total,
    //                             tradeType: element.tradeType,
    //                             status : element.status,
    //                             time: Date.now(element.time)
    //                         }
    //                         orders.push(obj)
    //                         client.hset('GetLastTrade',JSON.stringify(element.pairName),JSON.stringify(obj))
    //                     }
    //                     client.hset('getuserTradeHistory'+userids, JSON.stringify(userids), JSON.stringify(orders))
    //                 }
    //             });
    //         }

    // //    ================= STOP ORDER CALL =================== //
    // //stopOrder(orderDatas);
    //     });
    // });
    // orderPlaceDB.updateOne({_id:sellorderid},{$set:sellupdatearr},function(err,resdata){
    //     orderPlaceDB.findOne({_id:sellorderid}).exec((error, orderDatass) => {
    //         if(!error && orderDatass){
    //             var userids = orderDatass.userId
    //             tradeRedis.activeOrdersSet();
    //             common.userOrderDetails(userids, orderDatass.pairName,orderDatass.toSymbol, function (userDatas){
    //                 var socketToken = common.encrypt((userids).toString())
    //                 socketconnect.emit('userDetails'+socketToken,userDatas);
    //            });

    //             orderPlaceDB.find({userId: mongoose.Types.ObjectId(userids),  $or: [{ status: 'Active' }, { status: 'partially' }] }).exec(function (err, response) {
    //                 if (!err) {
    //                     var orders = []
    //                     for (let index = 0; index < response.length; index++) {
    //                         const element = response[index];
    //                         var obj = {
    //                             orderId: element.orderId,
    //                             pair: element.pairName.replace('_', ''),
    //                             amount: element.amount,
    //                             price: element.price,
    //                             total: element.total,
    //                             tradeType: element.tradeType,
    //                             status : element.status,
    //                             time: Date.now(element.time)
    //                         }
    //                         orders.push(obj)
    //                     }
    //                     client.hset('getOpenOrders' + userids, JSON.stringify(userids), JSON.stringify(orders))
    //                 }
    //             })
    //             orderPlaceDB.find({userId: mongoose.Types.ObjectId(userids), status : 'filled'}).limit(10).exec(function (err, response) {
    //                 if (!err) {
    //                     var orders = []
    //                     for (let index = 0; index < response.length; index++) {
    //                         const element = response[index];
    //                         var obj = {
    //                             orderId: element.orderId,
    //                             pair: element.pairName.replace('_', ''),
    //                             amount: element.amount,
    //                             price: element.price,
    //                             total: element.total,
    //                             tradeType: element.tradeType,
    //                             status : element.status,
    //                             time: Date.now(element.time)
    //                         }
    //                         orders.push(obj)
    //                         client.hset('GetLastTrade',JSON.stringify(element.pairName),JSON.stringify(obj))
    //                     }
    //                     client.hset('getuserTradeHistory'+userids, JSON.stringify(userids), JSON.stringify(orders))
    //                 }
    //             })
    //         }
    //         //stopOrder(orderDatass);
    //     });

    //     //    =================STOP ORDER CALL =================== //

    // });
  } catch (error) {
    console.log("Error from matchingFilled", error);
    callback({ status: false });
  }
};

let place_order_retry_count = 0;
const binanceCreateOrder1 = async (object, limitOrderData) => {
  try {
    var symbol = object.symbol;
    var quantity = object.quantity;
    var price = object.price;
    var side = object.side;
    var timeStamp = new Date().getTime();
    var body = "";
    if (object.type == "LIMIT") {
      //for limit order

      body =
        "symbol=" +
        symbol +
        "&type=LIMIT&price=" +
        price +
        "&quantity=" +
        quantity +
        "&side=" +
        side +
        "&timestamp=" +
        timeStamp +
        "&timeInForce=GTC";
    } else if (object.type == "MARKET") {
      //for market order
      body =
        "symbol=" +
        symbol +
        "&type=MARKET&quantity=" +
        quantity +
        "&side=" +
        side +
        "&timestamp=" +
        timeStamp;
    } else if (object.type == "STOP_LOSS_LIMIT") {
      var stopprice = object.stopPrice;
      body =
        "symbol=" +
        symbol +
        "&type=STOP_LOSS_LIMIT&price=" +
        price +
        "&quantity=" +
        quantity +
        "&side=" +
        side +
        "&timestamp=" +
        timeStamp +
        "&timeInForce=GTC" +
        "&stopPrice=" +
        stopprice;
      // body = 'symbol='+symbol+'&type=TAKE_PROFIT&quantity='+quantity+'&side='+side+'&timestamp='+timeStamp+'&stopPrice='+stopprice
      // body = 'symbol='+symbol+'&type=STOP_LOSS_LIMIT&price='+stopprice+'&quantity='+quantity+'&side='+side+'&timestamp='+timeStamp+'&timeInForce=GTC'+'&stopPrice='+price
      //body = 'symbol='+symbol+'&type=LIMIT&price='+stopprice+'&quantity='+quantity+'&side='+side+'&timestamp='+timeStamp+'&timeInForce=GTC'
    }
    console.log("binance typeof price====", typeof price);
    // return;
    const signature = await crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    var headers = {
      "X-MBX-APIKEY": key,
      "Content-Type": "application/json",
    };
    const options = {
      method: "POST",
      url: baseurl + "/api/v3/order" + "?" + "&signature=" + signature,
      headers: headers,
      body: body,
      //'data': body,
    };
    console.log("binance options===", options);
    request(options, function (error, response, body) {
      // var response = await axios(options);
      console.log("binance order place response ====", body);
      if (response.statusCode == 200) {
        var body = JSON.parse(body);
        //var body = response.data;
        let output = {
          status: 200,
          exchange: "BINANCE",
          id: body.orderId,
          symbol: object.symbol,
        };
        if (object.type == "STOP_LOSS_LIMIT") {
          var order_status = "stop";
        } else {
          var order_status =
            body.status.toLowerCase() == "new"
              ? "Active"
              : body.status.toLowerCase();
        }

        console.log("binance order_status", order_status);

        orderPlaceDB
          .findOneAndUpdate(
            { _id: mongoose.Types.ObjectId(limitOrderData._id) },
            {
              $set: {
                orderId: body.orderId,
                site: "binance",
                status: order_status,
              },
            }
          )
          .exec(function (err, orderPlaceUpd) {
            if (!err) {
              tradeRedis.activeOrdersSet();
              var currencyId =
                limitOrderData.tradeType == "buy"
                  ? limitOrderData.firstCurrency
                  : limitOrderData.secondCurrency;
              common.userOrderDetails(
                limitOrderData.userId,
                limitOrderData.pairName,
                currencyId,
                function (userDatas) {
                  var socketToken = common.encrypt(
                    limitOrderData.userId.toString()
                  );
                  socketconnect.emit("userDetails" + socketToken, userDatas);
                }
              );
              if (order_status == "filled") {
                updateLiquidity(limitOrderData, body);
              } else {
                getBianaceorderDetails();
              }
            }
          });

        // orderPlaceDB.updateOne({'_id' : limitOrderData._id}, {$set : {'site':'binance', 'orderId' :body.orderId }}).exec((err, data) => {
        //     console.log("binance order place ",data);
        //     if(!err){
        //     //getBianaceorderDetails();
        //     }else{
        //     }
        // });
        return output;
      } else {
        var body = JSON.parse(body);
        console.log("binance order update===", body);
        // orderPlaceDB.updateOne({'_id' : limitOrderData._id}, {$set : {'site':'Pitiklini', 'error' :body.msg }}).exec((err, data) => {
        //     if(!err){
        //         tradePairDB.findOne({'_id':limitOrderData.pairId}).exec(function(perr,pairData){
        //             if(!perr)
        //             {
        //                 orderCancel(pairData,limitOrderData,async function(response){
        //                     console.log("cancel liq order===",response);
        //                     if(response.status)
        //                     {
        //                         let output = {
        //                             status:200,
        //                         }
        //                         var socketToken = common.encrypt(limitOrderData.userId.toString());
        //                         console.log("socketToken===",socketToken);
        //                         socketconnect.emit('cancelOrder'+socketToken,limitOrderData);

        //                         if(body.msg == "Account has insufficient balance for requested action.")
        //                         {

        //                             let resData = await mailtempDB.findOne({ key: 'order_notify_user' });
        //                             let userdata = await usersDB.findOne({_id:limitOrderData.userId},{username:1,email:1});
        //                             if(resData){
        //                             var usermail          = common.decrypt(userdata.email);
        //                             var etempdataDynamic = resData.body.replace(/###TYPE###/g, limitOrderData.tradeType).replace(/###USERNAME###/g, userdata.username).replace(/###AMOUNT###/g, limitOrderData.amount).replace(/###PAIR###/g, limitOrderData.pairName);
        //                             mail.sendMail({from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: usermail, subject: resData.Subject, html: etempdataDynamic },function(mailRes){}); }

        //                             let resData1 = await mailtempDB.findOne({ key: 'order_notify_admin' });
        //                             let admindata = await adminDB.findOne({},{username:1,email:1});
        //                             if(resData1){
        //                             var adminmail          = common.decrypt(admindata.email);
        //                             var etempdataDynamic1 = resData1.body.replace(/###TYPE###/g, limitOrderData.tradeType).replace(/###USERNAME###/g, userdata.username).replace(/###PAIR###/g, limitOrderData.pairName);
        //                             mail.sendMail({from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: process.env.FROM_EMAIL, subject: resData1.Subject, html: etempdataDynamic1 },function(mailRes1){}); }
        //                         }
        //                         return(output);
        //                     }
        //                 })
        //             }
        //         })
        //     }else{
        //     }
        // });

        if (
          body.code == "-2010" &&
          body.msg == "Account has insufficient balance for requested action."
        ) {
          // if(object.type == "MARKET")
          // {
          var orderId = new Date().getTime();
          orderPlaceDB
            .findOneAndUpdate(
              { _id: limitOrderData._id },
              { $set: { orderId: orderId, status: "filled" } }
            )
            .exec(function (err, orderPlaceUpd) {
              if (!err) {
                tradeRedis.activeOrdersSet();
                var currencyId =
                  orderPlaceUpd.tradeType == "buy"
                    ? orderPlaceUpd.firstCurrency
                    : orderPlaceUpd.secondCurrency;
                common.userOrderDetails(
                  orderPlaceUpd.userId,
                  orderPlaceUpd.pairName,
                  currencyId,
                  function (userDatas) {
                    var socketToken = orderPlaceUpd.userId.toString();
                    socketconnect.emit("userDetails" + socketToken, userDatas);
                  }
                );
                var resp = {
                  orderId: orderPlaceUpd.orderId,
                  userId: "642ffea99824dbd172a37eeb",
                };
                updateLiquidity(orderPlaceUpd, resp);
              }
            });
          //}
        } else {
          orderPlaceDB
            .updateOne(
              { _id: limitOrderData._id },
              { $set: { site: "Pitiklini", error: body.msg } }
            )
            .exec((err, data) => {
              if (!err) {
                tradePairDB
                  .findOne({ _id: limitOrderData.pairId })
                  .exec(function (perr, pairData) {
                    if (!perr) {
                      orderCancel(
                        pairData,
                        limitOrderData,
                        async function (response) {
                          console.log("cancel liq order===", response);
                          if (response.status) {
                            let output = {
                              status: 200,
                            };
                            var socketToken = common.encrypt(
                              limitOrderData.userId.toString()
                            );
                            console.log("socketToken===", socketToken);
                            socketconnect.emit(
                              "cancelOrder" + socketToken,
                              limitOrderData
                            );

                            // if(body.msg == "Account has insufficient balance for requested action.")
                            // {

                            //     let resData = await mailtempDB.findOne({ key: 'order_notify_user' });
                            //     let userdata = await usersDB.findOne({_id:limitOrderData.userId},{username:1,email:1});
                            //     if(resData){
                            //     var usermail          = common.decrypt(userdata.email);
                            //     var etempdataDynamic = resData.body.replace(/###TYPE###/g, limitOrderData.tradeType).replace(/###USERNAME###/g, userdata.username).replace(/###AMOUNT###/g, limitOrderData.amount).replace(/###PAIR###/g, limitOrderData.pairName);
                            //     mail.sendMail({from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: usermail, subject: resData.Subject, html: etempdataDynamic },function(mailRes){}); }

                            //     let resData1 = await mailtempDB.findOne({ key: 'order_notify_admin' });
                            //     let admindata = await adminDB.findOne({},{username:1,email:1});
                            //     if(resData1){
                            //     var adminmail          = common.decrypt(admindata.email);
                            //     var etempdataDynamic1 = resData1.body.replace(/###TYPE###/g, limitOrderData.tradeType).replace(/###USERNAME###/g, userdata.username).replace(/###PAIR###/g, limitOrderData.pairName);
                            //     mail.sendMail({from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: process.env.FROM_EMAIL, subject: resData1.Subject, html: etempdataDynamic1 },function(mailRes1){}); }
                            // }
                            return output;
                          }
                        }
                      );
                    }
                  });
              } else {
              }
            });
        }
        let output = {
          status: 500,
        };
        return output;
      }
    });
  } catch (error) {
    console.log("binance order place catch===", error);
    // if (place_order_retry_count <= 3) {
    //     place_order_retry_count = place_order_retry_count + 1
    //     binanceCreateOrder(object, limitOrderData)
    // }
  }
};

// Author ------Mugeshkumar DEV

const binanceCreateOrder = async (orderData, limitOrderData) => {
  try {
    const { symbol, quantity, price, side, type, stopPrice } = orderData;
    const timeStamp = Date.now();

    let body = `symbol=${symbol}&quantity=${quantity}&side=${side}&timestamp=${timeStamp}`;

    switch (type) {
      case "LIMIT":
        body += `&type=LIMIT&price=${price}&timeInForce=GTC`;
        break;
      case "MARKET":
        body += `&type=MARKET`;
        break;
      case "STOP_LOSS_LIMIT":
        body += `&type=STOP_LOSS_LIMIT&price=${price}&timeInForce=GTC&stopPrice=${stopPrice}`;
        break;
    }

    console.log("binance create order-----",body);

    const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

    const options = {
      method: "POST",
      url: `${baseurl}/api/v3/order?${body}&signature=${signature}`, // Fix URL string interpolation
      headers: { "X-MBX-APIKEY": key },
    };

    const { body: responseBody, statusCode } = await requestPromise(options);
    console.log(responseBody, "response");

    const parsedBody = JSON.parse(responseBody);
    if (statusCode !== 200) {
      return handleError(parsedBody, limitOrderData);
    }

    const order_status =
      type === "STOP_LOSS_LIMIT"
        ? "stop"
        : parsedBody.status.toLowerCase() === "new"
          ? "Active"
          : parsedBody.status.toLowerCase();

    await orderPlaceDB.updateOne({ _id: limitOrderData._id }, {
      $set: {
        orderId: parsedBody.orderId,
        site: "binance",
        status: order_status,
      }
    });


    tradeRedis.activeOrdersSet();

    const currencyId =
      limitOrderData.tradeType === "buy"
        ? limitOrderData.firstCurrency
        : limitOrderData.secondCurrency;

    common.userOrderDetails(
      limitOrderData.userId,
      limitOrderData.pairName,
      currencyId,
      (userDatas) => {
        const socketToken = common.encrypt(limitOrderData.userId.toString());
        socketconnect.emit(`userDetails${socketToken}`, userDatas);
      }
    );

    if (order_status === "filled") {
      updateLiquidity(limitOrderData, parsedBody);
    } else {
      getBianaceorderDetails(); // Call only if not filled
    }

    return { status: 200, exchange: "BINANCE", id: parsedBody.orderId, symbol };

  } catch (error) {
    console.error("Error placing Binance order:", error);
  }
};

const requestPromise = (options) => {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) reject(error);
      else resolve({ body, statusCode: response.statusCode });
    });
  });
};

const handleError = async (body, limitOrderData) => {
  if (body.code === "-2010" && body.msg.includes("insufficient balance")) {
    const orderId = Date.now();
    await orderPlaceDB.findByIdAndUpdate(limitOrderData._id, {
      orderId,
      status: "filled",
    });
    tradeRedis.activeOrdersSet();

    const currencyId =
      limitOrderData.tradeType === "buy"
        ? limitOrderData.firstCurrency
        : limitOrderData.secondCurrency;
    const userDatas = await common.userOrderDetails(
      limitOrderData.userId,
      limitOrderData.pairName,
      currencyId
    );

    const socketToken = common.encrypt(limitOrderData.userId.toString());
    socketconnect.emit(`userDetails${socketToken}`, userDatas);

    updateLiquidity(limitOrderData, { orderId, userId: limitOrderData.userId });

    return { status: 200, message: "Order filled despite error" };
  } else {
    await orderPlaceDB.updateOne(
      { _id: limitOrderData._id },
      { site: "Pitiklini", error: body.msg }
    );
    const pairData = await tradePairDB.findById(limitOrderData.pairId);
    orderCancel(pairData, limitOrderData);

    return { status: 500, error: body.msg };
  }
};

const getBianaceorderDetails = async () => {
  try {
    await tradeRedis.activeOrdersSet();
    let activeOrderDatas = await redisHelper.RedisService.get(
      "site_activeOrders"
    );
    console.log("call getbinance orders=====", activeOrderDatas);
    if (activeOrderDatas && activeOrderDatas != null) {
      for (var i = 0; i < activeOrderDatas.length; i++) {
        if (activeOrderDatas[i].site == "binance") {
          var pairsplit = activeOrderDatas[i].pairName.split("_");
          var liq_name =
            pairsplit[1] == "INR"
              ? pairsplit[0] + "USDT"
              : activeOrderDatas[i].liquidity_name;
          let inputData = {
            orderId: activeOrderDatas[i].orderId,
            timestamp: new Date().getTime(),
            symbol: liq_name,
          };
          //let inputData = { orderId:'18870743',timestamp: new Date().getTime() ,symbol: 'AVAXEUR'};

          const dataQueryString = qs.stringify(inputData);
          const signature = await crypto
            .createHmac("sha256", secret)
            .update(dataQueryString)
            .digest("hex");
          var headers = {
            "X-MBX-APIKEY": key,
          };
          const options = {
            method: "GET",
            url:
              baseurl +
              "/api/v3/order" +
              "?" +
              dataQueryString +
              "&signature=" +
              signature,
            headers: headers,
          };
          request(options, async function (error, response, body) {
            //console.log("order details===",response);
            if (!error && response.statusCode == 200) {
              var body = JSON.parse(body);
              console.log("order details body===", body);
              console.log("order details order id===", body.orderId);
              var order_status =
                body.status.toLowerCase() == "new"
                  ? "Active"
                  : body.status.toLowerCase();
              orderPlaceDB
                .findOneAndUpdate(
                  { orderId: body.orderId },
                  { $set: { status: order_status } }
                )
                .exec(function (err, orderPlaceUpd) {
                  if (!err) {
                    tradeRedis.activeOrdersSet();
                    // var currencyId =
                    //   orderPlaceUpd.tradeType == "buy"
                    //     ? orderPlaceUpd.firstCurrency
                    //     : orderPlaceUpd.secondCurrency;
                    // common.userOrderDetails(
                    //   orderPlaceUpd.userId,
                    //   orderPlaceUpd.pairName,
                    //   currencyId,
                    //   function (userDatas) {
                    //     var socketToken = common.encrypt(
                    //       orderPlaceUpd.userId.toString()
                    //     );
                    //     socketconnect.emit(
                    //       "userDetails" + socketToken,
                    //       userDatas
                    //     );
                    //   }
                    // );
                    if (order_status == "filled") {
                      updateLiquidity(orderPlaceUpd, body);
                    }
                  }
                });
            }
          });
        }
      }
    } else {
      tradeRedis.activeOrdersSet();
    }
    if (activeOrderDatas.length > 0) {
      setTimeout(() => {
        getBianaceorderDetails();
      }, 1000 * 10);
    }
  } catch (error) {
    console.log("ERROR FROM balanceUpdation function::", error);
  }
};

const stopOrder = async (stopOrderDatas) => {
  try {
    var ordersLists = [];

    var result = await redisHelper.RedisService.hget(
      "BINANCE-TICKERPRICE",
      stopOrderDatas.pairName.toLowerCase()
    );
    var marketPrice = +result.lastprice.lastprice;
    console.log("marketprice====", marketPrice);

    let getSellOrderDet = await orderPlaceDB
      .find({
        status: "stop",
        pairName: stopOrderDatas.pairName,
        tradeType: "buy",
        $or: [
          { stoporderprice: { $lte: marketPrice } },
          { price: marketPrice },
        ],
      })
      .exec({});
    if (getSellOrderDet.length > 0) {
      ordersLists = ordersLists.concat(getSellOrderDet);
    }

    let getBuyOrderDet = await orderPlaceDB
      .find({
        status: "stop",
        pairName: stopOrderDatas.pairName,
        tradeType: "sell",
        $or: [
          { stoporderprice: { $gte: marketPrice } },
          { price: marketPrice },
        ],
      })
      .exec({});
    if (getBuyOrderDet.length > 0) {
      ordersLists = ordersLists.concat(getBuyOrderDet);
    }
    if (ordersLists.length > 0) {
      ordersLists.sort(
        (a, b) =>
          new Date(a.createddate).getTime() - new Date(b.createddate).getTime()
      );
      for (let j = 0; j < ordersLists.length; j++) {
        (async function () {
          let i = j;
          let _id = ordersLists[i]._id;
          let triggerStopOrders = await orderPlaceDB
            .updateOne(
              { _id: _id },
              { $set: { status: "Active" } },
              { multi: true }
            )
            .exec({});
          if (triggerStopOrders) {
            common.userOrderDetails(
              ordersLists.userId,
              ordersLists.pairName,
              "",
              function (userDatas) {
                var socketToken = common.encrypt(userids.toString());
                socketconnect.emit("userDetails" + socketToken, userDatas);
              }
            );
            let limitOrderData = await orderPlaceDB
              .findOne({ _id: _id })
              .exec({});
            if (limitOrderData) {
              let pairdData = await tradePairDB
                .findOne({ pair: limitOrderData.pairName })
                .exec({});
              if (pairdData) {
                matching(limitOrderData, pairdData);
              }
            }
          }
        })();
      }
    }
  } catch (error) {
    console.log("ERROR FROM stopOrder function::", error);
  }
};

const updateLiquidity = async (limitOrderData, liquid) => {
  try {
    var OrderPrice = limitOrderData.price;
    var Tot = limitOrderData.amount * OrderPrice;

    if (limitOrderData.tradeType == "buy") {
      var BuyOrder = limitOrderData;
      var SellOrder = liquid;

      var buyorderid = BuyOrder._id;
      var buyuserid = BuyOrder.userId;
      var buyprice = BuyOrder.price;
      var sellorderid = new ObjectId();
      var selluserid = SellOrder.userId;
      var sellprice = BuyOrder.price;
      var buyFees = BuyOrder.makerFee;
      var sellFees = BuyOrder.makerFee;
      var ordertype = "Buy";
      var order_type = BuyOrder.ordertype;
    } else {
      var SellOrder = limitOrderData;
      var BuyOrder = liquid;

      var buyorderid = new ObjectId();
      var buyuserid = BuyOrder.userId;
      var buyprice = SellOrder.price;
      var sellorderid = SellOrder._id;
      var selluserid = SellOrder.userId;
      var sellprice = SellOrder.price;
      var buyFees = SellOrder.makerFee;
      var sellFees = SellOrder.makerFee;
      var ordertype = "Sell";
      var order_type = SellOrder.ordertype;
    }

    var filledprice = limitOrderData.amount * OrderPrice;
    var buynewfee = (limitOrderData.amount * buyFees) / 100;
    var sellnewfee = (filledprice * sellFees) / 100;
    confirmOrderDB
      .find({
        sellorderId: mongoose.mongo.ObjectId(sellorderid),
        buyorderId: mongoose.mongo.ObjectId(buyorderid),
      })
      .exec(async function (getErr, getorderRes) {
       // console.log("getorderRes.length===", getorderRes.length);
        if (getorderRes.length == 0) {

           let buyer_details = await usersDB.findOne({_id:BuyOrder.userId},{ptk_fee_status:1});
           let seller_details = await usersDB.findOne({_id:SellOrder.userId},{ptk_fee_status:1});

          let tradetypes = ordertype.toLowerCase();

          let insertTempDbJson = {
            sellorderId: mongoose.mongo.ObjectId(sellorderid),
            sellerUserId: mongoose.mongo.ObjectId(selluserid),
            seller_ordertype: order_type,
            askAmount: limitOrderData.amount,
            askPrice: OrderPrice,
            firstCurrency: limitOrderData.firstSymbol,
            secondCurrency: limitOrderData.toSymbol,
            buyorderId: mongoose.mongo.ObjectId(buyorderid),
            buyerUserId: mongoose.mongo.ObjectId(buyuserid),
            buyer_ordertype: order_type,
            total: Tot,
            buy_fee: buynewfee,
            sell_fee: sellnewfee,
            pair: limitOrderData.firstSymbol + "_" + limitOrderData.toSymbol,
            type: ordertype.toLowerCase(),
            fee_currency_buy: (buyer_details != null) ? (buyer_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? limitOrderData.firstSymbol :  limitOrderData.toSymbol : tradetypes == "buy" ? limitOrderData.firstSymbol :  limitOrderData.toSymbol,
            fee_currency_sell: (seller_details != null) ? (seller_details.ptk_fee_status == 1) ? "PTK" : tradetypes == "buy" ? limitOrderData.firstSymbol :  limitOrderData.toSymbol : tradetypes == "buy" ? limitOrderData.firstSymbol :  limitOrderData.toSymbol
          };
         //console.log(insertTempDbJson, "insertTempDbJson");
          var tempRes = await confirmOrderDB.create(insertTempDbJson);
          // confirmOrderDB.create(insertTempDbJson,function(tempErr,tempRes){
          if (tempRes) {
            var confrmId = tempRes._id;

            //sell order profit
            var seller_refferal_id = await usersDB.findOne({
              _id: mongoose.mongo.ObjectId(selluserid),
            });
            //console.log("0909090909090", seller_refferal_id);
            if (seller_refferal_id != null) {
              // if (
              //   seller_refferal_id.referred_by != null &&
              //   seller_refferal_id.referred_by != undefined &&
              //   seller_refferal_id.referred_by != ""
              // ) {
              //   var userprofit = sellnewfee * 0.5;
              //   var adminprofit = sellnewfee * 0.5;
              //   var update = await userWalletDB.findOneAndUpdate(
              //     {
              //       userId: seller_refferal_id.referred_by,
              //       "wallets.currencyId": limitOrderData.firstCurrency,
              //     },
              //     {
              //       $inc: {
              //         "wallets.$.amount": +userprofit,
              //       },
              //     },
              //     {
              //       new: true,
              //     }
              //   );
              //   console.log(
              //     "------------------------------------===================="
              //   );
              //   //sell order profit
              //   let sellOrderProfitToAdmin = {
              //     type: "Trade Sell",
              //     user_id: mongoose.mongo.ObjectId(selluserid),
              //     currencyid: limitOrderData.secondCurrency,
              //     fees: adminprofit.toFixed(8),
              //     fullfees: adminprofit.toFixed(8),
              //     orderid: mongoose.mongo.ObjectId(sellorderid),
              //   };

              //   var refer_history = {
              //     currencyId: limitOrderData.secondCurrency,
              //     // amount : parseFloat(discount_sell_fee).toFixed(8),
              //     userId: selluserid,
              //     fee: adminprofit.toFixed(8),
              //     type: "Trade Sell",
              //     fromUser: seller_refferal_id.referred_by,
              //     createdDate: new Date(),
              //     modifiedDate: new Date(),
              //   };
              //   console.log(
              //     refer_history,
              //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
              //   );
              //   let refHistory = await referralHistoryDB.create(refer_history);

              //   profitDb.create(
              //     sellOrderProfitToAdmin,
              //     function (profitErr, profitRes) { }
              //   );
              // } else {
                let sellOrderProfitToAdmin = {
                  type: "Trade Sell",
                  user_id: mongoose.mongo.ObjectId(selluserid),
                  currencyid: limitOrderData.secondCurrency,
                  fees: sellnewfee.toFixed(8),
                  fullfees: sellnewfee.toFixed(8),
                  orderid: mongoose.mongo.ObjectId(sellorderid),
                };

                profitDb.create(
                  sellOrderProfitToAdmin,
                  function (profitErr, profitRes) { }
                );
              //}
            } else {
              //buy order profit
              var buyer_refferal_id = await usersDB.findOne({
                _id: mongoose.mongo.ObjectId(buyuserid),
              });
              //console.log(buyer_refferal_id, "-------");
              // if (
              //   buyer_refferal_id.referred_by != null &&
              //   buyer_refferal_id.referred_by != undefined &&
              //   buyer_refferal_id.referred_by != ""
              // ) {
              //   var userprofit = buynewfee * 0.5;
              //   var adminprofit = buynewfee * 0.5;

              //   var update = await userWalletDB.findOneAndUpdate(
              //     {
              //       userId: buyer_refferal_id.referred_by,
              //       "wallets.currencyId": limitOrderData.firstCurrency,
              //     },
              //     {
              //       $inc: {
              //         "wallets.$.amount": +userprofit,
              //       },
              //     },
              //     {
              //       new: true,
              //     }
              //   );

              //   let buyOrderProfitToAdmin = {
              //     type: "Trade Buy",
              //     user_id: mongoose.mongo.ObjectId(buyuserid),
              //     currencyid: limitOrderData.firstCurrency,
              //     fees: +adminprofit.toFixed(8),
              //     fullfees: +adminprofit.toFixed(8),
              //     orderid: mongoose.mongo.ObjectId(buyorderid),
              //   };
              //   console.log(buyOrderProfitToAdmin, "buyOrderProfitToAdmin");
              //   var refer_history = {
              //     currencyId: limitOrderData.firstCurrency,
              //     // amount : parseFloat(discount_sell_fee).toFixed(8),
              //     userId: buyuserid,
              //     fee: adminprofit.toFixed(8),
              //     type: "Trade Buy",
              //     fromUser: buyer_refferal_id.referred_by,
              //     createdDate: new Date(),
              //     modifiedDate: new Date(),
              //   };
              //   console.log(
              //     refer_history,
              //     "=-=-=-=-=-=-=-=-=-=-=====-=Have discount on spot fee =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
              //   );
              //   let refHistory = await referralHistoryDB.create(refer_history);

              //   profitDb.create(
              //     buyOrderProfitToAdmin,
              //     function (profitErr, profitRes) { }
              //   );
              // } else {
                let buyOrderProfitToAdmin = {
                  type: "Trade Buy",
                  user_id: mongoose.mongo.ObjectId(buyuserid),
                  currencyid: limitOrderData.firstCurrency,
                  fees: +buynewfee.toFixed(8),
                  fullfees: +buynewfee.toFixed(8),
                  orderid: mongoose.mongo.ObjectId(buyorderid),
                };
                profitDb.create(
                  buyOrderProfitToAdmin,
                  function (profitErr, profitRes) { }
                );
             // }
            }

            if (limitOrderData.tradeType == "buy") {
              var tradedBalance = limitOrderData.amount - +buynewfee.toFixed(8);
              var tradeduserId = buyuserid;

              binance_balanceUpdation(
                buyuserid,
                limitOrderData.firstCurrency,
                confrmId,
                tradedBalance,
                BuyOrder,
                limitOrderData.amount,
                OrderPrice,
                buyFees,
                "buy",
                limitOrderData,
                async function (responseData) { 
                  // console.log("binance balance buy update====",responseData)
                  // if(responseData)
                  // {
                  //   common.userOrderDetails(
                  //     tradeduserId,
                  //     limitOrderData.firstSymbol + "_" + limitOrderData.toSymbol,
                  //     limitOrderData.firstCurrency,
                  //     function (userDatas) {
                  //       var socketToken = common.encrypt(tradeduserId.toString());
                  //       console.log("user socket token",socketToken)
                  //       console.log("user socket token userDatas",userDatas)
                  //       socketconnect.emit("userDetails" + socketToken, userDatas);
                  //     }
                  //   );
                  // }
                }
              );
              
            } else {
              var tradedBalance = filledprice - +sellnewfee.toFixed(8);
              var tradeduserId = selluserid;

              binance_balanceUpdation(
                selluserid,
                limitOrderData.secondCurrency,
                confrmId,
                tradedBalance,
                SellOrder,
                limitOrderData.amount,
                OrderPrice,
                sellFees,
                "sell",
                limitOrderData,
                function (responseData) {
                  // console.log("binance balance sell update====",responseData)
                  // if(responseData)
                  // {
                  //   common.userOrderDetails(
                  //     tradeduserId,
                  //     limitOrderData.firstSymbol + "_" + limitOrderData.toSymbol,
                  //     limitOrderData.secondCurrency,
                  //     function (userDatas) {
                  //       var socketToken = common.encrypt(tradeduserId.toString());
                  //       console.log("user socket token 111",socketToken)
                  //       console.log("user socket token userDatas",userDatas)
                  //       socketconnect.emit("userDetails" + socketToken, userDatas);
                  //     }
                  //   );
                  // }
                 }
              );

             
            }
          }
        }
      });
  } catch (error) {
    console.log("ERROR FROM callLimitOrder", error);
  }
};

const orderCancel = async (pairData, orderData, callback) => {
  var count = 0;
  try {
    if (orderData.site == "binance") {
      console.log("BINANCE CANCEL ORDERS");
      var timeStamp = new Date().getTime();

      binanceClient
        .cancelOrder({
          orderId: orderData.orderId,
          symbol: orderData.liquidity_name,
          timestamp: timeStamp,
        })
        .then(async (result) => {
          if (orderData.tradeType == "buy") {
            var detuctBalance = +orderData.amount * +orderData.price;
            var currency = pairData.to_symbol;
            var currency_id = pairData.to_symbol_id;
          } else if (orderData.tradeType == "sell") {
            var detuctBalance = +orderData.amount;
            var currency = pairData.from_symbol;
            var currency_id = pairData.from_symbol_id;
          }

          let balance = await common.getUserBalanceCancel(
            orderData.userId,
            currency
          );

          if (balance) {
            var updatebbalance = balance.totalBalance + detuctBalance;
            var holdbalance = balance.balanceHoldTotal;
            var update_hold = holdbalance - detuctBalance;
            var updUserBal = await common.updateUserBalanceCancel(
              orderData.userId,
              currency_id,
              updatebbalance,
              "total"
            );

            if (updUserBal) {
              common.updateActiveOrders(function (balance) { });
              common.updateReverseHoldAmount(
                orderData.userId,
                currency_id,
                update_hold
              );
              var message =
                "Your order cancelled successfully, your amount credit your account";
              activeOrderRedis.activeOrdersSet();
              //    common.sendResponseSocekt(true, message, 'cancelled',orderData.userId);
              //     common.userOrderDetails(orderData.userId, orderData.pairName, currency_id, function (userDatas){
              //     var socketToken = common.encrypt(orderData.userId.toString())
              //     socketconnect.emit('userDetails'+socketToken,userDatas);
              callback({
                status: true,
                message:
                  "Your order cancelled successfully, your amount credit your account",
              });
              //});
            }
          }
        })
        .catch((err) => {
          console.error("cancel order error: ", err);
          var message = "Please try again later";
          common.sendResponseSocekt(
            false,
            message,
            "cancelled",
            orderData.userId
          );
        });
    } else if (orderData.site == "Pitiklini" || orderData.site == "") {
      // cancel to the our site
      console.log("Pitiklini CANCEL ORDERS");

      if (orderData.status == "Active" || orderData.status == "partially") {
        let cancelData = await orderPlaceDB.updateOne(
          { _id: orderData._id },
          { $set: { status: "cancelled" } }
        );

        if (cancelData) {
          if (orderData.tradeType == "buy") {
            var detuctBalance = +orderData.amount * +orderData.price;
            var currency = pairData.to_symbol;
            var currency_id = pairData.to_symbol_id;
          } else if (orderData.tradeType == "sell") {
            var detuctBalance = +orderData.amount;
            var currency = pairData.from_symbol;
            var currency_id = pairData.from_symbol_id;
          }

          let balance = await common.getUserBalanceCancel(
            orderData.userId,
            currency
          );

          if (balance) {
            var updatebbalance = balance.totalBalance + detuctBalance;
            var holdbalance = balance.balanceHoldTotal;
            var update_hold = holdbalance - detuctBalance;
            var updUserBal = await common.updateUserBalanceCancel(
              orderData.userId,
              currency_id,
              updatebbalance,
              "total"
            );

            if (updUserBal) {
              common.updateReverseHoldAmount(
                orderData.userId,
                currency_id,
                update_hold
              );
              var message =
                "Your order cancelled successfully, your amount credit your account";
              common.updateActiveOrders(function (balance) { });
              activeOrderRedis.activeOrdersSet();
              // common.sendResponseSocekt(true, message, 'cancelled',orderData.userId);
              // common.userOrderDetails(orderData.userId, orderData.pairName, currency_id, function (userDatas){
              // var socketToken = common.encrypt(orderData.userId.toString())
              // socketconnect.emit('userDetails'+socketToken,userDatas);
              callback({
                status: true,
                message:
                  "Your order cancelled successfully, your amount credit your account",
              });
              //});
            }
          }
        } else {
          //  if(count == 3){
          //     count += 1
          //     orderCancel(pairData, orderData,function(resp){
          //     });
          //  }else{
          //     callback({status:false});
          //  }
          callback({ status: false });
        }
      } else if (orderData.status == "cancelled") {
        callback({ status: false });
      } else {
        console.log("wrong type");
        callback({ status: false });
      }
    } else {
      console.log("Liquidity Errors");
    }
  } catch (error) {
    // if(count == 3){
    //     count += 1
    //     orderCancel(pairData, orderData,function(resp){
    //     });
    //  }else{
    //     callback({status:false});
    //  }
    callback({ status: false });
    console.log("////Something went wrong, Please try again later////");
    // return false;
  }
};

const binance_balanceUpdation = async (
  tradeduserId,
  pairdData,
  tempId,
  tradedBalance,
  order,
  amount,
  OrderPrice,
  fee_per,
  type,
  orderData,
  callback
) => {
  try {
    common.getUserTradeBalance(tradeduserId, pairdData, function (balance) {
      // var balance = await common.getUserTradeBalance(tradeduserId, pairdData.to_symbol);
      var curBalance = balance.totalBalance;
      var curHold = balance.balanceHoldTotal;
      var Balance = curBalance + tradedBalance;
      common.updateUserTradeBalances(
        tradeduserId,
        pairdData,
        Balance,
        curBalance,
        tempId,
        type,
        function (balance) {
          console.log("type===", type);
          if (type == "buy") {
            console.log("call 111===");
            var filledprice = amount * OrderPrice;
            console.log("call 111 filledprice===", filledprice);
            console.log(
              "call 111 orderData.secondCurrency===",
              orderData.secondCurrency
            );
            common.getUserTradeBalance(
              tradeduserId,
              orderData.secondCurrency,
              function (bal) {
                var balHold = +bal.balanceHoldTotal - filledprice;
                console.log("bal.balanceHoldTotal====", bal.balanceHoldTotal);
                console.log("bal.balHold====", balHold);
                common.updateHoldAmount(
                  tradeduserId,
                  orderData.secondCurrency,
                  balHold
                );

                common.userOrderDetails(
                  tradeduserId,
                  orderData.firstSymbol + "_" + orderData.toSymbol,
                  orderData.firstCurrency,
                  function (userDatas) {
                    var socketToken = common.encrypt(tradeduserId.toString());
                    console.log("user socket token",socketToken)
                    console.log("user socket token userDatas",userDatas)
                    socketconnect.emit("userDetails" + socketToken, userDatas);
                  }
                );
                callback(true);
              }
            );
          } else {
            var filledprice = amount;
            console.log("call 222 filledprice===", filledprice);
            console.log(
              "call 222 orderData.firstCurrency===",
              orderData.firstCurrency
            );
            common.getUserTradeBalance(
              tradeduserId,
              orderData.firstCurrency,
              function (bal) {
                var balHold = +bal.balanceHoldTotal - filledprice;
                console.log("bal.balanceHoldTotal====", bal.balanceHoldTotal);
                console.log("bal.balHold====", balHold);
                common.updateHoldAmount(
                  tradeduserId,
                  orderData.firstCurrency,
                  balHold
                );
                common.userOrderDetails(
                  tradeduserId,
                  orderData.firstSymbol + "_" + orderData.toSymbol,
                  orderData.firstCurrency,
                  function (userDatas) {
                    var socketToken = common.encrypt(tradeduserId.toString());
                    console.log("user socket token",socketToken)
                    console.log("user socket token userDatas",userDatas)
                    socketconnect.emit("userDetails" + socketToken, userDatas);
                  }
                );
                callback(true);
              }
            );
          }
        }
      );
    });
  } catch (error) {
    callback(false);
    console.log("ERROR FROM binance balanceUpdation function::", error);
  }
};

// getBianaceorderDetails();

module.exports = orderTypenew;