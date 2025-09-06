var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");
let ObjectId = mongoose.Types.ObjectId;
var common = require("../helper/common");
var currencyDB = require("../schema/currency");
var userWalletDB = require("../schema/userWallet");
var usersDB = require("../schema/users");
var async = require("async");
const WAValidator = require("multicoin-address-validator");
var key = require("../config/key");
var mailtempDB = require("../schema/mailtemplate");
var mail = require("../helper/mailhelper");
var withdrawDB = require("../schema/withdraw");
var adminDB = require("../schema/admin");
var depositDB = require("../schema/deposit");
var binanceExchange = require("../exchanges/binance.js");
const speakeasy = require("speakeasy");
const kycDB = require("../schema/kyc");
const manualDepDB = require("../schema/manualDeposit");
const moment = require("moment");
const userBank = require("../schema/bankdetails");
const { json } = require("body-parser");
const { remove } = require("../schema/userWallet");
var notifydb = require("../schema/notification");
var sms = require("../helper/sms");
var SettingDB = require("../schema/sitesettings.js");
const { processWithdrawal } = require('../controller/processwithdraw.js');
const { validateWithdrawal } = require('../middleware/validateMiddleware.js')
const { validationResult } = require('express-validator');
const { decrypt } = require('../helper/common'); 

// Withdraw validation 
const generateRandomOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); 
  };

  function getUniqueListBy(arr, key) {
    return [...new Map(arr.map((item) => [item[key], item])).values()];
  }

  const createWithdrawal = async (userId, currencySymbol, otp, withdrawalAddress) => {
    const withdrawal = new withdrawDB({
    user_id: userId,
    currency_symbol: currencySymbol,
    withdrawOTP: otp, 
    withdraw_address: withdrawalAddress,
    expireTime: moment().add(5, 'minutes').toDate(),
    status: 0, // 0 indicates user pending
    });
    
    await withdrawal.save();
    };
    
router.post('/fieldvalidate', common.tokenmiddleware, validateWithdrawal, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
  return res.status(400).json({ status: false, errors: errors.array() });
  }
  
  try {
  const userId = req.userId;
  const { currency_symbol, withdrawalAddress } = req.body;
  const user = await usersDB.findById(userId);
  if (!user) {
  return res.status(404).json({ status: false, message: 'Invalid user.' });
  }
  
  const decryptedEmail = decrypt(user.email); 
  const generatedOtp = generateRandomOTP();  
  await createWithdrawal(userId, currency_symbol, generatedOtp, withdrawalAddress);  
  const dynamicSubject = `Your Withdrawal OTP for ${currency_symbol}`;  
  let resData = await mailtempDB.findOne({ key: "withdraw_otp" });
  var etempdataDynamic = resData.body
  .replace(/###OTP###/g, generatedOtp)
  .replace(/###USERNAME###/g, decryptedEmail);
  const mailOptions = {
  from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
  to: decryptedEmail,
  subject: dynamicSubject, 
  html: etempdataDynamic
  };
  
  if (!mailOptions.to) {
  throw new Error("No recipients defined");
  }
  
  await mail.sendMail(mailOptions)
  .then(() => res.json({ status: true, message: 'Withdrawal validated and OTP sent successfully via email.' }))
  .catch(err => res.json({ status: false, message: err }));
  
  } catch (error) {
  res.status(500).json({ status: false, message: 'An error occurred during the withdrawal process.', error: error.message });
  }
  });
  



router.post('/process', common.tokenmiddleware, processWithdrawal);

