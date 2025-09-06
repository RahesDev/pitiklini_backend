const WebSocket = require("ws");
const redis = require("redis");
var client = redis.createClient();
const axios = require("axios");
const redisHelper = require("../services/redis");
const tradePair = require("../schema/trade_pair");
const sitesettings = require("../schema/sitesettings");
const currencyDB = require("../schema/currency");
const { promisify } = require('util');
client.hgetAsync = promisify(client.hget).bind(client);
client.hsetAsync = promisify(client.hset).bind(client);


var moment = require("moment"); // require
var orderConfirmDB = require("../schema/confirmOrder");
var common = require("../helper/common");
var key = "";
var secret = "";
var currrate1 = "";
const ws_url = process.env.BINANCE_WS;

const tradeRedis = require("../tradeRedis/activeOrderRedis");

const orderPlaceDB = require("../schema/orderPlace");

apiget = () => {
    sitesettings
        .findOne({}, { binance_apikey: 1, binance_secretkey: 1 })
        .exec((err, data) => {
            if (!err && data) {
                key = data.binance_apikey;
                secret = data.binance_secretkey;
            }
        });
};
apiget();
const heartbeat = (ws) => {
    ws.isAlive = true;
    // console.log('heart beat=-=-')
};

const processOrderData = async (activeOrderDatas,object) => {
    const myasks = [],
        mybids = [];

    const redisTradePair = JSON.parse(await client.hgetAsync("tradepair", object.pair));
    // console.log("redisTradePair",redisTradePair.pair);
    // console.log("activeOrderDatas",activeOrderDatas.length)
    if (redisTradePair) {
        for (const order of activeOrderDatas) {
            if (order.pairName === object.pair) {
                const price = (parseFloat(order.price)).toFixed(redisTradePair.liq_price_decimal);
                const filledAmount = (parseFloat(order.filledAmount)).toFixed(redisTradePair.liq_amount_decimal);
                const total = (price * filledAmount).toFixed(redisTradePair.liq_price_decimal);
                if (order.tradeType === "buy") {
                    mybids.push([price, filledAmount, total]);
                } else if (order.tradeType === "sell") {
                    myasks.push([price, filledAmount, total]);
                }
            }
        }
        // console.log("myasks",myasks)
        // console.log("mybids",mybids)
        return { myasks, mybids };

    }
};

