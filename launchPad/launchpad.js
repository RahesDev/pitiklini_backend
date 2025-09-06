var express        = require('express');
var router         = express.Router();
var common         = require('../helper/common');
var usersDB        = require('../schema/users');
const key          = require('../config/key');
const stakingDB    = require('../schema/staking');
const currencyDB   = require('../schema/currency');
const userStakingDB= require('../schema/userStakingPlan');
const wallets        = require('../helper/wallets');
var userWalletDB     = require('../schema/userWallet');
var moment           = require('moment');
const redis          = require("redis");
const client         = redis.createClient(key.redisdata);
var redisCache       = require('../redis-helper/redisHelper')
const cron           = require('node-cron');
const mongoose       = require('mongoose');
const launchPadDB    = require('../schema/launchPad');
const { parse }          = require('express-useragent');
var mailtempDB           = require('../schema/mailtemplate');
var mail                 = require('../helper/mailhelper');
const { RedisService }   = require("../services/redis");
const tradeRedis         = require('../tradeRedis/activeOrderRedis');
const profitDb          = require('../schema/profit');
const launchPadhistoryDB = require('../schema/launchpadHisoty');

router.post('/submitForm', common.tokenmiddleware, async (req, res) => {
    try {
        console.log(req.userId,"req.userId")
        req.body['userId'] = req.userId;

    console.log(req.body,"req")

        let createData = await launchPadDB.create(req.body);

        console.log(createData,"createData");
        
        if(createData){
            return res.json({ status : true, Message : "Token submitted successfully, Please wait some times for admin approval", data : {} });
        }else{
            return res.json({ status : false, Message : "Please try again later", data : {} });
        }
    } catch (error) {
        return res.json({ status : false, Message : "Internal server error" });
    }

});


router.get('/getlaunchpadDetails',common.tokenmiddleware,  async (req, res) => {
    try {
        launchPadDB.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userdata"
                }
            },
            ]).exec((err,data)=> {
                if(!err){
                    return res.json({ status : true, Message : "Success", data : data });
                }else{
                    return res.json({ status : false, Message : "Please try again later", data : {} });
                }
            });

    } catch (error) {
        console.log(error,'=-=-=-error-=-')
        return res.json({ status : false, Message : "Internal server error" });
    }
});



