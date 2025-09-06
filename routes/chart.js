var express = require('express');
var router = express.Router();
var symbolsDatabase = require("../services/tradeview/symbols_database");
var RequestProcessor = require("../services/tradeview/request-processor").RequestProcessor;
var requestProcessor = new RequestProcessor(symbolsDatabase);
var url = require('url');
var tradePairDB = require('../schema/trade_pair');
// var https = require('https');
var https = require('http');
var orderDB = require('../schema/orderPlace');
const redis = require("redis");
client = redis.createClient();
var request = require("request");
var confirmOrder = require('../schema/confirmOrder');
var common = require('../helper/common');

var currate = 1
client.hget('ReverseConversion', 'allpair', async function(err, value) {
    currate= value;
})

router.get('/chart/:config', (req, res) => {
    try {
        var uri = url.parse(req.url, true);
        var action = uri.pathname;
        symbolsDatabase.initGetAllMarketsdata();
        switch (action) {
            case '/chart/config':
                action = '/config';
                break;
            case '/chart/time':
                action = '/time';
                break;
            case '/chart/symbols':
                action = '/symbols';
                break;
            case '/chart/history':
                action = '/history';
                break;
        }
        return requestProcessor.processRequest(action, uri.query, res);
    }
    catch (err) {
        console.log('====================chart/:config catch====================');
        console.log(err);
    }
});

router.get('/markets', (req, res) => {
    try {
        common.redisPairsConfig(function(pairs){
            res.json(pairs);
        });		
    } catch (err) {
        console.log('====================markets catch====================');
        console.log(err);    
        res.json(err);
    }
});

// router.get('/chartData', (req, res) => {
//     try {
//         var url_parts = url.parse(req.url, true);
//         var query = url_parts.query;
//         var pair = req.query.market;
//         var start_date = req.query.start_date;
//         //var end_date = req.query.end_date;
//         //console.log("start_datestart_date",start_date);;
//         var end_date = Math.floor(new Date(Date.now()).getTime()/1000);
//       // console.log("end_dateend_dateend_date",end_date);
//         var resolution = req.query.resolution;
//         if(+resolution > 0 && +resolution <= 720){
//             resolution = +resolution;
//         }
//         else{
//             resolution = 1;
//         }
//         var spl = pair.split("_");
//         var first = spl[0];
//         var second = spl[1];
//         var pair_name = spl[0] + '/' + spl[1];
//         var pattern = /^([0-9]{4})\-([0-9]{2})\-([0-9]{2})$/;
//         if (start_date) {
//             // if (!pattern.test(start_date)) {
//             // 	return res.json({ "message": "Start date is not a valid format" });
//             // }
//         } else {
//             return res.json({ "message": "Start date parameter not found" });
//         }
//         // if (end_date) {
//         //     if (!pattern.test(end_date)) {
//         //         return res.json({ "message": "End date is not a valid format" });
//         //     }
//         // } else {
//         //     return res.json({ "message": "End date parameter not found" });
//         // }
//         var e_date = new Date(Date.now()).getTime();
//         var start_dt = new Date(start_date * 1000);
//         var end_dt = new Date(e_date);
//         var start_month = start_dt.getMonth()+1;
//         var end_month = end_dt.getMonth()+1;
//         var start_mon = (start_month<10)?'0'+start_month:start_month;
//         var end_mon = (end_month<10)?'0'+end_month:end_month;

//         var start_day = start_dt.getDate();
//         var end_day = end_dt.getDate();
//         var start_d = (start_day<10)?'0'+start_day:start_day;
//         var end_d = (end_day<10)?'0'+end_day:end_day;

//         var starts = start_dt.getFullYear()+'-'+start_mon+'-'+start_d;
//         var ends = end_dt.getFullYear()+'-'+end_mon+'-'+end_d;
//         var sDate = starts + 'T00:00:00.000Z';
//         var eDate = ends + 'T23:59:59.000Z';
//         // if (sDate > eDate) {
//         // 	return res.json({ "message":"Ensure that End Date is greater than Start Date" });
//         // }

