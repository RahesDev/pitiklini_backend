const socketio = require("socket.io");
// const redis = require("redis");
// client = redis.createClient();
const activeOrderRedis = require('../../tradeRedis/activeOrderRedis');
const notifydb = require("../../schema/notification");
var common = require("../../helper/common");

const redis = require("async-redis");
redisclient = redis.createClient();

const TradePair = require('../../schema/currency');


const {
	addUser,
	getSocketId,
	removeUser,
	updateLastSeen,
	getLastSeen,
} = require("./socketFunction");
let io = null;

const startSocket = (app) => {
	try {
		//  console.log("Starting------------------------");
		//  console.log("Starting socket",);
		io = socketio(app, { cors: { origin: '*' }, transports: ['websocket', 'polling'], pingInterval: 60000, pingTimeout: 25000, allowEIO3: true });
		io.use((socket, next) => {
			let user_id = socket.handshake.query.user_id;
			if (user_id) {
				socket.user_id = user_id;

				return next();
			} else {
				socket.disconnect("unauthorized");
			}
		});

		io.use(async (socket, next) => {
			await addUser({ user_id: socket.user_id, id: socket.id }, "USER");
			await updateLastSeen(socket.user_id, 1);
			next();
		});

		global.socketconnect = io;

		io.on('connection', function (socket) {
			let refreshIntervalId = null;
			let refreshtradehistorynterval = null;
			let refreshtickerpriceInterval = null;
			let refreshHomepageMarketInterval = null;
			socket.on("GetOrderBook", async (data) => {
				console.log('call socket order book====',data);
				const redisData = await getSocketId(socket.user_id, "USER");

				console.log("GetOrderBook", redisData);
				clearInterval(refreshIntervalId);
				clearInterval(refreshtradehistorynterval);
				refreshIntervalId = setInterval(async function () {
					client.hget('BINANCE-ORDERBOOK', data.symbol, async function (err, value) {
						let response = await JSON.parse(value)
						if (response != null) {
							if (redisData && redisData.status) {

								redisData.id.forEach((item) =>
									io.sockets.to(item).emit("OrderBook", {
										to: socket.user_id,
										data: response
									})
								);
							}
						}
						else {
							activeOrderRedis.activeOrdersSet();
						}

					});
					client.hget('BINANCE-TICKERPRICE', data.symbol, async function (err, tickval) {
						let tickresponse = await JSON.parse(tickval)
						if (redisData && redisData.status) {

							// //  console.log(tickresponse, "tickresponse");
							redisData.id.forEach((item) =>
								io.sockets.to(item).emit("TickerPrice", {
									to: socket.user_id,
									data: tickresponse
								})
							);
						}
					});

					client.hget('topmove', "allpair", async function (err, tickval) {
						let tickresponse = await JSON.parse(tickval)

						if (redisData && redisData.status) {

							redisData.id.forEach((item) =>
								io.sockets.to(item).emit("TOPMOVE", {
									to: socket.user_id,
									data: tickresponse
								})
							);
						}
					});


					client.hget('TradeHistory', data.symbol, async function (err, value) {
						// return false;
						let response = await JSON.parse(value)
						if (redisData && redisData.status) {
							redisData.id.forEach((item) =>
								io.sockets.to(item).emit("TradeHistory", {
									to: socket.user_id,
									data: response
								})
							);
						}
					})

				}, 1000)


			}),
				socket.on("GetTickerPrice", async (data) => {
					clearInterval(refreshtickerpriceInterval)
					const redisData = await getSocketId(socket.user_id, "USER");
					refreshtickerpriceInterval = setInterval(async function () {
						client.hgetall('BINANCE-TICKERPRICE', async function (err, value) {
							if (redisData && redisData.status) {
								redisData.id.forEach((item) =>
									io.sockets.to(item).emit("DashTickerPrice", {
										to: socket.user_id,
										data: value
									})
								);
							}
						});
					}, 1000)
				})

				socket.on("GetTickerPrice_market", async (data) => {
					const redisData = await getSocketId(socket.user_id, "USER");
					const alltickers = await redisclient.hgetall('BINANCE-TICKERPRICE');
					
					const tickers_response = JSON.parse(JSON.stringify(alltickers));
					const alltickers_resp = Object.values(tickers_response).map(item => JSON.parse(item));
					

					const startWithPair = "PTK_USDT";

					const alltickers_response = alltickers_resp.sort((a, b) => {
					if (a.pair === startWithPair) return -1; // Move `startWithPair` to the beginning
					if (b.pair === startWithPair) return 1;  // Move other pairs after `startWithPair`
					return a.pair.localeCompare(b.pair);    // Sort remaining pairs alphabetically
					});

					console.log("alltickers_response====",alltickers_response);

					if (redisData && redisData.status) {
						const tradePairs = await TradePair.find(
							{ status: "Active" },
							{ Currency_image: 1, currencySymbol: 1, _id: 0 }
						).sort({popularOrder:1});
	
						// Create a mapping of symbols to images for efficient lookup
						const currencyImageMap = tradePairs.reduce((map, pair) => {
							map[pair.currencySymbol] = pair.Currency_image;
							return map;
						}, {});
	
						// Add the Currency_image to each item in alltickers_response
						const updatedTickersResponse = alltickers_response.map((ticker) => {
							const currencySymbol = ticker.pair.split('/')[0]; // Extract base currency
							return {
								...ticker,
								Currency_image: currencyImageMap[currencySymbol] || null, // Add image or null if not found
							};
						});
	
	
						console.log(updatedTickersResponse, "updatedTickersResponse")
	
						// Emit updated response
						redisData.id.forEach((item) =>
							io.sockets.to(item).emit("DashTickerPrice_market", {
								to: socket.user_id,
								data: updatedTickersResponse,
							})
						);
					}
				});
			socket.on("homepagemarketprice", async (data) => {
				clearInterval(refreshHomepageMarketInterval)
				refreshHomepageMarketInterval = setInterval(async function () {
					client.hget('CurrencyConversion', 'allpair', async function (err, value) {
						let response = await JSON.parse(value)
						if (redisData && redisData.status) {
							redisData.id.forEach((item) =>
								io.sockets.to(item).emit("gethomemarketprice", {
									to: socket.user_id,
									data: response
								})
							);
						}
					})
				}, 1000)
			});

			socket.on("getnotifications", async (data) => {
				const originalData = common.decrypt(socket.user_id);
				console.log(socket.user_id, "Original Data:", originalData);
				if(originalData != ""){
				console.log("getnotifications");
				clearInterval(refreshHomepageMarketInterval)
				refreshHomepageMarketInterval = setInterval(async function () {

					// const originalData = common.decrypt(socket.user_id);
					// console.log(socket.user_id, "Original Data:", originalData);
				
					const notifications = await notifydb
						.find({ to_user_id: originalData })
						.sort({ _id: -1 })
						.exec();

					const status = await notifydb
						.find({ status: 0, to_user_id: originalData })
						.count();

					socket.emit("updatenotifications", {
						to: socket.user_id,
						data: {
							"notification": notifications,
							"status": status
						},
					});
				}, 1000)
				}
			});




			socket.on("disconnect", async () => {
				try {
					clearInterval(refreshIntervalId);
					clearInterval(refreshtradehistorynterval);
					clearInterval(refreshtickerpriceInterval);
					clearInterval(refreshHomepageMarketInterval);
					await removeUser(socket.user_id, socket.id, "USER");
					await updateLastSeen(socket.user_id, 0);
				} catch (err) {
				}
			});
		})
	} catch (error) {
		console.log('ERROR FROM startSocket::::', error);
	}

};

const getSocket = () => io;

module.exports = {
	startSocket,
	getSocket
};