router.post('/tokenApproved', common.tokenmiddleware, async (req, res) => {
    try {
        console.log(req.body,'=-=-=-createData')
        let createData = await launchPadDB.updateOne({ _id : req.body._id },{ $set : {status : 3} }).exec({});
        console.log(createData,'createData=-=-=--=-')
        if(createData){
            let getUser = await usersDB.findOne({ _id : req.body.userId }).exec({});
            if(getUser){
                let reciver = common.decrypt(getUser.email);
                let resData = await mailtempDB.findOne({ key: 'tokenApprove' });
                if(resData){
                    var etempdataDynamic = resData.body.replace(/###TOKEN###/g, req.body.token).replace(/###USERNAME###/g, getUser.username);
                    mail.sendMail({from: process.env.FROM_EMAIL, to: reciver, subject: resData.Subject, html: etempdataDynamic },function(mailRes){
                        console.log(mailRes,'-=-=mailR=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-es--');
                        if(mailRes == null){
                            res.json({ status : true, Message : "Token approved successfully" });
                            tradeRedis.setRedisForLaunchpad(function(res){});
                        }else{
                            return  res.json({Message:"Email not sent, please try later"});
                        }
                      });
                }
            }
        }else{
            return res.json({ status : false, Message : "Please try again later"});
        }
    } catch (error) {
        return res.json({ status : false, Message : "Internal server error" });
    }
});

router.post('/tokenCanceled', common.tokenmiddleware, async (req, res) => {
    try {
        let createData = await launchPadDB.updateOne({ _id : req.body._id },{ $set : {status : 2} }).exec({});
        if(createData.nModified == 1){
            let getUser = await usersDB.findOne({ _id : req.body.userId }).exec({});
            if(getUser){
                let reciver = common.decrypt(getUser.email);
                let resData = await mailtempDB.findOne({ key: 'tokenCancel' });
                if(resData){
                    var etempdataDynamic = resData.body.replace(/###TOKEN###/g, req.body.token).replace(/###USERNAME###/g, getUser.username);
                    mail.sendMail({from: process.env.FROM_EMAIL, to: reciver, subject: resData.Subject, html: etempdataDynamic },function(mailRes){
                        if(mailRes == null){
                            res.json({ status : true, Message : "Token rejected successfully" });
                        }else{
                            return  res.json({Message:"Email not sent, please try later"});
                        }
                      });
                }
            }        }else{
            return res.json({ status : false, Message : "Please try again later"});
        }
    } catch (error) {
        return res.json({ status : false, Message : "Internal server error" });
    }
});

router.post('/getTokenDetails', async (req, res) => {
    try {
        console.log(req.body)
        console.log(req.body.symbol)
        let getLaunchPad = await launchPadDB.findOne({currency_name:req.body.symbol}).exec();
        console.log(getLaunchPad,"llll")
        if(getLaunchPad){
            res.json({ status : true, Message : "success", data :getLaunchPad });
        }else{
            res.json({ status : false, Message : "false", data : {} });
        }
    } catch (error) {
        console.log(error,"000")
        return res.json({ status : false, Message : "Internal server error" });
    }
});


router.post("/getOneLaunchpad", common.tokenmiddleware, async (req, res) => {
    try {
      if (req.body.id != "" && req.body.id != null && req.body.id != undefined) {
        var find_launchpad_details = await launchPadDB.findOne({
          _id: req.body.id,
        }); 
        var getfees = await currencyDB.findOne({
          currencySymbol: find_launchpad_details.symbol,
        });
        return res.json({
          status: true,
          Message: find_launchpad_details,
          fees: getfees.launchPadFee,
        });
      } else {
        return res.json({
          status: false,
          Message: "Something Went Wroung, Please try again later",
        });
      }
    } catch (error) {
      console.log(error, "=-=-=-error-=-");
      return res.json({ status: false, Message: "Internal server error" });
    }
  });

router.get("/getAllLaunchpad", async (req, res) => {
    try {
      var find = {};
      var expiredTokens = [];
      var UpcomingTokens = [];
      var inprogressToken = [];
      var search = req.body.search;
      if (search == undefined || search == "") {
        find = { status: 3 };
      } else {
        find = {
          status: 3,
          $or: [
            { symbol: { $regex: new RegExp(search, "i") } },
            { currency_name: { $regex: new RegExp(search, "i") } },
          ],
        };
      }
  
      var getLaunchpadcurrencis = await launchPadDB.find({}).exec();
      console.log(getLaunchpadcurrencis,"getLaunchpadcurrencis") 
  
      var launchpadcurency = await currencyDB.find(
        { currencySymbol: { $in: getLaunchpadcurrencis.map(item => item.symbol) } }, 
      );
       console.log(launchpadcurency,"launchpadcurency") 
  
      var getlaunchpad = await launchPadDB.find(
        { symbol: { $in: launchpadcurency.map(item => item.currencySymbol) } }, 
  
      ).exec();
      var getlaunchpadTotal = await launchPadDB.find(
        { symbol: { $in: launchpadcurency.map(item => item.currencySymbol) } }, 
  
      ).count();
  
      for (var i = 0; i < getlaunchpad.length; i++) {
        var startDate = new Date(getlaunchpad[i].startDate).getTime();
        var currentDate = new Date().getTime();
        var endDate = new Date(getlaunchpad[i].endDate).getTime();
  
        console.log("startDate====", startDate);
        console.log("currentDate====", currentDate);
        console.log("endDate====", endDate);
  
        // =================Completed Tokens======================//
        if (endDate < currentDate) {
          expiredTokens.push(getlaunchpad[i]);
        }
        // =================Upcoming Tokens======================//
        if (currentDate < startDate) {
          UpcomingTokens.push(getlaunchpad[i]);
        }
  
        // =================Inprogress Tokens======================//
        if (startDate < currentDate && currentDate < endDate) {
          inprogressToken.push(getlaunchpad[i]);
        }
      }
      var obj2 = {
        expiredTokens: expiredTokens,
        UpcomingTokens: UpcomingTokens,
        inprogressToken: inprogressToken,
        getlaunchpadTotal:getlaunchpadTotal
      };
      console.log(obj2, "=-=-=-obj1-=-=-obj1-=-");
      return res.json({ status: true, Message: "success", data: obj2 });
    } catch (error) {
      console.log(":::error:::::", error);
  
      return res.json({ status: false, Message: "Internal server error" });
    }
  });


// router.get('/getAllLaunchpad', async (req, res) => {
//     console.log("get all lanchpad");
//     try {
//         let getLaunchDatas =  await RedisService.hgetall('launchpadTokens');
//         console.log("getAllLaunchpad====",getLaunchDatas);
//         let launchPadDetails = await JSON.parse(getLaunchDatas);
//         var expiredTokens = [];
//         var UpcomingTokens = [];
//         var inprogressToken  = [];
//         //console.log(launchPadDetails,'-=-=launchPadDetails=-=-=launchPadDetails');
//         if(launchPadDetails != null){
//              for(var i=0; i<launchPadDetails.length; i++){
//                 var startDate    = new Date(launchPadDetails[i].startDate).getTime();
//                 var currentDate  = new Date().getTime();
//                 var endDate      = new Date(launchPadDetails[i].endDate).getTime();

//                 console.log("startDate====",startDate)
//                 console.log("currentDate====",currentDate)
//                 console.log("endDate====",endDate)

//                 // =================Completed Tokens======================//
//                 if(endDate < currentDate){
//                     expiredTokens.push(launchPadDetails[i]);
//                 }
//                  // =================Upcoming Tokens======================//
//                 if(currentDate < startDate ){
//                     UpcomingTokens.push(launchPadDetails[i]);
//                 }

//                 // =================Inprogress Tokens======================//
//                 if(startDate < currentDate && currentDate < endDate ){
//                     inprogressToken.push(launchPadDetails[i]);
//                 } 
//                 var obj = {
//                     expiredTokens : expiredTokens,
//                     UpcomingTokens : UpcomingTokens,
//                     inprogressToken : inprogressToken
//                 }

//              }
//              console.log(obj,'=-=-=-obj-=-=-obj-=-')
//              return res.json({ status : true, Message : "success", data : obj  });
//         }else{
//             return res.json({ status : false, Message : "error", data : {}  });
//         }

//     } catch (error) {
//         console.log(':::error:::::', error);

//         return res.json({ status : false, Message : "Internal server error" });
//     }

// });


router.post ("/updateLaunch",async (req,res)=>{
    try{
        let findCurrency = await currencyDB.findOne({ _id : req.body.currencyId}).exec({});
    if(findCurrency){
        let findDetails = await launchPadDB.findOne({ currencyId : req.body.currencyId }).exec({});
    if(findDetails){
        let createStaking = await launchPadDB.create(req.body);
        if(createStaking){
            return res.json({ status : true, Message : findCurrency.currencySymbol+"Currency Launch Successfully!" })
        }else{
            return res.json({ status : false, Message : "Please try again later" });
        }
    }else{
        let updateStaking = await launchPadDB.updateOne({ currencyId : req.body.currencyId }, { $set : obj }).exec({});
        if(updateStaking){
            return res.json({ status : true, Message :"launching"+findCurrency.currencySymbol+"  currency updated successfully" });
        }else{
            return res.json({ status : false, Message : "Please try again later" });
        }
    };
    }else{
        return res.json({ status : false, Message : "Please try again later" });
    }
    }catch(err){
        console.log(':::error:::::', error);
        return res.json({ status : false, Message : "Internal server error" });

    }
})

router.get("/getUSDTBalance", common.tokenmiddleware, async (req, res) => {
    try {
      userWalletDB
        .findOne(
          { userId: req.userId },
          { wallets: { $elemMatch: { currencySymbol: "USDT" } } }
        )
        .exec(function (err, resdata) {
          if (resdata && resdata.wallets.length > 0) {
            var balance = resdata.wallets[0].amount;
            var bal_resp = {
              status: true,
              balance: balance,
            };
            return res.json(bal_resp);
          } else {
            var bal_resp = {
              status: false,
            };
            return res.json(bal_resp);
          }
        });
    } catch (err) {
      var bal_resp = {
        status: false,
      };
      return res.json(bal_resp);
    }
  });

router.get('/launchPadcurrency', common.tokenmiddleware, (req, res) => {
    try {

        var perPage = Number(req.body.perpage ? req.body.perpage : 0);
        var page = Number(req.body.page ? req.body.page : 0);
        var skippage = (perPage * page) - perPage;

        var search = req.body.search;
        var filter = {}

        filter = {
            userId: mongoose.Types.ObjectId(req.userId),
            'currdetail.status': 'Active'
        }

        userWalletDB.aggregate([{
            $unwind: '$wallets'
        },
        {
            $lookup: {
                from: 'currency',
                localField: 'wallets.currencyId',
                foreignField: '_id',
                as: 'currdetail'
            }
        },
        {
            $match: filter
        },
        {
            $project: {
                "currencyName": { $arrayElemAt: ['$currdetail.currencyName', 0] },
                "currencysymbol": { $arrayElemAt: ['$currdetail.currencySymbol', 0] },
                "currencyImage": { $arrayElemAt: ['$currdetail.Currency_image', 0] },
                "currencyType": { $arrayElemAt: ['$currdetail.currencyType', 0] },
                "depositStatus": { $arrayElemAt: ['$currdetail.depositStatus', 0] },
                "withdrawStatus": { $arrayElemAt: ['$currdetail.withdrawStatus', 0] },
                "tradeStatus": { $arrayElemAt: ['$currdetail.tradeStatus', 0] },
                "currencyBalance": "$wallets.amount",
                "holdAmount": "$wallets.holdAmount",
                "exchangeAmount": "$wallets.exchangeAmount",
                "currid": { $arrayElemAt: ['$currdetail._id', 0] },
                "type": { $arrayElemAt: ['$currdetail.coinType', 0] },
                "type": { $arrayElemAt: ['$currdetail.coinType', 0] },
                "status": { $arrayElemAt: ['$currdetail.status', 0] },
                "EstimatedRON": { $arrayElemAt: ['$currdetail.estimatedValueInRON', 0] },
                "EstimatedEUR": { $arrayElemAt: ['$currdetail.estimatedValueInEUR', 0] },
                "EstimatedBTC": { $arrayElemAt: ['$currdetail.estimatedValueInBTC', 0] },
                "EstimatedUSDT": { $arrayElemAt: ['$currdetail.estimatedValueInUSDT', 0] },
                "minWithdrawLimit": { $arrayElemAt: ['$currdetail.minWithdrawLimit', 0] },
                "maxWithdrawLimit": { $arrayElemAt: ['$currdetail.maxWithdrawLimit', 0] },
                "erc20token": { $arrayElemAt: ['$currdetail.erc20token', 0] },
                "trc20token": { $arrayElemAt: ['$currdetail.trc20token', 0] },
                "bep20token": { $arrayElemAt: ['$currdetail.bep20token', 0] },
                "coinType": { $arrayElemAt: ['$currdetail.coinType', 0] },
            }
        }
        ]).exec(async (err, resData) => {
            if (err) {
                return res.status(200).json({ Message: err, code: 200, status: false });
            } else {
                // console.log("get balance response===",resData);
                var total_balance_btc = 0;
                var available_balance_btc = 0;
                var inorder_balance_btc = 0;
                var total_balance_usdt = 0;
                var available_balance_usdt = 0;
                var inorder_balance_usdt = 0;
                var redis_response = '';
                client.hget('CurrencyConversion', 'allpair', async function (err, value) {
                    let redis_response = await JSON.parse(value);
                    if (redis_response != null && redis_response != "" && redis_response != undefined && Object.keys(redis_response).length > 0) {
                        //   console.log('==-=-=-=if start-=-==-=-=-=')

                        for (var i = 0; i < resData.length; i++) {

                            //   if(redis_response[resData[i].currencysymbol].SHIB != undefined || redis_response[resData[i].currencysymbol].USDT != undefined)
                            //   {
                            // console.log(redis_response,'=--==-redis_response-=-=-=-redis_response-=-=-redis_response=-=-value-=-=-value');
                            // resData[i].EstimatedBTC = redis_response[resData[i].currencysymbol].BTC;
                            // resData[i].EstimatedUSDT = redis_response[resData[i].currencysymbol].INR;
                            // console.log("resData[i].EstimatedUSDT===",resData[i].EstimatedUSDT);

                            //  total_balance_btc += (total_balance_btc + resData[i].currencyBalance + resData[i].holdAmount) * resData[i].EstimatedBTC;
                            //  available_balance_btc += (available_balance_btc + resData[i].currencyBalance) * resData[i].EstimatedBTC;
                            //  inorder_balance_btc += (inorder_balance_btc + resData[i].holdAmount) * resData[i].EstimatedBTC;
                            //  total_balance_usdt += (total_balance_usdt + resData[i].currencyBalance + resData[i].holdAmount) * resData[i].EstimatedUSDT;
                            //  available_balance_usdt += (available_balance_usdt + resData[i].currencyBalance) * resData[i].EstimatedUSDT;
                            //  inorder_balance_usdt += (inorder_balance_usdt + resData[i].holdAmount) * resData[i].EstimatedUSDT;
                            //  resData[i]['estimatedBTCbalance']= resData[i].EstimatedBTC *resData[i].currencyBalance
                            //  resData[i]['estimatedUSDTbalance']= resData[i].EstimatedUSDT *resData[i].currencyBalance
                            //  resData[i]['estimatedUSDThold']= resData[i].EstimatedUSDT *resData[i].holdAmount
                            //  resData[i]['estimatedUSDTtotal']= (resData[i].EstimatedUSDT *resData[i].currencyBalance) + (resData[i].EstimatedUSDT *resData[i].holdAmount)
                            resData[i]['currencyBalance'] = resData[i].currencyBalance
                            resData[i]['holdAmount'] = resData[i].holdAmount
                            resData[i]['totalBalance'] = resData[i].currencyBalance + resData[i].holdAmount

                            //  }
                            //  console.log(resData,'=--==-resData-=-=-=-resData-=-=-value=-=-value-=-=-value');

                        }
                        // console.log(resData,'=--==-resData-=-=-=-resData-=-=-value=-=-value-=-=-value');

                        var balance = {
                            total_balance_btc: total_balance_btc,
                            available_balance_btc: available_balance_btc,
                            inorder_balance_btc: inorder_balance_btc,
                            total_balance_usdt: total_balance_usdt,
                            available_balance_usdt: available_balance_usdt,
                            inorder_balance_usdt: inorder_balance_usdt
                        }
                        // console.log(balance,'=--==-value-=-=-=-value-=-=-value=-=-value-=-=-value');

                        var walletcount = await userWalletDB.findOne({ userId: mongoose.Types.ObjectId(req.userId) }).exec();
                        var returnJson = {
                            status: true,
                            Message: resData,
                            total: walletcount.wallets.length,
                            current: page,
                            pages: Math.ceil(walletcount.wallets.length / perPage),
                            balance: balance
                        }
                        return res.status(200).json(returnJson);
                    }
                });


                //  return res.json({Message: resData,code:200});
            }
        });
    } catch (error) {
        console.log(error, '=-=-=-==')
        return res.status(500).json({ Message: "Internal server", code: 500, status: false });
    }
});

  router.post('/getCurrencyConvertion', async (req, res) => {
    try {

        client.hget('CurrencyConversion', 'allpair', async function(err, value) {
            if(!err){
                let redis_response = await JSON.parse(value);
                console.log(redis_response,'=--=-==-=-=-redis_response-=-=')
                var currency = req.body.currency;
                console.log(currency,'=--=-==-=-=-currency-=-=')
                //var inrValue = parseFloat(redis_response[currency].INR);
                if(redis_response != null)
                {
                    var inrValue = parseFloat(redis_response[currency].USDT);
                    console.log(redis_response[currency],'=--=-==-=-=-inrValue-=-=')
                    return res.json({ status : true, Message : "Success", inr_value : inrValue});
                }
                else
                {
                    return res.json({ status : false, Message : "Internal server error" });
                }
                
            }
       
        });
        
    } catch (error) {
        return res.json({ status : false, Message : "Internal server error" });
    }
  });


  router.post('/tokenPurchase',common.tokenmiddleware, async (req, res) => {
    try {
        console.log(req.body,'=-=-==-==-=-LaunchPadCurrency-=-=-==-=-=');
        if(req.body.totalAmount != "" && req.body.totalToken != "" && req.body.currency != "" && req.body.launchToken != "" ){
            if(req.body.totalAmount > 0){
                var userId = req.userId;
                let getLaunchPad = await launchPadDB.findOne({_id : req.body.token_id}).exec();
                if(getLaunchPad != null){
                    let LaunchPadCurrency = await currencyDB.findOne({currencySymbol : req.body.launchToken}).exec();
                    if(LaunchPadCurrency != null){
                        var startDate    = new Date(getLaunchPad.startDate).getTime();
                        var currentDate  = new Date().getTime();
                        var endDate      = new Date(getLaunchPad.endDate).getTime();
                        var totalSupplay = parseFloat(getLaunchPad.totalSupply);
                        var totalToken   = parseFloat(req.body.totalToken)
                        if(startDate < currentDate && currentDate < endDate ){
                            if(totalSupplay >= totalToken ){
                                if(parseFloat(getLaunchPad.hardcap)  >= totalToken){
                                    if(parseFloat(getLaunchPad.softCap)  <= totalToken){
                                        let checkUserBalance = await userWalletDB.findOne({ userId : userId}).exec({});
                                        if(checkUserBalance){
                                            let getCurrency = await currencyDB.findOne({currencySymbol : req.body.currency}).exec({});
                                            if(getCurrency)
                                            var launchPadFee = getCurrency.launchPadFee;
                                            var balanceIndex = checkUserBalance.wallets
                                            var secIndex     = balanceIndex.findIndex(x => x.currencySymbol == req.body.currency);
                                            var balance      = balanceIndex[secIndex].amount;
                                            var launchpadAMT = balanceIndex[secIndex].launchPadAmount;
                                            var fee = parseFloat(req.body.totalAmount) * (parseFloat(launchPadFee )/ 100);
                                            var totalAmount = parseFloat(req.body.totalAmount) + fee
                                            if(balance >= totalAmount){
                                                var updateBalance = parseFloat(balance) - parseFloat(totalAmount);
                                                var updateLanchAMT= parseFloat(launchpadAMT) + parseFloat(totalToken);
                                                var detuctSupply  = totalSupplay - totalToken;
                                                var balRes = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": getCurrency._id }, { "$set": { "wallets.$.amount": +updateBalance } }, { multi: true });
                                                if(balRes.nModified == 1){
                                                    //var updateToken = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": LaunchPadCurrency._id }, { "$set": { "wallets.$.launchPadAmount": +updateLanchAMT } }, { multi: true });
                                                    var updateToken = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": LaunchPadCurrency._id }, { "$set": { "wallets.$.amount": +updateLanchAMT } }, { multi: true });
                                                    if(updateToken.nModified == 1){
                                                        let profitDatas ={
                                                            type        : 'Launchpad',
                                                            user_id     : mongoose.mongo.ObjectId(req.userId),
                                                            currencyid  : LaunchPadCurrency._id,
                                                            fees        : fee,
                                                            fullfees    : fee,
                                                            orderid     : mongoose.mongo.ObjectId(req.userId)
                                                        }
                                                        let profitCreate1 = await profitDb.create(profitDatas);
                                                        if(profitCreate1){
                                                            var obj = {
                                                                type        : 'Launchpad',
                                                                user_id     : mongoose.mongo.ObjectId(req.userId),
                                                                currencyid  : LaunchPadCurrency._id,
                                                                fees        : fee,
                                                                fullfees    : fee,
                                                                tokenSymbol : req.body.launchToken,
                                                                tokenName   : getLaunchPad.coinName,
                                                                tokenAmount : totalToken,
                                                                sellCurrency: req.body.currency
                                                            }
                                                            let createlaunch = await launchPadhistoryDB.create(obj);
                                                            if(createlaunch){
                                                                var updateSupply = await launchPadDB.updateOne({ _id: getLaunchPad._id}, {$set : {totalSupply :detuctSupply }}).exec({});
                                                                if(updateSupply){
                                                                    return res.json({ status : true, Message : req.body.totalToken+" "+req.body.launchToken+ " Token purchased successfully"});
                                                                }else{
                                                                    return res.json({ status : false, Message : "Please try later"});
                                                                }
                                                            }else{
                                                                return res.json({ status : false, Message : "Please try later"});
                                                            }
                                                        }else{
                                                            return res.json({ status : false, Message : "Please try later"});
                                                        }
                                                    }else{
                                                        return res.json({ status : false, Message : "Please try later"});
                                                    }
                                                }else{
                                                    return res.json({ status : false, Message : "Please try later"});
                                                }
                                            }else{
                                                return res.json({ status : false, Message : "Insufficient funds"});
                                            }
                                        }else{
                                            return res.json({ status : false, Message : "Please try later"});
                                        }
                                    }else{
                                        return res.json({ status : false, Message : "Enter greater than "+getLaunchPad.softCap+" token "+getLaunchPad.symbol});
                                    }
                                }else{
                                    return res.json({ status : false, Message : "Enter less than "+getLaunchPad.hardcap+" token "+getLaunchPad.symbol});
                                }
                            }else{
                                return res.json({ status : false, Message : "You can only buy "+getLaunchPad.totalSupply+" token "+getLaunchPad.symbol});
                            }
                        }else{
                            return res.json({ status : false, Message : "Now you canot purchase the token, because the token was expired"});
                        }
                    }else{
                        return res.json({ status : false, Message : "Token not available for purchase"});
                    }
                }else{
                    return res.json({ status : false, Message : "Invalid Launchpad Token"});
                }
                
            }else{
                return res.json({ status : false, Message : "Invalid Amount"});
            }
        }else{
            return res.json({ status : false, Message : "Enter all fields"});
        }
        
        
    } catch (error) {
        console.log(error,'=-==-error=-=-=-error-=-=---=-error');
        return res.json({ status : false, Message : "Internal server error" });
    }
  });



  

  router.get('/lauchPadHistory',common.tokenmiddleware, async (req, res) => {
    try {
        var userId = req.userId;
        let getLaunchPad = await launchPadhistoryDB.find({user_id : userId}).exec();
        if(getLaunchPad){
            res.json({ status : true, Message : "success", data :getLaunchPad });
        }else{
            res.json({ status : false, Message : "false", data : {} });
        }
    } catch (error) {
        return res.json({ status : false, Message : "Internal server error" });
    }
});


router.post('/lauchPadHistory', common.tokenmiddleware, async (req, res) => {
    try {
        console.log(req.body, "__+_+req.body+_+____")
        var search = req.body.search;
        var perPage = Number(req.body.perpage ? req.body.perpage : 5);
        var page = Number(req.body.page ? req.body.page : 1);
        console.log(perPage, "=-=-=-pr")
        var skippage = (perPage * page) - perPage;
        console.log(skippage, "===skippage====")
        var userId = req.userId;
        let getLaunchPad = await launchPadhistoryDB.find({ user_id: userId }).skip(skippage).limit(perPage).sort({_id:-1}).exec();
        console.log(getLaunchPad, "==getLaunchPad===")
        if (getLaunchPad) {
            var pagedata = await launchPadhistoryDB.find({ user_id: userId }).count();
            console.log(pagedata, "[[[pagedata]]]]]]")
            var returnObj = {
                data: getLaunchPad,
                current: page,
                page: Math.ceil(pagedata / perPage),
                total: pagedata
            }
            console.log(returnObj, "=-=-=returnObj=-=-=-=")
            console.log(page, "=-=-=page==-=-")
            return res.json({ status: true, Message: "succsess", data: returnObj });
            // var userId = req.userId;
            // let getLaunchPad = await launchPadhistoryDB.find({user_id : userId}).exec();
            // if(getLaunchPad){
            //     res.json({ status : true, Message : "success", data :getLaunchPad });
        } else {
            res.json({ status: false, Message: "false", data: {} });
        }
    } catch (error) {
        console.log(error, "-=-=-=errorebuginlaunnch=-=-=")
        return res.json({ status: false, Message: "Internal server  error" });
    }
});


router.get('/getlaunchpadHistory',common.tokenmiddleware,  async (req, res) => {
    try {
        launchPadhistoryDB.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "userdata"
                }
            },
            ]).exec((err,data)=> {
                if(!err){
                    return res.json({ status : true, Message : "Success", data : data });
                }else{
                    return res.json({ status : false, Message : "Please try again later", data : {} });
                }
            });

    } catch (error) {
        console.log(error,'=-=-=-error-=-')
        return res.json({ status : false, Message : "Internal server error" });
    }
});