//          tradePairDB.findOne({pair:pair},{liquidity_name:1,liquidity_status:1,pair:1},function(err,pairdata){

//             //if(pairdata && pairdata.liquidity_status == 1){
             
//                //var krakensym = pair.replace("_","");
//                var krakensym = pairdata.liquidity_name;

//                 //var url = "api.kraken.com";
//                 var url = "api.binance.com";
//                 //start_date = (start_date.length<=10)?start_date*1000:start_date;
//                 //end_date = (end_date.length<=10)?end_date*1000:end_date;
//                 start_date = start_date * 1000;
//                 end_date = end_date * 1000;
//                 const options = {
//                     'url':'https://api.binance.com/api/v3/klines?symbol='+krakensym+'&interval='+resolution+'m',
//                     'method': 'GET',
//                 }
//       request(options, function(error, response, body) {
//             var data = body;
//                if(IsJsonString(data))
//                         {
//                             var ressult = JSON.parse(data);
//                             var newARR = [];
//                             if(typeof ressult != 'undefined' && ressult!='')
//                             {
                                
//                                         for(var i=0; i<ressult.length; i++)
//                                         {	
//                                             var newobj         = {};
//                                             newobj['Date']     = ressult[i][0];
//                                             newobj['pair']     = pair;
//                                             newobj['open']     = ressult[i][1];
//                                             newobj['high']     = ressult[i][2];
//                                             newobj['low']      = ressult[i][3];
//                                             newobj['close']    = ressult[i][4];
//                                             newobj['volume']   = ressult[i][5];
//                                             newobj['exchange'] = "Sample";
//                                             newARR.push(newobj);
//                                         }
                                    
//                             }
//                                 res.json(newARR);
//                         }
//       })
         			
//             //}
//             // else{
//             //     orderDB.aggregate([
//             //         {$match: {
//             //             $and:[
//             //                 {pairName:pairdata.pair},
//             //                 {$or: [{ status: 'partially' }, { status: 'filled' }]},
//             //                 {createddate:{ $gte:new Date(sDate), $lt:new Date(eDate)}}
//             //             ]
//             //         }},
//             //         {$group: {
//             //             _id: {
//             //                 "year": { "$year": "$createddate" },
//             //                 "dayOfYear": { "$dayOfYear": "$createddate" },
//             //                 "hour": { "$hour": "$createddate" },
//             //                 "interval": {
//             //                     "$subtract": [ 
//             //                         { "$minute": "$createddate" },
//             //                         { "$mod": [{ "$minute": "$createddate"}, 1] }
//             //                     ] 
//             //                 }
//             //             },
//             //             count: {$sum: 1},
//             //             Date: {$first: "$createddate"},
//             //             low: {$min: '$price'},
//             //             high: {$max: '$price'},
//             //             open: {$first: '$price'},
//             //             close: {$last: '$price'},
//             //             volume: {$sum: '$total'}
//             //         }},
//             //         { $project: {
//             //             _id: 0,
//             //             Date: "$Date",
//             //             pair: {$literal:pair},
//             //             low: "$low",
//             //             high: "$high",
//             //             open:"$open",
//             //             close:"$close",
//             //             volume:"$volume",
//             //             exchange: {$literal:"Sample"}
//             //         }},
//             //         { $sort: { Date:1 } }
//             //     ]).exec(function(err, result) {
//             //         return res.json(result);
//             //     });
//             // }
//         })
//     } catch (err) {
//         console.log('====================chartData catch====================');
//         console.log(err);    
//         return res.json([]);
//     }
// });

