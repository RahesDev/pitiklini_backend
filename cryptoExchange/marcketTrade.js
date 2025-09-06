var express             = require('express');
var router              = express.Router();
var common              = require('../helper/common');
var redisHelper         = require('../redis-helper/redisHelper');
var tradePairDB         = require('../schema/trade_pair');
var orderPlaceDB        = require('../schema/orderPlace')
var mongoose            = require('mongoose');
var orderConfirmDB      = require('../schema/confirmOrder');
var socket              = require('../services/socket/socket');
var tradePairDB         = require('../schema/trade_pair');
var moment              = require('moment');



router.post('/getMarketTrades', async (req,res) => {
    try{
        if(req.body.pair != "" && req.body.pair != undefined && req.body.pair !== null ){
            let tradeData = await orderConfirmDB.find({ pair : req.body.pair }).sort({_id : -1}).limit(20);
            if(tradeData){
                var marketArray = []
                for(var i=0; i< tradeData.length; i++){
                    var obj = {
                        amount : parseFloat(tradeData[i].askAmount).toFixed(4),
                        price  : parseFloat(tradeData[i].askPrice).toFixed(4),
                        time   : moment(tradeData[i].created_at).format('MM-DD-YYYY'),
                        type   : tradeData[i].type
                    }
                    marketArray.push(obj);
                }
                return res.json({status : true, Message : marketArray });
            }else{
                return res.json({status : true, Message : [] });
            }
        }else{
        return res.json({status : false, Message : []})
        }
    }
    catch(e){
        return res.json({status : false, Message : "Internal server error"})
    }
});



module.exports = router;
