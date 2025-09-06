var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var redisHelper = require("../redis-helper/redisHelper");
var tradePairDB = require("../schema/trade_pair");
var orderPlaceDB = require("../schema/orderPlace");
var tradePairDB = require("../schema/trade_pair");
const activeOrderRedis = require("../tradeRedis/activeOrderRedis");

const key = common.decryptionLevel(process.env.BINANCE_API_KEY);
const secret = common.decryptionLevel(process.env.BINANCE_SECRET_KEY);
const axios = require("axios");
const {MainClient} = require("binance");
const binanceClient = new MainClient({
  api_key: key,
  api_secret: secret,
});
const crypto = require("crypto");
const baseurl = process.env.BINANCE_API;
const request = require("request");

const latoken_key = common.decryptionLevel(process.env.LATOKEN_API_KEY);
const latoken_secret = common.decryptionLevel(process.env.LATOKEN_SECRET_KEY);
const latoken_url = process.env.LATOKEN_API;

router.post("/cancelOrder", common.tokenmiddleware, async (req, res) => {
  try {
    console.log("cancel order data====", req.body);
    let orderData = await orderPlaceDB.findOne({_id: req.body._id});

    if (orderData && orderData.status != "cancelled") {
      let pairData = await tradePairDB.findOne({pair: orderData.pairName});
      if (pairData) {
        var result = await orderCancel(pairData, orderData);
        console.log(
          result,
          "=-==-=-=-=result-=-=-=-=-=-result-=-=-=-=-=-=result-=-=-=-=--=-==-result-=-=-"
        );
        res.status(200).json({status: true});
      } else {
        return res
          .status(400)
          .json({status: false, Message: "Invalid Pair Details"});
      }
    } else if (orderData == null) {
      return res.status(400).json({status: false, Message: "Invalid Order ID"});
    } else {
      return res
        .status(400)
        .json({status: false, Message: "Your Order already cancelled"});
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

const orderCancel = async (pairData, orderData) => {
  var count = 0;
  console.log(orderData, "===---==--=--");
  try {
    if (orderData.site == "binance") {
      console.log("BINANCE CANCEL ORDERS");
      var timeStamp = new Date().getTime();
      var liquid_name =
        orderData.toSymbol == "INR"
          ? orderData.firstSymbol + "USDT"
          : orderData.liquidity_name;
      binanceCancelOrder(
        {orderId: orderData.orderId, symbol: liquid_name, timestamp: timeStamp},
        async function (result) {
          console.log("binance cancel order===", result);
          if (result.status) {
            let cancelData = await orderPlaceDB.updateOne(
              {_id: orderData._id},
              {$set: {status: "cancelled"}}
            );
            if (orderData.tradeType == "buy") {
              var orderPrice =
                orderData.ordertype == "Stop"
                  ? +orderData.stoporderprice
                  : +orderData.price;
              var detuctBalance = +orderData.amount * orderPrice;
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
              var updUserBal = await common.updateUserBalanceCancel(
                orderData.userId,
                currency_id,
                updatebbalance,
                "total"
              );
              var holdbalance = balance.balanceHoldTotal;
              var update_hold = holdbalance - detuctBalance;
              if (updUserBal) {
                common.updateReverseHoldAmount(
                  orderData.userId,
                  currency_id,
                  update_hold
                );
                common.updateActiveOrders(function (balance) {});
                var message =
                  "Your order cancelled successfully, your amount credit your account";
                activeOrderRedis.activeOrdersSet();
                common.sendResponseSocekt(
                  true,
                  message,
                  "cancelled",
                  orderData.userId
                );
                common.userOrderDetails(
                  orderData.userId,
                  orderData.pairName,
                  currency_id,
                  function (userDatas) {
                    var socketToken = common.encrypt(
                      orderData.userId.toString()
                    );
                    socketconnect.emit("userDetails" + socketToken, userDatas);
                    return {
                      status: true,
                      message:
                        "Your order cancelled successfully, your amount credit your account",
                    };
                  }
                );
              }
            }
          }
        }
      );
    }
    else if (orderData.site == "Pitiklini" || orderData.site == "") {
      // cancel to the our site
      console.log("Pitiklini CANCEL ORDERS");

      if (
        orderData.status == "Active" ||
        orderData.status == "partially" ||
        orderData.status == "stop"
      ) {
        let cancelData = await orderPlaceDB.updateOne(
          {_id: orderData._id},
          {$set: {status: "cancelled"}}
        );

        if (cancelData) {
          if (orderData.tradeType == "buy") {
            var orderPrice =
              orderData.ordertype == "Stop"
                ? +orderData.stoporderprice
                : +orderData.price;
            var detuctBalance = +orderData.filledAmount * orderPrice;
            var currency = pairData.to_symbol;
            var currency_id = pairData.to_symbol_id;
          } else if (orderData.tradeType == "sell") {
            var detuctBalance = +orderData.filledAmount;
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
            update_hold = update_hold < 0 ? 0 : update_hold;

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
              common.updateActiveOrders(function (balance) {});
              activeOrderRedis.activeOrdersSet();
              common.sendResponseSocekt(
                true,
                message,
                "cancelled",
                orderData.userId
              );
              common.userOrderDetails(
                orderData.userId,
                orderData.pairName,
                currency_id,
                function (userDatas) {
                  var socketToken = common.encrypt(orderData.userId.toString());
                  socketconnect.emit("userDetails" + socketToken, userDatas);
                  return {
                    status: true,
                    message:
                      "Your order cancelled successfully, your amount credit your account",
                  };
                }
              );
            }
          }
        } else {
          if (count == 3) {
            count += 1;
            orderCancel(pairData, orderData);
          } else {
            return {status: false};
          }
        }
      } else if (orderData.status == "cancelled") {
        return {status: false};
      } else {
        console.log("wrong type");
        return {status: false};
      }
    } else {
      console.log("Liquidity Errors");
    }
  } catch (error) {
    if (count == 3) {
      count += 1;
      orderCancel(pairData, orderData);
    } else {
      return {status: false};
    }
    console.log("////Something went wrong, Please try again later////");
    // return false;
  }
};

const binanceCancelOrder = async (object, callback) => {
  try {
    var symbol = object.symbol;
    var orderId = object.orderId;
    var timeStamp = object.timestamp;

    var body =
      "symbol=" + symbol + "&orderId=" + orderId + "&timestamp=" + timeStamp;

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
      method: "DELETE",
      url: baseurl + "/api/v3/order" + "?" + "&signature=" + signature,
      headers: headers,
      body: body,
    };
    request(options, function (error, response, body) {
      //console.log("binance order cancel response ====",body);
      console.log("binance order cancel====", body);
      console.log("binance order response====", response.statusCode);
      if (response.statusCode == 200) {
        var body = JSON.parse(body);
        console.log("binance order response 111====", body);
        let output = {
          status: true,
          exchange: "BINANCE",
          id: body.orderId,
          symbol: object.symbol,
        };
        console.log("binance order response output====", output);
        callback(output);
      } else {
        let output = {
          status: false,
          exchange: "BINANCE",
        };
        callback(output);
      }
    });
  } catch (error) {
    console.log("binance cancel catch error ====", error);
    let output = {
      status: false,
      exchange: "BINANCE",
    };
    callback(output);
  }
};

module.exports = router;
