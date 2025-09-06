var express = require('express');
var router = express.Router();
var common = require('../helper/common');
var usersDB = require('../schema/users');
const key = require('../config/key');
const stakingDB = require('../schema/staking');
const currencyDB = require('../schema/currency');
const userStakingDB = require('../schema/userStakingPlan');
const wallets = require('../helper/wallets');
var userWalletDB = require('../schema/userWallet');
var moment = require('moment');
const redis = require("redis");
const client = redis.createClient(key.redisdata);
const cron = require('node-cron');
const mongoose = require('mongoose');
const { parse } = require('express-useragent');
var referralDB = require("../schema/referral");
var referralHistoryDB = require("../schema/referralHistory");
const redisHelper = require("../redis-helper/redisHelper");
var stake_payouts = require("../schema/stake_payouts");
var profitDb = require ("../schema/profit");
BINANCEexchange = require("../exchanges/binance");

router.post("/updateStaking", common.tokenmiddleware, async (req, res) => {
  try {
    let findCurrency = await currencyDB
      .findOne({ _id: req.body.currencyId })
      .exec({});
    if (findCurrency) {
      let findStakeDetails = await stakingDB
        .findOne({ currencyId: req.body.currencyId })
        .exec({});
      if (findStakeDetails == null) {
        //  =======CREATE STAKING========  //
        let createStaking = await stakingDB.create(req.body);
        if (createStaking) {
          return res.json({
            status: true,
            Message:
              findCurrency.currencySymbol +
              "Currency staking process completed",
          });
        } else {
          return res.json({ status: false, Message: "Please try again later" });
        }
      } else {
        //  =======UPDATE STAKING========  //
        var obj = {
          firstDuration: req.body.firstDuration,
          secondDuration: req.body.secondDuration,
          thirdDuration: req.body.thirdDuration,
          fourthDuration: req.body.fourthDuration,
          apy: req.body.apy,
          maximumStaking: req.body.maximumStaking,
          minimumStaking: req.body.minimumStaking,
          status: req.body.status,
          modifiedDate: Date.now(),
          // apy              : req.body.apy,
          FistDurationAPY: req.body.FistDurationAPY,
          SecondDurationAPY: req.body.SecondDurationAPY,
          ThirdDurationAPY: req.body.ThirdDurationAPY,
          FourthDurationAPY: req.body.FourthDurationAPY,
          currencyImage: req.body.currencyImage,
          // APRinterest       : req.body.APRinterest
        };
        let updateStaking = await stakingDB
          .updateOne({ currencyId: req.body.currencyId }, { $set: obj })
          .exec({});
        if (updateStaking) {
          return res.json({
            status: true,
            Message:
              findCurrency.currencySymbol +
              " Currency staking updating completed",
          });
        } else {
          return res.json({ status: false, Message: "Please try again later" });
        }
      }
    } else {
      return res.json({ status: false, Message: "Please try again later" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post(
  "/updateStakingFlexible",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      console.log("req.body===", req.body);
      let findCurrency = await currencyDB
        .findOne({ _id: req.body.currencyId })
        .exec({});
      if (findCurrency) {
        let findStakeDetails = await stakingDB
          .findOne({ currencyId: req.body.currencyId })
          .exec({});
        if (findStakeDetails == null) {
          //  =======CREATE STAKING========  //
          let createStaking = await stakingDB.create(req.body);
          if (createStaking) {
            return res.json({
              status: true,
              Message:
                findCurrency.currencySymbol +
                "Currency staking process completed",
            });
          } else {
            return res.json({
              status: false,
              Message: "Please try again later",
            });
          }
        } else {
          //  =======UPDATE STAKING========  //
          var obj = {
            //  firstDurationflex  :  req.body.firstDurationflex,
            //  secondDurationflex  :  req.body.secondDurationflex,
            //  thirdDurationflex :  req.body.thirdDurationflex,
            //  fourthDurationflex :  req.body.fourthDurationflex,
            maximumStakingflex: req.body.maximumStakingflex,
            minimumStakingflex: req.body.minimumStakingflex,
            //  firstProfit   :  req.body.firstProfit,
            //  firstInterest   :  req.body.firstInterest,
            //  secondProfit   :  req.body.secondProfit,
            //  secondInterest   :  req.body.secondInterest,
            //  thirdInterst   :  req.body.thirdInterst,
            //  thirdProfit   :  req.body.thirdProfit,
            //  fourthProfit   :  req.body.fourthProfit,
            //  fourthInterest   :  req.body.fourthInterest,
            statusflex: req.body.statusflex,
            APRinterest: req.body.APRinterest,
          };
          console.log(obj, "=-=-=-=-=obj");
          let updateStaking = await stakingDB
            .updateOne({ currencyId: req.body.currencyId }, { $set: obj })
            .exec({});
          if (updateStaking) {
            return res.json({
              status: true,
              Message:
                findCurrency.currencySymbol +
                " Currency staking updating completed",
            });
          } else {
            return res.json({
              status: false,
              Message: "Please try again later",
            });
          }
        }
      } else {
        return res.json({ status: false, Message: "Please try again later" });
      }
    } catch (error) {
      console.log(error, "=-=-=-=-=error");

      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post("/getStaking", common.tokenmiddleware, async (req, res) => {
  try {
    let findCurrency = await stakingDB
      .findOne({ currencyId: req.body.currencyId })
      .exec({});
    if (findCurrency) {
      return res.json({ status: true, Message: findCurrency });
    } else {
      return res.json({ status: false, Message: "Please try again later" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/get_staking_details", async (req, res) => {
  try {
    var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 1);
    var page = Number(req.body.FilPage ? req.body.FilPage : 1);
    var skippage = perPage * page - perPage;
    var search = req.body.search;
    console.log("perPage====", perPage);
    console.log("page====", page);
    let getStatkeDetails = await stakingDB
      .find({
        status: "Active",
        $or: [
          { currencyName: { $regex: new RegExp(search, "i") } },
          { currencySymbol: { $regex: new RegExp(search, "i") } },
        ],
      })
      .skip(skippage)
      .limit(perPage)
      .sort({ _id: 1 });
    if (getStatkeDetails) {
      let count = await stakingDB.find({ status: "Active" }).countDocuments( );
      console.log("count",count)
      if (count) {
        var data = {
          status: true,
          result: getStatkeDetails,
          current: page,
          count: count,
          pages: Math.ceil(count / perPage),
        };
        return res.json({ status: true, data: data, Message: "Success" });
      } else {
        return res.json({
          status: false,
          data: {},
          Message: "Please try later",
        });
      }
    } else {
      return res.json({ status: false, data: {}, Message: "Please try later" });
    }
  } catch (error) {
    console.log(error,"----------------")
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/getStatkingDetails", async (req, res) => {
  try {
    var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
    var page = Number(req.body.FilPage ? req.body.FilPage : 0);
    var skippage = perPage * page - perPage;
    var search = req.body.search;
    console.log("perPage====", perPage);
    console.log("page====", page);
    let getStatkeDetails = await stakingDB
      .find({
        status: "Active",
        $or: [
          { currencyName: { $regex: new RegExp(search, "i") } },
          { currencySymbol: { $regex: new RegExp(search, "i") } },
        ],
      })
      .skip(skippage)
      .limit(perPage)
      .sort({ _id: 1 });
    if (getStatkeDetails) {
      let count = await stakingDB.find({ status: "Active" }).count();
      if (count) {
        var data = {
          status: true,
          result: getStatkeDetails,
          current: page,
          count: count,
          pages: Math.ceil(count / perPage),
        };
        return res.json({ status: true, data: data, Message: "Success" });
      } else {
        return res.json({
          status: false,
          data: {},
          Message: "Please try later",
        });
      }
    } else {
      return res.json({ status: false, data: {}, Message: "Please try later" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post(
  "/confirmStaking",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      console.log(req.body, "=-=-=confirmStaking-==-=-=-))*********");

      var userId = req.userId;
      let findCurrency = await stakingDB
        .findOne({ _id: req.body.stakeMore.id })
        .exec({});
      if (findCurrency) {
        console.log(req.body, "=-=-=-==-=-=-");
        if (
          req.body.stakeAmont != "" &&
          req.body.stakeAmont != undefined &&
          req.body.stakeAmont != null &&
          req.body.stakeAmont > 0
        ) {
          var currencyID = findCurrency.currencyId;
          if (req.body.type == "fixed") {
            console.log("-=-=-fixedfixedfixed=-=-==-=-=");
            if (
              findCurrency.minimumStaking <= parseFloat(req.body.stakeAmont)
            ) {
              if (
                findCurrency.maximumStaking >= parseFloat(req.body.stakeAmont)
              ) {
                let checkStakeStatus = await userStakingDB
                  .findOne({
                    stakeCurrencsymbol: findCurrency.currencySymbol,
                    userId: userId,
                    status: 0,
                  })
                  .exec({});
                //if(checkStakeStatus == null){
                let getWallets = await userWalletDB.findOne({
                  userId: req.userId,
                });
                if (getWallets) {
                  var walletData = getWallets.wallets;
                  var indexing = walletData.findIndex(
                    (x) => x.currencySymbol == findCurrency.currencySymbol
                  );
                  if (indexing != -1) {
                    let walletBalance = walletData[indexing];
                    var spotAmount = walletBalance.amount;
                    var spotHold = walletBalance.holdAmount;
                    var stakeAmount = walletBalance.stakeAmount;
                    // var stakeAmount   = 0;
                    var amount =
                      parseFloat(spotAmount) - parseFloat(req.body.stakeAmont);
                    console.log(amount, "amount");
                    var addStake =
                      parseFloat(stakeAmount) + parseFloat(req.body.stakeAmont);

                    console.log(addStake, "addStake");

                    var fromDate = new Date();
                    const date = new Date();
                    date.setDate(date.getDate() + +req.body.stakingPlan);
                    var toDate = date;
                    if (spotAmount >= req.body.stakeAmont) {
                      var detuctSpot = await userWalletDB.updateOne(
                        { userId: userId, "wallets.currencyId": currencyID },
                        { $set: { "wallets.$.amount": +amount } },
                        { multi: true }
                      );
                      console.log(detuctSpot, "detuctSpot");

                      if (detuctSpot) {
                        var stakeUpdate = await userWalletDB.updateOne(
                          { userId: userId, "wallets.currencyId": currencyID },
                          { $set: { "wallets.$.stakeAmount": +addStake } },
                          { multi: true }
                        );

                        console.log(stakeUpdate, "stakeUpdate");

                        if (stakeUpdate) {
                          var obj = {
                            userId: req.userId,
                            stakingPlan: +req.body.stakingPlan,
                            totalInterest: +req.body.totalInterest,
                            dailyinterest: +req.body.dailyinterest,
                            startDate: fromDate,
                            endDate: toDate,
                            currentAPY: +req.body.currentAPY,
                            stakeAmont: +req.body.stakeAmont,
                            note: req.body.stakeMore.status,
                            stakeCurrencsymbol: findCurrency.currencySymbol,
                            stakeCurrencyName: findCurrency.currencyName,
                            stakeId: findCurrency._id,
                            currencyImage: findCurrency.currencyImage,
                            currencyid: findCurrency.currencyId,
                            type: "fixed",
                          };
                          let create = await userStakingDB.create(obj);
                          if (create) {
                            return res.json({
                              status: true,
                              Message: "Success!",
                              next_claim: moment(req.body.toDates).format("DD/MM/YYYY hh:mm")
                            });
                          } else {
                            return res.json({
                              status: false,
                              Message: "Please try again later",
                            });
                          }
                        } else {
                          return res.json({
                            status: false,
                            Message: "Please try again later",
                          });
                        }
                      } else {
                        return res.json({
                          status: false,
                          Message: "Please try again later",
                        });
                      }
                    } else {
                      return res.json({
                        status: false,
                        Message: "Insufficient funds for staking",
                      });
                    }
                  } else {
                    return res.json({
                      status: false,
                      Message: "Please try again later",
                    });
                  }
                } else {
                  return res.json({
                    status: false,
                    Message: "Please try again later",
                  });
                }
                // }else{
                //     return res.json({ status : false, Message : "Already staked this currency, Please try another currency or wait for some times" });
                // }
              } else {
                return res.json({
                  status: false,
                  Message:
                    "Maximum staking level " + findCurrency.maximumStaking,
                });
              }
            } else {
              return res.json({
                status: false,
                Message: "Minimum staking level " + findCurrency.minimumStaking,
              });
            }
          } else if (req.body.type == "flexible") {
            console.log("-=-=-flexibleflexibleflexible=-=-==-=-=");

            if (
              findCurrency.minimumStaking <= parseFloat(req.body.stakeAmont)
            ) {
              if (
                findCurrency.maximumStaking >= parseFloat(req.body.stakeAmont)
              ) {
                let checkStakeStatus = await userStakingDB
                  .findOne({
                    stakeCurrencsymbol: findCurrency.currencySymbol,
                    userId: userId,
                    status: 0,
                  })
                  .exec({});
                //if(checkStakeStatus == null){
                let getWallets = await userWalletDB.findOne({
                  userId: req.userId,
                });
                if (getWallets) {
                  var walletData = getWallets.wallets;
                  var indexing = walletData.findIndex(
                    (x) => x.currencySymbol == findCurrency.currencySymbol
                  );
                  if (indexing != -1) {
                    let walletBalance = walletData[indexing];
                    var spotAmount = walletBalance.amount;
                    var spotHold = walletBalance.holdAmount;
                    var stakeAmount = walletBalance.FlexstakeAmount;
                    // var stakeAmount   = 0;
                    var amount =
                      parseFloat(spotAmount) - parseFloat(req.body.stakeAmont);
                    var addStake =
                      parseFloat(stakeAmount) + parseFloat(req.body.stakeAmont);
                    var fromDate = new Date();
                    const date = new Date();
                    date.setDate(date.getDate() + +req.body.stakingPlan);
                    var toDate = date;
                    if (spotAmount >= req.body.stakeAmont) {
                      var detuctSpot = await userWalletDB.updateOne(
                        { userId: userId, "wallets.currencyId": currencyID },
                        { $set: { "wallets.$.amount": +amount } },
                        { multi: true }
                      );
                      if (detuctSpot) {
                        var stakeUpdate = await userWalletDB.updateOne(
                          { userId: userId, "wallets.currencyId": currencyID },
                          { $set: { "wallets.$.FlexstakeAmount": +addStake } },
                          { multi: true }
                        );
                        if (stakeUpdate) {
                          var obj = {
                            userId: req.userId,
                            stakingPlan: +req.body.stakingPlan,
                            totalInterest: +req.body.totalInterest,
                            dailyinterest: +req.body.dailyinterest,
                            startDate: fromDate,
                            endDate: toDate,
                            currentAPY: +req.body.currentAPY,
                            stakeAmont: +req.body.stakeAmont,
                            note: req.body.stakeMore.status,
                            stakeCurrencsymbol: findCurrency.currencySymbol,
                            stakeCurrencyName: findCurrency.currencyName,
                            stakeId: findCurrency._id,
                            currencyImage: findCurrency.currencyImage,
                            currencyid: findCurrency.currencyId,
                            type: "Flexible",
                          };
                          let create = await userStakingDB.create(obj);
                          if (create) {
                            return res.json({
                              status: true,
                              Message: "Success!",
                            });
                          } else {
                            return res.json({
                              status: false,
                              Message: "Please try again later",
                            });
                          }
                        } else {
                          return res.json({
                            status: false,
                            Message: "Please try again later",
                          });
                        }
                      } else {
                        return res.json({
                          status: false,
                          Message: "Please try again later",
                        });
                      }
                    } else {
                      return res.json({
                        status: false,
                        Message: "Insufficient funds for staking",
                      });
                    }
                  } else {
                    return res.json({
                      status: false,
                      Message: "Please try again later",
                    });
                  }
                } else {
                  return res.json({
                    status: false,
                    Message: "Please try again later",
                  });
                }
                // }else{
                //     return res.json({ status : false, Message : "Already staked this currency, Please try another currency or wait for some times" });
                // }
              } else {
                return res.json({
                  status: false,
                  Message:
                    "Maximum staking level " + findCurrency.maximumStaking,
                });
              }
            } else {
              return res.json({
                status: false,
                Message: "Minimum staking level " + findCurrency.minimumStaking,
              });
            }
          } else if (req.body.type == "yield") {
            console.log(
              req.body,
              "=-=-=-=req.bodyreq.bodyreq.body-=-=-=-=-=-=-=-=-="
            );
            if (
              findCurrency.minimumStakingYield <=
              parseFloat(req.body.stakeAmont)
            ) {
              if (
                findCurrency.maximumStakingYield >=
                parseFloat(req.body.stakeAmont)
              ) {
                let getWallets = await userWalletDB.findOne({
                  userId: req.userId,
                });
                if (getWallets) {
                  var walletData = getWallets.wallets;
                  var indexing = walletData.findIndex(
                    (x) => x.currencySymbol == findCurrency.currencySymbol
                  );
                  if (indexing != -1) {
                    let walletBalance = walletData[indexing];
                    var spotAmount = walletBalance.amount;
                    var spotHold = walletBalance.holdAmount;
                    var stakeAmount = walletBalance.stakeAmount;
                    // var stakeAmount   = 0;
                    var amount =
                      parseFloat(spotAmount) - parseFloat(req.body.stakeAmont);
                    var addStake =
                      parseFloat(stakeAmount) + parseFloat(req.body.stakeAmont);
                    var fromDate = new Date();
                    const date = new Date();
                    if (req.body.totalPlan == 1) {
                      date.setDate(date.getDate() + 365);
                    } else if (req.body.totalPlan == 3) {
                      date.setDate(date.getDate() + 1095);
                    } else if (req.body.totalPlan == 5) {
                      date.setDate(date.getDate() + 1825);
                    }

                    var toDate = date;

                    if (spotAmount >= req.body.stakeAmont) {
                      var detuctSpot = await userWalletDB.updateOne(
                        { userId: userId, "wallets.currencyId": currencyID },
                        { $set: { "wallets.$.amount": +amount } },
                        { multi: true }
                      );
                      if (detuctSpot) {
                        var stakeUpdate = await userWalletDB.updateOne(
                          { userId: userId, "wallets.currencyId": currencyID },
                          { $set: { "wallets.$.stakeAmont": +addStake } },
                          { multi: true }
                        );
                        if (stakeUpdate) {
                          // var obj ={
                          //     userId             : req.userId,
                          //     stakingPlan        : 0,
                          //     totalInterest      : +req.body.YieldEstimation,
                          //     dailyinterest      : "",
                          //     startDate          : fromDate,
                          //     endDate            : toDate,
                          //     currentAPY         : +req.body.APRPercentage,
                          //     stakeAmont         : +req.body.stakeAmont,
                          //     note               : req.body.stakeMore.status,
                          //     stakeCurrencsymbol : findCurrency.currencySymbol,
                          //     stakeCurrencyName  : findCurrency.currencyName,
                          //     stakeId            : findCurrency._id,
                          //     currencyImage      : findCurrency.currencyImage,
                          //     currencyid         : findCurrency.currencyId,
                          //     type               : "yield"

                          // }
                          console.log("=-=-=-=-0=-=-=-=-=-=-=-=-=-=");

                          var dailyProfit = 0;
                          var claimTime = req.body.stakingPlan;
                          var stakingPlan = req.body.totalPlan;
                          var totalProfit = req.body.totalInterest;
                          // if(claimTime=="Monthly")
                          // {
                          //     if(stakingPlan == 1)
                          //     {
                          //         dailyProfit = +totalProfit / 12;
                          //     }
                          //     else if(stakingPlan == 3)
                          //     {
                          //         dailyProfit = +totalProfit / 36;
                          //     }
                          //     else if(stakingPlan == 5)
                          //     {
                          //         dailyProfit = +totalProfit / 60;
                          //     }

                          // }
                          // else if(claimTime=="Quarterly")
                          // {
                          //     if(stakingPlan == 1)
                          //     {
                          //         dailyProfit = +totalProfit / 3;
                          //     }
                          //     else if(stakingPlan == 3)
                          //     {
                          //         dailyProfit = +totalProfit / 9;
                          //     }
                          //     else if(stakingPlan == 5)
                          //     {
                          //         dailyProfit = +totalProfit / 15;
                          //     }
                          // }
                          // else if(claimTime=="Half Yearly")
                          // {
                          //     if(stakingPlan == 1)
                          //     {
                          //         dailyProfit = +totalProfit / 6;
                          //     }
                          //     else if(stakingPlan == 3)
                          //     {
                          //         dailyProfit = +totalProfit / 18;
                          //     }
                          //     else if(stakingPlan == 5)
                          //     {
                          //         dailyProfit = +totalProfit / 30;
                          //     }
                          // }
                          // else if(claimTime=="Yearly")
                          // {
                          //     if(stakingPlan == 1)
                          //     {
                          //         dailyProfit = +totalProfit;
                          //     }
                          //     else if(stakingPlan == 3)
                          //     {
                          //         dailyProfit = +totalProfit / 3;
                          //     }
                          //     else if(stakingPlan == 5)
                          //     {
                          //         dailyProfit = +totalProfit / 5;
                          //     }
                          // }
                          var calc_month =
                            +req.body.currentYieldYear /
                            +req.body.yieldDuration;
                          console.log("calc_month==", calc_month);
                          dailyProfit = +totalProfit / +calc_month;

                          console.log("dailyProfit==", dailyProfit);
                          var nextclaim =
                            new Date(fromDate).getTime() +
                            +req.body.yieldDuration * 24 * 60 * 60 * 1000;
                          var obj = {
                            userId: req.userId,
                            stakingPlan: req.body.totalPlan,
                            totalInterest: +req.body.totalInterest,
                            dailyinterest: +dailyProfit,
                            startDate: fromDate,
                            endDate: toDate,
                            currentAPY: +req.body.currentAPY,
                            stakeAmont: +req.body.stakeAmont,
                            note: "Yiled staking",
                            stakeCurrencsymbol: findCurrency.currencySymbol,
                            stakeCurrencyName: findCurrency.currencyName,
                            stakeId: findCurrency._id,
                            currencyImage: findCurrency.currencyImage,
                            currencyid: findCurrency.currencyId,
                            type: "yield",
                            stakingPlanYield: req.body.stakingPlan,
                            YieldDuration: +req.body.yieldDuration,
                            nextclaimDate: nextclaim,
                          };
                          let create = await userStakingDB.create(obj);
                          if (create) {
                            return res.json({
                              status: true,
                              Message: "Success!",
                              startDate: moment(obj.startDate).format("DD/MM/YYYY"),
                              endDate: moment(obj.endDate).format("DD/MM/YYYY"),
                              nextclaimDate: moment(nextclaim).format("DD/MM/YYYY"),
                              stakeType: "Yield",
                              totalInterest: +req.body.totalInterest,
                              interest_per_cycle: +dailyProfit,
                              next_claim: moment(nextclaim).format("DD/MM/YYYY")
                            });
                          } else {
                            return res.json({
                              status: false,
                              Message: "Please try again later",
                            });
                          }
                        } else {
                          return res.json({
                            status: false,
                            Message: "Please try again later",
                          });
                        }
                      } else {
                        return res.json({
                          status: false,
                          Message: "Please try again later",
                        });
                      }
                    } else {
                      return res.json({
                        status: false,
                        Message: "Insufficient funds for staking",
                      });
                    }
                  } else {
                    return res.json({
                      status: false,
                      Message: "Please try again later",
                    });
                  }
                } else {
                  return res.json({
                    status: false,
                    Message: "Please try again later",
                  });
                }
              } else {
                return res.json({
                  status: false,
                  Message:
                    "Maximum staking level " + findCurrency.maximumStakingYield,
                });
              }
            } else {
              return res.json({
                status: false,
                Message:
                  "Minimum staking level " + findCurrency.minimumStakingYield,
              });
            }
          }
        } else {
          return res.json({ status: false, Message: "Enter Valid amount" });
        }
      } else {
        return res.json({ status: false, Message: "Please try again later" });
      }
    } catch (error) {
      console.log(error, "--=-=error-=-=-=");
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

// for app
router.post("/confirmStaking", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body, "=-=-=confirmStaking-==-=-=-");

    var userId = req.userId;
    let findCurrency = await stakingDB
      .findOne({ _id: req.body.stakeMore.id })
      .exec({});
    if (findCurrency) {
      console.log(req.body, "=-=-=-==-=-=-");
      if (
        req.body.stakeAmont != "" &&
        req.body.stakeAmont != undefined &&
        req.body.stakeAmont != null &&
        req.body.stakeAmont > 0
      ) {
        var currencyID = findCurrency.currencyId;
        if (req.body.type == "fixed") {
          console.log("-=-=-fixedfixedfixed=-=-==-=-=");
          if (findCurrency.minimumStaking <= parseFloat(req.body.stakeAmont)) {
            if (
              findCurrency.maximumStaking >= parseFloat(req.body.stakeAmont)
            ) {
              let checkStakeStatus = await userStakingDB
                .findOne({
                  stakeCurrencsymbol: findCurrency.currencySymbol,
                  userId: userId,
                  status: 0,
                })
                .exec({});
              //if(checkStakeStatus == null){
              let getWallets = await userWalletDB.findOne({
                userId: req.userId,
              });
              if (getWallets) {
                var walletData = getWallets.wallets;
                var indexing = walletData.findIndex(
                  (x) => x.currencySymbol == findCurrency.currencySymbol
                );
                if (indexing != -1) {
                  let walletBalance = walletData[indexing];
                  var spotAmount = walletBalance.amount;
                  var spotHold = walletBalance.holdAmount;
                  var stakeAmount = walletBalance.stakeAmount;
                  // var stakeAmount   = 0;
                  var amount =
                    parseFloat(spotAmount) - parseFloat(req.body.stakeAmont);
                  var addStake =
                    parseFloat(stakeAmount) + parseFloat(req.body.stakeAmont);
                  var fromDate = new Date();
                  const date = new Date();

                  var stakingPlan = 0;

                  if (findCurrency.FistDurationAPY == +req.body.currentAPY) {
                    stakingPlan = findCurrency.firstDuration;
                  } else if (
                    findCurrency.SecondDurationAPY == +req.body.currentAPY
                  ) {
                    stakingPlan = findCurrency.secondDuration;
                  } else if (
                    findCurrency.ThirdDurationAPY == +req.body.currentAPY
                  ) {
                    stakingPlan = findCurrency.thirdDuration;
                  } else if (
                    findCurrency.FourthDurationAPY == +req.body.currentAPY
                  ) {
                    stakingPlan = findCurrency.fourthDuration;
                  }
                  console.log("stakingPlan====", stakingPlan);
                  date.setDate(date.getDate() + +stakingPlan);
                  var toDate = date;
                  if (spotAmount >= req.body.stakeAmont) {
                    var detuctSpot = await userWalletDB.updateOne(
                      { userId: userId, "wallets.currencyId": currencyID },
                      { $set: { "wallets.$.amount": +amount } },
                      { multi: true }
                    );
                    if (detuctSpot) {
                      var stakeUpdate = await userWalletDB.updateOne(
                        { userId: userId, "wallets.currencyId": currencyID },
                        { $set: { "wallets.$.stakeAmount": +addStake } },
                        { multi: true }
                      );
                      if (stakeUpdate) {
                        var obj = {
                          userId: req.userId,
                          stakingPlan: +stakingPlan,
                          totalInterest: +req.body.totalInterest,
                          dailyinterest: +req.body.dailyinterest,
                          startDate: fromDate,
                          endDate: toDate,
                          currentAPY: +req.body.currentAPY,
                          stakeAmont: +req.body.stakeAmont,
                          note: req.body.stakeMore.status,
                          stakeCurrencsymbol: findCurrency.currencySymbol,
                          stakeCurrencyName: findCurrency.currencyName,
                          stakeId: findCurrency._id,
                          currencyImage: findCurrency.currencyImage,
                          currencyid: findCurrency.currencyId,
                          type: "fixed",
                        };
                        let create = await userStakingDB.create(obj);
                        if (create) {
                          return res.json({
                            status: true,
                            Message: "Success!",
                          });
                        } else {
                          return res.json({
                            status: false,
                            Message: "Please try again later",
                          });
                        }
                      } else {
                        return res.json({
                          status: false,
                          Message: "Please try again later",
                        });
                      }
                    } else {
                      return res.json({
                        status: false,
                        Message: "Please try again later",
                      });
                    }
                  } else {
                    return res.json({
                      status: false,
                      Message: "Insufficient funds for staking",
                    });
                  }
                } else {
                  return res.json({
                    status: false,
                    Message: "Please try again later",
                  });
                }
              } else {
                return res.json({
                  status: false,
                  Message: "Please try again later",
                });
              }
              // }else{
              //     return res.json({ status : false, Message : "Already staked this currency, Please try another currency or wait for some times" });
              // }
            } else {
              return res.json({
                status: false,
                Message: "Maximum staking level " + findCurrency.maximumStaking,
              });
            }
          } else {
            return res.json({
              status: false,
              Message: "Minimum staking level " + findCurrency.minimumStaking,
            });
          }
        } else if (req.body.type == "flexible") {
          console.log("-=-=-flexibleflexibleflexible=-=-==-=-=");

          if (findCurrency.minimumStaking <= parseFloat(req.body.stakeAmont)) {
            if (
              findCurrency.maximumStaking >= parseFloat(req.body.stakeAmont)
            ) {
              let checkStakeStatus = await userStakingDB
                .findOne({
                  stakeCurrencsymbol: findCurrency.currencySymbol,
                  userId: userId,
                  status: 0,
                })
                .exec({});
              //if(checkStakeStatus == null){
              let getWallets = await userWalletDB.findOne({
                userId: req.userId,
              });
              if (getWallets) {
                var walletData = getWallets.wallets;
                var indexing = walletData.findIndex(
                  (x) => x.currencySymbol == findCurrency.currencySymbol
                );
                if (indexing != -1) {
                  let walletBalance = walletData[indexing];
                  var spotAmount = walletBalance.amount;
                  var spotHold = walletBalance.holdAmount;
                  var stakeAmount = walletBalance.FlexstakeAmount;
                  // var stakeAmount   = 0;
                  var amount =
                    parseFloat(spotAmount) - parseFloat(req.body.stakeAmont);
                  var addStake =
                    parseFloat(stakeAmount) + parseFloat(req.body.stakeAmont);
                  var fromDate = new Date();
                  const date = new Date();
                  date.setDate(date.getDate() + 365);
                  var toDate = date;
                  if (spotAmount >= req.body.stakeAmont) {
                    var detuctSpot = await userWalletDB.updateOne(
                      { userId: userId, "wallets.currencyId": currencyID },
                      { $set: { "wallets.$.amount": +amount } },
                      { multi: true }
                    );
                    if (detuctSpot) {
                      var stakeUpdate = await userWalletDB.updateOne(
                        { userId: userId, "wallets.currencyId": currencyID },
                        { $set: { "wallets.$.FlexstakeAmount": +addStake } },
                        { multi: true }
                      );
                      if (stakeUpdate) {
                        var obj = {
                          userId: req.userId,
                          stakingPlan: 0,
                          totalInterest: +req.body.totalInterest,
                          dailyinterest: +req.body.dailyinterest,
                          startDate: fromDate,
                          endDate: toDate,
                          currentAPY: +req.body.currentAPY,
                          stakeAmont: +req.body.stakeAmont,
                          note: req.body.stakeMore.status,
                          stakeCurrencsymbol: findCurrency.currencySymbol,
                          stakeCurrencyName: findCurrency.currencyName,
                          stakeId: findCurrency._id,
                          currencyImage: findCurrency.currencyImage,
                          currencyid: findCurrency.currencyId,
                          type: "Flexible",
                        };
                        let create = await userStakingDB.create(obj);
                        if (create) {
                          return res.json({
                            status: true,
                            Message: "Success!",
                          });
                        } else {
                          return res.json({
                            status: false,
                            Message: "Please try again later",
                          });
                        }
                      } else {
                        return res.json({
                          status: false,
                          Message: "Please try again later",
                        });
                      }
                    } else {
                      return res.json({
                        status: false,
                        Message: "Please try again later",
                      });
                    }
                  } else {
                    return res.json({
                      status: false,
                      Message: "Insufficient funds for staking",
                    });
                  }
                } else {
                  return res.json({
                    status: false,
                    Message: "Please try again later",
                  });
                }
              } else {
                return res.json({
                  status: false,
                  Message: "Please try again later",
                });
              }
              // }else{
              //     return res.json({ status : false, Message : "Already staked this currency, Please try another currency or wait for some times" });
              // }
            } else {
              return res.json({
                status: false,
                Message: "Maximum staking level " + findCurrency.maximumStaking,
              });
            }
          } else {
            return res.json({
              status: false,
              Message: "Minimum staking level " + findCurrency.minimumStaking,
            });
          }
        } else if (req.body.type == "yield") {
          console.log(
            req.body,
            "=-=-=-=req.bodyreq.bodyreq.body-=-=-=-=-=-=-=-=-="
          );
          if (
            findCurrency.minimumStakingYield <= parseFloat(req.body.stakeAmont)
          ) {
            if (
              findCurrency.maximumStakingYield >=
              parseFloat(req.body.stakeAmont)
            ) {
              let getWallets = await userWalletDB.findOne({
                userId: req.userId,
              });
              if (getWallets) {
                var walletData = getWallets.wallets;
                var indexing = walletData.findIndex(
                  (x) => x.currencySymbol == findCurrency.currencySymbol
                );
                if (indexing != -1) {
                  let walletBalance = walletData[indexing];
                  var spotAmount = walletBalance.amount;
                  var spotHold = walletBalance.holdAmount;
                  var stakeAmount = walletBalance.stakeAmount;
                  // var stakeAmount   = 0;
                  var amount =
                    parseFloat(spotAmount) - parseFloat(req.body.stakeAmont);
                  var addStake =
                    parseFloat(stakeAmount) + parseFloat(req.body.stakeAmont);
                  var fromDate = new Date();
                  const date = new Date();
                  date.setDate(date.getDate() + 365);
                  var toDate = date;
                  console.log("=-=-=-=-0=-=-=-=-=-=-=-=-=-=");
                  var obj = {
                    userId: req.userId,
                    stakingPlan: 0,
                    totalInterest: +req.body.YieldEstimation,
                    dailyinterest: "",
                    startDate: fromDate,
                    endDate: toDate,
                    currentAPY: +req.body.APRPercentage,
                    stakeAmont: +req.body.stakeAmont,
                    note: req.body.stakeMore.status,
                    stakeCurrencsymbol: findCurrency.currencySymbol,
                    stakeCurrencyName: findCurrency.currencyName,
                    stakeId: findCurrency._id,
                    currencyImage: findCurrency.currencyImage,
                    currencyid: findCurrency.currencyId,
                    type: "yield",
                  };
                  console.log(obj, "=-=-=-=-obj-=-=-");
                  // return false;
                  if (spotAmount >= req.body.stakeAmont) {
                    var detuctSpot = await userWalletDB.updateOne(
                      { userId: userId, "wallets.currencyId": currencyID },
                      { $set: { "wallets.$.amount": +amount } },
                      { multi: true }
                    );
                    if (detuctSpot) {
                      var stakeUpdate = await userWalletDB.updateOne(
                        { userId: userId, "wallets.currencyId": currencyID },
                        { $set: { "wallets.$.stakeAmont": +addStake } },
                        { multi: true }
                      );
                      if (stakeUpdate) {
                        var obj = {
                          userId: req.userId,
                          stakingPlan: 0,
                          totalInterest: +req.body.YieldEstimation,
                          dailyinterest: "",
                          startDate: fromDate,
                          endDate: toDate,
                          currentAPY: +req.body.APRPercentage,
                          stakeAmont: +req.body.stakeAmont,
                          note: req.body.stakeMore.status,
                          stakeCurrencsymbol: findCurrency.currencySymbol,
                          stakeCurrencyName: findCurrency.currencyName,
                          stakeId: findCurrency._id,
                          currencyImage: findCurrency.currencyImage,
                          currencyid: findCurrency.currencyId,
                          type: "yield",
                        };
                        let create = await userStakingDB.create(obj);
                        if (create) {
                          return res.json({
                            status: true,
                            Message: "Success!",
                          });
                        } else {
                          return res.json({
                            status: false,
                            Message: "Please try again later",
                          });
                        }
                      } else {
                        return res.json({
                          status: false,
                          Message: "Please try again later",
                        });
                      }
                    } else {
                      return res.json({
                        status: false,
                        Message: "Please try again later",
                      });
                    }
                  } else {
                    return res.json({
                      status: false,
                      Message: "Insufficient funds for staking",
                    });
                  }
                } else {
                  return res.json({
                    status: false,
                    Message: "Please try again later",
                  });
                }
              } else {
                return res.json({
                  status: false,
                  Message: "Please try again later",
                });
              }
            } else {
              return res.json({
                status: false,
                Message:
                  "Maximum staking level " + findCurrency.maximumStakingYield,
              });
            }
          } else {
            return res.json({
              status: false,
              Message:
                "Minimum staking level " + findCurrency.minimumStakingYield,
            });
          }
        }
      } else {
        return res.json({ status: false, Message: "Enter Valid amount" });
      }
    }
  } catch (error) {
    console.log(error, "--=-=error-=-=-=");
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post ("/get_stake_profit", common.tokenmiddleware,async (req,res)=>{
  try{
  const startOfToday = moment().startOf('day').toDate();
  const endOfToday = moment().endOf('day').toDate();
  const todayData = await profitDb.aggregate([
    { $match: { type: "staking", date: { $gte: startOfToday, $lte: endOfToday } } },
  ]);
  if (!todayData.length) {
    return res.json({
      status: true,
      Message: "No data found for today",
      todayProfit: 0,
      yesterdayProfit: 0,
    });
  }

  const uniqueCurrencies = [...new Set(todayData.map(item => item.currencySymbol))];
  const marketPrices = await BINANCEexchange.currency_Conversion(uniqueCurrencies.join(","));
  const currencyFees = todayData.reduce((acc, item) => {
    if (!acc[item.currencySymbol]) {
      acc[item.currencySymbol] = 0;
    }
    acc[item.currencySymbol] += item.fullfees;
    return acc;
  }, {});
  let totalUSDTBalance = 0;
  for (let currency of uniqueCurrencies) {
    console.log(currency,"currency",marketPrices[currency].USDT)
    const priceInUSDT = marketPrices[currency].USDT;
    totalUSDTBalance += currencyFees[currency] * priceInUSDT;
  }

  const startOfYesterday = moment().subtract(1, 'days').startOf('day').toDate();
const endOfYesterday = moment().subtract(1, 'days').endOf('day').toDate();

const yesterdayData = await profitDb.aggregate([
{ $match: { type: "staking", date: { $gte: startOfYesterday, $lte: endOfYesterday } } },
]);

console.log(yesterdayData, "yesterdayData");

if (!yesterdayData.length) {
return res.json({
  status: true,
  Message: "No data found for yesterday",
  todayProfit: totalUSDTBalance, // This is from the previous calculation
  yesterdayProfit: 0,
});
}

const uniqueCurrenciesYesterday = [...new Set(yesterdayData.map(item => item.currencySymbol))];
console.log(uniqueCurrenciesYesterday, "uniqueCurrenciesYesterday");

const marketPricesYesterday = await BINANCEexchange.currency_Conversion(uniqueCurrenciesYesterday.join(","));

const currencyFeesYesterday = yesterdayData.reduce((acc, item) => {
if (!acc[item.currencySymbol]) {
  acc[item.currencySymbol] = 0;
}
acc[item.currencySymbol] += item.fullfees;
return acc;
}, {});

let totalUSDTBalanceYesterday = 0;

for (let currency of uniqueCurrenciesYesterday) {
console.log(currency, "currency", marketPricesYesterday[currency].USDT);
const priceInUSDT = marketPricesYesterday[currency].USDT;
totalUSDTBalanceYesterday += currencyFeesYesterday[currency] * priceInUSDT;
}

console.log(totalUSDTBalanceYesterday, "totalUSDTBalanceYesterday");

// Now, you can send the response including both today's and yesterday's profits
return res.json({
status: true,
Message: "",
todayProfit: totalUSDTBalance,
yesterdayProfit: totalUSDTBalanceYesterday,
});



  }catch(err){
    console.log("ERROR FROM STAKING profitShare UPDATE:::", err);
  }
});

router.get(
  "/getAllstakingHistory",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var userId = req.userId;
      let getUserStakeHistory = await userStakingDB
        .find({ userId: userId })
        .sort({ _id: -1 })
        .exec({});
      if (getUserStakeHistory) {
        var currentDate = new Date().getTime();
        var pushDatas = [];
        for (var i = 0; i < getUserStakeHistory.length; i++) {
          if (
            getUserStakeHistory[i].type == "Flexible" &&
            getUserStakeHistory[i].status == 0
          ) {
            var stakeEndDate = new Date(
              getUserStakeHistory[i].startDate
            ).getTime();
            var days = (currentDate - stakeEndDate) / (1000 * 60 * 60 * 24);
            getUserStakeHistory[i].totalInterest =
              getUserStakeHistory[i].dailyinterest * days;
          }
          pushDatas.push(getUserStakeHistory[i]);
        }
        return res.json({ status: true, Message: "Success!", data: pushDatas });
      } else {
        return res.json({
          status: false,
          Message: "Please try again later",
          data: {},
        });
      }
    } catch (error) {
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post("/getStakingTotal", async (req, res) => {
  try {
    console.log(req.body, "=-=-req=-=-=-req-=");
    if (Object.keys(req.body).length > 0) {
      let getstakedata = await userStakingDB
        .find({ stakeCurrencsymbol: req.body.currency })
        .exec({});
      if (getstakedata) {
        var currency = req.body.currency;
        var totalStaked = 0;
        var totalLocked = 0;
        for (var i = 0; i < getstakedata.length; i++) {
          if (getstakedata[i].status == 0 || getstakedata[i].status == 2) {
            totalStaked += getstakedata[i].stakeAmont;
          }
          if (getstakedata[i].status == 1) {
            totalLocked += getstakedata[i].stakeAmont;
          }
        }
        client.hget(
          "CurrencyConversion",
          "allpair",
          async function (err, value) {
            if (!err) {
              let redis_response = await JSON.parse(value);
              if (
                redis_response != null &&
                redis_response != "" &&
                redis_response != undefined &&
                Object.keys(redis_response).length > 0
              ) {
                if (redis_response[currency].INR != undefined) {
                  var inrValue = parseFloat(redis_response[currency].INR);
                  var obj = {
                    totalLocked: totalLocked,
                    totalStaked: totalStaked,
                    totalLockedINR: totalLocked * inrValue,
                    totalStakedINR: totalStaked * inrValue,
                  };
                  return res.json({
                    status: true,
                    Message: "Success",
                    data: obj,
                  });
                }
              } else {
                common.currency_conversion(async function (response) {
                  if (response.status) {
                    let redis_response1 = response.message;
                    if (redis_response1[currency].INR != undefined) {
                      var inrValue = parseFloat(redis_response1[currency].INR);
                      var obj = {
                        totalLocked: totalLocked,
                        totalStaked: totalStaked,
                        totalLockedINR: totalLocked * inrValue,
                        totalStakedINR: totalStaked * inrValue,
                      };
                      return res.json({
                        status: true,
                        Message: "Success",
                        data: obj,
                      });
                    }
                  }
                });
              }
            }
          }
        );
      } else {
        return res.json({
          status: false,
          Message: "Please try again later",
          data: {},
        });
      }
    } else {
      return res.json({ status: false, Message: "error", data: {} });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

// cron.schedule('*/1 * * * *', async function () { // test
//   // cron.schedule('* * * * *', async function () {
//   try {
//     let lenduserData = await userStakingDB.find({ type: "fixed", status: { $nin: [1, 2] } });
//     console.log("lenduserData", lenduserData.length);
//     if (lenduserData.length > 0) {
//       for (var i = 0; i < lenduserData.length; i++) {
//         profitShare(lenduserData[i]);
//       }
//     } else {
//     }

//   } catch (error) {
//     console.log('ERROR FROM STAKING INTEREST UPDATE:::', error);
//   }

// });

// cron.schedule("*/15 * * * *", async function () {
//   // live
//   //cron.schedule('* * * * * *', async function () {
//   try {
//     //console.log("call staking data====")
//     await redisHelper.setfixedStaking(function (lenduserData) {
//       //console.log("call lenduserData====",lenduserData.length)
//       if (lenduserData.length > 0) {
//         for (var i = 0; i < lenduserData.length; i++) {
//           profitShare(lenduserData[i]);
//         }
//       } else {
//       }
//     });
//   } catch (error) {
//     console.log("ERROR FROM STAKING INTEREST UPDATE:::", error);
//   }
// });

const profitShare = async (profitData) => {
  try {
    // console.log("call staking profitData====",profitData)
    if (profitData) {
      var stakeEndDate = new Date(profitData.endDate).getTime();
      //console.log("stakeEndDate===",stakeEndDate)
      var currentDate = new Date().getTime();
      //console.log("stake currentDate===",currentDate)

      if (stakeEndDate <= currentDate) {
        //  console.log("call here====")
        var totalProfit = +profitData.totalInterest;
        const docs = await userWalletDB.findOne({
          userId: mongoose.mongo.ObjectId(profitData.userId),
        });
        if (docs) {
          var wallets = docs.wallets;
          var indexing = wallets.findIndex(
            (x) => x.currencySymbol == profitData.stakeCurrencsymbol
          );
          if (indexing != -1) {
            var getWallet = wallets[indexing];

            var getStakeAmount = getWallet.stakeAmount + totalProfit;
            var stakeUpdate = await userWalletDB.updateOne(
              {
                userId: profitData.userId,
                "wallets.currencyId": profitData.currencyid,
              },
              { $set: { "wallets.$.stakeAmount": +getStakeAmount } },
              { multi: true }
            );
            if (stakeUpdate) {
              let lenduserData = await userStakingDB.updateOne(
                { _id: profitData._id },
                { $set: { status: 1, date: Date.now() } }
              );
              redisHelper.updatefixedStaking(function (resp) { });
              if (lenduserData) {
              }
            } else {
            }
          }
        }
      } else {
      }
    } else {
    }
  } catch (error) {
    console.log("ERROR FROM STAKING profitShare UPDATE:::", error);
  }
};

router.post("/claimNowapi", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    console.log(req.body);
    let getstakedata = await userStakingDB
      .findOne({ _id: req.body._id, status: 1 })
      .exec({});
    var user_detail = await usersDB.findOne(
      { _id: mongoose.mongo.ObjectId(userId) },
      { referredBy: 1 }
    );
    if (getstakedata) {
      const docs = await userWalletDB.findOne({
        userId: mongoose.mongo.ObjectId(userId),
      });
      if (docs) {
        var wallets = docs.wallets;
        var indexing = wallets.findIndex(
          (x) => x.currencySymbol == getstakedata.stakeCurrencsymbol
        );
        if (indexing != -1) {
          var totoalInterest = getstakedata.totalInterest;
          var getWallet = wallets[indexing];
          var getStakeAmount = getWallet.stakeAmount;
          // if(+getStakeAmount > 0)
          // {
          var getSpotAmount = getWallet.amount;
          var exchangeAmount =
            Number(getstakedata.stakeAmont) +
            Number(getSpotAmount) +
            Number(totoalInterest);

          var MinAmount = Number(getWallet.stakeAmount) - (Number(getSpotAmount) + Number(totoalInterest));
          var stakeUpdateAmount = await userWalletDB.updateOne(
            {
              userId: getstakedata.userId,
              "wallets.currencyId": getstakedata.currencyid,
            },
            { $set: { "wallets.$.amount": +exchangeAmount } },
            { multi: true }
          );
          var stakeUpdateStake = await userWalletDB.updateOne(
            {
              userId: getstakedata.userId,
              "wallets.currencyId": getstakedata.currencyid,
            },
            { $set: { "wallets.$.stakeAmount": +MinAmount } },
            { multi: true }
          );
          if (stakeUpdateAmount && stakeUpdateStake) {


            let lenduserData = await userStakingDB.updateOne(
              { _id: req.body._id },
              { $set: { status: 2 } }
            );


            if (lenduserData) {

              return res.json({
                status: true,
                Message: "Claimed successfully!",
              });

            } else {
              return res.json({
                status: false,
                Message: "Please try again later5",
                data: {},
              });
            }
          } else {
            return res.json({
              status: false,
              Message: "Please try again later4",
              data: {},
            });
          }
          //  }
          //  else
          //  {
          //   return res.json({
          //     status: false,
          //     Message: "You are already claimed",
          //     data: {},
          //   });
          //  }
        } else {
          return res.json({
            status: false,
            Message: "Please try again later3",
            data: {},
          });
        }
      } else {
        return res.json({
          status: false,
          Message: "Please try again later2",
          data: {},
        });
      }
    } else {
      return res.json({
        status: false,
        Message: "Please try again later1",
        data: {},
      });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post( "/claimNowapiFlexible",common.tokenmiddleware,async (req, res) => {
  try{
    var userId = req.userId;
    let getstakedata = await userStakingDB.findOne({ _id: req.body._id, status: 0 }).exec({});
    var currentDate = new Date().getTime();
    var stakeEndDate = new Date(getstakedata.startDate).getTime();
    var nextDay = +stakeEndDate + 1000 * 60 * 60 * 24;
    var days = (currentDate - stakeEndDate) / (1000 * 60 * 60 * 24);

    if(!getstakedata){
      return res.json({status: false,Message: "Please try again later",data: {},});
    }else{
      if (+nextDay < +currentDate) {
        var totoalInterest = getstakedata.dailyinterest * days;
        const docs = await userWalletDB.findOne({userId: mongoose.mongo.ObjectId(userId)});
        if (!docs) {
          return res.json({ status: false,Message: "Please try again later",data: {}});
        }else{
          var wallets = docs.wallets;
          var indexing = wallets.findIndex(
            (x) => x.currencySymbol == getstakedata.stakeCurrencsymbol
          );
          if (indexing != -1) {
            var getWallet = wallets[indexing];
            var getStakeAmount = getWallet.FlexstakeAmount;
            var getSpotAmount = getWallet.amount;
            var exchangeAmount =Number(getstakedata.stakeAmont) + Number(getSpotAmount) + Number(totoalInterest);
            var MinAmount =  (Number(getSpotAmount)) - Number(getWallet.FlexstakeAmount);
            var stakeUpdateAmount = await userWalletDB.updateOne({userId: getstakedata.userId, "wallets.currencyId": getstakedata.currencyid},
                { $set: { "wallets.$.amount": +exchangeAmount } },{ multi: true })
            var stakeUpdateStake = await userWalletDB.updateOne({userId: getstakedata.userId,"wallets.currencyId": getstakedata.currencyid,},
                { $set: { "wallets.$.FlexstakeAmount": +MinAmount } },{ multi: true });
                console.log(stakeUpdateAmount,"stakeUpdateAmount",stakeUpdateStake,"stakeUpdateStake");
                if (stakeUpdateAmount.nModified===1 && stakeUpdateStake.nModified===1) {
                  var obj = {
                    userId: mongoose.Types.ObjectId(userId),
                    stakeId: mongoose.Types.ObjectId(getstakedata._id),
                    currencyId: mongoose.Types.ObjectId(getstakedata.currencyid),
                    currency: getstakedata.stakeCurrencsymbol,
                    amount: +getStakeAmount,
                    Type: "flexible",
                  };
                  // var payout_update = await stake_payouts.create(obj); .//its atlas eror throw  so its hide 
                  let lenduserData = await userStakingDB.updateOne({ _id: req.body._id },{ $set: { status: 2 } });
                  var profit_obj={
                    type: "staking",
                    user_id: req.userId,
                    currencyid: getstakedata.currencyid,
                    currencySymbol: getstakedata.currencySymbol,
                    fees: +totoalInterest,
                    fullfees: +totoalInterest,
                    orderid: getstakedata._id,
                  }
                  let create_profit_obj = await profitDb.create(profit_obj);

                 if(lenduserData.nModified===1){
                  return res.json({ status: true, Message: "Claimed successfully!"});
                 }else{
                  return res.json({status: false,Message: "Please try again later"});
                 }
                }else{
                return res.json({status: false,Message: "Please try again later"});
                }
              }else{
                return res.json({status: false,Message: "Please try again later"});
              }
        }
      }else{
        return res.json({status: false, Message:"Now you cannot make cliam your amount, please try to after one day "});
      }
    }
   
  }catch(err){
    console.log(err,"errerer ")
    return res.json({ status: false, Message: "Internal server error" });
  }
  });

router.get("/getAlluserstakingHistory", async (req, res) => {
  try {
    userStakingDB
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userdata",
          },
        },
        {
          $sort: { _id: -1 },
        },
      ])
      .exec((err, data) => {
        // console.log("all staking data===",data);
        if (!err) {
          var arrPush = [];
          for (var i = 0; i < data.length; i++) {
            var startdate = moment(data[i].startDate).format("DD/MM/YYYY");
            var endtdate = moment(data[i].endDate).format("DD/MM/YYYY");

            var get_time = new Date(data[i].date).getTime();

            var interest_cycle =
              data[i].type == "fixed"
                ? data[i].stakingPlan
                : data[i].YieldDuration;

            var added_date = get_time + +interest_cycle * 24 * 60 * 60 * 1000;

            var claim_date = "";
            if (data[i].type == "fixed") {
              claim_date = moment(data[i].endDate).format(
                "YYYY-MM-DD, h:mm:ss a"
              );
            } else if (data[i].type == "yield") {
              claim_date = moment(data[i].nextclaimDate).format(
                "YYYY-MM-DD, h:mm:ss a"
              );
            } else {
              claim_date = "-";
            }
            var interestcycle = "";
            if (data[i].type == "fixed") {
              interestcycle = data[i].stakingPlan + " days";
            } else if (data[i].type == "yield") {
              interestcycle = data[i].YieldDuration + " days";
            } else {
              interestcycle = "-";
            }

            var obj = {
              email: common.decrypt(data[i].userdata[0].email),
              stakingPlan: data[i].stakingPlan == 0 ? "-" : data[i].stakingPlan,
              stakeAmont: data[i].stakeAmont,
              stakeCurrencsymbol: data[i].stakeCurrencsymbol,
              stakeCurrencyName: data[i].stakeCurrencyName,
              currencyImage: data[i].currencyImage,
              startDate: moment(data[i].startDate).format(
                "YYYY-MM-DD, h:mm:ss a"
              ),
              endDate: moment(data[i].endDate).format("YYYY-MM-DD, h:mm:ss a"),
              stakeId: data[i].stakeOrderID,
              totalInterest: data[i].totalInterest,
              dailyinterest: data[i].dailyinterest,
              date: data[i].date,
              status: data[i].status,
              interestcycle: interestcycle,
              next_claim: claim_date,
              type: data[i].type,
              id: i + 1,
            };
            arrPush.push(obj);
          }
          return res.json({ status: true, Message: "Success!", data: arrPush });
        } else {
          return res.json({
            status: false,
            Message: "Please try again later",
            data: {},
          });
        }
      });
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post(
  "/staking_calculation",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      console.log("staking calculation===", req.body);
      var amount = req.body.amount;
      var interest = req.body.interest;
      var duration = req.body.duration;
      var id = req.body.id;
      var type = req.body.type;

      //if(amount != null && amount != undefined && interest != null && interest != undefined && duration != null && duration != undefined && id != null && id != undefined && type != null && type != undefined)
      if (
        amount != null &&
        amount != undefined &&
        duration != null &&
        duration != undefined &&
        id != null &&
        id != undefined &&
        type != null &&
        type != undefined
      ) {
        let staking = await stakingDB.findOne({ _id: req.body.id }).exec({});
        if (staking != null) {
          // var status = "";
          var interest_rate = 0;
          // if(interest=="2")
          // {
          //     status = "stake1"
          //     interest_rate = staking.FistDurationAPY;
          // }
          // else if(interest=="4")
          // {
          //     status = "stake2"
          //     interest_rate = staking.SecondDurationAPY;
          // }
          // else if(interest=="6")
          // {
          //     status = "stake3"
          //     interest_rate = staking.ThirdDurationAPY;
          // }
          // else if(interest=="8")
          // {
          //     status = "stake4"
          //     interest_rate = staking.FourthDurationAPY;
          // }

          interest_rate = type == "fixed" ? interest : staking.APRinterest;
          console.log("staking====", staking);
          console.log("interest_rate====", interest_rate);
          var dailyinterest = amount * (+interest_rate / 100 / 365);
          var totalInterest =
            type == "fixed"
              ? parseFloat(dailyinterest) * duration
              : parseFloat(dailyinterest) * 1;

          var plans = parseFloat(duration);
          var d = new Date();
          var fromDate =
            (await d.getDate()) +
            "/" +
            (d.getMonth() + 1) +
            "/" +
            d.getFullYear() +
            " " +
            d.getHours() +
            ":" +
            d.getMinutes();

          var myDate = new Date(
            new Date().getTime() + plans * 24 * 60 * 60 * 1000
          );
          var toDate =
            (await myDate.getDate()) +
            "/" +
            (myDate.getMonth() + 1) +
            "/" +
            myDate.getFullYear() +
            " " +
            myDate.getHours() +
            ":" +
            myDate.getMinutes();

          var obj = {
            currentAPY: interest_rate,
            dailyinterest: parseFloat(dailyinterest).toFixed(8),
            endDate: toDate,
            stakeAmont: amount,
            stakeMore: { status: "staking", id: staking._id },
            stakingPlan: duration,
            startDate: fromDate,
            totalInterest: parseFloat(totalInterest).toFixed(8),
            type: type,
          };

          return res.json({ status: true, data: obj });
        } else {
          return res.json({
            status: false,
            data: {},
            Message: "Invalid staking",
          });
        }
      } else {
        return res.json({
          status: false,
          data: {},
          Message: "Please enter all the required fields",
        });
      }
    } catch (error) {
      console.log("catch ex error==", error);
      return res.json({
        status: false,
        data: {},
        Message: "Internal server error",
      });
    }
  }
);

router.post("/getbalance", common.tokenmiddleware, (req, res) => {
  try {
    var currency_id = req.body.currency_id;
    var user_id = req.userId;
    if (currency_id != null && currency_id != undefined) {
      common.getUserBalance(user_id, currency_id, function (balance) {
        var currency_balance = balance.totalBalance;
        return res.json({
          status: true,
          balance: parseFloat(currency_balance).toFixed(8),
        });
      });
    } else {
      return res.json({
        status: false,
        data: {},
        Message: "Please enter all the required fields",
      });
    }
  } catch (ex) {
    return res.json({
      status: false,
      data: {},
      Message: "Internal server error",
    });
  }
});

router.get("/stakingHistory", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let getUserStakeHistory = await userStakingDB
      .find({ userId: userId })
      .sort({ _id: -1 })
      .exec({});
    if (getUserStakeHistory) {
      var currentDate = new Date().getTime();
      var pushDatas = [];
      for (var i = 0; i < getUserStakeHistory.length; i++) {
        if (
          getUserStakeHistory[i].type == "Flexible" &&
          getUserStakeHistory[i].status == 0
        ) {
          var stakeEndDate = new Date(
            getUserStakeHistory[i].startDate
          ).getTime();
          var days = (currentDate - stakeEndDate) / (1000 * 60 * 60 * 24);
          getUserStakeHistory[i].totalInterest =
            getUserStakeHistory[i].dailyinterest * days;
        }
        var obj = {
          id: getUserStakeHistory[i]._id,
          currencyImage: getUserStakeHistory[i].currencyImage,
          stakeCurrencsymbol: getUserStakeHistory[i].stakeCurrencsymbol,
          stakeAmont: getUserStakeHistory[i].stakeAmont,
          currentAPY: getUserStakeHistory[i].currentAPY,
          startDate: moment(getUserStakeHistory[i].startDate).format(
            "DD-MM-YYYY"
          ),
          endDate: moment(getUserStakeHistory[i].endDate).format("DD-MM-YYYY"),
          locked_days:
            getUserStakeHistory[i].type == "fixed"
              ? getUserStakeHistory[i].stakingPlan
              : "-",
          estimated_interest: parseFloat(
            getUserStakeHistory[i].totalInterest
          ).toFixed(4),
          type: getUserStakeHistory[i].type.toLowerCase(),
          status: getUserStakeHistory[i].status,
        };
        pushDatas.push(obj);
      }
      return res.json({ status: true, Message: "Success!", data: pushDatas });
    } else {
      return res.json({
        status: false,
        Message: "Please try again later",
        data: {},
      });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.get("/allStatkingDetails", async (req, res) => {
  try {
    let getStatkeDetails = await stakingDB
      .find({ status: "Active" })
      .sort({ _id: 1 });
    if (getStatkeDetails) {
      var data = {
        status: true,
        result: getStatkeDetails,
      };
      return res.json({ status: true, data: data, Message: "Success" });
    } else {
      return res.json({ status: false, data: {}, Message: "Please try later" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.get("/updateStaking", async (req, res) => {
  try {
    let updateStaking = await stakingDB.updateMany(
      { status: "Active" },
      {
        $set: {
          APRinterest: 0.5,
          minimumStakingflex: 0.001,
          maximumStakingflex: 1000,
        },
      }
    );
    if (updateStaking) {
      return res.json({ status: true, Message: "updated success" });
    } else {
      return res.json({ status: false, Message: "Please try again later" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/updateYield", async (req, res) => {
  try {
    let findCurrency = await currencyDB
      .findOne({ _id: req.body.currencyId })
      .exec({});
    if (findCurrency) {
      console.log("=-=-==-==-=-");
      let findStakeDetails = await stakingDB
        .findOne({ currencyId: req.body.currencyId })
        .exec({});
      if (findStakeDetails == null) {
        //  =======CREATE STAKING========  //
        let createStaking = await stakingDB.create(req.body);
        if (createStaking) {
          return res.json({
            status: true,
            Message:
              findCurrency.currencySymbol +
              "Currency staking process completed",
          });
        } else {
          return res.json({ status: false, Message: "Please try again later" });
        }
      } else {
        //  =======UPDATE STAKING========  //
        console.log(req.body, "=--=-=-=-=req.body=--=-=-=-=");
        var obj = {
          yiledAPR_1_firstDuration: +req.body.yiledAPR_1_firstDuration,
          yiledAPR_1_secondDuration: +req.body.yiledAPR_1_secondDuration,
          yiledAPR_1_thirdDuration: +req.body.yiledAPR_1_thirdDuration,
          yiledAPR_1_fourthDuration: +req.body.yiledAPR_1_fourthDuration,
          yiledAPR_3_firstDuration: +req.body.yiledAPR_3_firstDuration,
          yiledAPR_3_secondDuration: +req.body.yiledAPR_3_secondDuration,
          yiledAPR_3_thirdDuration: +req.body.yiledAPR_3_thirdDuration,
          yiledAPR_3_fourthDuration: +req.body.yiledAPR_3_fourthDuration,
          yiledAPR_5_firstDuration: +req.body.yiledAPR_5_firstDuration,
          yiledAPR_5_secondDuration: +req.body.yiledAPR_5_secondDuration,
          yiledAPR_5_thirdDuration: +req.body.yiledAPR_5_thirdDuration,
          yiledAPR_5_fourthDuration: +req.body.yiledAPR_5_fourthDuration,
          yiled_1_firstDuration: +req.body.yiled_1_firstDuration,
          yiled_1_secondDuration: +req.body.yiled_1_secondDuration,
          yiled_1_thirdDuration: +req.body.yiled_1_thirdDuration,
          yiled_1_fourthDuration: +req.body.yiled_1_fourthDuration,
          yiled_3_firstDuration: +req.body.yiled_3_firstDuration,
          yiled_3_secondDuration: +req.body.yiled_3_secondDuration,
          yiled_3_thirdDuration: +req.body.yiled_3_thirdDuration,
          yiled_3_fourthDuration: +req.body.yiled_3_fourthDuration,
          yiled_5_firstDuration: +req.body.yiled_5_firstDuration,
          yiled_5_secondDuration: +req.body.yiled_5_secondDuration,
          yiled_5_thirdDuration: +req.body.yiled_5_thirdDuration,
          yiled_5_fourthDuration: +req.body.yiled_5_fourthDuration,
          maximumStakingYield: +req.body.maximumStakingYield,
          minimumStakingYield: +req.body.minimumStakingYield,
          // yieldFrist          : req.body.yieldFrist,
          // yiledThird          : req.body.yiledThird,
          // yieldSecond         : req.body.yieldSecond,
          // yiledFourth         : req.body.yiledFourth,
          yieldFrist: 30,
          yiledThird: 90,
          yieldSecond: 180,
          yiledFourth: 360,
          yieldStatus: req.body.yieldStatus,
        };
        console.log(obj, "=--=-=-=-=obj--=-=-=-=");

        let updateStaking = await stakingDB
          .updateOne({ currencyId: req.bo / yieldy.currencyId }, { $set: obj })
          .exec({});
        if (updateStaking) {
          return res.json({
            status: true,
            Message:
              findCurrency.currencySymbol +
              " Currency staking updating completed",
          });
        } else {
          console.log("=-=-=22222=-==-=-");

          return res.json({ status: false, Message: "Please try again later" });
        }
      }
    } else {
      console.log("=-=-=1111=-==-=-");

      return res.json({ status: false, Message: "Please try again later" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/yieldcalculation", async (req, res) => {
  try {

    if (
      req.body.investValue == "" &&
      req.body.investValue == undefined &&
      req.body.investValue == null &&
      req.body.APRPercentage == "" &&
      req.body.APRPercentage == undefined &&
      req.body.APRPercentage == null &&
      req.body.days == "" &&
      req.body.days == undefined &&
      req.body.days == null &&
      req.body.yiledStakeType == "" &&
      req.body.yiledStakeType == undefined &&
      req.body.yiledStakeType == null
    ) {
      return res.json({ status: false, Message: "Enter all fields" });
    } else {
      var estimateInterest =
        (((Number(req.body.investValue) * Number(req.body.APRPercentage)) /
          100) *
          Number(req.body.days)) /
        Number(req.body.yiledStakeType);
      // console.log(estimateInterest,'=-=-=estimateInterest=-=-=estimateInterest-=');
      var month_number = req.body.yiledStakeType / req.body.days;
      // console.log(month_number,'=-=-=month_number=-=-=month_number 111-=');
      month_number = Math.round(month_number);
      //    console.log(month_number,'=-=-=month_number=-=-=month_number 222-=');
      var totalInterest = Number(estimateInterest) * Number(month_number);
      return res.json({ status: true, Message: totalInterest, estimateInterest: estimateInterest });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

// cron.schedule('* * * * *', async function () { // test
//     try {
//         let userData = await userStakingDB.find({userId:mongoose.mongo.ObjectId("635cca0eb0fde71128eb3c70"),type : "yield",status: {$nin:[1,2]}});
//             if(userData.length >0){
//                 for(var i=0; i<userData.length; i++){
//                     yieldprofitShare(userData[i]);
//                 }
//             }else{
//             }

//     } catch (error) {
//         console.log('ERROR FROM STAKING INTEREST UPDATE:::',error);
//     }

// });

// cron.schedule("*/20 * * * *", async function () {
//   // live
//   //cron.schedule('* * * * *', async function () {
//   try {
//     await redisHelper.setyieldStaking(function (userData) {
//       // console.log("yield data====",userData)
//       if (userData.length > 0) {
//         for (var i = 0; i < userData.length; i++) {
//           yieldprofitShare(userData[i]);
//         }
//       } else {
//       }
//     });
//   } catch (error) {
//     console.log("ERROR FROM STAKING INTEREST UPDATE:::", error);
//   }
// });

const yieldprofitShare = async (profitData) => {
  try {
    if (profitData) {
      var stakeEndDate = new Date(profitData.endDate).getTime();
      var currentDate = new Date().getTime();
      var nextClaim_date = new Date(profitData.nextclaimDate).getTime();
      if (stakeEndDate > currentDate) {
        //console.log("yield profit sharing====111")
        var totalProfit = +profitData.totalInterest;
        //  console.log("totalProfit===",totalProfit)
        var end_date = "";
        var dailyProfit = 0;
        var stakingPlan = profitData.stakingPlan;
        // console.log("stakingPlan===",profitData.stakingPlan)

        var year = stakingPlan == 1 ? 365 : stakingPlan == 3 ? 1095 : 1825;

        // console.log("year===",year)

        var calc_month = +year / +profitData.YieldDuration;
        // console.log("profitData.YieldDuration===",profitData.YieldDuration);
        // console.log("calc_month==",calc_month)
        dailyProfit = +totalProfit / +calc_month;
        //end_date = currentDate + +profitData.YieldDuration * 24 * 60 * 60 * 1000;
        //console.log("yieldDuration end_date===",end_date);
        // console.log("profitData end_date===",+profitData.YieldDuration * 24 * 60 * 60 * 1000);
        // console.log("end_date end_date===",end_date);
        //console.log("end_date====",end_date);
        // if(claimTime=="Monthly")
        // {
        //     end_date = currentDate + 30 * 24 * 60 * 60 * 1000;
        //     if(stakingPlan == 1)
        //     {
        //         dailyProfit = +totalProfit / 12;
        //     }
        //     else if(stakingPlan == 3)
        //     {
        //         dailyProfit = +totalProfit / 36;
        //     }
        //     else if(stakingPlan == 5)
        //     {
        //         dailyProfit = +totalProfit / 60;
        //     }

        // }
        // else if(claimTime=="Quarterly")
        // {
        //     end_date = currentDate + 90 * 24 * 60 * 60 * 1000;
        //     if(stakingPlan == 1)
        //     {
        //         dailyProfit = +totalProfit / 3;
        //     }
        //     else if(stakingPlan == 3)
        //     {
        //         dailyProfit = +totalProfit / 9;
        //     }
        //     else if(stakingPlan == 5)
        //     {
        //         dailyProfit = +totalProfit / 15;
        //     }
        // }
        // else if(claimTime=="Half Yearly")
        // {
        //     end_date = currentDate + 180 * 24 * 60 * 60 * 1000;
        //     if(stakingPlan == 1)
        //     {
        //         dailyProfit = +totalProfit / 6;
        //     }
        //     else if(stakingPlan == 3)
        //     {
        //         dailyProfit = +totalProfit / 18;
        //     }
        //     else if(stakingPlan == 5)
        //     {
        //         dailyProfit = +totalProfit / 30;
        //     }
        // }
        // else if(claimTime=="Yearly")
        // {
        //     end_date = currentDate + 365 * 24 * 60 * 60 * 1000;
        //     if(stakingPlan == 1)
        //     {
        //         dailyProfit = +totalProfit;
        //     }
        //     else if(stakingPlan == 3)
        //     {
        //         dailyProfit = +totalProfit / 3;
        //     }
        //     else if(stakingPlan == 5)
        //     {
        //         dailyProfit = +totalProfit / 5;
        //     }
        // }
        // console.log("current date====",currentDate)
        // console.log("end_date====",end_date);
        // console.log("dailyProfit====",dailyProfit);

        if (nextClaim_date <= currentDate) {
          // console.log("call here=====");
          const docs = await userWalletDB.findOne({
            userId: mongoose.mongo.ObjectId(profitData.userId),
          });
          if (docs) {
            var wallets = docs.wallets;
            var indexing = wallets.findIndex(
              (x) => x.currencySymbol == profitData.stakeCurrencsymbol
            );
            if (indexing != -1) {
              var getWallet = wallets[indexing];

              var getStakeAmount = dailyProfit;
              var next_date =
                nextClaim_date +
                +profitData.YieldDuration * 24 * 60 * 60 * 1000;
              console.log("nextdate===", new Date(next_date));
              var stakeUpdate = await userWalletDB.updateOne(
                {
                  userId: profitData.userId,
                  "wallets.currencyId": profitData.currencyid,
                },
                { $set: { "wallets.$.stakeAmount": +getStakeAmount } },
                { multi: true }
              );
              if (stakeUpdate) {
                let lenduserData = await userStakingDB.updateOne(
                  { _id: profitData._id },
                  { $set: { status: 1, date: Date.now() } }
                );
                redisHelper.updateyieldStaking(function (resp) { });
                if (lenduserData) {
                }
              } else {
              }
            }
          }
        }
      } else {
        console.log("call here 22=====");
        if (stakeEndDate <= currentDate) {
          var totalProfit = +profitData.totalInterest;
          var end_date = "";
          var dailyProfit = 0;
          //var claimTime = profitData.stakingPlanYield;
          var stakingPlan = profitData.stakingPlan;

          var year = stakingPlan == 1 ? 365 : stakingPlan == 3 ? 1095 : 1825;

          var calc_month = +year / +profitData.YieldDuration;
          //  console.log("calc_month==",calc_month)
          dailyProfit = +totalProfit / +calc_month;
          end_date =
            currentDate + +profitData.YieldDuration * 24 * 60 * 60 * 1000;
          // if(claimTime=="Monthly")
          // {
          //     end_date = currentDate + 30 * 24 * 60 * 60 * 1000;
          //     if(stakingPlan == 1)
          //     {
          //         dailyProfit = +totalProfit / 12;
          //     }
          //     else if(stakingPlan == 3)
          //     {
          //         dailyProfit = +totalProfit / 36;
          //     }
          //     else if(stakingPlan == 5)
          //     {
          //         dailyProfit = +totalProfit / 60;
          //     }

          // }
          // else if(claimTime=="Quarterly")
          // {
          //     end_date = currentDate + 90 * 24 * 60 * 60 * 1000;
          //     if(stakingPlan == 1)
          //     {
          //         dailyProfit = +totalProfit / 3;
          //     }
          //     else if(stakingPlan == 3)
          //     {
          //         dailyProfit = +totalProfit / 9;
          //     }
          //     else if(stakingPlan == 5)
          //     {
          //         dailyProfit = +totalProfit / 15;
          //     }
          // }
          // else if(claimTime=="Half Yearly")
          // {
          //     end_date = currentDate + 180 * 24 * 60 * 60 * 1000;
          //     if(stakingPlan == 1)
          //     {
          //         dailyProfit = +totalProfit / 6;
          //     }
          //     else if(stakingPlan == 3)
          //     {
          //         dailyProfit = +totalProfit / 18;
          //     }
          //     else if(stakingPlan == 5)
          //     {
          //         dailyProfit = +totalProfit / 30;
          //     }
          // }
          // else if(claimTime=="Yearly")
          // {
          //     end_date = currentDate + 365 * 24 * 60 * 60 * 1000;
          //     if(stakingPlan == 1)
          //     {
          //         dailyProfit = +totalProfit;
          //     }
          //     else if(stakingPlan == 3)
          //     {
          //         dailyProfit = +totalProfit / 3;
          //     }
          //     else if(stakingPlan == 5)
          //     {
          //         dailyProfit = +totalProfit / 5;
          //     }
          // }

          if (nextClaim_date <= currentDate) {
            console.log("call here 2 also===");
            const docs = await userWalletDB.findOne({
              userId: mongoose.mongo.ObjectId(profitData.userId),
            });
            if (docs) {
              var wallets = docs.wallets;
              var indexing = wallets.findIndex(
                (x) => x.currencySymbol == profitData.stakeCurrencsymbol
              );
              if (indexing != -1) {
                var getWallet = wallets[indexing];

                var getStakeAmount = profitData.stakeAmont + dailyProfit;
                console.log("call here 2 getStakeAmount===", getStakeAmount);
                var stakeUpdate = await userWalletDB.updateOne(
                  {
                    userId: profitData.userId,
                    "wallets.currencyId": profitData.currencyid,
                  },
                  { $set: { "wallets.$.stakeAmount": +getStakeAmount } },
                  { multi: true }
                );
                if (stakeUpdate) {
                  let lenduserData = await userStakingDB.updateOne(
                    { _id: profitData._id },
                    { $set: { status: 1, date: Date.now() } }
                  );
                  redisHelper.updateyieldStaking(function (resp) { });
                  if (lenduserData) {
                  }
                } else {
                }
              }
            }
          }
        }
      }
    } else {
    }
  } catch (error) {
    console.log("ERROR FROM STAKING profitShare UPDATE:::", error);
  }
};

router.post("/claimNowapi_yield", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    console.log("req.body===", req.body);
    let getstakedata = await userStakingDB
      .findOne({ _id: mongoose.mongo.ObjectId(req.body._id), status: 1 })
      .exec({});
    console.log("getstakedata===", getstakedata);
    var user_detail = await usersDB.findOne(
      { _id: mongoose.mongo.ObjectId(userId) },
      { referredBy: 1 }
    );
    if (getstakedata) {
      console.log("call 111");
      const docs = await userWalletDB.findOne({
        userId: mongoose.mongo.ObjectId(userId),
      });
      if (docs) {
        console.log("call 222");
        var wallets = docs.wallets;
        var indexing = wallets.findIndex(
          (x) => x.currencySymbol == getstakedata.stakeCurrencsymbol
        );
        if (indexing != -1) {
          console.log("call 333");
          var totoalInterest = getstakedata.totalInterest;
          var getWallet = wallets[indexing];
          var getStakeAmount = getWallet.stakeAmount;
          console.log("getStakeAmount", getStakeAmount)
          console.log("getWallet", getWallet)
          // if(+getStakeAmount > 0)
          // {
          var stakeEndDate = new Date(getstakedata.endDate).getTime();
          var currentDate = new Date().getTime();
          var getSpotAmount = getWallet.amount;
          var dailyinterest = getstakedata.dailyinterest;
          var total_interest = 0;
          if (stakeEndDate <= currentDate) {
            total_interest = Number(dailyinterest) + Number(getstakedata.stakeAmont);
          }
          else {
            total_interest = Number(dailyinterest);
          }
          var exchangeAmount = Number(total_interest) + Number(getSpotAmount);
          var stakeUpdateAmount = await userWalletDB.updateOne(
            {
              userId: getstakedata.userId,
              "wallets.currencyId": getstakedata.currencyid,
            },
            { $set: { "wallets.$.amount": +exchangeAmount } },
            { multi: true }
          );
          var stakeUpdateStake = await userWalletDB.updateOne(
            {
              userId: getstakedata.userId,
              "wallets.currencyId": getstakedata.currencyid,
            },
            { $set: { "wallets.$.stakeAmount": 0 } },
            { multi: true }
          );
          if (stakeUpdateAmount && stakeUpdateStake) {
            var obj = {
              userId: mongoose.Types.ObjectId(userId),
              stakeId: mongoose.Types.ObjectId(getstakedata.id),
              currencyId: mongoose.Types.ObjectId(getstakedata.currencyid),
              currency: getstakedata.stakeCurrencsymbol,
              amount: +getStakeAmount,
              Type: "yield",
            };
            var payout_update = await stake_payouts.create(obj);

            console.log("call 444");
            var current_date = new Date().getTime();
            var stakeEnd = new Date(getstakedata.endDate).getTime();
            var status = 0;
            if (stakeEnd <= current_date) {
              status = 2;
            }
            var nextclaim = new Date(getstakedata.nextclaimDate).getTime() + +getstakedata.YieldDuration * 24 * 60 * 60 * 1000;
            let lenduserData = await userStakingDB.updateOne(
              { _id: req.body._id },
              { $set: { status: status, nextclaimDate: nextclaim } }
            );
            if (lenduserData) {
              console.log("call 5555");
              // share referral bonus
              var referrals = await referralDB.findOne({}).exec();
              if (referrals.stakingStatus == 1) {
                console.log("call 666");
                var referralOffer = referrals.stakingReferral_yield;

                if (
                  user_detail.referredBy != null &&
                  user_detail.referredBy != ""
                ) {
                  console.log("call 7777");
                  var referred = await usersDB.findOne({
                    _id: mongoose.mongo.ObjectId(user_detail.referredBy),
                  });
                  if (referred != null) {
                    var referral_bonus =
                      (+getStakeAmount * referralOffer) / 100;
                    let getWallet_referrer = await userWalletDB
                      .findOne({ userId: referred._id })
                      .exec();
                    var walletData = getWallet_referrer.wallets;
                    var indexing = walletData.findIndex(
                      (x) => x.currencyId == String(getstakedata.currencyid)
                    );
                    if (indexing != -1) {
                      var amount = walletData[indexing].amount;
                      var bonusAmount = amount + referral_bonus;
                      var bonusUpdate = await userWalletDB.updateOne(
                        {
                          userId: referred._id,
                          "wallets.currencyId": getstakedata.currencyid,
                        },
                        { $set: { "wallets.$.amount": +bonusAmount } },
                        { multi: true }
                      );
                      if (bonusUpdate) {
                        var historyObj = {
                          currencyId: getstakedata.currencyid,
                          amount: referral_bonus,
                          userId: referred._id,
                          totalAmount: bonusAmount,
                          fee: referralOffer,
                          type: "yield_staking",
                          fromUser: req.userId,
                        };
                        console.log(
                          historyObj,
                          "=-=-=-=-=-=-=-=-=-=-=====-=Have referral =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-"
                        );

                        let refHistory = await referralHistoryDB.create(
                          historyObj
                        );

                        return res.json({
                          status: true,
                          Message: "Claimed successfully!",
                        });
                      }
                    }
                  }
                } else {
                  console.log("call 8888");
                  return res.json({
                    status: true,
                    Message: "Claimed successfully!",
                  });
                }
              } else {
                return res.json({
                  status: true,
                  Message: "Claimed successfully!",
                });
              }
            } else {
              return res.json({
                status: false,
                Message: "Please try again later1",
                data: {},
              });
            }
          } else {
            return res.json({
              status: false,
              Message: "Please try again later2",
              data: {},
            });
          }
          // }
          // else
          // {
          //   return res.json({
          //     status: false,
          //     Message: "You are already claimed",
          //     data: {},
          //   });
          // }
        } else {
          return res.json({
            status: false,
            Message: "Please try again later3",
            data: {},
          });
        }
      } else {
        return res.json({
          status: false,
          Message: "Please try again later4",
          data: {},
        });
      }
    } else {
      return res.json({
        status: false,
        Message: "Please try again later5",
        data: {},
      });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post(
  "/getAllstakingHistory",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      var skippage = perPage * page - perPage;

      var userId = req.userId;
      var search = req.body.search;
      var filter = {};
      console.log("searcl", search);
      if (search != null && search != "") {
        filter = {
          userId: userId,
          type: req.body.type,
          $or: [
            { stakeCurrencsymbol: { $regex: new RegExp(search, "i") } },
            { stakeCurrencyName: { $regex: new RegExp(search, "i") } },
          ],
        };
      } else {
        if (
          req.body.type != "" &&
          req.body.type != null &&
          req.body.type != undefined
        ) {
          filter = {
            userId: userId,
            type: req.body.type,
          };
        } else {
          filter = {
            userId: userId,
          };
        }
      }

      let getUserStakeHistory = await userStakingDB
        .find(filter)
        .sort({ _id: -1 })
        .skip(skippage)
        .limit(perPage)
        .exec({});
      console.log(getUserStakeHistory, "getUserStakeHistory");
      let count = await userStakingDB.find({ userId: userId }).exec({});
      if (getUserStakeHistory) {
        var currentDate = new Date().getTime();

        var pushDatas = [];
        for (var i = 0; i < getUserStakeHistory.length; i++) {
          if (
            getUserStakeHistory[i].type == "Flexible" &&
            getUserStakeHistory[i].status == 0
          ) {
            var stakeEndDate = new Date(
              getUserStakeHistory[i].startDate
            ).getTime();
            var days = (+currentDate - +stakeEndDate) / (1000 * 60 * 60 * 24);
            // console.log("currentDate",currentDate)
            // console.log("stakeEndDate",stakeEndDate)
            // console.log("flexible daya===",days);
            getUserStakeHistory[i].totalInterest =
              getUserStakeHistory[i].dailyinterest * days;
          }
          pushDatas.push(getUserStakeHistory[i]);
        }
        return res.json({
          status: true,
          Message: "Success!",
          data: pushDatas,
          total: count.length,
        });
      } else {
        return res.json({
          status: false,
          Message: "Please try again later",
          data: {},
        });
      }
    } catch (error) {
      console.log(error);
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post(
  "/getFlexiblestakingHistory",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 1 );
      var page = Number(req.body.FilPage ? req.body.FilPage : 1);
      var skippage = perPage * page - perPage;

      var userId = req.userId;

      let getUserStakeHistory = await userStakingDB
        .find( {userId: userId,type:"flexible"})
        .sort({ _id: -1 })
        .skip(skippage)
        .limit(perPage)
        .exec({});
      let count = await userStakingDB.find({ userId: userId,type:"flexible" }).exec({});
      if (getUserStakeHistory) {
        var currentDate = new Date().getTime();

        var pushDatas = [];
        for (var i = 0; i < getUserStakeHistory.length; i++) {
          if (
            getUserStakeHistory[i].type == "Flexible" &&
            getUserStakeHistory[i].status == 0
          ) {
            var stakeEndDate = new Date(
              getUserStakeHistory[i].startDate
            ).getTime();
            var days = (+currentDate - +stakeEndDate) / (1000 * 60 * 60 * 24);
            getUserStakeHistory[i].totalInterest =
              getUserStakeHistory[i].dailyinterest * days;
          }
          pushDatas.push(getUserStakeHistory[i]);
        }
        return res.json({
          status: true,
          Message: "Success!",
          data: pushDatas,
          total: count.length,
        });
      } else {
        return res.json({
          status: false,
          Message: "Please try again later",
          data: {},
        });
      }
    } catch (error) {
      console.log(error);
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post(
  "/getFixedstakingHistory",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 1 );
      var page = Number(req.body.FilPage ? req.body.FilPage : 1);
      var skippage = perPage * page - perPage;

      var userId = req.userId;

      let getUserStakeHistory = await userStakingDB
        .find( {userId: userId,type:"fixed"})
        .sort({ _id: -1 })
        .skip(skippage)
        .limit(perPage)
        .exec({});
      let count = await userStakingDB.find({ userId: userId ,type:"fixed"}).exec({});
      if (getUserStakeHistory) {
        var currentDate = new Date().getTime();

        var pushDatas = [];
        for (var i = 0; i < getUserStakeHistory.length; i++) {
          if (
            getUserStakeHistory[i].type == "Flexible" &&
            getUserStakeHistory[i].status == 0
          ) {
            var stakeEndDate = new Date(
              getUserStakeHistory[i].startDate
            ).getTime();
            var days = (+currentDate - +stakeEndDate) / (1000 * 60 * 60 * 24);
            getUserStakeHistory[i].totalInterest =
              getUserStakeHistory[i].dailyinterest * days;
          }
          pushDatas.push(getUserStakeHistory[i]);
        }
        return res.json({
          status: true,
          Message: "Success!",
          data: pushDatas,
          total: count.length,
        });
      } else {
        return res.json({
          status: false,
          Message: "Please try again later",
          data: {},
        });
      }
    } catch (error) {
      console.log(error);
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post(
  "/stakingHistory_fixed",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      var skippage = perPage * page - perPage;

      var userId = req.userId;
      var search = req.body.search;
      var filter = {};
      console.log("searcl", search);
      if (search != null && search != "") {
        filter = {
          userId: userId,
          type: "fixed",
          $or: [
            { stakeCurrencsymbol: { $regex: new RegExp(search, "i") } },
            { stakeCurrencyName: { $regex: new RegExp(search, "i") } },
          ],
        };
      } else {
        if (
          req.body.type != "" &&
          req.body.type != null &&
          req.body.type != undefined
        ) {
          filter = {
            userId: userId,
            type: "fixed",
          };
        } else {
          filter = {
            userId: userId,
          };
        }
      }

      let getUserStakeHistory = await userStakingDB
        .find(filter)
        .sort({ _id: -1 })
        .skip(skippage)
        .limit(perPage)
        .exec({});
      console.log(getUserStakeHistory, "getUserStakeHistory");
      let count = await userStakingDB.find({ userId: userId, type: "fixed" }).exec({});
      if (getUserStakeHistory) {
        var currentDate = new Date().getTime();

        var pushDatas = [];
        for (var i = 0; i < getUserStakeHistory.length; i++) {
          if (
            getUserStakeHistory[i].type == "Flexible" &&
            getUserStakeHistory[i].status == 0
          ) {
            var stakeEndDate = new Date(
              getUserStakeHistory[i].startDate
            ).getTime();
            var days = (+currentDate - +stakeEndDate) / (1000 * 60 * 60 * 24);
            // console.log("currentDate",currentDate)
            // console.log("stakeEndDate",stakeEndDate)
            // console.log("flexible daya===",days);
            getUserStakeHistory[i].totalInterest =
              getUserStakeHistory[i].dailyinterest * days;
          }
          pushDatas.push(getUserStakeHistory[i]);
        }
        return res.json({
          status: true,
          Message: "Success!",
          data: pushDatas,
          total: count.length,
        });
      } else {
        return res.json({
          status: false,
          Message: "Please try again later",
          data: {},
        });
      }
    } catch (error) {
      console.log(error);
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post(
  "/stakingHistory_flexible",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      var skippage = perPage * page - perPage;

      var userId = req.userId;
      var search = req.body.search;
      var filter = {};
      console.log("searcl", search);
      if (search != null && search != "") {
        filter = {
          userId: userId,
          type: "Flexible",
          $or: [
            { stakeCurrencsymbol: { $regex: new RegExp(search, "i") } },
            { stakeCurrencyName: { $regex: new RegExp(search, "i") } },
          ],
        };
      } else {
        if (
          req.body.type != "" &&
          req.body.type != null &&
          req.body.type != undefined
        ) {
          filter = {
            userId: userId,
            type: "Flexible",
          };
        } else {
          filter = {
            userId: userId,
          };
        }
      }

      let getUserStakeHistory = await userStakingDB
        .find(filter)
        .sort({ _id: -1 })
        .skip(skippage)
        .limit(perPage)
        .exec({});
      console.log(getUserStakeHistory, "getUserStakeHistory");
      let count = await userStakingDB.find({ userId: userId, type: "Flexible" }).exec({});
      if (getUserStakeHistory) {
        var currentDate = new Date().getTime();

        var pushDatas = [];
        for (var i = 0; i < getUserStakeHistory.length; i++) {
          if (
            getUserStakeHistory[i].type == "Flexible" &&
            getUserStakeHistory[i].status == 0
          ) {
            var stakeEndDate = new Date(
              getUserStakeHistory[i].startDate
            ).getTime();
            var days = (+currentDate - +stakeEndDate) / (1000 * 60 * 60 * 24);
            // console.log("currentDate",currentDate)
            // console.log("stakeEndDate",stakeEndDate)
            // console.log("flexible daya===",days);
            getUserStakeHistory[i].totalInterest =
              getUserStakeHistory[i].dailyinterest * days;
          }
          pushDatas.push(getUserStakeHistory[i]);
        }
        return res.json({
          status: true,
          Message: "Success!",
          data: pushDatas,
          total: count.length,
        });
      } else {
        return res.json({
          status: false,
          Message: "Please try again later",
          data: {},
        });
      }
    } catch (error) {
      console.log(error);
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);


router.post(
  "/stakingHistory_yield",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      var skippage = perPage * page - perPage;

      var userId = req.userId;
      var search = req.body.search;
      var filter = {};
      console.log("searcl", search);
      if (search != null && search != "") {
        filter = {
          userId: userId,
          type: "yield",
          $or: [
            { stakeCurrencsymbol: { $regex: new RegExp(search, "i") } },
            { stakeCurrencyName: { $regex: new RegExp(search, "i") } },
          ],
        };
      } else {
        if (
          req.body.type != "" &&
          req.body.type != null &&
          req.body.type != undefined
        ) {
          filter = {
            userId: userId,
            type: "yield",
          };
        } else {
          filter = {
            userId: userId,
          };
        }
      }

      let getUserStakeHistory = await userStakingDB
        .find(filter)
        .sort({ _id: -1 })
        .skip(skippage)
        .limit(perPage)
        .exec({});
      console.log(getUserStakeHistory, "getUserStakeHistory");
      let count = await userStakingDB.find({ userId: userId, type: "yield" }).exec({});
      if (getUserStakeHistory) {
        var currentDate = new Date().getTime();

        var pushDatas = [];
        for (var i = 0; i < getUserStakeHistory.length; i++) {
          pushDatas.push(getUserStakeHistory[i]);
        }
        return res.json({
          status: true,
          Message: "Success!",
          data: pushDatas,
          total: count.length,
        });
      } else {
        return res.json({
          status: false,
          Message: "Please try again later",
          data: {},
        });
      }
    } catch (error) {
      console.log(error);
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post("/getyieldcalculation", async (req, res) => {
  try {
    console.log(req.body, "[==-==-=-=-req.bodyreq.bodyreq.body=-=-=-=-=-=-]");
    if (
      req.body.Id != "" &&
      req.body.investValue != "" &&
      req.body.APRPercentage != "" &&
      req.body.days != "" &&
      req.body.yiledStakeType != ""
    ) {
      var estimateInterest =
        (((Number(req.body.investValue) * Number(req.body.APRPercentage)) /
          100) *
          Number(req.body.days)) /
        Number(req.body.yiledStakeType);
      console.log(
        estimateInterest,
        "=-=-=estimateInterest=-=-=estimateInterest-="
      );

      var plans = parseFloat(req.body.yiledStakeType);
      var d = new Date();
      var fromDate =
        (await d.getDate()) +
        "/" +
        (d.getMonth() + 1) +
        "/" +
        d.getFullYear() +
        " " +
        d.getHours() +
        ":" +
        d.getMinutes();

      var myDate = new Date(new Date().getTime() + plans * 24 * 60 * 60 * 1000);

      var toDate =
        (await myDate.getDate()) +
        "/" +
        (myDate.getMonth() + 1) +
        "/" +
        myDate.getFullYear() +
        " " +
        myDate.getHours() +
        ":" +
        myDate.getMinutes();

      var stakeType = +req.body.yiledStakeType / 365;

      var obj = {
        stakingPlan: "",
        totalInterest: parseFloat(estimateInterest).toFixed(8),
        dailyinterest: 0,
        startDate: fromDate,
        endDate: toDate,
        currentAPY: req.body.APRPercentage,
        stakeMore: { id: req.body.Id, stats: "Yield Staking" },
        stakeAmont: +req.body.investValue,
        type: "yield",
        totalPlan: stakeType,
        yieldDuration: +req.body.APRPercentage,
        currentYieldYear: +req.body.days,
      };

      return res.json({ status: true, Message: obj });
    } else {
      return res.json({ status: false, Message: "Enter all fields" });
    }
  } catch (error) {
    console.log("catch error stake calculation===", error.message);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.get("/stakingPayouts", async (req, res) => {
  try {
    stake_payouts
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userdata",
          },
        },
        {
          $sort: { _id: -1 },
        },
      ])
      .exec((err, data) => {
        // console.log("all staking data===",data);
        if (!err) {
          var arrPush = [];
          for (var i = 0; i < data.length; i++) {
            var obj = {
              email: common.decrypt(data[i].userdata[0].email),
              currency: data[i].currency,
              amount: data[i].amount,
              type: data[i].Type,
              date: moment(data[i].createdAt).format("lll"),
              id: i + 1,
            };
            arrPush.push(obj);
          }
          return res.json({ status: true, Message: "Success!", data: arrPush });
        } else {
          return res.json({
            status: false,
            Message: "Please try again later",
            data: {},
          });
        }
      });
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post(
  "/confirmStaking_user",
  common.tokenmiddleware,
  async (req, res) => {
    try {
    if(!!req.body.stakeAmont&&req.body.stakeAmont >0&&!!req.body.totalInterest&&!!req.body.dailyinterest&&!!req.body.currentAPY&&!!req.body.stakeMore&&!!req.body.type) {
      let findStake = await stakingDB.findOne({ _id: req.body.stakeMore }).exec({});
    if(!findStake){
      return res.json({ status: false, Message: "Something went wroung,please try again later!" });
    }else if ( req.body.type ==="fixed" ? findStake.minimumStaking > parseFloat(req.body.stakeAmont):findStake.minimumStakingflex > parseFloat(req.body.stakeAmont)){
      if (req.body.type === "fixed") {
        return res.json({ status: false, Message: "Minimum staking level " + findStake.minimumStaking });
      } else {
        return res.json({ status: false, Message: "Minimum staking level " + findStake.minimumStakingflex });
      }
    }else if ( req.body.type ==="fixed" ? findStake.maximumStaking < parseFloat(req.body.stakeAmont): findStake.maximumStakingflex < parseFloat(req.body.stakeAmont)){
      if (req.body.type === "fixed") {
        return res.json({ status: false, Message: "Maximum staking level " + findStake.maximumStaking });
      } else {
        return res.json({ status: false, Message: "Maximum staking level " + findStake.maximumStakingflex });
      }
    }else{
      let getWallets = await userWalletDB.findOne({userId: req.userId});
      if (!getWallets) {
      return res.json({ status: false, Message: "Please try again later" });
       }else{
        var walletData = getWallets.wallets;
        var indexing = walletData.findIndex(
          (x) => x.currencySymbol == findStake.currencySymbol
        );
        if (indexing == -1) {
       return res.json({ status: false, Message: "Please try again later" });
        }else{
          let walletBalance = walletData[indexing];
          console.log(walletBalance,"walletBalance")
        if(walletBalance.amount <= req.body.stakeAmont){
          return res.json({ status: false, Message: "Insufficient funds for Staking" });
        }else{
           var  totalStakeAmount = walletBalance.stakeAmount + req.body.stakeAmont
           var  totalSpotAmount = walletBalance.amount -req.body.stakeAmont
           var detuctSpot = await userWalletDB.updateOne( { userId: req.userId, "wallets.currencyId": findStake.currencyId }, { $set: { "wallets.$.amount": +totalSpotAmount } },{ multi: true });
           if(detuctSpot.nModified==1){
           var addStake = await userWalletDB.updateOne( { userId: req.userId, "wallets.currencyId": findStake.currencyId }, { $set: { "wallets.$.stakeAmount": +totalStakeAmount } },{ multi: true });
           if (addStake.nModified==1){
              var obj = {
                userId: req.userId,
                stakingPlan: +req.body.stakingPlan,
                totalInterest: +req.body.totalInterest,
                dailyinterest: +req.body.dailyinterest,
                startDate: req.body.startDate ?req.body.startDate:"", 
                endDate: req.body.endDate ?req.body.endDate:"",
                currentAPY: +req.body.currentAPY,
                stakeAmont: +req.body.stakeAmont,
                note: findStake.status,
                stakeCurrencsymbol: findStake.currencySymbol,
                stakeCurrencyName: findStake.currencyName,
                stakeId: findStake._id,
                currencyImage: findStake.currencyImage,
                currencyid: findStake.currencyId,
                type: req.body.type,
              };
              console.log(obj,"obj")
              let create_stake = await userStakingDB.create(obj);
              if(create_stake){
                return res.json({status: true,Message: " Staking Sucessfully !"});
              }else{
                return res.json({ status: false, Message: "Please try again later",});
              }
           }else{
            return res.json({ status: false, Message: "Please try again later",});
           }
           }else{
                return res.json({ status: false, Message: "Please try again later",});
           }
        }
        }
      }

    }
    }else{
      return res.json({ status: false, Message: "Enter Valid amount" });
    }
    } catch (err) {
      console.log(err,"======stakingerror========")
    }
  }
);


module.exports = router;