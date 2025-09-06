const WebSocket = require('ws');
const redis = require("redis");
client = redis.createClient();

const axios = require('axios');
const  {MainClient}  = require('binance');

const crypto = require('crypto');
const stopExchange = require('../cryptoExchange/stopOrderRedis');
const redisHelper  = require('../services/redis')
const qs = require('qs');
const getallbalance_url = '/sapi/v1/capital/config/getall';
const tradePair = require ('../schema/trade_pair');
var request = require("request");
const baseurl = process.env.BINANCE_API
var each = require('sync-each');
var tickerArr = [];
const orderPlace     = require('../schema/orderPlace');
const mongoose = require('mongoose');


const sitesettings = require('../schema/sitesettings');
const currencyDB = require ('../schema/currency');
const tradeRedis = require('../tradeRedis/activeOrderRedis');
var orderPlaceDB          = require('../schema/orderPlace');
const common = require('../helper/common');
const confirmOrderDB = require('../schema/confirmOrder');
const profitDb = require('../schema/profit');
const ws_url = process.env.BINANCE_WS;
const orderTypenew = require('../cryptoExchange/orderTypenew');

var key = common.decryptionLevel(process.env.BINANCE_API_KEY);
var secret = common.decryptionLevel(process.env.BINANCE_SECRET_KEY);
var currrate1 = '';

