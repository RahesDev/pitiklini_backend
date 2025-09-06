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
const baseurl = 'https://api.binance.com'
var each = require('sync-each');
var tickerArr = [];
const orderPlace     = require('../schema/orderPlace');


const sitesettings = require('../schema/sitesettings');
const currencyDB = require ('../schema/currency');
const tradeRedis = require('../tradeRedis/activeOrderRedis');
var orderDB          = require('../schema/orderPlace');
var moment = require('moment'); // require
var orderConfirmDB   = require('../schema/confirmOrder');
var common = require('../helper/common');

var key = "";
var secret = "";
var currrate1 = '';
const ws_url = process.env.BINANCE_WS;

const { RedisService } = require("../services/redis");
// const latoken_url = process.env.LATOKEN_WS;
// const Stomp = require('@stomp/stompjs').Stomp;
// var latoken_ws = Stomp.client(latoken_url);
// Object.assign(global, { WebSocket });
// latoken_ws.connect({}, function(response){});

apiget = () => {
    sitesettings.findOne({},{binance_apikey:1,binance_secretkey:1}).exec((err,data) => {
	if(!err && data){
		key = data.binance_apikey;
    secret = data.binance_secretkey
	}
});
}
apiget();
const heartbeat = (ws) => {
  ws.isAlive = true
  //console.log('heart beat=-=-')
}

