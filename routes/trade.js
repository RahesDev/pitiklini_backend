var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var mongoose = require("mongoose");
var userWalletDB = require("../schema/userWallet");
var currencyDB = require("../schema/currency");
const { RedisService } = require("../services/redis");
var orderDB = require("../schema/orderPlace");
var orderConfirmDB = require("../schema/confirmOrder");
var moment = require("moment");
var tradePairDB = require("../schema/trade_pair");
const axios = require("axios");
const FavouritePair = require("../schema/favouritepair"); // Import the favouritePair model

const redis = require("redis");
const activeOrderRedis = require("../tradeRedis/activeOrderRedis");
const bannerDB = require("../schema/banner");

router.post("/tickers_market", common.tokenmiddleware, async (req, res) => {
  try {
    var market = req.body.market;
    if (market == "" && market == undefined) {
      return res.json({ status: false, Message: "Please enter the market" });
    }
    var value = await RedisService.hgetall("BINANCE-TICKERPRICE");
    //  console.log("BINANCE-TICKERPRICE value===", value);
    //const value = result.filter(result => result.pair.split("/")[1] == market);
    if (value !== null) {
      var pairs = [];
      if (value.length > 0) {
        for (var i = 0; i < value.length; i++) {
          if (value[i].pair.split("_")[1] == market) {
            var obj = {
              pair:
                value[i].pair.split("_")[0] + "/" + value[i].pair.split("_")[1],
              param_pair:
                value[i].pair.split("_")[0] + "_" + value[i].pair.split("_")[1],
              volume: parseFloat(value[i].volume).toFixed(0),
              topprice: value[i].highprice,
              lowprice: value[i].lowprice,
              lastprice: value[i].lastprice.lastprice,
              change_24h: parseFloat(value[i].change_percent).toFixed(2),
              market: value[i].market,
            };
            pairs.push(obj);
          }
        }
      }
      return res.status(200).json({
        status: true,
        data: pairs,
        Message: "Pair list retrieved successfully",
      });
    } else {
      return res.status(200).json({
        status: false,
        data: {},
        Message: "Something went wrong, Please try again alter",
      });
    }
  } catch (ex) {
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

router.post("/tickers_pair", async (req, res) => {
  try {
    var pair = req.body.pair;
    if (pair == "" && pair == undefined) {
      return res.json({ status: false, Message: "Please enter the pair" });
    }
    var pairname = pair.split("/")[0] + pair.split("/")[1];
    var result = await RedisService.hget(
      "BINANCE-TICKERPRICE",
      pairname.toLowerCase()
    );
    if (result !== null) {
      return res.status(200).json({
        status: true,
        data: result,
        Message: "Pair tickers retrieved successfully",
      });
    } else {
      return res.status(200).json({
        status: false,
        data: {},
        Message: "Something went wrong, Please try again alter",
      });
    }
  } catch (ex) {
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

router.get("/getPairList", async (req, res) => {
  try {
    var pair_resp = [];
    redis_service.setRedisPairs(function (pairlist) {
      if (pairlist != null) {
        for (let i = 0; i < pairlist.length; i++) {
          pair_resp.push({
            show_pair: pairlist[i].from_symbol + "/" + pairlist[i].to_symbol,
            param_pair: pairlist[i].from_symbol + "_" + pairlist[i].to_symbol,
          });
        }
        return res.status(200).json({
          status: true,
          Message: "Pair list retrieved successfully",
          data: pair_resp,
        });
      } else {
        return res.status(400).json({
          status: true,
          Message: "Something went wrong, Please try again later",
          data: {},
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

router.get("/tickers_all", async (req, res) => {
  try {
    var value = await RedisService.hgetall("BINANCE-TICKERPRICE");
    if (value !== null) {
      var pairs = [];
      if (value.length > 0) {
        for (var i = 0; i < value.length; i++) {
          var obj = {
            pair:
              value[i].pair.split("_")[0] + "/" + value[i].pair.split("_")[1],
            price: value[i].lastprice.lastprice,
            price_change: parseFloat(value[i].change_percent).toFixed(2),
            volume: value[i].volume,
            highprice: value[i].highprice,
            lowprice: value[i].lowprice,
            market: value[i].market,
          };
          pairs.push(obj);
        }
      }
      return res.status(200).json({
        status: true,
        data: pairs,
        Message: "Pair list retrieved successfully",
      });
    } else {
      return res.status(200).json({
        status: false,
        data: {},
        Message: "Something went wrong, Please try again alter",
      });
    }
  } catch (ex) {
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

// router.post("/getparUserBalance", common.tokenmiddleware, async (req, res) => {
//   try {
//     //  console.log("req.body===", req.body);
//     var pair = req.body.pair;
//     var splits = pair.split("_");
//     var fromCurr = splits[0];
//     var toCurr = splits[1];
//     var balanceData = await userWalletDB.findOne({
//       userId: req.userId,
//     });
//     var walletData = balanceData.wallets;

//     var indexing = walletData.findIndex((x) => x.currencySymbol == fromCurr);
//     if (indexing != -1) {
//       var obj1 = {
//         totalBalance: parseFloat(walletData[indexing].amount).toFixed(8),
//         balanceHoldTotal: parseFloat(walletData[indexing].holdAmount).toFixed(
//           8
//         ),
//       };
//     }
//     var walletData1 = balanceData.wallets;
//     var indexing = walletData1.findIndex((x) => x.currencySymbol == toCurr);
//     if (indexing != -1) {
//       var obj2 = {
//         totalBalance: parseFloat(walletData1[indexing].amount).toFixed(8),
//         balanceHoldTotal: parseFloat(walletData1[indexing].holdAmount).toFixed(
//           8
//         ),
//       };
//     }
//     var resData = {
//       fromCurrency: obj1,
//       toCurrency: obj2,
//     };
//     return res.status(200).json({ status: true, data: resData });
//   } catch (error) {
//     //  console.log(error, "=-=-=-error=-=-==error=--=");
//     return res.status(500).json({
//       status: false,
//       Message: "Something went wrong, Please try again alter;",
//     });
//   }
// });

router.post("/getparUserBalance", common.tokenmiddleware, async (req, res) => {
  try {
    console.log("req.body===", req.body);
    var pair = req.body.pair;
    var splits = pair.split("_");
    var fromCurr = splits[0];
    var toCurr = splits[1];
    var balanceData = await userWalletDB.findOne({
      userId: req.userId,
    });
    var walletData = balanceData.wallets;
    var obj1;
    var obj2;
    let userId = req.userId;

    var indexing = walletData.findIndex((x) => x.currencySymbol == fromCurr);
    console.log(indexing,"indexing")
    if (indexing != -1) {
      obj1 = {
        totalBalance: parseFloat(walletData[indexing].amount).toFixed(8),
        balanceHoldTotal: parseFloat(walletData[indexing].holdAmount).toFixed(
          8
        ),
      };
    }
    else
    {
      console.log("call wallet here====",fromCurr)
      
      let currRes = await currencyDB.findOne({ currencySymbol: fromCurr }, { currencySymbol: 1, _id: 1, currencyName:1 });
        console.log("call wallet currRes====",currRes)
      let wallet = await userWalletDB.findOne({ userId: userId });
          console.log("call wallet wallet====",wallet)
      if (wallet != null) {
        let newWallet = await userWalletDB.findOneAndUpdate(
                { userId: userId },
                {
                  $push: {
                    wallets: {
                      currencyName: currRes.currencyName,
                      currencySymbol: currRes.currencySymbol,
                      currencyId: currRes._id,
                      amount: 0
                    },
                  },
                },
                { new: true, useFindAndModify: false });
        obj1 = {
          totalBalance: parseFloat(newWallet[0].amount).toFixed(8),
          balanceHoldTotal: parseFloat(newWallet[0].holdAmount).toFixed(
            8
          ),
        };
        }
    }
    var walletData1 = balanceData.wallets;
    var indexing1 = walletData1.findIndex((x) => x.currencySymbol == toCurr);
    console.log("indexing1",indexing1);
    if (indexing1 != -1) {
      obj2 = {
        totalBalance: parseFloat(walletData1[indexing1].amount).toFixed(8),
        balanceHoldTotal: parseFloat(walletData1[indexing1].holdAmount).toFixed(
          8
        ),
      };
    }
    else
    {
      console.log("call wallet here====",toCurr)
      let userId = req.userId;
      let currRes = await currencyDB.findOne({ currencySymbol: toCurr }, { currencySymbol: 1, _id: 1, currencyName:1 });
        console.log("call wallet currRes====",currRes)
      let wallet = await userWalletDB.findOne({ userId: userId });
          console.log("call wallet wallet====",wallet)
      if (wallet != null) {
        let newWallet = await userWalletDB.findOneAndUpdate(
                { userId: userId },
                {
                  $push: {
                    wallets: {
                      currencyName: currRes.currencyName,
                      currencySymbol: currRes.currencySymbol,
                      currencyId: currRes._id,
                      amount: 0
                    },
                  },
                },
                { new: true, useFindAndModify: false });
        obj2 = {
          totalBalance: parseFloat(newWallet[0].amount).toFixed(8),
          balanceHoldTotal: parseFloat(newWallet[0].holdAmount).toFixed(
            8
          ),
        };
        }
    }
    var resData = {
      fromCurrency: obj1,
      toCurrency: obj2,
    };
    console.log("response data balance",resData);
    return res.status(200).json({status: true, data: resData});
  } catch (error) {
    console.log(error, "=-=-=-error=-=-==error=--=");
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

router.post("/getCurrpairData", async (req, res) => {
  //  console.log(req.body, "req.body===========================")
  try {
    if (
      req.body.pair !== "" &&
      req.body.pair != null &&
      req.body.pair != undefined
    ) {
      var getpairdet = await tradePairDB.findOne({ pair: req.body.pair }).exec();
      if (getpairdet) {

        var getpairdet = await tradePairDB.findOne({ pair: req.body.pair }).exec();
        var fromcurrency = await currencyDB.findOne({ currencySymbol: getpairdet.from_symbol }).exec();

        var currencyname = fromcurrency.currencyName;


        return res.status(200).json({ status: true, data: getpairdet, fromCurr: currencyname });
      } else {
        return res.status(200).json({ status: true, data: {} });
      }
    } else {
      return res.status(200).json({
        status: false,
        Message: "Something went wrong, Please try again alter;",
      });
    }
  } catch (error) {
    console.log(error, "=-=-=-error=-=-==error=--=");
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

router.post("/addfavpairs", common.tokenmiddleware, async (req, res) => {
  try {
    const pair = req.body.pair;
    const userId = req.userId;

    if (!pair || !userId) {
      return res.status(400).json({
        status: false,
        message: "Pair or userId is missing!",
      });
    }

    // Check if the trading pair exists in tradePairDB
    const getPairDetails = await tradePairDB.findOne({ pair }).exec();

    if (!getPairDetails) {
      return res.status(404).json({
        status: false,
        message: "Trading pair not found!",
      });
    }

    // Find if the user already has favorite pairs
    const favouritePair = await FavouritePair.findOne({ userId }).exec();

    if (favouritePair) {
      // If the user has a favorite pair, check if the pair is already in the array
      const pairIndex = favouritePair.pair.indexOf(pair);

      if (pairIndex > -1) {
        // If the pair already exists, remove it from the array
        favouritePair.pair.splice(pairIndex, 1);
        await favouritePair.save();
        return res.status(200).json({
          status: true,
          message: `${pair} removed from favorites!`,
        });
      } else {
        // If the pair does not exist, add it to the array
        favouritePair.pair.push(pair);
        await favouritePair.save();
        return res.status(200).json({
          status: true,
          message: `${pair} added to favorites!`,
        });
      }
    } else {
      // If the user has no favorite pairs, create a new entry
      const newFavouritePair = new FavouritePair({
        userId: mongoose.Types.ObjectId(userId),
        pair: [pair], // Add the first pair
        from_symbol_id: getPairDetails.from_symbol_id, // assuming tradePairDB has this
        to_symbol_id: getPairDetails.to_symbol_id, // assuming tradePairDB has this
      });

      await newFavouritePair.save();
      return res.status(201).json({
        status: true,
        message: `${pair} added to favorites!`,
      });
    }
  } catch (error) {
    console.error("Error in addfavpairs API: ", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong, please try again later.",
    });
  }
});

router.get("/getfavpairs", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;


    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "User ID is missing!",
      });
    }

    // Find the user's favorite pairs
    const favouritePair = await FavouritePair.findOne({ userId }).exec();

    if (favouritePair && favouritePair.pair.length > 0) {
      return res.status(200).json({
        status: true,
        data: favouritePair.pair, // Return the array of pairs
        message: "Favorite pairs fetched successfully!",
      });
    } else {
      return res.status(404).json({
        status: false,
        message: "No favorite pairs found for this user!",
      });
    }
  } catch (error) {
    console.error("Error in getfavpairs API: ", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong, please try again later.",
    });
  }
});


router.get("/getmarketData", async (req, res) => {
  console.log(req.body, "req.body===========================");
  try {
    // Fetch the trade pairs from the database
    var getpairdet = await tradePairDB.find({status:"1"}).exec();
    // console.log(getpairdet, "getpairdet");

    // Extract the 'to_symbol' from each pair and remove duplicates using Set
    const uniqueSymbols = [...new Set(getpairdet.map(pair => pair.to_symbol))];
    console.log(uniqueSymbols, "Unique to_symbol");

    // Send the unique symbols back to the client
    return res.status(200).json({
      status: true,
      data: uniqueSymbols,
    });
  } catch (error) {
    console.log(error, "=-=-=-error=-=-==error=--=");
    return res.status(500).json({
      status: false,
      message: "Something went wrong, Please try again later.",
    });
  }
});


router.post(
  "/percent_calculation",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var pair = req.body.pair;
      var percentage = req.body.percentage;
      var type = req.body.orderType;
      var price = req.body.price;
      // console.log("req.body===", req.body);
      if (pair == null) {
        return res.json({ status: false, Message: "Please enter the pair" });
      } else if (percentage == null) {
        return res.json({
          status: false,
          Message: "Please enter the percentage",
        });
      } else if (type == null) {
        return res.json({
          status: false,
          Message: "Please enter the order type",
        });
      } else {
        var pairname = pair.split("_")[0] + pair.split("_")[1];
        var result = await RedisService.hget(
          "BINANCE-TICKERPRICE",
          pairname.toLowerCase()
        );
        var splits = pair.split("_");
        var fromCurr = splits[0];
        var toCurr = splits[1];
        var obj1 = {};
        var obj2 = {};
        var balanceData = await userWalletDB.findOne({
          userId: req.userId,
        });
        var walletData = balanceData.wallets;
        var indexing1 = walletData.findIndex(
          (x) => x.currencySymbol == fromCurr
        );
        if (indexing1 != -1) {
          obj1 = {
            totalBalance: walletData[indexing1].amount,
          };
        }
        var walletData1 = balanceData.wallets;
        var indexing2 = walletData1.findIndex(
          (x) => x.currencySymbol == toCurr
        );
        if (indexing2 != -1) {
          obj2 = {
            totalBalance: walletData1[indexing2].amount,
          };
        }
        // console.log("TICKERPRICE====", result);
        if (result !== null) {
          var marketprice =
            price != null && price != undefined && price != ""
              ? price
              : result.lastprice.lastprice;
          var amount = 0;
          var total = 0;
          var calc_price = 0;
          if (type == "buy") {
            total = (+percentage * +obj2.totalBalance) / 100;
            if (total <= 0) {
              return res.json({
                status: false,
                message: "Quantity canot be less than 0.0000",
              });
            }
            calc_price = marketprice;
            var amt = total / +calc_price;
            amount = amt.toFixed(8);
            total = +total.toFixed(8);
          } else {
            var total = (+percentage * +obj1.totalBalance) / 100;
            if (total <= 0) {
              return res.json({
                status: false,
                message: "Quantity canot be less than 0.0000",
              });
            }
            calc_price = marketprice;
            var tot = total * +calc_price;
            amount = total.toFixed(8);
            total = +tot.toFixed(8);
          }
          var response = {
            price: calc_price,
            amount: amount,
            total: total,
          };
          // console.log("response===", response);
          return res.status(200).json({ status: true, data: response });
        } else {
          return res.status(200).json({ status: false, data: {} });
        }
      }
    } catch (ex) {
      console.log("catch ex====", ex);
      return res.status(500).json({
        status: false,
        Message: "Something went wrong, Please try again alter;",
      });
    }
  }
);

router.get("/market_movers", async (req, res) => {
  try {
    tradePairDB
      .find({ status: 1, liquidity_status: 1 })
      .sort({ pair: 1 })
      .populate("from_symbol_id", "Currency_image")
      .limit(10)
      .exec(async (err, data) => {
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var pairname = data[i].from_symbol + data[i].to_symbol;
            var result = await RedisService.hget(
              "BINANCE-TICKERPRICE",
              pairname.toLowerCase()
            );
            if (result != null) {
              var obj = {
                pair: data[i].from_symbol + "/" + data[i].to_symbol,
                Currency_image: data[i].from_symbol_id.Currency_image,
                price: result.lastprice.lastprice,
                change_24h: result.change_percent,
                volume: result.volume,
              };
            } else {
              var obj = {
                pair: data[i].from_symbol + "/" + data[i].to_symbol,
                Currency_image: data[i].from_symbol_id.Currency_image,
                price: data[i].marketPrice,
                change_24h: data[i].changes_24h,
                volume: data[i].volume_24h,
              };
            }

            resdata.push(obj);
          }
          res.status(200).json({
            status: true,
            data: resdata,
          });
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/getopenOrders", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    var pair = req.body.pair;
    if (pair == null) {
      orderDB
        .find(
          {
            userId: mongoose.mongo.ObjectId(userId.toString()),
            $or: [{ status: "Active" }, { status: "partially" }, { status: "stop" }],
          },
          {
            firstSymbol: 1,
            toSymbol: 1,
            pairName: 1,
            ordertype: 1,
            tradeType: 1,
            amount: 1,
            price: 1,
            total: 1,
            createddate: 1,
            limit_price: 1,
            filledAmount: 1,
          }
        )
        .sort({ _id: -1 })
        .exec(function (err, resp) {
          var active_orders = [];
          if (resp.length > 0) {
            for (var i = 0; i < resp.length; i++) {
              var remaining = +resp[i].amount - +resp[i].filledAmount;
              var filled_percent = (remaining / +resp[i].amount) * 100;
              var total = +resp[i].price * +resp[i].amount;
              var obj = {
                order_id: resp[i]._id,
                createddate: moment(resp[i].createddate).format(
                  "YYYY-MM-DD hh:mm:ss"
                ),
                pair_name: resp[i].firstSymbol + "/" + resp[i].toSymbol,
                order_type: resp[i].ordertype,
                type: resp[i].tradeType,
                price: parseFloat(resp[i].price).toFixed(8),
                amount: parseFloat(resp[i].filledAmount).toFixed(8),
                total: parseFloat(total).toFixed(8),
                filled: parseFloat(filled_percent).toFixed(2),
              };
              active_orders.push(obj);
            }
          }
          var returnJson = {
            status: true,
            result: active_orders,
          };
          res.json(returnJson);
        });
    } else {
      orderDB
        .find(
          {
            userId: mongoose.mongo.ObjectId(userId.toString()),
            $or: [{ status: "Active" }, { status: "partially" }],
            pairName: pair,
          },
          {
            firstSymbol: 1,
            toSymbol: 1,
            pairName: 1,
            ordertype: 1,
            tradeType: 1,
            amount: 1,
            price: 1,
            total: 1,
            createddate: 1,
            limit_price: 1,
            filledAmount: 1,
          }
        )
        .sort({ _id: -1 })
        .exec(function (err, resp) {
          var active_orders = [];
          if (resp.length > 0) {
            for (var i = 0; i < resp.length; i++) {
              var remaining = +resp[i].amount - +resp[i].filledAmount;
              var filled_percent = (remaining / +resp[i].amount) * 100;
              var total = +resp[i].price * +resp[i].amount;
              var obj = {
                order_id: resp[i]._id,
                createddate: moment(resp[i].createddate).format(
                  "YYYY-MM-DD hh:mm:ss"
                ),
                pair_name: resp[i].firstSymbol + "/" + resp[i].toSymbol,
                order_type: resp[i].ordertype,
                type: resp[i].tradeType,
                price: parseFloat(resp[i].price).toFixed(8),
                amount: parseFloat(resp[i].filledAmount).toFixed(8),
                total: parseFloat(total).toFixed(8),
                filled: parseFloat(filled_percent).toFixed(2),
              };
              active_orders.push(obj);
            }
          }
          var returnJson = {
            status: true,
            result: active_orders,
          };
          res.json(returnJson);
        });
    }
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/popular_pairs", async (req, res) => {
  try {
    tradePairDB
      .find({ status: 1, liquidity_status: 1 })
      .sort({ pair: 1 })
      .populate("from_symbol_id", "Currency_image")
      .limit(10)
      .exec(async (err, data) => {
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var obj = {
              pair: data[i].from_symbol + "/" + data[i].to_symbol,
            };
            resdata.push(obj);
          }
          res.status(200).json({
            status: true,
            data: resdata,
          });
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/orderbook", async (req, res) => {
  try {
    var pair = req.body.pair;
    if (pair != null && pair != undefined) {
      var pairslit = pair.split("_");
      var pairname = pairslit[0] + pairslit[1];
      var result = await RedisService.hget(
        "BINANCE-ORDERBOOK",
        pairname.toLowerCase()
      );

      // console.log(result, "result");
      var conversion_price = 0;
      var decimal =
        pair.split("_")[1] == "BTC" ||
          pair.split("_")[0] == "SHIB" ||
          pair.split("_")[0] == "DOGE" ||
          pair.split("_")[0] == "MATIC" ||
          pair.split("_")[1] == "BNB"
          ? 8
          : 2;
      var tickerdata = await RedisService.hget(
        "BINANCE-TICKERPRICE",
        pairname.toLowerCase()
      );
      var ticker_response = {};

      if (result != null) {
        var buy_orders = [];
        var sell_orders = [];
        if (result.bids.length > 0) {
          // console.log(result.bids, "================bids");
          for (var i = 0; i < result.bids.length; i++) {
            var obj = {
              price: result.bids[i][0],
              amount: result.bids[i][1],
              total: result.bids[i][2],
            };
            buy_orders.push(obj);
          }
        }

        if (result.asks.length > 0) {
          // console.log(result.asks, "================asks");

          for (var i = 0; i < result.asks.length; i++) {
            var obj = {
              price: result.asks[i][0],
              amount: result.asks[i][1],
              total: result.asks[i][1],

            };

            sell_orders.push(obj);
          }
        }
        // console.log(tickerdata, "redis_response");

        if (tickerdata !== null) {
          client.hget(" ", "allpair", async function (
            err,
            value
          ) {
            if (!err) {
              let redis_response = await JSON.parse(value);
              // console.log(redis_response, "redis_response")
              if (
                redis_response != null &&
                redis_response != "" &&
                redis_response != undefined
              ) {
                conversion_price = redis_response[pair.split("_")[1]].USDT;
                var lastprice_inr =
                  tickerdata.lastprice.lastprice * conversion_price;
                ticker_response = {
                  lastprice: parseFloat(tickerdata.lastprice.lastprice).toFixed(
                    decimal
                  ),
                  lastprice_inr: parseFloat(lastprice_inr).toFixed(2),
                  change_24h: parseFloat(tickerdata.change_percent).toFixed(2),
                };

                res.status(200).json({
                  status: true,
                  buy_orders: buy_orders,
                  sell_orders: sell_orders,
                  ticker_response: ticker_response,
                });
              }
              else {
                common.currency_conversion(async function (response) {
                  //console.log(("call currency conversion", response);
                  if (response.status) {
                    let redis_response1 = response.message;
                    //console.log((
                    //   "get user balance redis response ====",
                    //   redis_response
                    // );
                    if (
                      redis_response1 != null &&
                      redis_response1 != "" &&
                      redis_response1 != undefined &&
                      Object.keys(redis_response1).length > 0
                    ) {
                      conversion_price = redis_response1[pair.split("_")[1]].USDT;
                      var lastprice_inr =
                        tickerdata.lastprice.lastprice * conversion_price;
                      ticker_response = {
                        lastprice: parseFloat(tickerdata.lastprice.lastprice).toFixed(
                          decimal
                        ),
                        lastprice_inr: parseFloat(lastprice_inr).toFixed(2),
                        change_24h: parseFloat(tickerdata.change_percent).toFixed(2),
                      };

                      res.status(200).json({
                        status: true,
                        buy_orders: buy_orders,
                        sell_orders: sell_orders,
                        ticker_response: ticker_response,
                      });
                    }
                  }
                });
              }
            }
          });
        }
      } else {
        activeOrderRedis.activeOrdersSet();
        res.status(400).json({
          status: false,
          Message: "Something went wrong, Please try again later",
        });
      }
    } else {
      res.status(400).json({
        status: false,
        data: {},
        Message: "Please enter pair",
      });
    }
  } catch (ex) {
    res.status(500).json({ status: false, Message: ex.message });
  }
});

router.post("/tickerprice", async (req, res) => {
  try {
    var pair = req.body.pair;
    if (pair == "" && pair == undefined) {
      return res.json({ status: false, Message: "Please enter the pair" });
    }
    var pairname = pair.split("_")[0] + pair.split("_")[1];
    var conversion_price = 0;
    var decimal =
      pair.split("_")[1] == "BTC" ||
        pair.split("_")[0] == "SHIB" ||
        pair.split("_")[0] == "DOGE" ||
        pair.split("_")[1] == "BNB"
        ? 8
        : 2;
    var result = await RedisService.hget(
      "BINANCE-TICKERPRICE",
      pairname.toLowerCase()
    );
    // console.log("tickerprice result===", result);
    if (result !== null) {
      client.hget("CurrencyConversion", "allpair", async function (err, value) {
        if (!err) {
          let redis_response = await JSON.parse(value);
          // console.log("redis_response result===", redis_response);
          if (
            redis_response != null &&
            redis_response != "" &&
            redis_response != undefined
          ) {
            conversion_price = redis_response[pair.split("_")[1]].USDT;
            var lastprice_inr = result.lastprice.lastprice * conversion_price;
            var response = {
              lastprice: parseFloat(result.lastprice.lastprice).toFixed(
                decimal
              ),
              lastprice_inr: parseFloat(lastprice_inr).toFixed(2),
              change_24h: parseFloat(result.change_percent).toFixed(2),
              high_24h: parseFloat(result.highprice).toFixed(decimal),
              low_24h: parseFloat(result.lowprice).toFixed(decimal),
              pricechange_24h: parseFloat(result.price_change).toFixed(decimal),
              volume: parseFloat(result.volume).toFixed(decimal),
            };
            return res.status(200).json({ status: true, data: response });
          }
        } else {
          return res.status(400).json({
            status: false,
            data: {},
            Message: "Something went wrong, Please try again alter",
          });
        }
      });
    } else {
      return res.status(400).json({
        status: false,
        data: {},
        Message: "Something went wrong, Please try again alter",
      });
    }
  } catch (ex) {
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

router.post("/tradingHistory", async (req, res) => {
  try {
    var pair = req.body.pair;
    if (pair != null && pair != undefined) {
      var pairslit = pair.split("_");
      var pairname = pairslit[0] + pairslit[1];
      var result = await RedisService.hget(
        "TradeHistory",
        pairname.toLowerCase()
      );
      var tradeHistory = [];
      if (result != null) {
        for (var i = 0; i < result.length; i++) {
          var obj = {
            price: result[i].price,
            amount: result[i].amount,
            date: result[i].time,
            type: result[i].tradeType,
          };
          tradeHistory.push(obj);
        }
        res.status(200).json({
          status: true,
          data: tradeHistory,
        });
      } else {
        res.status(400).json({
          status: false,
          data: {},
          Message: "Something went wrong, Please try again later",
        });
      }
    } else {
      res.status(400).json({
        status: false,
        data: {},
        Message: "Please enter pair",
      });
    }
  } catch (ex) {
    res.status(500).json({ status: false, Message: ex.message });
  }
});

const decimalCount = (num) => {
  // Convert to String
  // console.log("call 111=", num);
  const numStr = String(num);
  // console.log("call numStr=", numStr);
  // String Contains Decimal
  if (numStr.includes(".")) {
    console.log("call here=");
    // return numStr.split(".")[1].length;
  }
  // String Does Not Contain Decimal
  return 0;
};

//  var revrate = 1
// client.hget('CurrencyConversion', 'allpair', async function(err, value) {
//     let redis_response = await JSON.parse(value);
//     if(redis_response !=  null)
//     {
//         revrate= redis_response['USDT'].USDT;
//         console.log("binance rev===",revrate);
//     }
// })

router.get("/update_binance", async (req, res) => {
  try {
    console.log("=-=-=-=-=-Function runing");
    tradePairDB
      .find({status: "1", liquidity_status: "1", to_symbol: "INR"})
      .exec(async (err, data) => {
        // console.log(data, "=-=-=-=-=-data");
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var pairname =
              data[i].to_symbol == "INR"
                ? data[i].from_symbol + "USDT"
                : data[i].from_symbol + data[i].to_symbol;
            var resultdata = await axios.get(
              "https://api.binance.com/api/v3/exchangeInfo?symbol=" + pairname
            );
            console.log("pairname===", pairname);
            var symbols = resultdata.data.symbols[0];
            //  console.log("resultdata.data.===", resultdata.data.symbols[0]);
            var filters = symbols.filters;
            var price_filter = filters[0];
            //  console.log("price_filter===", price_filter.tickSize);
            var qty_filter = filters[1];
            //  console.log("qty_filter", qty_filter.stepSize);
            var notional_filter = filters[6];
            console.log("notional_filter",notional_filter.minNotional);
            // return;
            var inr_rate = data[i].to_symbol == "INR" ? 80 : 1;
            var min_price = price_filter.minPrice * inr_rate;
            var max_price = price_filter.maxPrice * inr_rate;
            var price =
              filters[0].tickSize == "0.00000001" ||
                filters[0].tickSize == "0.00000010"
                ? filters[0].tickSize
                : parseFloat(filters[0].tickSize);
            // console.log("filters[0].tickSize===",filters[0].tickSize);
            // console.log("price===",price);
            var qty =
              filters[1].stepSize == "0.00000001" ||
                filters[1].stepSize == "0.00000010"
                ? filters[1].stepSize
                : parseFloat(filters[1].stepSize);
            var liq_price_decimal = decimalCount(price);
            var liq_amount_decimal = decimalCount(qty);
            // console.log("liq_price_decimale===",liq_price_decimal);
            var min_qty = qty_filter.minQty;
            var max_qty = qty_filter.maxQty;
            //  console.log("min_qty===", min_qty);
            //  console.log("max_qty===", max_qty);
            var min_total = notional_filter.minNotional * inr_rate;
            var obj = {
              min_price: parseFloat(min_price).toFixed(liq_price_decimal),
              max_price: parseFloat(max_price).toFixed(liq_price_decimal),
              min_qty: parseFloat(min_qty).toFixed(liq_amount_decimal),
              max_qty: parseFloat(max_qty).toFixed(liq_amount_decimal),
              liq_price_decimal: liq_price_decimal,
              price_decimal: liq_price_decimal,
              liq_amount_decimal: liq_amount_decimal,
              amount_decimal: liq_amount_decimal,
              min_total: parseFloat(min_total).toFixed(liq_price_decimal),
              liquidity_name: pairname
            };
            // console.log("binance update obj===", obj);
            // return;
            console.log("data[i]._id===", data[i]._id);
            tradePairDB
              .updateOne({_id: data[i]._id}, {$set: obj})
              .exec(function (err, pairupdate) {
                //  console.log("binance pairupdate===", pairupdate);
                //  console.log("binance error===", err);
              });
          }
          // res.status(200).json({
          //     status: true,
          //     data: resdata
          // })
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/banner_list", (req, res) => {
  try {
    bannerDB.find().exec((err, datas) => {
      if (!err) {
        const data = [];
        var bannerData = datas;
        for (var i = 0; i < bannerData.length; i++) {
          var obj = {
            image: bannerData[i].image,
            status: bannerData[i].status,
          };
          data.push(obj);
        }
        return res.json({ status: true, data: data });
      } else {
        return res.json({
          status: false,
          Message: "Something went wrong,Please try again later",
        });
      }
    });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

router.post(
  "/tickers_market_list",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var market = req.body.market;
      if (market == "" && market == undefined) {
        return res.json({ status: false, Message: "Please enter the market" });
      }
      var value = await RedisService.hgetall("BINANCE-TICKERPRICE");
      //const value = result.filter(result => result.pair.split("/")[1] == market);
      if (value !== null) {
        var pairs = [];
        if (value.length > 0) {
          for (var i = 0; i < value.length; i++) {
            if (value[i].pair.split("_")[1] == market) {
              var from_currency = await currencyDB.findOne({
                status: "Active",
                currencySymbol: value[i].pair.split("_")[0],
              });
              //  console.log("from_currency===", from_currency);
              var decimal =
                value[i].pair.split("_")[1] == "BTC" ||
                  value[i].pair.split("_")[0] == "SHIB" ||
                  value[i].pair.split("_")[0] == "DOGE" ||
                  value[i].pair.split("_")[0] == "MATIC" ||
                  value[i].pair.split("_")[1] == "BNB"
                  ? 8
                  : 2;
              if (from_currency != null) {
                var obj = {
                  pair:
                    value[i].pair.split("_")[0] +
                    "/" +
                    value[i].pair.split("_")[1],
                  param_pair:
                    value[i].pair.split("_")[0] +
                    "_" +
                    value[i].pair.split("_")[1],
                  price: parseFloat(value[i].lastprice.lastprice).toFixed(
                    decimal
                  ),
                  change_24h:
                    market == "BTC"
                      ? parseFloat(value[i].change_percent).toFixed(8)
                      : parseFloat(value[i].change_percent).toFixed(2),
                  market: value[i].market,
                  currency_image: from_currency.Currency_image,
                  currency_name: from_currency.currencyName,
                };
                pairs.push(obj);
              }
            }
          }
        }
        return res.status(200).json({
          status: true,
          data: pairs,
          Message: "Pair list retrieved successfully",
        });
      } else {
        return res.status(200).json({
          status: false,
          data: {},
          Message: "Something went wrong, Please try again alter",
        });
      }
    } catch (ex) {
      console.log("pair list===", ex);
      return res.status(500).json({
        status: false,
        Message: "Something went wrong, Please try again alter;",
      });
    }
  }
);

router.post("/tradeHistory", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    //var pair   = req.body.pair;
    var filter = {
      $or: [{ buyerUserId: userId }, { sellerUserId: userId }],
      //pair : pair
    };
    var resp = await orderConfirmDB
      .find(filter, {
        created_at: 1,
        pair: 1,
        seller_ordertype: 1,
        type: 1,
        askAmount: 1,
        askPrice: 1,
        total: 1,
      })
      .sort({ created_at: -1 });
    var cancelled_orders = await orderDB
      .find(
        {
          userId: mongoose.mongo.ObjectId(userId.toString()),
          status: "cancelled",
        },
        {
          firstSymbol: 1,
          toSymbol: 1,
          pairName: 1,
          ordertype: 1,
          tradeType: 1,
          amount: 1,
          price: 1,
          total: 1,
          createddate: 1,
          limit_price: 1,
          filledAmount: 1,
        }
      )
      .sort({ _id: -1 });
    //  console.log("order history response===", resp);
    var trade_history = [];
    if (resp.length > 0) {
      for (var i = 0; i < resp.length; i++) {
        var pairsplit = resp[i].pair.split("_");
        var obj = {
          created_at: moment(resp[i].created_at).format("YYYY-MM-DD hh:mm:ss"),
          pair: pairsplit[0] + "/" + pairsplit[1],
          tradeType: resp[i].tradeType,
          type: resp[i].type,
          Amount: parseFloat(resp[i].askAmount).toFixed(4),
          Price: parseFloat(resp[i].askPrice).toFixed(4),
          total: parseFloat(resp[i].total).toFixed(4),
        };
        trade_history.push(obj);
      }
    }

    var cancelledorders = [];
    if (cancelled_orders.length > 0) {
      for (var i = 0; i < cancelled_orders.length; i++) {
        var total = +cancelled_orders[i].price * +cancelled_orders[i].amount;
        var obj = {
          order_id: cancelled_orders[i]._id,
          createddate: moment(cancelled_orders[i].createddate).format(
            "YYYY-MM-DD hh:mm:ss"
          ),
          pair_name:
            cancelled_orders[i].firstSymbol +
            "/" +
            cancelled_orders[i].toSymbol,
          order_type: cancelled_orders[i].ordertype,
          type: cancelled_orders[i].tradeType,
          price: parseFloat(cancelled_orders[i].price).toFixed(8),
          amount: parseFloat(cancelled_orders[i].filledAmount).toFixed(8),
          total: parseFloat(total).toFixed(8),
        };
        cancelledorders.push(obj);
      }
    }
    var returnJson = {
      status: true,
      result: trade_history,
      cancelled_orders: cancelledorders,
    };
    res.json(returnJson);
  } catch (e) {
    console.log("get usertrade history catch===", e);
    res.json({ status: false, Message: e.message });
  }
});

router.post(
  "/tickers_market_pair",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var pair = req.body.pair;
      if (pair == "" && pair == undefined) {
        return res.json({ status: false, Message: "Please enter the pair" });
      }
      var pairname = pair.split("_")[0] + pair.split("_")[1];
      var symbolsplit = pair.split("_");
      var decimal =
        symbolsplit[1] == "BTC" ||
          symbolsplit[0] == "SHIB" ||
          symbolsplit[0] == "DOGE" ||
          symbolsplit[1] == "BNB"
          ? 8
          : 2;
      var result = await RedisService.hget(
        "BINANCE-TICKERPRICE",
        pairname.toLowerCase()
      );
      if (result !== null) {
        var resp = {
          pair: pair.split("_")[0] + "/" + pair.split("_")[1],
          price: parseFloat(result.lastprice.lastprice).toFixed(decimal),
          change_24h: parseFloat(result.change_percent).toFixed(2),
          volume: parseFloat(result.volume).toFixed(2),
          highprice: parseFloat(result.highprice).toFixed(decimal),
          lowprice: parseFloat(result.lowprice).toFixed(decimal),
        };
        return res.status(200).json({
          status: true,
          data: resp,
          Message: "Pair data retrieved successfully",
        });
      } else {
        return res.status(200).json({
          status: false,
          data: {},
          Message: "Something went wrong, Please try again alter",
        });
      }
    } catch (ex) {
      console.log("pair list===", ex);
      return res.status(500).json({
        status: false,
        Message: "Something went wrong, Please try again alter;",
      });
    }
  }
);

router.get("/tickers", async (req, res) => {
  try {
    var pair = req.query.pair;
    //  console.log("req.query==", req.query);
    if (pair == "" && pair == undefined) {
      return res
        .status(400)
        .json({ status: "error", Message: "Please enter the pair" });
    }
    var trade_pair = await tradePairDB.findOne({ pair: pair });
    if (trade_pair != null) {
      var pairname = pair.split("_")[0] + pair.split("_")[1];
      var result = await RedisService.hget(
        "BINANCE-TICKERPRICE",
        pairname.toLowerCase()
      );
      if (result !== null) {
        var obj = {
          price: result.lastprice.lastprice,
        };
        return res.status(200).json({ status: "success", response: obj });
      } else {
        var response = await RedisService.hget(
          "GetTickerPrice",
          pairname.toLowerCase()
        );
        if (response != null) {
          var obj = {
            price: response.lastprice.lastprice,
          };
          return res.status(200).json({ status: "success", response: obj });
        } else {
          return res.status(200).json({
            status: "error",
            data: {},
            Message: "Something went wrong, Please try again alter",
          });
        }
      }
    } else {
      return res.json({ status: "error", Message: "Invalid pair" });
    }
  } catch (ex) {
    return res.status(500).json({
      status: "error",
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

router.get("/update_currency", async (req, res) => {
  try {
    currencyDB
      .find({ currencyType: "2", rptc20token: "1" })
      .exec(async (err, data) => {
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var contract = data[i].contractAddress;
            var decimal = data[i].coinDecimal;
            var obj = {
              contractAddress_rptc20: contract,
              coinDecimal_rptc20: decimal,
            };
            //  console.log("currency update obj===", obj);
            //  console.log("data[i]._id===", data[i]._id);
            currencyDB
              .updateOne({ _id: data[i]._id }, { $set: obj })
              .exec(function (err, pairupdate) {
                //  console.log("currency update===", pairupdate);
                //  console.log("currency error===", err);
              });
          }
          // res.status(200).json({
          //     status: true,
          //     data: resdata
          // })
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/update_currency_bep20", async (req, res) => {
  try {
    currencyDB
      .find({ currencyType: "2", bep20token: "1" })
      .exec(async (err, data) => {
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var contract = data[i].contractAddress;
            var decimal = data[i].coinDecimal;
            var obj = {
              contractAddress_bep20: contract,
              coinDecimal_bep20: decimal,
            };
            //  console.log("currency update obj===", obj);
            //  console.log("data[i]._id===", data[i]._id);
            currencyDB
              .updateOne({ _id: data[i]._id }, { $set: obj })
              .exec(function (err, pairupdate) {
                //  console.log("currency update===", pairupdate);
                //  console.log("currency error===", err);
              });
          }
          // res.status(200).json({
          //     status: true,
          //     data: resdata
          // })
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/update_currency_trc20", async (req, res) => {
  try {
    currencyDB
      .find({ currencyType: "2", trc20token: "1" })
      .exec(async (err, data) => {
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var contract = data[i].contractAddress;
            var decimal = data[i].coinDecimal;
            var obj = {
              contractAddress_trc20: contract,
              coinDecimal_trc20: decimal,
            };
            //  console.log("currency update obj===", obj);
            //  console.log("data[i]._id===", data[i]._id);
            currencyDB
              .updateOne({ _id: data[i]._id }, { $set: obj })
              .exec(function (err, pairupdate) {
                //  console.log("currency update===", pairupdate);
                //  console.log("currency error===", err);
              });
          }
          // res.status(200).json({
          //     status: true,
          //     data: resdata
          // })
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/update_currency_rptc20", async (req, res) => {
  try {
    currencyDB
      .find({ currencyType: "2", rptc20token: "1" })
      .exec(async (err, data) => {
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var contract = data[i].contractAddress;
            var decimal = data[i].coinDecimal;
            var obj = {
              contractAddress_rptc20: contract,
              coinDecimal_rptc20: decimal,
            };
            //  console.log("currency update obj===", obj);
            //  console.log("data[i]._id===", data[i]._id);
            currencyDB
              .updateOne({ _id: data[i]._id }, { $set: obj })
              .exec(function (err, pairupdate) {
                //  console.log("currency update===", pairupdate);
                //  console.log("currency error===", err);
              });
          }
          // res.status(200).json({
          //     status: true,
          //     data: resdata
          // })
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

module.exports = router;