const BinanceExchangeWS = {

    ListenKey:async()=>{
        try {
          const requestConfig = {
            method: 'POST',
            url: baseurl + '/api/v3/userDataStream',
            headers: {
                'X-MBX-APIKEY': key
            },
          };
          let response = await axios(requestConfig);
          //console.log("listen key response====",response);
          if(response.data)
          {
            return { status: 200, data: response.data }
          }
        } catch (error) {
            //console.log("listen key catch===",error);
            return { status: 500, data: {} }
        }
      
      },
      pingListenKey: async (key) => {
        const dataQueryString = qs.stringify({ listenKey: key });

        const requestConfig = {
            method: 'PUT',
            url: baseurl + '/api/v3/userDataStream' + '?' + dataQueryString,
            headers: {
                'X-MBX-APIKEY': key
            },
        };

        try {
            const response = await axios(requestConfig);
            return { status: 200, data: response.data }
        } catch (err) {
            return { status: 500, data: err }
        }
    },
    RunPingKey: async (key) => {
        try {

            this.intervalId = setInterval(async () => {
                let listenKey = await BinanceExchangeWS.pingListenKey(key);
                if (listenKey && listenKey.status == 200) {

                } else {

                }
            }, 60000 * 30);
        } catch (error) {
            console.log("errorrunping", error)
        }
    },
    orderPayload: async (key) => {
        try {
            const ws = new WebSocket(ws_url+ key);

            ws.on('message', async (data) => {
                console.log("tradeinfo data=====",data);
                const tradeInfo = JSON.parse(data);
                console.log("tradeinfo websocket=====",tradeInfo);
                if (tradeInfo && tradeInfo.e === 'executionReport') {

                    if (tradeInfo.X == 'FILLED') {
                        //var orderPlaceUpd = await  orderPlaceDB.findOneAndUpdate({'orderId' :tradeInfo.i},{$set : {status : tradeInfo.X.toLowerCase()}},{ new: true });
                        orderPlaceDB.findOneAndUpdate({'orderId' :tradeInfo.i},{$set : {status : tradeInfo.X.toLowerCase()}}).exec(function(err,orderPlaceUpd){
                            if(!err)
                            {
                                console.log("orderPlaceUpd===",orderPlaceUpd);
                                tradeRedis.activeOrdersSet();
                                var currencyId = orderPlaceUpd.tradeType == 'buy' ? orderPlaceUpd.firstCurrency : orderPlaceUpd.secondCurrency;
                                common.userOrderDetails(orderPlaceUpd.userId, orderPlaceUpd.pairName, currencyId, function (userDatas){
                                var socketToken = common.encrypt(orderPlaceUpd.userId.toString());
                                socketconnect.emit('userDetails'+socketToken,userDatas);
        
                                });
                                BinanceExchangeWS.updateLiquidity(orderPlaceUpd,tradeInfo);
                            }
                            
                        })
                        //console.log("orderPlaceUpd===",orderPlaceUpd);
                        // if(orderPlaceUpd) 
                        // {
                            
                        //}
                        
                    }

                    // if (tradeInfo.X == 'NEW') {
                    //     orderPlaceDB.findOne({'orderId' :tradeInfo.i}).exec(function(err,orderDetails){
                    //     orderPlaceDB.findOneAndUpdate({'orderId' :tradeInfo.i},{$set : {status : "Active", ordertype:"Limit",price:orderDetails.stoporderprice}}).exec(function(err,orderPlaceUpd){
                    //         if(!err)
                    //         {
                    //             console.log("orderPlaceUpd===",orderPlaceUpd);
                    //             tradeRedis.activeOrdersSet();
                    //             orderTypenew.getBinanceOrder();
                    //         }
                            
                    //     })
                    // });
                    //     //console.log("orderPlaceUpd===",orderPlaceUpd);
                    //     // if(orderPlaceUpd) 
                    //     // {
                            
                    //     //}
                        
                    // }

                }
            });

            ws.on('ping', (e) => {
                ws.pong();
            });

            ws.on('error', async (error) => {
                console.log("==error==", error)
            })

            ws.on('disconnect', async function() {
                console.log(" order payload disconnected")
            });

            ws.on('close', async function() {
                console.log(" order payload close")
                clearInterval(this.intervalId)
                let res = await BinanceExchangeWS.ListenKey();
                if (res.status == 200) {
                    await BinanceExchangeWS.orderPayload(res.data.listenKey);
                    await BinanceExchangeWS.RunPingKey(res.data.listenKey);
                }

            });

        } catch (error) {
            console.log("========error===========", error)
        }
    },
    userService: async () => {
        let res = await BinanceExchangeWS.ListenKey();
        //console.log("listen key===",res);
        if (res.status == 200) {
            await BinanceExchangeWS.orderPayload(res.data.listenKey);
            await BinanceExchangeWS.RunPingKey(res.data.listenKey);
        }
    },
    updateLiquidity: async (limitOrderData, liquid) => {
        console.log("updateLiquidity===",liquid);
        try {
            var OrderPrice = limitOrderData.price;
            var Tot = limitOrderData.amount * OrderPrice;
    
            if(limitOrderData.tradeType == 'buy'){
                var BuyOrder = limitOrderData;
                var SellOrder = liquid;
    
                var buyorderid    = BuyOrder._id;
                var buyuserid     = BuyOrder.userId;
                var buyprice      = BuyOrder.price;
                var sellorderid   = SellOrder.i;
                var selluserid    = SellOrder.userId;
                var sellprice     = BuyOrder.price;
                var buyFees  = BuyOrder.makerFee;
                var sellFees =  BuyOrder.makerFee;
                var ordertype = 'Buy';
                var order_type = BuyOrder.ordertype;
            }
            else{
                var SellOrder = limitOrderData;
                var BuyOrder = liquid;
    
                var buyorderid    = BuyOrder.i;
                var buyuserid     = BuyOrder.userId;
                var buyprice      = SellOrder.price;
                var sellorderid   = SellOrder._id;
                var selluserid    = SellOrder.userId;
                var sellprice     = SellOrder.price;
                var buyFees  = SellOrder.makerFee;
                var sellFees =  SellOrder.makerFee;
                var ordertype = 'Sell';
                var order_type = SellOrder.ordertype;
            }
    
            var filledprice = limitOrderData.amount * OrderPrice;
            var buynewfee = (limitOrderData.amount * buyFees) / 100;
            var sellnewfee = (filledprice * sellFees) / 100;
            confirmOrderDB.find({sellorderId:mongoose.mongo.ObjectId(sellorderid),buyorderId:mongoose.mongo.ObjectId(buyorderid)}).exec(async function(getErr,getorderRes){
                console.log("getorderRes.length===",getorderRes.length);
            if(getorderRes.length==0)
            {
                let insertTempDbJson = {
                    "sellorderId"      : mongoose.mongo.ObjectId(sellorderid),
                    "sellerUserId"     : mongoose.mongo.ObjectId(selluserid),
                    "seller_ordertype" : order_type,
                    "askAmount"        : limitOrderData.amount,
                    "askPrice"         : OrderPrice,
                    "firstCurrency"    : limitOrderData.firstSymbol,
                    "secondCurrency"   : limitOrderData.toSymbol,
                    "buyorderId"       : mongoose.mongo.ObjectId(buyorderid),
                    "buyerUserId"      : mongoose.mongo.ObjectId(buyuserid),
                    "buyer_ordertype"  : order_type,
                    "total"            : Tot,
                    "buy_fee"          : buynewfee,
                    "sell_fee"         : sellnewfee,
                    "pair"             : limitOrderData.firstSymbol+'_'+limitOrderData.toSymbol,
                    "type"			   : ordertype.toLowerCase()
                }
                console.log("insertTempDbJson===",insertTempDbJson);
                var tempRes = await confirmOrderDB.create(insertTempDbJson);
                // confirmOrderDB.create(insertTempDbJson,function(tempErr,tempRes){
                    if(tempRes){
                        var confrmId = tempRes._id;
        
                        //sell order profit
                        let sellOrderProfitToAdmin ={
                            type        : 'Trade Sell',
                            user_id      : mongoose.mongo.ObjectId(selluserid),
                            currencyid  : limitOrderData.secondCurrency,
                            fees        : sellnewfee.toFixed(2),
                            fullfees    : sellnewfee.toFixed(2),
                            orderid     : mongoose.mongo.ObjectId(sellorderid)
                        }
                        //buy order profit
                        let buyOrderProfitToAdmin ={
                            type        : 'Trade Buy',
                            user_id      : mongoose.mongo.ObjectId(buyuserid),
                            currencyid  : limitOrderData.firstCurrency,
                            fees        : buynewfee.toFixed(8),
                            fullfees    : buynewfee.toFixed(8),
                            orderid     : mongoose.mongo.ObjectId(buyorderid)
                        }
        
                            profitDb.create(buyOrderProfitToAdmin,function(profitErr,profitRes){
                            });
                            profitDb.create(sellOrderProfitToAdmin,function(profitErr,profitRes){
                            });
        
                        if(limitOrderData.tradeType == 'buy')
                        {
                            var tradedBalance = limitOrderData.amount - +buynewfee.toFixed(8);
                            var tradeduserId  = buyuserid;
        
                            BinanceExchangeWS.balanceUpdation(buyuserid, limitOrderData.firstCurrency, confrmId, tradedBalance, BuyOrder, limitOrderData.amount, OrderPrice, buyFees, 'buy',limitOrderData,async function(responseData) {
                                
                            });
                            common.userOrderDetails(tradeduserId, limitOrderData.firstSymbol+'_'+limitOrderData.toSymbol, limitOrderData.firstCurrency, function (userDatas){
                                var socketToken = common.encrypt(tradeduserId.toString());
                                socketconnect.emit('userDetails'+socketToken,userDatas);
                           });
                        }
                        else
                        {
                            var tradedBalance = filledprice - +sellnewfee.toFixed(8);
                            var tradeduserId  = selluserid;
        
                            BinanceExchangeWS.balanceUpdation(selluserid, limitOrderData.secondCurrency, confrmId,tradedBalance, SellOrder, limitOrderData.amount, OrderPrice, sellFees, 'sell',limitOrderData, function(responseData) {
                                
                            });
        
                            common.userOrderDetails(tradeduserId, limitOrderData.firstSymbol+'_'+limitOrderData.toSymbol, limitOrderData.secondCurrency, function (userDatas){
                                var socketToken = common.encrypt(tradeduserId.toString());
                                socketconnect.emit('userDetails'+socketToken,userDatas);
                           });
        
                        }         
        
                }
    
            }
        })
            
        } catch (error) {
            console.log('ERROR FROM callLimitOrder',error)
        }
    },
    balanceUpdation : async ( tradeduserId, pairdData, tempId, tradedBalance, order, amount, OrderPrice, fee_per, type, orderData, callback) =>{
        try {
            common.getUserBalance(tradeduserId, pairdData, function (balance) {
            // var balance = await common.getUserBalance(tradeduserId, pairdData.to_symbol);
            var curBalance = balance.totalBalance;
            var curHold = balance.balanceHoldTotal;
            var Balance = curBalance + tradedBalance;
            common.updateUserBalances(tradeduserId, pairdData, Balance, curBalance, tempId, type , function (balance) {
                console.log("type===",type);
                if(type=="buy")
                {
                    console.log("call 111===");
                    var filledprice = amount * OrderPrice;
                    console.log("call 111 filledprice===",filledprice);
                    console.log("call 111 orderData.secondCurrency===",orderData.secondCurrency);
                    common.getUserBalance(tradeduserId, orderData.secondCurrency, function (bal) {
                        var balHold = +bal.balanceHoldTotal - filledprice;
                        console.log("bal.balanceHoldTotal====",bal.balanceHoldTotal)
                        console.log("bal.balHold====",balHold)
                    common.updateHoldAmount(tradeduserId,orderData.secondCurrency, balHold);
                    callback(true);
                    });
                }
                else
                {
                    var filledprice = amount;
                    console.log("call 222 filledprice===",filledprice);
                    console.log("call 222 orderData.firstCurrency===",orderData.firstCurrency);
                    common.getUserBalance(tradeduserId, orderData.firstCurrency, function (bal) {
                    var balHold = +bal.balanceHoldTotal - filledprice;
                    console.log("bal.balanceHoldTotal====",bal.balanceHoldTotal)
                        console.log("bal.balHold====",balHold)
                    common.updateHoldAmount(tradeduserId,orderData.firstCurrency, balHold);
                    callback(true);
                    });
                }
                
            }); 
        }); 
        } catch (error) {
                callback(false);
                console.log('ERROR FROM balanceUpdation function::', error)
        }
    
    }

}

module.exports = BinanceExchangeWS;