const BinanceExchangeWS = {
  currentOrderBook: async (symbol) => {
    BinanceExchangeWS.currencyConversion('obh')

     tradePair.find({status:"1"}).exec(function(err,tradepair){
       if(tradepair){
        for (let index = 0; index < tradepair.length; index++) {
          var element = tradepair[index];
         //console.log("call current orderbook===");
          BinanceExchangeWS.setTradepairRedis(element);
          BinanceExchangeWS.orderpicker(element);
          BinanceExchangeWS.tickerPrice(element);
          // BinanceExchangeWS.tradingViewChart(element.pair);
          BinanceExchangeWS.tradeHistory(element);
          // BinanceExchangeWS.myTrades(element.pair)
        }
      }
    })
  },
  orderpicker:async(object)=>{
    try {

      var changelower = ''
      var currlower = ''
      if (object.to_symbol == 'INR') {
        var concatcur = object.from_symbol + object.to_symbol;
        currlower = concatcur.toLowerCase()
        var replace_string = object.from_symbol + 'USDT'
        changelower = replace_string.toLowerCase();
        changelower = (changelower=="usdtusdt")?"busdusdt":changelower;
      } else {
        var concatcur = object.from_symbol + object.to_symbol;
        changelower = concatcur.toLowerCase();
      }
      if (object.liquidity_status == "0") {
       setInterval(async () => {
       // setTimeout(async () => {
            var myasks = [];
                  var mybids = [];
                  var redata = {};
        client.hget('tradepair',object.pair,async function(err,tradepairlist){
          if(!err && tradepairlist!==null){
            let redistradepair = await JSON.parse(tradepairlist)
            var activeOrderDatas = await redisHelper.RedisService.get('site_activeOrders');
          //console.log("activeOrderDatas====",activeOrderDatas);
            if (activeOrderDatas !== null) {
              for (let index = 0; index < activeOrderDatas.length; index++) {
                if (activeOrderDatas[index].pairName == object.pair && activeOrderDatas[index].pairName) {
                 // console.log("activeOrderDatas====",activeOrderDatas);
                  if (activeOrderDatas[index].tradeType == 'buy') {
                    if(activeOrderDatas[index].price != null)
                    {
                      mybids.push([activeOrderDatas[index].price , activeOrderDatas[index].filledAmount,
                        parseFloat(activeOrderDatas[index].price * activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
                    }
                    
                  }
                  if (activeOrderDatas[index].tradeType == 'sell') {
                    if(activeOrderDatas[index].price != null)
                    {
                      myasks.push([activeOrderDatas[index].price , activeOrderDatas[index].filledAmount,
                        parseFloat(activeOrderDatas[index].price * activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
                    }
                    
                  }
                }
              }

              var bids = []
              var buy_groups = mybids.reduce(function(obj, item) {
                  if(Object.keys(item).length !== 0)
                  {
                      obj[item[0]] = obj[item[0]] || [];
                      obj[item[0]] = +obj[item[0]] + +item[1];
                  }
                  return obj;
              }, {});
              var Buy_Array = Object.keys(buy_groups).map(function(key) {
                var total = +key * +buy_groups[key]
                return {
                  0:parseFloat(key),
                  1:parseFloat(buy_groups[key]),
                  2: total
              };
              });
              for (let index = 0; index < Buy_Array.length; index++) {
                bids.push([parseFloat(Buy_Array[index]['0']).toFixed(redistradepair.price_decimal), parseFloat(Buy_Array[index]['1']).toFixed(redistradepair.amount_decimal),
                parseFloat(Buy_Array[index]['0'] * Buy_Array[index]['1']).toFixed(redistradepair.price_decimal)])
              }
              var asks = []
              var sell_groups = myasks.reduce(function(obj, item) {
                  if(Object.keys(item).length !== 0)
                  {
                      obj[item[0]] = obj[item[0]] || [];
                      obj[item[0]] = +obj[item[0]] + +item[1];
                  }
                  return obj;
              }, {});
              var Sell_Array = Object.keys(sell_groups).map(function(key) {
                var total = +key * +sell_groups[key]
                return {
                  0:parseFloat(key),
                  1:parseFloat(sell_groups[key]),
                  2: total
              };
              });
              for (let index = 0; index < Sell_Array.length; index++) {
                asks.push([parseFloat(Sell_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Sell_Array[index]['1']).toFixed(redistradepair.amount_decimal),
                parseFloat(Sell_Array[index]['0'] * Sell_Array[index]['1']).toFixed(redistradepair.price_decimal)])
              }
              //  redata = {
              //   asks: myasks, bids: mybids, symbol: object.pair
              // }
              redata = {
                asks: asks, bids: bids, symbol: object.pair
              }
              let exchange = 'BINANCE-ORDERBOOK'
              await client.hset(exchange,  object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
            }else{
              redata = {
                asks: [[]], bids: [[]], symbol: object.pair
              }
              let exchange = 'BINANCE-ORDERBOOK'
              await client.hset(exchange,  object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
            }
          }else{
            BinanceExchangeWS.setTradepairRedis(object)
          }
          })
          }, 3000);
      } else { 
        if(object.liquidity_provider == "binance")
        {
          var levels = 20;
         // const ws = await new WebSocket(ws_url + changelower + '@depth' + levels + '@100ms',{origin:'https://adverbex.com/'});
         const ws = await new WebSocket(ws_url + changelower + '@depth' + levels + '@100ms');
          ws.on('message', async function incoming(data) {
            try {
              if (data) {
                //console.log("orderbook data===",data);
                  client.hget('tradepair',object.pair,async function(err,tradepairlist){
                    if(tradepairlist !== null){
                      let redistradepair = await JSON.parse(tradepairlist)
                      var orderbook = await JSON.parse(data);
                      var activeOrderDatas = await redisHelper.RedisService.get('site_activeOrders');
                      var myasks = [];
                      var mybids = [];
                      var redata = {};
                      var tempbid = [];
                      var tempask = [];
                      if (redistradepair.liquidity_status == 1) {
                        if (activeOrderDatas !== null) {
                          for (let index = 0; index < orderbook.bids.length; index++) {
                            const element = parseFloat( orderbook.bids[index][0] + (orderbook.bids[index][0] * (redistradepair.sellspread/100)))
                            tempask.push([parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element).toFixed(redistradepair.price_decimal), 
                                          parseFloat(orderbook.bids[index][1]).toFixed(redistradepair.amount_decimal),
                                        (parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element) * parseFloat(orderbook.bids[index][1])).toFixed(redistradepair.price_decimal) ])
                          }
                          for (let index = 0; index < orderbook.asks.length; index++) {
                            const element = parseFloat( orderbook.asks[index][0] + (orderbook.asks[index][0] * (redistradepair.buyspread/100)))
                            tempbid.push([parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element).toFixed(redistradepair.price_decimal),
                              parseFloat(orderbook.asks[index][1]).toFixed(redistradepair.amount_decimal),
                              (parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element) * parseFloat(orderbook.asks[index][1])).toFixed(redistradepair.price_decimal)
                            ])
                          }
                          for (let index = 0; index < activeOrderDatas.length; index++) {
                            if (activeOrderDatas[index].pairName == object.pair && activeOrderDatas[index].liquidity_name) {
                              if (activeOrderDatas[index].tradeType == 'buy') {
                                mybids.push([parseFloat(activeOrderDatas[index].price).toFixed(redistradepair.price_decimal) , parseFloat(activeOrderDatas[index].filledAmount).toFixed(redistradepair.amount_decimal),
                                            parseFloat(activeOrderDatas[index].price * activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
                              }
                              if (activeOrderDatas[index].tradeType == 'sell') {
                                myasks.push([parseFloat(activeOrderDatas[index].price).toFixed(redistradepair.price_decimal) , parseFloat(activeOrderDatas[index].filledAmount).toFixed(redistradepair.amount_decimal),
                                            parseFloat(activeOrderDatas[index].price * activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
                              }
                            }
                          }
                          var finalbid = [];
                          var finalask = [];
                          finalbid = [...mybids, ...tempask];
                          finalask = [...myasks, ...tempbid];
        
                          // redata = {
                          //   asks: finalask, bids: finalbid, symbol: object.pair
                          // }
        
                      var bids = []
                      var buy_groups = finalbid.reduce(function(obj, item) {
                          if(Object.keys(item).length !== 0)
                          {
                              obj[item[0]] = obj[item[0]] || [];
                              obj[item[0]] = +obj[item[0]] + +item[1];
                          }
                          return obj;
                      }, {});
                      var Buy_Array = Object.keys(buy_groups).map(function(key) {
                        var total = +key * +buy_groups[key]
                        return {
                          0:parseFloat(key),
                          1:parseFloat(buy_groups[key]),
                          2: total
                      };
                      });
                      for (let index = 0; index < Buy_Array.length; index++) {
                        bids.push([parseFloat(Buy_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Buy_Array[index]['1']).toFixed(redistradepair.amount_decimal),
                        parseFloat(Buy_Array[index]['0'] * Buy_Array[index]['1']).toFixed(redistradepair.price_decimal)])
                      }
                      var asks = []
                      var sell_groups = finalask.reduce(function(obj, item) {
                          if(Object.keys(item).length !== 0)
                          {
                              obj[item[0]] = obj[item[0]] || [];
                              obj[item[0]] = +obj[item[0]] + +item[1];
                          }
                          return obj;
                      }, {});
                      var Sell_Array = Object.keys(sell_groups).map(function(key) {
                        var total = +key * +sell_groups[key]
                        return {
                          0:parseFloat(key),
                          1:parseFloat(sell_groups[key]),
                          2: total
                      };
                      });
                      for (let index = 0; index < Sell_Array.length; index++) {
                        asks.push([parseFloat(Sell_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Sell_Array[index]['1']).toFixed(redistradepair.amount_decimal),
                        parseFloat(Sell_Array[index]['0'] * Sell_Array[index]['1']).toFixed(redistradepair.price_decimal)])
                      }
        
                      redata = {
                        asks: asks, bids: bids, symbol: object.pair
                      }
                          let exchange = 'BINANCE-ORDERBOOK'
                          await client.hset(exchange, object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
                        } else {
                          for (let index = 0; index < orderbook.bids.length; index++) {
                            const element = parseFloat( orderbook.bids[index][0] + (orderbook.bids[index][0] * (redistradepair.sellspread/100)))
                            tempask.push([parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element).toFixed(redistradepair.price_decimal), 
                                          parseFloat(orderbook.bids[index][1]).toFixed(redistradepair.amount_decimal),
                                        (parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element) * parseFloat(orderbook.bids[index][1])).toFixed(redistradepair.price_decimal) ])
                          }
                          for (let index = 0; index < orderbook.asks.length; index++) {
                            const element = parseFloat( orderbook.asks[index][0] + (orderbook.asks[index][0] * (redistradepair.buyspread /100)))
                            tempbid.push([parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element ).toFixed(redistradepair.price_decimal),
                              parseFloat(orderbook.asks[index][1]).toFixed(redistradepair.amount_decimal),
                              (parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element) * parseFloat(orderbook.asks[index][1])).toFixed(redistradepair.price_decimal)
                            ])
                          }
                          // redata = {
                          //   asks: tempask, bids: tempbid, symbol: object.pair
                          // }
        
                      var bids = []
                      var buy_groups = tempask.reduce(function(obj, item) {
                          if(Object.keys(item).length !== 0)
                          {
                              obj[item[0]] = obj[item[0]] || [];
                              obj[item[0]] = +obj[item[0]] + +item[1];
                          }
                          return obj;
                      }, {});
                      var Buy_Array = Object.keys(buy_groups).map(function(key) {
                        var total = +key * +buy_groups[key]
                        return {
                          0:parseFloat(key),
                          1:parseFloat(buy_groups[key]),
                          2: total
                      };
                      });
                      for (let index = 0; index < Buy_Array.length; index++) {
                        bids.push([parseFloat(Buy_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Buy_Array[index]['1']).toFixed(redistradepair.amount_decimal),
                        parseFloat(Buy_Array[index]['0'] * Buy_Array[index]['1']).toFixed(redistradepair.price_decimal)])
                      }
                      var asks = []
                      var sell_groups = tempbid.reduce(function(obj, item) {
                          if(Object.keys(item).length !== 0)
                          {
                              obj[item[0]] = obj[item[0]] || [];
                              obj[item[0]] = +obj[item[0]] + +item[1];
                          }
                          return obj;
                      }, {});
                      var Sell_Array = Object.keys(sell_groups).map(function(key) {
                        var total = +key * +sell_groups[key]
                        return {
                          0:parseFloat(key),
                          1:parseFloat(sell_groups[key]),
                          2: total
                      };
                      });
                      for (let index = 0; index < Sell_Array.length; index++) {
                        asks.push([parseFloat(Sell_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Sell_Array[index]['1']).toFixed(redistradepair.amount_decimal),
                        parseFloat(Sell_Array[index]['0'] * Sell_Array[index]['1']).toFixed(redistradepair.price_decimal)])
                      }
        
                      redata = {
                            asks: asks, bids: bids, symbol: object.pair
                          }
                          let exchange = 'BINANCE-ORDERBOOK'
                          await client.hset(exchange, object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
                        }
                        // -------------------liquidity on mode end------------
                      } else {
                        // -------------------liquidity off mode start------------
                        if (activeOrderDatas !== null) {
                          for (let index = 0; index < activeOrderDatas.length; index++) {
                            if (activeOrderDatas[index].pairName == object.pair && activeOrderDatas[index].liquidity_name) {
                              if (activeOrderDatas[index].tradeType == 'buy') {
                                mybids.push([parseFloat(activeOrderDatas[index].price).toFixed(redistradepair.price_decimal) , parseFloat(activeOrderDatas[index].filledAmount).toFixed(redistradepair.amount_decimal),
                                            parseFloat(activeOrderDatas[index].price * activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
                              }
                              if (activeOrderDatas[index].tradeType == 'sell') {
                                myasks.push([parseFloat(activeOrderDatas[index].price).toFixed(redistradepair.price_decimal) , parseFloat(activeOrderDatas[index].filledAmount).toFixed(redistradepair.amount_decimal),
                                            parseFloat(activeOrderDatas[index].price , activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
                              }
                            }
                          }
                          //  redata = {
                          //   asks: myasks, bids: mybids, symbol: object.pair
                          // }
                          var bids = []
                          var buy_groups = myasks.reduce(function(obj, item) {
                              if(Object.keys(item).length !== 0)
                              {
                                  obj[item[0]] = obj[item[0]] || [];
                                  obj[item[0]] = +obj[item[0]] + +item[1];
                              }
                              return obj;
                          }, {});
                          var Buy_Array = Object.keys(buy_groups).map(function(key) {
                            var total = +key * +buy_groups[key]
                            return {
                              0:parseFloat(key),
                              1:parseFloat(buy_groups[key]),
                              2: total
                          };
                          });
                          for (let index = 0; index < Buy_Array.length; index++) {
                            bids.push([parseFloat(Buy_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Buy_Array[index]['1']).toFixed(redistradepair.amount_decimal),
                            parseFloat(Buy_Array[index]['0'] * Buy_Array[index]['1']).toFixed(redistradepair.price_decimal)])
                          }
                          var asks = []
                          var sell_groups = mybids.reduce(function(obj, item) {
                              if(Object.keys(item).length !== 0)
                              {
                                  obj[item[0]] = obj[item[0]] || [];
                                  obj[item[0]] = +obj[item[0]] + +item[1];
                              }
                              return obj;
                          }, {});
                          var Sell_Array = Object.keys(sell_groups).map(function(key) {
                            var total = +key * +sell_groups[key]
                            return {
                              0:parseFloat(key),
                              1:parseFloat(sell_groups[key]),
                              2: total
                          };
                          });
                          for (let index = 0; index < Sell_Array.length; index++) {
                            asks.push([parseFloat(Sell_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Sell_Array[index]['1']).toFixed(redistradepair.amount_decimal),
                            parseFloat(Sell_Array[index]['0'] * Sell_Array[index]['1']).toFixed(redistradepair.price_decimal)])
                          }
            
                          redata = {
                                asks: asks, bids: bids, symbol: object.pair
                              }
                          let exchange = 'BINANCE-ORDERBOOK'
                          await client.hset(exchange, object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
                        }else{
                          redata = {
                            asks: [[]], bids: [[]], symbol: object.pair
                          }
                          let exchange = 'BINANCE-ORDERBOOK'
                          await client.hset(exchange, object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
                        }
                      }
                    }else{
                      BinanceExchangeWS.setTradepairRedis(object)
                    }
                  })
              }else{
                console.log('binance order not stream');
              }
          } catch (error) {
              console.log('binance order stream error');
          }
          })
          ws.on('error', async (error) => {
           // common.create_log(error,function(resp){});
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.orderpicker(object);
            }, 1000);
          })
          ws.on('disconnect', async function () {
            // BinanceExchangeWS.orderpicker(object);
            //common.create_log('websocket disconnect error',function(resp){});
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.orderpicker(object);
            }, 1000);
          });
          ws.on('close', async function () {
           // common.create_log('websocket closed',function(resp){});
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.orderpicker(object);
            }, 1000);
          });
          ws.on('ping', (e) => { //listen for ping event
            //console.log('order picker ping message');
            heartbeat(ws)
            // common.create_log('order picker ping message',function(resp){});
            ws.pong(); //send pong frame
          });
          setInterval(() => {
            ws.close();
          }, 82800000);
        }
        // else
        // {
        //  // latoken_ws.connect({}, function(response){
        //     latoken_ws.subscribe("/v1/book/"+object.from_pair_latoken+"/"+object.to_pair_latoken+"", function(resp){
        //       if (resp.body) {
        //         var result = JSON.parse(resp.body);
        //         client.hget('tradepair',object.pair,async function(err,tradepairlist){
        //           if(tradepairlist !== null){
        //             let redistradepair = await JSON.parse(tradepairlist)
        //             var orderbook = result.payload;
        //             console.log("orderbook.bid",orderbook.bid);
        //             console.log("orderbook.bid length",orderbook.bid.length);
        //             var activeOrderDatas = await redisHelper.RedisService.get('site_activeOrders');
        //             var myasks = [];
        //             var mybids = [];
        //             var redata = {};
        //             var tempbid = [];
        //             var tempask = [];
        //             if (redistradepair.liquidity_status == 1) {
        //               console.log("call here 1111=====")
        //               if (activeOrderDatas !== null) {
        //                 console.log("call here 3333=====")
        //                 for (let index = 0; index < orderbook.bid.length; index++) {
        //                   //console.log("orderbook.bid[index===",orderbook.bid[index])
        //                   const element = parseFloat( orderbook.bid[index]['price'] + (orderbook.bid[index]['price'] * (redistradepair.sellspread/100)))
        //                   tempask.push([parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element).toFixed(redistradepair.price_decimal), 
        //                                 parseFloat(orderbook.bid[index]['quantity']).toFixed(redistradepair.amount_decimal),
        //                               (parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element) * parseFloat(orderbook.bid[index]['quantity'])).toFixed(redistradepair.price_decimal) ])
        //                 }
        //                 for (let index = 0; index < orderbook.ask.length; index++) {
        //                   const element = parseFloat( orderbook.ask[index]['price'] + (orderbook.ask[index]['price'] * (redistradepair.buyspread/100)))
        //                   tempbid.push([parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element).toFixed(redistradepair.price_decimal),
        //                     parseFloat(orderbook.ask[index]['quantity']).toFixed(redistradepair.amount_decimal),
        //                     (parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element) * parseFloat(orderbook.ask[index]['quantity'])).toFixed(redistradepair.price_decimal)
        //                   ])
        //                 }
        //                 for (let index = 0; index < activeOrderDatas.length; index++) {
        //                   if (activeOrderDatas[index].pairName == object.pair && activeOrderDatas[index].liquidity_name) {
        //                     if (activeOrderDatas[index].tradeType == 'buy') {
        //                       mybids.push([parseFloat(activeOrderDatas[index].price).toFixed(redistradepair.price_decimal) , parseFloat(activeOrderDatas[index].filledAmount).toFixed(redistradepair.amount_decimal),
        //                                   parseFloat(activeOrderDatas[index].price * activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
        //                     }
        //                     if (activeOrderDatas[index].tradeType == 'sell') {
        //                       myasks.push([parseFloat(activeOrderDatas[index].price).toFixed(redistradepair.price_decimal) , parseFloat(activeOrderDatas[index].filledAmount).toFixed(redistradepair.amount_decimal),
        //                                   parseFloat(activeOrderDatas[index].price * activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
        //                     }
        //                   }
        //                 }
        //                 var finalbid = [];
        //                 var finalask = [];
        //                 finalbid = [...mybids, ...tempask];
        //                 finalask = [...myasks, ...tempbid];
      
        //                 // redata = {
        //                 //   asks: finalask, bids: finalbid, symbol: object.pair
        //                 // }
      
        //             var bids = []
        //             var buy_groups = finalbid.reduce(function(obj, item) {
        //                 if(Object.keys(item).length !== 0)
        //                 {
        //                     obj[item[0]] = obj[item[0]] || [];
        //                     obj[item[0]] = +obj[item[0]] + +item[1];
        //                 }
        //                 return obj;
        //             }, {});
        //             var Buy_Array = Object.keys(buy_groups).map(function(key) {
        //               var total = +key * +buy_groups[key]
        //               return {
        //                 0:parseFloat(key),
        //                 1:parseFloat(buy_groups[key]),
        //                 2: total
        //             };
        //             });
        //             for (let index = 0; index < Buy_Array.length; index++) {
        //               bids.push([parseFloat(Buy_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Buy_Array[index]['1']).toFixed(redistradepair.amount_decimal),
        //               parseFloat(Buy_Array[index]['0'] * Buy_Array[index]['1']).toFixed(redistradepair.price_decimal)])
        //             }
        //             var asks = []
        //             var sell_groups = finalask.reduce(function(obj, item) {
        //                 if(Object.keys(item).length !== 0)
        //                 {
        //                     obj[item[0]] = obj[item[0]] || [];
        //                     obj[item[0]] = +obj[item[0]] + +item[1];
        //                 }
        //                 return obj;
        //             }, {});
        //             var Sell_Array = Object.keys(sell_groups).map(function(key) {
        //               var total = +key * +sell_groups[key]
        //               return {
        //                 0:parseFloat(key),
        //                 1:parseFloat(sell_groups[key]),
        //                 2: total
        //             };
        //             });
        //             for (let index = 0; index < Sell_Array.length; index++) {
        //               asks.push([parseFloat(Sell_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Sell_Array[index]['1']).toFixed(redistradepair.amount_decimal),
        //               parseFloat(Sell_Array[index]['0'] * Sell_Array[index]['1']).toFixed(redistradepair.price_decimal)])
        //             }
      
        //             redata = {
        //               asks: asks, bids: bids, symbol: object.pair
        //             }
        //            // console.log("redata===",redata)
        //                 let exchange = 'BINANCE-ORDERBOOK'
        //                 await client.hset(exchange, object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
        //               } else {
        //                 //console.log("call here 2222=====")
        //                 for (let index = 0; index < orderbook.bid.length; index++) {
        //                  // console.log("orderbook.bid[index===",orderbook.bid[index])
        //                   const element = parseFloat( orderbook.bid[index]['price'] + (orderbook.bid[index]['price'] * (redistradepair.sellspread/100)))
        //                   tempask.push([parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element).toFixed(redistradepair.price_decimal), 
        //                                 parseFloat(orderbook.bid[index]['quantity']).toFixed(redistradepair.amount_decimal),
        //                               (parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element) * parseFloat(orderbook.bid[index]['quantity'])).toFixed(redistradepair.price_decimal) ])
        //                 }
        //                 for (let index = 0; index < orderbook.ask.length; index++) {
        //                   const element = parseFloat( orderbook.ask[index]['price'] + (orderbook.ask[index]['price'] * (redistradepair.buyspread /100)))
        //                   tempbid.push([parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element ).toFixed(redistradepair.price_decimal),
        //                     parseFloat(orderbook.ask[index]['quantity']).toFixed(redistradepair.amount_decimal),
        //                     (parseFloat(object.to_symbol == 'INR' ? element * currrate1 : element) * parseFloat(orderbook.ask[index]['quantity'])).toFixed(redistradepair.price_decimal)
        //                   ])
        //                 }
        //                 // redata = {
        //                 //   asks: tempask, bids: tempbid, symbol: object.pair
        //                 // }
      
        //             var bids = []
        //             var buy_groups = tempask.reduce(function(obj, item) {
        //                 if(Object.keys(item).length !== 0)
        //                 {
        //                     obj[item[0]] = obj[item[0]] || [];
        //                     obj[item[0]] = +obj[item[0]] + +item[1];
        //                 }
        //                 return obj;
        //             }, {});
        //             var Buy_Array = Object.keys(buy_groups).map(function(key) {
        //               var total = +key * +buy_groups[key]
        //               return {
        //                 0:parseFloat(key),
        //                 1:parseFloat(buy_groups[key]),
        //                 2: total
        //             };
        //             });
        //             for (let index = 0; index < Buy_Array.length; index++) {
        //               bids.push([parseFloat(Buy_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Buy_Array[index]['1']).toFixed(redistradepair.amount_decimal),
        //               parseFloat(Buy_Array[index]['0'] * Buy_Array[index]['1']).toFixed(redistradepair.price_decimal)])
        //             }
        //             var asks = []
        //             var sell_groups = tempbid.reduce(function(obj, item) {
        //                 if(Object.keys(item).length !== 0)
        //                 {
        //                     obj[item[0]] = obj[item[0]] || [];
        //                     obj[item[0]] = +obj[item[0]] + +item[1];
        //                 }
        //                 return obj;
        //             }, {});
        //             var Sell_Array = Object.keys(sell_groups).map(function(key) {
        //               var total = +key * +sell_groups[key]
        //               return {
        //                 0:parseFloat(key),
        //                 1:parseFloat(sell_groups[key]),
        //                 2: total
        //             };
        //             });
        //             for (let index = 0; index < Sell_Array.length; index++) {
        //               asks.push([parseFloat(Sell_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Sell_Array[index]['1']).toFixed(redistradepair.amount_decimal),
        //               parseFloat(Sell_Array[index]['0'] * Sell_Array[index]['1']).toFixed(redistradepair.price_decimal)])
        //             }
      
        //             redata = {
        //                   asks: asks, bids: bids, symbol: object.pair
        //                 }
        //               //console.log("redata===",redata)
        //                 let exchange = 'BINANCE-ORDERBOOK'
        //                 await client.hset(exchange, object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
        //               }
        //               // -------------------liquidity on mode end------------
        //             } else {
        //               // -------------------liquidity off mode start------------
        //               if (activeOrderDatas !== null) {
        //                 for (let index = 0; index < activeOrderDatas.length; index++) {
        //                   if (activeOrderDatas[index].pairName == object.pair && activeOrderDatas[index].liquidity_name) {
        //                     if (activeOrderDatas[index].tradeType == 'buy') {
        //                       mybids.push([parseFloat(activeOrderDatas[index].price).toFixed(redistradepair.price_decimal) , parseFloat(activeOrderDatas[index].filledAmount).toFixed(redistradepair.amount_decimal),
        //                                   parseFloat(activeOrderDatas[index].price * activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
        //                     }
        //                     if (activeOrderDatas[index].tradeType == 'sell') {
        //                       myasks.push([parseFloat(activeOrderDatas[index].price).toFixed(redistradepair.price_decimal) , parseFloat(activeOrderDatas[index].filledAmount).toFixed(redistradepair.amount_decimal),
        //                                   parseFloat(activeOrderDatas[index].price , activeOrderDatas[index].filledAmount).toFixed(redistradepair.price_decimal)])
        //                     }
        //                   }
        //                 }
        //                 //  redata = {
        //                 //   asks: myasks, bids: mybids, symbol: object.pair
        //                 // }
        //                 var bids = []
        //                 var buy_groups = myasks.reduce(function(obj, item) {
        //                     if(Object.keys(item).length !== 0)
        //                     {
        //                         obj[item[0]] = obj[item[0]] || [];
        //                         obj[item[0]] = +obj[item[0]] + +item[1];
        //                     }
        //                     return obj;
        //                 }, {});
        //                 var Buy_Array = Object.keys(buy_groups).map(function(key) {
        //                   var total = +key * +buy_groups[key]
        //                   return {
        //                     0:parseFloat(key),
        //                     1:parseFloat(buy_groups[key]),
        //                     2: total
        //                 };
        //                 });
        //                 for (let index = 0; index < Buy_Array.length; index++) {
        //                   bids.push([parseFloat(Buy_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Buy_Array[index]['1']).toFixed(redistradepair.amount_decimal),
        //                   parseFloat(Buy_Array[index]['0'] * Buy_Array[index]['1']).toFixed(redistradepair.price_decimal)])
        //                 }
        //                 var asks = []
        //                 var sell_groups = mybids.reduce(function(obj, item) {
        //                     if(Object.keys(item).length !== 0)
        //                     {
        //                         obj[item[0]] = obj[item[0]] || [];
        //                         obj[item[0]] = +obj[item[0]] + +item[1];
        //                     }
        //                     return obj;
        //                 }, {});
        //                 var Sell_Array = Object.keys(sell_groups).map(function(key) {
        //                   var total = +key * +sell_groups[key]
        //                   return {
        //                     0:parseFloat(key),
        //                     1:parseFloat(sell_groups[key]),
        //                     2: total
        //                 };
        //                 });
        //                 for (let index = 0; index < Sell_Array.length; index++) {
        //                   asks.push([parseFloat(Sell_Array[index]['0']).toFixed(redistradepair.price_decimal) , parseFloat(Sell_Array[index]['1']).toFixed(redistradepair.amount_decimal),
        //                   parseFloat(Sell_Array[index]['0'] * Sell_Array[index]['1']).toFixed(redistradepair.price_decimal)])
        //                 }
          
        //                 redata = {
        //                       asks: asks, bids: bids, symbol: object.pair
        //                     }
        //                 let exchange = 'BINANCE-ORDERBOOK'
        //                 await client.hset(exchange, object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
        //               }else{
        //                 redata = {
        //                   asks: [[]], bids: [[]], symbol: object.pair
        //                 }
        //                 let exchange = 'BINANCE-ORDERBOOK'
        //                 await client.hset(exchange, object.to_symbol == 'INR'? currlower : changelower, JSON.stringify(redata));
        //               }
        //             }
        //           }else{
        //             BinanceExchangeWS.setTradepairRedis(object)
        //           }
        //         })
        //       } else {
        //         console.log("got empty message");
        //       }
        //     });
        //   //});
        //   // latoken_ws.disconnect(function() {
        //   //   common.create_log('websocket disconnect error',function(resp){});
        //   //   ws.close();
        //   //   setTimeout(() => {
        //   //     BinanceExchangeWS.orderpicker(object);
        //   //   }, 1000);
        //   // })
        // }      
        
      }
    } catch (error) {
      console.log('latoken catch response order stream error',error);
    }
  },
  setTradepairRedis:async(obj)=>{
    await client.hset('tradepair',obj.pair, JSON.stringify(obj));
  },
  tickerPrice: async (object)=>{
    try {
      

      if (object.liquidity_status == "0") {
        var replace_string = object.pair.replace("_", "")
        var currlower = replace_string.toLowerCase();

        
        setInterval(async () => {
          client.hget('GetTickerPrice',object.pair,async function(err,tickerprice){
            if (tickerprice !== null) {
              var  pricelist = await JSON.parse(tickerprice)
                  let exchange = 'BINANCE-TICKERPRICE'
                  await client.hset(exchange,currlower, JSON.stringify(pricelist));
            } else {
              BinanceExchangeWS.fetchInternalTickers(object.pair)
            }
          })
        }, 3000);
      }else{
      if(object.liquidity_provider == "binance")
      {
        if(object.to_symbol == 'INR'){
          var concatcur = object.from_symbol+ object.to_symbol;
          var currlower =concatcur.toLowerCase()
          var replace_string = object.from_symbol+'USDT'
          var changelower = replace_string.toLowerCase();
          changelower = (changelower=="usdtusdt")?"busdusdt":changelower;
          
          //const ws = await new WebSocket(ws_url+changelower+'@ticker',{origin:'https://adverbex.com/'});
          const ws = await new WebSocket(ws_url+changelower+'@ticker');
          ws.on('message', async function incoming(data) {
  
            if (data !==null && data !==undefined) {
              let tickerprice = await JSON.parse(data);
  
         
              
              client.hget('tradepair',object.pair,async function(err,response){
                if(response !==null ){
                var  redistradepair = await JSON.parse(response)
                let spread_percent = +(redistradepair.buyspread/100);
                let cal_val = +tickerprice.c * +currrate1 * +spread_percent;
                let convert_rate = tickerprice.c * currrate1
                // if(changelower=="busdusdt")
                // {
                //   console.log("tickerprice.s==",tickerprice.s)
                // }
                let checkpair = redistradepair.from_symbol+'USDT';
                checkpair = (checkpair=="USDTUSDT")?"BUSDUSDT":checkpair;
  
              //  if (redistradepair.from_symbol+'USDT' == tickerprice.s) {
                if (checkpair == tickerprice.s) {
                  if (redistradepair.liquidity_status==1) {
                    var redata = {
                      volume: tickerprice.v,
                      highprice: tickerprice.h * currrate1,
                      lowprice: tickerprice.l * currrate1,
                      price_change: tickerprice.p * currrate1,
                      lastprice: {lastprice: +convert_rate + +cal_val, tradeType:''},
                      change_percent: tickerprice.P,
                      pair: object.pair,
                      liquidity_status:1
                    }
                    // if(changelower=="busdusdt")
                    // {
                    //   console.log("tickerprice===",redata);
                    // }
                    let exchange = 'BINANCE-TICKERPRICE'
                    await client.hset(exchange,currlower, JSON.stringify(redata));
                  } else {
                    client.hget('GetTickerPrice',object.pair,async function(err,tickerprice){
                      if (tickerprice !== null) {
                        var  pricelist = await JSON.parse(tickerprice)
                            let exchange = 'BINANCE-TICKERPRICE'
                            await client.hset(exchange,currlower, JSON.stringify(pricelist));
                      } else {
                        BinanceExchangeWS.fetchInternalTickers(object.pair)
                      }
                    })
                  }
                }
                }else{
                  BinanceExchangeWS.setTradepairRedis(object)
                }
            })
          }
          });
          ws.on('error',async (error) => {
            //common.create_log(error,function(resp){});
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tickerPrice(object);
            }, 1000);
          })
          ws.on('disconnect',async function(){
            // BinanceExchangeWS.tickerPrice(object);
            //common.create_log('websocket disconnect error',function(resp){});
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tickerPrice(object);
            }, 1000);
          });
          ws.on('close',async function(){
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tickerPrice(object);
            }, 1000);
          });
          ws.on('ping', (e) => { //listen for ping event
            //console.log('trade price ping message');
            heartbeat(ws)
            // common.create_log('trade price ping message',function(resp){});
            ws.pong(); //send pong frame
          });
          setInterval(() => {
            ws.close();
          }, 82800000);
        } else {
         // console.log("call here ====")
          var replace_string = object.pair.replace("_", "")
          var changelower = replace_string.toLowerCase();
        //  console.log("call changelower ====",changelower)
          setInterval(() => {
            client.hget('tradepair',object.pair,async function(err,response){
              if(response !==null ){
                var  redistradepair = await JSON.parse(response)
                if (redistradepair.liquidity_status==0) {
                  client.hget('GetTickerPrice',object.pair,async function(err,tickerprice){
                    if (tickerprice !== null) {
                      var  pricelist = await JSON.parse(tickerprice)
                          let exchange = 'BINANCE-TICKERPRICE'
                          await client.hset(exchange,changelower, JSON.stringify(pricelist));
                    } else {
                      BinanceExchangeWS.fetchInternalTickers(object.pair)
                    }
                  })
                }
              }
            })
          }, 3000);
          //const ws = await new WebSocket(ws_url+changelower+'@ticker',{origin:'https://adverbex.com/'});
          const ws = await new WebSocket(ws_url+changelower+'@ticker');
          //console.log("call ws ====",changelower)
          ws.on('message', async function incoming(data) {
            //console.log("ticker incoming data====",data);
            if (data !==null && data !==undefined) {
              //console.log("ticker price data====",data);
            let tickerprice = await JSON.parse(data);
            
            
            client.hget('tradepair',object.pair,async function(err,response){
              if(response !==null ){
                var  redistradepair = await JSON.parse(response)
                let spread_percent = redistradepair.buyspread/100;
                let calc_val = +tickerprice.c * +spread_percent;
                if (redistradepair.from_symbol+redistradepair.to_symbol == tickerprice.s) {
                  if (redistradepair.liquidity_status==1) {
                    let last_price = +tickerprice.c + +calc_val;
                    var redata = {
                      volume: parseFloat(tickerprice.v).toFixed(object.amount_decimal),
                      highprice: parseFloat(tickerprice.h).toFixed(object.price_decimal),
                      lowprice: parseFloat(tickerprice.l).toFixed(object.price_decimal),
                      price_change: parseFloat(tickerprice.p).toFixed(object.price_decimal),
                      lastprice: {lastprice: parseFloat(last_price).toFixed(object.price_decimal), tradeType:''},
                      pair: object.pair,
                      liquidity_status: 1,
                      change_percent: parseFloat(tickerprice.P).toFixed(2)
                    }
                    let exchange = 'BINANCE-TICKERPRICE'
                    await client.hset(exchange,changelower, JSON.stringify(redata));
                  } else {
                    client.hget('GetTickerPrice',object.pair,async function(err,tickerprice){
                      if (tickerprice !== null) {
                        var  pricelist = await JSON.parse(tickerprice)
                            let exchange = 'BINANCE-TICKERPRICE'
                            await client.hset(exchange,changelower, JSON.stringify(pricelist));
                      } else {
                        BinanceExchangeWS.fetchInternalTickers(object.pair)
                      }
                    })
                  }
                }
                }else{
                  BinanceExchangeWS.setTradepairRedis(object)
                }
            })
          }
          });
          ws.on('error',async (error) => {
            //common.create_log(error,function(resp){});
            console.log("ws error",error)
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tickerPrice(object);
            }, 10000);
          })
          ws.on('disconnect',async function(){
            console.log("ws disconnect")
            // BinanceExchangeWS.tickerPrice(object);
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tickerPrice(object);
            }, 1000);
          });
          ws.on('close',async function(){
            console.log("ws close")
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tickerPrice(object);
            }, 1000);
          });
          ws.on('ping', (e) => { //listen for ping event
            //console.log('trade price ping message');
            heartbeat(ws)
            // common.create_log('ticker price ping message',function(resp){});
            ws.pong(); //send pong frame
          });
          setInterval(() => {
            ws.close();
          }, 82800000);
        }
      }
      // else
      // {

      //   var replace_string = object.pair.replace("_", "")
      //   var changelower = replace_string.toLowerCase();

      //   var internal_tickers = '';
      //   client.hget('GetTickerPrice',object.pair,async function(err,tickerprice){
      //     //console.log("ticker pair===",tickerprice)
      //     if (tickerprice !== null) {
      //       internal_tickers = await JSON.parse(tickerprice)
      //           let exchange = 'BINANCE-TICKERPRICE'
      //           await client.hset(exchange,changelower, JSON.stringify(internal_tickers));
      //     } else {
      //       //console.log("ticker pair 111===")
      //       var start = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      //       var end = new Date();
      //       var options = [
      //           {
      //             "$match": {
      //               'pair': object.pair,
      //               '$and': [
      //                 { created_at: { $lte: end } }, { created_at: { $gte: start } }
      //               ],
      //             }
      //         },
      //         {$sort: {
      //           "created_at":-1
      //         }},
      //           {
      //               $group: {
      //                   _id: {
      //                       pairName: "$pair"
      //                   },
      //                   highprice   : {$max: "$askPrice"},
      //                   lowprice   : {$min: "$askPrice"},
      //                   volume     : {$sum: "$askAmount"},
      //                   open     : {$first: "$askPrice"},
      //                   close: {$last: "$askPrice"},
      //                   tradeType: {$first: "$type"}
      //               }
      //           }
      //       ];
          
      //      var data = await orderConfirmDB.aggregate(options);
      //         if(data.length>0)
      //         {   
      //           //console.log("call ticker111")    
      //           var response = await data[0];
      //           var price_change = response.open - response.close;
      //           var change_percent = (response.open - response.close) / response.open * 100;
      //           var lastobj = data.pop();
      //           internal_tickers = {
      //             volume: parseFloat(response.volume).toFixed(object.amount_decimal),
      //             highprice: parseFloat(response.highprice).toFixed(object.price_decimal),
      //             lowprice: parseFloat(response.lowprice).toFixed(object.price_decimal),
      //             price_change: parseFloat(price_change).toFixed(object.price_decimal),
      //             lastprice: {lastprice: parseFloat(response.open).toFixed(object.price_decimal),tradeType:response.tradeType},
      //             change_percent: parseFloat(change_percent).toFixed(2),
      //             pair: object.pair,
      //             liquidity_status:0
      //           }

      //           //latoken_ws.connect({}, function(response){
      //             latoken_ws.subscribe("/v1/ticker/"+object.from_pair_latoken+"/"+object.to_pair_latoken+"", function(resp){
      //               if (resp.body) {
      //                 var result = JSON.parse(resp.body);
      //                // console.log("ticker data===",result);
      //                 let tickerprice = result.payload;
                    
                    
      //               client.hget('tradepair',object.pair,async function(err,response){
      //                 if(response !==null ){
      //                   var  redistradepair = await JSON.parse(response)
      //                   let spread_percent = redistradepair.buyspread/100;
      //                   let calc_val = +tickerprice.lastPrice * +spread_percent;
      //                   var last_price = +tickerprice.lastPrice + +calc_val;
      //                       var redata = {
      //                         volume: internal_tickers.volume,
      //                         highprice: internal_tickers.highprice,
      //                         lowprice: internal_tickers.lowprice,
      //                         price_change: internal_tickers.price_change,
      //                         lastprice: {lastprice: parseFloat(last_price).toFixed(object.price_decimal), tradeType:''},
      //                         pair: object.pair,
      //                         liquidity_status: 1,
      //                         change_percent: parseFloat(internal_tickers.change_percent).toFixed(2)
      //                       }
      //                       //console.log("redata===",redata)
      //                       let exchange = 'BINANCE-TICKERPRICE'
      //                       await client.hset(exchange,changelower, JSON.stringify(redata));
      //                   }else{
      //                     BinanceExchangeWS.setTradepairRedis(object)
      //                   }
      //               })
      //               }
      //             });
      //          // });
      //           // latoken_ws.disconnect(function() {
      //           //   common.create_log('websocket disconnect error',function(resp){});
      //           //   ws.close();
      //           //   setTimeout(() => {
      //           //     BinanceExchangeWS.orderpicker(object);
      //           //   }, 1000);
      //           // })
      //         }
      //         else
      //         {
      //           //console.log("call ticker2222") 
          
      //           var options = [
      //             {
      //               "$match": {
      //                 'pair': object.pair
      //               }
      //           },
      //           {$sort: {
      //             "created_at":-1
      //           }},
      //             {
      //                 $group: {
      //                     _id: {
      //                         pairName: "$pair"
      //                     },
      //                     highprice   : {$max: "$askPrice"},
      //                     lowprice   : {$min: "$askPrice"},
      //                     volume     : {$sum: "$askAmount"},
      //                     open     : {$first: "$askPrice"},
      //                     close: {$last: "$askPrice"},
      //                     tradeType: {$first: "$type"}
      //                 }
      //             }
      //         ];
            
      //         var tickerdata = await orderConfirmDB.aggregate(options);
          
      //           var pairdata = await tradePair.findOne({pair:object.pair});
      //           internal_tickers = {
      //             volume: parseFloat(pairdata.volume_24h).toFixed(pairdata.amount_decimal),
      //             highprice: parseFloat(pairdata.highest_24h).toFixed(pairdata.price_decimal),
      //             lowprice: parseFloat(pairdata.lowest_24h).toFixed(pairdata.price_decimal),
      //             price_change: parseFloat(pairdata.changes_24h).toFixed(pairdata.price_decimal),
      //             lastprice:{lastprice: (tickerdata.length > 0 && tickerdata[0].open != null)?parseFloat(tickerdata[0].open).toFixed(pairdata.price_decimal):parseFloat(pairdata.marketPrice).toFixed(pairdata.price_decimal),tradeType:''},
      //             change_percent: parseFloat(pairdata.changes_24h).toFixed(2),
      //             pair: object.pair,
      //             liquidity_status:0
      //           }

      //  //         latoken_ws.connect({}, function(response){
      //             latoken_ws.subscribe("/v1/ticker/"+object.from_pair_latoken+"/"+object.to_pair_latoken+"", function(resp){
      //               if (resp.body) {
      //                 var result = JSON.parse(resp.body);
      //                 //console.log("ticker data===",result);
      //                 let tickerprice = result.payload;
                    
                    
      //               client.hget('tradepair',object.pair,async function(err,response){
      //                 if(response !==null ){
      //                   var  redistradepair = await JSON.parse(response)
      //                   let spread_percent = redistradepair.buyspread/100;
      //                   let calc_val = +tickerprice.lastPrice * +spread_percent;
      //                   var last_price = +tickerprice.lastPrice + +calc_val;
      //                       var redata = {
      //                         volume: internal_tickers.volume,
      //                         highprice: internal_tickers.highprice,
      //                         lowprice: internal_tickers.lowprice,
      //                         price_change: internal_tickers.price_change,
      //                         lastprice: {lastprice: parseFloat(last_price).toFixed(object.price_decimal), tradeType:''},
      //                         pair: object.pair,
      //                         liquidity_status: 1,
      //                         change_percent: parseFloat(internal_tickers.change_percent).toFixed(2)
      //                       }
      //                      // console.log("redata===",redata)
      //                       let exchange = 'BINANCE-TICKERPRICE'
      //                       await client.hset(exchange,changelower, JSON.stringify(redata));
      //                   }else{
      //                     BinanceExchangeWS.setTradepairRedis(object)
      //                   }
      //               })
      //               }
      //             });
      //          // });
      //           // latoken_ws.disconnect(function() {
      //           //   common.create_log('websocket disconnect error',function(resp){});
      //           //   ws.close();
      //           //   setTimeout(() => {
      //           //     BinanceExchangeWS.orderpicker(object);
      //           //   }, 1000);
      //           // })
      //         }
      //       console.log("ticker pair 222===",internal_tickers)
      //     }
      //   })
      //   console.log("internal_tickers===",internal_tickers)
        
      // }
      
    }
    } catch (error) {
      console.log("ticker price catch====",error);
      //common.create_log(error.message,function(resp){});
    }
  },
  tradeHistory:async (object)=>{
    try {
      var changelower = ''
      var currlower = ''
      if (object.to_symbol == 'INR') {
        var concatcur = object.from_symbol + object.to_symbol;
        currlower = concatcur.toLowerCase()
        var replace_string = object.from_symbol + 'USDT'
        changelower = replace_string.toLowerCase();
        changelower = (changelower=="usdtusdt")?"busdusdt":changelower;
      } else {
        var concatcur = object.from_symbol + object.to_symbol;
        changelower = concatcur.toLowerCase();
      }
      if (object.liquidity_status == "0") {
        setInterval(async () => {
          client.hget('InternalTradeHistory', changelower,async function(err,histlist){
            if(!err && histlist !== null){
              await client.hset('TradeHistory',  changelower, histlist);
            }else{
              BinanceExchangeWS.fetchInternalTradehistory(object.pair)
            }
          })
        }, 3000);
      } else {
        if(object.liquidity_provider == "binance")
        {
          //const ws = await new WebSocket(ws_url + changelower + '@trade',{origin:'https://adverbex.com/'});
          const ws = await new WebSocket(ws_url + changelower + '@trade');
          var tradeHisotys = [];
          ws.on('message', async function incoming(data) {
            let alltrade = await JSON.parse(data);
            client.hget('tradepair', object.pair, async function (err, response) {
              if (response !== null) {
                var redistradepair = await JSON.parse(response)
                if (redistradepair.liquidity_status == 1) {
                  client.hget('InternalTradeHistory',object.to_symbol == 'INR' ? currlower : changelower,async function(err,histlist){
                    if (!err && histlist) {
                      var hstorylist = JSON.parse(histlist)
                      var redata = {
                        symbol: alltrade.s, tradeID: alltrade.t, quantity: alltrade.q, price: alltrade.p, time: alltrade.t, tradeType: alltrade.m == true ? 'buy' : 'sell'
                      }
                      var objs = {
                        symbol: redata.symbol,
                        tradeID: redata.tradeID,
                        amount: parseFloat(redata.quantity).toFixed(redistradepair.amount_decimal),
                        price: object.to_symbol == 'INR' ? parseFloat(redata.price * currrate1).toFixed(redistradepair.price_decimal) : parseFloat(redata.price).toFixed(redistradepair.price_decimal),
                        time: moment(new Date).format('MM-DD-YY'),
                        tradeType: redata.tradeType
                      }
                      tradeHisotys.push(objs);
                      if (tradeHisotys.length == 20) {
                        var mergearr = [...tradeHisotys,...hstorylist]
                        await client.hset('TradeHistory', object.to_symbol == 'INR' ? currlower : changelower, JSON.stringify(mergearr));
                        tradeHisotys = []
                      }
                    } else {
                      BinanceExchangeWS.fetchInternalTradehistory(object.pair)
                      var redata = {
                        symbol: alltrade.s, tradeID: alltrade.t, quantity: alltrade.q, price: alltrade.p, time: alltrade.t, tradeType: alltrade.m == true ? 'buy' : 'sell'
                      }
                      var objs = {
                        symbol: redata.symbol,
                        tradeID: redata.tradeID,
                        amount: parseFloat(redata.quantity).toFixed(redistradepair.amount_decimal),
                        price: object.to_symbol == 'INR' ? parseFloat(redata.price * currrate1).toFixed(redistradepair.price_decimal) : parseFloat(redata.price).toFixed(redistradepair.price_decimal),
                        time: moment(new Date).format('MM-DD-YY'),
                        tradeType: redata.tradeType
                      }
                      tradeHisotys.push(objs);
                      if (tradeHisotys.length == 20) {
                        await client.hset('TradeHistory', object.to_symbol == 'INR' ? currlower : changelower, JSON.stringify(tradeHisotys));
                        tradeHisotys = []
                      }
                    }
                })
                } else {
                  client.hget('InternalTradeHistory',object.to_symbol == 'INR' ? currlower : changelower,async function(err,histlist){
                    if(!err && histlist !== null){
                      await client.hset('TradeHistory', object.to_symbol == 'INR' ? currlower : changelower, histlist);
                    }else{
                      BinanceExchangeWS.fetchInternalTradehistory(object.pair)
                    }
                  })
                }
              } else {
                BinanceExchangeWS.setTradepairRedis(object)
              }
            })
          })
          ws.on('error',async (error) => {
            //common.create_log(error,function(resp){});
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tradeHistory(object);
            }, 1000);
          })
          ws.on('disconnect',async function(){
            // BinanceExchangeWS.tradeHistory(object);
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tradeHistory(object);
            }, 1000);
          });
          ws.on('close',async function(){
            ws.close();
            setTimeout(() => {
              BinanceExchangeWS.tradeHistory(object);
            }, 1000);
          });
          ws.on('ping', (e) => { //listen for ping event
          // console.log('trade history ping message')
            heartbeat(ws)
            // common.create_log('trade history ping message',function(resp){});
            ws.pong(); //send pong frame
          });
          setInterval(() => {
            ws.close();
            BinanceExchangeWS.currentOrderBook('')
          }, 82800000);
        }
        // else
        // {
        //   //console.log("call latoken trade hisstory====")
        //   var tradeHisotys = [];
        //  // latoken_ws.connect({}, function(response){
        //     latoken_ws.subscribe("/v1/trade/"+object.from_pair_latoken+"/"+object.to_pair_latoken+"", function(resp){
        //       if (resp.body) {
        //         var result = JSON.parse(resp.body);
        //         var trades_data = result.payload;
        //         //console.log("trades====",result.payload);
        //         client.hget('tradepair', object.pair, async function (err, response) {
        //           if (response !== null) {
        //             var redistradepair = await JSON.parse(response)
        //             if (redistradepair.liquidity_status == 1) {
        //               client.hget('InternalTradeHistory',object.to_symbol == 'INR' ? currlower : changelower,async function(err,histlist){
        //                 if (!err && histlist) {
        //                   console.log("call history== 111")
        //                   var hstorylist = JSON.parse(histlist)

        //                   if(trades_data.length > 0)
        //                   {
        //                     for(var i=0;i<trades_data.length;i++)
        //                     {
        //                       var objs = {
        //                         symbol: object.pair,
        //                         tradeID: trades_data[i].id,
        //                         amount: parseFloat(trades_data[i].quantity).toFixed(redistradepair.amount_decimal),
        //                         price: object.to_symbol == 'INR' ? parseFloat(trades_data[i].price * currrate1).toFixed(redistradepair.price_decimal) : parseFloat(trades_data[i].price).toFixed(redistradepair.price_decimal),
        //                         time: moment(trades_data[i].timestamp).format('MM-DD-YY'),
        //                         tradeType: (trades_data[i].makerBuyer==true)?'buy':'sell',
        //                       }
        //                       tradeHisotys.push(objs);
        //                     }
        //                   }
        //                   console.log("tradeHisotys===",tradeHisotys);
                          
        //                   if (tradeHisotys.length > 0) {
        //                     var mergearr = [...tradeHisotys,...hstorylist]
        //                     await client.hset('TradeHistory', object.to_symbol == 'INR' ? currlower : changelower, JSON.stringify(mergearr));
        //                     tradeHisotys = []
        //                   }
        //                 } else {
        //                   console.log("call history== 222")
        //                   BinanceExchangeWS.fetchInternalTradehistory(object.pair)
        //                   if(trades_data.length > 0)
        //                   {
        //                     for(var i=0;i<trades_data.length;i++)
        //                     {
        //                       var objs = {
        //                         symbol: object.pair,
        //                         tradeID: trades_data[i].id,
        //                         amount: parseFloat(trades_data[i].quantity).toFixed(redistradepair.amount_decimal),
        //                         price: object.to_symbol == 'INR' ? parseFloat(trades_data[i].price * currrate1).toFixed(redistradepair.price_decimal) : parseFloat(trades_data[i].price).toFixed(redistradepair.price_decimal),
        //                         time: moment(trades_data[i].timestamp).format('MM-DD-YY'),
        //                         tradeType: (trades_data[i].makerBuyer==true)?'buy':'sell',
        //                       }
        //                       tradeHisotys.push(objs);
        //                     }
        //                   }
        //                   console.log("tradeHisotys===",tradeHisotys);
        //                   if (tradeHisotys.length > 0) {
        //                     await client.hset('TradeHistory', object.to_symbol == 'INR' ? currlower : changelower, JSON.stringify(tradeHisotys));
        //                     tradeHisotys = []
        //                   }
        //                 }
        //             })
        //             } else {
        //               client.hget('InternalTradeHistory',object.to_symbol == 'INR' ? currlower : changelower,async function(err,histlist){
        //                 if(!err && histlist !== null){
        //                   await client.hset('TradeHistory', object.to_symbol == 'INR' ? currlower : changelower, histlist);
        //                 }else{
        //                   BinanceExchangeWS.fetchInternalTradehistory(object.pair)
        //                 }
        //               })
        //             }
        //           } else {
        //             BinanceExchangeWS.setTradepairRedis(object)
        //           }
        //         })
        //       }
        //     })
        //   //});
        //   // latoken_ws.disconnect(function() {
        //   //   common.create_log('websocket disconnect error',function(resp){});
        //   //   ws.close();
        //   //   setTimeout(() => {
        //   //     BinanceExchangeWS.orderpicker(object);
        //   //   }, 1000);
        //   // })
        // }
        
      }
    } catch (error) {
      console.log('ERROR FROM tradeHistory:::', error);
      //common.create_log(error.message,function(resp){});
    }

  },

  fiatConversion:async(pair)=>{
    try {
      const requestConfig = {
        method: 'GET',
        url:'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr'
      };
      let response = await axios(requestConfig);
      if(response.data != null)
      {
        var fiatrate = response.data.tether.inr;
        return {status:true,fiatrate:fiatrate};
      }
      else
      {
        return {status:false};
      }
      
    } catch (error) {
      return {status:false};
    }
  
  },

  CurrencyConversion : async () =>{
    try {
      var currencies = await currencyDB.find({status:'Active'},{currencySymbol:1,coinType:1}).sort({popularOrder:1}).exec();
  
      var fiat_from = [];
      var fiat_to = ['BTC','USDT','INR'];
  
      if(currencies.length>0)
      {
        for(var i=0;i<currencies.length;i++)
        {
          fiat_from.push(currencies[i].currencySymbol);
          if(currencies[i].coinType=='2')
          {
            fiat_to.push(currencies[i].currencySymbol);
          }
        }
      }
      //var fiat_to = ['USDT','SHIB','INR','BTC']
      //console.log("fiat_to===",fiat_to);
      const requestConfig = {
        method: 'GET',
        // url: 'https://api.binance.com/api/v3/ticker/price', 
        url:'https://min-api.cryptocompare.com/data/pricemulti?fsyms='+fiat_from+'&tsyms='+fiat_to+'&api_key='+process.env.cryptocompare_api+''
      };
      try {
          let response = await axios(requestConfig);
          var inr_rate;
          var fiat_resp = await BinanceExchangeWS.fiatConversion();
           if(fiat_resp != null)
           {
             if(fiat_resp.status)
             {
               inr_rate = +fiat_resp.fiatrate;
             }
           }
          var result = {};
          var result = response.data;
          for(let d in result){
            result[d]["INR"] = parseFloat(result[d].USDT*inr_rate).toFixed(2)
          }
        //console.log("currency conversion data====",result);
          // result.RPT = {
          //   'BTC' :  '0.0043',
          //   'USDT':'100',
          //   'INR' : '8267.5'
  
          // }
  
          // result.RPTC = {
          //   'BTC' :  '0.0043',
          //   'USDT':'100',
          //   'INR' : '8267.5'
  
          // }
          
          // result.RWT = {
          //   'BTC' :  '0.00043',
          //   'USDT':'10',
          //   'INR' : '826.78'
  
          // }
  
          // result.NDB = {
          //   'BTC' :  '0.0000013',
          //   'USDT':'0.03',
          //   'INR' : '2.48'
  
          // }
          var sym = "ADVB";
          result[sym]= {
            'BTC' :  '0.0000262',
            'USDT': '0.74',
            'INR' : '61.02'
  
          }

          result.INR = {
            'USDT': 1 / inr_rate,
            'INR' : 1
          }
  
          client.hset('CurrencyConversion','allpair', JSON.stringify(result));
      } catch (err) {
          console.log(err.error);
      }
    } catch (error) {
      common.create_log(error.message,function(resp){});
    }
},
// CurrencyConversion : async () =>{
//   var currencies = await currencyDB.find({status:'Active'},{currencySymbol:1,coinType:1}).sort({popularOrder:1}).exec();