const BinanceExchangeWS = {
    currentOrderBook: async (symbol) => {
        BinanceExchangeWS.currencyConversion("obh");
        // BinanceExchangeWS.orderBook();
        tradePair.find({ status: "1" }).exec(function (err, tradepair) {
            if (tradepair) {
                for (let index = 0; index < tradepair.length; index++) {
                    var element = tradepair[index];
                    BinanceExchangeWS.setTradepairRedis(element);
                    BinanceExchangeWS.tradeHistory(element);
                    BinanceExchangeWS.orderpicker(element);
                    BinanceExchangeWS.tickerPrice(element);
                    // BinanceExchangeWS.tradingViewChart(element.pair);
                    // BinanceExchangeWS.myTrades(element.pair)
                }
            }
        });
    },

    setTradepairRedis: async (obj) => {
        await client.hset("tradepair", obj.pair, JSON.stringify(obj));
    },

    tickerPrice: async function (object) {
        try {
            const concatCur = object.from_symbol + object.to_symbol;
            const currLower = concatCur.toLowerCase();

            // For liquidity_status == 0
            if (object.liquidity_status == "0") {
                const updatePrice = async () => {
                    client.hget(
                        "GetTickerPrice",
                        object.pair,
                        async (err, tickerPrice) => {
                            if (tickerPrice) {
                                const priceList = JSON.parse(tickerPrice);
                                await client.hset(
                                    "BINANCE-TICKERPRICE",
                                    currLower,
                                    JSON.stringify(priceList)
                                );
                            } else {
                                BinanceExchangeWS.fetchInternalTickers(object.pair);
                            }
                        }
                    );
                };
                updatePrice(); // Fetch price immediately once
                setInterval(updatePrice, 5000); // Poll every second
            } else {
                let usdtToInrRate = 1;
                if (object.to_symbol == "INR") {
                    const tickerPrice = await client.hgetAsync("CurrencyConversion", "USDTINR");
                    // console.log("inr ticker price====",tickerPrice);
                    if (tickerPrice) {
                        usdtToInrRate = tickerPrice;
                    } else {
                        console.log("Currency conversion not found");
                    }
                }
                const replaceString =
                    object.to_symbol === "INR"
                        ? object.from_symbol + "USDT"
                        : object.pair.replace("_", "");

                const wsPair =
                    replaceString.toLowerCase() === "usdtusdt"
                        ? "busdusdt"
                        : replaceString.toLowerCase();

                const ws = new WebSocket(`${ws_url}${wsPair}@ticker`);

                ws.on("message", async (data) => {
                    if (!data) return;

                    const tickerPrice = JSON.parse(data);
                    client.hget("tradepair", object.pair, async (err, response) => {
                        if (!response) {
                            BinanceExchangeWS.setTradepairRedis(object);
                            return;
                        }

                        const redisTradePair = JSON.parse(response);
                        const checkPair = `${redisTradePair.from_symbol}USDT`;
                        const reData = {
                            volume: (tickerPrice.v * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal),
                            volumeto: (tickerPrice.q * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal),
                            highprice: (tickerPrice.h * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal), // Fixed here
                            lowprice: (tickerPrice.l * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal),
                            price_change: (tickerPrice.p * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal), // Fixed here
                            lastprice: {
                                lastprice: (tickerPrice.c * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal),
                                tradeType: "",
                            },
                            change_percent: tickerPrice.P,
                            pair: object.pair,
                            liquidity_status: redisTradePair.liquidity_status,
                        };

                        // console.log("ticker data===",reData);

                        await client.hset(
                            "BINANCE-TICKERPRICE",
                            currLower,
                            JSON.stringify(reData)
                        );

                        if (redisTradePair.liquidity_status == "1") {
                            const percentageChange = tickerPrice.P;
                            await client.hset("pair_movement", object.pair, percentageChange);
                        }
                        getTopAndLowMovers();
                    });
                });

                const handleError = (error) => {
                    common.create_log(error.message, () => { });
                    console.error("WebSocket Error:", error);
                };

                ws.on("error", handleError);
                ws.on("disconnect", () =>
                    handleError(new Error("WebSocket disconnect"))
                );
                ws.on("close", () => handleError(new Error("WebSocket closed")));

                // Implement ping/pong for heartbeat
                ws.on("ping", () => {
                    ws.pong();
                });

                // Schedule WebSocket closure
                setInterval(() => ws.close(), 82800000);
            }

            const getTopAndLowMovers = async () => {
                client.hgetall('pair_movement', async (err, data) => {
                    if (err) throw err;

                    const sortedPairs = Object.entries(data)
                        .map(([pair, change]) => ({ pair, change: parseFloat(change) }))
                        .sort((a, b) => b.change - a.change); // Sort by percentage change

                    const topMovers = sortedPairs.slice(0, 5); // Top 5 movers
                    const lowMovers = sortedPairs.slice(-5);   // Bottom 5 movers

                    const result = {
                        'topMovers': topMovers,
                        'lowMovers': lowMovers
                    };

                    // Convert the result object to a JSON string
                    await client.hset("topmove", "allpair", JSON.stringify(result));

                    // Optionally, send this data to frontend
                });
            };

            // setInterval(getTopAndLowMovers, 10000); // Every 1 minute


        } catch (error) {
            console.error("Error fetching ticker price:", error);
            common.create_log(error.message, () => { });
        }
    },

    fetchInternalTickers: async (pair) => {
        try {
            const start = new Date(Date.now() - 24 * 60 * 60 * 1000); // Start time for 24 hours ago
            const end = new Date(); // Current time
            const last24HoursOptions = [
                {
                    $match: {
                        pair: pair,
                        created_at: { $gte: start, $lte: end },
                    },
                },
                {
                    $sort: { created_at: -1 },
                },
                {
                    $group: {
                        _id: "$pair",
                        highprice: { $max: "$askPrice" },
                        lowprice: { $min: "$askPrice" },
                        volume: { $sum: "$askAmount" },
                        open: { $first: "$askPrice" },
                        close: { $last: "$askPrice" },
                        tradeType: { $first: "$type" },
                    },
                },
            ];

            // Perform the first aggregation
            const data = await orderConfirmDB.aggregate(last24HoursOptions).exec();

            // Check if data exists
            if (data.length > 0) {
                const response = data[0];
                const price_change = response.open - response.close;
                const change_percent = (price_change / response.open) * 100;

                const resp = {
                    volume: response.volume,
                    highprice: response.highprice,
                    lowprice: response.lowprice,
                    price_change: price_change,
                    lastprice: {
                        lastprice: response.open,
                        tradeType: response.tradeType,
                    },
                    change_percent: change_percent,
                    pair: pair,
                    liquidity_status: 0,
                };

                // Cache the response and return it immediately
                await client.hset("GetTickerPrice", pair, JSON.stringify(resp));
                return resp;
            }

            // Fallback aggregation if no data found in the last 24 hours
            const fallbackOptions = [
                { $match: { pair: pair } },
                { $sort: { created_at: -1 } },
                {
                    $group: {
                        _id: "$pair",
                        highprice: { $max: "$askPrice" },
                        lowprice: { $min: "$askPrice" },
                        volume: { $sum: "$askAmount" },
                        open: { $first: "$askPrice" },
                        close: { $last: "$askPrice" },
                        tradeType: { $first: "$type" },
                    },
                },
            ];

            // Use Promise.all to fetch both fallback ticker data and pair data in parallel
            const [tickerdata, pairdata] = await Promise.all([
                orderConfirmDB.aggregate(fallbackOptions).exec(),
                tradePair.findOne({ pair: pair }),
            ]);

            // Prepare fallback response
            const resp = {
                volume: pairdata.volume_24h,
                highprice: pairdata.highest_24h,
                lowprice: pairdata.lowest_24h,
                price_change: pairdata.changes_24h,
                lastprice: {
                    lastprice:
                        tickerdata.length > 0 && tickerdata[0].open != null
                            ? tickerdata[0].open
                            : pairdata.marketPrice,
                    tradeType: "",
                },
                change_percent: pairdata.changes_24h,
                pair: pair,
                liquidity_status: 0,
            };

            await client.hset("GetTickerPrice", pair, JSON.stringify(resp));
            return resp;
        } catch (error) {
            console.error("Error fetching tickers:", error);
            common.create_log(error.message, () => { });
            throw new Error("Failed to fetch tickers"); // Throw an error for further handling
        }
    },

    tradeHistory: async (object) => {
        try {
            const currLower =
                object.to_symbol === "INR"
                    ? `${object.from_symbol}inr`.toLowerCase()
                    : `${object.from_symbol}${object.to_symbol}`.toLowerCase();

            const changeLower =
                object.to_symbol === "INR"
                    ? `${object.from_symbol}USDT`.toLowerCase()
                    : currLower;

            const wsURL = `${ws_url}${changeLower}@trade`;

            if (object.liquidity_status === "0") {
                setInterval(async () => {
                    const histList = await client.hget(
                        "InternalTradeHistory",
                        changeLower
                    );
                    if (histList) {
                        await client.hset("TradeHistory", changeLower, histList);
                    } else {
                        await BinanceExchangeWS.fetchInternalTradehistory(object.pair);
                    }
                }, 5000);
            } else {
                const ws = new WebSocket(wsURL);
                let tradeHistories = [];

                ws.on("message", async (data) => {
                    const allTrade = JSON.parse(data);
                    const redisTradePair = JSON.parse(await client.hgetAsync("tradepair", object.pair));

                    if (redisTradePair) {
                        let histList = await client.hgetAsync("InternalTradeHistory", object.to_symbol === "INR" ? currLower : changeLower);

                        if (!histList) {
                            await BinanceExchangeWS.fetchInternalTradehistory(object.pair);
                        }



                        const tradeData = {
                            symbol: allTrade.s,
                            tradeID: allTrade.t,
                            quantity: allTrade.q,
                            price: allTrade.p,
                            time: allTrade.T,
                            tradeType: allTrade.m ? "sell" : "buy",
                        };

                        // console.log("trade history data===",tradeData);

                        let usdtToInrRate = 1;

                        if (object.to_symbol == "INR") {
                            
                            const tickerPrice = await client.hgetAsync("CurrencyConversion", "USDTINR");
                            // console.log("inr ticker price====",tickerPrice);
                            if (tickerPrice) {
                                usdtToInrRate = tickerPrice;
                            } else {
                                console.log("Currency conversion not found");
                            }
                        }

                        const tradeEntry = {
                            symbol: tradeData.symbol,
                            tradeID: tradeData.tradeID,
                            amount: parseFloat(tradeData.quantity).toFixed(redisTradePair.amount_decimal),
                            price:
                                object.to_symbol === "INR"
                                    ? parseFloat(tradeData.price * usdtToInrRate).toFixed(redisTradePair.price_decimal)
                                    : parseFloat(tradeData.price).toFixed(redisTradePair.price_decimal),
                            time: moment(tradeData.time).format("lll"),
                            tradeType: tradeData.tradeType,
                        };



                        tradeHistories.push(tradeEntry);
                        if (tradeHistories.length >= 10) {
                            let mergedHistories = tradeHistories;

                            if (histList) {
                                try {
                                    const parsedHistList = JSON.parse(histList);
                                    if (Array.isArray(parsedHistList)) {
                                        mergedHistories = [...tradeHistories, ...parsedHistList];
                                    }
                                } catch (error) {
                                    console.error("Error parsing histList:", error);
                                }
                            }

                            await client.hsetAsync("TradeHistory", object.to_symbol === "INR" ? currLower : changeLower, JSON.stringify(mergedHistories));
                            tradeHistories = [];
                        }
                    } else {
                        await BinanceExchangeWS.setTradepairRedis(object);
                    }
                });


                const handleError = (error) => {
                    common.create_log(error.message, () => { });
                    console.error("WebSocket Error:", error);
                };
                ws.on("error", handleError);
                ws.on("disconnect", handleError);
                ws.on("close", handleError);
                ws.on("ping", (e) => {
                    heartbeat(ws);
                    ws.pong();
                });

                setInterval(() => {
                    ws.close();
                    BinanceExchangeWS.currentOrderBook("");
                }, 82800000);
            }
        } catch (error) {
            console.error("ERROR FROM tradeHistory:::", error);
            common.create_log(error.message, () => { });
        }
    },

    fetchInternalTradehistory: async (pair) => {
        try {
            const changeLower = pair.replace("_", "").toLowerCase();
            const filter = { pair: pair };


            // Fetch the last 20 trades
            const resp = await orderConfirmDB
                .find(filter, {
                    created_at: 1,
                    pair: 1,
                    seller_ordertype: 1,
                    type: 1,
                    askAmount: 1,
                    askPrice: 1,
                    total: 1,
                })
                .sort({ created_at: -1 })
                .limit(20)
                .exec();
            if (resp && resp.length > 0) {
                const tradeHistory = resp.map((trade) => {
                    const [fromSymbol, toSymbol] = trade.pair.split("_");
                    return {
                        tradeID:
                            trade.type === "sell" ? trade.sellorderId : trade.buyorderId,
                        time: moment(trade.created_at).format("lll"),
                        symbol: `${fromSymbol}${toSymbol}`,
                        tradeType: trade.type,
                        amount: parseFloat(trade.askAmount).toFixed(4),
                        price: parseFloat(trade.askPrice).toFixed(4),
                        type: trade.type,
                    };
                });

                await client.hset(
                    "InternalTradeHistory",
                    changeLower,
                    JSON.stringify(tradeHistory)
                );
            }
        } catch (error) {
            console.error("Error fetching internal trade history:", error);
            common.create_log(error.message, () => { });
        }
    },

    orderpicker: async (object) => {
        try {
            let usdtToInrRate = 1; // Default rate
            let changelower = "";
            let currlower = "";

            // If the target symbol is INR, fetch the USDT-INR conversion rate
            if (object.to_symbol === "INR") {
                const concatcur =
                    `${object.from_symbol}${object.to_symbol}`.toLowerCase();
                currlower = concatcur;
                changelower = `${object.from_symbol}usdt`.toLowerCase();

                const tickerPrice = await client.hgetAsync("CurrencyConversion", "USDTINR");

            //    console.log("inr ticker price====",tickerPrice);
                if (tickerPrice) {
                    usdtToInrRate = tickerPrice;
                } else {
                    console.log("Currency conversion not found");
                }

            } else {
                changelower = `${object.from_symbol}${object.to_symbol}`.toLowerCase();
                currlower = `${object.from_symbol}${object.to_symbol}`.toLowerCase();
            }

            // console.log("currlower",currlower);
            // console.log("changelower",changelower);

            
            // Liquidity check
            if (object.liquidity_status == "0") {

                //console.log("liquidity off mode pair====",object.pair);

                const updateOrder = async () => {

                const activeOrderDatas = await redisHelper.RedisService.get(
                    "site_activeOrders"
                );
                
                if (activeOrderDatas?.length > 0) {
                    
                    // console.log("liquidity off mode====",activeOrderDatas);
                    let myasks = [];
                    let mybids = [];

                     for (const order of activeOrderDatas) {
                        //console.log("order.pairName",order.pairName);
                        if (order.pairName == object.pair) {
                            const price = (parseFloat(order.price)).toFixed(object.liq_price_decimal);
                            const filledAmount = (parseFloat(order.filledAmount)).toFixed(object.liq_amount_decimal);
                            const total = (price * filledAmount).toFixed(object.liq_price_decimal);
                            if (order.tradeType === "buy") {
                                mybids.push([price, filledAmount, total]);
                            } else if (order.tradeType === "sell") {
                                myasks.push([price, filledAmount, total]);
                            }
                        }
                    }

                    // console.log("myasks",myasks);
                    // console.log("mybids",mybids);
                    await client.hset(
                        "BINANCE-ORDERBOOK",
                        currlower,
                        JSON.stringify({ asks: myasks, bids: mybids, symbol: object.pair })
                    );
                }
                else
                {
                    await client.hset(
                        "BINANCE-ORDERBOOK",
                        currlower,
                        JSON.stringify({ asks: [[]], bids: [[]], symbol: object.pair })
                    );
                    return;
                }

               
              }
              setInterval(updateOrder,5000)
            } else {
                const levels = 20;
                const ws = new WebSocket(
                    `${ws_url}${changelower}@depth${levels}@100ms`
                );

                ws.on("message", async (data) => {
                    if (data) {
                        const orderbook = JSON.parse(data);
                        const spreadPercentage = 0.01; // 1% spread

                        // Fetch trade pair details from Redis
                        const redisTradePair = JSON.parse(await client.hgetAsync("tradepair", object.pair));

                        if (redisTradePair) {
                            const finalasks = orderbook.asks.map(([price, amount]) => [
                                (parseFloat(price) * (1 + spreadPercentage) * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal),
                                parseFloat(amount).toFixed(redisTradePair.liq_amount_decimal),
                                (parseFloat(price) * parseFloat(amount) * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal),
                            ]);

                            const finalbids = orderbook.bids.map(([price, amount]) => [
                                (parseFloat(price) * (1 + spreadPercentage) * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal),
                                parseFloat(amount).toFixed(redisTradePair.liq_amount_decimal),
                                (parseFloat(price) * parseFloat(amount) * usdtToInrRate).toFixed(redisTradePair.liq_price_decimal),
                            ]);

                            // Fetch active orders
                            const activeOrderDatas = await redisHelper.RedisService.get("site_activeOrders");

                            if (activeOrderDatas) {
                                // Process the active orders and extract myasks and mybids
                                const { myasks = [], mybids = [] } = await processOrderData(activeOrderDatas,object) || {};

                                // Push additional data if available
                                finalasks.push(...myasks);
                                finalbids.push(...mybids);
                            }

                            // Sort asks and bids
                            finalasks.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
                            finalbids.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));

                            const redata = {
                                asks: finalasks,
                                bids: finalbids,
                                symbol: object.pair,
                            };

                            // console.log("orderbook data===",redata);

                            // Save updated order book data
                            await client.hset("BINANCE-ORDERBOOK", currlower || changelower, JSON.stringify(redata));

                        } else {
                            await BinanceExchangeWS.setTradepairRedis(object);
                        }
                    }
                });


                ws.on("error", (error) => {
                    console.error("WebSocket error:", error);
                });
            };

         
        } catch (err) {
            console.error("Error in orderpicker:", err);
        }
    },

    currencyConversion: async () => {
        console.log("currency converstions");
        try {
            const requestConfig = {
                method: "GET",
                url: "https://min-api.cryptocompare.com/data/pricemulti?fsyms=USDT&tsyms=INR&api_key="+process.env.cryptocompare_api_1,
            };
            let response = await axios(requestConfig);
            // console.log("currency conversion response===",response);
            if (response && response.data && response.data.USDT) {
                // console.log("currency conversion response 11===",response.data.USDT);
                const usdtInrRate = response.data.USDT.INR;
                // console.log("currency usdtInrRate===",usdtInrRate);
                if (usdtInrRate) {
                    await client.hset(
                        "CurrencyConversion",
                        "USDTINR",
                        JSON.stringify(usdtInrRate)
                    );
                    //  console.log("Updated USDT to INR rate:", usdtInrRate);
                } else {
                    console.error("USDT-INR rate not found in the API response");
                }
            } else {
                console.error("Invalid response from API");
            }
        } catch (error) {
            console.error("Error fetching currency conversion:", error);
        }
    },
};

module.exports = BinanceExchangeWS;