//-----------------------------------------------------------
//get currency list
router.get("/get_currency_list", (req, res) => {
  try {
    currencyDB
      .find({ status: "Active", coinType: "1" })
      .exec(function (err, data) {
        if (err) {
          return res.json({
            status: false,
            message: "Something went wrong, Please try again later",
          });
        } else {
          return res.json({ status: true, data: data });
        }
      });
  } catch (error) {
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.get("/getUserBalance", common.tokenmiddleware, (req, res) => {
  //console.log("call here====");
  try {
    userWalletDB
      .aggregate([
        {
          $unwind: "$wallets",
        },
        {
          $lookup: {
            from: "currency",
            localField: "wallets.currencyId",
            foreignField: "_id",
            as: "currdetail",
          },
        },
        {
          $match: { userId: mongoose.Types.ObjectId(req.userId) },
        },

        {
          $project: {
            currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencySymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
            withdrawStatus: { $arrayElemAt: ["$currdetail.withdrawStatus", 0] },
            depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
            withdrawFee: { $arrayElemAt: ["$currdetail.withdrawFee", 0] },
            minWithdrawLimit: {
              $arrayElemAt: ["$currdetail.minWithdrawLimit", 0],
            },
            maxWithdrawLimit: {
              $arrayElemAt: ["$currdetail.maxWithdrawLimit", 0],
            },
            currencyBalance: "$wallets.amount",
            holdAmount: "$wallets.holdAmount",
            currid: { $arrayElemAt: ["$currdetail._id", 0] },
          },
        },
      ])
      .exec((err, data) => {
        if (err) {
          return res.json({ status: false, Message: err, code: 200 });
        } else {
          if (data.length > 0) {
            var currencies = [];
            var dep_currencies = [];
            for (var i = 0; i < data.length; i++) {
              if (data[i].withdrawStatus == "Active") {
                var obj = {
                  currencyName: data[i].currencyName,
                  currencySymbol: data[i].currencySymbol,
                  currencyType: data[i].currencyType,
                  withdrawFee: data[i].withdrawFee,
                  minWithdrawLimit: data[i].minWithdrawLimit,
                  maxWithdrawLimit: data[i].maxWithdrawLimit,
                  currencyBalance: data[i].currencyBalance,
                  holdAmount: data[i].holdAmount,
                  currid: data[i].currid,
                };
                currencies.push(obj);
              }

              if (data[i].depositStatus == "Active") {
                var obj = {
                  currencyName: data[i].currencyName,
                  currencysymbol: data[i].currencySymbol,
                  currencyType: data[i].currencyType,
                  currencyBalance: data[i].currencyBalance,
                  holdAmount: data[i].holdAmount,
                  currid: data[i].currid,
                };
                dep_currencies.push(obj);
              }
            }
          }
          return res.json({
            status: true,
            data: currencies,
            dep_currencies: dep_currencies,
            code: 200,
          });
        }
      });
  } catch (error) {
    return res.json({ status: false, Message: "Internal server", code: 500 });
  }
});

router.get("/getUserBalanceStaking", common.tokenmiddleware, (req, res) => {
  //console.log("call here====");
  try {
    userWalletDB
      .aggregate([
        {
          $unwind: "$wallets",
        },
        {
          $lookup: {
            from: "currency",
            localField: "wallets.currencyId",
            foreignField: "_id",
            as: "currdetail",
          },
        },
        {
          $match: { userId: mongoose.Types.ObjectId(req.userId) },
        },

        {
          $project: {
            currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencySymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
            withdrawStatus: { $arrayElemAt: ["$currdetail.withdrawStatus", 0] },
            depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
            withdrawFee: { $arrayElemAt: ["$currdetail.withdrawFee", 0] },
            minWithdrawLimit: {
              $arrayElemAt: ["$currdetail.minWithdrawLimit", 0],
            },
            maxWithdrawLimit: {
              $arrayElemAt: ["$currdetail.maxWithdrawLimit", 0],
            },
            currencyBalance: "$wallets.amount",
            holdAmount: "$wallets.holdAmount",
            currid: { $arrayElemAt: ["$currdetail._id", 0] },
          },
        },
      ])
      .exec((err, data) => {
        if (err) {
          return res.json({ status: false, Message: err, code: 200 });
        } else {
          if (data.length > 0) {
            var currencies = [];
            var dep_currencies = [];
            return res.json({ status: true, data: data, code: 200 });
          }
        }
      });
  } catch (error) {
    return res.json({ status: false, Message: "Internal server", code: 500 });
  }
});
router.post("/verifytfa", common.tokenmiddleware, async (req, res) => {
  try {
    var tfa_code = +req.body.code.toString();
    if (tfa_code != "") {
      let userId = req.userId;
      let resData = await usersDB.findOne(
        { _id: userId },
        { tfastatus: 1, tfaenablekey: 1 }
      );
      if (resData.tfastatus == 0) {
        return res.json({
          status: false,
          message: "Enable TFA to continue withdraw.",
        });
      } else {
        var verified = speakeasy.totp.verify({
          secret: resData.tfaenablekey,
          encoding: "base32",
          token: tfa_code,
          window: 1,
        });
        if (verified == true) {
          return res.json({ status: true });
        } else {
          return res.json({ status: false, message: "Invalid 2FA Code" });
        }
      }
    } else {
      return res.json({ status: false, message: "Please enter tfa code" });
    }
  } catch (e) {
    console.log(
      "==================== verify tfa catch====================",
      e.message
    );
    return res.json({ status: false, message: "Internal server" });
  }
});

router.post("/withdraw_submit", common.tokenmiddleware, (req, res) => {
  try {
    //console.log(req.body, "---------req.body----------");
    // return false;
    var userId = req.userId;
    var amount = +req.body.amount;
    var withdraw_address = req.body.withdraw_address;
    var tfa = req.body.tfaCode;
    //var fees = req.body.fees;
    //var receiveamount = req.body.receiveamount;
    //var url = req.body.url;
    //var currency_id = req.body.currency_id;
    var currency_symbol = req.body.currency_symbol;
    var url = key.siteUrl + "withdraw";
    // console.log("typeof userId===", typeof userId);
    // console.log("typeof amount===", typeof amount);
    // console.log("typeof withdraw_address===", typeof withdraw_address);
    // console.log("typeof currency_symbol===", typeof currency_symbol);

    if (
      typeof userId === "string" &&
      typeof amount === "number" &&
      typeof withdraw_address === "string" &&
      typeof currency_symbol === "string"
    ) {
      if (amount > 0) {
        currencyDB
          .findOne({ currencySymbol: currency_symbol })
          .exec(function (cerr, currencydata) {
            //console.log(currencydata, "currencydatacurrencydata");
            SettingDB.findOne({}).exec(function (err, getSiteSetting) {
              if (currencydata) {
                var cointype = currencydata.currencyType;
                var symbol = currencydata.currencySymbol;
                var currency_id = currencydata._id;
                // if (cointype == 2 || symbol == "RPTC") {
                //   symbol = "ETH";
                // }
                if (req.body.currency_symbol == "TRX" || currencydata.trc20token == "1") {
                  const pattern = /^(T|A)[a-zA-Z0-9]{33}$/;
                  if (pattern.test(withdraw_address)) {
                    usersDB
                      .findOne({ _id: ObjectId(userId) })
                      .exec(function (uerr, userdata) {
                        if (userdata) {
                          // console.log(getSiteSetting.kycStatus);
                          if (getSiteSetting.kycStatus == "Active") {
                            if (userdata.kycstatus == 1) {
                              if (userdata.tfastatus == 1) {
                                var verified = speakeasy.totp.verify({
                                  secret: userdata.tfaenablekey,
                                  encoding: "base32",
                                  token: tfa,
                                  window: 1,
                                });
                              } else {
                                var verified = true;
                              }

                              //console.log("verified===",verified);
                              if (
                                userdata.withdrawOtp == req.body.withdrawOtp
                              ) {
                                if (verified == true) {
                                  common.getbalance(
                                    userId,
                                    currency_id,
                                    function (userbalance) {
                                      if (+amount <= userbalance.amount) {
                                        if (
                                          amount <=
                                          currencydata.maxWithdrawLimit
                                        ) {
                                          if (
                                            amount >=
                                            currencydata.minWithdrawLimit
                                          ) {
                                            var deduct_balance =
                                              userbalance.amount - amount;
                                            var currnt_balance =
                                              userbalance.amount;
                                            if (deduct_balance >= 0) {
                                              var date = new Date();
                                              var fee_per =
                                                currencydata.withdrawFee;
                                              var fees =
                                                (amount * fee_per) / 100;
                                              var receiveamount = amount - fees;
                                              var obj = {
                                                user_id: userId,
                                                user_name: userdata.username,
                                                email: common.decrypt(
                                                  userdata.email
                                                ),
                                                currency_id: currency_id,
                                                currency_symbol:
                                                  currencydata.currencySymbol,
                                                amount: parseFloat(
                                                  amount
                                                ).toFixed(8),
                                                receiveamount: parseFloat(
                                                  receiveamount
                                                ).toFixed(8),
                                                withdraw_address: withdraw_address,
                                                fees: parseFloat(fees).toFixed(
                                                  8
                                                ),
                                                type: 0,
                                                withdraw_type: 0,
                                                status: 1,
                                                created_at: new Date(),
                                                updated_at: new Date(),
                                                expireTime: new Date(
                                                  date.getTime() + 15 * 60000
                                                ),
                                                network:
                                                  currencydata.currencyType ==
                                                    "2"
                                                    ? req.body.network
                                                    : "",
                                              };
                                              withdrawDB.create(obj, function (
                                                err,
                                                response
                                              ) {
                                                common.getUserBalance(
                                                  response.user_id,
                                                  response.currency_id,
                                                  function (balance) {
                                                    if (balance != null) {
                                                      var Balance =
                                                        balance.totalBalance -
                                                        response.amount;
                                                      if (
                                                        currencydata.currencyType ==
                                                        "2"
                                                      ) {
                                                        common.updateUserBalance(
                                                          response.user_id,
                                                          response.currency_id,
                                                          +Balance,
                                                          "total",
                                                          function (balance) { }
                                                        );

                                                        common.withdraw_approve(response, 'admin', function (resdatas) {
                                                          console.log("withdraw confirm resdatas====", resdatas)
                                                          if (resdatas.status) {
                                                            mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                              var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                              mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                                res.json({ status: true, message: 'Withdraw processed successfully' });
                                                              });
                                                            });
                                                          }
                                                          else {
                                                            res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                                          }
                                                        });

                                                        // return res.json({
                                                        //   status: true,
                                                        //   message:
                                                        //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                                        //   currency:
                                                        //     response.currency_symbol,
                                                        // });
                                                      } else {
                                                        common.updateUserBalance(
                                                          response.user_id,
                                                          response.currency_id,
                                                          +Balance,
                                                          "total",
                                                          function (balance) { }
                                                        );
                                                        // console.log(
                                                        //   "calll 333====",
                                                        //   balance
                                                        // );
                                                        // return res.json({
                                                        //   status: true,
                                                        //   message:
                                                        //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                                        //   currency:
                                                        //     response.currency_symbol,
                                                        // });

                                                        common.withdraw_approve(response, 'admin', function (resdatas) {
                                                          console.log("withdraw confirm resdatas====", resdatas)
                                                          if (resdatas.status) {
                                                            mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                              var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                              mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                                res.json({ status: true, message: 'Withdraw processed successfully' });
                                                              });
                                                            });
                                                          }
                                                          else {
                                                            res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                                          }
                                                        });
                                                      }
                                                    } else {
                                                      return res.json({
                                                        status: false,
                                                        message:
                                                          "Something went wrong, Please try again later",
                                                      });
                                                    }
                                                  }
                                                );
                                              });
                                            } else {
                                              res.json({
                                                status: false,
                                                message: "Insufficient balance",
                                                currency: currency_symbol,
                                              });
                                            }
                                          } else {
                                            res.json({
                                              status: false,
                                              message:
                                                "Minimum withdraw limit is " +
                                                currencydata.minWithdrawLimit.toFixed(
                                                  8
                                                ),
                                              currency: currency_symbol,
                                            });
                                          }
                                        } else {
                                          res.json({
                                            status: false,
                                            message:
                                              "Maximum withdraw limit is " +
                                              currencydata.maxWithdrawLimit.toFixed(
                                                8
                                              ),
                                            currency: currency_symbol,
                                          });
                                        }
                                      } else {
                                        res.json({
                                          status: false,
                                          message: "Insufficient balance",
                                          currency: currency_symbol,
                                        });
                                      }
                                    }
                                  );
                                } else {
                                  return res.json({
                                    status: false,
                                    message: "Please enter valid tfa code",
                                    currency: currency_symbol,
                                  });
                                }
                              } else {
                                return res.json({
                                  status: false,
                                  message: "Please enter valid OTP",
                                  currency: currency_symbol,
                                });
                              }
                            } else if (userdata.kycstatus == 2) {
                              return res.json({
                                status: false,
                                message: "Your kyc verification is pending",
                                currency: currency_symbol,
                              });
                            } else if (userdata.kycstatus == 3) {
                              return res.json({
                                status: false,
                                message: "Your kyc is rejected",
                                currency: currency_symbol,
                              });
                            } else {
                              return res.json({
                                status: false,
                                message: "Please update your kyc",
                                currency: currency_symbol,
                              });
                            }
                          } else {
                            if (userdata.tfastatus == 1) {
                              var verified = speakeasy.totp.verify({
                                secret: userdata.tfaenablekey,
                                encoding: "base32",
                                token: tfa,
                                window: 1,
                              });
                            } else {
                              var verified = true;
                            }

                            //console.log("verified===",verified);
                            if (userdata.withdrawOtp == req.body.withdrawOtp) {
                              if (verified == true) {
                                common.getbalance(
                                  userId,
                                  currency_id,
                                  function (userbalance) {
                                    if (+amount <= userbalance.amount) {
                                      if (
                                        amount <= currencydata.maxWithdrawLimit
                                      ) {
                                        if (
                                          amount >=
                                          currencydata.minWithdrawLimit
                                        ) {
                                          var deduct_balance =
                                            userbalance.amount - amount;
                                          var currnt_balance =
                                            userbalance.amount;
                                          if (deduct_balance >= 0) {
                                            var date = new Date();
                                            var fee_per =
                                              currencydata.withdrawFee;
                                            var fees = (amount * fee_per) / 100;
                                            var receiveamount = amount - fees;
                                            var obj = {
                                              user_id: userId,
                                              user_name: userdata.username,
                                              email: common.decrypt(
                                                userdata.email
                                              ),
                                              currency_id: currency_id,
                                              currency_symbol:
                                                currencydata.currencySymbol,
                                              amount: parseFloat(
                                                amount
                                              ).toFixed(8),
                                              receiveamount: parseFloat(
                                                receiveamount
                                              ).toFixed(8),
                                              withdraw_address: withdraw_address,
                                              fees: parseFloat(fees).toFixed(8),
                                              type: 0,
                                              withdraw_type: 0,
                                              status: 1,
                                              created_at: new Date(),
                                              updated_at: new Date(),
                                              expireTime: new Date(
                                                date.getTime() + 15 * 60000
                                              ),
                                              network:
                                                currencydata.currencyType == "2"
                                                  ? req.body.network
                                                  : "",
                                            };
                                            withdrawDB.create(obj, function (
                                              err,
                                              response
                                            ) {
                                              common.getUserBalance(
                                                response.user_id,
                                                response.currency_id,
                                                function (balance) {
                                                  if (balance != null) {
                                                    var Balance =
                                                      balance.totalBalance -
                                                      response.amount;
                                                    if (
                                                      currencydata.currencyType ==
                                                      "2"
                                                    ) {

                                                      common.updateUserBalance(
                                                        response.user_id,
                                                        response.currency_id,
                                                        +Balance,
                                                        "total",
                                                        function (balance) { }
                                                      );
                                                      // return res.json({
                                                      //   status: true,
                                                      //   message:
                                                      //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                                      //   currency:
                                                      //     response.currency_symbol,
                                                      // });

                                                      common.withdraw_approve(response, 'admin', function (resdatas) {
                                                        console.log("withdraw confirm resdatas====", resdatas)
                                                        if (resdatas.status) {
                                                          mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                            var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                            mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                              res.json({ status: true, message: 'Withdraw processed successfully' });
                                                            });
                                                          });
                                                        }
                                                        else {
                                                          res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                                        }
                                                      });
                                                    } else {
                                                      common.updateUserBalance(
                                                        response.user_id,
                                                        response.currency_id,
                                                        +Balance,
                                                        "total",
                                                        function (balance) { }
                                                      );
                                                      console.log(
                                                        "calll 333====",
                                                        balance
                                                      );
                                                      // return res.json({
                                                      //   status: true,
                                                      //   message:
                                                      //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                                      //   currency:
                                                      //     response.currency_symbol,
                                                      // });

                                                      common.withdraw_approve(response, 'admin', function (resdatas) {
                                                        console.log("withdraw confirm resdatas====", resdatas)
                                                        if (resdatas.status) {
                                                          mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                            var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                            mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                              res.json({ status: true, message: 'Withdraw processed successfully' });
                                                            });
                                                          });
                                                        }
                                                        else {
                                                          res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                                        }
                                                      });
                                                    }
                                                  } else {
                                                    return res.json({
                                                      status: false,
                                                      message:
                                                        "Something went wrong, Please try again later",
                                                    });
                                                  }
                                                }
                                              );
                                            });
                                          } else {
                                            res.json({
                                              status: false,
                                              message: "Insufficient balance",
                                              currency: currency_symbol,
                                            });
                                          }
                                        } else {
                                          res.json({
                                            status: false,
                                            message:
                                              "Minimum withdraw limit is " +
                                              currencydata.minWithdrawLimit.toFixed(
                                                8
                                              ),
                                            currency: currency_symbol,
                                          });
                                        }
                                      } else {
                                        res.json({
                                          status: false,
                                          message:
                                            "Maximum withdraw limit is " +
                                            currencydata.maxWithdrawLimit.toFixed(
                                              8
                                            ),
                                          currency: currency_symbol,
                                        });
                                      }
                                    } else {
                                      res.json({
                                        status: false,
                                        message: "Insufficient balance",
                                        currency: currency_symbol,
                                      });
                                    }
                                  }
                                );
                              } else {
                                return res.json({
                                  status: false,
                                  message: "Please enter valid tfa code",
                                  currency: currency_symbol,
                                });
                              }
                            } else {
                              return res.json({
                                status: false,
                                message: "Please enter valid OTP",
                                currency: currency_symbol,
                              });
                            }
                          }
                        } else {
                          return res.json({
                            status: false,
                            message: "Invalid user",
                            currency: currency_symbol,
                          });
                        }
                      });
                  } else {
                    return res.json({
                      status: false,
                      message: "Invalid address",
                      currency: currency_symbol,
                    });
                  }
                } else {
                  if (WAValidator.validate(withdraw_address, symbol)) {
                    usersDB
                      .findOne({ _id: ObjectId(userId) })
                      .exec(function (uerr, userdata) {
                        if (userdata) {
                          if (getSiteSetting.kycStatus == "Active") {
                            if (userdata.kycstatus == 1) {
                              if (userdata.tfastatus == 1) {
                                var verified = speakeasy.totp.verify({
                                  secret: userdata.tfaenablekey,
                                  encoding: "base32",
                                  token: tfa,
                                  window: 1,
                                });
                              } else {
                                var verified = true;
                              }

                              if (
                                userdata.withdrawOtp == req.body.withdrawOtp
                              ) {
                                if (verified == true) {
                                  common.getbalance(
                                    userId,
                                    currency_id,
                                    function (userbalance) {
                                      if (+amount <= userbalance.amount) {
                                        if (
                                          amount <=
                                          currencydata.maxWithdrawLimit
                                        ) {
                                          if (
                                            amount >=
                                            currencydata.minWithdrawLimit
                                          ) {
                                            var deduct_balance =
                                              userbalance.amount - amount;
                                            var currnt_balance =
                                              userbalance.amount;
                                            if (deduct_balance >= 0) {
                                              var date = new Date();
                                              var fee_per =
                                                currencydata.withdrawFee;
                                              var fees =
                                                (amount * fee_per) / 100;
                                              var receiveamount = amount - fees;
                                              var obj = {
                                                user_id: userId,
                                                user_name: userdata.username,
                                                email: common.decrypt(
                                                  userdata.email
                                                ),
                                                currency_id: currency_id,
                                                currency_symbol:
                                                  currencydata.currencySymbol,
                                                amount: parseFloat(
                                                  amount
                                                ).toFixed(8),
                                                receiveamount: parseFloat(
                                                  receiveamount
                                                ).toFixed(8),
                                                withdraw_address: withdraw_address,
                                                fees: parseFloat(fees).toFixed(
                                                  8
                                                ),
                                                type: 0,
                                                withdraw_type: 0,
                                                status: 1,
                                                created_at: new Date(),
                                                updated_at: new Date(),
                                                expireTime: new Date(
                                                  date.getTime() + 15 * 60000
                                                ),
                                                network:
                                                  currencydata.currencyType ==
                                                    "2"
                                                    ? req.body.network
                                                    : "",
                                              };
                                              withdrawDB.create(obj, function (
                                                err,
                                                response
                                              ) {
                                                common.getUserBalance(
                                                  response.user_id,
                                                  response.currency_id,
                                                  function (balance) {
                                                    if (balance != null) {
                                                      var Balance =
                                                        balance.totalBalance -
                                                        response.amount;
                                                      if (
                                                        currencydata.currencyType ==
                                                        "2"
                                                      ) {
                                                        common.updateUserBalance(
                                                          response.user_id,
                                                          response.currency_id,
                                                          +Balance,
                                                          "total",
                                                          function (balance) { }
                                                        );
                                                        // return res.json({
                                                        //   status: true,
                                                        //   message:
                                                        //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                                        //   currency:
                                                        //     response.currency_symbol,
                                                        // });

                                                        common.withdraw_approve(response, 'admin', function (resdatas) {
                                                          console.log("withdraw confirm resdatas====", resdatas)
                                                          if (resdatas.status) {
                                                            mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                              var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                              mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                                res.json({ status: true, message: 'Withdraw processed successfully' });
                                                              });
                                                            });
                                                          }
                                                          else {
                                                            res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                                          }
                                                        });
                                                      } else {
                                                        common.updateUserBalance(
                                                          response.user_id,
                                                          response.currency_id,
                                                          +Balance,
                                                          "total",
                                                          function (balance) { }
                                                        );
                                                        // console.log(
                                                        //   "calll 333====",
                                                        //   balance
                                                        // );
                                                        // return res.json({
                                                        //   status: true,
                                                        //   message:
                                                        //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                                        //   currency:
                                                        //     response.currency_symbol,
                                                        // });

                                                        common.withdraw_approve(response, 'admin', function (resdatas) {
                                                          console.log("withdraw confirm resdatas====", resdatas)
                                                          if (resdatas.status) {
                                                            mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                              var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                              mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                                res.json({ status: true, message: 'Withdraw processed successfully' });
                                                              });
                                                            });
                                                          }
                                                          else {
                                                            res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                                          }
                                                        });
                                                      }
                                                    } else {
                                                      return res.json({
                                                        status: false,
                                                        message:
                                                          "Something went wrong, Please try again later",
                                                      });
                                                    }
                                                  }
                                                );
                                              });
                                            } else {
                                              res.json({
                                                status: false,
                                                message: "Insufficient balance",
                                                currency: currency_symbol,
                                              });
                                            }
                                          } else {
                                            res.json({
                                              status: false,
                                              message:
                                                "Minimum withdraw limit is " +
                                                currencydata.minWithdrawLimit.toFixed(
                                                  8
                                                ),
                                              currency: currency_symbol,
                                            });
                                          }
                                        } else {
                                          res.json({
                                            status: false,
                                            message:
                                              "Maximum withdraw limit is " +
                                              currencydata.maxWithdrawLimit.toFixed(
                                                8
                                              ),
                                            currency: currency_symbol,
                                          });
                                        }
                                      } else {
                                        res.json({
                                          status: false,
                                          message: "Insufficient balance",
                                          currency: currency_symbol,
                                        });
                                      }
                                    }
                                  );
                                } else {
                                  return res.json({
                                    status: false,
                                    message: "Please enter valid tfa code",
                                    currency: currency_symbol,
                                  });
                                }
                              } else {
                                return res.json({
                                  status: false,
                                  message: "Please enter valid OTP",
                                  currency: currency_symbol,
                                });
                              }
                            } else if (userdata.kycstatus == 2) {
                              return res.json({
                                status: false,
                                message: "Your kyc verification is pending",
                                currency: currency_symbol,
                              });
                            } else if (userdata.kycstatus == 3) {
                              return res.json({
                                status: false,
                                message: "Your kyc is rejected",
                                currency: currency_symbol,
                              });
                            } else {
                              return res.json({
                                status: false,
                                message: "Please update your kyc",
                                currency: currency_symbol,
                              });
                            }
                          } else {
                            if (userdata.tfastatus == 1) {
                              var verified = speakeasy.totp.verify({
                                secret: userdata.tfaenablekey,
                                encoding: "base32",
                                token: tfa,
                                window: 1,
                              });
                            } else {
                              var verified = true;
                            }

                            if (userdata.withdrawOtp == req.body.withdrawOtp) {
                              if (verified == true) {
                                console.log("currency_id", currency_id);
                                console.log("userbalance", userId);
                                common.getbalance(
                                  userId,
                                  currency_id,
                                  function (userbalance) {
                                    console.log("userbalance", userbalance);
                                    console.log("amount", amount);
                                    if (+amount <= userbalance.amount) {
                                      if (
                                        amount <= currencydata.maxWithdrawLimit
                                      ) {
                                        if (
                                          amount >=
                                          currencydata.minWithdrawLimit
                                        ) {
                                          var deduct_balance =
                                            userbalance.amount - amount;
                                          var currnt_balance =
                                            userbalance.amount;
                                          if (deduct_balance >= 0) {
                                            var date = new Date();
                                            var fee_per =
                                              currencydata.withdrawFee;
                                            var fees = (amount * fee_per) / 100;
                                            var receiveamount = amount - fees;
                                            var obj = {
                                              user_id: userId,
                                              user_name: userdata.username,
                                              email: common.decrypt(
                                                userdata.email
                                              ),
                                              currency_id: currency_id,
                                              currency_symbol:
                                                currencydata.currencySymbol,
                                              amount: parseFloat(
                                                amount
                                              ).toFixed(8),
                                              receiveamount: parseFloat(
                                                receiveamount
                                              ).toFixed(8),
                                              withdraw_address: withdraw_address,
                                              fees: parseFloat(fees).toFixed(8),
                                              type: 0,
                                              withdraw_type: 0,
                                              status: 1,
                                              created_at: new Date(),
                                              updated_at: new Date(),
                                              expireTime: new Date(
                                                date.getTime() + 15 * 60000
                                              ),
                                              network:
                                                currencydata.currencyType == "2"
                                                  ? req.body.network
                                                  : "",
                                            };
                                            withdrawDB.create(obj, function (
                                              err,
                                              response
                                            ) {
                                              common.getUserBalance(
                                                response.user_id,
                                                response.currency_id,
                                                function (balance) {
                                                  if (balance != null) {
                                                    var Balance =
                                                      balance.totalBalance -
                                                      response.amount;
                                                    if (
                                                      currencydata.currencyType ==
                                                      "2"
                                                    ) {
                                                      common.updateUserBalance(
                                                        response.user_id,
                                                        response.currency_id,
                                                        +Balance,
                                                        "total",
                                                        function (balance) { }
                                                      );
                                                      // return res.json({
                                                      //   status: true,
                                                      //   message:
                                                      //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                                      //   currency:
                                                      //     response.currency_symbol,
                                                      // });

                                                      common.withdraw_approve(response, 'admin', function (resdatas) {
                                                        console.log("withdraw confirm resdatas====", resdatas)
                                                        if (resdatas.status) {
                                                          mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                            var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                            mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                              res.json({ status: true, message: 'Withdraw processed successfully' });
                                                            });
                                                          });
                                                        }
                                                        else {
                                                          res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                                        }
                                                      });
                                                    } else {
                                                      common.updateUserBalance(
                                                        response.user_id,
                                                        response.currency_id,
                                                        +Balance,
                                                        "total",
                                                        function (balance) { }
                                                      );
                                                      // console.log(
                                                      //   "calll 333====",
                                                      //   balance
                                                      // );
                                                      // return res.json({
                                                      //   status: true,
                                                      //   message:
                                                      //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                                      //   currency:
                                                      //     response.currency_symbol,
                                                      // });

                                                      common.withdraw_approve(response, 'admin', function (resdatas) {
                                                        console.log("withdraw confirm resdatas====", resdatas)
                                                        if (resdatas.status) {
                                                          mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                            var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                            mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                              res.json({ status: true, message: 'Withdraw processed successfully' });
                                                            });
                                                          });
                                                        }
                                                        else {
                                                          res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                                        }
                                                      });
                                                    }
                                                  } else {
                                                    return res.json({
                                                      status: false,
                                                      message:
                                                        "Something went wrong, Please try again later",
                                                    });
                                                  }
                                                }
                                              );
                                            });
                                          } else {
                                            res.json({
                                              status: false,
                                              message: "Insufficient balance",
                                              currency: currency_symbol,
                                            });
                                          }
                                        } else {
                                          res.json({
                                            status: false,
                                            message:
                                              "Minimum withdraw limit is " +
                                              currencydata.minWithdrawLimit.toFixed(
                                                8
                                              ),
                                            currency: currency_symbol,
                                          });
                                        }
                                      } else {
                                        res.json({
                                          status: false,
                                          message:
                                            "Maximum withdraw limit is " +
                                            currencydata.maxWithdrawLimit.toFixed(
                                              8
                                            ),
                                          currency: currency_symbol,
                                        });
                                      }
                                    } else {
                                      res.json({
                                        status: false,
                                        message: "Insufficient balance",
                                        currency: currency_symbol,
                                      });
                                    }
                                  }
                                );
                              } else {
                                return res.json({
                                  status: false,
                                  message: "Please enter valid tfa code",
                                  currency: currency_symbol,
                                });
                              }
                            } else {
                              return res.json({
                                status: false,
                                message: "Please enter valid OTP",
                                currency: currency_symbol,
                              });
                            }
                          }
                        } else {
                          return res.json({
                            status: false,
                            message: "Invalid user",
                            currency: currency_symbol,
                          });
                        }
                      });
                  } else {
                    return res.json({
                      status: false,
                      message: "Invalid address",
                      currency: currency_symbol,
                    });
                  }
                }
              } else {
                return res.json({
                  status: false,
                  message: "Currency not exist",
                  currency: currency_symbol,
                });
              }
            });
          });
      } else {
        return res.json({
          status: false,
          message: "Please enter valid withdraw amount",
          currency: currency_symbol,
        });
      }
    } else {
      return res.json({
        status: false,
        message: "Please enter all required field values",
        currency: currency_symbol,
      });
    }
  } catch (err) {
    console.log(err, "-0=0-=0-=-");
    return res.json({ status: false, message: "Internal server" });
  }
});