//   var fiat_from = [];
//   var fiat_to = ['BTC','USDT','INR'];

//   if(currencies.length>0)
//   {
//     for(var i=0;i<currencies.length;i++)
//     {
//       fiat_from.push(currencies[i].currencySymbol);
//       if(currencies[i].coinType=='2')
//       {
//         fiat_to.push(currencies[i].currencySymbol);
//       }
//     }
//   }
//   //var fiat_to = ['USDT','SHIB','INR','BTC']
//   //console.log("fiat_to===",fiat_to);
//   const requestConfig = {
//     method: 'GET',
//     // url: 'https://api.binance.com/api/v3/ticker/price', 
//     url:'https://min-api.cryptocompare.com/data/pricemulti?fsyms='+fiat_from+'&tsyms='+fiat_to+'&api_key='+process.env.cryptocompare_api+''
//   };
//   try {
//       let response = await axios(requestConfig);
//       var result = {};
//       var result = response.data;

//       if(currencies.length>0)
//       {
//         for(var i=0;i<currencies.length;i++)
//         {
//             //console.log("result====",result[currencies[i].currencySymbol]);
//             if(result[currencies[i].currencySymbol] == undefined)
//             {
//               console.log("undefined currencies====",currencies[i].currencySymbol)
//               var pairname = currencies[i].currencySymbol.toLowerCase()+'usdt';
//               var result_pair = await RedisService.hget("BINANCE-TICKERPRICE",pairname);
//               if (result_pair !== null) {
                  