router.post('/buytoken_calculation', common.tokenmiddleware, async (req, res) => {
    try {
        var amount = req.body.amount;
        var currency = req.body.currency;
        var price = req.body.tokenprice;

        if (amount != null && amount != undefined && currency != null && currency != undefined && price != null && price != undefined) {
            client.hget('CurrencyConversion', 'allpair', async function (err, value) {
                if (!err) {
                    let redis_response = await JSON.parse(value);
                    var CurrentINRValue = parseFloat(redis_response[currency].INR);
                    console.log(CurrentINRValue, '=--=-==-=-=-inrValue-=-=')
                    var priceValue = +price;
                    var tokenPrice = 1 / +priceValue;
                    var calTotal = CurrentINRValue * tokenPrice;
                    var quantity = +calTotal * +amount;
                    return res.json({ status: true, Message: "Success", total: quantity });
                }

            });
        }
        else {
            return res.json({ status: false, Message: "Please enter all the required fields" });
        }
    } catch (error) {
        return res.json({ status: false, Message: "Internal server error" });
    }
});


router.get('/lauchpad_history', common.tokenmiddleware, async (req, res) => {
    try {
        var userId = req.userId;
        let getLaunchPad = await launchPadhistoryDB.find({ user_id: userId }).exec();
        if (getLaunchPad) {
            var resp_data = [];
            if (getLaunchPad.length > 0) {
                for (var i = 0; i < getLaunchPad.length; i++) {
                    var obj = {
                        'tokenSymbol': getLaunchPad[i].tokenSymbol,
                        'tokenAmount': parseFloat(getLaunchPad[i].tokenAmount).toFixed(8),
                        'orderid': getLaunchPad[i].orderid,
                        'fees': parseFloat(getLaunchPad[i].fees).toFixed(8),
                        'sellCurrency': getLaunchPad[i].sellCurrency,
                        'createdDate': moment(getLaunchPad[i].createdDate).format("MM-DD-YYYY")
                    }
                    resp_data.push(obj);
                }
                res.json({ status: true, Message: "success", data: resp_data });
            }
            else {
                res.json({ status: true, Message: "success", data: {} });
            }

        } else {
            res.json({ status: false, Message: "false", data: {} });
        }
    } catch (error) {
        return res.json({ status: false, Message: "Internal server error" });
    }
});