// router.post('/withdraw_user_action', common.tokenmiddleware, (req, res) => {
//     try {
//         var id = req.body.withdraw_id;
//         let userId = req.userId;
//         var resp = id.toString().replace(/---/g, '+').replace(/--/g, '/').replace(/----/g, '=');
//         console.log("resd", resp)

//         var action = common.decrypt(resp)

//         if (action.split('==')[1]) {
//             var withdraw_id = action.split('==')[0];
//             withdrawDB.findOne({ _id: withdraw_id, user_id: ObjectId(userId) }, function (err, with_res) {
//                 if (with_res && !err) {
//                     if (with_res.status == 0) {
//                         var dateNow = new Date();
//                         if (with_res.expireTime <= dateNow) {
//                             withdrawDB.updateOne({ _id: withdraw_id }, { $set: { 'status': 3 } }, function (err, with_res1) {
//                                 if (with_res1.ok == 1) {
//                                     withdrawDB.findOne({ _id: withdraw_id }, function (err, with_data) {
//                                         return res.json({ status: false, message: 'Withdraw link was expired', currency: with_data.currency_symbol });
//                                     });
//                                 }
//                                 else {
//                                     return res.json({ status: false, message: 'Invalid link' })
//                                 }
//                             })
//                         }
//                         if (action.split('==')[1] == 'confirm') {
//                             console.log("call here===");
//                             // if(with_res.withdraw_type == 1)
//                             // {
//                                 withdrawDB.updateOne({ _id: withdraw_id }, { $set: { 'status': 1 } }, function (err, with_res1) {
//                                     console.log("with_res1====",with_res1)
//                                 if (with_res1.ok == 1) {
//                                     console.log("calll 111====")
//                                     withdrawDB.findOne({ _id: withdraw_id }, function (err1, with_data) {
//                                         console.log("calll 222====")
//                                         if(!err1 && with_data)
//                                         {
//                                             common.getUserBalance(with_data.user_id, with_data.currency_id, function (balance) {
//                                                 if(balance != null)
//                                                 {
//                                                     var Balance = balance.totalBalance - with_data.amount;
//                                                     var Hold = balance.balanceHoldTotal + +with_data.amount;
//                                                    // common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, +Hold);
//                                                     common.updateUserBalance(with_data.user_id, with_data.currency_id, +Balance, 'total', function (balance) {});
//                                                         console.log("calll 333====",balance)
//                                                         return res.json({ status: true, message: 'Your withdrawal request is submitted successfully, Admin will approve your withdraw request', currency: with_data.currency_symbol })

//                                                 }
//                                                 else
//                                                 {
//                                                     return res.json({ status: false, message: 'Invalid link 9' })
//                                                 }

//                                             })
//                                         }
//                                         else
//                                         {
//                                             return res.json({ status: false, message: 'Invalid link 8' })
//                                         }

//                                     });
//                                     }
//                                     else {
//                                         return res.json({ status: false, message: 'Invalid link 1' })
//                                     }
//                                 })
//                             //}
//                             // else
//                             // {
//                             //     withdrawDB.updateOne({ _id: withdraw_id }, { $set: { 'status': 1 } }, function (err, with_res1) {
//                             //         if (with_res1.ok == 1) {
//                             //             console.log("call 2222===");
//                             //             withdrawDB.findOne({ _id: withdraw_id }, function (err, with_data) {
//                             //                 common.getUserBalance(with_data.user_id, with_data.currency_id, function (balance) {
//                             //                     var Balance = balance.totalBalance - with_data.amount;
//                             //                     var Hold = balance.balanceHoldTotal + +with_data.amount;
//                             //                     common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, +Hold);
//                             //                     common.updateUserBalance(with_data.user_id, with_data.currency_id, +Balance, 'total', function (balance) {
//                             //                         common.withdraw(with_data, 'admin', function (resdatas) {
//                             //                             console.log("call 333===",resdatas);
//                             //                             if (resdatas.status) {
//                             //                                 var Hold_release = balance.balanceHoldTotal - +with_data.amount;
//                             //                                 common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, Hold_release);
//                             //                                 mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
//                             //                                     var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, req.body.uname).replace(/###MESSAGE###/g, 'Withdraw on ' + with_data.amount + ' ' + req.body.currency_symbol + ' was completed');
//                             //                                     mail.sendMail({ to: req.body.email, subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
//                             //                                         res.json({ status: true, message: 'Withdraw approved successfully' });
//                             //                                     });
//                             //                                 });
//                             //                             }
//                             //                             else {
//                             //                                 res.json({ status: false, message: 'Insufficient balance from admin' });
//                             //                             }
//                             //                         });
//                             //                     })
//                             //                 })
//                             //             });
//                             //         }
//                             //         else {
//                             //             return res.json({ status: false, message: 'Invalid link' })
//                             //         }
//                             //     })
//                             // }

//                         }
//                         else if (action.split('==')[1] == 'cancel') {
//                             withdrawDB.updateOne({ _id: withdraw_id }, { $set: { 'status': 3 } }, function (err, with_res1) {
//                                 if (with_res1.ok == 1) {
//                                     withdrawDB.findOne({ _id: withdraw_id }, function (err, with_data) {
//                                         return res.json({ status: true, message: 'Withdraw request cancelled successfully', currency: with_data.currency_symbol })
//                                     });
//                                 }
//                                 else {
//                                     return res.json({ status: false, message: 'Invalid link 2' })
//                                 }
//                             });
//                         }
//                         else {
//                             return res.json({ status: false, message: 'Invalid link 3' })
//                         }
//                     }
//                     else if (with_res.status == 3) {
//                         return res.json({ status: false, message: 'The withdraw request is already cancelled', currency: with_res.currency_symbol });
//                     }
//                     else if (with_res.status == 1) {
//                         return res.json({ status: false, message: 'The withdraw request is already confirmed', currency: with_res.currency_symbol });
//                     }
//                     else {
//                         return res.json({ status: false, message: 'The withdraw request is already submitted / cancelled', currency: with_res.currency_symbol });
//                     }
//                 }
//                 else {
//                     return res.json({ status: false, message: 'Invalid link 4' })
//                 }
//             })
//         }
//         else {
//             return res.json({ status: false, message: 'Invalid link 5' })
//         }
//     }
//     catch (e) {
//         console.log('====================withdraw user action catch====================');
//         console.log(e);
//         return res.json({ status: false, message: 'Something went wrong' });
//     }
// });

router.post(
  "/withdraw_user_action",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var id = req.body.withdraw_id;
      let userId = req.userId;
      var resp = id
        .toString()
        .replace(/---/g, "+")
        .replace(/--/g, "/")
        .replace(/----/g, "=");
      console.log("resd", resp);

      var action = common.decrypt(resp);

      if (action.split("==")[1]) {
        var withdraw_id = action.split("==")[0];
        var with_res = await withdrawDB.findOne({
          _id: withdraw_id,
          user_id: ObjectId(userId),
        });
        if (with_res.status == 0) {
          var dateNow = new Date();
          if (with_res.expireTime <= dateNow) {
            var with_res1 = await withdrawDB.updateOne(
              { _id: withdraw_id },
              { $set: { status: 3 } }
            );
            if (with_res1.ok == 1) {
              return res.json({
                status: false,
                message: "Withdraw link was expired",
              });
            } else {
              return res.json({ status: false, message: "Invalid link" });
            }
          }
          if (action.split("==")[1] == "confirm") {
            console.log("call here===");
            // if(with_res.withdraw_type == 1)
            // {
            var with_res1 = await withdrawDB.updateOne(
              { _id: withdraw_id },
              { $set: { status: 1 } }
            );
            console.log("with_res1====", with_res1);
            if (with_res1) {
              console.log("calll 111====");
              var with_data = await withdrawDB.findOne({ _id: withdraw_id });
              console.log("calll 222====");
              if (with_data) {
                common.getUserBalance(
                  with_data.user_id,
                  with_data.currency_id,
                  function (balance) {
                    if (balance != null) {
                      var Balance = balance.totalBalance - with_data.amount;
                      var Hold = balance.balanceHoldTotal + +with_data.amount;
                      // common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, +Hold);
                      common.updateUserBalance(
                        with_data.user_id,
                        with_data.currency_id,
                        +Balance,
                        "total",
                        function (balance) {
                          console.log("calll 333====", balance);
                          return res.json({
                            status: true,
                            message:
                              "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                            currency: with_data.currency_symbol,
                          });
                        }
                      );
                    } else {
                      return res.json({
                        status: false,
                        message: "Invalid link",
                      });
                    }
                  }
                );
              } else {
                return res.json({ status: false, message: "Invalid link" });
              }
            } else {
              return res.json({ status: false, message: "Invalid link" });
            }
            //}
            // else
            // {
            //     withdrawDB.updateOne({ _id: withdraw_id }, { $set: { 'status': 1 } }, function (err, with_res1) {
            //         if (with_res1.ok == 1) {
            //             console.log("call 2222===");
            //             withdrawDB.findOne({ _id: withdraw_id }, function (err, with_data) {
            //                 common.getUserBalance(with_data.user_id, with_data.currency_id, function (balance) {
            //                     var Balance = balance.totalBalance - with_data.amount;
            //                     var Hold = balance.balanceHoldTotal + +with_data.amount;
            //                     common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, +Hold);
            //                     common.updateUserBalance(with_data.user_id, with_data.currency_id, +Balance, 'total', function (balance) {
            //                         common.withdraw(with_data, 'admin', function (resdatas) {
            //                             console.log("call 333===",resdatas);
            //                             if (resdatas.status) {
            //                                 var Hold_release = balance.balanceHoldTotal - +with_data.amount;
            //                                 common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, Hold_release);
            //                                 mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
            //                                     var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, req.body.uname).replace(/###MESSAGE###/g, 'Withdraw on ' + with_data.amount + ' ' + req.body.currency_symbol + ' was completed');
            //                                     mail.sendMail({ to: req.body.email, subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
            //                                         res.json({ status: true, message: 'Withdraw approved successfully' });
            //                                     });
            //                                 });
            //                             }
            //                             else {
            //                                 res.json({ status: false, message: 'Insufficient balance from admin' });
            //                             }
            //                         });
            //                     })
            //                 })
            //             });
            //         }
            //         else {
            //             return res.json({ status: false, message: 'Invalid link' })
            //         }
            //     })
            // }
          } else if (action.split("==")[1] == "cancel") {
            var with_res1 = await withdrawDB.updateOne(
              { _id: withdraw_id },
              { $set: { status: 3 } }
            );
            if (with_res1.ok == 1) {
              return res.json({
                status: true,
                message: "Withdraw request cancelled successfully",
              });
            } else {
              return res.json({ status: false, message: "Invalid link" });
            }
          } else {
            return res.json({ status: false, message: "Invalid link" });
          }
        } else if (with_res.status == 3) {
          return res.json({
            status: false,
            message: "The withdraw request is already cancelled",
            currency: with_res.currency_symbol,
          });
        } else if (with_res.status == 1) {
          return res.json({
            status: false,
            message: "The withdraw request is already confirmed",
            currency: with_res.currency_symbol,
          });
        } else {
          return res.json({
            status: false,
            message: "The withdraw request is already submitted / cancelled",
            currency: with_res.currency_symbol,
          });
        }
      } else {
        return res.json({ status: false, message: "Invalid link" });
      }
    } catch (e) {
      console.log(
        "====================withdraw user action catch===================="
      );
      console.log(e);
      return res.json({ status: false, message: "Something went wrong" });
    }
  }
);