//                 result[currencies[i].currencySymbol][USDT] = result_pair.lastprice.lastprice;
//               }
//               else
//               {
//                       var price_response = await RedisService.hget("GetTickerPrice",pairname.toLowerCase());
//                       if(price_response != null)
//                       {
//                         result[currencies[i].currencySymbol][USDT] = price_response.lastprice.lastprice;
//                       }
//                       else
//                       {
//                         result[currencies[i].currencySymbol][USDT] = currencies[i].coin_price;
//                       }
//               }
//             }
//             console.log("result====",result[currencies[i].currencySymbol]);
//         }
//       }
//     //console.log("currency conversion data====",result);

//       // result.RPT = {
//       //   'BTC' :  '0.0043',
//       //   'USDT':'100',
//       //   'INR' : '8267.5'

//       // }

//       // result.RPTC = {
//       //   'BTC' :  '0.0043',
//       //   'USDT':'100',
//       //   'INR' : '8267.5'

//       // }
      
//       // result.RWT = {
//       //   'BTC' :  '0.00043',
//       //   'USDT':'10',
//       //   'INR' : '826.78'

//       // }

//       // result.NDB = {
//       //   'BTC' :  '0.0000013',
//       //   'USDT':'0.03',
//       //   'INR' : '2.48'

//       // }