router.get('/chartData', (req, res) => {
    // console.log('====================chartData chartData====================');

    try {
        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;
        var pair = req.query.market;
        var start_date = req.query.start_date;
        //var end_date = req.query.end_date;
        //console.log("start_datestart_date",start_date);;
        var end_date = Math.floor(new Date(Date.now()).getTime()/1000);
      // console.log("end_dateend_dateend_date",end_date);
        var resolution = req.query.resolution;
        // console.log("chart api resolution====",resolution);
        var api_resolution = '';
        if(+resolution > 0 && +resolution <= 720){
            resolution = +resolution;
            api_resolution = (resolution <= 30)?resolution+'m':(resolution/60)+'h';
        }
        else{
            //console.log("chart api resolution====",resolution);
            //resolution = 1;
            api_resolution = resolution;
        }
        var spl = pair.split("_");
        var first = spl[0];
        var second = spl[1];
        var pair_name = spl[0] + '/' + spl[1];
        var pattern = /^([0-9]{4})\-([0-9]{2})\-([0-9]{2})$/;
        if (start_date) {
            // if (!pattern.test(start_date)) {
            // 	return res.json({ "message": "Start date is not a valid format" });
            // }
        } else {
            return res.json({ "message": "Start date parameter not found" });
        }
        // if (end_date) {
        //     if (!pattern.test(end_date)) {
        //         return res.json({ "message": "End date is not a valid format" });
        //     }
        // } else {
        //     return res.json({ "message": "End date parameter not found" });
        // }
        var e_date = new Date(Date.now()).getTime();
        var start_dt = new Date(start_date * 1000);
        var end_dt = new Date(e_date);
        var start_month = start_dt.getMonth()+1;
        var end_month = end_dt.getMonth()+1;
        var start_mon = (start_month<10)?'0'+start_month:start_month;
        var end_mon = (end_month<10)?'0'+end_month:end_month;

        var start_day = start_dt.getDate();
        var end_day = end_dt.getDate();
        var start_d = (start_day<10)?'0'+start_day:start_day;
        var end_d = (end_day<10)?'0'+end_day:end_day;

        var starts = start_dt.getFullYear()+'-'+start_mon+'-'+start_d;
        var ends = end_dt.getFullYear()+'-'+end_mon+'-'+end_d;
        var sDate = starts + 'T00:00:00.000Z';
        var eDate = ends + 'T23:59:59.000Z';
         tradePairDB.findOne({pair:pair},{liquidity_name:1,liquidity_status:1,pair:1,chart_liquidity:1,to_symbol:1,from_symbol:1,buyspread:1}, async function(err,pairdata){
            if(pairdata && pairdata.liquidity_status == '1'){
                var krakensym = pairdata.to_symbol == 'INR' ? pairdata.from_symbol+'USDT' : pairdata.from_symbol+pairdata.to_symbol;
                var pairspread = pairdata.buyspread;
                if(krakensym == "USDTUSDT")
                {
                    krakensym = "BUSDUSDT";
                }
                // console.log("krakensym===",krakensym)
            var conversion_price = 0;
            client.hget('CurrencyConversion', 'allpair', async function(err, value) {
                    if(!err){
                    let redis_response = await JSON.parse(value);
                    if(redis_response != null && redis_response != "" && redis_response != undefined && Object.keys(redis_response).length > 0)
                    {
                        conversion_price = redis_response["USDT"].INR
                    }
                }
            });
            // var pairname = pairdata.from_symbol+pairdata.to_symbol;


                var url = "api.binance.com";
                start_date = start_date * 1000;
                end_date = end_date * 1000;
                const options = {
                    //'url':'https://api.binance.com/api/v3/klines?symbol='+krakensym+'&interval='+resolution+'m',
                    'url':'https://api.binance.com/api/v3/klines?symbol='+krakensym+'&interval='+api_resolution,
                    'method': 'GET',
                }
              request(options, function(error, response, body) {
                var data = body;
               if(IsJsonString(data))
                {
                            var ressult = JSON.parse(data);
                           // console.log("chart result===",ressult)
                            var newARR = [];
                            if(typeof ressult != 'undefined' && ressult!='')
                            {
                                        for(var i=0; i<ressult.length; i++)
                                        {
                                            var newobj         = {};
                                           // console.log("spread_open====",spread_open);
                                            newobj['Date']     = ressult[i][0];
                                            newobj['pair']     = pair;
                                            newobj['open']     =  pairdata.to_symbol == 'INR' ? (ressult[i][1] * conversion_price) : +ressult[i][1];
                                            newobj['high']     = pairdata.to_symbol == 'INR' ? (ressult[i][2] * conversion_price) : +ressult[i][2];
                                            newobj['low']      = pairdata.to_symbol == 'INR' ? (ressult[i][3] * conversion_price) : +ressult[i][3];
                                            newobj['close']    = pairdata.to_symbol == 'INR' ? (ressult[i][4] * conversion_price) : +ressult[i][4];
                                            newobj['volume']   = ressult[i][5];
                                            newobj['exchange'] = "Pitiklini";
                                            //console.log("spread_open====",newobj);
                                            newARR.push(newobj);
                                        }
                            }
                            client.hset('kline', JSON.stringify(pair), JSON.stringify(newARR))
                                res.json(newARR);
                        }
                   })
            }
            else{
                confirmOrder.aggregate([
                    {$match: {
                        $and:[
                            {pair:pairdata.pair},
                            {created_at:{ $gte:new Date(sDate), $lt:new Date(eDate)}}
                        ]
                    }},
                    {$group: {
                        _id: {
                            "year": { "$year": "$created_at" },
                            "dayOfYear": { "$dayOfYear": "$created_at" },
                            "hour": { "$hour": "$created_at" },
                            "interval": {
                                "$subtract": [ 
                                    { "$minute": "$created_at" },
                                    { "$mod": [{ "$minute": "$created_at"}, 1] }
                                ] 
                            }
                            // "minute": { "$minute": "$created_at" },
                        },
                        count: {$sum: 1},
                        Date: {$first: "$created_at"},
                        low: {$min: '$askPrice'},
                        high: {$max: '$askPrice'},
                        open: {$first: '$askPrice'},
                        close: {$last: '$askPrice'},
                        volume: {$sum: '$askAmount'}
                    }},
                    { $project: {
                        _id: 0,
                        Date: "$Date",
                        pair: {$literal:pair},
                        low: "$low",
                        high: "$high",
                        open:"$open",
                        close:"$close",
                        volume:"$volume",
                        exchange: {$literal:"Pitiklini"}
                    }},
                    { $sort: { Date:1 } }
                ]).exec(function(err, result) {
                    var response = [];
                    if(result.length>0)
                    {
                        response = result; 
                        //console.log("chart response====",response);
                    }
                    else
                    {
                        var obj =  {
                              "Date": new Date(),
                              "pair": pair,
                              "low": 0,
                              "high": 0,
                              "open": 0,
                              "close": 0,
                              "volume": 0,
                              "exchange": 'Pitiklini'
                            }
                            response.push(obj)
                    }
                    client.hset('kline', JSON.stringify(pair), JSON.stringify(response))
                    return res.json(response);
                });
            }
        })
    } catch (err) {   
        common.create_log(error.message,function(resp){});
        return res.json([]);
    }
});

function IsJsonString(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

router.get("/depthchart",(req,res)=>{
    console.log("req.query=====",req.query);
    var pair = req.query.pair;
    console.log("req.query pair=====",pair);
    var replace_string = pair.replace("_", "")
    var changelower = replace_string.toLowerCase();
    console.log("req.query changelower=====",changelower);
    client.hget('MYEXCHANGE-ORDERBOOK', changelower, async function(err, value) {
        let response = await JSON.parse(value)
            console.log("orderbook response====",response);
            return res.send({status:true,data:response});
    });
})
module.exports = router;