router.get('/allLaunchpad', async (req, res) => {
    try {
        let getLaunchDatas = await RedisService.hgetall('launchpadTokens');
        let launchPadDetails = await JSON.parse(getLaunchDatas);
        var expiredTokens = [];
        var UpcomingTokens = [];
        var inprogressToken = [];
        console.log(launchPadDetails, '-=-=launchPadDetails=-=-=launchPadDetails');
        if (launchPadDetails != null) {
            for (var i = 0; i < launchPadDetails.length; i++) {
                var startDate = new Date(launchPadDetails[i].startDate).getTime();
                var currentDate = new Date().getTime();
                var endDate = new Date(launchPadDetails[i].endDate).getTime();

                // =================Completed Tokens======================//
                if (endDate < currentDate) {
                    var obj = {
                        '_id': launchPadDetails[i]._id,
                        'tokenImage': launchPadDetails[i].image,
                        'coinName': launchPadDetails[i].coinName,
                        'totalSupply': launchPadDetails[i].totalSupply,
                        'symbol': launchPadDetails[i].symbol,
                        'network': launchPadDetails[i].network,
                        'startDate': moment(launchPadDetails[i].startDate).format("DD-MM-YYYY"),
                        'endDate': moment(launchPadDetails[i].endDate).format("DD-MM-YYYY")
                    }
                    expiredTokens.push(obj);
                }
                // =================Upcoming Tokens======================//
                if (currentDate < startDate) {
                    var obj = {
                        '_id': launchPadDetails[i]._id,
                        'tokenImage': launchPadDetails[i].image,
                        'coinName': launchPadDetails[i].coinName,
                        'totalSupply': launchPadDetails[i].totalSupply,
                        'symbol': launchPadDetails[i].symbol,
                        'network': launchPadDetails[i].network,
                        'startDate': moment(launchPadDetails[i].startDate).format("DD-MM-YYYY"),
                        'endDate': moment(launchPadDetails[i].endDate).format("DD-MM-YYYY")
                    }
                    UpcomingTokens.push(obj);
                }

                // =================Inprogress Tokens======================//
                if (startDate < currentDate && currentDate < endDate) {
                    //if (currentDate < endDate) {
                    var obj = {
                        '_id': launchPadDetails[i]._id,
                        'tokenImage': launchPadDetails[i].image,
                        'coinName': launchPadDetails[i].coinName,
                        'totalSupply': launchPadDetails[i].totalSupply,
                        'symbol': launchPadDetails[i].symbol,
                        'network': launchPadDetails[i].network,
                        'startDate': moment(launchPadDetails[i].startDate).format("DD-MM-YYYY"),
                        'endDate': moment(launchPadDetails[i].endDate).format("DD-MM-YYYY")
                    }
                    inprogressToken.push(obj);
                }
                var obj = {
                    expiredTokens: expiredTokens,
                    UpcomingTokens: UpcomingTokens,
                    inprogressToken: inprogressToken
                }

            }
            return res.json({ status: true, Message: "success", data: obj });
        } else {
            return res.json({ status: false, Message: "error", data: {} });
        }

    } catch (error) {
        console.log(':::error:::::', error);

        return res.json({ status: false, Message: "Internal server error" });
    }

});


module.exports = router;