//       // result.MNT = {
//       //   'BTC' :  '0.00043',
//       //   'USDT':'10',
//       //   'INR' : '826.78'

//       // }

//       client.hset('CurrencyConversion','allpair', JSON.stringify(result));
//   } catch (err) {
//       console.log(err.error);
//   }
// },
currencyConversion:async(pair)=>{
  // try {
  //   const requestConfig = {
  //     method: 'GET',
  //     url:'https://min-api.cryptocompare.com/data/pricemulti?fsyms='+'USDT'+'&tsyms='+'INR'+'&api_key='+process.env.cryptocompare_api+''
  //   };
  //   let response = await axios(requestConfig);
  //   // console.log('----------',response.data.USDT.INR)
  //   currrate1 = response.data.USDT.INR;
  //       client.hset('CurrencyConversion','allpair', JSON.stringify(currrate1))
  // } catch (error) {
    
  // }

  try {
    const requestConfig = {
      method: 'GET',
      url:'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr'
    };
    let response = await axios(requestConfig);
    if(response.data != null)
    {
      var fiatrate = response.data.tether.inr;
      currrate1 = fiatrate;
      client.hset('CurrencyConversion','allpair', JSON.stringify(currrate1))
    }
    else
    {
    }
    
  } catch (error) {
  }

},

