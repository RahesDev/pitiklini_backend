const mongoose = require('mongoose');
const orderPlaceDB = require('../schema/orderPlace');
const ObjectId = mongoose.Types.ObjectId;
const confirmOrderDB = require('../schema/confirmOrder');
const profitDb = require('../schema/profit');
const common = require('../helper/common');
const binance = require('../exchanges/binance');
const orderType = require('../cryptoExchange/orderTypenew');

const redisHelper = require('../services/redis');



let stopOrderCheckPriceLimit = exports.stopOrderCheckPriceLimit = async function (callback) {

    try {

        let stopData = await redisHelper.RedisService.hgetall('stopOrderDatas');

        if (stopData == null) {
            // console.log('EMPTY ARRY');
            var openOrderDatas = await orderPlaceDB.find({ 'status': 'stop' });
            for (var i = 0; i < openOrderDatas.length; i++) {
                let stopData = await redisHelper.RedisClient.hset('stopOrderDatas', openOrderDatas[i]._id.toString(), JSON.stringify(openOrderDatas[i]));
            }
        } else {
            let redisData = await redisHelper.RedisService.hgetall('stopOrderDatas');
            // console.log('DATAS COMMING');
        }

        if (stopData) {
            for (var i = 0; i < stopData.length; i++) {
                var checkPriceLimit = await redisHelper.RedisService.hget('MarketPriceData', stopData[i].liquidity_name);
                if (checkPriceLimit) {
                    if (+checkPriceLimit.ticker <= stopData[i].stoporderprice) {
                        // console.log('comitnorder check');
                        await orderPlaceDB.updateOne({ _id: stopData[i]._id }, { status: "Active" });
                        let redisData = await redisHelper.RedisService.hdel('stopOrderDatas', stopData[i]._id);
                        let getPairdata = await common.pairUpdateToRedis(pair);
                        orderType.stopOrderPlace(stopData[i], getPairdata);
                        // Socket function //

                    } else {
                        //  console.log('-----');
                    }
                }
            }
        } else {
            // console.log('Have a no datas in stopOrderDatas REDIS')
        }

    } catch (error) {
        console.log('Error From stopOrderSetToRedis:::', error);
    }

}

let stopOrderSetToRedis = exports.stopOrderSetToRedis = async function (limitOrderData, pairdData, callback) {
    try {

        let stopData = await redisHelper.RedisClient.hset('stopOrderDatas', limitOrderData._id, limitOrderData);
        if (stopData) {
            let stopData1 = await redisHelper.RedisClient.hgetall('stopOrderDatas');
        } else {
            console.log('[][][][[]');
        }

    } catch (error) {
        console.log('SOMETHING WENT WRONG stopOrderSetToRedis ::: stopOrderSetToRedis', error);
    }

}