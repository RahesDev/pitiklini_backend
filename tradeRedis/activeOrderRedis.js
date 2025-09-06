
const mongoose = require('mongoose');
const orderPlaceDB = require('../schema/orderPlace');
const ObjectId = mongoose.Types.ObjectId;

const redisHelper = require('../services/redis');
const launchPadDB = require('../schema/launchPad');
const { RedisService } = require("../services/redis");

// let activeOrders = exports.activeOrdersSet = async function(){
//         try {
//             let getOrders = await orderPlaceDB.find({$or:[{status:'Active'},{status:'partially'}]});
//             if(getOrders){
//                 let activeData = await redisHelper.RedisClient.set('site_activeOrders',  JSON.stringify(getOrders));
//                 // binance.currentOrderBook()
//                 if(activeData){
//                     let get = await redisHelper.RedisClient.get('site_activeOrders');
//                 }
//             }
//         } catch (error) {
//             console.log('SOMETHING WENT WRONG stopOrderSetToRedis ::: stopOrderSetToRedis',error);
//         }

//     }

// let activeOrders = exports.activeOrdersSet = async function () {
//     try {
//         console.log("*****call redis******")
//         let getBidOrders = await orderPlaceDB.find({ tradeType: 'buy', $or: [{ status: 'Active' }, { status: 'partially' }, { status: 'stop' }] }).populate('pairId', 'price_decimal amount_decimal').sort({ _id: -1 });
//         console.log("getBidOrders", getBidOrders);
//         let getAskOrders = await orderPlaceDB.find({ tradeType: 'sell', $or: [{ status: 'Active' }, { status: 'partially' }, { status: 'stop' }] }).populate('pairId', 'price_decimal amount_decimal').sort({ _id: -1 });
//         console.log("getAskOrders", getAskOrders);
//         var result = [...getBidOrders, ...getAskOrders]
//         if (result) {
//             let activeData = await redisHelper.RedisClient.set('site_activeOrders', JSON.stringify(result));
//             if (activeData) {
//                 let get = await redisHelper.RedisClient.get('site_activeOrders');
//             }
//         }
//     } catch (error) {
//         console.log('SOMETHING WENT WRONG stopOrderSetToRedis ::: stopOrderSetToRedis', error);
//     }

// }

let activeOrders = exports.activeOrdersSet = async function () {
    try {

        // Fetch buy orders (bid)
        let getBidOrders = await orderPlaceDB.find({
            tradeType: 'buy',
            $or: [{ status: 'Active' }, { status: 'partially' }, { status: 'stop' }]
        }).populate('pairId', 'price_decimal amount_decimal').sort({ _id: -1 });

        //console.log("active getBidOrders",getBidOrders)

        // Fetch sell orders (ask)
        let getAskOrders = await orderPlaceDB.find({
            tradeType: 'sell',
            $or: [{ status: 'Active' }, { status: 'partially' }, { status: 'stop' }]
        }).populate('pairId', 'price_decimal amount_decimal').sort({ _id: -1 });

        //console.log("active getAskOrders",getAskOrders)

        // Combine buy and sell orders
        var result = [...getBidOrders, ...getAskOrders];

        //console.log("active result",result)

        if (result) {
            // Save active orders in Redis
            let activeData = await redisHelper.RedisClient.set('site_activeOrders', JSON.stringify(result));
            if (activeData) {
                let get = await redisHelper.RedisClient.get('site_activeOrders');
            }
        }
    } catch (error) {
        console.log('SOMETHING WENT WRONG stopOrderSetToRedis ::: stopOrderSetToRedis', error);
    }
}

let setRedisForLaunchpad = exports.setRedisForLaunchpad = async function () {
    try {
        console.log('=-====-=approved==-=-=-=-');
        let getLaunchPad = await launchPadDB.find({ status: 1 }).exec();
        if (getLaunchPad) {
            await RedisService.hset('launchpadTokens', "active_approved", JSON.stringify(getLaunchPad));
        }


    } catch (error) {
        console.log('SOMETHING WENT WRONG stopOrderSetToRedis ::: stopOrderSetToRedis', error);
    }

}