// reverseConversion:async(pair)=>{
//   try {
//     const requestConfig = {
//       method: 'GET',
//       url:'https://min-api.cryptocompare.com/data/pricemulti?fsyms='+'INR'+'&tsyms='+'USDT'+'&api_key='+process.env.cryptocompare_api+''
//     };
//     let response = await axios(requestConfig);
//     currrate = response.data.INR.USDT;
//         client.hset('ReverseConversion','allpair', JSON.stringify(currrate))
//   } catch (error) {
//     //common.create_log(error.message,function(resp){});
//   }

// },
reverseConversion:async(pair)=>{
  try {
    const requestConfig = {
      method: 'GET',
      url:'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr'
    };
    let response = await axios(requestConfig);
    if(response.data != null)
    {
      currrate = 1 / response.data.tether.inr;
      currrate = parseFloat(currrate).toFixed(3);
      client.hset('ReverseConversion','allpair', JSON.stringify(currrate))
    }
    
  } catch (error) {
    
  }

},
// fetchInternalTickers: async(pair)=>{
//   try {
//     var pair = pair;
//     var start = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
//     var end = new Date();
//     var options = [
//         {
//           "$match": {
//             //'pair': pair,
//             'pairName': pair,
//             //'$and':[{createddate:{$lte:end}},{createddate:{$gte:start}}],
//             'status': {$in:['filled','Partially']}
//           }
//       },
//       {$sort: {
//          "createddate":-1
//       }},
//         {
//             $group: {
//                 _id: {
//                     pairName: "$pairName"
//                 },
//                 highprice   : {$max: "$price"},
//                 lowprice   : {$min: "$price"},
//                 volume     : {$sum: "$amount"},
//                 open     : {$first: "$price"},
//                 close: {$last: "$price"},
//                 tradeType: {$first: "$tradeType"}
//             }
//         }
//     ];
  