router.post("/withdraw_history", common.tokenmiddleware, (req, res) => {
  try {
    console.log("req.body====", req.body);
    if (req.body.FilPerpage != "" || req.body.FilPage != "") {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      var skippage = perPage * page - perPage;
      withdrawDB
        .find({ user_id: req.userId })
        .skip(skippage)
        .limit(perPage)
        .sort({ _id: -1 })
        .exec(function (err, data) {
          withdrawDB
            .find({ user_id: req.userId })
            .countDocuments()
            .exec(function (err1, count) {
              if (err) {
                return res.json({
                  status: false,
                  message: "Something went wrong, Please try again later",
                });
              } else {
                var history = [];
                for (var i = 0; i < data.length; i++) {
                  var status = "";
                  if (data[i].status == 0 || data[i].status == 1) {
                    status = "Pending";
                  } else if (data[i].status == 3 || data[i].status == 4) {
                    status = "Cancelled";
                  } else if (data[i].status == 2) {
                    status = "Completed";
                  }
                  var txn_id = "";
                  if (data[i].txn_id != "") {
                    txn_id = data[i].txn_id;
                  } else {
                    txn_id = "--------";
                  }
                  var obj = {
                    amount: data[i].amount,
                    fees: data[i].fees,
                    currency: data[i].currency_symbol,
                    withdraw_address: data[i].withdraw_address,
                    txn_id: txn_id,
                    status: status,
                    created_at: data[i].created_at,
                  };
                  history.push(obj);
                }
                var returnJson = {
                  status: true,
                  result: history,
                  current: page,
                  pages: Math.ceil(count / perPage),
                };
                res.json(returnJson);
              }
            });
        });
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Please enter pagination fields" });
    }
  } catch (error) {
    console.log("withdraw catch===", error);
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/get_all_user_withdraw", common.tokenmiddleware, (req, res) => {
  try {
    var perPage = Number(req.body.pageSize ? req.body.pageSize : 0);
    var page = Number(req.body.currentPage ? req.body.currentPage : 0);
    page = parseInt(page) + parseInt(1);
    if (
      typeof perPage !== "undefined" &&
      perPage !== "" &&
      perPage > 0 &&
      typeof page !== "undefined" &&
      page !== "" &&
      page > 0
    ) {
      var skippage = perPage * page - perPage;
      withdrawDB
        .aggregate([
          {
            $match: {
              $and: [
                { type: 0 },
                { withdraw_type: 0 },
                { status: { $in: [1, 2, 3, 4] } },
              ],
            },
          },
          {
            $lookup: {
              from: "currency",
              localField: "currency_id",
              foreignField: "_id",
              as: "currency_detail",
            },
          },
          { $unwind: "$currency_detail" },
          {
            $project: {
              currency_symbol: 1,
              fromaddress: 1,
              withdraw_address: 1,
              amount: 1,
              receiveamount: 1,
              fees: 1,
              withdraw_type: 1,
              status: 1,
              txn_id: 1,
              created_at: 1,
              user_name: 1,
              email: 1,
              currency_name: "$currency_detail.currencyName",
            },
          },

          {
            $sort: { _id: -1 },
          },
        ])
        .skip(skippage)
        .limit(perPage)
        .exec(function (err, withdrawdata) {
          //console.log("withdraw data===",withdrawdata);
          if (!err || withdrawdata) {
            withdrawDB
              .find({
                $and: [
                  { type: 0 },
                  { withdraw_type: 0 },
                  { status: { $in: [1, 2, 3, 4] } },
                ],
              })
              .countDocuments()
              .exec(function (err, count) {
                var returnjson = {
                  status: true,
                  data: withdrawdata,
                  count: count,
                  pages: Math.ceil(count / perPage),
                };
                return res.json(returnjson);
              });
          } else {
            return res.json({
              status: false,
              data: [],
              message: "Something went wrong",
            });
          }
        });
    } else {
      return res.json({ status: false, Message: "Invalid pagination request" });
    }
  } catch (e) {
    console.log(
      "====================get_all_pending_withdraw catch===================="
    );
    console.log(e);
    return res.json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.post("/get_all_fiat_withdraw", common.tokenmiddleware, (req, res) => {
  try {
    var perPage = Number(req.body.pageSize ? req.body.pageSize : 0);
    var page = Number(req.body.currentPage ? req.body.currentPage : 0);
    page = parseInt(page) + parseInt(1);
    if (
      typeof perPage !== "undefined" &&
      perPage !== "" &&
      perPage > 0 &&
      typeof page !== "undefined" &&
      page !== "" &&
      page > 0
    ) {
      var skippage = perPage * page - perPage;
      withdrawDB
        .aggregate([
          {
            $match: {
              $and: [
                { type: 0 },
                { withdraw_type: 1 },
                { status: { $in: [1, 2, 3, 4] } },
              ],
            },
          },
          {
            $lookup: {
              from: "currency",
              localField: "currency_id",
              foreignField: "_id",
              as: "currency_detail",
            },
          },
          { $unwind: "$currency_detail" },
          {
            $project: {
              currency_symbol: 1,
              fromaddress: 1,
              withdraw_address: 1,
              amount: 1,
              receiveamount: 1,
              fees: 1,
              withdraw_type: 1,
              status: 1,
              txn_id: 1,
              created_at: 1,
              user_name: 1,
              email: 1,
              currency_name: "$currency_detail.currencyName",
            },
          },

          {
            $sort: { _id: -1 },
          },
        ])
        .skip(skippage)
        .limit(perPage)
        .exec(function (err, withdrawdata) {
          //console.log("withdraw data===",withdrawdata);
          if (!err || withdrawdata) {
            withdrawDB
              .find({
                $and: [
                  { type: 0 },
                  { withdraw_type: 1 },
                  { status: { $in: [1, 2, 3, 4] } },
                ],
              })
              .countDocuments()
              .exec(function (err1, count) {
                var returnjson = {
                  status: true,
                  count: count,
                  pages: Math.ceil(count / perPage),
                  data: withdrawdata,
                };
                return res.json(returnjson);
              });
          } else {
            return res.json({
              status: false,
              data: [],
              message: "Something went wrong",
            });
          }
        });
    } else {
      return res.json({ status: false, Message: "Invalid pagination request" });
    }
  } catch (e) {
    console.log(
      "====================get_all_pending_withdraw catch===================="
    );
    console.log(e);
    return res.json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.get("/get_all_user_withdraw", common.tokenmiddleware, (req, res) => {
  try {
    try {
      withdrawDB
        .aggregate([
          {
            $match: {
              $and: [
                { type: 0 },
                { withdraw_type: 0 },
                { status: { $in: [1, 2, 3, 4] } },
              ],
            },
          },
          {
            $lookup: {
              from: "currency",
              localField: "currency_id",
              foreignField: "_id",
              as: "currency_detail",
            },
          },
          { $unwind: "$currency_detail" },
          {
            $project: {
              currency_symbol: 1,
              fromaddress: 1,
              withdraw_address: 1,
              amount: 1,
              receiveamount: 1,
              fees: 1,
              withdraw_type: 1,
              status: 1,
              txn_id: 1,
              created_at: 1,
              user_name: 1,
              email: 1,
              currency_name: "$currency_detail.currencyName",
            },
          },

          {
            $sort: { _id: -1 },
          },
        ])
        .exec(function (err, withdrawdata) {
          //console.log("withdraw data===",withdrawdata);
          if (!err || withdrawdata) {
            var data = [];
            for (let i1 = 0; i1 < withdrawdata.length; i1++) {
              const element = withdrawdata[i1];
              var obj = {
                _id: element._id,
                user_name: element.user_name,
                email: element.email,
                fromaddress: element.fromaddress,
                withdraw_address: element.withdraw_address,
                amount: element.amount,
                receiveamount: element.receiveamount,
                fees: element.fees.toFixed(4),
                withdraw_type: element.withdraw_type,
                status: element.status,
                txn_id: element.txn_id,
                currency_symbol: element.currency_symbol,
                created_at: element.created_at,
                currency_name: element.currency_name,
              };
              data.push(obj);
            }
            return res.json({ status: true, data: data });
          } else {
            return res.json({
              status: false,
              data: [],
              message: "Something went wrong",
            });
          }
        });
    } catch (e) {
      console.log(
        "====================get_all_pending_withdraw catch===================="
      );
      console.log(e);
      return res.json({
        status: false,
        data: [],
        message: "Something went wrong",
      });
    }
  } catch (error) {
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.get("/get_all_fiat_withdraw", common.tokenmiddleware, (req, res) => {
  try {
    try {
      withdrawDB
        .aggregate([
          {
            $match: {
              $and: [
                { type: 0 },
                { withdraw_type: 1 },
                { status: { $in: [1, 2, 3, 4] } },
              ],
            },
          },
          {
            $lookup: {
              from: "currency",
              localField: "currency_id",
              foreignField: "_id",
              as: "currency_detail",
            },
          },
          { $unwind: "$currency_detail" },
          {
            $project: {
              currency_symbol: 1,
              fromaddress: 1,
              withdraw_address: 1,
              amount: 1,
              receiveamount: 1,
              fees: 1,
              withdraw_type: 1,
              status: 1,
              txn_id: 1,
              created_at: 1,
              user_name: 1,
              email: 1,
              currency_name: "$currency_detail.currencyName",
            },
          },

          {
            $sort: { _id: -1 },
          },
        ])
        .exec(function (err, withdrawdata) {
          //console.log("withdraw data===",withdrawdata);
          if (!err || withdrawdata) {
            return res.json({ status: true, data: withdrawdata });
          } else {
            return res.json({
              status: false,
              data: [],
              message: "Something went wrong",
            });
          }
        });
    } catch (e) {
      console.log(
        "====================get_all_pending_withdraw catch===================="
      );
      console.log(e);
      return res.json({
        status: false,
        data: [],
        message: "Something went wrong",
      });
    }
  } catch (error) {
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/get_one_withdraw", common.tokenmiddleware, (req, res) => {
  var withdraw_id = req.body._id;
  withdrawDB.findOne({ _id: ObjectId(withdraw_id) }).exec(function (err, data) {
    if (err) {
      return res.json({
        status: false,
        Message: "Something went wrong, Please try again later",
      });
    } else {
      return res.json({ status: true, Message: data });
    }
  });
});

router.post(
  "/get_fiat_one_withdraw",
  common.tokenmiddleware,
  async (req, res) => {
    var withdraw_id = req.body._id;
    var withdraw_data = await withdrawDB.findOne({
      _id: ObjectId(withdraw_id),
    });
    console.log(withdraw_data.user_id);
    if (withdraw_data != null) {
      var bank_data = await userBank.findOne({
        userid: ObjectId(withdraw_data.user_id),
        Status: 1,
      });
      console.log(bank_data);

      return res.json({
        status: true,
        Message: withdraw_data,
        bank_data: bank_data,
      });
    } else {
      return res.json({
        status: false,
        Message: "Something went wrong, Please try again later",
      });
    }
  }
);

router.post("/send_otp", common.tokenmiddleware, (req, res) => {
  try {
    var user_id = req.userId;
    console.log("user_id====", user_id);
    withdrawDB.findOne({ _id: req.body._id }).exec(function (err, withData) {
      if (!withData) {
        return res.json({ status: false, message: "Withdraw not found" });
      } else {
        adminDB
          .findOne({ _id: new mongoose.Types.ObjectId(user_id) })
          .exec(function (resErr, resData) {
            if (!resData) {
              return res.json({ status: false, message: "User not found" });
            } else {
              let otp = common.generate_otp();
              withdrawDB
                .updateOne({ _id: req.body._id }, { $set: { withdrawOTP: otp } })
                .exec(function (upErr, upRes) {
                  mailtempDB
                    .findOne({ key: "admin_withdraw_otp" })
                    .exec(function (etemperr, etempdata) {
                      var etempdataDynamic = etempdata.body
                        .replace(/###OTP###/g, otp)
                        .replace(/###USERNAME###/g, resData.userName);

                      mail.sendMail(
                        {
                          from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
                          to: process.env.ADMIN_EMAIL,
                          subject: etempdata.Subject,
                          html: etempdataDynamic,
                        },
                        function (mailRes) {
                          console.log("mail response===", mailRes);
                          res.json({
                            status: true,
                            message:
                              "Withdraw request OTP has been sent to your mail",
                          });
                        }
                      );
                    });
                });
            }
          });
      }
    });
  } catch (e) {
    // console.log("====================send otp catch====================");
    console.log(e);
    return res.json({
      status: false,
      data: {},
      message: "Something went wrong",
    });
  }
});

router.post("/admin_withdraw_approve", async (req, res) => {
  try {
    if (req.body.status == "confirm") {
      var findUser = await usersDB
        .findOne({ email: common.encrypt(req.body.email) })
        .exec();
      withdrawDB.findOne(
        { _id: req.body._id, withdrawOTP: req.body.otp },
        function (err, with_data) {
          if (with_data) {
            var withdraw_details = with_data;
            if (withdraw_details.withdraw_type == 0) {
              console.log(
                "withdraw_details.withdraw_type ====",
                withdraw_details.withdraw_type
              );
              common.withdraw_approve(withdraw_details, "admin", function (
                resdatas
              ) {
                console.log("withdraw confirm resdatas====", resdatas);
                if (resdatas.status) {
                  console.log("call here===");
                  common.getbalance(
                    with_data.user_id,
                    with_data.currency_id,
                    function (balance) {
                      var Hold = +balance.hold - +with_data.amount;
                      //common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, Hold);
                      mailtempDB
                        .findOne({ key: "confirm_transaction" })
                        .exec(function (etemperr, etempdata) {
                          var etempdataDynamic = etempdata.body
                            .replace(/###USERNAME###/g, req.body.uname)
                            .replace(
                              /###MESSAGE###/g,
                              "Withdraw on " +
                              with_data.amount +
                              " " +
                              req.body.currency_symbol +
                              " was completed"
                            );
                          mail.sendMail(
                            {
                              from: {
                                name: process.env.FROM_NAME,
                                address: process.env.FROM_EMAIL,
                              },
                              to: req.body.email,
                              subject: etempdata.Subject,
                              html: etempdataDynamic,
                            },
                            function (mailRes) {
                              console.log("mail response");
                              if (mailRes == null) {
                                var obj = {
                                  to_user_id: ObjectId(findUser._id),
                                  to_user_name: req.body.uname,
                                  status: 0,
                                  message: "Withdraw approved successfully",
                                  link: "/notificationHistory",
                                };
                                notifydb.create(obj, function (
                                  err,
                                  response
                                ) { });
                                console.log("call notify");
                                res.json({
                                  status: true,
                                  message: "Withdraw approved successfully",
                                });
                              }
                            }
                          );
                        });
                    }
                  );
                } else {
                  res.json({
                    status: false,
                    message: "Insufficient balance from admin",
                  });
                }
              });
            } else {
              withdrawDB.updateOne(
                { _id: withdraw_details._id },
                {
                  $set: {
                    txn_id: Math.floor(Math.random() * 100000000 + 1),
                    status: 2,
                  },
                },
                async function (err, with_res1) {
                  if (with_res1) {
                    common.getbalance(
                      withdraw_details.user_id,
                      withdraw_details.currency_id,
                      function (balance) {
                        var Hold = +balance.hold - +withdraw_details.amount;
                        //common.updatewithdrawHoldAmount(withdraw_details.user_id, withdraw_details.currency_id, Hold);
                        return res.status(200).json({
                          status: true,
                          message: "Withdraw confirmed successfully",
                          currency: with_data.currency_symbol,
                        });
                      }
                    );
                  } else {
                    return res.status(200).json({
                      status: false,
                      message: "Something went wrong, Please try again",
                    });
                  }
                }
              );
            }
          } else {
            res.json({ status: false, message: "Invalid OTP" });
          }
        }
      );
    } else if (req.body.status == "cancel") {
      withdrawDB.updateOne(
        { _id: req.body._id },
        {
          $set: { status: 4, reason: req.body.reason, updated_at: new Date() },
        },
        function (err, with_res1) {
          if (with_res1.ok == 1) {
            withdrawDB.findOne({ _id: req.body._id }, function (err, with_data) {
              common.getbalance(
                with_data.user_id,
                with_data.currency_id,
                function (balance) {
                  var Balance = +balance.amount + +with_data.amount;
                  var Hold = +balance.hold - +with_data.amount;
                  // common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, Hold);
                  common.updateUserBalance(
                    with_data.user_id,
                    with_data.currency_id,
                    Balance,
                    "total",
                    function (updatebalance) {
                      mailtempDB
                        .findOne({ key: "cancel_transaction" })
                        .exec(function (etemperr, etempdata) {
                          var etempdataDynamic = etempdata.body
                            .replace(/###USERNAME###/g, req.body.uname)
                            .replace(
                              /###TYPE###/g,
                              "Withdraw on " +
                              req.body.amount +
                              " " +
                              with_data.currency_symbol
                            )
                            .replace(/###REASON###/g, req.body.reason);
                          mail.sendMail(
                            {
                              from: {
                                name: process.env.FROM_NAME,
                                address: process.env.FROM_EMAIL,
                              },
                              to: req.body.email,
                              subject: etempdata.Subject,
                              html: etempdataDynamic,
                            },
                            function (mailRes) {
                              var msg =
                                "Withdraw on " +
                                with_data.amount +
                                " " +
                                with_data.currency_symbol +
                                " is cancelled by admin";
                              res.json({
                                status: true,
                                message:
                                  "Withdraw request cancelled successfully",
                              });
                            }
                          );
                        });
                    }
                  );
                }
              );
            });
          } else {
            res.json({ status: false, message: "Not valid" });
          }
        }
      );
    } else {
      res.json({ status: false, message: "Not valid" });
    }
  } catch (e) {
    console.log(
      "====================admin_withdraw_approve catch===================="
    );
    console.log(e);
    common.create_log(e, function (resp) { });
    return res.json({ status: false, Message: "Something went wrong" });
  }
});

// router.post('/get_user_deposit', common.tokenmiddleware, (req, res) => {
//     try {
//         if (req.body.FilPerpage != "" || req.body.FilPage != "") {
//             var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
//             var page = Number(req.body.FilPage ? req.body.FilPage : 0);
//             var skippage = (perPage * page) - perPage;
//             depositDB.aggregate(
//                 [
//                     {
//                         '$match': {
//                             'userId': mongoose.mongo.ObjectId(req.userId.toString())
//                         }
//                     }, {
//                         '$lookup': {
//                             'from': 'currency',
//                             'localField': 'currency',
//                             'foreignField': '_id',
//                             'as': 'currency'
//                         }
//                     }, {
//                         '$unwind': {
//                             'path': '$currency'
//                         }
//                     }, {
//                         '$project': {
//                             'currencyName': '$currency.currencyName',
//                             'currencySymbol': '$currency.currencySymbol',
//                             'amount': '$depamt',
//                             'txnid': '$txnid',
//                             'hash': '$txnid',
//                             'status': '$status',
//                             'address': '$depto',
//                             'depType': '$depType',
//                             'date': '$createddate'
//                         }
//                     },
//                     { '$sort': { '_id': -1 } }
//                 ]
//             ).skip(skippage).limit(perPage).sort({_id:-1}).exec(function (err, deposits) {
//                 depositDB.find({ "userId": req.userId }).countDocuments().exec(function (err1, count) {
//                     if (deposits && !err) {
//                         var returnJson = {
//                             status: true,
//                             result: deposits,
//                             current: page,
//                             pages: Math.ceil(count / perPage)
//                         }
//                         res.json(returnJson);
//                     }
//                     else {
//                         return res.status(500).json({ status: false, data: [], message: 'Something went wrong' });
//                     }
//                 })
//             })
//         }
//     }
//     catch (e) {
//         console.log('====================get_user_deposit catch====================');
//         console.log(e);
//         return res.json({ status: false, data: [], message: 'Something went wrong' });
//     }
// });

router.post("/get_user_deposit", common.tokenmiddleware, async (req, res) => {
  try {
    if (req.body.FilPerpage != "" || req.body.FilPage != "") {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      var skippage = perPage * page - perPage;
      // var crypto_deposit = await depositDB.find({ userId: mongoose.mongo.ObjectId(req.userId.toString()) }).populate('currency', 'currencyName currencySymbol').skip(skippage).limit(perPage).sort({ _id: -1 });
      // var crypto_deposit_count = await depositDB.find({ "userId": req.userId }).countDocuments();
      // var fiat_deposit = await manualDepDB.find({ userId: req.userId }).populate('currency_id', 'currencyName currencySymbol').skip(skippage).limit(perPage).sort({ _id: -1 });
      // var fiat_deposit_count = await manualDepDB.find({ userId: req.userId }).countDocuments();
      var crypto_deposit = await depositDB
        .find({ userId: mongoose.mongo.ObjectId(req.userId.toString()) })
        .populate("currency", "currencyName currencySymbol")
        .skip(skippage)
        .limit(perPage)
        .sort({ _id: -1 });
      crypto_deposit = getUniqueListBy(crypto_deposit, "txnid");
      var crypto_count = await depositDB.find({ userId: req.userId });
      crypto_count = getUniqueListBy(crypto_count, "txnid");
      var crypto_deposit_count = crypto_count.length;
      var fiat_deposit = await manualDepDB
        .find({ userId: req.userId })
        .populate("currency_id", "currencyName currencySymbol")
        .skip(skippage)
        .limit(perPage)
        .sort({ _id: -1 });
      var fiat_deposit_count = await manualDepDB
        .find({ userId: req.userId })
        .countDocuments();

      var deposits = [];
      var fiat_deposits = [];
      if (crypto_deposit.length > 0) {
        for (var i = 0; i < crypto_deposit.length; i++) {
          var obj = {
            currencyName: crypto_deposit[i].currency.currencyName,
            currencySymbol: crypto_deposit[i].currency.currencySymbol,
            amount: crypto_deposit[i].depamt,
            txnid: crypto_deposit[i].txnid,
            hash: crypto_deposit[i].txnid,
            status: crypto_deposit[i].status == 1 ? "Completed" : "Pending",
            address: crypto_deposit[i].depto,
            depType: crypto_deposit[i].depType,
            date: crypto_deposit[i].createddate,
          };
          deposits.push(obj);
        }
      }

      if (fiat_deposit.length > 0) {
        for (var i = 0; i < fiat_deposit.length; i++) {
          var dep_status = "";
          if (fiat_deposit[i].aprooveStatus == "0") {
            dep_status = "Pending";
          } else if (fiat_deposit[i].aprooveStatus == "1") {
            dep_status = "Completed";
          } else if (fiat_deposit[i].aprooveStatus == "2") {
            dep_status = "Rejected";
          }

          var obj1 = {
            currencyName: fiat_deposit[i].currency_id.currencyName,
            currencySymbol: fiat_deposit[i].currency_id.currencySymbol,
            amount: fiat_deposit[i].amount,
            txnid: fiat_deposit[i].transactionID,
            hash: fiat_deposit[i].transactionID,
            status: dep_status,
            address: "",
            depType: 1,
            date: fiat_deposit[i].createdDate,
          };
          fiat_deposits.push(obj1);
        }
      }
      var deposit_result = [...deposits, ...fiat_deposits];
      var total_count = crypto_deposit_count + fiat_deposit_count;
      console.log("total_count===", total_count);
      if (deposit_result) {
        var returnJson = {
          status: true,
          result: deposit_result,
          fiat_deposit: fiat_deposits,
          crypto_deposit: deposits,
          current: page,
          total: total_count,
          pages: Math.ceil(total_count / perPage),
          fiat_deposit_count: fiat_deposit_count,
          crypto_deposit_count: crypto_deposit_count,
        };
        res.json(returnJson);
      } else {
        return res
          .status(500)
          .json({ status: false, data: [], message: "Something went wrong" });
      }
    }
  } catch (e) {
    console.log(
      "====================get_user_deposit catch===================="
    );
    console.log(e);
    return res.json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

// router.post('/get_all_user_deposit', common.tokenmiddleware, (req, res) => {
//     try {
//         var perPage = Number(req.body.pageSize ? req.body.pageSize : 0);
//         var page = Number(req.body.currentPage ? req.body.currentPage : 0);
//         page = parseInt(page) + parseInt(1)
//         var skippage = (perPage * page) - perPage;
//         if ((typeof perPage !== 'undefined' && perPage !== '' && perPage > 0 &&
//         typeof page !== 'undefined' && page !== '' && page > 0)
//           ) {
//             depositDB.aggregate(
//                 [
//                     {
//                         '$match': {
//                             'status': 1
//                         }
//                     }, {
//                         '$lookup': {
//                             'from': 'currency',
//                             'localField': 'currency',
//                             'foreignField': '_id',
//                             'as': 'currency'
//                         }
//                     }, {
//                         '$unwind': {
//                             'path': '$currency'
//                         }
//                     },
//                     {
//                         '$lookup': {
//                             'from': 'users',
//                             'localField': 'userId',
//                             'foreignField': '_id',
//                             'as': 'user'
//                         }
//                     }, {
//                         '$unwind': {
//                             'path': '$user'
//                         }
//                     },

//                     {
//                         '$project': {
//                             'currencyName': '$currency.currencyName',
//                             'currencySymbol': '$currency.currencySymbol',
//                             'amount': '$depamt',
//                             'txnid': '$txnid',
//                             'status': '$status',
//                             'address': '$depto',
//                             'date': '$createddate',
//                             'username': '$user.username'
//                         }
//                     },
//                     { '$sort': { '_id': -1 } }
//                 ]
//             ).skip(skippage).limit(perPage).exec(function (err, deposits) {

//                 if (deposits && !err) {
//                     depositDB.find({status:1}).countDocuments().exec(function(err,count){

//                     var userdeposits = [];
//                     for(var i=0; i< deposits.length; i++)
//                     {
//                     var obj = {
//                         _id: deposits[i]._id,
//                         username: deposits[i].username,
//                         txnid: deposits[i].txnid.substring(0,15)+"...",
//                         date:deposits[i].date,
//                         currencySymbol:deposits[i].currencySymbol,
//                         amount: deposits[i].amount,
//                         status:"Completed",
//                     }
//                     userdeposits.push(obj)
//                     }
//                     userdeposits = getUniqueListBy(userdeposits, 'txnid');
//                     var returnJson = {
//                         status: true,
//                         data: userdeposits,
//                         count: count,
//                         pages: Math.ceil(count / perPage)
//                     }
//                     //console.log("returnJson",returnJson);
//                     return res.status(200).json(returnJson);
//                 })
//                 }
//                 else {
//                     return res.status(500).json({ status: false, data: [], message: 'Something went wrong' });
//                 }
//             })
//         } else {
//             return res.json({status:false,Message:'Please enter Pagination field'});
//         }
//     }
//     catch (e) {
//         console.log('====================get_user_deposit catch====================');
//         console.log(e);
//         return res.json({ status: false, data: [], message: 'Something went wrong' });
//     }
// });

router.get("/get_all_user_deposit", common.tokenmiddleware, (req, res) => {
  try {
    depositDB
      .aggregate([
        {
          $match: {
            status: 1,
          },
        },
        {
          $lookup: {
            from: "currency",
            localField: "currency",
            foreignField: "_id",
            as: "currency",
          },
        },
        {
          $unwind: {
            path: "$currency",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
          },
        },

        {
          $project: {
            currencyName: "$currency.currencyName",
            currencySymbol: "$currency.currencySymbol",
            amount: "$depamt",
            txnid: "$txnid",
            status: "$status",
            address: "$depto",
            date: "$createddate",
            username: "$user.username",
          },
        },
        { $sort: { _id: -1 } },
      ])
      .exec(function (err, deposits) {
        console.log("user deposits deposits=====", deposits);
        console.log("user deposits error=====", err);
        if (deposits && !err) {
          var userdeposits = [];
          for (var i = 0; i < deposits.length; i++) {
            var obj = {
              _id: deposits[i]._id,
              username: deposits[i].username,
              txnid: deposits[i].txnid.substring(0, 15) + "...",
              date: deposits[i].date,
              currencySymbol: deposits[i].currencySymbol,
              amount: deposits[i].amount,
              status: "Completed",
            };
            userdeposits.push(obj);
          }
          userdeposits = getUniqueListBy(userdeposits, "txnid");
          var returnJson = {
            status: true,
            data: userdeposits,
          };
          //console.log("returnJson",returnJson);
          return res.status(200).json(returnJson);
        } else {
          return res
            .status(500)
            .json({ status: false, data: [], message: "Something went wrong" });
        }
      });
  } catch (e) {
    console.log(
      "====================get_user_deposit catch===================="
    );
    console.log(e);
    return res.json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.get("/checkbalance", (req, res) => {
  try {
    var obj = {
      side: "SELL",
      symbol: "AVAXEUR",
      type: "Limit",
      price: 36.0,
      quantity: 1,
      symbol: { secondary: "EUR", primary: "AVAX" },
    };
    var obj = {
      side: "BID",
      symbol: { secondary: "EUR", primary: "AVAX" },
    };
    var result = binanceExchange.getBalance(obj);
    console.log("api call!!!!!!!!!", result);
    return res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ status: false, data: [], message: e.error.message });
  }
});

router.post("/findDeposit", common.tokenmiddleware, async (req, res) => {
  try {
    if (req.body.Details == "success") {
      var findDeposit = await manualDepDB
        .findOne({ transactionID: req.body.transactionID })
        .exec();
      var findWallet = await userWalletDB
        .findOne({ userId: req.body.userId })
        .exec();
      var findUser = await usersDB
        .findOne({ _id: req.body.userId }, { email: 1 })
        .exec();
      var userEmail = common.decrypt(findUser.email);
      var inAmount = findWallet.wallets[48].amount;
      var addAmount = inAmount + findDeposit.amount;
      if (findDeposit) {
        manualDepDB
          .updateOne(
            { transactionID: findDeposit.transactionID },
            { $set: { aprooveStatus: "1", mode: 1 } }
          )
          .exec(function (upErr, upRes) {
            if (upRes.ok == 1) {
              userWalletDB
                .updateOne(
                  { userId: req.userId, "wallets.currencySymbol": "USD" },
                  { $set: { "wallets.$.amount": addAmount } }
                )
                .exec(function (err, response) {
                  mailtempDB
                    .findOne({ key: "StripeDeposit" })
                    .exec(function (etemperr, etempdata) {
                      var etempdataDynamic = etempdata.body
                        .replace(/###USERNAME###/g, userEmail)
                        .replace(/###AMOUNT###/g, findDeposit.amount)
                        .replace(/###CURRENCY###/g, findDeposit.currency);
                      mail.sendMail(
                        {
                          from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
                          to: userEmail,
                          subject: etempdata.Subject,
                          html: etempdataDynamic,
                        },
                        function (mailRes) {
                          console.log(mailRes, "=-=-=-=-=-=");
                          if (mailRes == null) {
                            res.status(200).json({
                              Status: true,
                              Message: "Deposit Successfully Completed",
                            });
                          }
                        }
                      );
                    });
                });
            }
          });
      }
    } else {
      if (req.body.transactionID != "") {
        var removeData = await manualDepDB
          .deleteOne({ transactionID: req.body.transactionID })
          .exec();
        res.status(200).json({ Status: false, Message: "Deposit canceled" });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      status: false,
      Message: "Internal server error!, Please try again later",
    });
  }
});
router.post("/fiatdeposit_submit", common.tokenmiddleware, async (req, res) => {
  try {
    if (
      req.body.amount != "" &&
      req.body.amount != undefined &&
      req.body.amount != null
    ) {
      if (
        req.body.txn_proof != "" &&
        req.body.txn_proof != undefined &&
        req.body.txn_proof != null
      ) {
        var userId = req.userId;
        var currency_symbol = req.body.currency_symbol;
        let getCurrecy = await currencyDB
          .findOne(
            { currencySymbol: req.body.currency_symbol },
            { _id: 1, currencySymbol: 1 }
          )
          .exec({});
        if (getCurrecy) {
          let getuser = await usersDB
            .findOne({ _id: userId }, { _id: 1, mobileNumber: 1, kycstatus: 1 })
            .exec({});
          let getAdmin = await adminDB.find().exec({});
          if (getAdmin.length > 0) {
            if (getuser) {
              if (getuser.kycstatus == 1) {
                let bank_detail = await userBank
                  .findOne({ userid: userId, Status: 1 })
                  .exec({});
                if (bank_detail != null) {
                  var obj = {
                    accountNumber: bank_detail.Account_Number,
                    ifscCode: bank_detail.IFSC_code,
                    bankName: bank_detail.Bank_Name,
                    amount: req.body.amount,
                    holderName: bank_detail.Accout_HolderName,
                    proofImage: req.body.txn_proof,
                    currency_id: getCurrecy._id,
                    currency: getCurrecy.currencySymbol,
                    userId: userId,
                  };
                  let createDepositRec = await manualDepDB.create(obj);
                  if (createDepositRec) {
                    mailtempDB
                      .findOne({ key: "manualDeposit" })
                      .exec(function (etemperr, etempdata) {
                        var etempdataDynamic = etempdata.body
                          .replace(/###USERNAME###/g, getuser.username)
                          .replace(/###AMOUNT###/g, req.body.amount)
                          .replace(
                            /###CURRENCY###/g,
                            getCurrecy.currencySymbol
                          );
                        mail.sendMail(
                          {
                            from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
                            to: process.env.FROM_EMAIL,
                            subject: etempdata.Subject,
                            html: etempdataDynamic,
                          },
                          function (mailRes) {
                            return res.status(200).send({
                              status: true,
                              Message:
                                "Deposit request sent to admin, please wait for admin approve.",
                            });
                          }
                        );
                      });
                  } else {
                    return res.status(200).send({
                      status: false,
                      Message: "Please try again later",
                    });
                  }
                } else {
                  return res.status(200).json({
                    status: false,
                    Message: "Please update your bank details",
                    currency: currency_symbol,
                    redirect: "Bankdetails",
                  });
                }
              } else if (getuser.kycstatus == 2) {
                return res.status(200).json({
                  status: false,
                  Message: "Your kyc verification is pending",
                  currency: currency_symbol,
                  redirect: "kyc",
                });
              } else if (getuser.kycstatus == 3) {
                return res.status(200).json({
                  status: false,
                  Message: "Your kyc is rejected",
                  currency: currency_symbol,
                  redirect: "kyc",
                });
              } else {
                return res.status(200).json({
                  status: false,
                  Message: "Please update your kyc",
                  currency: currency_symbol,
                  redirect: "kyc",
                });
              }
            } else {
              return res
                .status(200)
                .send({ status: false, Message: "Please try again later" });
            }
          } else {
            return res
              .status(200)
              .send({ status: false, Message: "Please try again later" });
          }
        } else {
          return res
            .status(200)
            .send({ status: false, Message: "Please try again later" });
        }
      } else {
        return res
          .status(400)
          .send({ status: false, Message: "Deposited proof is must" });
      }
    } else {
      return res
        .status(400)
        .send({ status: false, Message: "Enter must deposited amount" });
    }
  } catch (error) {
    console.log(error, "=-=-error=-=-=");
    return res.status(500).send({
      status: false,
      Message: "Internal server error!, Please try again later",
    });
  }
});

router.post("/fiatwithdraw_submit", common.tokenmiddleware, (req, res) => {
  console.log(req.body, "---------req.body----------");
  // return false;
  var userId = req.userId;
  var amount = +req.body.amount;
  var withdraw_address = req.body.withdraw_address;
  var tfa = req.body.tfaCode;
  //var fees = req.body.fees;
  //var receiveamount = req.body.receiveamount;
  //var url = req.body.url;
  //var currency_id = req.body.currency_id;
  var currency_symbol = req.body.currency_symbol;
  var url = key.siteUrl + "withdraw";
  if (
    typeof userId === "string" &&
    typeof amount === "number" &&
    typeof currency_symbol === "string"
  ) {
    if (amount > 0) {
      currencyDB
        .findOne({ currencySymbol: currency_symbol })
        .exec(function (cerr, currencydata) {
          if (currencydata) {
            var cointype = currencydata.currencyType;
            var symbol = currencydata.currencySymbol;
            var currency_id = currencydata._id;
            usersDB
              .findOne({ _id: ObjectId(userId) })
              .exec(function (uerr, userdata) {
                if (userdata) {
                  if (userdata.kycstatus == 1) {
                    if (userdata.tfastatus == 1) {
                      var verified = speakeasy.totp.verify({
                        secret: userdata.tfaenablekey,
                        encoding: "base32",
                        token: tfa,
                        window: 1,
                      });
                    } else {
                      var verified = true;
                    }

                    if (userdata.withdrawOtp == req.body.withdrawOtp) {
                      if (verified == true) {
                        common.getbalance(userId, currency_id, function (
                          userbalance
                        ) {
                          if (+amount <= userbalance.amount) {
                            if (amount <= currencydata.maxWithdrawLimit) {
                              if (amount >= currencydata.minWithdrawLimit) {
                                var deduct_balance =
                                  userbalance.amount - amount;
                                var currnt_balance = userbalance.amount;
                                if (deduct_balance >= 0) {
                                  var date = new Date();
                                  var fee_per = currencydata.withdrawFee;
                                  var fees = (amount * fee_per) / 100;
                                  var receiveamount = amount - fees;
                                  var obj = {
                                    user_id: userId,
                                    user_name: userdata.username,
                                    email:
                                      userdata.email != null
                                        ? common.decrypt(userdata.email)
                                        : userdata.mobileNumber,
                                    currency_id: currency_id,
                                    currency_symbol:
                                      currencydata.currencySymbol,
                                    amount: parseFloat(amount).toFixed(8),
                                    receiveamount: parseFloat(
                                      receiveamount
                                    ).toFixed(8),
                                    withdraw_address: "",
                                    fees: parseFloat(fees).toFixed(8),
                                    type: 0,
                                    withdraw_type: 1,
                                    status: 1,
                                    created_at: new Date(),
                                    updated_at: new Date(),
                                    expireTime: new Date(
                                      date.getTime() + 15 * 60000
                                    ),
                                  };
                                  withdrawDB.create(obj, function (
                                    err,
                                    response
                                  ) {
                                    // var crypted1 = common.encrypt(response._id.toString() + '==confirm')
                                    // var crypted2 = common.encrypt(response._id.toString() + '==cancel')
                                    // var cry1 = crypted1.toString().replace(/\+/g, '---').replace(/\//g, '--').replace(/\=/g, '----');
                                    // var cry2 = crypted2.toString().replace(/\+/g, '---').replace(/\//g, '--').replace(/\=/g, '----');
                                    // var link1 = url + '?transaction=' + cry1;
                                    // var link2 = url + '?transaction=' + cry2;
                                    // var email = common.decrypt(userdata.email);
                                    // mailtempDB.findOne({ "key": 'withdraw_user_confirm' }).exec(function (etemperr, etempdata) {
                                    //     var etempdataDynamic = etempdata.body.replace(/###AMOUNT1###/g, receiveamount.toFixed(8)).replace(/###FEE###/g, fees.toFixed(8)).replace(/###AMOUNT###/g, amount.toFixed(8)).replace(/###CURRENCY###/g, currencydata.currencySymbol).replace(/###LINK1###/g, link1).replace(/###LINK2###/g, link2).replace(/###EMAIL###/g, email).replace(/###USERNAME###/g, userdata.username);
                                    //     mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: email, subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                    //         console.log("mailRes", mailRes);
                                    //         res.json({ status: true, message: 'Withdraw placed successfully, Confirmation link sent to your mail id', currency: response.currency_symbol })
                                    //     });
                                    // });

                                    common.getUserBalance(
                                      response.user_id,
                                      response.currency_id,
                                      function (balance) {
                                        if (balance != null) {
                                          var Balance =
                                            balance.totalBalance -
                                            response.amount;
                                          common.updateUserBalance(
                                            response.user_id,
                                            response.currency_id,
                                            +Balance,
                                            "total",
                                            function (balance) { }
                                          );
                                          // console.log("calll 333====", balance);
                                          // return res.json({
                                          //   status: true,
                                          //   message:
                                          //     "Your withdrawal request is submitted successfully, Admin will approve your withdraw request",
                                          //   currency: response.currency_symbol,
                                          // });

                                          common.withdraw_approve(response, 'admin', function (resdatas) {
                                            console.log("withdraw confirm resdatas====", resdatas)
                                            if (resdatas.status) {
                                              mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function (etemperr, etempdata) {
                                                var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, userdata.username).replace(/###MESSAGE###/g, 'Withdraw on ' + response.amount + ' ' + response.currency_symbol + ' was completed');
                                                mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: common.decrypt(userdata.email), subject: etempdata.Subject, html: etempdataDynamic }, function (mailRes) {
                                                  res.json({ status: true, message: 'Withdraw processed successfully' });
                                                });
                                              });
                                            }
                                            else {
                                              res.json({ status: false, message: 'Something went wrong, Please try again later' });
                                            }
                                          });
                                        } else {
                                          return res.json({
                                            status: false,
                                            message:
                                              "Something went wrong, Please try again later",
                                          });
                                        }
                                      }
                                    );
                                  });
                                } else {
                                  res.json({
                                    status: false,
                                    message: "Insufficient balance",
                                    currency: currency_symbol,
                                  });
                                }
                              } else {
                                res.json({
                                  status: false,
                                  message:
                                    "Minimum withdraw limit is " +
                                    currencydata.minWithdrawLimit.toFixed(8),
                                  currency: currency_symbol,
                                });
                              }
                            } else {
                              res.json({
                                status: false,
                                message:
                                  "Maximum withdraw limit is " +
                                  currencydata.maxWithdrawLimit.toFixed(8),
                                currency: currency_symbol,
                              });
                            }
                          } else {
                            res.json({
                              status: false,
                              message: "Insufficient balance",
                              currency: currency_symbol,
                            });
                          }
                        });
                      } else {
                        return res.json({
                          status: false,
                          message: "Please enter valid tfa code",
                          currency: currency_symbol,
                        });
                      }
                    } else {
                      return res.json({
                        status: false,
                        message: "Please enter valid OTP",
                        currency: currency_symbol,
                      });
                    }
                  } else if (userdata.kycstatus == 2) {
                    return res.json({
                      status: false,
                      message: "Your kyc verification is pending",
                      currency: currency_symbol,
                    });
                  } else if (userdata.kycstatus == 3) {
                    return res.json({
                      status: false,
                      message: "Your kyc is rejected",
                      currency: currency_symbol,
                    });
                  } else {
                    return res.json({
                      status: false,
                      message: "Please update your kyc",
                      currency: currency_symbol,
                    });
                  }
                } else {
                  return res.json({
                    status: false,
                    message: "Invalid user",
                    currency: currency_symbol,
                  });
                }
              });
          } else {
            return res.json({
              status: false,
              message: "Currency not exist",
              currency: currency_symbol,
            });
          }
        });
    } else {
      return res.json({
        status: false,
        message: "Please enter valid withdraw amount",
        currency: currency_symbol,
      });
    }
  } else {
    return res.json({
      status: false,
      message: "Please enter all required field values",
      currency: currency_symbol,
    });
  }
});
router.post(
  "/withdraw_history_bycurrency",
  common.tokenmiddleware,
  (req, res) => {
    try {
      if (req.body.FilPerpage != "" || req.body.FilPage != "") {
        var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
        var page = Number(req.body.FilPage ? req.body.FilPage : 0);
        var skippage = perPage * page - perPage;
        currencyDB
          .findOne({ currencySymbol: req.body.currency })
          .exec(function (err, response) {
            if (response && response.coinType === "2") {
              withdrawDB
                .find({
                  user_id: req.userId,
                  currency_symbol: req.body.currency,
                  withdraw_type: 1,
                })
                .sort({ _id: -1 })
                .skip(skippage)
                .limit(perPage)
                .sort({ _id: -1 })
                .exec(function (err, data) {
                  withdrawDB
                    .find({
                      user_id: req.userId,
                      currency_symbol: req.body.currency,
                      withdraw_type: 1,
                    })
                    .countDocuments()
                    .exec(function (err1, count) {
                      if (err) {
                        return res.json({
                          status: false,
                          message:
                            "Something went wrong, Please try again later",
                        });
                      } else {
                        var history = [];
                        for (var i = 0; i < data.length; i++) {
                          var status = "";
                          if (data[i].status == 0 || data[i].status == 1) {
                            status = "Pending";
                          } else if (
                            data[i].status == 3 ||
                            data[i].status == 4
                          ) {
                            status = "Cancelled";
                          } else if (data[i].status == 2) {
                            status = "Completed";
                          }
                          var txn_id = "";
                          if (data[i].txn_id != "") {
                            txn_id = data[i].txn_id;
                          } else {
                            txn_id = "--------";
                          }
                          var obj = {
                            amount: data[i].amount,
                            fees: data[i].fees,
                            currency: data[i].currency_symbol,
                            txn_id: txn_id,
                            status: status,
                            created_at: data[i].created_at,
                          };
                          history.push(obj);
                        }
                        var returnJson = {
                          status: true,
                          result: history,
                          current: page,
                          pages: Math.ceil(count / perPage),
                          total: count,
                        };
                        res.json(returnJson);
                      }
                    });
                });
            } else {
              withdrawDB
                .find({
                  user_id: req.userId,
                  currency_symbol: req.body.currency,
                  withdraw_type: 0,
                })
                .sort({ _id: -1 })
                .skip(skippage)
                .limit(perPage)
                .sort({ _id: -1 })
                .exec(function (err, data) {
                  withdrawDB
                    .find({
                      user_id: req.userId,
                      currency_symbol: req.body.currency,
                      withdraw_type: 0,
                    })
                    .countDocuments()
                    .exec(function (err1, count) {
                      if (err) {
                        return res.json({
                          status: false,
                          message:
                            "Something went wrong, Please try again later",
                        });
                      } else {
                        var history = [];
                        for (var i = 0; i < data.length; i++) {
                          var status = "";
                          if (data[i].status == 0 || data[i].status == 1) {
                            status = "Pending";
                          } else if (
                            data[i].status == 3 ||
                            data[i].status == 4
                          ) {
                            status = "Cancelled";
                          } else if (data[i].status == 2) {
                            status = "Completed";
                          }
                          var txn_id = "";
                          if (data[i].txn_id != "") {
                            txn_id = data[i].txn_id;
                          } else {
                            txn_id = "--------";
                          }
                          var obj = {
                            amount: data[i].amount,
                            fees: data[i].fees,
                            currency: data[i].currency_symbol,
                            txn_id: txn_id,
                            status: status,
                            created_at: data[i].created_at,
                          };
                          history.push(obj);
                        }
                        var returnJson = {
                          status: true,
                          result: history,
                          current: page,
                          pages: Math.ceil(count / perPage),
                          total: count,
                        };
                        res.json(returnJson);
                      }
                    });
                });
            }
          });
      } else {
        return res
          .status(400)
          .json({ status: false, Message: "Please enter pagination fields" });
      }
    } catch (error) {
      console.log("withdraw catch===", error);
      res.json({
        status: false,
        message: "Something went wrong, Please try again later",
      });
    }
  }
);

router.post(
  "/deposit_history_bycurrency",
  common.tokenmiddleware,
  (req, res) => {
    try {
      if (req.body.FilPerpage != "" || req.body.FilPage != "") {
        var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
        var page = Number(req.body.FilPage ? req.body.FilPage : 0);
        var skippage = perPage * page - perPage;
        currencyDB
          .findOne({ currencySymbol: req.body.currency })
          .exec(function (err, response) {
            if (response && response.coinType === "1") {
              depositDB
                .aggregate([
                  {
                    $match: {
                      userId: mongoose.mongo.ObjectId(req.userId.toString()),
                      currency: mongoose.Types.ObjectId(response._id),
                    },
                  },
                  {
                    $lookup: {
                      from: "currency",
                      localField: "currency",
                      foreignField: "_id",
                      as: "currency",
                    },
                  },
                  {
                    $unwind: {
                      path: "$currency",
                    },
                  },
                  {
                    $project: {
                      currencyName: "$currency.currencyName",
                      currencySymbol: "$currency.currencySymbol",
                      amount: "$depamt",
                      txnid: "$txnid",
                      hash: "$txnid",
                      status: "$status",
                      address: "$depto",
                      depType: "$depType",
                      date: "$createddate",
                    },
                  },
                  { $sort: { _id: -1 } },
                ])
                .skip(skippage)
                .limit(perPage)
                .sort({ _id: -1 })
                .exec(function (err, deposits) {
                  depositDB
                    .find({
                      userId: req.userId,
                      currency: mongoose.Types.ObjectId(response._id),
                    })
                    .countDocuments()
                    .exec(function (err1, count) {
                      if (deposits && !err) {
                        var returnJson = {
                          status: true,
                          result: deposits,
                          current: page,
                          pages: Math.ceil(count / perPage),
                          total: count,
                        };
                        res.json(returnJson);
                      } else {
                        return res.status(400).json({
                          status: false,
                          data: [],
                          message: "Something went wrong",
                        });
                      }
                    });
                });
            } else {
              manualDepDB
                .find({ userId: req.userId, currency: req.body.currency })
                .skip(skippage)
                .limit(perPage)
                .sort({ _id: -1 })
                .exec(function (err, deposits) {
                  manualDepDB
                    .find({ userId: req.userId, currency: req.body.currency })
                    .countDocuments()
                    .exec(function (err, count) {
                      if (deposits && !err) {
                        var returnJson = {
                          status: true,
                          result: deposits,
                          current: page,
                          pages: Math.ceil(count / perPage),
                          total: count,
                        };
                        res.json(returnJson);
                      } else {
                        return res.status(400).json({
                          status: false,
                          data: [],
                          message: "Something went wrong",
                        });
                      }
                    });
                });
            }
          });
      }
    } catch (e) {
      console.log(
        "====================get_user_deposit catch===================="
      );
      console.log(e);
      return res
        .status(500)
        .json({ status: false, data: [], message: "Something went wrong" });
    }
  }
);

router.post("/withdrawhistory", common.tokenmiddleware, (req, res) => {
  try {
    withdrawDB
      .find({ user_id: req.userId })
      .sort({ _id: -1 })
      .sort({ _id: -1 })
      .exec(function (err, data) {
        if (err) {
          return res.json({
            status: false,
            message: "Something went wrong, Please try again later",
          });
        } else {
          var history = [];
          for (var i = 0; i < data.length; i++) {
            var status = "";
            if (data[i].status == 0 || data[i].status == 1) {
              status = "Pending";
            } else if (data[i].status == 3 || data[i].status == 4) {
              status = "Cancelled";
            } else if (data[i].status == 2) {
              status = "Completed";
            }
            var txn_id = "";
            if (data[i].txn_id != "") {
              txn_id = data[i].txn_id;
            } else {
              txn_id = "--------";
            }
            var obj = {
              amount: parseFloat(data[i].amount).toFixed(8),
              fees: parseFloat(data[i].fees).toFixed(8),
              currency: data[i].currency_symbol,
              withdraw_address: data[i].withdraw_address,
              txn_id: txn_id,
              status: status,
              created_at: moment(data[i].created_at).format("lll"),
            };
            history.push(obj);
          }
          var returnJson = {
            status: true,
            data: history,
          };
          res.json(returnJson);
        }
      });
  } catch (error) {
    console.log("withdraw catch===", error);
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/deposithistory", common.tokenmiddleware, (req, res) => {
  try {
    depositDB
      .aggregate([
        {
          $match: {
            userId: mongoose.mongo.ObjectId(req.userId.toString()),
          },
        },
        {
          $lookup: {
            from: "currency",
            localField: "currency",
            foreignField: "_id",
            as: "currency",
          },
        },
        {
          $unwind: {
            path: "$currency",
          },
        },
        {
          $project: {
            currencyName: "$currency.currencyName",
            currencySymbol: "$currency.currencySymbol",
            amount: "$depamt",
            txnid: "$txnid",
            hash: "$txnid",
            status: "$status",
            address: "$depto",
            depType: "$depType",
            date: "$createddate",
          },
        },
        { $sort: { _id: -1 } },
      ])
      .sort({ _id: -1 })
      .exec(function (err, data) {
        if (data && !err) {
          var history = [];
          for (var i = 0; i < data.length; i++) {
            var obj = {
              amount: parseFloat(data[i].amount).toFixed(8),
              currency: data[i].currencySymbol,
              txn_id: data[i].txnid,
              status: "Completed",
              created_at: moment(data[i].date).format("lll"),
            };
            history.push(obj);
          }
          var returnJson = {
            status: true,
            data: history,
          };
          res.json(returnJson);
        } else {
          return res.json({
            status: false,
            message: "Something went wrong, please try again",
          });
        }
      });
  } catch (e) {
    console.log(
      "====================get_user_deposit catch===================="
    );
    console.log(e);
    return res.json({
      status: false,
      message: "Something went wrong, please try again",
    });
  }
});

router.get("/transactionhistory", common.tokenmiddleware, async (req, res) => {
  var deposit_history = await depositDB
    .aggregate([
      {
        $match: {
          userId: mongoose.mongo.ObjectId(req.userId.toString()),
        },
      },
      {
        $lookup: {
          from: "currency",
          localField: "currency",
          foreignField: "_id",
          as: "currency",
        },
      },
      {
        $unwind: {
          path: "$currency",
        },
      },
      {
        $project: {
          currencyName: "$currency.currencyName",
          currencySymbol: "$currency.currencySymbol",
          amount: "$depamt",
          txnid: "$txnid",
          hash: "$txnid",
          status: "$status",
          address: "$depto",
          depType: "$depType",
          date: "$createddate",
        },
      },
      { $sort: { _id: -1 } },
    ])
    .sort({ _id: -1 });
  var withdraw_history = await withdrawDB
    .find({ user_id: req.userId })
    .sort({ _id: -1 })
    .sort({ _id: -1 });
  var history = [];
  var history1 = [];
  if (deposit_history.length > 0) {
    for (var i = 0; i < deposit_history.length; i++) {
      var obj = {
        amount: parseFloat(deposit_history[i].amount).toFixed(8),
        currency: deposit_history[i].currencySymbol,
        txn_id: deposit_history[i].txnid,
        status: "Completed",
        created_at: moment(deposit_history[i].date).format("lll"),
      };
      history.push(obj);
    }
  }

  if (withdraw_history.length > 0) {
    for (var i = 0; i < withdraw_history.length; i++) {
      var status = "";
      if (withdraw_history[i].status == 0 || withdraw_history[i].status == 1) {
        status = "Pending";
      } else if (
        withdraw_history[i].status == 3 ||
        withdraw_history[i].status == 4
      ) {
        status = "Cancelled";
      } else if (withdraw_history[i].status == 2) {
        status = "Completed";
      }
      var txn_id = "";
      if (withdraw_history[i].txn_id != "") {
        txn_id = withdraw_history[i].txn_id;
      } else {
        txn_id = "--------";
      }
      var obj = {
        amount: parseFloat(withdraw_history[i].amount).toFixed(8),
        fees: parseFloat(withdraw_history[i].fees).toFixed(8),
        currency: withdraw_history[i].currency_symbol,
        txn_id: txn_id,
        status: status,
        created_at: moment(withdraw_history[i].created_at).format("lll"),
      };
      history1.push(obj);
    }
  }
  return res.json({
    status: true,
    deposit_history: history,
    withdraw_history: history1,
  });
});

router.get("/withdraw_otp", common.tokenmiddleware, (req, res) => {
  try {
    var user_id = req.userId;
    console.log("user_id====", user_id);
    adminDB
      .findOne({ _id: new mongoose.Types.ObjectId(user_id) })
      .exec(function (resErr, resData) {
        if (!resData) {
          return res.json({ status: false, message: "User not found" });
        } else {
          let otp = common.generate_otp();
          console.log(otp, "09090-0-0-0-");
          adminDB
            .updateOne(
              { _id: new mongoose.Types.ObjectId(user_id) },
              { $set: { withdrawOTP: otp } }
            )
            .exec(function (upErr, upRes) {
              mailtempDB
                .findOne({ key: "withdraw_otp" })
                .exec(function (etemperr, etempdata) {
                  var etempdataDynamic = etempdata.body
                    .replace(/###OTP###/g, otp)
                    .replace(/###USERNAME###/g, resData.userName);

                  mail.sendMail(
                    {
                      from: {
                        name: process.env.FROM_NAME,
                        address: process.env.FROM_EMAIL,
                      },
                      to: process.env.ADMIN_EMAIL,
                      subject: etempdata.Subject,
                      html: etempdataDynamic,
                    },
                    function (mailRes) {
                      res.json({
                        status: true,
                        message:
                          "Withdraw request OTP has been sent to your mail",
                        withdraw_otp: common.encrypt(otp),
                      });
                    }
                  );
                });
            });
        }
      });
  } catch (e) {
    console.log("====================send otp catch====================");
    console.log(e);
    return res.json({
      status: false,
      data: {},
      message: "Something went wrong",
    });
  }
});

router.post(
  "/user_balance",
  common.isEmpty,
  common.tokenmiddleware,
  (req, res) => {
    console.log(req.body, "----addrObj----addrObj----addrObj-");
    try {
      var user_id = req.userId;
      if (
        req.body.currency != "" &&
        req.body.currency != undefined &&
        req.body.currency != null
      ) {
        currencyDB
          .findOne(
            { currencySymbol: req.body.currency },
            {
              currencySymbol: 1,
              currencyType: 1,
              walletType: 1,
              erc20token: 1,
              trc20token: 1,
              bep20token: 1,
            }
          )
          .exec((cerr, currencydata) => {
            console.log("cerr=====", cerr);
            if (cerr) {
              return res.json({ status: false, Message: "Pleary try leter" });
            } else {
              var currency = currencydata.currencySymbol;
              var network = "";
              var balance = 0;
              if (currencydata.erc20token == "1") {
                network = "ERC20";
              } else if (currencydata.trc20token == "1") {
                network = "Tron";
              } else if (currencydata.bep20token == "1") {
                network = "BEP20";
              }

              common.getbalance(user_id, currencydata._id, function (
                userbalance
              ) {
                if (userbalance != null) {
                  balance = userbalance.amount;

                  var obj = {
                    balance: balance,
                    network: network,
                  };

                  return res.json({ status: true, data: obj });
                } else {
                  return res.json({
                    status: false,
                    Message: "Pleary try leter",
                  });
                }
              });
            }
          });
      }
    } catch (err) {
      return res.json({ status: false, Message: "Pleary try leter" });
    }
  }
);

router.get("/getUserBalanceSwap", common.tokenmiddleware, (req, res) => {
  try {
    userWalletDB
      .aggregate([
        {
          $unwind: "$wallets",
        },
        {
          $lookup: {
            from: "currency",
            localField: "wallets.currencyId",
            foreignField: "_id",
            as: "currdetail",
          },
        },
        {
          $match: { userId: mongoose.Types.ObjectId(req.userId) },
        },

        {
          $project: {
            currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencySymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            Currency_image: { $arrayElemAt: ["$currdetail.Currency_image", 0] },
            currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
            coinType: { $arrayElemAt: ["$currdetail.coinType", 0] },
            withdrawStatus: { $arrayElemAt: ["$currdetail.withdrawStatus", 0] },
            depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
            swapStatus: { $arrayElemAt: ["$currdetail.swapStatus", 0] },
            withdrawFee: { $arrayElemAt: ["$currdetail.withdrawFee", 0] },
            maxSwap: { $arrayElemAt: ["$currdetail.maxSwap", 0] },
            minSwap: { $arrayElemAt: ["$currdetail.minSwap", 0] },
            swapFee: { $arrayElemAt: ["$currdetail.swapFee", 0] },
            minWithdrawLimit: {
              $arrayElemAt: ["$currdetail.minWithdrawLimit", 0],
            },
            maxWithdrawLimit: {
              $arrayElemAt: ["$currdetail.maxWithdrawLimit", 0],
            },
            currencyBalance: "$wallets.amount",
            holdAmount: "$wallets.holdAmount",
            currid: { $arrayElemAt: ["$currdetail._id", 0] },
          },
        },
      ])
      .exec((err, data) => {
        console.log(data, "datadata");
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
                  coinType: data[i].coinType,
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
                };
                currencies.push(obj);
              }
            }
          }
          return res.json({
            status: true,
            data: currencies,
            dep_currencies: dep_currencies,
            code: 200,
          });
        }
      });
  } catch (error) {
    return res.json({ status: false, Message: "Internal server", code: 500 });
  }
});

router.post("/send_withdraw_otp", common.tokenmiddleware, (req, res) => {
  try {
    var user_id = req.userId;
    usersDB.findOne({ _id: ObjectId(user_id) }).exec(function (err, userData) {
      if (!userData) {
        return res.json({ status: false, message: "User not found" });
      } else {
        let otp = common.generate_otp();
        console.log(otp, "otptptpt");
        if (userData.email != null) {
          let usermail = common.decrypt(userData.email);
          usersDB
            .updateOne({ _id: ObjectId(user_id) }, { $set: { withdrawOtp: otp } })
            .exec(function (upErr, upRes) {
              var obj = {
                to_user_id: ObjectId(user_id),
                to_user_name: userData.username,
                status: 0,
                message: "Withdraw Requesed OTP send your email",
                link: "/notificationHistory",
              };
              notifydb.create(obj, function (err, response) {
                mailtempDB
                  .findOne({ key: "withdraw_otp" })
                  .exec(function (etemperr, etempdata) {
                    console.log(etempdata, "etempdata");
                    var etempdataDynamic = etempdata.body
                      .replace(/###OTP###/g, otp)
                      .replace(/###USERNAME###/g, userData.displayname);

                      console.log("=-=-=-here i put this for check");

                     var mailRes = mail.sendMail(
                      {
                        from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
                        to: usermail,
                        subject: etempdata.Subject,
                        html: etempdataDynamic,
                      });
                      if (mailRes) {
                        console.log(err, "mail response===", response);
                       return res.json({
                          status: true,
                          message: "Withdraw OTP has been sent to your mail",
                        });
                      }
                    
                  });
              });
            });
        } else {
          usersDB
            .updateOne({ _id: ObjectId(user_id) }, { $set: { withdrawOtp: otp } })
            .exec(function (upErr, upRes) {
              mailtempDB
                .findOne({ key: "SMSOTP" })
                .exec(function (etemperr, etempdata) {
                  var etempdataDynamic = etempdata.body
                    .replace(/###OTP###/g, otp)
                    .replace(/###USERNAME###/g, userData.username);

                  sms.sendSMS(
                    userData.mobileNumber,
                    etempdataDynamic,
                    function (smsRes) {
                      //console.log("mail response===", mailRes);
                      res.json({
                        status: true,
                        message:
                          "Withdraw OTP has been sent to your mobile Number",
                      });
                    }
                  );
                });
            });
        }
      }
    });
  } catch (e) {
    console.log("====================send otp catch====================");
    console.log(e);
    return res.json({
      status: false,
      data: {},
      message: "Something went wrong",
    });
  }
});

router.post("/admin_withdrawapprove_rptc", (req, res) => {
  try {
    if (req.body.status == "confirm") {
      withdrawDB.findOne({ _id: req.body._id }, function (err, with_data) {
        if (with_data) {
          var withdraw_details = with_data;
          if (withdraw_details.withdraw_type == 0) {
            console.log(
              "withdraw_details.withdraw_type ====",
              withdraw_details.withdraw_type
            );
            common.withdraw_approve(withdraw_details, "admin", function (
              resdatas
            ) {
              console.log("withdraw confirm resdatas====", resdatas);
              if (resdatas.status) {
                common.getbalance(
                  with_data.user_id,
                  with_data.currency_id,
                  function (balance) {
                    var Hold = +balance.hold - +with_data.amount;
                    //common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, Hold);
                    mailtempDB
                      .findOne({ key: "confirm_transaction" })
                      .exec(function (etemperr, etempdata) {
                        var etempdataDynamic = etempdata.body
                          .replace(/###USERNAME###/g, req.body.uname)
                          .replace(
                            /###MESSAGE###/g,
                            "Withdraw on " +
                            with_data.amount +
                            " " +
                            req.body.currency_symbol +
                            " was completed"
                          );
                        mail.sendMail(
                          {
                            from: {
                              name: process.env.FROM_NAME,
                              address: process.env.FROM_EMAIL,
                            },
                            to: req.body.email,
                            subject: etempdata.Subject,
                            html: etempdataDynamic,
                          },
                          function (mailRes) {
                            res.json({
                              status: true,
                              message: "Withdraw approved successfully",
                            });
                          }
                        );
                      });
                  }
                );
              } else {
                res.json({
                  status: false,
                  message: "Insufficient balance from admin",
                });
              }
            });
          } else {
            withdrawDB.updateOne(
              { _id: withdraw_details._id },
              {
                $set: {
                  txn_id: Math.floor(Math.random() * 100000000 + 1),
                  status: 2,
                },
              },
              async function (err, with_res1) {
                if (with_res1) {
                  common.getbalance(
                    withdraw_details.user_id,
                    withdraw_details.currency_id,
                    function (balance) {
                      var Hold = +balance.hold - +withdraw_details.amount;
                      //common.updatewithdrawHoldAmount(withdraw_details.user_id, withdraw_details.currency_id, Hold);
                      return res.status(200).json({
                        status: true,
                        message: "Withdraw confirmed successfully",
                        currency: with_data.currency_symbol,
                      });
                    }
                  );
                } else {
                  return res.status(200).json({
                    status: false,
                    message: "Something went wrong, Please try again",
                  });
                }
              }
            );
          }
        } else {
          res.json({ status: false, message: "Invalid OTP" });
        }
      });
    } else if (req.body.status == "cancel") {
      withdrawDB.updateOne(
        { _id: req.body._id },
        {
          $set: { status: 4, reason: req.body.reason, updated_at: new Date() },
        },
        function (err, with_res1) {
          if (with_res1.ok == 1) {
            withdrawDB.findOne({ _id: req.body._id }, function (err, with_data) {
              common.getbalance(
                with_data.user_id,
                with_data.currency_id,
                function (balance) {
                  var Balance = +balance.amount + +with_data.amount;
                  var Hold = +balance.hold - +with_data.amount;
                  // common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, Hold);
                  common.updateUserBalance(
                    with_data.user_id,
                    with_data.currency_id,
                    Balance,
                    "total",
                    function (updatebalance) {
                      mailtempDB
                        .findOne({ key: "cancel_transaction" })
                        .exec(function (etemperr, etempdata) {
                          var etempdataDynamic = etempdata.body
                            .replace(/###USERNAME###/g, req.body.uname)
                            .replace(
                              /###TYPE###/g,
                              "Withdraw on " +
                              req.body.amount +
                              " " +
                              with_data.currency_symbol
                            )
                            .replace(/###REASON###/g, req.body.reason);
                          mail.sendMail(
                            {
                              from: {
                                name: process.env.FROM_NAME,
                                address: process.env.FROM_EMAIL,
                              },
                              to: req.body.email,
                              subject: etempdata.Subject,
                              html: etempdataDynamic,
                            },
                            function (mailRes) {
                              var msg =
                                "Withdraw on " +
                                with_data.amount +
                                " " +
                                with_data.currency_symbol +
                                " is cancelled by admin";
                              res.json({
                                status: true,
                                message:
                                  "Withdraw request cancelled successfully",
                              });
                            }
                          );
                        });
                    }
                  );
                }
              );
            });
          } else {
            res.json({ status: false, message: "Not valid" });
          }
        }
      );
    } else {
      res.json({ status: false, message: "Not valid" });
    }
  } catch (e) {
    console.log(
      "====================admin_withdraw_approve catch===================="
    );
    console.log(e);
    return res.json({ status: false, Message: "Something went wrong" });
  }
});


router.post("/admin_fiatwithdraw_approve", (req, res) => {
  try {
    if (req.body.status == "confirm") {
      withdrawDB.findOne({ _id: req.body._id }, function (err, with_data) {
        if (with_data) {
          var withdraw_details = with_data;
          withdrawDB.updateOne(
            { _id: withdraw_details._id },
            {
              $set: {
                txn_id: Math.floor(Math.random() * 100000000 + 1),
                status: 2,
              },
            },
            async function (err, with_res1) {
              if (with_res1) {
                common.getbalance(
                  withdraw_details.user_id,
                  withdraw_details.currency_id,
                  function (balance) {
                    var Hold = +balance.hold - +withdraw_details.amount;
                    //common.updatewithdrawHoldAmount(withdraw_details.user_id, withdraw_details.currency_id, Hold);
                    return res.status(200).json({
                      status: true,
                      message: "Withdraw confirmed successfully",
                      currency: with_data.currency_symbol,
                    });
                  }
                );
              } else {
                return res.status(200).json({
                  status: false,
                  message: "Something went wrong, Please try again",
                });
              }
            }
          );
        } else {
          res.json({ status: false, message: "Invalid OTP" });
        }
      });
    } else if (req.body.status == "cancel") {
      withdrawDB.updateOne(
        { _id: req.body._id },
        {
          $set: { status: 4, reason: req.body.reason, updated_at: new Date() },
        },
        function (err, with_res1) {
          if (with_res1.ok == 1) {
            withdrawDB.findOne({ _id: req.body._id }, function (err, with_data) {
              common.getbalance(
                with_data.user_id,
                with_data.currency_id,
                function (balance) {
                  var Balance = +balance.amount + +with_data.amount;
                  var Hold = +balance.hold - +with_data.amount;
                  // common.updatewithdrawHoldAmount(with_data.user_id, with_data.currency_id, Hold);
                  common.updateUserBalance(
                    with_data.user_id,
                    with_data.currency_id,
                    Balance,
                    "total",
                    function (updatebalance) {
                      mailtempDB
                        .findOne({ key: "cancel_transaction" })
                        .exec(function (etemperr, etempdata) {
                          var etempdataDynamic = etempdata.body
                            .replace(/###USERNAME###/g, req.body.uname)
                            .replace(
                              /###TYPE###/g,
                              "Withdraw on " +
                              req.body.amount +
                              " " +
                              with_data.currency_symbol
                            )
                            .replace(/###REASON###/g, req.body.reason);
                          mail.sendMail(
                            {
                              from: {
                                name: process.env.FROM_NAME,
                                address: process.env.FROM_EMAIL,
                              },
                              to: req.body.email,
                              subject: etempdata.Subject,
                              html: etempdataDynamic,
                            },
                            function (mailRes) {
                              var msg =
                                "Withdraw on " +
                                with_data.amount +
                                " " +
                                with_data.currency_symbol +
                                " is cancelled by admin";
                              res.json({
                                status: true,
                                message:
                                  "Withdraw request cancelled successfully",
                              });
                            }
                          );
                        });
                    }
                  );
                }
              );
            });
          } else {
            res.json({ status: false, message: "Not valid" });
          }
        }
      );
    } else {
      res.json({ status: false, message: "Not valid" });
    }
  } catch (e) {
    console.log(
      "====================admin_withdraw_approve catch===================="
    );
    console.log(e);
    common.create_log(e, function (resp) { });
    return res.json({ status: false, Message: "Something went wrong" });
  }
});

module.exports = router;
