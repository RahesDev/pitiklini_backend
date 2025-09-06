var express = require('express');
var router = express.Router();
var common = require('../helper/common');
var conversion = require('../helper/currencyConversion');
var usersDB = require('../schema/users');
let jwt = require('jsonwebtoken');
const key = require('../config/key')
const jwt_secret = key.JWT_TOKEN_SECRET;
var mongoose = require('mongoose');
var userWalletDB = require('../schema/userWallet');
var currencyDB = require('../schema/currency')
const { RedisService } = require("../services/redis");
const cron = require('node-cron');
const crypto = require('crypto');
var moment = require('moment');
const redis = require("redis");
client = redis.createClient();
const swapDB = require('../schema/swap');
const profitDb = require('../schema/profit');
const notify = require("../schema/notification");
const ObjectId = mongoose.Types.ObjectId;
const transferDB = require('../schema/internalTransfer');


router.post("/currencyConversion", async (req, res) => {
  try {
    var from = req.body.from;
    var to = req.body.to;
    var getCurrecy = await conversion.currencyConversion(from, to);
    console.log(getCurrecy, "ppopopopop");
    if (getCurrecy) {
      return res.status(200).send({status: true, Message: {"price":getCurrecy}});
    } else {
      return res.status(200).send({status: false, Message: 0});
    }
  } catch (error) {}
});