//     orderDB.aggregate(options).exec(async function (error, data) {
//       if(data.length>0)
//       {       
//         var response = await data[0];
//         var price_change = response.open - response.close;
//         var change_percent = (response.open - response.close) / response.open * 100;
//         var lastobj = data.pop();
//         var resp = {
//           volume: response.volume,
//           highprice: response.highprice,
//           lowprice: response.lowprice,
//           price_change: price_change,
//           lastprice: {lastprice: response.open,tradeType:response.tradeType},
//           change_percent: change_percent,
//           pair: pair,
//           liquidity_status:0
//         }
//         client.hset('GetTickerPrice',pair,JSON.stringify(resp));
//       }
//       else
//       {
//         var pairdata = await tradePair.findOne({pair:pair});
//         var resp = {
//           volume: pairdata.volume_24h,
//           highprice: pairdata.highest_24h,
//           lowprice: pairdata.lowest_24h,
//           price_change: pairdata.changes_24h,
//           lastprice:{lastprice: pairdata.marketPrice,tradeType:''},
//           change_percent: pairdata.changes_24h,
//           pair: pair,
//           liquidity_status:0
//         }
//         client.hset('GetTickerPrice',pair,JSON.stringify(resp));
//       }
//     });
//   } catch (error) {
//     console.log("catch error===",error);
//   }
// },
fetchInternalTickers: async(pair)=>{
try {
  var pair = pair;
  var pair_detail = await tradePair.findOne({pair:pair});
  var start = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
  var end = new Date();
  var options = [
      {
        "$match": {
          'pair': pair,
          '$and': [
            { created_at: { $lte: end } }, { created_at: { $gte: start } }
          ],
        }
    },
    {$sort: {
       "created_at":-1
    }},
      {
          $group: {
              _id: {
                  pairName: "$pair"
              },
              highprice   : {$max: "$askPrice"},
              lowprice   : {$min: "$askPrice"},
              volume     : {$sum: "$askAmount"},
              open     : {$first: "$askPrice"},
              close: {$last: "$askPrice"},
              tradeType: {$first: "$type"}
          }
      }
  ];

  orderConfirmDB.aggregate(options).exec(async function (error, data) {
    if(data.length>0)
    {       
      var response = await data[0];
      var price_change = response.open - response.close;
      var change_percent = (response.open - response.close) / response.open * 100;
      var lastobj = data.pop();
      var resp = {
        volume: parseFloat(response.volume).toFixed(pair_detail.amount_decimal),
        highprice: parseFloat(response.highprice).toFixed(pair_detail.price_decimal),
        lowprice: parseFloat(response.lowprice).toFixed(pair_detail.price_decimal),
        price_change: parseFloat(price_change).toFixed(pair_detail.price_decimal),
        lastprice: {lastprice: parseFloat(response.open).toFixed(pair_detail.price_decimal),tradeType:response.tradeType},
        change_percent: parseFloat(change_percent).toFixed(2),
        pair: pair,
        liquidity_status:0
      }
      client.hset('GetTickerPrice',pair,JSON.stringify(resp));
    }
    else
    {

      var options = [
        {
          "$match": {
            'pair': pair
          }
      },
      {$sort: {
         "created_at":-1
      }},
        {
            $group: {
                _id: {
                    pairName: "$pair"
                },
                highprice   : {$max: "$askPrice"},
                lowprice   : {$min: "$askPrice"},
                volume     : {$sum: "$askAmount"},
                open     : {$first: "$askPrice"},
                close: {$last: "$askPrice"},
                tradeType: {$first: "$type"}
            }
        }
    ];
  
    var tickerdata = await orderConfirmDB.aggregate(options);

      var pairdata = await tradePair.findOne({pair:pair});
      var resp = {
        volume: parseFloat(pairdata.volume_24h).toFixed(pairdata.amount_decimal),
        highprice: parseFloat(pairdata.highest_24h).toFixed(pairdata.price_decimal),
        lowprice: parseFloat(pairdata.lowest_24h).toFixed(pairdata.price_decimal),
        price_change: parseFloat(pairdata.changes_24h).toFixed(pairdata.price_decimal),
        lastprice:{lastprice: (tickerdata.length > 0 && tickerdata[0].open != null)?parseFloat(tickerdata[0].open).toFixed(pairdata.price_decimal):parseFloat(pairdata.marketPrice).toFixed(pairdata.price_decimal),tradeType:''},
        change_percent: parseFloat(pairdata.changes_24h).toFixed(2),
        pair: pair,
        liquidity_status:0
      }
      client.hset('GetTickerPrice',pair,JSON.stringify(resp));
    }
  });
} catch (error) {
  console.log("catch error===",error);
  //common.create_log(error.message,function(resp){});
  callback(false);
}
},
fetchInternalTradehistory : async (pair)=>{
  try {
    var changelower = pair.replace('_','').toLowerCase()
    var filter = {
      pair : pair
    }  
    var pair_detail = await tradePair.findOne({pair:pair}); 
    orderConfirmDB.find(filter,{created_at:1,pair:1,seller_ordertype:1,type:1,askAmount:1,askPrice:1,total:1}).sort({'created_at': -1}).limit(20).exec(function(err,resp){
      if (resp && !err) {
        var trade_history = [];
        if(resp.length>0)
        {
          for(var i=0;i<resp.length;i++)
          {
            var pairsplit = resp[i].pair.split('_');
            var obj = {
              tradeID: resp[i].type == 'sell' ? resp[i].sellorderId : resp[i].buyorderId,
              time: moment(resp[i].created_at).format('MM-DD-YY'),
              symbol: pairsplit[0]+pairsplit[1],
              tradeType: resp[i].type,
              amount: parseFloat(resp[i].askAmount).toFixed(pair_detail.amount_decimal),
              price: parseFloat(resp[i].askPrice).toFixed(pair_detail.price_decimal),
              type: resp[i].type,
            }
            trade_history.push(obj);
          }
        }
        client.hset('InternalTradeHistory',changelower, JSON.stringify(trade_history));     
      }
    })
  } catch (error) {
    console.log(error);
    //common.create_log(error.message,function(resp){});
  }
},
}
module.exports = BinanceExchangeWS;