router.post('/swapping', common.tokenmiddleware, async (req, res) => {
    try {
      console.log(req.body, req.userId,'==-=-=-=-=-=req.body=-=-=-=-=-=-=-=-=');
      if(req.body.from != "" && req.body.to != "" && req.body.from_id != "" && req.body.to_id != "" && req.body.fromAmount != "" && req.body.toAmount != "" && req.body.fee != "" && req.body.withFee != "" && req.body.currentPrice != ""){
        if(req.body.from_id != req.body.to_id ){
          let getCurrecy = await currencyDB.findOne({_id : req.body.from_id},{_id:1,maxSwap:1,minSwap:1,currencySymbol:1,swapFee:1}).exec({});
          if(getCurrecy){
            // ====================CALCULATION PART=================================//
            // var amounCal = Number(req.body.fromAmount) * Number(getCurrecy.swapFee) / 100;
            // console.log(amounCal,'=-=-=-amounCal',req.body.fromAmount,"req.body.fromAmount",req.body.currentPrice,"req.body.price" );

            var feeCal   = Number(req.body.fromAmount) * Number(getCurrecy.swapFee) / 100;
            console.log(feeCal,'=-=-=-feeCal=-=-=-feeCal-=-=-feeCal-=-');
            var getToAmount = Number(req.body.fromAmount) * Number(req.body.currentPrice)
            var totalCal = Number(req.body.fromAmount) + feeCal;
            totalCal = parseFloat(totalCal).toFixed(8);
             console.log(getCurrecy,'=-=-=-getCurrecy=-=-=-getCurrecy-=-=-getCurrecy-=-');
             if(+req.body.fromAmount >=  getCurrecy.minSwap){
               if(+req.body.fromAmount <= getCurrecy.maxSwap){
                let getWallet =await userWalletDB.findOne({ userId : req.userId }).exec({});
                // console.log(getWallet,'=-=-=getWallet=-=-=-');
                if(getWallet){
                  var wallets = getWallet.wallets;
                  var Indexing = wallets.findIndex(x => x.currencyId == req.body.from_id);
                  if(Indexing != -1){
                    // console.log(Indexing,'=-=-Indexing=-=-=-Indexing-=-=-=-Indexing-=-==-');
                    var balance = parseFloat(wallets[Indexing].amount).toFixed(8);
                    console.log('balance---',balance,totalCal,'totalCaltotalCaltotalCal');
                    if(balance >= totalCal){
                      var toIndexing =  wallets.findIndex(x => x.currencyId == req.body.to_id);
                      if(toIndexing != -1){
                        var tobalance = parseFloat(wallets[toIndexing].amount).toFixed(8);
                        console.log('tobalance---',tobalance);
                        var detuctFrombalance = Number(balance) -  Number(totalCal);
                        var addToBalance      = Number(tobalance) +  Number(getToAmount);
                        var adminFee          = Number(feeCal);
                        console.log(':::detuctFrombalance',detuctFrombalance);
                        console.log(':::addToBalance',addToBalance);
                        console.log(':::adminFee',adminFee);
                        var updateFromBal = await userWalletDB.updateOne({ userId: req.userId, "wallets.currencyId": req.body.from_id }, { "$set": { "wallets.$.amount": +detuctFrombalance } }, { multi: true });
                        if(updateFromBal){
                          var updateTomBal = await userWalletDB.updateOne({ userId: req.userId, "wallets.currencyId": req.body.to_id }, { "$set": { "wallets.$.amount": +addToBalance } }, { multi: true });
                          if(updateTomBal){
                            var obj = {
                              fromCurrency : req.body.from,
                              toCurrency   : req.body.to,
                              amount       : +req.body.fromAmount,
                              totalAmount  : totalCal,
                              fee          : feeCal,
                              price        : req.body.currentPrice,
                              userId       : req.userId,
                              fromCurrID   : req.body.from_id,
                              toCurreID    : req.body.to_id,
                            }
                            let swapCreate = await swapDB.create(obj);
                            
                            console.log(`${+req.body.fromAmount} ${req.body.from} to ${+req.body.currentPrice} ${req.body.to} Converted Successfully`,"swapCreate");

                            var notification = {
                              to_user_id: req.userId,
                              status: 0,
                              message: ` ${+req.body.fromAmount} ${req.body.from} to ${+req.body.currentPrice} ${req.body.to} Converted Successfully`,
                              link: "/notification",
                            }

                            let notifica = await notify.create(notification);
                          
                            if(swapCreate){
                              

                              var profitObj = {
                                type      : 'swap',
                                user_id   : req.userId,
                                currencyid: req.body.from_id,
                                fees      : feeCal,
                                fullfees  : feeCal,
                                orderid   : swapCreate._id,
                              }
                              let storeAdminFee = await profitDb.create(profitObj);
                              if(storeAdminFee){



                                return res.status(200).send({ status : true, Message : "Swaping success !"});
                              }else{
                                return res.status(200).send({ status : false, Message : "Please try again later!" })
                              }
                            }else{
                              return res.status(200).send({ status : false, Message : "Please try again later!" })
                            }
                          }else{
                            return res.status(200).send({ status : false, Message : "Please try again later!" })
                          }
                        }else{
                        return res.status(200).send({ status : false, Message : "Please try again later!" })
                        }
                      }else{
                        return res.status(200).send({ status : false, Message : "Please try again later!" })
                      }
                    }else{
                      return res.status(200).send({ status : false, Message : "Insufficient Balance !"});
                    }
                  }else{
                    return res.status(200).send({ status : false, Message : "Please try again later!" })
                  }
                }else{
                  return res.status(200).send({ status : false, Message : "Please try again later!" })
                }
               }else{
                 return res.status(200).send({ status : false, Message : "Please enter maximum "+getCurrecy.maxSwap+" amount" });
               }
             }else{
               return res.status(200).send({ status : false, Message : "Please enter minimum "+getCurrecy.minSwap+" amount" });
             }
          }else{
           return res.status(200).send({ status : false, Message : "Please try again later!" })
          }
        }else{
          return res.status(400).send({ status : false, Message : "Should not allowed same currency swapping" })
        }
      }else{
        return res.status(400).send({ status : false, Message : "Please fill all fields!" });
      }

    } catch (error) {
      console.log(error,'=-=-=error-=-=-error-=-=-error');
      res.json({ status: false, Message: "Internel server error!", code: 500 });
    }
});

  router.post('/swappingHistory', common.tokenmiddleware, async (req, res) => {
    try {
      console.log('-------------', req.body);
      var search = req.body.search;
      var perPage = Number(req.body.perpage ? req.body.perpage : 5);
      var page = Number(req.body.page ? req.body.page : 1);
      console.log(perPage, "=-=-=-pr")
      var skippage = (perPage * page) - perPage
      var loginhistory = await swapDB.find({userId: req.userId  }).skip(skippage).limit(perPage).sort({ _id: -1 }).exec()
      if (loginhistory) {
        var pagedata = await swapDB.find({ userId: req.userId }).count();
        console.log(pagedata, "====page=====")
        var returnObj = {
          data: loginhistory,
          current: page,
          pages: Math.ceil(pagedata / perPage),
          total: pagedata
        }
        console.log("==-=loginhistory-=-=-")
        return res.status(200).send({ success: true, message: 'Data Successfully retrieved', data: returnObj });
      }
      else {
        return res.status(400).send({ success: true, message: 'Data Does Not retrieved' });
      }
  
    } catch (error) {
      console.log('ERROR FROM getSessionHisotry::', error);
      return res.json({ status: false, Message: "Internal server error" });
    }
  
});

  router.get('/getUserBalanceswap', common.tokenmiddleware, (req, res) => {
    try {
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
        $match: { userId: mongoose.Types.ObjectId(req.userId) }
      },
  
      {
        $project: {
          "currencyName": { $arrayElemAt: ['$currdetail.currencyName', 0] },
          "currencySymbol": { $arrayElemAt: ['$currdetail.currencySymbol', 0] },
          "Currency_image": { $arrayElemAt: ['$currdetail.Currency_image', 0] },
          "currencyType": { $arrayElemAt: ['$currdetail.currencyType', 0] },
          "swapStatus": { $arrayElemAt: ['$currdetail.swapStatus', 0] },
          "withdrawFee": { $arrayElemAt: ['$currdetail.withdrawFee', 0] },
          "maxSwap": { $arrayElemAt: ['$currdetail.maxSwap', 0] },
          "minSwap": { $arrayElemAt: ['$currdetail.minSwap', 0] },
          "swapFee": { $arrayElemAt: ['$currdetail.swapFee', 0] },
          "minWithdrawLimit": { $arrayElemAt: ['$currdetail.minWithdrawLimit', 0] },
          "maxWithdrawLimit": { $arrayElemAt: ['$currdetail.maxWithdrawLimit', 0] },
          "currencyBalance": "$wallets.amount",
          "holdAmount": "$wallets.holdAmount",
          "currid": { $arrayElemAt: ['$currdetail._id', 0] },
          "popularOrder": { $arrayElemAt: ['$currdetail.popularOrder', 0] }
        }
      },
      { $sort: { currencySymbol: 1 } },
  
      ]).exec((err, data) => {
        if (err) {
          return res.json({ status: false, Message: err, code: 200 });
        } else {
          if (data.length > 0) {
            var currencies = [];
            var dep_currencies = [];
            for (var i = 0; i < data.length; i++) {
              if (data[i].swapStatus == "1") {
                var obj = {
                  currencyName: data[i].currencyName,
                  currencySymbol: data[i].currencySymbol,
                  currencyType: data[i].currencyType,
                  image: data[i].Currency_image,
                  withdrawFee: data[i].withdrawFee,
                  minWithdrawLimit: data[i].minWithdrawLimit,
                  maxWithdrawLimit: data[i].maxWithdrawLimit,
                  currencyBalance: data[i].currencyBalance,
                  holdAmount: data[i].holdAmount,
                  currid: data[i].currid,
                  maxSwap: data[i].maxSwap,
                  minSwap: data[i].minSwap,
                  swapFee: data[i].swapFee,
  
                }
                currencies.push(obj);
              }
            }
          }
          return res.json({ status: true, data: currencies, code: 200 });
        }
      });
    } catch (error) {
      console.log("swap balance error",error);
      return res.json({ status: false, Message: "Internal server", code: 500 });
    }
});
  
  router.post('/walletTransfer', common.isEmpty, common.tokenmiddleware, async (req, res) => {

    try {
        var userId = req.userId;
        var {fromWallet, toWallet, currency, amount} = req.body;
        var amount = Number(amount );
        if(fromWallet && toWallet && currency &&  amount){
          if(fromWallet !=toWallet){
            let findWallet = await userWalletDB.findOne({userId: userId ,wallets: { $elemMatch: { currencyId: currency} }},{userId: 1, "wallets.$": 1 }).exec();
            if(findWallet){
              var walletData = findWallet.wallets[0];
              if(walletData){
                let checkBalance = fromWallet == "Spot" ? walletData.amount  >= Number(amount) : fromWallet == "P2P" ? walletData.p2p  >= Number(amount) : fromWallet == "Future" ? walletData.future  >= Number(amount) : false ;
                if(checkBalance == true){
                  var obj = { currencyId: currency, currency : walletData.currencySymbol ,  amount: amount,fromWallet: fromWallet, toWallet : toWallet, userId : userId};
                  var notifyDatas = {to_user_id: ObjectId(userId) , message:"Internal transfer done successfully", link: "/notificationHistory",status: 0}
                  if(fromWallet == "Spot" && toWallet == "P2P"){
                    var spotBalance = walletData.amount - amount;
                    var p2pBalance  = walletData.p2p + amount;
                    var updateFromBal = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": currency }, { "$set": { "wallets.$.amount": +spotBalance, "wallets.$.p2p": +p2pBalance,  } }, { multi: true });
                    let recordTranfr = await transferDB.create(obj);
                    let notifyTransfer = await notify.create(notifyDatas);
                    return res.json({status: true,  Message: "Your amount has been transferred successfully"});
                  }else if(fromWallet == "P2P" && toWallet == "Spot"){
                    var spotBalance = walletData.amount + amount;
                    var p2pBalance  = walletData.p2p - amount;
                    var updateFromBal = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": currency }, { "$set": { "wallets.$.amount": +spotBalance, "wallets.$.p2p": +p2pBalance,  } }, { multi: true });
                    let recordTranfr = await transferDB.create(obj);
                    let notifyTransfer = await notify.create(notifyDatas);
                    return res.json({status: true,  Message: "Your amount has been transferred successfully"});
                  }else if(fromWallet == "Spot" && toWallet == "Future"){
                    var spotBalance = walletData.amount - amount;
                    var futruebalance = walletData.future + amount;
                    var updateFromBal = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": currency }, { "$set": { "wallets.$.amount": +spotBalance, "wallets.$.future": +futruebalance,  } }, { multi: true });
                    let recordTranfr = await transferDB.create(obj);
                    let notifyTransfer = await notify.create(notifyDatas);
                    return res.json({status: true,  Message: "Your amount has been transferred successfully"});
                  }else if(fromWallet == "Future" && toWallet == "Spot"){
                    var spotBalance = walletData.amount + amount;
                    var futruebalance = walletData.future - amount;
                    var updateFromBal = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": currency }, { "$set": { "wallets.$.amount": +spotBalance, "wallets.$.future": +futruebalance,  } }, { multi: true });
                    let recordTranfr = await transferDB.create(obj);
                    let notifyTransfer = await notify.create(notifyDatas);
                    return res.json({status: true,  Message: "Your amount has been transferred successfully"});
                  }else if(fromWallet == "P2P" && toWallet == "Future"){
                    var p2pBalance = walletData.p2p - amount;
                    var futruebalance =  walletData.future + amount;
                    var updateFromBal = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": currency }, { "$set": { "wallets.$.p2p": +p2pBalance, "wallets.$.future": +futruebalance,  } }, { multi: true });
                    let recordTranfr = await transferDB.create(obj);
                    let notifyTransfer = await notify.create(notifyDatas);
                    return res.json({status: true,  Message: "Your amount has been transferred successfully"});
                  }else if(fromWallet == "Future" && toWallet == "P2P"){
                    var p2pBalance = walletData.p2p + amount;
                    var futruebalance =  walletData.future - amount;
                    var updateFromBal = await userWalletDB.updateOne({ userId: userId, "wallets.currencyId": currency }, { "$set": { "wallets.$.p2p": +p2pBalance, "wallets.$.future": +futruebalance,  } }, { multi: true });
                    let recordTranfr = await transferDB.create(obj);
                    let notifyTransfer = await notify.create(notifyDatas);
                    return res.json({status: true,  Message: "Your amount has been transferred successfully"});
                  }else{
                    return res.json({status: false, Message: "Oops!, Please try again later!"});
                  }
                }else{
                  return res.json({status: false, Message: "Oops!, Insufficient Balance"});
                }
              }else{
                return res.json({status: false, Message: "Oops!, Please try again later"});
              }
            }else{
              return res.json({status: false, Message: "Oops!, Please try again later"});
            }
          }else{
            return res.json({status: false, Message: "Oops!, From wallet and To wallet must be different"});
          }

        }else{
          return res.json({status: false, Message: "Oops!, Enter all fields"});
        }
    }catch (error) {
      return res.json({ status: false, Message: "Internal server", code: 500 });
    }
});




module.exports = router;
