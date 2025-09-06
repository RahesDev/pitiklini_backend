var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var transaction = require("../deposit/BNB");
var eth_transaction = require("../deposit/ETH_cron");
var trx_transaction = require("../deposit/TRX");
var matic_transaction = require("../deposit/MATIC");
var usersDB = require("../schema/users");
let jwt = require("jsonwebtoken");
const key = require("../config/key");
const jwt_secret = key.JWT_TOKEN_SECRET;
const userLoginhistoryDB = require("../schema/userLoginHistory");
var ip = require("ip");
var useragent = require("express-useragent");
var conversion = require("../helper/currencyConversion");
var axios = require("axios");
var mongoose = require("mongoose");
var userWalletDB = require("../schema/userWallet");
var currencyDB = require("../schema/currency");
var antiPhishing = require("../schema/antiphising");

var binancefn = require("../exchanges/binance");
const notifydb = require("../schema/notification");
const { RedisService } = require("../services/redis");
const cron = require("node-cron");
var mailtempDB = require("../schema/mailtemplate");
const crypto = require("crypto");
var mail = require("../helper/mailhelper");
const speakeasy = require("speakeasy");
var orderDB = require("../schema/orderPlace");
var orderConfirmDB = require("../schema/confirmOrder");
var moment = require("moment");
var tradePairDB = require("../schema/trade_pair");
const admin = require("../schema/admin");
const Adminwallet = require("../schema/adminWallet");

const contact = require("../schema/contact");

const bankdb = require("../schema/bankdetails");
const subscriberDB = require("../schema/subscriber");

const redisHelper = require("../services/redis");
const geoip = require("geoip-lite");
const favouritePair = require("../schema/favouritepair");
const depositDB = require("../schema/deposit");
const withdrawDB = require("../schema/withdraw");
const twoFAHistory = require("../schema/2FAhistory");
const adminBankdetails = require("../schema/adminBank");
const redis_service = require("../redis-helper/redisHelper");
const redis = require("redis");
const emailDomainDB = require("../schema/emailDomain");
client = redis.createClient();
const bannerDB = require("../schema/banner");
const { log } = require("util");
const ObjectId = mongoose.Types.ObjectId;
const ShortUniqueId = require("short-unique-id");
const async = require("async");
var referralHistoryDB = require("../schema/referralHistory");
var bnb_transaction = require("../deposit/BNBTOKEN_new");
var erc20_transaction = require("../deposit/ERC20_cron_new");
var trx20_transaction = require("../deposit/TRXTOKEN_new");
var arbit_transaction = require("../deposit/ARBITRUM");
/* GET users listing. */
const TronWeb = require("tronweb");
const WithdrawAddress = require("../schema/userwithdrawAddress");
const WAValidator = require("multicoin-address-validator");
const { socket } = require("../services/socket/socket");
var cryptoAddressDB = require("../schema/userCryptoAddress");
const bcrypt = require('bcrypt');
const saltRounds = 12;
const userRedis = require('../redis-helper/userRedis');


router.post("/Addaddress", common.tokenmiddleware, async (req, res) => {
  try {
    function verifyTronAddress(address) {
      try {
        if (!TronWeb.isAddress(address)) {
          throw new Error("Invalid TRON address format");
        }

        // Additional checks can be added if necessary

        return true; // Address is valid
      } catch (error) {
        console.error("Error verifying TRON address:", error.message);
        return false; // Address is invalid
      }
    }
    var data = req.body;
    console.log(data, "===");
    if (data.Address != "" && data.currency != "") {
      var findAddress = await WithdrawAddress.findOne({
        userId: req.userId,
        address: data.Address,
        currency: data.currency,
      }).exec();
      //console.log((findAddress, "=-==-=-findAddress");
      var currencydata = await currencyDB.findOne({
        currencySymbol: data.currency,
      });
      console.log(currencydata, "=-==-=-currencydata");

      if (findAddress == null) {
        if (data.currency != "TRX") {
          if (currencydata.trc20token != "1") {
            if (WAValidator.validate(data.Address, data.currency)) {
              var obj = {
                userId: req.userId,
                address: data.Address,
                currency: data.currency,
                network: data.network,
              };
              //console.log((obj, "=-==-=-obj");
              var createAddress = await WithdrawAddress.create(obj);
              res.json({ status: true, message: "Address add successfully" });
            } else {
              res.json({
                status: false,
                message: "Invalid currency address",
              });
            }
          } else {
            if (verifyTronAddress(data.Address)) {
              var obj = {
                userId: req.userId,
                address: data.Address,
                currency: data.currency,
                network: data.network,
              };
              var createAddress = await WithdrawAddress.create(obj);
              res.json({ status: true, message: "Address add successfully" });
            } else {
              res.json({
                status: false,
                message: "Invalid currency address",
              });
            }
          }
        } else {
          if (verifyTronAddress(data.Address)) {
            var obj = {
              userId: req.userId,
              address: data.Address,
              currency: data.currency,
              network: data.network,
            };
            var createAddress = await WithdrawAddress.create(obj);
            res.json({ status: true, message: "Address add successfully" });
          } else {
            res.json({
              status: false,
              message: "Invalid currency address",
            });
          }
        }
      } else {
        res.json({ status: false, message: "Address already exists" });
      }
    } else {
      res.json({ status: false, message: "All field required" });
    }
  } catch (error) {
    console.log(error, "[error");
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

router.post("/mobile_getAddress", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body);
    var getAddress = await WithdrawAddress.find({
      userId: req.userId,
      currency: req.body.currency,
    })
      .sort({ _id: -1 })
      .exec();
    if (getAddress.length > 0) {
      res.status(200).json({ status: true, data: getAddress });
    } else {
      res.status(200).json({ status: false, data: [] });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

router.get("/getAddress", common.tokenmiddleware, async (req, res) => {
  try {
    var getAddress = await WithdrawAddress.find({ userId: req.userId })
      .sort({ _id: -1 })
      .exec();
    if (getAddress.length > 0) {
      res.status(200).json({ status: true, data: getAddress });
    } else {
      res.status(200).json({ status: false, data: [] });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

router.post("/removeAddress", common.tokenmiddleware, async (req, res) => {
  try {
    var getAddress = await WithdrawAddress.deleteOne({
      _id: req.body._id,
    }).exec();
    if (getAddress) {
      res
        .status(200)
        .json({ status: true, message: "Address remove successfully" });
    } else {
      res.status(200).json({ status: false, message: "Try again later" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

router.get("/getTransaction", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.userId, "user", req.body)
    var user_wallet = await cryptoAddressDB.find({ user_id: req.userId });
    console.log(user_wallet, "user_wallet");
    var eth_wallet = "";
    var bnb_wallet = "";
    var trx_wallet = "";
    var matic_wallet = "";
    if (user_wallet.length > 0) {
      bnb_wallet = user_wallet.filter(
        (wallet) => wallet.currencySymbol == "BNB"
      );
      eth_wallet = user_wallet.filter(
        (wallet) => wallet.currencySymbol == "ETH"
      );
      trx_wallet = user_wallet.filter(
        (wallet) => wallet.currencySymbol == "TRX"
      );
      matic_wallet = user_wallet.filter(
        (wallet) => wallet.currencySymbol == "MATIC"
      );
      arbit_wallet = user_wallet.filter(
        (wallet) => wallet.currencySymbol == "ARB"
      )
    }

    var bnb_address = bnb_wallet.length > 0 ? bnb_wallet[0].address : "";
    var eth_address = eth_wallet.length > 0 ? eth_wallet[0].address : "";
    var trx_address = trx_wallet.length > 0 ? trx_wallet[0].address : "";
    var matic_address = matic_wallet.length > 0 ? matic_wallet[0].address : "";
    var arbit_address = arbit_wallet.length > 0 ? arbit_wallet[0].address : "";
    var trx_name = trx_wallet.length > 0 ? trx_wallet[0].privateKey : "";
    var bnb = await transaction.bnb_deposit(bnb_address);
    console.log(trx_address, "trx_address", trx_name, "trx_name");

    console.log("============bnb");
    var bnb2 = setTimeout(function () {
      //console.log(("============bnb2");
      //res.json({message: true});
      var bnb_token = bnb_transaction.bnb_token(bnb_address);
      // res.status(200).json({ message: true });
    }, 10000);
    var eth1 = setTimeout(function () {
      clearTimeout(bnb2);
      console.log("============e/th1");
      var eth = eth_transaction.eth_deposit(eth_address);
    }, 20000);
    var eth2 = setTimeout(function () {
      console.log("============eth2");
      clearTimeout(eth1);
      var eth_token = erc20_transaction.erc20_token(eth_address);
    }, 30000);
    var trx2 = setTimeout(function () {
      console.log("============trx2");
      var trx = trx_transaction.tron_deposit(trx_address);
      clearTimeout(eth2);
    }, 40000);
    var trx1 = setTimeout(function () {
      console.log("============trx1");
      var trx_token = trx20_transaction.trx20_token(trx_address, trx_name);
      clearTimeout(trx2);
    }, 50000);
    var arb1 = setTimeout(function () {
      console.log("============arb1");
      var arb = arbit_transaction.arbit_deposit(arbit_address);
      clearTimeout(trx1);
    }, 60000);
    var mat = setTimeout(function () {
      var matic = matic_transaction.matic_deposit(matic_address);
      console.log(matic, "-0-000-0-0-00-");
      // clearTimeout(trx1);
    }, 70000);
    setInterval(function () {
      clearTimeout(mat);
    }, 72000);
  } catch (error) {
    console.log(error, "=======");
    res.status(500).json({ status: false, message: "Internal server error" });
  }
});

/* Register API funtionality - Author - siva */



router.post("/UpdateProfile", common.tokenmiddleware, async (req, res) => {
  try {
    if (
      // req.body.email != "" &&
      // req.body.username != "" &&
      req.body
    ) {

      var Updatedata = await usersDB.updateOne(
        { _id: mongoose.Types.ObjectId(req.userId) },
        { $set: { username: req.body.username, displayname: req.body.displayname ? req.body.displayname : req.body.username, url: req.body.url } }
      );


      if (Updatedata.nModified == 1) {
        return res.json({ status: true, Message: "Successfully changes the user data", data: Updatedata });

      } else {
        return res.json({ status: false, Message: "Something went wrong" });
      }



    } else {
      return res.json({ status: false, Message: "Please fill all fileds" });
    }
  } catch (error) {
    console.log("Error from Register:::", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    if (
      req.body.email != "" &&
      req.body.password != "" &&
      req.body.confirmPassword != ""
    ) {
      console.log(req.body, "req.body");
      var domain = req.body.email.split("@")[1];
      if (domain) {
        let checkEmailDomain = await emailDomainDB
          .findOne({ email_domain: domain })
          .exec();
        if (checkEmailDomain == null) {
          var emailLower = req.body.email.toLowerCase();
          var email = common.encrypt(emailLower);
          let userData = await usersDB.findOne({ email: email });
          if (!userData) {
            if (
              req.body.ReferelBy != "" &&
              req.body.ReferelBy != undefined &&
              req.body.ReferelBy != null
            ) {
              let checkReferral = await usersDB.findOne({
                referralCode: req.body.ReferelBy,
              });
              console.log(checkReferral, "checkReferral");
              if (checkReferral) {


                var qrName = "Fidex:" + req.body.email;
                var secret = speakeasy.generateSecret({ length: 10 });

                const otpauth_url = speakeasy.otpauthURL({
                  secret: secret.base32,
                  label: qrName,
                  issuer: 'Fidex',
                  encoding: 'base32'
                });

                var tfa_url = common.getQrUrl(otpauth_url);
                var fou_digit = Math.floor(1000 + Math.random() * 9000);
                if (req.body.registertype == "Individuals") {
                  var username = req.body.email.split("@")[0];
                } else {
                  var username = req.body.name;
                }
                var referral_code = await new ShortUniqueId({ length: 8 });
                var uid = referral_code();
                var obj = {
                  username: username,
                  displayname: username,
                  email: email,
                  password: common.encrypt(req.body.password),
                  tfaenablekey: secret.base32,
                  tfa_url: tfa_url,
                  mobileNumber: req.body.phonenumber,
                  firstname: req.body.firstName,
                  lastname: req.body.lastName,
                  referral: req.body.referral_code,
                  language: req.body.language,
                  emailOtp: fou_digit,
                  referralCode: uid,
                  referred_by: checkReferral._id,
                  uuid: req.body.UUID,
                  businessType: req.body.businesstype,
                  businessName: req.body.businessname,
                  incorporationPlace: req.body.incorporationplace,
                  registerType: req.body.registertype,

                  // verifyEmail  : 2
                };
                console.log("obj====", obj);
                let userSave = await usersDB.create(obj);
                console.log(userSave, "userSave")

                if (userSave) {
                  console.log("obj 11====", obj);
                  let currencyData = await currencyDB.find({});
                  console.log(currencyData, "currencyData")
                  if (currencyData) {
                    var currencyArray = [];
                    for (var i = 0; i < currencyData.length; i++) {
                      var value = {
                        currencyId: currencyData[i]._id,
                        currencyName: currencyData[i].currencyName,
                        currencySymbol: currencyData[i].currencySymbol,
                        amount: 0,
                      };
                      currencyArray.push(value);
                    }
                    var wallet_obj = {
                      userId: userSave._id,
                      wallets: currencyArray,
                    };

                    let wall_data = await userWalletDB.create(wallet_obj);
                    console.log(wall_data, "wall_data")
                    if (wall_data) {
                      var email = common.decrypt(userSave.email);
                      var link1 =
                        process.env.BASE_URL +
                        "login?_activiation_" +
                        common.encrypt(userSave._id.toString());
                      var username = userSave.username;

                      let resData = await mailtempDB.findOne({ key: "OTP" });
                      if (resData) {
                        var reciver = req.body.email;
                        var etempdataDynamic = resData.body
                          .replace(/###OTP###/g, fou_digit)
                          .replace(/###USERNAME###/g, email);
                        usersDB
                          .findOneAndUpdate(
                            { _id: userSave._id },
                            { $set: { expireEmail: 0 } }
                          )
                          .exec(async (err, data) => {
                            var source = req.headers["user-agent"],
                              ua = useragent.parse(source);
                            var testip =
                              req.headers["x-forwarded-for"] ||
                              req.connection.remoteAddress;
                            var replaceipAdd = testip.replace("::ffff:", "");
                            var geo = await geoip.lookup(replaceipAdd);
                            let ip_address =
                              req.header("x-forwarded-for") ||
                              req.connection.remoteAddress;
                            var obj = {
                              ipAddress: ip_address,
                              browser: ua.browser,
                              OS: ua.os,
                              platform: ua.platform,
                              useremail: common.decrypt(data.email),
                              user_id: data._id,
                              location:
                                geo !== null ? geo.country : "not found",
                              activitity: "Signup",
                              createdDate: new Date(),
                              modifiedDate: new Date(),
                            };
                            userLoginhistoryDB.create(
                              obj,
                              (his_err, historyData) => { }
                            );
                          });

                        var mailRes = await mail.sendMail(
                          {
                            from: {
                              name: process.env.FROM_NAME,
                              address: process.env.FROM_EMAIL,
                            },
                            to: reciver,
                            subject: resData.Subject,
                            html: etempdataDynamic,
                          });
                          if (mailRes != null) {
                            res.json({
                              status: true,
                              Message:
                                "Register successfully completed, OTP sent to your registered email",
                              email: email,
                              emailOtp: fou_digit,
                            });
                            usersDB
                              .updateOne(
                                { _id: userSave._id },
                                { $set: { expireEmail: 0 } }
                              )
                              .exec((err, data) => { });
                          } else {
                            return res.json({
                              Message: "Email not sent, please try later",
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
                  Message: "Invalid referral code",
                });
              }
            } else {
              var qrName = "Fidex:" + req.body.email;
              var secret = speakeasy.generateSecret({ length: 10 });

              const otpauth_url = speakeasy.otpauthURL({
                secret: secret.base32,
                label: qrName,
                issuer: 'Fidex',
                encoding: 'base32'
              });

              var tfa_url = common.getQrUrl(otpauth_url);
              var fou_digit = Math.floor(1000 + Math.random() * 9000);
              if (req.body.registertype == "Individuals") {
                var username = req.body.email.split("@")[0];
              } else {
                var username = req.body.name;
              }
              var referral_code = await new ShortUniqueId({ length: 8 });
              var uid = referral_code();
              var obj = {
                username: username,
                displayname: username,

                email: email,
                password: common.encrypt(req.body.password),

                tfa_url: tfa_url,
                mobileNumber: req.body.phonenumber,
                firstname: req.body.firstName,
                lastname: req.body.lastName,
                referral: req.body.referral_code,
                language: req.body.language,
                emailOtp: fou_digit,
                referralCode: uid,
                uuid: req.body.UUID,
                businessType: req.body.businesstype,
                businessName: req.body.businessname,
                incorporationPlace: req.body.incorporationplace,
                registerType: req.body.registertype,
                // verifyEmail  : 2
              };
              console.log("obj====", obj);
              let userSave = await usersDB.create(obj);

              if (userSave) {
                console.log("obj 11====", obj);
                let currencyData = await currencyDB.find({});
                console.log(currencyData, "currencyData")
                if (currencyData) {
                  var currencyArray = [];
                  for (var i = 0; i < currencyData.length; i++) {
                    var value = {
                      currencyId: currencyData[i]._id,
                      currencyName: currencyData[i].currencyName,
                      currencySymbol: currencyData[i].currencySymbol,
                      amount: 0,
                    };
                    currencyArray.push(value);
                  }
                  var wallet_obj = {
                    userId: userSave._id,
                    wallets: currencyArray,
                  };
                  console.log(wallet_obj, "wallet_obj")

                  let wall_data = await userWalletDB.create(wallet_obj);
                  console.log(wall_data, "wall_data")
                  if (wall_data) {
                    var email = common.decrypt(userSave.email);
                    var link1 =
                      process.env.BASE_URL +
                      "login?_activiation_" +
                      common.encrypt(userSave._id.toString());
                    var username = userSave.username;

                    let resData = await mailtempDB.findOne({ key: "OTP" });
                    if (resData) {
                      var reciver = req.body.email;
                      var etempdataDynamic = resData.body
                        .replace(/###OTP###/g, fou_digit)
                        .replace(/###USERNAME###/g, email);
                      usersDB
                        .findOneAndUpdate(
                          { _id: userSave._id },
                          { $set: { expireEmail: 0 } }
                        )
                        .exec(async (err, data) => {
                          var source = req.headers["user-agent"],
                            ua = useragent.parse(source);
                          var testip =
                            req.headers["x-forwarded-for"] ||
                            req.connection.remoteAddress;
                          var replaceipAdd = testip.replace("::ffff:", "");
                          var geo = await geoip.lookup(replaceipAdd);
                          let ip_address =
                            req.header("x-forwarded-for") ||
                            req.connection.remoteAddress;
                          var obj = {
                            ipAddress: ip_address,
                            browser: ua.browser,
                            OS: ua.os,
                            platform: ua.platform,
                            useremail: common.decrypt(data.email),
                            user_id: data._id,
                            location: geo !== null ? geo.country : "not found",
                            activitity: "Signup",
                            createdDate: new Date(),
                            modifiedDate: new Date(),
                          };
                          userLoginhistoryDB.create(
                            obj,
                            (his_err, historyData) => { }
                          );
                        });

                        var mailRes = await mail.sendMail(
                        {
                          from: {
                            name: process.env.FROM_NAME,
                            address: process.env.FROM_EMAIL,
                          },
                          to: reciver,
                          subject: resData.Subject,
                          html: etempdataDynamic,
                        });
                          if (mailRes != null) {
                            res.json({
                              status: true,
                              Message:
                                "Register successfully completed, OTP sent to your registered email",
                              email: email,
                              emailOtp: fou_digit,
                            });
                            usersDB
                              .updateOne(
                                { _id: userSave._id },
                                { $set: { expireEmail: 0 } }
                              )
                              .exec((err, data) => { });
                          } else {
                            return res.json({
                              Message: "Email not sent, please try later",
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
                    Message: "Please try again later",
                  });
                }
              } else {
                return res.json({
                  status: false,
                  Message: "Please try again later",
                });
              }
            }
          } else {
            return res.json({
              status: false,
              Message: "Email id already exists",
            });
          }
        } else {
          return res.json({
            status: false,
            Message: "Please try different Email ID",
          });
        }
      } else {
        return res.json({ status: false, Message: "Please try again later " });
      }
    } else {
      return res.json({ status: false, Message: "Please fill all fileds" });
    }
  } catch (error) {
    console.log("Error from Register:::", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/app_register", async (req, res) => {
  try {
    if (
      req.body.email != "" &&
      req.body.password != "" &&
      req.body.confirmPassword != ""
    ) {
      //if(req.body.password == req.body.confirmPassword ){

      var email = common.encrypt(req.body.email);
      let userData = await usersDB.findOne({ email: email });
      if (!userData) {
        var qrName = "SellCrypt:" + req.body.email;
        var secret = speakeasy.generateSecret({ length: 10 });

        const otpauth_url = speakeasy.otpauthURL({
          secret: secret.base32,
          label: qrName,
          issuer: 'SellCrypt',
          encoding: 'base32'
        });

        var tfa_url = common.getQrUrl(otpauth_url);
        var fou_digit = Math.floor(1000 + Math.random() * 9000);
        var username = req.body.email.split("@")[0];
        var obj = {
          username: username,
          email: common.encrypt(req.body.email),
          password: common.encrypt(req.body.password),
          tfaenablekey: secret.base32,
          tfa_url: tfa_url,
          mobileNumber: req.body.mobile,
          lastname: req.body.firstName,
          lastName: req.body.lastName,
          referral: req.body.referral,
          language: req.body.language,
          emailOtp: fou_digit,
        };
        let userSave = await usersDB.create(obj);

        if (userSave) {
          let currencyData = await currencyDB.find({});
          if (currencyData) {
            var currencyArray = [];
            for (var i = 0; i < currencyData.length; i++) {
              var value = {
                currencyId: currencyData[i]._id,
                currencyName: currencyData[i].currencyName,
                currencySymbol: currencyData[i].currencySymbol,
                amount: 0,
              };
              currencyArray.push(value);
            }
            var wallet_obj = {
              userId: userSave._id,
              wallets: currencyArray,
            };

            let wall_data = await userWalletDB.create(wallet_obj);
            if (wall_data) {
              var email = common.decrypt(userSave.email);
              var link1 =
                process.env.BASE_URL +
                "login?_activiation_" +
                common.encrypt(userSave._id.toString());
              var username = userSave.username;

              let resData = await mailtempDB.findOne({ key: "OTP" });
              if (resData) {
                var reciver = req.body.email;
                var etempdataDynamic = resData.body
                  .replace(/###OTP###/g, fou_digit)
                  .replace(/###USERNAME###/g, email);
                usersDB
                  .findOneAndUpdate(
                    { _id: userSave._id },
                    { $set: { expireEmail: 0 } }
                  )
                  .exec(async (err, data) => {
                    var source = req.headers["user-agent"],
                      ua = useragent.parse(source);
                    var testip =
                      req.headers["x-forwarded-for"] ||
                      req.connection.remoteAddress;
                    var replaceipAdd = testip.replace("::ffff:", "");
                    var geo = await geoip.lookup(replaceipAdd);
                    let ip_address =
                      req.header("x-forwarded-for") ||
                      req.connection.remoteAddress;
                    var obj = {
                      ipAddress: ip_address.replace("::ffff:", ""),
                      browser: ua.browser,
                      OS: ua.os,
                      platform: ua.platform,
                      useremail: common.decrypt(data.email),
                      user_id: data._id,
                      location: geo !== null ? geo.country : "not found",
                      activitity: "Signup",
                      createdDate: new Date(),
                      modifiedDate: new Date(),
                    };
                    userLoginhistoryDB.create(
                      obj,
                      (his_err, historyData) => { }
                    );
                  });

                  var mailRes = await mail.sendMail(
                    {
                      from: {
                        name: process.env.FROM_NAME,
                        address: process.env.FROM_EMAIL,
                      },
                      to: reciver,
                      subject: resData.Subject,
                      html: etempdataDynamic,
                    });
                    if (mailRes != null) {
                      res.json({
                        status: true,
                        Message:
                          "Register successfully completed, OTP sent to your registered email",
                        email: email,
                        emailOtp: fou_digit,
                      });
                      usersDB
                        .updateOne(
                          { _id: userSave._id },
                          { $set: { expireEmail: 0 } }
                        )
                        .exec((err, data) => { });
                    } else {
                      return res.json({
                        Message: "Email not sent, please try later",
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
        var status = userData.status == 1 ? false : true;
        return res.json({ status: status, Message: "Email id already exists" });
      }
    } else {
      return res.json({ status: false, Message: "Please fill all fileds" });
    }
  } catch (error) {
    // console.log("Error from Register:::", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/login", common.isEmpty, async (req, res) => {
  try {
    console.log(req.body, "req.body.----====");
    if (req.body.logintype == "Email") {
      if (
        req.body.email != "" &&
        req.body.password != "" &&
        req.body.email != undefined &&
        req.body.password != undefined
      ) {
        var domain = req.body.email.split("@")[1];
        if (domain) {
          let checkEmailDomain = await emailDomainDB
            .findOne({ email_domain: domain })
            .exec();
          // console.log(checkEmailDomain, "=-=-=-=checkEmailDomain");
          if (checkEmailDomain == null) {
            usersDB
              .findOne(
                { email: common.encrypt(req.body.email) },
                {
                  email: 1,
                  password: 1,
                  verifyEmail: 1,
                  tfastatus: 1,
                  tfaenablekey: 1,
                  account_status: 1,
                  status: 1,
                  loginattempt: 1,
                  logouttime: 1,
                  loginStatus: 1,
                }
              )
              .exec(async (err, data) => {
                // console.log(data, "dadatadfatyada");
                if (!err) {
                  if (data) {
                    if (data.account_status == 0) {
                      res.json({ status: false, Message: "User not found" });
                    } else if (
                      common.decrypt(data.password) != req.body.password
                    ) {
                      var login = await usersDB.updateOne(
                        { email: common.encrypt(req.body.email) },
                        { $inc: { loginattempt: 1 } }
                      );
                      if (data.loginattempt >= 5) {
                        var timing = new Date();
                        var timed = new Date(
                          Date.now(timing) + 1 * (60 * 60 * 1000)
                        );
                        if (data.loginattempt == 5) {
                          var logout = await usersDB.findOneAndUpdate(
                            { email: common.encrypt(req.body.email) },
                            { $set: { logouttime: timed } }
                          );
                          if (data.loginattempt == 5) {
                            var logout = await usersDB.findOneAndUpdate(
                              { email: common.encrypt(req.body.email) },
                              { $set: { logouttime: timed } }
                            );
                            return res.json({
                              status: false,
                              Message: "Too Many times Try to One Hour",
                            });
                          }
                          if (data.loginattempt >= 5) {
                            var date = new Date(timing).getTime();

                            var timestamp = await usersDB.findOne({
                              email: common.encrypt(req.body.email),
                            });

                            var dateing = new Date(timed).getTime();

                            const time1 = new Date(data.logouttime).getTime();
                            const timeDifference = time1 - date;
                            const minutesDifference = Math.floor(
                              timeDifference / (1000 * 60)
                            );
                            // console.log(minutesDifference,"minutesDifference")
                            // console.log(timeDifference,"timeDifference")
                            // console.log(new Date("2024-03-29T11:53:24.807+00:00").getTime(),"getTime1")
                            // console.log(new Date().getTime(),"getTime2")
                            if (date >= data.logouttime) {
                              var logout = await usersDB.updateOne(
                                { email: common.encrypt(req.body.email) },
                                { $set: { loginattempt: 0 } }
                              );
                            }
                            return res.json({
                              status: false,
                              Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                            });
                          }
                          return res.json({
                            status: false,
                            Message: "Too Many times Try to One Hour",
                          });
                        }
                        if (data.loginattempt >= 5) {
                          var date = new Date(timing).getTime();

                          var timestamp = await usersDB.findOne({
                            email: common.encrypt(req.body.email),
                          });

                          var dateing = new Date(timed).getTime();

                          const time1 = new Date(data.logouttime).getTime();
                          const timeDifference = time1 - date;
                          const minutesDifference = Math.floor(
                            timeDifference / (1000 * 60)
                          );
                          if (date >= data.logouttime) {
                            var logout = await usersDB.updateOne(
                              { email: common.encrypt(req.body.email) },
                              { $set: { loginattempt: 0 } }
                            );
                          }
                          return res.json({
                            status: false,
                            Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                          });
                        }
                        return res.json({
                          status: false,
                          Message:
                            "Password Incorrect. Please enter a valid password.",
                        });
                      }

                      res.json({
                        status: false,
                        Message:
                          "Password Incorrect. Please enter a valid password.",
                      });
                    } else if (common.decrypt(data.email) != req.body.email) {
                      res.json({ status: false, Message: "Invalid Email" });
                    } else if (data.verifyEmail == 0 || data.status == 0) {
                      res.json({
                        status: false,
                        Message:
                          "Please verify your account or contact the administrator for assistance.",
                      });
                    } else if (data.tfastatus == 1) {
                      if (data.loginattempt >= 5) {
                        var timing = new Date();
                        var date = new Date(timing).getTime();
                        const time1 = new Date(data.logouttime).getTime();
                        const timeDifference = time1 - date;
                        const minutesDifference = Math.floor(
                          timeDifference / (1000 * 60)
                        );
                        if (date >= data.logouttime) {
                          var logout = await usersDB.updateOne(
                            { email: common.encrypt(req.body.email) },
                            { $set: { loginattempt: 0 } }
                          );
                        } else {
                          return res.json({
                            status: false,
                            Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                          });
                        }
                      }

                      const ENCRYPTION_KEY = key.ENCRYPTION_KEY;
                      const IV_LENGTH = key.IV_LENGTH;
                      let iv = crypto.randomBytes(IV_LENGTH);
                      var cipher = crypto.createCipheriv(
                        "aes-256-ctr",
                        ENCRYPTION_KEY,
                        "S19h8AnT21H8n14I"
                      );
                      const payload = {
                        _id: data._id,
                      };
                      var token = jwt.sign(payload, jwt_secret);
                      var crypted = cipher.update(
                        token.toString(),
                        "utf8",
                        "hex"
                      );
                      crypted += cipher.final("hex");
                      var socketToken = common.encrypt(data._id.toString());
                      var timestamp = Date.now();
                      return res.json({
                        status: true,
                        token: crypted,
                        tfa: 1,
                        message: "Enter TFA to login",
                        socketToken: socketToken + "_" + timestamp,
                        tfa_key: data.tfaenablekey,
                        jwNkiKmttscotlox: data.kycstatus,
                      });
                    } else {
                      if (data.loginattempt >= 5) {
                        var timing = new Date();
                        var date = new Date(timing).getTime();
                        const time1 = new Date(data.logouttime).getTime();
                        const timeDifference = time1 - date;
                        const minutesDifference = Math.floor(
                          timeDifference / (1000 * 60)
                        );
                        if (date >= data.logouttime) {
                          var logout = await usersDB.updateOne(
                            { email: common.encrypt(req.body.email) },
                            { $set: { loginattempt: 0 } }
                          );
                        } else {
                          return res.json({
                            status: false,
                            Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                          });
                        }
                      }
                      let ip_address =
                        req.header("x-forwarded-for") ||
                        req.connection.remoteAddress;
                      const ID = common.encrypt(data._id.toString());
                      const success = socketconnect.emit("socketResponse3" + ID, {
                        message: `Someone try to login with your Credential in ${ip_address}`,
                      });
                      console.log(success, "success");
                      if (success == true) {
                        var source = req.headers["user-agent"],
                          ua = useragent.parse(source);
                        var testip =
                          req.headers["x-forwarded-for"] ||
                          req.connection.remoteAddress;
                        var replaceipAdd = testip.replace("::ffff:", "");
                        var geo = await geoip.lookup(replaceipAdd);
                        let ip_address =
                          req.header("x-forwarded-for") ||
                          req.connection.remoteAddress;
                        var findWallet = await userWalletDB
                          .findOne({ userId: data._id })
                          .exec();
                        if (findWallet == null && findWallet == undefined) {
                          var currencyArray = [];
                          let currencyData = await currencyDB.find({});
                          for (var i = 0; i < currencyData.length; i++) {
                            var value = {
                              currencyId: currencyData[i]._id,
                              currencyName: currencyData[i].currencyName,
                              currencySymbol: currencyData[i].currencySymbol,
                              amount: 0,
                            };
                            currencyArray.push(value);
                          }
                          var walletData = {
                            userId: data._id,
                            wallets: currencyArray,
                          };
                          var createWallet = await userWalletDB.create(
                            walletData
                          );
                        }
                        var obj = {
                          ipAddress: ip_address.replace("::ffff:", ""),
                          browser: ua.browser,
                          OS: ua.os,
                          platform: ua.platform,
                          useremail: common.decrypt(data.email),
                          user_id: data._id,
                          location: geo !== null ? geo.country : "not found",
                          activitity: "Login",
                          createdDate: new Date(),
                          modifiedDate: new Date(),
                        };
                        userLoginhistoryDB.create(
                          obj,
                          async (his_err, historyData) => {
                            if (!his_err) {
                              const payload = {
                                _id: data._id,
                              };
                              var token = jwt.sign(payload, jwt_secret);
                              var socketToken = common.encrypt(
                                data._id.toString()
                              );
                              var timestamp = Date.now();

                              var obj = {
                                to_user_id: ObjectId(data._id),
                                to_user_name: data.username,
                                status: 0,
                                IP: ip_address,
                                message: "Login successfully",
                                link: "/notificationHistory",
                              };

                              var login = await usersDB.updateOne(
                                { email: common.encrypt(req.body.email) },
                                { $set: { loginStatus: 1 } }
                              );
                              //console.log((obj, "objobjobj");
                              let notification = await notifydb.create(obj);
                              res.json({
                                status: true,
                                Message: "Login Successfull !",
                                token: token,
                                tfa: 0,
                                socketToken: socketToken + "_" + timestamp,
                                tfa_key: data.tfaenablekey,
                                jwNkiKmttscotlox: data.kycstatus,
                              });
                            } else {
                              res.json({
                                status: false,
                                Message:
                                  "Something went wrong,Please try again later",
                              });
                            }
                          }
                        );
                      }
                    }
                  } else {
                    res.json({ status: false, Message: "User not found" });
                  }
                } else {
                  res.json({ status: false, Message: "Please try later" });
                }
              });
          } else {
            return res.json({
              status: false,
              Message: "Please try different Email ID",
            });
          }
        } else {
          return res.json({ status: false, Message: "Please try again later" });
        }
      } else {
        res.json({ status: false, Message: "Please enter all required fields" });
      }
    } else if (req.body.logintype == "PhoneNumber") {
      if (
        req.body.phonenumber != "" &&
        req.body.password != "" &&
        req.body.phonenumber != undefined &&
        req.body.password != undefined
      ) {
        // var domain = req.body.email.split("@")[1];
        // if (domain) {
        //   let checkEmailDomain = await emailDomainDB
        //     .findOne({ email_domain: domain })
        //     .exec();
        // console.log(checkEmailDomain, "=-=-=-=checkEmailDomain");
        // if (checkEmailDomain == null) {
        usersDB
          .findOne(
            { mobileNumber: req.body.phonenumber },
            {
              mobileNumber: 1,
              email: 1,
              password: 1,
              verifyEmail: 1,
              tfastatus: 1,
              tfaenablekey: 1,
              account_status: 1,
              status: 1,
              loginattempt: 1,
              logouttime: 1,
              loginStatus: 1,
            }
          )
          .exec(async (err, data) => {
            // console.log(data, "dadatadfatyada");
            if (!err) {
              if (data) {
                if (data.account_status == 0) {
                  res.json({ status: false, Message: "User not found" });
                } else if (
                  common.decrypt(data.password) != req.body.password
                ) {
                  var login = await usersDB.updateOne(
                    { mobileNumber: req.body.phonenumber },
                    { $inc: { loginattempt: 1 } }
                  );
                  if (data.loginattempt >= 5) {
                    var timing = new Date();
                    var timed = new Date(
                      Date.now(timing) + 1 * (60 * 60 * 1000)
                    );
                    if (data.loginattempt == 5) {
                      var logout = await usersDB.findOneAndUpdate(
                        { mobileNumber: req.body.phonenumber },
                        { $set: { logouttime: timed } }
                      );
                      if (data.loginattempt == 5) {
                        var logout = await usersDB.findOneAndUpdate(
                          { mobileNumber: req.body.phonenumber },
                          { $set: { logouttime: timed } }
                        );
                        return res.json({
                          status: false,
                          Message: "Too Many times Try to One Hour",
                        });
                      }
                      if (data.loginattempt >= 5) {
                        var date = new Date(timing).getTime();

                        var timestamp = await usersDB.findOne({
                          mobileNumber: req.body.phonenumber,
                        });

                        var dateing = new Date(timed).getTime();

                        const time1 = new Date(data.logouttime).getTime();
                        const timeDifference = time1 - date;
                        const minutesDifference = Math.floor(
                          timeDifference / (1000 * 60)
                        );
                        // console.log(minutesDifference,"minutesDifference")
                        // console.log(timeDifference,"timeDifference")
                        // console.log(new Date("2024-03-29T11:53:24.807+00:00").getTime(),"getTime1")
                        // console.log(new Date().getTime(),"getTime2")
                        if (date >= data.logouttime) {
                          var logout = await usersDB.updateOne(
                            { mobileNumber: req.body.phonenumber },
                            { $set: { loginattempt: 0 } }
                          );
                        }
                        return res.json({
                          status: false,
                          Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                        });
                      }
                      return res.json({
                        status: false,
                        Message: "Too Many times Try to One Hour",
                      });
                    }
                    if (data.loginattempt >= 5) {
                      var date = new Date(timing).getTime();

                      var timestamp = await usersDB.findOne({
                        mobileNumber: req.body.phonenumber,
                      });

                      var dateing = new Date(timed).getTime();

                      const time1 = new Date(data.logouttime).getTime();
                      const timeDifference = time1 - date;
                      const minutesDifference = Math.floor(
                        timeDifference / (1000 * 60)
                      );
                      if (date >= data.logouttime) {
                        var logout = await usersDB.updateOne(
                          { mobileNumber: req.body.phonenumber },
                          { $set: { loginattempt: 0 } }
                        );
                      }
                      return res.json({
                        status: false,
                        Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                      });
                    }
                    return res.json({
                      status: false,
                      Message:
                        "Password Incorrect. Please enter a valid password.",
                    });
                  }

                  res.json({
                    status: false,
                    Message:
                      "Password Incorrect. Please enter a valid password.",
                  });
                } else if (data.mobileNumber != req.body.phonenumber) {
                  res.json({ status: false, Message: "Invalid Phonenumber" });
                } else if (data.verifyEmail == 0 || data.status == 0) {
                  res.json({
                    status: false,
                    Message:
                      "Please verify your account or contact the administrator for assistance.",
                  });
                } else if (data.tfastatus == 1) {
                  if (data.loginattempt >= 5) {
                    var timing = new Date();
                    var date = new Date(timing).getTime();
                    const time1 = new Date(data.logouttime).getTime();
                    const timeDifference = time1 - date;
                    const minutesDifference = Math.floor(
                      timeDifference / (1000 * 60)
                    );
                    if (date >= data.logouttime) {
                      var logout = await usersDB.updateOne(
                        { mobileNumber: req.body.phonenumber },
                        { $set: { loginattempt: 0 } }
                      );
                    } else {
                      return res.json({
                        status: false,
                        Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                      });
                    }
                  }

                  const ENCRYPTION_KEY = key.ENCRYPTION_KEY;
                  const IV_LENGTH = key.IV_LENGTH;
                  let iv = crypto.randomBytes(IV_LENGTH);
                  var cipher = crypto.createCipheriv(
                    "aes-256-ctr",
                    ENCRYPTION_KEY,
                    "S19h8AnT21H8n14I"
                  );
                  const payload = {
                    _id: data._id,
                  };
                  var token = jwt.sign(payload, jwt_secret);
                  var crypted = cipher.update(
                    token.toString(),
                    "utf8",
                    "hex"
                  );
                  crypted += cipher.final("hex");
                  var socketToken = common.encrypt(data._id.toString());
                  var timestamp = Date.now();
                  return res.json({
                    status: true,
                    token: crypted,
                    tfa: 1,
                    message: "Enter TFA to login",
                    socketToken: socketToken + "_" + timestamp,
                    tfa_key: data.tfaenablekey,
                    jwNkiKmttscotlox: data.kycstatus,
                  });
                } else {
                  if (data.loginattempt >= 5) {
                    var timing = new Date();
                    var date = new Date(timing).getTime();
                    const time1 = new Date(data.logouttime).getTime();
                    const timeDifference = time1 - date;
                    const minutesDifference = Math.floor(
                      timeDifference / (1000 * 60)
                    );
                    if (date >= data.logouttime) {
                      var logout = await usersDB.updateOne(
                        { mobileNumber: req.body.phonenumber },
                        { $set: { loginattempt: 0 } }
                      );
                    } else {
                      return res.json({
                        status: false,
                        Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                      });
                    }
                  }
                  let ip_address =
                    req.header("x-forwarded-for") ||
                    req.connection.remoteAddress;
                  const ID = common.encrypt(data._id.toString());
                  const success = socketconnect.emit("socketResponse3" + ID, {
                    message: `Someone try to login with your Credential in ${ip_address}`,
                  });
                  console.log(success, "success");
                  if (success == true) {
                    var source = req.headers["user-agent"],
                      ua = useragent.parse(source);
                    var testip =
                      req.headers["x-forwarded-for"] ||
                      req.connection.remoteAddress;
                    var replaceipAdd = testip.replace("::ffff:", "");
                    var geo = await geoip.lookup(replaceipAdd);
                    let ip_address =
                      req.header("x-forwarded-for") ||
                      req.connection.remoteAddress;
                    var findWallet = await userWalletDB
                      .findOne({ userId: data._id })
                      .exec();
                    if (findWallet == null && findWallet == undefined) {
                      var currencyArray = [];
                      let currencyData = await currencyDB.find({});
                      for (var i = 0; i < currencyData.length; i++) {
                        var value = {
                          currencyId: currencyData[i]._id,
                          currencyName: currencyData[i].currencyName,
                          currencySymbol: currencyData[i].currencySymbol,
                          amount: 0,
                        };
                        currencyArray.push(value);
                      }
                      var walletData = {
                        userId: data._id,
                        wallets: currencyArray,
                      };
                      var createWallet = await userWalletDB.create(
                        walletData
                      );
                    }
                    var obj = {
                      ipAddress: ip_address.replace("::ffff:", ""),
                      browser: ua.browser,
                      OS: ua.os,
                      platform: ua.platform,
                      useremail: common.decrypt(data.email),
                      user_id: data._id,
                      location: geo !== null ? geo.country : "not found",
                      activitity: "Login",
                      createdDate: new Date(),
                      modifiedDate: new Date(),
                    };
                    userLoginhistoryDB.create(
                      obj,
                      async (his_err, historyData) => {
                        if (!his_err) {
                          const payload = {
                            _id: data._id,
                          };
                          var token = jwt.sign(payload, jwt_secret);
                          var socketToken = common.encrypt(
                            data._id.toString()
                          );
                          var timestamp = Date.now();

                          var obj = {
                            to_user_id: ObjectId(data._id),
                            to_user_name: data.username,
                            status: 0,
                            IP: ip_address,
                            message: "Login successfully",
                            link: "/notificationHistory",
                          };

                          var login = await usersDB.updateOne(
                            { mobileNumber: req.body.phonenumber },
                            { $set: { loginStatus: 1 } }
                          );
                          //console.log((obj, "objobjobj");
                          let notification = await notifydb.create(obj);
                          res.json({
                            status: true,
                            Message: "Login Successfull !",
                            token: token,
                            tfa: 0,
                            socketToken: socketToken + "_" + timestamp,
                            tfa_key: data.tfaenablekey,
                            jwNkiKmttscotlox: data.kycstatus,
                          });
                        } else {
                          res.json({
                            status: false,
                            Message:
                              "Something went wrong,Please try again later",
                          });
                        }
                      }
                    );
                  }
                }
              } else {
                res.json({ status: false, Message: "User not found" });
              }
            } else {
              res.json({ status: false, Message: "Please try later" });
            }
          });
        // } else {
        //   return res.json({
        //     status: false,
        //     Message: "Please try different Email ID",
        //   });
        // }
      } else {
        return res.json({ status: false, Message: "Please try again later" });
      }
    } else {
      res.json({ status: false, Message: "Please enter all required fields" });
    }


  } catch (err) {
    // console.log(err, "error======");
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.get("/logout", common.tokenmiddleware, async (req, res) => {
  try {
    var login = await usersDB.updateOne(
      { _id: mongoose.Types.ObjectId(req.userId) },
      { $set: { loginStatus: 0 } }
    );

    //console.log((login, "login");

    if (login) {
      return res.status(200).json({
        message: "Logout Status Changed",
        success: true,
        loginstatus: 0,
      });
    } else {
      return res.status(200).json({
        message: "Something went wrong",
        success: false,
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.get("/find", common.tokenmiddleware, async (req, res) => {
  try {
    usersDB
      .findOne({ _id: mongoose.Types.ObjectId(req.userId) })
      .exec(function (error, response) {
        if (error || response == null) {
          return res
            .status(500)
            .json({ status: 500, message: "Internal Server Error" });
        } else {
          response.email = common.decrypt(response.email);
          if (
            response.tfaenablekey == "" ||
            response.tfaenablekey == null ||
            response.tfaenablekey == undefined
          ) {
            var qrName = "SellCrypt:" + common.decrypt(response.email);
            var secret = speakeasy.generateSecret({ length: 10 });

            const otpauth_url = speakeasy.otpauthURL({
              secret: secret.base32,
              label: qrName,
              issuer: 'SellCrypt',
              encoding: 'base32'
            });

            var tfa_url = common.getQrUrl(otpauth_url);
            updatedRule = { tfaenablekey: secret.base32, tfa_url: tfa_url };
            usersDB
              .updateOne(
                { _id: mongoose.Types.ObjectId(req.userId) },
                { $set: updatedRule }
              )
              .exec(function (errUpdate, resUpdate) {
                if (resUpdate.ok == 1) {
                }
              });
          }
          return res.status(200).json({
            message: "User Detail Successfully Retrieved",
            success: true,
            data: response,
          });
        }
      });
  } catch (err) {
    // console.log("err", err.message);
    return res.status(400).json({
      message: "Something went wrong !",
      success: false,
      error: err.message,
    });
  }
});

router.get("/getUserDetails", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId 
    client.hget('getUser', userId, async function(err, value) {
      if(value == null){
      userRedis.getUser(userId, function (datas){
          if(datas) {
            return res.json({ status : true, Message : JSON.parse(datas)  });
          }else{
            return res.json({ status : false, Message : {} });
          }
        });
      }else{
        return res.json({ status : true, Message : JSON.parse(value)});
      }
    });
  } catch (error) {
    return res.json({ status : false ,Message: "Oops!, Something went wrong"});
  }
});

// router.get("/getUserDetailss", common.tokenmiddleware, async (req, res) => {
//   try {
//     let response = await usersDB.findOne(
//       { _id: req.userId },
//       {
//         emailOtp: 0,
//         forgetOtp: 0,
//         otp: 0,
//         otpstatus: 0,
//         Addressproof: 0,
//         AddressproofStatus: 0,
//         IdProof: 0,
//         IdProofStatus: 0,
//         BankProof: 0,
//         BankProofStatus: 0,
//         password: 0,
//         _v: 0,
//       }
//     );
//     let lastLogin = await userLoginhistoryDB
//       .findOne({ user_id: req.userId }, { user_id: 0, _v: 0 })
//       .sort({ _id: -1 })
//       .limit(1);
//     console.log(response.referralCode, "response.referralCode");
//     var refer_link =
//       process.env.SITE_URL + "register?invite=" + response.referralCode;
//     var user_id = response._id.toString();
//     user_id = user_id.slice(-8);
//     return res.status(200).json({
//       message: "User Detail Successfully Retrieved",
//       status: true,
//       email: (response["email"] =
//         response.email != null
//           ? common.decrypt(response.email)
//           : response.mobileNumber),
//       data: response,
//       lastLogin: lastLogin,
//       refer_link: refer_link,
//       user_id: user_id,
//     });
//   } catch (err) {
//     return res.status(400).json({
//       message: "Something went wrong !",
//       status: false,
//       error: err.message,
//     });
//   }
// });

router.post("/update", common.tokenmiddleware, async (req, res) => {
  try {
    var updateobj = {
      mobileNumber: req.body.mobileNumber,
      Country: req.body.Country,
      language: req.body.language,
      url: req.body.url,
      username: req.body.username,
      lastname: req.body.lastname,
      firstname: req.body.firstname,
    };

    if (
      req.body.mobileNumber == "" ||
      req.body.Country == "" ||
      req.body.username == ""
    ) {
      return res.status(400).json({
        message: "Please enter all the required fields",
        success: false,
      });
    } else if (
      typeof +req.body.mobileNumber != "number" ||
      typeof req.body.Country != "string" ||
      typeof req.body.username != "string"
    ) {
      return res
        .status(400)
        .json({ message: "Please enter valid field values", success: false });
    } else {
      usersDB
        .findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(req.userId) },
          { $set: updateobj }
        )
        .exec(function (error, resp) {
          if (resp) {
            return res.status(200).json({
              message: "User Detail Updated",
              success: true,
              data: resp,
            });
          } else {
            return res
              .status(400)
              .json({ message: "User Detail Not Updated", success: false });
          }
        });
    }
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong !",
      success: false,
      error: err.message,
    });
  }
});

router.post("/getnotification", common.tokenmiddleware, async (req, res) => {
  try {
    // console.log("-------------", req.body);

    // var search = req.body.search;
    // var perPage = Number(req.body.perpage ? req.body.perpage : 5);
    // var page = Number(req.body.page ? req.body.page : 1);

    // var skippage = perPage * page - perPage;

    var notification = await notifydb
      .find({ to_user_id: req.userId })
      // .skip(skippage)
      // .limit(perPage)
      .sort({ _id: -1 })
      .exec();
    if (notification) {
      // console.log(notification, "[[][][][notify[][][][][");
      var pagedata = await notifydb.find({ to_user_id: req.userId }).count();
      // console.log(pagedata, "=-=-notifypagedata=-=");
      // console.log(page, "====page=====");
      var returnObj = {
        data: notification,
        // current: page,
        // pages: Math.ceil(pagedata / perPage),
        // total: pagedata,
      };
      let updateNotify = await notifydb.updateMany(
        { status: 0, to_user_id: req.userId },
        { $set: { status: 1 } }
      );
      return res.status(200).send({
        success: true,
        message: "Data Successfully retrieved",
        data: returnObj,
      });
    } else {
      return res
        .status(400)
        .send({ success: true, message: "Data Does Not retrieved" });
    }
  } catch (error) {
    console.log("ERROR FROM getSessionHisotry::", error);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

// router.post('/getUserBalance', common.tokenmiddleware, (req, res) => {
//   try {

//     var perPage = Number(req.body.perpage ? req.body.perpage : 0);
//     var page = Number(req.body.page ? req.body.page : 0);
//     if (typeof perPage !== 'undefined' && perPage !== '' && perPage > 0 && typeof page !== 'undefined' && page !== '' && page > 0) {
//       var skippage = (perPage * page) - perPage;

//       var search = req.body.search;
//       var filter = {}
//       if (search == '') {
//         filter = {
//           userId: mongoose.Types.ObjectId(req.userId),
//           'currdetail.status': 'Active',
//           'currdetail.depositStatus': 'Active'
//         }
//       } else {
//         filter = {
//           userId: mongoose.Types.ObjectId(req.userId),
//           'currdetail.status': 'Active',
//           'currdetail.depositStatus': 'Active',
//           $or: [
//             { 'wallets.currencyName': { $regex: new RegExp(search, "i") } },
//             { 'wallets.currencySymbol': { $regex: new RegExp(search, "i") } },
//           ]
//         }
//       }
//       // filter = {
//       //   userId: mongoose.Types.ObjectId(req.userId),
//       //   'currdetail.status': 'Active'
//       // }
//       userWalletDB.aggregate([{
//         $unwind: '$wallets'
//       },
//       {
//         $lookup: {
//           from: 'currency',
//           localField: 'wallets.currencyId',
//           foreignField: '_id',
//           as: 'currdetail'
//         }
//       },
//       {
//         $match: filter
//       },
//       {
//         $project: {
//           "currencyName": { $arrayElemAt: ['$currdetail.currencyName', 0] },
//           "currencysymbol": { $arrayElemAt: ['$currdetail.currencySymbol', 0] },
//           "currencyImage": { $arrayElemAt: ['$currdetail.Currency_image', 0] },
//           "currencyType": { $arrayElemAt: ['$currdetail.currencyType', 0] },
//           "depositStatus": { $arrayElemAt: ['$currdetail.depositStatus', 0] },
//           "withdrawStatus": { $arrayElemAt: ['$currdetail.withdrawStatus', 0] },
//           "tradeStatus": { $arrayElemAt: ['$currdetail.tradeStatus', 0] },
//           "currencyBalance": "$wallets.amount",
//           "holdAmount": "$wallets.holdAmount",
//           "exchangeAmount": "$wallets.exchangeAmount",
//           "p2p": "$wallets.p2p",
//           "p2phold": "$wallets.p2phold",
//           "launchPadAmount": "$wallets.launchPadAmount",
//           "currid": { $arrayElemAt: ['$currdetail._id', 0] },
//           "type": { $arrayElemAt: ['$currdetail.coinType', 0] },
//           "type": { $arrayElemAt: ['$currdetail.coinType', 0] },
//           "status": { $arrayElemAt: ['$currdetail.status', 0] },
//           "EstimatedRON": { $arrayElemAt: ['$currdetail.estimatedValueInRON', 0] },
//           "EstimatedEUR": { $arrayElemAt: ['$currdetail.estimatedValueInEUR', 0] },
//           "EstimatedBTC": { $arrayElemAt: ['$currdetail.estimatedValueInBTC', 0] },
//           "EstimatedUSDT": { $arrayElemAt: ['$currdetail.estimatedValueInUSDT', 0] },
//           "minWithdrawLimit": { $arrayElemAt: ['$currdetail.minWithdrawLimit', 0] },
//           "maxWithdrawLimit": { $arrayElemAt: ['$currdetail.maxWithdrawLimit', 0] },
//           "erc20token": { $arrayElemAt: ['$currdetail.erc20token', 0] },
//           "trc20token": { $arrayElemAt: ['$currdetail.trc20token', 0] },
//           "bep20token": { $arrayElemAt: ['$currdetail.bep20token', 0] },
//           "coinType": { $arrayElemAt: ['$currdetail.coinType', 0] },
//           "popularOrder": { $arrayElemAt: ['$currdetail.popularOrder', 0] },
//           "coin_price": { $arrayElemAt: ['$currdetail.coin_price', 0] }
//         }
//       },
//       { $sort: { currencyBalance: -1 } },
//       ]).skip(skippage).limit(perPage).exec(async (err, resData) => {
//         if (err) {
//           return res.status(200).json({ Message: err, code: 200, status: false });
//         } else {

//           client.hget('CurrencyConversion', 'allpair', async function (err, value) {
//             let redis_response = await JSON.parse(value);
//             if (redis_response != null && redis_response != "" && redis_response != undefined && Object.keys(redis_response).length > 0) {

//               var total_balance_usdt = 0;
//               var available_balance_usdt = 0;
//               var inorder_balance_usdt = 0;
//               var pushData = [];
//               for (var i = 0; i < resData.length; i++) {
//                 if (redis_response[resData[i].currencysymbol] != undefined) {

//                 resData[i].EstimatedUSDT = redis_response[resData[i].currencysymbol].USDT;
//                 }
//                 else
//                 {
//                     var pairname = resData[i].currencysymbol.toLowerCase()+'usdt';
//                     var result = await RedisService.hget("BINANCE-TICKERPRICE",pairname);
//                     if (result !== null) {

//                         resData[i].EstimatedUSDT = result.lastprice.lastprice;
//                     }
//                     else
//                     {
//                             var response = await RedisService.hget("GetTickerPrice",pairname.toLowerCase());
//                             if(response != null)
//                             {
//                                 resData[i].EstimatedUSDT = response.lastprice.lastprice;
//                             }
//                             else
//                             {
//                                 resData[i].EstimatedUSDT = resData[i].coin_price;
//                             }
//                     }

//                 }
//                 // console.log("resData[i].EstimatedUSDT====",resData[i].EstimatedUSDT);
//                   total_balance_usdt += (resData[i].currencyBalance + resData[i].holdAmount) * resData[i].EstimatedUSDT;
//                   available_balance_usdt += resData[i].currencyBalance * resData[i].EstimatedUSDT;
//                   inorder_balance_usdt += resData[i].holdAmount * resData[i].EstimatedUSDT;
//                   resData[i]['estimatedUSDTbalance'] = resData[i].EstimatedUSDT * resData[i].currencyBalance
//                   resData[i]['estimatedUSDThold'] = resData[i].EstimatedUSDT * resData[i].holdAmount
//                   resData[i]['estimatedUSDTtotal'] = (resData[i].EstimatedUSDT * resData[i].currencyBalance) + (resData[i].EstimatedUSDT * resData[i].holdAmount)
//                   resData[i]['currencyBalance'] = resData[i].currencyBalance
//                   resData[i]['holdAmount'] = resData[i].holdAmount
//                   resData[i]['totalBalance'] = resData[i].currencyBalance + resData[i].holdAmount
//                   pushData.push(resData[i]);
//               }
//               var balance = {
//                 total_balance_usdt: total_balance_usdt,
//                 available_balance_usdt: available_balance_usdt,
//                 inorder_balance_usdt: inorder_balance_usdt
//               }
//               //var walletcount = await userWalletDB.findOne({ userId: mongoose.Types.ObjectId(req.userId) }).exec();
//               var walletcount = await userWalletDB.aggregate([{
//                 $unwind: '$wallets'
//               },
//               {
//                 $lookup: {
//                   from: 'currency',
//                   localField: 'wallets.currencyId',
//                   foreignField: '_id',
//                   as: 'currdetail'
//                 }
//               },
//               {
//                 $match: filter
//               }
//               ]).exec();

//               //pushData.sort(function(a, b){return b.currencyBalance - a.currencyBalance});

//               var returnJson = {
//                 status: true,
//                 Message: pushData,
//                 total: walletcount.length,
//                 current: page,
//                 pages: Math.ceil(walletcount.length / perPage),
//                 balance: balance
//               }
//               return res.status(200).json(returnJson);
//             }
//           });
//         }
//       });
//     } else {
//       return res.status(200).json({ Message: 'Not Found', code: 400, status: false });
//     }
//   } catch (error) {
//     return res.status(500).json({ Message: "Internal server", code: 500, status: false });
//   }
// });
router.get("/get_p2p_active_currency", async (req, res) => {
  try {
    var get_p2p_active_currency = await currencyDB
      .find({ p2p_status: 1 })
      .exec();
    var get_p2p_fiat_currency = await currencyDB.find({ coinType: 2 }).exec();
    //console.log((
    //   get_p2p_active_currency,
    //   "get_p2p_active_currency=-=-=get_p2p_active_currency-=-=get_p2p_active_currency=-=-="
    // );
    if (get_p2p_active_currency) {
      return res.json({
        status: true,
        Message: { get_p2p_active_currency, get_p2p_fiat_currency },
      });
    } else {
      return res.json({ status: false, Message: "Something went wrong" });
    }
  } catch { }
});

router.post("/currencyConversion", async (req, res) => {
  try {
    var from = req.body.from;
    var to = req.body.to;
    var getCurrecy = await conversion.currencyConversion(from, to);
    //console.log((getCurrecy, "ppopopopop");
    if (getCurrecy) {
      return res.status(200).send({ status: true, Message: getCurrecy });
    } else {
      return res.status(200).send({ status: false, Message: 0 });
    }
  } catch (error) { }
});

router.post("/getUserTotalbalance", common.tokenmiddleware, (req, res) => {
  try {
    var perPage = Number(req.body.perpage ? req.body.perpage : 0);
    var page = Number(req.body.page ? req.body.page : 0);
    if (
      typeof perPage !== "undefined" &&
      perPage !== "" &&
      perPage > 0 &&
      typeof page !== "undefined" &&
      page !== "" &&
      page > 0
    ) {
      var skippage = perPage * page - perPage;

      var search = req.body.search;
      var filter = {};
      if (search == "") {
        filter = {
          userId: mongoose.Types.ObjectId(req.userId),
          "currdetail.status": "Active",
          "currdetail.depositStatus": "Active",
        };
      } else {
        filter = {
          userId: mongoose.Types.ObjectId(req.userId),
          "currdetail.status": "Active",
          "currdetail.depositStatus": "Active",
          $or: [
            { "wallets.currencyName": { $regex: new RegExp(search, "i") } },
            { "wallets.currencySymbol": { $regex: new RegExp(search, "i") } },
          ],
        };
      }
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
            $match: filter,
          },
          {
            $project: {
              currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
              currencysymbol: {
                $arrayElemAt: ["$currdetail.currencySymbol", 0],
              },
              currencyImage: {
                $arrayElemAt: ["$currdetail.Currency_image", 0],
              },
              currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
              depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
              withdrawStatus: {
                $arrayElemAt: ["$currdetail.withdrawStatus", 0],
              },
              tradeStatus: { $arrayElemAt: ["$currdetail.tradeStatus", 0] },
              currencyBalance: "$wallets.amount",
              holdAmount: "$wallets.holdAmount",
              exchangeAmount: "$wallets.exchangeAmount",
              p2p: "$wallets.p2p",
              p2phold: "$wallets.p2phold",
              future: "$wallets.future",
              launchPadAmount: "$wallets.launchPadAmount",
              currid: { $arrayElemAt: ["$currdetail._id", 0] },
              type: { $arrayElemAt: ["$currdetail.coinType", 0] },
              type: { $arrayElemAt: ["$currdetail.coinType", 0] },
              status: { $arrayElemAt: ["$currdetail.status", 0] },
              EstimatedRON: {
                $arrayElemAt: ["$currdetail.estimatedValueInRON", 0],
              },
              EstimatedEUR: {
                $arrayElemAt: ["$currdetail.estimatedValueInEUR", 0],
              },
              EstimatedBTC: {
                $arrayElemAt: ["$currdetail.estimatedValueInBTC", 0],
              },
              EstimatedUSDT: {
                $arrayElemAt: ["$currdetail.estimatedValueInUSDT", 0],
              },
              minWithdrawLimit: {
                $arrayElemAt: ["$currdetail.minWithdrawLimit", 0],
              },
              maxWithdrawLimit: {
                $arrayElemAt: ["$currdetail.maxWithdrawLimit", 0],
              },
              erc20token: { $arrayElemAt: ["$currdetail.erc20token", 0] },
              trc20token: { $arrayElemAt: ["$currdetail.trc20token", 0] },
              bep20token: { $arrayElemAt: ["$currdetail.bep20token", 0] },
              coinType: { $arrayElemAt: ["$currdetail.coinType", 0] },
              popularOrder: { $arrayElemAt: ["$currdetail.popularOrder", 0] },
              coin_price: { $arrayElemAt: ["$currdetail.coin_price", 0] },
            },
          },
          { $sort: { currencyBalance: -1 } },
        ])
        .exec(async (err, resData) => {
          if (err) {
            return res
              .status(200)
              .json({ Message: err, code: 200, status: false });
          } else {
            client.hget(
              "CurrencyConversion",
              "allpair",
              async function (err, value) {
                let redis_response = await JSON.parse(value);
                // console.log("get user balance redis response ====",redis_response)
                if (
                  redis_response != null &&
                  redis_response != "" &&
                  redis_response != undefined &&
                  Object.keys(redis_response).length > 0
                ) {
                  var total_balance_usdt = 0;
                  var available_balance_usdt = 0;
                  var inorder_balance_usdt = 0;
                  var pushData = [];
                  for (var i = 0; i < resData.length; i++) {
                    if (
                      redis_response[resData[i].currencysymbol] != undefined
                    ) {
                      //console.log("calll 1111")
                      resData[i].EstimatedUSDT =
                        redis_response[resData[i].currencysymbol].USDT;
                    } else {
                      // console.log("calll 222")
                      var pairname =
                        resData[i].currencysymbol.toLowerCase() + "usdt";
                      var result = await RedisService.hget(
                        "BINANCE-TICKERPRICE",
                        pairname
                      );
                      if (result !== null) {
                        resData[i].EstimatedUSDT = result.lastprice.lastprice;
                      } else {
                        var response = await RedisService.hget(
                          "GetTickerPrice",
                          pairname.toLowerCase()
                        );
                        if (response != null) {
                          resData[i].EstimatedUSDT =
                            response.lastprice.lastprice;
                        } else {
                          resData[i].EstimatedUSDT = resData[i].coin_price;
                        }
                      }
                      //binancefn.CurrencyConversion();
                    }
                    //console.log("resData[i].EstimatedUSDT====",resData[i].EstimatedUSDT);
                    total_balance_usdt +=
                      (resData[i].currencyBalance + resData[i].holdAmount) *
                      resData[i].EstimatedUSDT;
                    available_balance_usdt +=
                      resData[i].currencyBalance * resData[i].EstimatedUSDT;
                    inorder_balance_usdt +=
                      resData[i].holdAmount * resData[i].EstimatedUSDT;
                    resData[i]["estimatedUSDTbalance"] =
                      resData[i].EstimatedUSDT * resData[i].currencyBalance;
                    resData[i]["estimatedUSDThold"] =
                      resData[i].EstimatedUSDT * resData[i].holdAmount;
                    resData[i]["estimatedUSDTtotal"] =
                      resData[i].EstimatedUSDT * resData[i].currencyBalance +
                      resData[i].EstimatedUSDT * resData[i].holdAmount;
                    resData[i]["currencyBalance"] = resData[i].currencyBalance;
                    resData[i]["holdAmount"] = resData[i].holdAmount;
                    resData[i]["totalBalance"] =
                      resData[i].currencyBalance + resData[i].holdAmount;
                    pushData.push(resData[i]);
                  }
                  var balance = {
                    available_balance:
                      available_balance_usdt == undefined
                        ? 0
                        : available_balance_usdt,
                    total_balance:
                      total_balance_usdt == undefined ? 0 : total_balance_usdt,
                    inorder_balance:
                      inorder_balance_usdt == undefined
                        ? 0
                        : inorder_balance_usdt,
                  };
                  //var walletcount = await userWalletDB.findOne({ userId: mongoose.Types.ObjectId(req.userId) }).exec();
                  var walletcount = await userWalletDB
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
                        $match: filter,
                      },
                    ])
                    .exec();

                  //pushData.sort(function(a, b){return b.currencyBalance - a.currencyBalance});

                  var returnJson = {
                    status: true,
                    Message: pushData,
                    total: walletcount.length,
                    current: page,
                    pages: Math.ceil(walletcount.length / perPage),
                    balance: balance,
                  };
                  return res.status(200).json(returnJson);
                } else {
                  //console.log(("call currency conversion");
                  common.currency_conversion(async function (response) {
                    //console.log(("call currency conversion", response);
                    if (response.status) {
                      let redis_response1 = response.message;
                      //console.log((
                      //   "get user balance redis response ====",
                      //   redis_response
                      // );
                      if (
                        redis_response1 != null &&
                        redis_response1 != "" &&
                        redis_response1 != undefined &&
                        Object.keys(redis_response1).length > 0
                      ) {
                        var total_balance_usdt = 0;
                        var available_balance_usdt = 0;
                        var inorder_balance_usdt = 0;
                        var pushData = [];
                        for (var i = 0; i < resData.length; i++) {
                          if (
                            redis_response1[resData[i].currencysymbol] !=
                            undefined
                          ) {
                            //console.log("calll 1111")
                            resData[i].EstimatedUSDT =
                              redis_response1[resData[i].currencysymbol].USDT;
                          } else {
                            // console.log("calll 222")
                            var pairname =
                              resData[i].currencysymbol.toLowerCase() + "usdt";
                            var pair_result = await RedisService.hget(
                              "BINANCE-TICKERPRICE",
                              pairname
                            );
                            if (pair_result !== null) {
                              resData[i].EstimatedUSDT =
                                pair_result.lastprice.lastprice;
                            } else {
                              var pair_response = await RedisService.hget(
                                "GetTickerPrice",
                                pairname.toLowerCase()
                              );
                              if (pair_response != null) {
                                resData[i].EstimatedUSDT =
                                  pair_response.lastprice.lastprice;
                              } else {
                                resData[i].EstimatedUSDT =
                                  resData[i].coin_price;
                              }
                            }
                            //binancefn.CurrencyConversion();
                          }
                          //console.log("resData[i].EstimatedUSDT====",resData[i].EstimatedUSDT);
                          total_balance_usdt +=
                            (resData[i].currencyBalance +
                              resData[i].holdAmount) *
                            resData[i].EstimatedUSDT;
                          available_balance_usdt +=
                            resData[i].currencyBalance *
                            resData[i].EstimatedUSDT;
                          inorder_balance_usdt +=
                            resData[i].holdAmount * resData[i].EstimatedUSDT;
                          resData[i]["estimatedUSDTbalance"] =
                            resData[i].EstimatedUSDT *
                            resData[i].currencyBalance;
                          resData[i]["estimatedUSDThold"] =
                            resData[i].EstimatedUSDT * resData[i].holdAmount;
                          resData[i]["estimatedUSDTtotal"] =
                            resData[i].EstimatedUSDT *
                            resData[i].currencyBalance +
                            resData[i].EstimatedUSDT * resData[i].holdAmount;
                          resData[i]["currencyBalance"] =
                            resData[i].currencyBalance;
                          resData[i]["holdAmount"] = resData[i].holdAmount;
                          resData[i]["totalBalance"] =
                            resData[i].currencyBalance + resData[i].holdAmount;
                          pushData.push(resData[i]);
                        }
                        var balance = {
                          available_balance: available_balance_usdt,
                          total_balance: total_balance_usdt,
                          inorder_balance: inorder_balance_usdt,
                        };
                        //var walletcount = await userWalletDB.findOne({ userId: mongoose.Types.ObjectId(req.userId) }).exec();
                        var walletcount = await userWalletDB
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
                              $match: filter,
                            },
                          ])
                          .exec();

                        //pushData.sort(function(a, b){return b.currencyBalance - a.currencyBalance});

                        var returnJson = {
                          status: true,
                          Message: pushData,
                          total: walletcount.length,
                          current: page,
                          pages: Math.ceil(walletcount.length / perPage),
                          balance: balance,
                        };
                        return res.status(200).json(returnJson);
                      }
                    }
                  });
                }
              }
            );
          }
        });
    } else {
      //console.log(("calll get balance 1111");
      return res
        .status(200)
        .json({ Message: "Not Found", code: 400, status: false });
    }
  } catch (error) {
    //console.log(("catch error getbalance====", error.message);
    common.create_log(error.message, function (resp) { });
    return res
      .status(500)
      .json({ Message: "Internal server", code: 500, status: false });
  }
});


//getBalance  // TECH LEAD //


router.post('/balanceOverallBalance', common.tokenmiddleware, async (req, res) => {

  try {
    var userId = req.userId;
    console.log(userId,'=-=-=userId=-=-userId');
    var fromCurrency = req.body.currency;
    console.log(fromCurrency,'=-=-=-=-=-=fromCurrency')
    const wallets = await userWalletDB.findOne({ userId: userId}).exec();
    if(wallets){
    if(wallets.wallets.length>0){
      var datas = wallets.wallets
      var toCurrency = [];
      for(var i=0; i<datas.length; i++){
        var obj = {
          currency : datas[i].currencySymbol,
          amount : datas[i].amount,
          holdAmount : datas[i].holdAmount,
          exchangeAmount : datas[i].exchangeAmount,
          withdrawAmount : datas[i].withdrawAmount,
          p2p : datas[i].p2p,
          p2phold : datas[i].p2phold,
          margin : datas[i].margin,
          marginhold : datas[i].marginhold,
          stakeAmount : datas[i].stakeAmount,
          stakeHold : datas[i].stakeHold,
        }
        toCurrency.push(obj);
      }
      const formattedString = `{${toCurrency.map(item => item.currency).join(',')}}`;
      console.log(formattedString, '0-0-0toCurrencytoCurrencytoCurrencye-0');
      var sec = "ETH"
      let response = await axios("https://min-api.cryptocompare.com/data/pricemulti?fsyms="+fromCurrency+"&tsyms=BTC,ETH,USDT,BNB,TRX,MATIC,DOGE,SHIB,DAI,USD,JST,LTC&api_key=7476cdfd4a6e56559cdcb67faa3631483f3a5052ab2f8e3a711ad06e1e779931");
      if(response){
      // console.log(response.data['BTC'],'=-=-responseresponseresponse-=-');
      var convertion = response.data;
      var amount = 0
      var portFolio = [];
      var notAvailable = [];
        for(var j=0; j<toCurrency.length; j++){
        console.log(typeof convertion[fromCurrency][toCurrency[j].currency]);
        if(convertion[fromCurrency][toCurrency[j].currency] != "" && convertion[fromCurrency][toCurrency[j].currency] != undefined && convertion[fromCurrency][toCurrency[j].currency] != null){
        var obj = {
        currency     : toCurrency[j].currency,
        amount       : toCurrency[j].amount,
        holdAmount   : toCurrency[j].holdAmount,
        p2p          : toCurrency[j].p2p ,
        p2phold      : toCurrency[j].p2phold,
        margin       : toCurrency[j].margin,
        marginhold   : toCurrency[j].marginhold,
        stakeAmount  : toCurrency[j].stakeAmount,
        stakeHold    : toCurrency[j].stakeHold,
        total        : toCurrency[j].amount+  toCurrency[j].holdAmount+ toCurrency[j].p2p+ toCurrency[j].p2phold + toCurrency[j].margin + toCurrency[j].marginhold + toCurrency[j].stakeAmount + toCurrency[j].stakeHold,
        marketprice  : convertion[fromCurrency][toCurrency[j].currency],
        value        : (toCurrency[j].amount+ toCurrency[j].holdAmount+  toCurrency[j].p2p+ toCurrency[j].p2phold + toCurrency[j].margin + toCurrency[j].marginhold + toCurrency[j].stakeAmount + toCurrency[j].stakeHold)/convertion[fromCurrency][toCurrency[j].currency]
        // total :  
        }

        }else{
        var objNot ={
        currency     : toCurrency[j].currency,
        amount :  toCurrency[j].amount,
        }
        notAvailable.push(objNot)
        }
        portFolio.push(obj);
        }
        // Use reduce to calculate the total amount and hold
        const totals = portFolio.reduce(
        (accumulator, current) => {
        // accumulator.Total +=  current.Total 
        accumulator.amount +=  current.amount
        accumulator.holdAmount +=current.holdAmount;
        accumulator.p2p +=current.p2p;
        accumulator.p2phold +=current.p2phold;
        accumulator.margin += current.margin;
        accumulator.stakeAmount += current.stakeAmount;
        accumulator.stakeHold += current.stakeHold;
        accumulator.marginhold += current.marginhold;
        accumulator.value += current.value;

        return accumulator;
        },
        {value:0, amount: 0, holdAmount: 0 , margin: 0, p2p: 0, p2phold: 0, stakeAmount: 0, stakeHold: 0, marginhold : 0} // Initial accumulator values
        );
        var convertedValue = {
        overallValues : Number(totals.amount) + Number(totals.holdAmount) + Number(totals.margin) + Number(totals.p2p) + Number(totals.stakeAmount) +  Number(totals.stakeHold),
        spot : totals.amount +totals.holdAmount,
        funding : totals.p2p + totals.p2phold,
        staking : totals.stakeAmount + totals.stakeHold,
        margin : totals.margin + totals.marginhold,
        }
                // Get the current timestamp
        const currentTimestamp = Date.now();

        // Calculate the timestamp for 24 hours ago (24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
        const oneDayInMilliseconds = 12 * 60 * 60 * 1000;
        const last24HoursTimestamp = currentTimestamp - oneDayInMilliseconds;

        // Display the results
        console.log("Current Timestamp:", currentTimestamp);
        console.log("Timestamp 24 Hours Ago:", last24HoursTimestamp);

        // resData[i].currencysymbol.toLowerCase() + "usdt";
        let pnl = await axios("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime="+last24HoursTimestamp+"&endTime="+last24HoursTimestamp);
        if(pnl){
          console.log(pnl.data,'=-==-result-=-=-result=-=-=result-=-=-');
          return res.json({status : true, coinView : convertedValue, walletView : portFolio, overallValue : totals});

        }else{
          return res.json({status : false, coinView : {}, walletView : {}, overallValue : {}});
        }
      }else {
        return res.json({status : false, coinView : {}, walletView : {}, overallValue : {}});
      }
    }else{
      return res.json({status : false, coinView : {}, walletView : {}, overallValue : {}});    }
    }else {
      return res.json({status : false, Message: "No wallet records found for this user"});
    }
  } catch (error) {
    console.log( error,'0-0-0-**&&&&&******e-0');
    common.create_log(error.message, function (resp) { });
    return res.status(500).json({ Message: "Internal server", code: 500, status: false  ,error:error})
  }
});

router.post("/getUserBalance", common.tokenmiddleware, (req, res) => {
  try {
    var perPage = Number(req.body.perpage ? req.body.perpage : 0);
    var page = Number(req.body.page ? req.body.page : 0);
    if (
      typeof perPage !== "undefined" &&
      perPage !== "" &&
      perPage > 0 &&
      typeof page !== "undefined" &&
      page !== "" &&
      page > 0
    ) {
      var skippage = perPage * page - perPage;

      var search = req.body.search;
      var filter = {};
      if (search == "") {
        filter = {
          userId: mongoose.Types.ObjectId(req.userId),
          "currdetail.status": "Active",
          "currdetail.depositStatus": "Active",
        };
      } else {
        filter = {
          userId: mongoose.Types.ObjectId(req.userId),
          "currdetail.status": "Active",
          "currdetail.depositStatus": "Active",
          $or: [
            { "wallets.currencyName": { $regex: new RegExp(search, "i") } },
            { "wallets.currencySymbol": { $regex: new RegExp(search, "i") } },
          ],
        };
      }
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
            $match: filter,
          },
          {
            $project: {
              currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
              currencysymbol: {
                $arrayElemAt: ["$currdetail.currencySymbol", 0],
              },
              currencyImage: {
                $arrayElemAt: ["$currdetail.Currency_image", 0],
              },
              currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
              depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
              withdrawStatus: {
                $arrayElemAt: ["$currdetail.withdrawStatus", 0],
              },
              tradeStatus: { $arrayElemAt: ["$currdetail.tradeStatus", 0] },
              currencyBalance: "$wallets.amount",
              holdAmount: "$wallets.holdAmount",
              exchangeAmount: "$wallets.exchangeAmount",
              p2p: "$wallets.p2p",
              p2phold: "$wallets.p2phold",
              launchPadAmount: "$wallets.launchPadAmount",
              currid: { $arrayElemAt: ["$currdetail._id", 0] },
              type: { $arrayElemAt: ["$currdetail.coinType", 0] },
              type: { $arrayElemAt: ["$currdetail.coinType", 0] },
              status: { $arrayElemAt: ["$currdetail.status", 0] },
              EstimatedRON: {
                $arrayElemAt: ["$currdetail.estimatedValueInRON", 0],
              },
              EstimatedEUR: {
                $arrayElemAt: ["$currdetail.estimatedValueInEUR", 0],
              },
              EstimatedBTC: {
                $arrayElemAt: ["$currdetail.estimatedValueInBTC", 0],
              },
              EstimatedUSDT: {
                $arrayElemAt: ["$currdetail.estimatedValueInUSDT", 0],
              },
              minWithdrawLimit: {
                $arrayElemAt: ["$currdetail.minWithdrawLimit", 0],
              },
              maxWithdrawLimit: {
                $arrayElemAt: ["$currdetail.maxWithdrawLimit", 0],
              },
              erc20token: { $arrayElemAt: ["$currdetail.erc20token", 0] },
              trc20token: { $arrayElemAt: ["$currdetail.trc20token", 0] },
              bep20token: { $arrayElemAt: ["$currdetail.bep20token", 0] },
              coinType: { $arrayElemAt: ["$currdetail.coinType", 0] },
              popularOrder: { $arrayElemAt: ["$currdetail.popularOrder", 0] },
              coin_price: { $arrayElemAt: ["$currdetail.coin_price", 0] },
            },
          },
          { $sort: { currencyBalance: -1 } },
        ])
        .exec(async (err, resData) => {
          if (err) {
            return res
              .status(200)
              .json({ Message: err, code: 200, status: false });
          } else {
            client.hget(
              "CurrencyConversion",
              "allpair",
              async function (err, value) {
                let redis_response = await JSON.parse(value);
                // console.log("get user balance redis response ====",redis_response)
                if (
                  redis_response != null &&
                  redis_response != "" &&
                  redis_response != undefined &&
                  Object.keys(redis_response).length > 0
                ) {
                  var total_balance_usdt = 0;
                  var available_balance_usdt = 0;
                  var inorder_balance_usdt = 0;
                  var pushData = [];
                  for (var i = 0; i < resData.length; i++) {
                    if (
                      redis_response[resData[i].currencysymbol] != undefined
                    ) {
                      //console.log("calll 1111")
                      resData[i].EstimatedUSDT =
                        redis_response[resData[i].currencysymbol].USDT;
                    } else {
                      // console.log("calll 222")
                      var pairname =
                        resData[i].currencysymbol.toLowerCase() + "usdt";
                      var result = await RedisService.hget(
                        "BINANCE-TICKERPRICE",
                        pairname
                      );
                      if (result !== null) {
                        resData[i].EstimatedUSDT = result.lastprice.lastprice;
                      } else {
                        var response = await RedisService.hget(
                          "GetTickerPrice",
                          pairname.toLowerCase()
                        );
                        if (response != null) {
                          resData[i].EstimatedUSDT =
                            response.lastprice.lastprice;
                        } else {
                          resData[i].EstimatedUSDT = resData[i].coin_price;
                        }
                      }
                      //binancefn.CurrencyConversion();
                    }
                    //console.log("resData[i].EstimatedUSDT====",resData[i].EstimatedUSDT);
                    total_balance_usdt +=
                      (resData[i].currencyBalance + resData[i].holdAmount) *
                      resData[i].EstimatedUSDT;
                    available_balance_usdt +=
                      resData[i].currencyBalance * resData[i].EstimatedUSDT;
                    inorder_balance_usdt +=
                      resData[i].holdAmount * resData[i].EstimatedUSDT;
                    resData[i]["estimatedUSDTbalance"] =
                      resData[i].EstimatedUSDT * resData[i].currencyBalance;
                    resData[i]["estimatedUSDThold"] =
                      resData[i].EstimatedUSDT * resData[i].holdAmount;
                    resData[i]["estimatedUSDTtotal"] =
                      resData[i].EstimatedUSDT * resData[i].currencyBalance +
                      resData[i].EstimatedUSDT * resData[i].holdAmount;
                    resData[i]["currencyBalance"] = resData[i].currencyBalance;
                    resData[i]["holdAmount"] = resData[i].holdAmount;
                    resData[i]["totalBalance"] =
                      resData[i].currencyBalance + resData[i].holdAmount;
                    pushData.push(resData[i]);
                  }
                  var balance = {
                    available_balance:
                      available_balance_usdt == undefined
                        ? 0
                        : available_balance_usdt,
                    total_balance:
                      total_balance_usdt == undefined ? 0 : total_balance_usdt,
                    inorder_balance:
                      inorder_balance_usdt == undefined
                        ? 0
                        : inorder_balance_usdt,
                  };
                  //var walletcount = await userWalletDB.findOne({ userId: mongoose.Types.ObjectId(req.userId) }).exec();
                  var walletcount = await userWalletDB
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
                        $match: filter,
                      },
                    ])
                    .exec();

                  //pushData.sort(function(a, b){return b.currencyBalance - a.currencyBalance});

                  var returnJson = {
                    status: true,
                    Message: pushData,
                    total: walletcount.length,
                    current: page,
                    pages: Math.ceil(walletcount.length / perPage),
                    balance: balance,
                  };
                  return res.status(200).json(returnJson);
                } else {
                  //console.log(("call currency conversion");
                  common.currency_conversion(async function (response) {
                    //console.log(("call currency conversion", response);
                    if (response.status) {
                      let redis_response1 = response.message;
                      //console.log((
                      //   "get user balance redis response ====",
                      //   redis_response
                      // );
                      if (
                        redis_response1 != null &&
                        redis_response1 != "" &&
                        redis_response1 != undefined &&
                        Object.keys(redis_response1).length > 0
                      ) {
                        var total_balance_usdt = 0;
                        var available_balance_usdt = 0;
                        var inorder_balance_usdt = 0;
                        var pushData = [];
                        for (var i = 0; i < resData.length; i++) {
                          if (
                            redis_response1[resData[i].currencysymbol] !=
                            undefined
                          ) {
                            //console.log("calll 1111")
                            resData[i].EstimatedUSDT =
                              redis_response1[resData[i].currencysymbol].USDT;
                          } else {
                            // console.log("calll 222")
                            var pairname =
                              resData[i].currencysymbol.toLowerCase() + "usdt";
                            var pair_result = await RedisService.hget(
                              "BINANCE-TICKERPRICE",
                              pairname
                            );
                            if (pair_result !== null) {
                              resData[i].EstimatedUSDT =
                                pair_result.lastprice.lastprice;
                            } else {
                              var pair_response = await RedisService.hget(
                                "GetTickerPrice",
                                pairname.toLowerCase()
                              );
                              if (pair_response != null) {
                                resData[i].EstimatedUSDT =
                                  pair_response.lastprice.lastprice;
                              } else {
                                resData[i].EstimatedUSDT =
                                  resData[i].coin_price;
                              }
                            }
                            //binancefn.CurrencyConversion();
                          }
                          //console.log("resData[i].EstimatedUSDT====",resData[i].EstimatedUSDT);
                          total_balance_usdt +=
                            (resData[i].currencyBalance +
                              resData[i].holdAmount) *
                            resData[i].EstimatedUSDT;
                          available_balance_usdt +=
                            resData[i].currencyBalance *
                            resData[i].EstimatedUSDT;
                          inorder_balance_usdt +=
                            resData[i].holdAmount * resData[i].EstimatedUSDT;
                          resData[i]["estimatedUSDTbalance"] =
                            resData[i].EstimatedUSDT *
                            resData[i].currencyBalance;
                          resData[i]["estimatedUSDThold"] =
                            resData[i].EstimatedUSDT * resData[i].holdAmount;
                          resData[i]["estimatedUSDTtotal"] =
                            resData[i].EstimatedUSDT *
                            resData[i].currencyBalance +
                            resData[i].EstimatedUSDT * resData[i].holdAmount;
                          resData[i]["currencyBalance"] =
                            resData[i].currencyBalance;
                          resData[i]["holdAmount"] = resData[i].holdAmount;
                          resData[i]["totalBalance"] =
                            resData[i].currencyBalance + resData[i].holdAmount;
                          pushData.push(resData[i]);
                        }
                        var balance = {
                          available_balance: available_balance_usdt,
                          total_balance: total_balance_usdt,
                          inorder_balance: inorder_balance_usdt,
                        };
                        //var walletcount = await userWalletDB.findOne({ userId: mongoose.Types.ObjectId(req.userId) }).exec();
                        var walletcount = await userWalletDB
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
                              $match: filter,
                            },
                          ])
                          .exec();

                        //pushData.sort(function(a, b){return b.currencyBalance - a.currencyBalance});

                        var returnJson = {
                          status: true,
                          Message: pushData,
                          total: walletcount.length,
                          current: page,
                          pages: Math.ceil(walletcount.length / perPage),
                          balance: balance,
                        };
                        return res.status(200).json(returnJson);
                      }
                    }
                  });
                }
              }
            );
          }
        });
    } else {
      //console.log(("calll get balance 1111");
      return res
        .status(200)
        .json({ Message: "Not Found", code: 400, status: false });
    }
  } catch (error) {
    //console.log(("catch error getbalance====", error.message);
    common.create_log(error.message, function (resp) { });
    return res
      .status(500)
      .json({ Message: "Internal server", code: 500, status: false });
  }
});

router.get("/testorderbook", async (req, res) => {
  var data = binancefn.currentOrderBook();
  let getData = await RedisService.hget("BINANCE", "btceur");
  res.json({ Message: "success", code: 200, getData });
});

router.post("/changepswdlink", async (req, res) => {
  try {
    var email = req.body.email;
    var enemail = common.encrypt(email);
    var findemail = common.encrypt(email);

    usersDB.findOne({ email: findemail }).exec(async function (err, responce) {
      if (responce !== null) {
        var username = responce.username;
        var link1 = process.env.BASE_URL + "forget?_" + responce._id;
        //console.log(link1, '=-=link1')
        let updatepass = await usersDB.updateOne(
          { _id: responce._id },
          { $set: { forgotPass: 1 } }
        );
        //console.log((link1, "======link1");
        mailtempDB.findOne({ key: "forgot" }).exec(async function (err1, resData) {
          //console.log(resData,"forgot password check===");
          if (resData == null) {
            res.json({ message: "try again later" });
          } else {
            var etempdataDynamic = resData.body
              .replace(/###LINK###/g, link1)
              .replace(/###USERNAME###/g, username);
              var mailRes = await mail.sendMail(
              {
                from: {
                  name: process.env.FROM_NAME,
                  address: process.env.FROM_EMAIL,
                },
                to: email,
                subject: resData.Subject,
                html: etempdataDynamic,
              });
                //console.log((mailRes);
                if (mailRes != null) {
                  res.json({
                    status: true,
                    message: "Password Generation link sent to your Email",
                  });
                } else {
                  //console.log((mailRes, "==-=-=-=-mailRes");
                  res.json({
                    status: false,
                    message: "Something went wrong! try again later",
                  });
                }
          }
        });
      } else {
        res.status(400).json({ status: false, message: "Email id not found" });
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: "Internal server", error: err.message });
  }
});
router.post("/forgotemailotp", async (req, res) => {
  try {
    var email = req.body.email;
    var enemail = common.encrypt(email);
    var findemail = common.encrypt(email);

    usersDB.findOne({ email: findemail }).exec(async function (err, responce) {
      if (responce !== null) {
        var fou_digit = Math.floor(1000 + Math.random() * 9000);
        let u = await usersDB
          .updateOne(
            { _id: responce._id },
            {
              $set: {
                forgotEmailotp: fou_digit,
                forgotPass: 1
              }
            },
            { upsert: true }
          );
        console.log(u, "=--=u");
        let resData = await mailtempDB.findOne({ key: "OTP" });
        if (resData) {
          var reciver = req.body.email;
          var etempdataDynamic = resData.body
            .replace(/###OTP###/g, fou_digit)
            .replace(/###USERNAME###/g, email);

            var mailRes = await mail.sendMail(
            {
              from: {
                name: process.env.FROM_NAME,
                address: process.env.FROM_EMAIL,
              },
              to: reciver,
              subject: resData.Subject,
              html: etempdataDynamic,
            });
              if (mailRes != null) {
                res.json({
                  status: true,
                  Message:
                    "Email verified, OTP sent to your email",
                  email: email,
                  emailOtp: fou_digit,
                });
                usersDB
                  .updateOne(
                    { _id: responce._id },
                    { $set: { expireEmail: 0 } }
                  )
                  .exec((err, data) => { });
              } else {
                return res.json({
                  Message: "Email not verified, please try later",
                });
              }
        } else {
          return res.json({
            status: false,
            Message: "Please try again later",
          });
        }
      } else {
        res.status(400).json({ status: false, Message: "Email id not found" });
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, Message: "Internal server", error: err.message });
  }
});

router.post("/verifyForgotpasslink", async (req, res) => {
  try {
    if (
      req.body.link !== "" &&
      req.body.link !== undefined &&
      req.body.link !== null
    ) {
      usersDB
        .findOne({ _id: req.body.link })
        .exec(async function (err, responce) {
          if (responce !== null) {
            res.json({
              status: true,
              Message: "Link verified continue to reset the password",
            });
          } else {
            res.status(200).json({ status: false, Message: "Invalid Link" });
          }
        });
    } else {
      res.status(200).json({ status: false, Message: "Invalid Link" });
    }
  } catch (err) {
    res.status(500).json({ status: false, Message: "Internal server", status: false });
  }
});

router.post("/forgotpassword", async (req, res) => {
  try {
    if (
      req.body.password != "" &&
      req.body.password != undefined &&
      req.body.confimPassword != "" &&
      req.body.confimPassword != undefined &&
      req.body.email != ""
    ) {
      if (req.body.password == req.body.confimPassword) {
        var userMail = common.encrypt(req.body.email);
        let users = await usersDB.findOne({ email: userMail }).exec();
        if (users) {
          if (users.forgotPass == 1) {
            let lock = await bcrypt.hash(req.body.password, saltRounds);
            let updatepass = await usersDB.updateOne(
              { _id: users._id },
              {
                $set: {
                  password: lock,
                  forgotPass: 0,
                },
              }
            );
            //console.log((updatepass, "update==passupdatepass");
            if (updatepass) {
              return res.json({
                status: true,
                Message: "Password changed successfully",
              });
            } else {
              return res.json({
                status: false,
                Message: "Please try again later",
              });
            }
          }
        }
        else {
          return res.json({ status: false, Message: "User not found" });
        }
      } else {
        return res.json({
          status: false,
          Message: "Password and confirm password does not match",
        });
      }

    }

    // var credentobj = {};
    // console.log(req.body)

    // if(req.body.cpassword == req.body.password){
    //   usersDB.findOne({_id: (req.body.link).split('=')[0]}).exec(function (error, user) {
    //  //console.log((error, user,'error, usererror, user')
    //       if (error || user == null) {
    //            res.status(500).json({status: 500, message: 'Internal Server Error not count'});
    //       } else {
    //           //check new password
    //             if(common.encrypt(req.body.password) == user.password){
    //                 res.status(400).json({status: 400, message: 'You are Entered Old Password'})
    //             }else{
    //            //console.log(('=-=-=-=-=-=---=-0000')
    //                 usersDB.findOneAndUpdate({_id: mongoose.Types.ObjectId(user._id)}, {password: common.encrypt(req.body.password)}).exec(function (error, rows) {
    //                //console.log((error, rows,'')
    //                       if (error) {
    //                           res.status(500).json({status: 500, message: 'Internal Server Error'})
    //                       } else {
    //                               res.status(200).json({status: 200, message: 'Password changed successfully'})
    //                       }
    //                   });
    //             }
    //       }
    //   })
    // } else {
    //   res.status(400).json({status: 400, message: 'Password is mismatch'})
    // }
  } catch (err) {
    //console.log((err.message, "error: err.messageerror: err.message");
    res
      .status(500)
      .json({ Message: "Internal server", Message: "Please try again later" });
  }
});

router.post("/activiation", (req, res) => {
  try {
    if (req.body.key == "activiation") {
      var email = common.decryptionLevel(req.body.email);
      usersDB.findOne({ _id: req.body._id }).exec((error, userData) => {
        if (error) {
          return res.json({ status: false, Message: "Please try later" });
        } else {
          if (userData) {
            if (userData.verifyEmail == 1 && userData.expireEmail == 2) {
              return res.json({
                status: false,
                Message:
                  "Your account allready activiated and the link has been expired",
              });
            } else {
              usersDB
                .updateOne(
                  { email: common.encrypt(email) },
                  { $set: { status: 1, verifyEmail: 1, expireEmail: 2 } }
                )
                .exec((err, data) => {
                  if (err) {
                    return res.json({
                      status: false,
                      Message: "Please try later",
                    });
                  } else {
                    return res.json({
                      status: true,
                      Message:
                        "Your account activiated successfully, Please login to continue",
                    });
                  }
                });
            }
          } else {
            return res.json({ status: false, Message: "Please try later" });
          }
        }
      });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/changeTFA", common.tokenmiddleware, (req, res) => {
  try {
    let info = req.body;
    let status;
    let usermail;
    if (info.tfa_code == "") {
      return res.json({ status: false, message: "Please enter tfa code" });
    } else if (typeof +info.tfa_code != "number") {
      return res.json({
        status: false,
        message: "Please enter valid tfa code",
      });
    } else {
      usersDB
        .findOne({ _id: req.userId })
        .select({ tfaenablekey: 1, email: 1, tfastatus: 1 })
        .exec(function (userErr, userRes) {
          var verified = speakeasy.totp.verify({
            secret: userRes.tfaenablekey,
            encoding: "base32",
            token: info.tfa_code,
          });
          usermail = common.decrypt(userRes.email);
          if (verified) {
            if (userRes.tfastatus == 0) {
              updatedRule = { tfastatus: 1 };
              status = "enabled";
            } else {
              var qrName = "SellCrypt:" + usermail;
              var secret = speakeasy.generateSecret({ length: 10 });

              const otpauth_url = speakeasy.otpauthURL({
                secret: secret.base32,
                label: qrName,
                issuer: 'SellCrypt',
                encoding: 'base32'
              });

              var url = common.getQrUrl(otpauth_url);
              updatedRule = {
                tfastatus: 0,
                tfaenablekey: secret.base32,
                tfa_url: url,
              };
              status = "disabled";
            }
            usersDB
              .updateOne({ _id: req.userId }, { $set: updatedRule })
              .exec(function (errUpdate, resUpdate) {
                if (resUpdate.ok == 1) {
                  res.json({
                    status: true,
                    result: updatedRule,
                    message: "2FA has been " + status,
                  });
                  // mailtemplateDB.findOne({ "title": 'tfa_enable_alert'}).exec(function(etemperr,etempdata) {
                  //   var msg   = 'TFA has been enabled'
                  //   var etempdataDynamic = etempdata.mailcontent.replace(/###USERNAME###/g, resData.usermail).replace(/###MESSAGE###/g, msg);
                  //   mail.sendMail({ to: usermail, subject: etempdata.mailsubject, html: etempdataDynamic },function(mailRes){
                  //  //console.log((mailRes,'mailResmailResmailRes');
                  //   });
                  // });
                } else {
                  return res.json({
                    status: false,
                    message: "2FA has not updated",
                  });
                }
              });
          } else {
            return res.json({ status: false, message: "Invalid 2FA Code" });
          }
        });
    }
  } catch (e) {
    //console.log(("====================updateTfa catch====================");
    //console.log((e);
    return res.json({
      status: false,
      data: {},
      message: "Something went wrong",
    });
  }
});

router.post("/tfa_login", (req, res) => {
  try {
    var info = req.body;
    //console.log(("tfa login===",info);
    let userId = common.decrypt(info.socketToken.split("_")[0]);
    if (req.body.userToken != "" && req.body.userToken != undefined) {
      usersDB
        .findOne({ _id: userId, tfastatus: 1 })
        .select({
          verifyEmail: 1,
          _id: 1,
          tfaenablekey: 1,
          email: 1,
          mobileNumber: 1,
        })
        .exec(async function (err, resData) {
          //console.log(("user data===",resData);
          if (!resData) {
            return res.json({ status: false, message: "User not found" });
          } else if (resData.status == 0) {
            return res.json({
              status: false,
              message: "Account has deactivated",
            });
          } else {
            var verified = speakeasy.totp.verify({
              secret: resData.tfaenablekey,
              encoding: "base32",
              token: info.userToken,
              window: 1,
            });
            //console.log(("tfa verified===",verified);
            if (verified == true) {
              let ip_address =
                req.header("x-forwarded-for") || req.connection.remoteAddress;
              const ID = common.encrypt(resData._id.toString());
              const success = socketconnect.emit("socketResponse3" + ID, {
                message: `Someone try to login with your Credential in ${ip_address}`,
              });

              if (success == true) {
                var source = req.headers["user-agent"],
                  ua = useragent.parse(source);
                var testip =
                  req.headers["x-forwarded-for"] ||
                  req.connection.remoteAddress;
                var replaceipAdd = testip.replace("::ffff:", "");
                var geo = await geoip.lookup(replaceipAdd);
                let ip_address =
                  req.header("x-forwarded-for") || req.connection.remoteAddress;
                var obj = {
                  ipAddress: ip_address.replace("::ffff:", ""),
                  browser: ua.browser,
                  OS: ua.os,
                  platform: ua.platform,
                  useremail:
                    resData.email != null
                      ? common.decrypt(resData.email)
                      : resData.mobileNumber,
                  user_id: resData._id,
                  location: geo !== null ? geo.country : "not found",
                  activitity: "TFA Login",
                  createdDate: new Date(),
                  modifiedDate: new Date(),
                };
                userLoginhistoryDB.create(obj, async (his_err, historyData) => {
                  if (!his_err) {
                    const payload = {
                      _id: resData._id,
                    };
                    var token = jwt.sign(payload, jwt_secret);
                    var socketToken = common.encrypt(resData._id.toString());
                    var timestamp = Date.now();
                    var obj = {
                      to_user_id: ObjectId(resData._id),
                      to_user_name: resData.username,
                      status: 0,
                      message: "Login successfully",
                      link: "/notificationHistory",
                    };
                    let notification = await notifydb.create(obj);
                    res.json({
                      status: true,
                      Message: "Login Successfull !",
                      token: token,
                      tfa: 1,
                      socketToken: socketToken + "_" + timestamp,
                    });
                  } else {
                    res.json({
                      status: false,
                      Message: "Something went wrong,Please try again later",
                    });
                  }
                });
              }
            } else {
              return res.json({ status: false, Message: "Invalid 2FA Code" });
            }
          }
        });
    } else {
      return res.json({ ifstatus: false, Message: "Please enter TFA Code" });
    }
  } catch (e) {
    return res.json({
      status: false,
      data: {},
      Message: "Something went wrong",
    });
  }
});



// for app //
router.get("/currency_list", (req, res) => {
  try {
    currencyDB
      .find(
        { status: "Active", coinType: "1" },
        {
          currencyName: 1,
          currencySymbol: 1,
          currencyType: 1,
          Currency_image: 1,
          estimatedValueInUSDT: 1,
          priceChange: 1,
        }
      )
      .sort({ createdDate: 1 })
      .exec(function (err, data) {
        if (err) {
          return res.json({
            status: false,
            message: "Something went wrong, Please try again later",
          });
        } else {
          if (data.length > 0) {
            var currency = [];
            for (var i = 0; i < data.length; i++) {
              var currency_type = "";
              if (data[i].currencyType == "1") {
                currency_type = "Coin";
              } else {
                currency_type = "Token";
              }
              var obj = {
                _id: data[i]._id,
                currencyName: data[i].currencyName,
                currencySymbol: data[i].currencySymbol,
                currencyType: currency_type,
                Currency_image: data[i].Currency_image,
                USDT_price: data[i].estimatedValueInUSDT,
                priceChange: data[i].priceChange,
              };
              currency.push(obj);
            }
          }
          return res.json({ status: true, data: currency });
        }
      });
  } catch (error) {
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.get("/user_wallet", common.tokenmiddleware, (req, res) => {
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
            currencysymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyImage: { $arrayElemAt: ["$currdetail.Currency_image", 0] },
            currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
            depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
            withdrawStatus: { $arrayElemAt: ["$currdetail.withdrawStatus", 0] },
            tradeStatus: { $arrayElemAt: ["$currdetail.tradeStatus", 0] },
            currencyBalance: "$wallets.amount",
            holdAmount: "$wallets.holdAmount",
            exchangeAmount: "$wallets.exchangeAmount",
            currid: { $arrayElemAt: ["$currdetail._id", 0] },
            status: { $arrayElemAt: ["$currdetail.status", 0] },
            EstimatedUSDT: {
              $arrayElemAt: ["$currdetail.estimatedValueInUSDT", 0],
            },
          },
        },
      ])
      .exec((err, resData) => {
        if (err) {
          return res.json({ Message: err, code: 200 });
        } else {
          var wallet_list = [];
          var total_balance = 0;
          for (var i = 0; i < resData.length; i++) {
            if (resData[i].status == "Active") {
              var currency_type = "";
              if (resData[i].currencyType == "1") {
                currency_type = "Coin";
              } else {
                currency_type = "Token";
              }
              total_balance +=
                resData[i].EstimatedUSDT * resData[i].currencyBalance;
              var obj = {
                currency_id: resData[i].currid,
                currencyName: resData[i].currencyName,
                currencySymbol: resData[i].currencysymbol,
                currencyType: currency_type,
                Currency_image: resData[i].currencyImage,
                currencyBalance: resData[i].currencyBalance,
                InOrderBalance: resData[i].holdAmount,
                estimatedUSDTbalance:
                  resData[i].EstimatedUSDT * resData[i].currencyBalance,
              };
              wallet_list.push(obj);
            }
          }
          return res.json({
            status: true,
            data: wallet_list,
            TotalbalanceinUSDT: total_balance,
          });
        }
      });
  } catch (error) {
    return res.json({ status: false, message: "Internal server" });
  }
});

// for app //

router.post("/getUserOrderDetails", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    var pair = req.body.pair;
    var currency_id = "";
    //console.log((req.body);
    //console.log((
    //   "getUserOrderDetails",
    //   "getUserOrderDetailsgetUserOrderDetails"
    // );
    common.userOrderDetails(userId, pair, currency_id, function (datas) {
      // console.log(datas,'datasdatasda99999888----------tasdatas');
      res.json({ status: true, Message: datas });
    });
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

// router.post('/getActiveOrders',common.tokenmiddleware,(req,res) => {
//   try {
//     var userId = req.userId;
//     var pair   = req.body.pair;
//     var currency_id = ''
//     if(req.body.FilPerpage !="" || req.body.FilPage !="")
//     {
//       // if(typeof req.body.FilPerpage =="number" && typeof req.body.FilPage =="number")
//       // {
//         var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
//         var page = Number(req.body.FilPage ? req.body.FilPage : 0);
//         // if (typeof perPage !== 'undefined' && perPage !== '' && perPage > 0 &&
//         // typeof page !== 'undefined' && page !== '' && page > 0) {
//           var skippage = (perPage * page) - perPage;
//           orderDB.find({'userId':mongoose.mongo.ObjectId(userId.toString()),status:'Active',pairName:pair},{firstSymbol:1,toSymbol:1,pairName:1,ordertype:1,tradeType:1,amount:1,price:1,total:1,createddate:1,limit_price:1}).skip(skippage).limit(perPage).sort({_id:-1}).exec(function(err,resp){
//             orderDB.find({'userId':mongoose.mongo.ObjectId(userId.toString()),status:"Active",pairName:pair}).countDocuments().exec(function(err1,count){
//              var active_orders = [];
//               if(resp.length>0)
//               {
//                 for(var i=0;i<resp.length;i++)
//                 {
//                   var price;
//                   if(resp[i].ordertype==="OCO Stop")
//                   {
//                     price = resp[i].limit_price;
//                     //console.log("call oco");
//                   }
//                   else
//                   {
//                     price = resp[i].price;
//                    // console.log("call oco111");
//                   }
//                  // console.log("call price",price);
//                   var obj = {
//                     _id:resp[i]._id,
//                     createddate: moment(resp[i].createddate).format('lll'),
//                     pairName: resp[i].firstSymbol+'/'+resp[i].toSymbol,
//                     ordertype: resp[i].ordertype,
//                     tradeType: resp[i].tradeType,
//                     amount: parseFloat(resp[i].amount).toFixed(8),
//                     price: parseFloat(price).toFixed(8),
//                     total: parseFloat(resp[i].total).toFixed(8),
//                     _id: resp[i]._id

//                   }
//                   active_orders.push(obj);
//                 }
//               }
//               var returnJson = {
//                 status: true,
//                 result:active_orders,
//                 current: page,
//                 pages: Math.ceil(count / perPage)
//               }
//               res.json(returnJson);
//             });

//           });
//         // }else{
//         //  return res.status(400).json({status:false,Message:"Pagination Error"});
//         // }

//       // }
//       // else
//       // {
//       //   return res.status(400).json({status:false,Message:"Please enter valid pagination fields"});
//       // }

//     }
//     else
//     {
//       return res.status(400).json({status:false,Message:"Please enter pagination fields"});
//     }

//   } catch (e) {
//       res.json({status:false,Message:"Internal server error"});
//   }
// });

router.post("/getActiveOrders", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    //var pair   = req.body.pair;
    var currency_id = "";
    if (req.body.FilPerpage != "" || req.body.FilPage != "") {
      // if(typeof req.body.FilPerpage =="number" && typeof req.body.FilPage =="number")
      // {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      // if (typeof perPage !== 'undefined' && perPage !== '' && perPage > 0 &&
      // typeof page !== 'undefined' && page !== '' && page > 0) {
      var skippage = perPage * page - perPage;
      orderDB
        .find(
          {
            userId: mongoose.mongo.ObjectId(userId.toString()),
            $or: [
              { status: "Active" },
              { status: "partially" },
              { status: "stop" },
            ],
          },
          {
            firstSymbol: 1,
            toSymbol: 1,
            pairName: 1,
            ordertype: 1,
            tradeType: 1,
            amount: 1,
            price: 1,
            total: 1,
            createddate: 1,
            limit_price: 1,
            filledAmount: 1,
            stoporderprice: 1,
          }
        )
        .skip(skippage)
        .limit(perPage)
        .sort({ _id: -1 })
        .exec(function (err, resp) {
          orderDB
            .find({
              userId: mongoose.mongo.ObjectId(userId.toString()),
              $or: [
                { status: "Active" },
                { status: "partially" },
                { status: "stop" },
              ],
            })
            .countDocuments()
            .exec(function (err1, count) {
              var active_orders = [];
              if (resp.length > 0) {
                for (var i = 0; i < resp.length; i++) {
                  // console.log("call price",price);
                  var obj = {
                    _id: resp[i]._id,
                    createddate: moment(resp[i].createddate).format(
                      "MM-DD-YY hh:mm:ss"
                    ),
                    pairName: resp[i].firstSymbol + "/" + resp[i].toSymbol,
                    ordertype: resp[i].ordertype,
                    tradeType: resp[i].tradeType,
                    amount: parseFloat(resp[i].amount).toFixed(8),
                    filledAmount: parseFloat(resp[i].filledAmount).toFixed(8),
                    price: parseFloat(resp[i].price).toFixed(8),
                    stoporderprice: parseFloat(resp[i].stoporderprice).toFixed(
                      8
                    ),
                    total: parseFloat(resp[i].total).toFixed(8),
                    _id: resp[i]._id,
                  };
                  active_orders.push(obj);
                }
              }
              var returnJson = {
                status: true,
                result: active_orders,
                current: page,
                count: count,
                pages: Math.ceil(count / perPage),
              };
              res.json(returnJson);
            });
        });
      // }else{
      //  return res.status(400).json({status:false,Message:"Pagination Error"});
      // }

      // }
      // else
      // {
      //   return res.status(400).json({status:false,Message:"Please enter valid pagination fields"});
      // }
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Please enter pagination fields" });
    }
  } catch (e) {
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/getstopLimitOrders", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    //var pair   = req.body.pair;
    //console.log((req.body, "=-=-=-=-=-req.body");
    var currency_id = "";
    if (req.body.FilPerpage != "" || req.body.FilPage != "") {
      // if(typeof req.body.FilPerpage =="number" && typeof req.body.FilPage =="number")
      // {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      // if (typeof perPage !== 'undefined' && perPage !== '' && perPage > 0 &&
      // typeof page !== 'undefined' && page !== '' && page > 0) {
      var skippage = perPage * page - perPage;
      orderDB
        .find(
          {
            userId: mongoose.mongo.ObjectId(userId.toString()),
            $or: [
              { status: "Active" },
              { status: "partially" },
              { status: "stop" },
            ],
          },
          {
            firstSymbol: 1,
            toSymbol: 1,
            pairName: 1,
            ordertype: 1,
            tradeType: 1,
            amount: 1,
            price: 1,
            total: 1,
            createddate: 1,
            limit_price: 1,
            filledAmount: 1,
            stoporderprice: 1,
          }
        )
        .skip(skippage)
        .limit(perPage)
        .sort({ _id: -1 })
        .exec(function (err, resp) {
          orderDB
            .find({
              userId: mongoose.mongo.ObjectId(userId.toString()),
              $or: [
                { status: "Active" },
                { status: "partially" },
                { status: "stop" },
              ],
            })
            .countDocuments()
            .exec(function (err1, count) {
              var active_orders = [];
              if (resp.length > 0) {
                for (var i = 0; i < resp.length; i++) {
                  // console.log("call price",price);
                  var obj = {
                    _id: resp[i]._id,
                    createddate: moment(resp[i].createddate).format(
                      "MM-DD-YY hh:mm:ss"
                    ),
                    pairName: resp[i].firstSymbol + "/" + resp[i].toSymbol,
                    ordertype: resp[i].ordertype,
                    tradeType: resp[i].tradeType,
                    amount: parseFloat(resp[i].amount).toFixed(8),
                    filledAmount: parseFloat(resp[i].filledAmount).toFixed(8),
                    price: parseFloat(resp[i].price).toFixed(8),
                    stoporderprice: parseFloat(resp[i].stoporderprice).toFixed(
                      8
                    ),
                    total: parseFloat(resp[i].total).toFixed(8),
                    _id: resp[i]._id,
                  };
                  active_orders.push(obj);
                }
              }
              var returnJson = {
                status: true,
                result: active_orders,
                current: page,
                count: count,
                pages: Math.ceil(count / perPage),
              };
              res.json(returnJson);
            });
        });
      // }else{
      //  return res.status(400).json({status:false,Message:"Pagination Error"});
      // }

      // }
      // else
      // {
      //   return res.status(400).json({status:false,Message:"Please enter valid pagination fields"});
      // }
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Please enter pagination fields" });
    }
  } catch (e) {
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/getCancelOrders", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    //var pair   = req.body.pair;
    var currency_id = "";
    if (req.body.FilPerpage != "" || req.body.FilPage != "") {
      // if(typeof req.body.FilPerpage =="number" && typeof req.body.FilPage =="number")
      // {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      // if (typeof perPage !== 'undefined' && perPage !== '' && perPage > 0 &&
      // typeof page !== 'undefined' && page !== '' && page > 0) {
      var skippage = perPage * page - perPage;
      // console.log(pair,'=-=-=-=pair-=-=-=-=pair-=-=-=-=-==',userId);
      orderDB
        .find(
          {
            userId: mongoose.mongo.ObjectId(userId.toString()),
            status: "cancelled",
          },
          {
            firstSymbol: 1,
            toSymbol: 1,
            pairName: 1,
            ordertype: 1,
            tradeType: 1,
            amount: 1,
            price: 1,
            total: 1,
            createddate: 1,
            stoporderprice: 1,
            filledAmount: 1,
          }
        )
        .skip(skippage)
        .limit(perPage)
        .sort({ _id: -1 })
        .exec(function (err, resp) {
          orderDB
            .find({
              userId: mongoose.mongo.ObjectId(userId.toString()),
              status: "cancelled",
            })
            .countDocuments()
            .exec(function (err1, count) {
              var cancel_orders = [];
              if (resp.length > 0) {
                for (var i = 0; i < resp.length; i++) {
                  var obj = {
                    _id: resp[i]._id,
                    createddate: moment(resp[i].createddate).format(
                      "DD.MM.YYYY hh:mm:a"
                    ),
                    pairName: resp[i].firstSymbol + "/" + resp[i].toSymbol,
                    ordertype: resp[i].ordertype,
                    tradeType: resp[i].tradeType,
                    amount: parseFloat(resp[i].amount).toFixed(4),
                    filledAmount: parseFloat(resp[i].filledAmount).toFixed(4),
                    price: parseFloat(resp[i].price).toFixed(4),
                    stoporderprice: parseFloat(resp[i].stoporderprice).toFixed(
                      4
                    ),
                    total: parseFloat(resp[i].total).toFixed(4),
                  };
                  cancel_orders.push(obj);
                }
              }
              var returnJson = {
                status: true,
                result: cancel_orders,
                current: page,
                count: count,
                pages: Math.ceil(count / perPage),
              };
              res.json(returnJson);
            });
        });
      // }else{
      //  return res.status(400).json({status:false,Message:"Pagination Error"});
      // }
      // }
      // else
      // {
      //   return res.status(400).json({status:false,Message:"Please enter valid pagination fields"});
      // }
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Please enter pagination fields" });
    }
  } catch (e) {
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/tradeHistory", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    //var pair   = req.body.pair;
    var currency_id = "";
    if (req.body.FilPerpage != "" || req.body.FilPage != "") {
      // if(typeof req.body.FilPerpage =="number" && typeof req.body.FilPage =="number")
      // {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      // if (typeof perPage !== 'undefined' && perPage !== '' && perPage > 0 &&
      // typeof page !== 'undefined' && page !== '' && page > 0) {
      var skippage = perPage * page - perPage;
      var filter = {
        $or: [{ buyerUserId: userId }, { sellerUserId: userId }],
        //pair : pair
      };
      orderConfirmDB
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
        .skip(skippage)
        .limit(perPage)
        .exec(function (err, resp) {
          orderConfirmDB
            .find(filter)
            .countDocuments()
            .exec(function (err1, count) {
              var trade_history = [];
              if (resp.length > 0) {
                for (var i = 0; i < resp.length; i++) {
                  var pairsplit = resp[i].pair.split("_");
                  var obj = {
                    created_at: moment(resp[i].created_at).format(
                      "MM-DD-YY hh:mm:ss"
                    ),
                    pair: pairsplit[0] + "/" + pairsplit[1],
                    seller_ordertype: resp[i].seller_ordertype,
                    tradeType: resp[i].tradeType,
                    type: resp[i].type,
                    askAmount: parseFloat(resp[i].askAmount).toFixed(8),
                    askPrice: parseFloat(resp[i].askPrice).toFixed(8),
                    total: parseFloat(resp[i].total).toFixed(8),
                  };
                  trade_history.push(obj);
                }
              }
              var returnJson = {
                status: true,
                result: trade_history,
                current: page,
                count: count,
                pages: Math.ceil(count / perPage),
              };
              res.json(returnJson);
            });
        });
      // }else{
      //  return res.status(400).json({status:false,Message:"Pagination Error"});
      // }

      // }
      // else
      // {
      //   return res.status(400).json({status:false,Message:"Please enter valid pagination fields"});
      // }
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Please enter pagination fields" });
    }
  } catch (e) {
    //console.log(("get usertrade history catch===", e);
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/change_password", common.tokenmiddleware, (req, res) => {
  try {
    if (
      req.body.old_password == "" ||
      req.body.new_password == "" ||
      req.body.confirm_password == ""
    ) {
      return res.json({
        message: "Please enter all the required fields",
        status: false,
      });
    } else if (
      typeof req.body.old_password != "string" ||
      typeof req.body.new_password != "string" ||
      typeof req.body.confirm_password != "string"
    ) {
      return res.json({
        message: "Please enter valid field values",
        status: false,
      });
    } else if (req.body.new_password != req.body.confirm_password) {
      return res.json({
        message: "Password and Connfirm password, should be match",
        status: false,
      });
    } else {
      usersDB
        .findOne({ _id: mongoose.Types.ObjectId(req.userId) })
        .exec(function (error, user) {
          if (error || user == null) {
            return res.json({
              status: false,
              message: "Please try again later",
            });
          } else {
            //check new password
            if (req.body.new_password == common.decrypt(user.password)) {
              res.json({
                status: false,
                message: "You are Entered Old Password",
              });
            } else {
              //check old password
              if (req.body.old_password == common.decrypt(user.password)) {
                usersDB
                  .findOneAndUpdate(
                    { _id: mongoose.Types.ObjectId(req.userId) },
                    { password: common.encrypt(req.body.new_password) }
                  )
                  .exec(function (error, rows) {
                    if (error) {
                      res.json({
                        status: false,
                        message: "Something went wrong, please try again later",
                      });
                    } else {
                      res.json({
                        status: true,
                        message: "Password changed successfully",
                      });
                    }
                  });
              } else {
                res.json({ status: false, message: "Incorrect Old password" });
              }
            }
          }
        });
    }
  } catch (e) {
    res.json({ status: false, message: "Internal server error" });
  }
});

// get all trade pairs
router.get("/pairlist", (req, res) => {
  try {
    tradePairDB.find().exec((err, data) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        resdata = [];
        for (var i = 0; i < data.length; i++) {
          var pairsymbol = data[i].pair.replace("_", "");
          var obj = {
            pair_id: data[i]._id,
            pair: data[i].pair,
            symbol: pairsymbol.toLowerCase(),
            status: data[i].status,
            marketPrice: parseFloat(data[i].marketPrice).toFixed(8),
            min_trade_amount: parseFloat(data[i].min_trade_amount).toFixed(8),
            makerFee: parseFloat(data[i].makerFee).toFixed(8),
            takerFee: parseFloat(data[i].takerFee).toFixed(8),
            liquidity_status: data[i].liquidity_status,
            buyspread: data[i].buyspread,
            sellspread: data[i].sellspread,
          };
          resdata.push(obj);
        }
        res.json({
          status: true,
          data: resdata,
        });
      }
    });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/contact_us", (req, res) => {
  try {
    //console.log(("contact_uscontact_uscontact_us");
    if (
      req.body.email != "" &&
      req.body.name != "" &&
      req.body.message != "" &&
      req.body.mobile != ""
    ) {
      // ------- To Admin EMail ------//
      admin.find().exec((err, data) => {
        if (!err && data) {
          var adminEmail = common.decrypt(data[0].adminEmail);

          mailtempDB
            .findOne({ key: "contactus" })
            .exec(function (err1, resData) {
              if (resData == null) {
                res
                  .status(400)
                  .json({ Message: "Email not sent, please try later" });
              } else {
                var reciver = req.body.email;
                var messageReq = req.body.message;

                var obj = {
                  name: req.body.name,
                  message: req.body.message,
                  email: req.body.email,
                  mobile: req.body.mobile,
                };
                contact.create(obj, async(contErr, creaData) => {
                  if (!contErr && creaData) {
                    var etempdataDynamic = resData.body.replace(
                      /###MESSAGE###/g,
                      messageReq
                    );
                   var mailRes = await mail.sendMail(
                      {
                        from: {
                          name: process.env.FROM_NAME,
                          address: process.env.FROM_EMAIL,
                        },
                        to: process.env.FROM_EMAIL,
                        subject: resData.Subject,
                        html: etempdataDynamic,
                      });
                      if(mailRes != null)
                      {
                        res.json({
                          status: true,
                          Message: "Message sent successfully!",
                        });
                      }
                      else
                      {
                        res.status(400).json({ Message: "please try later" });
                      }
                       
                  } else {
                    res.status(400).json({ Message: "please try later" });
                  }
                });
              }
            });
        } else {
          res.status(400).json({ Message: "please try later" });
        }
      });
    } else {
      return res.json({
        status: false,
        Message: "Enter Valid details",
      });
    }
  } catch (error) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/addSubscriber", async (req, res) => {
  try {
    if (req.body.email != "") {
      var obj = {
        email: req.body.email,
      };
      var findsuncriber = await subscriberDB.findOne({ email: req.body.email }).exec();
      if (findsuncriber) {
        return res.json({
          status: false,
          Message: "You are already subcirbed.",
        });
      } else {
        let updateSubcriber = await subscriberDB.create(obj);
        if (updateSubcriber) {
          return res.json({
            status: true,
            Message: "Your subscription has been successfully completed.",
          });
        } else {
          return res.json({ status: false, Message: "Please try again later" });
        }
      }
    } else {
      return res.json({ status: false, Message: "Please enter email address" });
    }
  } catch (error) {
    console.log(error, "error")
    return res.json({ status: false, Message: "Internal server error" });
  }
});

// mobile login

router.post("/mobile_login_old", common.isEmpty, (req, res) => {
  try {
    if (
      req.body.phone != "" &&
      req.body.Password != "" &&
      req.body.phone != undefined &&
      req.body.Password != undefined
    ) {
      usersDB
        .findOne(
          { mobileNumber: req.body.phone },
          { mobileNumber: 1, password: 1, verifyEmail: 1, tfastatus: 1 }
        )
        .exec((err, data) => {
          if (!err) {
            if (data) {
              if (common.decrypt(data.password) != req.body.Password) {
                res.json({
                  status: false,
                  Message: "Password Incorrect. Please enter a valid password.",
                });
              } else if (data.mobileNumber != req.body.phone) {
                res.json({ status: false, Message: "Invalid Mobile Number" });
              } else if (data.verifyEmail == 0) {
                res.json({
                  status: false,
                  Message:
                    "Please verify your account or contact the administrator for assistance.",
                });
              } else if (data.tfastatus == 1) {
                const ENCRYPTION_KEY = key.ENCRYPTION_KEY;
                const IV_LENGTH = key.IV_LENGTH;
                let iv = crypto.randomBytes(IV_LENGTH);
                var cipher = crypto.createCipheriv(
                  "aes-256-ctr",
                  ENCRYPTION_KEY,
                  "S19h8AnT21H8n14I"
                );
                const payload = {
                  _id: data._id,
                };
                var token = jwt.sign(payload, jwt_secret);
                var crypted = cipher.update(token.toString(), "utf8", "hex");
                crypted += cipher.final("hex");
                var socketToken = common.encrypt(data._id.toString());
                var timestamp = Date.now();
                return res.json({
                  status: true,
                  token: crypted,
                  tfa: 1,
                  message: "Enter TFA to login",
                  socketToken: socketToken + "_" + timestamp,
                });
              } else {
                var source = req.headers["user-agent"],
                  ua = useragent.parse(source);
                let ip_address =
                  req.header("x-forwarded-for") || req.connection.remoteAddress;
                var obj = {
                  ipAddress: ip_address.replace("::ffff:", ""),
                  browser: ua.browser,
                  OS: ua.os,
                  platform: ua.platform,
                  phone: data.mobileNumber,
                };
                userLoginhistoryDB.create(obj, (his_err, historyData) => {
                  if (!his_err) {
                    const payload = {
                      _id: data._id,
                    };
                    var token = jwt.sign(payload, jwt_secret);
                    var socketToken = common.encrypt(data._id.toString());
                    var timestamp = Date.now();
                    //console.log((timestamp, "timestamptimestamptimestamp");
                    res.json({
                      status: true,
                      Message: "Login Successfull !",
                      token: token,
                      tfa: 0,
                      socketToken: socketToken + "_" + timestamp,
                    });
                  } else {
                    res.json({
                      status: false,
                      Message: "Something went wrong,Please try again later",
                    });
                  }
                });
              }
            } else {
              res.json({ status: false, Message: "User not found" });
            }
          } else {
            res.json({ status: false, Message: "Please try later" });
          }
        });
    } else {
      res.json({ status: false, Message: "Please enter all required fields" });
    }
  } catch {
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/emailotpverify", async (req, res) => {
  try {
    var email = common.encrypt(req.body.email);
    let findUser = await usersDB.findOne({ email: email });
    if (findUser) {
      if (findUser.emailOtp == req.body.emailOtp) {
        let verifyUser = await usersDB.updateOne(
          { email: email },
          { $set: { verifyEmail: 1, status: 1 } }
        );
        if (verifyUser.ok == 1) {
          return res.json({
            status: true,
            Message: "Your Account verified successfully, login to continue.",
          });
        } else {
          return res.json({
            status: false,
            Message: "OTP not verified, Please try again later.",
          });
        }
      } else {
        return res.json({
          status: false,
          Message: "OTP not verified, Please try again later.",
        });
      }
    } else {
      return res.json({ status: false, Message: "User not found" });
    }
  } catch (e) {
    //console.log(("error from OTP", e);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/forgototpverify", async (req, res) => {
  try {
    var email = common.encrypt(req.body.email);
    let findUser = await usersDB.findOne({ email: email });
    if (findUser) {
      console.log(findUser, "=-=findUser=-");
      if (findUser.forgotEmailotp == req.body.emailOtp) {
        let verifyUser = await usersDB.updateOne(
          { email: email },
          { $set: { verifyEmail: 1, status: 1 } }
        );
        if (verifyUser.ok == 1) {
          return res.json({
            status: true,
            Message: "OTP verified successfully, Reset you password.",
          });
        } else {
          return res.json({
            status: false,
            Message: "OTP not verified, Please try again later.",
          });
        }
      } else {
        return res.json({
          status: false,
          Message: "OTP not verified, Please try again later.",
        });
      }
    } else {
      return res.json({ status: false, Message: "User not found" });
    }
  } catch (e) {
    //console.log(("error from OTP", e);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

// update profile settings
router.post("/update_settings", common.tokenmiddleware, async (req, res) => {
  try {
    var updateobj = {
      deposit_status: req.body.deposit_status,
      card_purchase_status: req.body.card_purchase_status,
      bank_deposit_status: req.body.bank_deposit_status,
      fiat_spot_status: req.body.fiat_spot_status,
    };
    usersDB
      .findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(req.userId) },
        { $set: updateobj }
      )
      .exec(function (error, resp) {
        if (resp) {
          return res.status(200).json({
            message: "Settings updated successfully",
            success: true,
            data: resp,
          });
        } else {
          return res
            .status(400)
            .json({ message: "Something went wrong !", success: false });
        }
      });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong !",
      success: false,
      error: err.message,
    });
  }
});

router.get("/getAllBalance", common.tokenmiddleware, async (req, res) => {
  try {
    let walletDatas = await userWalletDB.findOne({ userId: req.userId });
    if (walletDatas) {
      return res.status(200).json({
        message: "data fetched successfully",
        success: true,
        data: walletDatas,
      });
    } else {
      return res
        .status(400)
        .json({ message: "Something went wrong !", success: false });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong !",
      success: false,
      error: error,
    });
  }
});

router.post("/user_tradeHistory", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    var pair = req.body.pair;
    //console.log(("get user trade history====", req.body);

    orderConfirmDB
      .find(
        {
          $and: [
            { pair: pair },
            { $or: [{ buyerUserId: userId }, { sellerUserId: userId }] },
          ],
        },
        {
          created_at: 1,
          pair: 1,
          seller_ordertype: 1,
          type: 1,
          askAmount: 1,
          askPrice: 1,
          total: 1,
        }
      )
      .sort({ created_at: -1 })
      .exec(function (err, resp) {
        var trade_history = [];

        //console.log(("user trade history response====", resp);
        //console.log(("user trade history error====", err);
        if (resp.length > 0) {
          for (var i = 0; i < resp.length; i++) {
            var obj = {
              created_at: moment(resp[i].created_at).format("lll"),
              askAmount: parseFloat(resp[i].askAmount).toFixed(8),
              askPrice: parseFloat(resp[i].askPrice).toFixed(8),
            };
            trade_history.push(obj);
          }
        }
        var returnJson = {
          status: true,
          result: trade_history,
        };
        //console.log(("user trade history====", trade_history);
        res.json(returnJson);
      });
  } catch (e) {
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.get("/get_currency", (req, res) => {
  try {
    currencyDB
      .findOne({ currencySymbol: req.body.symbol })
      .exec(function (err, data) {
        if (data !== "null") {
          return res.json({ status: true, data: data });
        }
      });
  } catch (error) {
    res.json({ status: false, Message: error.message });
  }
});

router.get("/create_pairs", (req, res) => {
  try {
    currencyDB
      .find({ status: "Active" }, { currencySymbol: 1 })
      .exec(async function (err, resData) {
        if (resData.length > 0) {
          for (var i = 0; i < resData.length; i++) {
            if (resData[i].currencySymbol != "ETH") {
              var obj = {
                from_symbol_id: mongoose.Types.ObjectId(resData[i]._id),
                to_symbol_id: mongoose.Types.ObjectId(
                  "621e6fe780a91b0fe4e946a4"
                ),
                from_symbol: resData[i].currencySymbol,
                to_symbol: "ETH",
                pair: resData[i].currencySymbol + "_ETH",
                status: 1,
                liquidity_name: resData[i].currencySymbol + "ETH",
              };
              //console.log((obj, "obj");
              await tradePairDB.create(obj, (err, pairdata) => {
                //console.log(("pair error====", err);
                //console.log(("pair error====", pairdata);
              });
            }
          }
          res.json({ message: "successfully " });
        }
      });
  } catch (error) {
    //console.log(("create pair catchr====", error);
  }
});

router.get("/update_prices", async (req, res) => {
  try {
    currencyDB
      .find({ status: "Active" }, { currencySymbol: 1 })
      .exec(async function (err, resData) {
        if (resData.length > 0) {
          for (var i = 0; i < resData.length; i++) {
            var pair = resData[i].currencySymbol + "USDT";
            var checkPriceLimit = await redisHelper.RedisService.hget(
              "MarketPriceData",
              pair
            );
            //console.log(("checkPriceLimit====", checkPriceLimit);
            if (checkPriceLimit) {
              await currencyDB.updateOne(
                { _id: resData[i]._id },
                {
                  estimatedValueInUSDT: checkPriceLimit.ticker,
                  priceChange: checkPriceLimit.priceChange,
                }
              );
            }
          }
        }
      });
  } catch (error) {
    //console.log(("create pair catchr====", error);
  }
});

router.post("/mobile_login", common.isEmpty, async (req, res) => {
  try {
    if (
      req.body.phone != "" &&
      req.body.phone != undefined &&
      req.body.Password != "" &&
      req.body.Password != undefined
    ) {
      var userData = await usersDB.findOne({ mobileNumber: req.body.phone });
      if (userData != null) {
        //console.log(;
        if (common.encrypt(req.body.Password) !== userData.password) {
          return res.json({ status: false, Message: "Incorrect password" });
        } else if (userData.verifyEmail == 0) {
          res.json({
            status: false,
            Message:
              "Please verify your account or contact the administrator for assistance.",
          });
        } else if (userData.tfastatus == 1) {
          const ENCRYPTION_KEY = key.ENCRYPTION_KEY;
          const IV_LENGTH = key.IV_LENGTH;
          let iv = crypto.randomBytes(IV_LENGTH);
          var cipher = crypto.createCipheriv(
            "aes-256-ctr",
            ENCRYPTION_KEY,
            "S19h8AnT21H8n14I"
          );
          const payload = {
            _id: userData._id,
          };
          var token = jwt.sign(payload, jwt_secret);
          var crypted = cipher.update(token.toString(), "utf8", "hex");
          crypted += cipher.final("hex");
          var socketToken = common.encrypt(userData._id.toString());
          var timestamp = Date.now();
          return res.json({
            status: true,
            token: crypted,
            tfa: 1,
            message: "Enter TFA to login",
            socketToken: socketToken + "_" + timestamp,
          });
        } else {
          var source = req.headers["user-agent"],
            ua = useragent.parse(source);
          let ip_address =
            req.header("x-forwarded-for") || req.connection.remoteAddress;
          var obj = {
            ipAddress: ip_address.replace("::ffff:", ""),
            browser: ua.browser,
            OS: ua.os,
            platform: ua.platform,
            phone: userData.mobileNumber,
            user_id: data._id,
          };
          let sessionCreate = await userLoginhistoryDB.create(obj);
          if (sessionCreate) {
            const payload = { _id: userData._id };
            var token = jwt.sign(payload, jwt_secret);
            var socketToken = common.encrypt(userData._id.toString());
            var timestamp = Date.now();
            //console.log((timestamp, "timestamptimestamptimestamp");
            res.json({
              status: true,
              Message: "Login Successfull !",
              token: token,
              tfa: 0,
              socketToken: socketToken + "_" + timestamp,
            });
          }
        }
      } else {
        return res.json({
          status: false,
          Message: "User not found, please signup to continue",
        });
      }
    } else {
      return res.json({ status: false, Message: "Please give valid fields" });
    }
  } catch (error) {
    //console.log(("ERROR FROM MOBILE LOGIN", error);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

// router.post('/getSessionHisotry', common.tokenmiddleware, async (req,res) => {

router.post("/getSessionHisotry", common.tokenmiddleware, async (req, res) => {
  try {
    //console.log(("-------------", req.body);
    var search = req.body.search;
    var perPage = Number(req.body.perpage ? req.body.perpage : 5);
    var page = Number(req.body.page ? req.body.page : 1);
    //console.log((perPage, "=-=-=-pr");
    var skippage = perPage * page - perPage;

    var loginhistory = await userLoginhistoryDB
      .find({ user_id: req.userId })
      .sort({ _id: -1 })
      .skip(skippage)
      .limit(perPage)
      .exec();
    if (loginhistory) {
      var pagedata = await userLoginhistoryDB
        .find({ user_id: req.userId })
        .count();
      //console.log((pagedata, "====page=====");
      var login_history = [];
      for (var i = 0; i < loginhistory.length; i++) {
        var obj = {
          createdDate: loginhistory[i].createdDate,
          ipAddress: loginhistory[i].ipAddress.replace("::ffff:", ""),
          platform: loginhistory[i].platform,
        };
        login_history.push(obj);
      }
      var returnObj = {
        data: login_history,
        current: page,
        pages: Math.ceil(pagedata / perPage),
        total: pagedata,
      };
      //console.log(("==-=loginhistory-=-=-");
      return res.status(200).send({
        success: true,
        message: "Data Successfully retrieved",
        data: returnObj,
      });
    } else {
      return res
        .status(400)
        .send({ success: true, message: "Data Does Not retrieved" });
    }
  } catch (error) {
    //console.log(("ERROR FROM getSessionHisotry::", error);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post(
  "/futuregetUserOrderDetails",
  common.tokenmiddleware,
  (req, res) => {
    try {
      var userId = req.userId;
      var pair = req.body.pair;
      var currency_id = "";
      //console.log((req.body);
      common.futureuserOrderDetails(
        userId,
        pair,
        currency_id,
        function (datas) {
          // console.log(datas,'datasdatasda99999888----------tasdatas');
          res.json({ status: true, Message: datas });
        }
      );
    } catch (error) {
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post("/resendCode", async (req, res) => {
  try {
    if (
      req.body.email == "" &&
      req.body.email == null &&
      req.body.email == undefined
    ) {
      return res.json({ status: false, Message: "Please enter your email" });
    } else {
      let otpGenerate = Math.floor(1000 + Math.random() * 9000);
      if (otpGenerate) {
        let otpUser = await usersDB.updateOne(
          { email: common.encrypt(req.body.email) },
          { $set: { emailOtp: otpGenerate, verifyEmail: 2 } }
        );
        if ((otpUser.ok = 1)) {
          let resData = await mailtempDB.findOne({ key: "OTP" });
          if (resData) {
            var reciver = req.body.email;
            var etempdataDynamic = resData.body
              .replace(/###OTP###/g, otpGenerate)
              .replace(/###USERNAME###/g, req.body.email);
            
              var mailRes = await mail.sendMail(
              {
                from: {
                  name: process.env.FROM_NAME,
                  address: process.env.FROM_EMAIL,
                },
                to: reciver,
                subject: resData.Subject,
                html: etempdataDynamic,
              });
              if (mailRes != null) {
                res.json({
                  status: true,
                  Message: "OTP sent to your email, please check your inbox",
                });
              } else {
                return res.json({
                  Message: "OTP not sent, please try later",
                });
              }
          } else {
            return res.json({
              status: false,
              Message: "Please try again later1",
            });
          }
        } else {
          return res.json({ status: false, Message: "Please try again leter" });
        }
      } else {
        return res.json({ status: false, Message: "Please try again leter" });
      }
    }
  } catch (error) {
    //console.log(("ERROR FROM RESEND ORP:::", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/changePassword", common.tokenmiddleware, async (req, res) => {
  // try {
  console.log(req.body, "======reqbody======");
  if (
    req.body.oldPass == "" &&
    req.body.oldPass == undefined &&
    req.body.password == "" &&
    req.body.password == undefined &&
    req.body.cpass == "" &&
    req.body.cpass == undefined
  ) {
    return res.json({ status: false, Message: "Please fill all fields" });
  } else if (req.body.password != req.body.cpass) {
    console.log("=-=-=decrypt -=-password---entry-1");
    return res.json({
      status: false,
      Message: "Password and confirm password should not be same !",
    });
  } else {
    console.log("=-=-=decrypt -=-password----entry");
    var userId = req.userId;

    // let oldPassCheck = await usersDB.findOne({
    //   _id: userId,
    //   password: common.encrypt(req.body.oldPass),
    // });
    let userData = await usersDB.findOne({ _id: userId })
    let oldPassCheck = await common.unlock(req.body.oldPass, userData.password);

    if (oldPassCheck == true) {
      let lock = await bcrypt.hash(req.body.password, saltRounds);
      let passUpdate = await usersDB.updateOne(
        { _id: userId },
        { $set: { password: lock } }
      );
      var login = await usersDB.updateOne(
        { _id: mongoose.Types.ObjectId(req.userId) },
        { $set: { loginStatus: 0 } }
      );
      if (passUpdate) {
        return res.json({
          status: true,
          Message: "Password changed successfully",
        });
      } else {
        return res.json({
          status: false,
          Message: "Something went wrong, Please try again alter;",
        });
      }
    } else {
      return res.json({ status: false, Message: "Old password is wrong" });
    }
  }
  // } catch (error) {
  //   return res.json({ status: false, Message: "Internal server error!" });
  // }
});
router.get("/getPairList", common.tokenmiddleware, async (req, res) => {
  try {
    var pair_resp = [];
    redis_service.setRedisPairs(function (pairlist) {
      if (pairlist != null) {
        for (let i = 0; i < pairlist.length; i++) {
          pair_resp.push({
            show_pair: pairlist[i].from_symbol + "/" + pairlist[i].to_symbol,
            param_pair: pairlist[i].from_symbol + "_" + pairlist[i].to_symbol,
          });
        }
        return res.status(200).json({
          status: true,
          Message: "Pair list retrieved successfully",
          data: pair_resp,
        });
      } else {
        return res.status(400).json({
          status: true,
          Message: "Something went wrong, Please try again later",
          data: {},
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      Message: "Something went wrong, Please try again alter;",
    });
  }
});

// router.post("/fetch_tickers", (req,res)=>{
//   try {
//     var pair = req.body.pair;
//     var start = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
//     var end = new Date();
//     var options = [
//         {
//           "$match": {
//             //'pair': pair,
//             'pairName': pair,
//             '$and':[{createddate:{$lte:end}},{createddate:{$gte:start}}],
//             'status': 'filled'
//           }
//       },
//       {$sort: {
//          "createddate":1
//       }},
//         {
//             $group: {
//                 _id: {
//                     //pair: "$pair",
//                     pairName: "$pairName"
//                 },
//                 highprice   : {$max: "$price"},
//                 lowprice   : {$min: "$price"},
//                 volume     : {$sum: "$amount"},
//                 open     : {$first: "$price"},
//                 close: {$last: "$price"},
//                 toSymbol: {$first:"$toSymbol"}
//             }
//         }
//     ];

//     orderDB.aggregate(options).exec(async function (error, data) {
//       if(data.length>0)
//       {
//         var response = await data[0];
//         var price_change = (response.close - response.open) / (response.open) * 100;
//         var lastobj = data.pop();
//         var resp = {
//           volume: response.volume,
//           highprice: response.highprice,
//           lowprice: response.lowprice,
//           price: lastobj._id.price,
//           price_change: price_change,
//           lastprice: {lastprice: lastobj._id.price,tradeType:response._id.tradeType},
//           pair: pair,
//           market: pair.split("_")[1]
//         }
//         RedisService.hset('GetTickerPrice',pair,resp);
//         return res.json({status:true,data: resp});
//       }
//       else
//       {
//         var resp = {
//           volume: 0.00,
//           highprice: 0.00,
//           lowprice: 0.00,
//           price: 0.00,
//           price_change: 0.00,
//           // lastprice: response.close
//           lastprice:{lastprice: 0,tradeType:''},
//           pair: pair,
//           market: pair.split("_")[1]
//         }
//         RedisService.hset('GetTickerPrice',pair,resp);
//         return res.json({status:false,data: resp});
//       }
//     });

//   } catch (error) {
//  //console.log(("catch error===",error);
//     return res.json({status:false,message:error.message});
//   }

// })

router.post("/fetch_tickers", async (req, res) => {
  try {
    var pair = req.body.pair;
    var pair_data = await tradePairDB.findOne({ pair: pair });
    var pair_convert = pair.split("_");
    var pair_symbol = pair_convert[0] + pair_convert[1];
    if (pair_data.liquidity_status == "1") {
      let getData = await RedisService.hget(
        "BINANCE-TICKERPRICE",
        pair_symbol.toLowerCase()
      );
      return res.json({ status: true, data: getData });
    } else {
      // var start = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
      // var end = new Date();
      // var options = [
      //   {
      //     "$match": {
      //       //'pair': pair,
      //       'pairName': pair,
      //       //'$and': [{ createddate: { $lte: end } }, { createddate: { $gte: start } }],
      //       'status': 'filled'
      //     }
      //   },
      //   {
      //     $sort: {
      //       "createddate": -1
      //     }
      //   },
      //   {
      //     $group: {
      //       _id: {
      //         pairName: "$pairName"
      //       },
      //       highprice: { $max: "$price" },
      //       lowprice: { $min: "$price" },
      //       volume: { $sum: "$amount" },
      //       open: { $first: "$price" },
      //       close: { $last: "$price" },
      //       tradeType: { $first: "$tradeType" }
      //     }
      //   }
      // ];

      // orderDB.aggregate(options).exec(async function (error, data) {
      //   if (data.length > 0) {
      //     var response = await data[0];
      //     var price_change = response.open - response.close;
      //     var change_percent = (response.open - response.close) / response.open * 100;
      //     var lastobj = data.pop();
      //     var resp = {
      //       volume: response.volume,
      //       highprice: response.highprice,
      //       lowprice: response.lowprice,
      //       price_change: price_change,
      //       change_percent: change_percent,
      //       lastprice: { lastprice: response.open, tradeType: response.tradeType },
      //       pair: pair
      //     }
      //     RedisService.hset('GetTickerPrice', JSON.stringify(pair), JSON.stringify(resp));
      //     return res.json({ status: true, data: resp });
      //   }
      //   else {
      //     var pairdata = await tradePairDB.findOne({ pair: pair });
      //     var resp = {
      //       volume: pairdata.volume_24h,
      //       highprice: pairdata.highest_24h,
      //       lowprice: pairdata.lowest_24h,
      //       price_change: pairdata.changes_24h,
      //       lastprice: { lastprice: pairdata.marketPrice, tradeType: '' },
      //       change_percent: pairdata.changes_24h,
      //       pair: pair
      //     }
      //     RedisService.hset('GetTickerPrice', JSON.stringify(pair), JSON.stringify(resp));
      //     return res.json({ status: false, data: resp });
      //   }
      // });

      try {
        var pair = pair;
        var start = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
        var end = new Date();
        var options = [
          {
            $match: {
              pair: pair,
              $and: [
                { created_at: { $lte: end } },
                { created_at: { $gte: start } },
              ],
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
          {
            $group: {
              _id: {
                pairName: "$pair",
              },
              highprice: { $max: "$askPrice" },
              lowprice: { $min: "$askPrice" },
              volume: { $sum: "$askAmount" },
              open: { $first: "$askPrice" },
              close: { $last: "$askPrice" },
              tradeType: { $first: "$type" },
            },
          },
        ];

        orderConfirmDB.aggregate(options).exec(async function (error, data) {
          if (data.length > 0) {
            var response = await data[0];
            var price_change = response.open - response.close;
            var change_percent =
              ((response.open - response.close) / response.open) * 100;
            var lastobj = data.pop();
            var resp = {
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
            client.hset("GetTickerPrice", pair, JSON.stringify(resp));
            return res.json({ status: true, data: resp });
          } else {
            var options = [
              {
                $match: {
                  pair: pair,
                },
              },
              {
                $sort: {
                  created_at: -1,
                },
              },
              {
                $group: {
                  _id: {
                    pairName: "$pair",
                  },
                  highprice: { $max: "$askPrice" },
                  lowprice: { $min: "$askPrice" },
                  volume: { $sum: "$askAmount" },
                  open: { $first: "$askPrice" },
                  close: { $last: "$askPrice" },
                  tradeType: { $first: "$type" },
                },
              },
            ];

            var tickerdata = await orderConfirmDB.aggregate(options);

            var pairdata = await tradePairDB.findOne({ pair: pair });
            var resp = {
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
            client.hset("GetTickerPrice", pair, JSON.stringify(resp));
            return res.json({ status: true, data: resp });
          }
        });
      } catch (error) {
        //console.log(("catch error===", error);
        common.create_log(error.message, function (resp) { });
        return res.json({ status: false });
      }
    }
  } catch (error) {
    //console.log(("catch error===", error);
    return res.json({ status: false, message: error.message });
  }
});

router.get("/getnewwallet", common.tokenmiddleware, async (req, res) => {
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
          $project: {
            currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencysymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyImage: { $arrayElemAt: ["$currdetail.Currency_image", 0] },
            currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
            depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
            withdrawStatus: { $arrayElemAt: ["$currdetail.withdrawStatus", 0] },
            tradeStatus: { $arrayElemAt: ["$currdetail.tradeStatus", 0] },
            currencyBalance: "$wallets.amount",
            holdAmount: "$wallets.holdAmount",
            exchangeAmount: "$wallets.exchangeAmount",
            currid: { $arrayElemAt: ["$currdetail._id", 0] },
            type: { $arrayElemAt: ["$currdetail.coinType", 0] },
            type: { $arrayElemAt: ["$currdetail.coinType", 0] },
            status: { $arrayElemAt: ["$currdetail.status", 0] },
            EstimatedRON: {
              $arrayElemAt: ["$currdetail.estimatedValueInRON", 0],
            },
            EstimatedEUR: {
              $arrayElemAt: ["$currdetail.estimatedValueInEUR", 0],
            },
            EstimatedBTC: {
              $arrayElemAt: ["$currdetail.estimatedValueInBTC", 0],
            },
            EstimatedUSDT: {
              $arrayElemAt: ["$currdetail.estimatedValueInUSDT", 0],
            },
          },
        },
      ])
      .exec(async (err, resData) => {
        var walletdet = resData;
        let lastElement = walletdet.slice(-1);
        if (resData) {
          return res.status(200).json({
            message: "data fetched successfully",
            success: true,
            data: lastElement,
          });
        } else {
          return res
            .status(400)
            .json({ message: "Something went wrong !", success: false });
        }
      });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong !",
      success: false,
      error: error,
    });
  }
});

router.get("/getfavouritepair", common.tokenmiddleware, async (req, res) => {
  try {
    if (req.userId !== "") {
      var pairset = await favouritePair.find({
        userId: mongoose.Types.ObjectId(req.userId),
        status: 1,
      });
      if (pairset) {
        return res.status(200).json({
          message: "data fetched successfully",
          success: true,
          data: pairset,
        });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Un Authroised Access !", success: false });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
});
router.post("/addfavouritepair", common.tokenmiddleware, async (req, res) => {
  try {
    if (req.userId !== "") {
      var pairset = await favouritePair.findOne({
        userId: mongoose.Types.ObjectId(req.userId),
        to_symbol_id: mongoose.Types.ObjectId(req.body.to_symbol_id),
        from_symbol_id: mongoose.Types.ObjectId(req.body.from_symbol_id),
        pair: req.body.pair,
      });
      if (pairset !== null) {
        var filter = {
          userId: mongoose.Types.ObjectId(req.userId),
          to_symbol_id: mongoose.Types.ObjectId(req.body.to_symbol_id),
          from_symbol_id: mongoose.Types.ObjectId(req.body.from_symbol_id),
          pair: req.body.pair,
        };
        var updateobj = {};
        if (pairset.status == 1) {
          updateobj = {
            status: 0,
          };
        } else {
          updateobj = {
            status: 1,
          };
        }
        favouritePair
          .findOneAndUpdate(filter, updateobj, { new: true })
          .exec(function (err, resp) {
            if (!err) {
              res.status(200).json({
                status: true,
                message: "favourite pair Status changed Successfully",
                data: resp,
              });
            } else {
              res.status(400).json({
                status: false,
                message: "does not favourite pair changed",
              });
            }
          });
      } else {
        req.body.userId = req.userId;
        let response = await new favouritePair(req.body).save();
        res.status(200).json({
          status: true,
          message: "Favourite Pair added successfully",
          data: response,
        });
      }
    } else {
      res.status(400).json({ status: false, message: "Un authorised user" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/getalltransactions", common.tokenmiddleware, async (req, res) => {
  try {
    withdrawDB
      .find({ user_id: req.userId })
      .sort({ _id: -1 })
      .populate("currency_id", "currencyName")
      .exec(function (withdrawerr, withdrawres) {
        depositDB
          .find({ userId: req.userId })
          .sort({ _id: -1 })
          .populate("currency", "currencyName")
          .exec(function (depositerr, depositres) {
            if (!depositerr && !withdrawerr) {
              var withdrawarr = [];
              var depositarr = [];
              for (let index = 0; index < withdrawres.length; index++) {
                const element = withdrawres[index];
                var status = "";
                if (element.status == 0 || element.status == 1) {
                  status = "Pending";
                } else if (element.status == 3 || element.status == 4) {
                  status = "Cancelled";
                } else if (element.status == 2) {
                  status = "Completed";
                }
                var obj = {
                  date: element.created_at,
                  currency_symbol: element.currency_id.currencyName,
                  amount: element.amount,
                  txn_id: element.txn_id,
                  type: "Withdraw",
                  status: status,
                };
                withdrawarr.push(obj);
              }
              for (let index = 0; index < depositres.length; index++) {
                const element = depositres[index];
                var status = "";
                if (element.status == 0 || element.status == 1) {
                  status = "Pending";
                } else if (element.status == 3 || element.status == 4) {
                  status = "Cancelled";
                } else if (element.status == 2) {
                  status = "Completed";
                }
                var obj = {
                  date: element.createddate,
                  currency_symbol: element.currency.currencyName,
                  amount: element.amount,
                  txn_id: element.txnid,
                  type: "Deposit",
                  status: status,
                };
                depositarr.push(obj);
              }
              var concatarr = [...withdrawarr, ...depositarr];
              res.status(200).json({
                status: true,
                message: "Transaction Retrieved",
                data: concatarr,
              });
            } else {
              res.status(400).json({
                status: false,
                message: "Does Not Transaction Retrieved",
              });
            }
          });
      });
  } catch (error) {
    res.status(500).json({ status: false, message: "Something went wrong" });
  }
});

router.post("/app_dashboard", common.tokenmiddleware, (req, res) => {
  try {
    var filter = {
      userId: mongoose.Types.ObjectId(req.userId),
      "currdetail.status": "Active",
      "currdetail.depositStatus": "Active",
      "currdetail.coinType": "1",
    };
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
          $match: filter,
        },
        {
          $project: {
            currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencysymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyImage: { $arrayElemAt: ["$currdetail.Currency_image", 0] },
            currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
            depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
            withdrawStatus: { $arrayElemAt: ["$currdetail.withdrawStatus", 0] },
            currencyBalance: "$wallets.amount",
            holdAmount: "$wallets.holdAmount",
            status: { $arrayElemAt: ["$currdetail.status", 0] },
            EstimatedUSDT: {
              $arrayElemAt: ["$currdetail.estimatedValueInUSDT", 0],
            },
            popularOrder: { $arrayElemAt: ["$currdetail.popularOrder", 0] },
            coinType: { $arrayElemAt: ["$currdetail.coinType", 0] },
            coin_price: { $arrayElemAt: ["$currdetail.coin_price", 0] },
            coin_change: { $arrayElemAt: ["$currdetail.coin_change", 0] },
            withdrawFee: { $arrayElemAt: ["$currdetail.withdrawFee", 0] },
            minWithdrawLimit: {
              $arrayElemAt: ["$currdetail.minWithdrawLimit", 0],
            },
            maxWithdrawLimit: {
              $arrayElemAt: ["$currdetail.maxWithdrawLimit", 0],
            },
          },
        },
      ])
      .exec(async (err, resData) => {
        if (err) {
          return res.status(400).json({ Message: err, code: 200 });
        } else {
          //console.log("get balance response===",resData);
          var total_balance_btc = 0;
          var available_balance_btc = 0;
          var inorder_balance_btc = 0;
          var total_balance_usdt = 0;
          var available_balance_usdt = 0;
          var inorder_balance_usdt = 0;

          client.hget(
            "CurrencyConversion",
            "allpair",
            async function (err, value) {
              let redis_response = await JSON.parse(value);
              if (
                redis_response != null &&
                redis_response != "" &&
                redis_response != undefined &&
                Object.keys(redis_response).length > 0
              ) {
                for (var i = 0; i < resData.length; i++) {
                  if (resData[i].coinType == "1") {
                    // var pairname = resData[i].currencysymbol + "INR";

                    // var result = await RedisService.hget("BINANCE-TICKERPRICE", pairname.toLowerCase());

                    // if (result !== null) {
                    //   resData[i].coin_price = parseFloat(result.lastprice.lastprice).toFixed(2);
                    //   resData[i].coin_change = parseFloat(result.change_percent).toFixed(2);
                    //   resData[i].EstimatedUSDT = parseFloat(result.lastprice.lastprice).toFixed(2);
                    // }
                    // else {
                    //   if (redis_response[resData[i].currencysymbol].USDT != undefined) {
                    //     resData[i].coin_price = parseFloat(redis_response[resData[i].currencysymbol].USDT).toFixed(2);
                    //     resData[i].coin_change = 0;
                    //     resData[i].EstimatedUSDT = parseFloat(redis_response[resData[i].currencysymbol].USDT).toFixed(2);
                    //   }
                    // }

                    if (
                      redis_response[resData[i].currencysymbol] != undefined
                    ) {
                      resData[i].coin_price =
                        redis_response[resData[i].currencysymbol].USDT;
                    } else {
                      var pairname =
                        resData[i].currencysymbol.toLowerCase() + "usdt";
                      var result = await RedisService.hget(
                        "BINANCE-TICKERPRICE",
                        pairname
                      );
                      if (result !== null) {
                        resData[i].coin_price = result.lastprice.lastprice;
                        resData[i].coin_change = parseFloat(
                          result.change_percent
                        ).toFixed(2);
                      } else {
                        var response = await RedisService.hget(
                          "GetTickerPrice",
                          pairname.toLowerCase()
                        );
                        if (response != null) {
                          resData[i].coin_price = response.lastprice.lastprice;
                          resData[i].coin_change = parseFloat(
                            result.change_percent
                          ).toFixed(2);
                        } else {
                          resData[i].coin_price = resData[i].coin_price;
                          resData[i].coin_change = resData[i].coin_change;
                        }
                      }
                      // binancefn.CurrencyConversion();
                    }
                    resData[i].coin_price = parseFloat(
                      resData[i].coin_price
                    ).toFixed(2);

                    resData[i].EstimatedUSDT = resData[i].coin_price;

                    total_balance_btc +=
                      (total_balance_btc +
                        resData[i].currencyBalance +
                        resData[i].holdAmount) *
                      resData[i].EstimatedBTC;
                    available_balance_btc +=
                      (available_balance_btc + resData[i].currencyBalance) *
                      resData[i].EstimatedBTC;
                    inorder_balance_btc +=
                      (inorder_balance_btc + resData[i].holdAmount) *
                      resData[i].EstimatedBTC;
                    total_balance_usdt +=
                      (total_balance_usdt +
                        resData[i].currencyBalance +
                        resData[i].holdAmount) *
                      resData[i].EstimatedUSDT;
                    available_balance_usdt +=
                      (available_balance_usdt + resData[i].currencyBalance) *
                      resData[i].EstimatedUSDT;
                    inorder_balance_usdt +=
                      (inorder_balance_usdt + resData[i].holdAmount) *
                      resData[i].EstimatedUSDT;
                    resData[i]["USDTavailbalance"] = parseFloat(
                      resData[i].EstimatedUSDT * resData[i].currencyBalance
                    ).toFixed(2);
                    resData[i]["USDTtotalbalance"] = parseFloat(
                      resData[i].EstimatedUSDT * resData[i].currencyBalance +
                      resData[i].EstimatedUSDT * resData[i].holdAmount
                    ).toFixed(2);
                    resData[i]["availBalance"] = parseFloat(
                      resData[i].currencyBalance
                    ).toFixed(8);
                    resData[i]["totalBalance"] = parseFloat(
                      resData[i].currencyBalance + resData[i].holdAmount
                    ).toFixed(8);
                    resData[i]["currencyBalance"] = parseFloat(
                      resData[i].currencyBalance
                    ).toFixed(8);
                    //console.log("total_balance_btc===",total_balance_btc);
                  }
                }
                var balance = {
                  total_balance_usdt: parseFloat(total_balance_usdt).toFixed(2),
                  available_balance_usdt: parseFloat(
                    available_balance_usdt
                  ).toFixed(2),
                };

                const sorted = resData.sort(
                  (a, b) => a.popularOrder - b.popularOrder
                );
                var returnJson = {
                  status: true,
                  Message: sorted,
                  balance: balance,
                };
                return res.status(200).json(returnJson);
              } else {
                common.currency_conversion(async function (response) {
                  //console.log("call currency conversion", response)
                  if (response.status) {
                    let redis_response = response.message;
                    if (
                      redis_response != null &&
                      redis_response != "" &&
                      redis_response != undefined &&
                      Object.keys(redis_response).length > 0
                    ) {
                      for (var i = 0; i < resData.length; i++) {
                        if (resData[i].coinType == "1") {
                          // var pairname = resData[i].currencysymbol + "INR";

                          // var result = await RedisService.hget("BINANCE-TICKERPRICE", pairname.toLowerCase());

                          // if (result !== null) {
                          //   resData[i].coin_price = parseFloat(result.lastprice.lastprice).toFixed(2);
                          //   resData[i].coin_change = parseFloat(result.change_percent).toFixed(2);
                          //   resData[i].EstimatedUSDT = parseFloat(result.lastprice.lastprice).toFixed(2);
                          // }
                          // else {
                          //   if (redis_response[resData[i].currencysymbol].USDT != undefined) {
                          //     resData[i].coin_price = parseFloat(redis_response[resData[i].currencysymbol].USDT).toFixed(2);
                          //     resData[i].coin_change = 0;
                          //     resData[i].EstimatedUSDT = parseFloat(redis_response[resData[i].currencysymbol].USDT).toFixed(2);
                          //   }
                          // }

                          if (
                            redis_response[resData[i].currencysymbol] !=
                            undefined
                          ) {
                            resData[i].coin_price =
                              redis_response[resData[i].currencysymbol].USDT;
                          } else {
                            var pairname =
                              resData[i].currencysymbol.toLowerCase() + "usdt";
                            var result = await RedisService.hget(
                              "BINANCE-TICKERPRICE",
                              pairname
                            );
                            if (result !== null) {
                              resData[i].coin_price =
                                result.lastprice.lastprice;
                              resData[i].coin_change = parseFloat(
                                result.change_percent
                              ).toFixed(2);
                            } else {
                              var response = await RedisService.hget(
                                "GetTickerPrice",
                                pairname.toLowerCase()
                              );
                              if (response != null) {
                                resData[i].coin_price =
                                  response.lastprice.lastprice;
                                resData[i].coin_change = parseFloat(
                                  result.change_percent
                                ).toFixed(2);
                              } else {
                                resData[i].coin_price = resData[i].coin_price;
                                resData[i].coin_change = resData[i].coin_change;
                              }
                            }
                            // binancefn.CurrencyConversion();
                          }
                          resData[i].coin_price = parseFloat(
                            resData[i].coin_price
                          ).toFixed(2);

                          resData[i].EstimatedUSDT = resData[i].coin_price;

                          total_balance_btc +=
                            (total_balance_btc +
                              resData[i].currencyBalance +
                              resData[i].holdAmount) *
                            resData[i].EstimatedBTC;
                          available_balance_btc +=
                            (available_balance_btc +
                              resData[i].currencyBalance) *
                            resData[i].EstimatedBTC;
                          inorder_balance_btc +=
                            (inorder_balance_btc + resData[i].holdAmount) *
                            resData[i].EstimatedBTC;
                          total_balance_usdt +=
                            (total_balance_usdt +
                              resData[i].currencyBalance +
                              resData[i].holdAmount) *
                            resData[i].EstimatedUSDT;
                          available_balance_usdt +=
                            (available_balance_usdt +
                              resData[i].currencyBalance) *
                            resData[i].EstimatedUSDT;
                          inorder_balance_usdt +=
                            (inorder_balance_usdt + resData[i].holdAmount) *
                            resData[i].EstimatedUSDT;
                          resData[i]["USDTavailbalance"] = parseFloat(
                            resData[i].EstimatedUSDT *
                            resData[i].currencyBalance
                          ).toFixed(2);
                          resData[i]["USDTtotalbalance"] = parseFloat(
                            resData[i].EstimatedUSDT *
                            resData[i].currencyBalance +
                            resData[i].EstimatedUSDT * resData[i].holdAmount
                          ).toFixed(2);
                          resData[i]["availBalance"] = parseFloat(
                            resData[i].currencyBalance
                          ).toFixed(8);
                          resData[i]["totalBalance"] = parseFloat(
                            resData[i].currencyBalance + resData[i].holdAmount
                          ).toFixed(8);
                          resData[i]["currencyBalance"] = parseFloat(
                            resData[i].currencyBalance
                          ).toFixed(8);
                          //console.log("total_balance_btc===",total_balance_btc);
                        }
                        resData[i].coin_price = parseFloat(
                          resData[i].coin_price
                        ).toFixed(2);

                        resData[i].EstimatedUSDT = resData[i].coin_price;

                        total_balance_btc +=
                          (total_balance_btc +
                            resData[i].currencyBalance +
                            resData[i].holdAmount) *
                          resData[i].EstimatedBTC;
                        available_balance_btc +=
                          (available_balance_btc + resData[i].currencyBalance) *
                          resData[i].EstimatedBTC;
                        inorder_balance_btc +=
                          (inorder_balance_btc + resData[i].holdAmount) *
                          resData[i].EstimatedBTC;
                        total_balance_usdt +=
                          (total_balance_usdt +
                            resData[i].currencyBalance +
                            resData[i].holdAmount) *
                          resData[i].EstimatedUSDT;
                        available_balance_usdt +=
                          (available_balance_usdt +
                            resData[i].currencyBalance) *
                          resData[i].EstimatedUSDT;
                        inorder_balance_usdt +=
                          (inorder_balance_usdt + resData[i].holdAmount) *
                          resData[i].EstimatedUSDT;
                        resData[i]["USDTavailbalance"] = parseFloat(
                          resData[i].EstimatedUSDT * resData[i].currencyBalance
                        ).toFixed(2);
                        resData[i]["USDTtotalbalance"] = parseFloat(
                          resData[i].EstimatedUSDT *
                          resData[i].currencyBalance +
                          resData[i].EstimatedUSDT * resData[i].holdAmount
                        ).toFixed(2);
                        resData[i]["availBalance"] = parseFloat(
                          resData[i].currencyBalance
                        ).toFixed(8);
                        resData[i]["totalBalance"] = parseFloat(
                          resData[i].currencyBalance + resData[i].holdAmount
                        ).toFixed(8);
                        resData[i]["currencyBalance"] = parseFloat(
                          resData[i].currencyBalance
                        ).toFixed(8);
                        //console.log("total_balance_btc===",total_balance_btc);
                      }
                      var balance = {
                        total_balance_usdt:
                          parseFloat(total_balance_usdt).toFixed(2),
                        available_balance_usdt: parseFloat(
                          available_balance_usdt
                        ).toFixed(2),
                      };

                      const sorted = resData.sort(
                        (a, b) => a.popularOrder - b.popularOrder
                      );
                      var returnJson = {
                        status: true,
                        Message: sorted,
                        balance: balance,
                      };
                      return res.status(200).json(returnJson);
                    }
                  }
                });
              }
            }
          );
        }
      });
    // }else{
    //   return res.status(400).json({Message:'Not Found',code:400});
    // }
  } catch (error) {
    //console.log(("app dashboard error ====", error);
    return res.status(500).json({ Message: "Internal server", code: 500 });
  }
});

router.get("/gettransactions", common.tokenmiddleware, async (req, res) => {
  try {
    withdrawDB
      .find({ user_id: req.userId })
      .sort({ _id: -1 })
      .limit(5)
      .populate("currency_id", "currencyName")
      .exec(function (withdrawerr, withdrawres) {
        depositDB
          .find({ userId: req.userId })
          .sort({ _id: -1 })
          .limit(5)
          .populate("currency", "currencyName")
          .exec(function (depositerr, depositres) {
            if (!depositerr && !withdrawerr) {
              var withdrawarr = [];
              var depositarr = [];
              for (let index = 0; index < withdrawres.length; index++) {
                const element = withdrawres[index];
                var status = "";
                if (element.status == 0 || element.status == 1) {
                  status = "Pending";
                } else if (element.status == 3 || element.status == 4) {
                  status = "Cancelled";
                } else if (element.status == 2) {
                  status = "Completed";
                }
                var obj = {
                  date: element.created_at,
                  currency_symbol: element.currency_id.currencyName,
                  amount: element.amount,
                  txn_id: element.txn_id,
                  type: "Withdraw",
                  status: status,
                };
                withdrawarr.push(obj);
              }
              for (let index = 0; index < depositres.length; index++) {
                const element = depositres[index];
                var status = "Completed";
                // if (element.status == 0 || element.status == 1) {
                //     status = "Pending";
                // }
                // else if (element.status == 3 || element.status == 4) {
                //     status = "Cancelled";
                // }
                // else if (element.status == 2) {
                //     status = "Completed";
                // }
                var obj = {
                  date: element.createddate,
                  currency_symbol: element.currency.currencyName,
                  amount: element.depamt,
                  txn_id: element.txnid,
                  type: "Deposit",
                  status: status,
                };
                depositarr.push(obj);
              }
              var concatarr = [...withdrawarr, ...depositarr];
              res.status(200).json({
                status: true,
                message: "Transaction Retrieved",
                data: concatarr,
              });
            } else {
              res.status(400).json({
                status: false,
                message: "Does Not Transaction Retrieved",
              });
            }
          });
      });
  } catch (error) {
    res.status(500).json({ status: false, message: "Something went wrong" });
  }
});

router.get("/tfaDetials", common.tokenmiddleware, async (req, res) => {
  try {
    const userData = await usersDB.findOne(
      {
        _id: req.userId,
      },
      {
        tfaenablekey: 1,
        tfastatus: 1,
        tfa_url: 1,
      }
    );
    if (userData) {
      return res.json({
        status: true,
        data: userData,
      });
    } else {
      res.json({
        status: false,
        Message: "User not found",
      });
    }
  } catch (error) {
    //console.log(("ERROR FROM getTfaDetails :::", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/Tfa_History", common.tokenmiddleware, async (req, res) => {
  try {
    //console.log(("-------------", req.body);
    var search = req.body.search;
    var perPage = Number(req.body.perpage ? req.body.perpage : 5);
    var page = Number(req.body.page ? req.body.page : 1);
    //console.log((perPage, "=-=-=-pr");
    var skippage = perPage * page - perPage;

    var Tfahistory = await twoFAHistory
      .find({ userId: req.userId })
      .sort({ _id: -1 })
      .skip(skippage)
      .limit(perPage)
      .exec();
    if (Tfahistory) {
      var pagedata = await twoFAHistory.find({ userId: req.userId }).count();
      //console.log((pagedata, "====page=====");
      var Tfa_history = [];
      for (var i = 0; i < Tfahistory.length; i++) {
        var obj = {
          createdDate: moment(Tfahistory[i].createdDate).format(
            "DD.MM.YYYY hh:mm:a"
          ),
          ipAddress: Tfahistory[i].ipAddress.replace("::ffff:", ""),
          browser: Tfahistory[i].browser,
          status: Tfahistory[i].Status,
        };
        Tfa_history.push(obj);
      }
      var returnObj = {
        data: Tfa_history,
        current: page,
        pages: Math.ceil(pagedata / perPage),
        total: pagedata,
      };
      //console.log(("==-=Tfahistory-=-=-", returnObj);
      return res.status(200).send({
        success: true,
        message: "Data Successfully retrieved",
        data: returnObj,
      });
    } else {
      return res
        .status(400)
        .send({ success: true, message: "Data Does Not retrieved" });
    }
  } catch (error) {
    //console.log(("ERROR FROM getSessionHisotry::", error);
    return res.json({ status: false, Message: "Internal server error" });
  }
});
router.post("/changeTfaStatus", common.tokenmiddleware, async (req, res) => {
  try {
    let info = req.body;
    let status;
    let usermail;
    if (info.tfa_code == "") {
      return res.json({ status: false, message: "Please enter tfa code" });
    } else if (typeof +info.tfa_code != "number") {
      return res.json({
        status: false,
        message: "Please enter valid tfa code",
      });
    } else {
      usersDB
        .findOne({ _id: req.userId })
        .select({ tfaenablekey: 1, email: 1, mobileNumber: 1, tfastatus: 1 })
        .exec(async function (userErr, userRes) {
          var verified = speakeasy.totp.verify({
            secret: userRes.tfaenablekey,
            encoding: "base32",
            token: info.userToken,
          });
          usermail =
            userRes.email != null
              ? common.decrypt(userRes.email)
              : userRes.mobileNumber;
          if (verified) {
            if (userRes.tfastatus == 0) {
              updatedRule = { tfastatus: 1 };
              status = "enabled";
            } else {
              var qrName = "SellCrypt:" + usermail;
              var secret = speakeasy.generateSecret({ length: 10 });

              const otpauth_url = speakeasy.otpauthURL({
                secret: secret.base32,
                label: qrName,
                issuer: 'SellCrypt',
                encoding: 'base32'
              });

              var url = common.getQrUrl(otpauth_url);

              updatedRule = {
                tfastatus: 0,
                tfaenablekey: secret.base32,
                tfa_url: url,
              };
              status = "disabled";
            }

            if (userRes) {
              var source = req.headers["user-agent"],
                ua = useragent.parse(source);
              let ip_address =
                req.header("x-forwarded-for") || req.connection.remoteAddress;
              var history = {
                userId: req.userId,
                email:
                  userRes.email != null ? userRes.email : userRes.mobileNumber,
                ipAddress: ip_address,
                browser: ua.browser,
                OS: ua.os,
                Status: status,
              };
              var create = await twoFAHistory.create(history);
              //console.log((create, "History stored");
            }
            usersDB
              .updateOne({ _id: req.userId }, { $set: updatedRule })
              .exec(function (errUpdate, resUpdate) {
                if (resUpdate.ok == 1) {
                  userRedis.getUser(req.userId, function (datas){
                    if(datas) {
                      return res.json({
                        status: true,
                        result: updatedRule,
                        Message: "2FA has been " + status,
                      });
                    }else{
                      return res.json({ status : false, Message : {} });
                    }
                  });
                 
                  // mailtemplateDB.findOne({ "title": 'tfa_enable_alert'}).exec(function(etemperr,etempdata) {
                  //   var msg   = 'TFA has been enabled'
                  //   var etempdataDynamic = etempdata.mailcontent.replace(/###USERNAME###/g, resData.usermail).replace(/###MESSAGE###/g, msg);
                  //   mail.sendMail({ to: usermail, subject: etempdata.mailsubject, html: etempdataDynamic },function(mailRes){
                  //  //console.log((mailRes,'mailResmailResmailRes');
                  //   });
                  // });
                } else {
                  return res.json({
                    status: false,
                    Message: "2FA has not updated",
                  });
                }
              });
          } else {
            return res.json({ status: false, Message: "Invalid 2FA Code" });
          }
        });
    }
  } catch (e) {
    return res.json({ status: false, Message: "Something went wrong" });
  }
});
router.post("/getcurrency", async (req, res) => {
  try {
    var currlist = await currencyDB
      .find(
        { coinType: 1, status: "Active" },
        {
          Currency_image: 1,
          currencySymbol: 1,
          currencyName: 1,
          priceChange: 1,
        }
      )
      .sort({ popularOrder: 1 })
      .limit(req.body.limit);
    if (currlist) {
      var countDocs = await currencyDB.find().count();
      if (countDocs) {
        return res.status(200).json({
          status: true,
          Message: "Retrieved Successfully",
          data: currlist,
          countDocs: countDocs,
        });
      }
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Does Not Retrieved" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, Message: "Something went wrong" });
  }
});

router.post("/getbankwire", async (req, res) => {
  try {
    if (req.body.currency != "" && req.body.currency != null) {
      var bankData = await adminBankdetails.findOne({
        currency: req.body.currency,
        status: "1",
      });
      if (bankData != null) {
        return res.status(200).json({ status: true, data: bankData });
      } else {
        return res.status(200).json({ status: true, data: {} });
      }
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Please enter currency" });
    }
  } catch (err) {
    return res
      .status(500)
      .json({ status: false, Message: "Something went wrong" });
  }
});

router.post("/reset_pwd_otp", async (req, res) => {
  try {
    var email = req.body.email;
    var enemail = common.encrypt(email);
    var findemail = common.encrypt(email);

    usersDB.findOne({ email: findemail }).exec(async function (err, responce) {
      if (responce !== null) {
        var username = responce.username;
        var fou_digit = Math.floor(1000 + Math.random() * 9000);
        let updatepass = await usersDB.updateOne(
          { _id: responce._id },
          { $set: { forgetOtp: fou_digit, forgotPass: 1 } }
        );
        mailtempDB
          .findOne({ key: "forgot_pwd" })
          .exec( async function (err1, resData) {
            if (resData == null) {
              res.status(400).json({ message: "Email not sent" });
            } else {
              var etempdataDynamic = resData.body
                .replace(/###OTP###/g, fou_digit)
                .replace(/###USERNAME###/g, username);
                var mailRes = await mail.sendMail(
                  {
                    from: {
                      name: process.env.FROM_NAME,
                      address: process.env.FROM_EMAIL,
                    },
                    to: email,
                    subject: resData.Subject,
                    html: etempdataDynamic,
                  });
                  if(mailRes != null)
                  {
                    res.json({
                      status: true,
                      message: "OTP for forget password sent to your mail id",
                      otp_code: fou_digit,
                    });
                  }
                  else
                  {
                    res.status(400).json({ message: "Something went wrong, Please try again later!" });
                  }
                  
            }
          });
      } else {
        res.status(400).json({ message: "Email id not found" });
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong, Please try again later!" });
  }
});

router.post("/verifyForgotcode", async (req, res) => {
  try {
    if (
      req.body.otp_code !== "" &&
      req.body.otp_code !== undefined &&
      req.body.otp_code !== null
    ) {
      usersDB
        .findOne({ forgetOtp: req.body.otp_code })
        .exec(async function (err, responce) {
          if (responce !== null) {
            res.json({
              status: true,
              Message: "OTP verified continue to reset the password",
              id: responce._id,
            });
          } else {
            res.status(200).json({ status: false, Message: "Invalid OTP" });
          }
        });
    } else {
      res.status(400).json({ status: false, Message: "Invalid OTP" });
    }
  } catch (err) {
    res.status(500).json({ Message: "Internal server", status: false });
  }
});
router.get("/getportfoliobalance", common.tokenmiddleware, async (req, res) => {
  try {
    var walllist = await userWalletDB.find({ userId: req.userId }).exec();
    if (walllist) {
      res.status(200).json({
        Message: "Successfully Retrieved",
        status: true,
        data: walllist,
      });
    } else {
      res.status(400).json({ Message: "Does Not Retrieved", status: false });
    }
  } catch (error) {
    res.status(500).json({ Message: "Internal server", status: false });
  }
});

router.get("/portfolio_user_balance", common.tokenmiddleware, (req, res) => {
  try {
    var search = req.body.search;
    var filter = {};

    filter = {
      userId: mongoose.Types.ObjectId(req.userId),
      "currdetail.status": "Active",
      "currdetail.depositStatus": "Active",
    };

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
          $match: filter,
        },
        {
          $project: {
            currencysymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyname: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencyImage: { $arrayElemAt: ["$currdetail.Currency_image", 0] },
            priceChange: { $arrayElemAt: ["$currdetail.priceChange", 0] },
            currencyBalance: "$wallets.amount",
            holdAmount: "$wallets.holdAmount",
            status: { $arrayElemAt: ["$currdetail.status", 0] },
            marketPrice: {
              $arrayElemAt: ["$currdetail.estimatedValueInUSDT", 0],
            },
            popularOrder: { $arrayElemAt: ["$currdetail.popularOrder", 0] },
            coin_price: { $arrayElemAt: ["$currdetail.coin_price", 0] },
          },
        },
        { $sort: { popularOrder: 1 } },
      ])
      .exec(async (err, resData) => {
        if (err) {
          return res
            .status(200)
            .json({ Message: err, code: 200, status: false });
        } else {
          var total_balance_usdt = 0;
          var available_balance_usdt = 0;
          var inorder_balance_usdt = 0;
          var redis_response = "";

          client.hget(
            "CurrencyConversion",
            "allpair",
            async function (err, value) {
              if (value !== null) {
                let redis_response = await JSON.parse(value);
                var response_currency = [];
                if (
                  redis_response != null &&
                  redis_response != "" &&
                  redis_response != undefined &&
                  Object.keys(redis_response).length > 0
                ) {
                  for (var i = 0; i < resData.length; i++) {
                    if (
                      redis_response[resData[i].currencysymbol] != undefined
                    ) {
                      resData[i].marketPrice =
                        redis_response[resData[i].currencysymbol].USDT;
                    } else {
                      var pairname =
                        resData[i].currencysymbol.toLowerCase() + "usdt";
                      var result = await RedisService.hget(
                        "BINANCE-TICKERPRICE",
                        pairname
                      );
                      if (result !== null) {
                        resData[i].marketPrice = result.lastprice.lastprice;
                      } else {
                        var response = await RedisService.hget(
                          "GetTickerPrice",
                          pairname.toLowerCase()
                        );
                        if (response != null) {
                          resData[i].marketPrice = response.lastprice.lastprice;
                        } else {
                          resData[i].marketPrice = resData[i].coin_price;
                        }
                      }
                      //binancefn.CurrencyConversion();
                    }
                    total_balance_usdt +=
                      (resData[i].currencyBalance + resData[i].holdAmount) *
                      resData[i].marketPrice;
                    available_balance_usdt +=
                      resData[i].currencyBalance * resData[i].marketPrice;
                    inorder_balance_usdt +=
                      resData[i].holdAmount * resData[i].marketPrice;
                    var obj = {
                      currencySymbol: resData[i].currencysymbol,
                      currencyName: resData[i].currencyname,
                      image: resData[i].currencyImage,
                      price: parseFloat(resData[i].marketPrice).toFixed(2),
                      change:
                        resData[i].priceChange != null
                          ? parseFloat(resData[i].priceChange).toFixed(2)
                          : 0.0,
                    };
                    response_currency.push(obj);
                  }
                  var balance = {
                    available_balance: available_balance_usdt,
                    total_balance: total_balance_usdt,
                    inorder_balance: inorder_balance_usdt,
                  };
                  var returnJson = {
                    status: true,
                    data: response_currency,
                    balance: balance,
                  };
                  return res.status(200).json(returnJson);
                } else {
                  binancefn.CurrencyConversion();
                }
              }
            }
          );
        }
      });
  } catch (error) {
    //console.log(("catch error==", error);
    return res
      .status(500)
      .json({ Message: "Internal server", code: 500, status: false });
  }
});

// router.get('/portfolio_balance', common.tokenmiddleware, (req, res) => {
//   try {

//     var search = req.body.search;
//     var filter = {}

//     filter = {
//       userId: mongoose.Types.ObjectId(req.userId),
//       'currdetail.status': 'Active',
//       'currdetail.depositStatus': 'Active'
//     }

//     userWalletDB.aggregate([{
//       $unwind: '$wallets'
//     },
//     {
//       $lookup: {
//         from: 'currency',
//         localField: 'wallets.currencyId',
//         foreignField: '_id',
//         as: 'currdetail'
//       }
//     },
//     {
//       $match: filter
//     },
//     {
//       $project: {
//         "currencysymbol": { $arrayElemAt: ['$currdetail.currencySymbol', 0] },
//         "currencyname": { $arrayElemAt: ['$currdetail.currencyName', 0] },
//         "currencyImage": { $arrayElemAt: ['$currdetail.Currency_image', 0] },
//         "priceChange": { $arrayElemAt: ['$currdetail.priceChange', 0] },
//         "currencyBalance": "$wallets.amount",
//         "holdAmount": "$wallets.holdAmount",
//         "status": { $arrayElemAt: ['$currdetail.status', 0] },
//         "depositStatus": { $arrayElemAt: ['$currdetail.depositStatus', 0] },
//         "marketPrice": { $arrayElemAt: ['$currdetail.estimatedValueInUSDT', 0] },
//         "popularOrder": { $arrayElemAt: ['$currdetail.popularOrder', 0] }
//       }
//     },
//     { $sort: { popularOrder: 1 } },
//     ]).exec(async (err, resData) => {
//       if (err) {
//         return res.status(200).json({ Message: err, code: 200, status: false });
//       } else {
//         var total_balance_usdt = 0;
//         var available_balance_usdt = 0;
//         var inorder_balance_usdt = 0;
//         var redis_response = '';

//         client.hget('CurrencyConversion', 'allpair', async function (err, value) {
//           if (value !== null) {
//             let redis_response = await JSON.parse(value);
//             //console.log("redis_response===",redis_response)
//             if (redis_response != null && redis_response != "" && redis_response != undefined && Object.keys(redis_response).length > 0) {
//               for (var i = 0; i < resData.length; i++) {
//                 // console.log("resData[i].currencysymbol===",resData[i].currencysymbol);
//                 // console.log("redis_response[resData[i].currencysymbol].USDT===",redis_response[resData[i].currencysymbol].USDT);
//                 if (redis_response[resData[i].currencysymbol] != undefined) {

//                   resData[i].marketPrice = redis_response[resData[i].currencysymbol].USDT
//                 }
//                 else {
//                   var pairname = resData[i].currencysymbol.toLowerCase() + 'usdt';
//                   var result = await RedisService.hget("BINANCE-TICKERPRICE", pairname);
//                   if (result !== null) {

//                     resData[i].marketPrice = result.lastprice.lastprice;
//                   }
//                   else {
//                     var response = await RedisService.hget("GetTickerPrice", pairname.toLowerCase());
//                     if (response != null) {
//                       resData[i].marketPrice = response.lastprice.lastprice;
//                     }
//                     else {
//                       resData[i].marketPrice = resData[i].coin_price;
//                     }
//                   }
//                   //binancefn.CurrencyConversion();

//                 }

//                 if (isNaN(resData[i].marketPrice)) {
//                   resData[i].marketPrice = 0;
//                 }
//                 // console.log("resData[i].marketPrice===", +resData[i].marketPrice)
//                 // console.log("resData[i].currencyBalance====", +resData[i].currencyBalance);
//                 available_balance_usdt += +resData[i].currencyBalance * +resData[i].marketPrice;
//                 total_balance_usdt += (resData[i].currencyBalance + resData[i].holdAmount) * resData[i].marketPrice;
//                 inorder_balance_usdt += resData[i].holdAmount * resData[i].marketPrice;

//               }

//               var balance = {
//                 available_balance: available_balance_usdt,
//                 total_balance: total_balance_usdt,
//                 inorder_balance: inorder_balance_usdt
//               }
//               //console.log("portfolio_balance obj===", balance)

//               var banners = await bannerDB.find();

//               var value = await RedisService.hgetall("BINANCE-TICKERPRICE");
//               var markets = [];
//               var markets_sliders = [];
//               var conversion_price = 0;
//               if (value !== null) {
//                 if (value.length > 0) {
//                   for (var i = 0; i < value.length; i++) {
//                     if (value[i].pair.split("_")[1] != "INR") {
//                       var obj = {
//                         'pair': value[i].pair.split("_")[0] + '/' + value[i].pair.split("_")[1],
//                         'param_pair': value[i].pair.split("_")[0] + '_' + value[i].pair.split("_")[1],
//                         'volume': value[i].volume,
//                         'price': parseFloat(value[i].lastprice.lastprice).toFixed(4),
//                         'change_24h': value[i].change_percent,
//                       }
//                       markets.push(obj);
//                       if (redis_response != null && redis_response != "" && redis_response != undefined && Object.keys(redis_response).length > 0) {
//                         // console.log("value[i].pair.split===",value[i].pair.split("_")[1]);
//                         // console.log("redis_response[value[i].pair",redis_response[value[i].pair.split("_")[1]].USDT);
//                         // if (redis_response[value[i].pair.split("_")[1]].USDT != undefined) {
//                         //   conversion_price = redis_response[value[i].pair.split("_")[1]].USDT
//                         // }
//                      //console.log(("resData[i].currencysymbol]====",resData[i].currencysymbol)
//                      //console.log(("redis_responseresData[i].currencysymbol]====",redis_response[resData[i].currencysymbol])
//                         if (redis_response[resData[i].currencysymbol] != undefined) {

//                           conversion_price = redis_response[resData[i].currencysymbol].USDT
//                         }
//                         else {
//                           var pairname = resData[i].currencysymbol.toLowerCase() + 'usdt';
//                           var result = await RedisService.hget("BINANCE-TICKERPRICE", pairname);
//                           if (result !== null) {

//                             conversion_price = result.lastprice.lastprice;
//                           }
//                           else {
//                             var response = await RedisService.hget("GetTickerPrice", pairname.toLowerCase());
//                             if (response != null) {
//                               conversion_price = response.lastprice.lastprice;
//                             }
//                             else {
//                               conversion_price = resData[i].coin_price;
//                             }
//                           }

//                         }

//                       }
//                       var lastprice_inr = value[i].lastprice.lastprice * conversion_price;
//                       if (i <= 3) {
//                         var obj1 = {
//                           'pair': value[i].pair.split("_")[0] + '/' + value[i].pair.split("_")[1],
//                           'param_pair': value[i].pair.split("_")[0] + '_' + value[i].pair.split("_")[1],
//                           'price': parseFloat(value[i].lastprice.lastprice).toFixed(4),
//                           'price_inr': parseFloat(lastprice_inr).toFixed(2),
//                           'change_24h': value[i].change_percent,
//                         }
//                         markets_sliders.push(obj1);
//                       }
//                     }

//                   }
//                 }
//               }
//               var returnJson = {
//                 status: true,
//                 markets: markets,
//                 markets_sliders: markets_sliders,
//                 portfolio_balance: parseFloat(balance.available_balance).toFixed(2),
//                 banners: banners,
//                 balance: balance
//               }
//               return res.status(200).json(returnJson);
//             }
//             else {
//               common.currency_conversion(async function (response) {
//                 //console.log("call currency conversion", response)
//                 if (response.status) {
//                   let redis_response = response.message;
//                   //console.log("get user balance redis response ====", redis_response)
//                   if (redis_response != null && redis_response != "" && redis_response != undefined && Object.keys(redis_response).length > 0) {
//                     for (var i = 0; i < resData.length; i++) {
//                       // console.log("resData[i].currencysymbol===",resData[i].currencysymbol);
//                       // console.log("redis_response[resData[i].currencysymbol].USDT===",redis_response[resData[i].currencysymbol].USDT);
//                       if (redis_response[resData[i].currencysymbol] != undefined) {

//                         resData[i].marketPrice = redis_response[resData[i].currencysymbol].USDT
//                       }
//                       else {
//                         var pairname = resData[i].currencysymbol.toLowerCase() + 'usdt';
//                         var result = await RedisService.hget("BINANCE-TICKERPRICE", pairname);
//                         if (result !== null) {

//                           resData[i].marketPrice = result.lastprice.lastprice;
//                         }
//                         else {
//                           var response = await RedisService.hget("GetTickerPrice", pairname.toLowerCase());
//                           if (response != null) {
//                             resData[i].marketPrice = response.lastprice.lastprice;
//                           }
//                           else {
//                             resData[i].marketPrice = resData[i].coin_price;
//                           }
//                         }
//                         //binancefn.CurrencyConversion();

//                       }

//                       if (isNaN(resData[i].marketPrice)) {
//                         resData[i].marketPrice = 0;
//                       }
//                       // console.log("resData[i].marketPrice===", +resData[i].marketPrice)
//                       // console.log("resData[i].currencyBalance====", +resData[i].currencyBalance);
//                       available_balance_usdt += +resData[i].currencyBalance * +resData[i].marketPrice;
//                       total_balance_usdt += (resData[i].currencyBalance + resData[i].holdAmount) * resData[i].marketPrice;
//                       inorder_balance_usdt += resData[i].holdAmount * resData[i].marketPrice;

//                     }

//                     var balance = {
//                       available_balance: available_balance_usdt,
//                       total_balance: total_balance_usdt,
//                       inorder_balance: inorder_balance_usdt
//                     }
//                     //console.log("portfolio_balance obj===", balance)

//                     var banners = await bannerDB.find();

//                     var value = await RedisService.hgetall("BINANCE-TICKERPRICE");
//                     var markets = [];
//                     var markets_sliders = [];
//                     var conversion_price = 0;
//                     if (value !== null) {
//                       if (value.length > 0) {
//                         for (var i = 0; i < value.length; i++) {
//                           if (value[i].pair.split("_")[1] != "INR") {
//                             var obj = {
//                               'pair': value[i].pair.split("_")[0] + '/' + value[i].pair.split("_")[1],
//                               'param_pair': value[i].pair.split("_")[0] + '_' + value[i].pair.split("_")[1],
//                               'volume': value[i].volume,
//                               'price': parseFloat(value[i].lastprice.lastprice).toFixed(4),
//                               'change_24h': value[i].change_percent,
//                             }
//                             markets.push(obj);
//                             if (redis_response != null && redis_response != "" && redis_response != undefined && Object.keys(redis_response).length > 0) {
//                               // console.log("value[i].pair.split===",value[i].pair.split("_")[1]);
//                               // console.log("redis_response[value[i].pair",redis_response[value[i].pair.split("_")[1]].USDT);
//                               // if (redis_response[value[i].pair.split("_")[1]].USDT != undefined) {
//                               //   conversion_price = redis_response[value[i].pair.split("_")[1]].USDT
//                               // }

//                               if (redis_response[resData[i].currencysymbol] != undefined) {

//                                 conversion_price = redis_response[resData[i].currencysymbol].USDT
//                               }
//                               else {
//                                 var pairname = resData[i].currencysymbol.toLowerCase() + 'usdt';
//                                 var result = await RedisService.hget("BINANCE-TICKERPRICE", pairname);
//                                 if (result !== null) {

//                                   conversion_price = result.lastprice.lastprice;
//                                 }
//                                 else {
//                                   var response = await RedisService.hget("GetTickerPrice", pairname.toLowerCase());
//                                   if (response != null) {
//                                     conversion_price = response.lastprice.lastprice;
//                                   }
//                                   else {
//                                     conversion_price = resData[i].coin_price;
//                                   }
//                                 }

//                               }

//                             }
//                             var lastprice_inr = value[i].lastprice.lastprice * conversion_price;
//                             if (i <= 3) {
//                               var obj1 = {
//                                 'pair': value[i].pair.split("_")[0] + '/' + value[i].pair.split("_")[1],
//                                 'param_pair': value[i].pair.split("_")[0] + '_' + value[i].pair.split("_")[1],
//                                 'price': parseFloat(value[i].lastprice.lastprice).toFixed(4),
//                                 'price_inr': parseFloat(lastprice_inr).toFixed(2),
//                                 'change_24h': value[i].change_percent,
//                               }
//                               markets_sliders.push(obj1);
//                             }
//                           }

//                         }
//                       }
//                     }
//                     var returnJson = {
//                       status: true,
//                       markets: markets,
//                       markets_sliders: markets_sliders,
//                       portfolio_balance: parseFloat(balance.available_balance).toFixed(2),
//                       banners: banners,
//                       balance: balance
//                     }
//                     return res.status(200).json(returnJson);
//                   }
//                 }
//               });
//             }
//           }
//         });
//       }
//     });
//   } catch (error) {
//  //console.log(("catch error==", error);
//     return res.status(500).json({ Message: "Internal server", code: 500, status: false });
//   }
// });

router.get("/portfolio_balance", common.tokenmiddleware, (req, res) => {
  try {
    var search = req.body.search;
    var filter = {};

    filter = {
      userId: mongoose.Types.ObjectId(req.userId),
      "currdetail.status": "Active",
      "currdetail.depositStatus": "Active",
    };

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
          $match: filter,
        },
        {
          $project: {
            currencysymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyname: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencyImage: { $arrayElemAt: ["$currdetail.Currency_image", 0] },
            priceChange: { $arrayElemAt: ["$currdetail.priceChange", 0] },
            currencyBalance: "$wallets.amount",
            holdAmount: "$wallets.holdAmount",
            status: { $arrayElemAt: ["$currdetail.status", 0] },
            depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
            marketPrice: {
              $arrayElemAt: ["$currdetail.estimatedValueInUSDT", 0],
            },
            popularOrder: { $arrayElemAt: ["$currdetail.popularOrder", 0] },
          },
        },
        { $sort: { popularOrder: 1 } },
      ])
      .exec(async (err, resData) => {
        if (err) {
          return res
            .status(200)
            .json({ Message: err, code: 200, status: false });
        } else {
          var total_balance_usdt = 0;
          var available_balance_usdt = 0;
          var inorder_balance_usdt = 0;
          var redis_response = "";

          client.hget(
            "CurrencyConversion",
            "allpair",
            async function (err, value) {
              if (value !== null) {
                let redis_response = await JSON.parse(value);
                //console.log("redis_response===",redis_response)
                if (
                  redis_response != null &&
                  redis_response != "" &&
                  redis_response != undefined &&
                  Object.keys(redis_response).length > 0
                ) {
                  for (var i = 0; i < resData.length; i++) {
                    console.log(
                      "resData[i].currencysymbol===",
                      resData[i],
                      "=============================================="
                    );
                    // console.log("redis_response[resData[i].currencysymbol].USDT===",redis_response[resData[i].currencysymbol].USDT);
                    if (
                      redis_response[resData[i].currencysymbol] != undefined
                    ) {
                      resData[i].marketPrice =
                        redis_response[resData[i].currencysymbol].USDT;
                    } else {
                      var pairname =
                        resData[i].currencysymbol.toLowerCase() + "usdt";
                      var result = await RedisService.hget(
                        "BINANCE-TICKERPRICE",
                        pairname
                      );
                      if (result !== null) {
                        resData[i].marketPrice = result.lastprice.lastprice;
                      } else {
                        var response = await RedisService.hget(
                          "GetTickerPrice",
                          pairname.toLowerCase()
                        );
                        if (response != null) {
                          resData[i].marketPrice = response.lastprice.lastprice;
                        } else {
                          resData[i].marketPrice = resData[i].coin_price;
                        }
                      }
                      //binancefn.CurrencyConversion();
                    }

                    if (isNaN(resData[i].marketPrice)) {
                      resData[i].marketPrice = 0;
                    }
                    // console.log("resData[i].marketPrice===", +resData[i].marketPrice)
                    // console.log("resData[i].currencyBalance====", +resData[i].currencyBalance);
                    available_balance_usdt +=
                      +resData[i].currencyBalance * +resData[i].marketPrice;
                    total_balance_usdt +=
                      (resData[i].currencyBalance + resData[i].holdAmount) *
                      resData[i].marketPrice;
                    inorder_balance_usdt +=
                      resData[i].holdAmount * resData[i].marketPrice;
                  }

                  var balance = {
                    available_balance: available_balance_usdt,
                    total_balance: total_balance_usdt,
                    inorder_balance: inorder_balance_usdt,
                  };
                  var returnJson = {
                    status: true,
                    portfolio_balance: parseFloat(
                      balance.available_balance
                    ).toFixed(2),
                    balance: balance,
                  };
                  return res.status(200).json(returnJson);
                } else {
                  common.currency_conversion(async function (response) {
                    //console.log("call currency conversion", response)
                    if (response.status) {
                      let redis_response = response.message;
                      //console.log("get user balance redis response ====", redis_response)
                      if (
                        redis_response != null &&
                        redis_response != "" &&
                        redis_response != undefined &&
                        Object.keys(redis_response).length > 0
                      ) {
                        for (var i = 0; i < resData.length; i++) {
                          // console.log("resData[i].currencysymbol===",resData[i].currencysymbol);
                          // console.log("redis_response[resData[i].currencysymbol].USDT===",redis_response[resData[i].currencysymbol].USDT);
                          if (
                            redis_response[resData[i].currencysymbol] !=
                            undefined
                          ) {
                            resData[i].marketPrice =
                              redis_response[resData[i].currencysymbol].USDT;
                          } else {
                            var pairname =
                              resData[i].currencysymbol.toLowerCase() + "usdt";
                            var result = await RedisService.hget(
                              "BINANCE-TICKERPRICE",
                              pairname
                            );
                            if (result !== null) {
                              resData[i].marketPrice =
                                result.lastprice.lastprice;
                            } else {
                              var response = await RedisService.hget(
                                "GetTickerPrice",
                                pairname.toLowerCase()
                              );
                              if (response != null) {
                                resData[i].marketPrice =
                                  response.lastprice.lastprice;
                              } else {
                                resData[i].marketPrice = resData[i].coin_price;
                              }
                            }
                            //binancefn.CurrencyConversion();
                          }

                          if (isNaN(resData[i].marketPrice)) {
                            resData[i].marketPrice = 0;
                          }
                          // console.log("resData[i].marketPrice===", +resData[i].marketPrice)
                          // console.log("resData[i].currencyBalance====", +resData[i].currencyBalance);
                          available_balance_usdt +=
                            +resData[i].currencyBalance *
                            +resData[i].marketPrice;
                          total_balance_usdt +=
                            (resData[i].currencyBalance +
                              resData[i].holdAmount) *
                            resData[i].marketPrice;
                          inorder_balance_usdt +=
                            resData[i].holdAmount * resData[i].marketPrice;
                        }

                        var balance = {
                          available_balance: available_balance_usdt,
                          total_balance: total_balance_usdt,
                          inorder_balance: inorder_balance_usdt,
                        };

                        var returnJson = {
                          status: true,
                          portfolio_balance: parseFloat(
                            balance.available_balance
                          ).toFixed(2),
                          balance: balance,
                        };
                        return res.status(200).json(returnJson);
                      }
                    }
                  });
                }
              }
            }
          );
        }
      });
  } catch (error) {
    //console.log(("catch error==", error);
    return res
      .status(500)
      .json({ Message: "Internal server", code: 500, status: false });
  }
});

router.get("/portfolio_markets", common.tokenmiddleware, (req, res) => {
  try {
    client.hget("CurrencyConversion", "allpair", async function (err, value) {
      if (value !== null) {
        let redis_response = await JSON.parse(value);
        var banners = await bannerDB.find();

        var value = await RedisService.hgetall("BINANCE-TICKERPRICE");
        var markets = [];
        var markets_sliders = [];
        var conversion_price = 0;
        if (value !== null) {
          if (value.length > 0) {
            for (var i = 0; i < value.length; i++) {
              if (value[i].pair.split("_")[1] != "INR") {
                var obj = {
                  pair:
                    value[i].pair.split("_")[0] +
                    "/" +
                    value[i].pair.split("_")[1],
                  param_pair:
                    value[i].pair.split("_")[0] +
                    "_" +
                    value[i].pair.split("_")[1],
                  volume: value[i].volume,
                  price: parseFloat(value[i].lastprice.lastprice).toFixed(4),
                  change_24h: parseFloat(value[i].change_percent).toFixed(2),
                };
                markets.push(obj);
                if (
                  redis_response != null &&
                  redis_response != "" &&
                  redis_response != undefined &&
                  Object.keys(redis_response).length > 0
                ) {
                  // console.log("value[i].pair.split===",value[i].pair.split("_")[1]);
                  // console.log("redis_response[value[i].pair",redis_response[value[i].pair.split("_")[1]].USDT);
                  // if (redis_response[value[i].pair.split("_")[1]].USDT != undefined) {
                  //   conversion_price = redis_response[value[i].pair.split("_")[1]].USDT
                  // }
                  var symbol = value[i].pair.split("_")[0];
                  // console.log("resData[i].currencysymbol]====",symbol)
                  // console.log("redis_responseresData[i].currencysymbol]====",redis_response[symbol])
                  if (redis_response[symbol] != undefined) {
                    conversion_price = redis_response[symbol].USDT;
                  } else {
                    var pairname = symbol.toLowerCase() + "usdt";
                    var result = await RedisService.hget(
                      "BINANCE-TICKERPRICE",
                      pairname
                    );
                    if (result !== null) {
                      conversion_price = result.lastprice.lastprice;
                    } else {
                      var response = await RedisService.hget(
                        "GetTickerPrice",
                        pairname.toLowerCase()
                      );
                      if (response != null) {
                        conversion_price = response.lastprice.lastprice;
                      }
                    }
                  }
                } else {
                  common.currency_conversion(async function (response) {
                    //console.log("call currency conversion", response)
                    if (response.status) {
                      let redis_response = response.message;
                      //console.log("get user balance redis response ====", redis_response)
                      if (
                        redis_response != null &&
                        redis_response != "" &&
                        redis_response != undefined &&
                        Object.keys(redis_response).length > 0
                      ) {
                        var symbol = value[i].pair.split("_")[0];
                        // console.log("resData[i].currencysymbol]====",symbol)
                        // console.log("redis_responseresData[i].currencysymbol]====",redis_response[symbol])
                        if (redis_response[symbol] != undefined) {
                          conversion_price = redis_response[symbol].USDT;
                        } else {
                          var pairname = symbol.toLowerCase() + "usdt";
                          var result = await RedisService.hget(
                            "BINANCE-TICKERPRICE",
                            pairname
                          );
                          if (result !== null) {
                            conversion_price = result.lastprice.lastprice;
                          } else {
                            var response = await RedisService.hget(
                              "GetTickerPrice",
                              pairname.toLowerCase()
                            );
                            if (response != null) {
                              conversion_price = response.lastprice.lastprice;
                            }
                          }
                        }
                      }
                    }
                  });
                }
                var lastprice_inr =
                  value[i].lastprice.lastprice * conversion_price;
                if (i <= 3) {
                  var obj1 = {
                    pair:
                      value[i].pair.split("_")[0] +
                      "/" +
                      value[i].pair.split("_")[1],
                    param_pair:
                      value[i].pair.split("_")[0] +
                      "/" +
                      value[i].pair.split("_")[1],
                    price: parseFloat(value[i].lastprice.lastprice).toFixed(4),
                    price_inr: parseFloat(lastprice_inr).toFixed(2),
                    change_24h: parseFloat(value[i].change_percent).toFixed(2),
                  };
                  markets_sliders.push(obj1);
                }
              }
            }
          }
        }
        var returnJson = {
          status: true,
          markets: markets,
          markets_sliders: markets_sliders,
          banners: banners,
        };
        return res.status(200).json(returnJson);
      }
    });
  } catch (error) {
    //console.log(("catch error==", error);
    return res
      .status(500)
      .json({ Message: "Internal server", code: 500, status: false });
  }
});
router.post("/transfer_balance", common.tokenmiddleware, async (req, res) => {
  try {
    var reqbody = req.body;
    var walletdetail = await userWalletDB.findOne({
      userId: mongoose.Types.ObjectId(req.userId),
      "wallets.currencySymbol": reqbody.symbol,
    });
    if (walletdetail !== null) {
      var balancedetail = await userWalletDB.findOne({
        userId: mongoose.Types.ObjectId(req.userId),
        "wallets.currencySymbol": reqbody.symbol,
      });
      var Indexing = balancedetail.wallets.findIndex(
        (x) => x.currencySymbol == reqbody.symbol
      );
      if (Indexing != -1) {
        if (reqbody.amount <= balancedetail.wallets[Indexing].amount) {
          var updateobj = {
            $push: {
              wallets: {
                // currencyId:mongoose.Types.ObjectId(createdData._id),
                //               currencyName: createdData.currencyName,
                //               currencySymbol:createdData.currencySymbol ,
                amount: reqbody.amount,
              },
            },
          };
          await userWalletDB.updateOne(
            { userId: mongoose.Types.ObjectId(req.userId) },
            updateobj,
            { new: true }
          );
        } else {
          res
            .status(400)
            .json({ Message: "Insufficient balance", status: false });
        }
      }
    } else {
      res.status(400).json({ Message: "Currency Not Found", status: false });
    }
  } catch (error) {
    res.status(500).json({ Message: "Internal server", status: false });
  }
});
//USERSIDE BANK DETAILS===================================
router.post("/submit_bankdetails", common.tokenmiddleware, async (req, res) => {
  console.log(req.body, "reqbody==================");
  try {
    if (
      req.body.AccountHolderName != "" &&
      req.body.AccountHolderName != null &&
      req.body.AccountHolderName != undefined &&
      req.body.AccountNumber != "" &&
      req.body.AccountNumber != null &&
      req.body.AccountNumber != undefined &&
      req.body.BankName != "" &&
      req.body.BankName != null &&
      req.body.BankName != undefined &&
      req.body.BranchName != "" &&
      req.body.BranchName != null &&
      req.body.BranchName != undefined &&
      req.body.BranchAddress != "" &&
      req.body.BranchAddress != null &&
      req.body.BranchAddress != undefined &&
      req.body.IFSCCode != "" &&
      req.body.IFSCCode != null &&
      req.body.IFSCCode != undefined
    ) {
      let getBankDetails = await bankdb.find({ userid: req.userId }).exec();
      let updatebankdetails = await bankdb
        .updateMany(
          { userid: mongoose.Types.ObjectId(req.userId) },
          { $set: { Status: 0 } },
          { multi: true }
        )
        .exec();
      var obj = {
        Accout_HolderName: req.body.AccountHolderName,
        Account_Number: req.body.AccountNumber,
        Bank_Name: req.body.BankName,
        Branch_Name: req.body.BranchName,
        Branch_Address: req.body.BranchAddress,
        Paytm_Number: req.body.paytm_number,
        Gpay_Number: req.body.gpay_number,
        IFSC_code: req.body.IFSCCode,
        userid: req.userId,
        Status: 1,
      };

      const createbankdetails = await bankdb.create(obj);

      console.log(createbankdetails, "createbankdetails");

      if (createbankdetails) {
        return res.json({
          status: true,
          Message: "Bank details Added successfully!",
        });
      } else {
        return res.json({
          status: false,
          Message: "Bank details not updated successfully!",
        });
      }
    } else {
      return res.json({
        status: false,
        Message: "All fields required!",
      });
    }
  } catch (error) {
    //console.log((error, "=-=-=error-=-");

    res.json({ status: false, Message: "Internel server error", code: 500 });
  }
});

router.post("/updateBankdetails", common.tokenmiddleware, async (req, res) => {
  try {
    var reqbody = req.body;
    var status = "";
    let getBankDetails = await bankdb.find({ userid: req.userId }).exec();
    status = getBankDetails.length == 0 ? 1 : 0;

    var obj = {
      Accout_HolderName: reqbody.AccountHolderName,
      Account_Number: reqbody.AccountNumber,
      Bank_Name: reqbody.BankName,
      Branch_Name: reqbody.BranchName,
      Branch_Address: reqbody.BranchAddress,
      Paytm_Number: reqbody.paytm_number,
      Gpay_Number: reqbody.gpay_number,
      IFSC_code: reqbody.IFSCCode,
      userid: req.userId,
      Status: status,
    };

    console.log(req.body, "-=-reqbody=-=-=", obj);
    const createbankdetails = await bankdb.updateOne(
      { _id: reqbody._id },
      { $set: obj }
    );

    console.log(createbankdetails, "--=-=createbankdetails=-=-");
    if (createbankdetails) {
      return res.json({
        status: true,
        Message: "Bank details updated successfully!!",
      });
    } else {
      return res.json({
        status: true,
        Message: "Bank details not updated successfully!!",
      });
    }
  } catch (error) {
    console.log(error, "=-=-=error-=-");
    res.json({ status: false, Message: "Internel server error", code: 500 });
  }
});

router.get("/Get_bankdetails", common.tokenmiddleware, async (req, res) => {
  try {
    let getBankDetails = await bankdb
      .find({ userid: req.userId })
      .sort({ _id: -1 })
      .exec();
    if (getBankDetails) {
      return res.json({
        status: true,
        Message: "bank details are getted",
        data: getBankDetails,
      });
    } else {
      return res.json({ status: false, Message: [], data: [] });
    }
  } catch (error) {
    res.json({ status: false, Message: "Internel server error", code: 500 });
  }
});

router.post("/defaultBankChoose", common.tokenmiddleware, async (req, res) => {
  try {
    let deletDatai = await bankdb.find({ userid: req.userId });

    let deletData = await bankdb
      .updateMany(
        { userid: mongoose.Types.ObjectId(req.userId) },
        { $set: { Status: 0 } },
        { multi: true }
      )
      .exec();

    if (deletData) {
      let deletData = await bankdb
        .updateOne(
          { _id: req.body._id },
          { $set: { Status: 1 } },
          { new: true }
        )
        .exec();

      if (deletData) {
        return res.json({
          status: true,
          Message: "Your default bank Account was changed",
        });
      } else {
        return res.json({ status: false, Message: "Please try again later!" });
      }
    } else {
      return res.json({ status: false, Message: "Please try again later!" });
    }
  } catch (error) {
    //console.log((error, "=-=error=-=-");
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later!",
    });
  }
});
router.post("/deletbankDetails", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body, "delete account");
    let deletData = await bankdb
      .deleteOne({ _id: req.body._id, userid: req.userId })
      .exec();
    if (deletData) {
      let deletData = await bankdb
        .updateMany(
          { userid: mongoose.Types.ObjectId(req.userId) },
          { $set: { Status: 0 } },
          { multi: true }
        )
        .exec();

      let find = await bankdb.find({
        userid: mongoose.Types.ObjectId(req.userId),
      });
      //console.log((find, "find");
      var updata = await bankdb.findOneAndUpdate(
        { _id: find[0]._id },
        { $set: { Status: 1 } }
      );
      return res.json({
        status: true,
        Message: "Bank details deleted successfully!",
      });
    } else {
      return res.json({ status: false, Message: "Please try again later!" });
    }
  } catch (error) {
    //console.log((error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later!",
    });
  }
});

router.post("/update_profile", common.tokenmiddleware, async (req, res) => {
  try {
    if (req.body.username != "") {
      var updateName = await usersDB
        .updateOne(
          { _id: mongoose.Types.ObjectId(req.userId) },
          { $set: { username: req.body.username } }
        )
        .exec();
      //mobileNumber
      if (updateName) {
        return res
          .status(200)
          .json({ message: "Profile updated successfully", status: true });
      } else {
        return res
          .status(400)
          .json({ message: "Something went wrong", status: false });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Please enter all the fields", status: false });
    }
    if (req.body.mobileNumber != "") {
      var updateMobile = await usersDB
        .updateOne(
          { _id: mongoose.Types.ObjectId(req.userId) },
          { $set: { mobileNumber: req.body.mobileNumber } }
        )
        .exec();
      if (updateMobile) {
        return res
          .status(200)
          .json({ message: "Profile updated successfully", status: true });
      } else {
        return res
          .status(400)
          .json({ message: "Something went wrong", status: false });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Please enter all the fields", status: false });
    }
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong!",
      status: false,
      error: err.message,
    });
  }
});

//MOBILE SIDE BANK DETAILS

router.post(
  "/mobile_submit_bankdetails",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      if (
        req.body.Account_Number != "" &&
        req.body.Account_Number != null &&
        req.body.Account_Number != undefined &&
        req.body.Accout_HolderName != "" &&
        req.body.Accout_HolderName != null &&
        req.body.Accout_HolderName != undefined &&
        req.body.Bank_Name != "" &&
        req.body.Bank_Name != null &&
        req.body.Bank_Name != undefined &&
        req.body.Branch_Name != "" &&
        req.body.Branch_Name != null &&
        req.body.Branch_Name != undefined &&
        req.body.Branch_Address != "" &&
        req.body.Branch_Address != null &&
        req.body.Branch_Address != undefined &&
        req.body.Paytm_Number != "" &&
        req.body.Paytm_Number != null &&
        req.body.Paytm_Number != undefined &&
        req.body.Gpay_Number != "" &&
        req.body.Gpay_Number != null &&
        req.body.Gpay_Number != undefined &&
        req.body.IFSC_code != "" &&
        req.body.IFSC_code != null &&
        req.body.IFSC_code != undefined
      ) {
        let getBankDetails = await bankdb.find({ userid: req.userId }).exec();
        let updatebankdetails = await bankdb
          .updateMany(
            { userid: mongoose.Types.ObjectId(req.userId) },
            { $set: { Status: 0 } },
            { multi: true }
          )
          .exec();
        var obj = {
          Accout_HolderName: req.body.Accout_HolderName,
          Account_Number: req.body.Account_Number,
          Bank_Name: req.body.Bank_Name,
          Branch_Name: req.body.Branch_Name,
          Branch_Address: req.body.Branch_Address,
          Paytm_Number: req.body.Paytm_Number,
          Gpay_Number: req.body.Gpay_Number,
          IFSC_code: req.body.IFSC_code,
          userid: req.userId,
          Status: 1,
        };

        const createbankdetails = await bankdb.create(obj);

        if (createbankdetails) {
          return res.json({
            status: true,
            Message: "Bank details Added successfully!",
          });
        } else {
          return res.json({
            status: true,
            Message: "Bank details not updated successfully!",
          });
        }
      } else {
        return res.json({
          status: true,
          Message: "All fields required!",
        });
      }
    } catch (error) {
      //console.log((error, "=-=-=error-=-");

      res.json({ status: false, Message: "Internel server error", code: 500 });
    }
  }
);

router.get(
  "/mobile_Get_bankdetails",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      let getBankDetails = await bankdb
        .find({ userid: req.userId })
        .sort({ _id: -1 })
        .exec();
      if (getBankDetails) {
        return res.json({
          status: true,
          Message: "bank details are getted",
          data: getBankDetails,
        });
      } else {
        return res.json({ status: false, Message: [], data: [] });
      }
    } catch (error) {
      res.json({ status: false, Message: "Internel server error", code: 500 });
    }
  }
);

router.post(
  "/mobile_defaultBankChoose",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      let deletDatai = await bankdb.find({ userid: req.userId });

      let deletData = await bankdb
        .updateMany(
          { userid: mongoose.Types.ObjectId(req.userId) },
          { $set: { Status: 0 } },
          { multi: true }
        )
        .exec();

      //console.log((deletData, "kjsadfk");
      if (deletData) {
        let deletData = await bankdb
          .updateOne(
            { _id: req.body.bankid },
            { $set: { Status: 1 } },
            { new: true }
          )
          .exec();

        if (deletData) {
          return res.json({
            status: true,
            Message: "Your default bank Account was changed",
          });
        } else {
          return res.json({
            status: false,
            Message: "Please try again later!",
          });
        }
      } else {
        return res.json({ status: false, Message: "Please try again later!" });
      }
    } catch (error) {
      //console.log((error, "=-=error=-=-");
      return res.json({
        status: false,
        Message: "Internal server error, Please try again later!",
      });
    }
  }
);
router.post(
  "/mobile_deletbankDetails",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      let deletData = await bankdb
        .deleteOne({ _id: req.body.bankid, userid: req.userId })
        .exec();
      if (deletData) {
        let deletData = await bankdb
          .updateMany(
            { userid: mongoose.Types.ObjectId(req.userId) },
            { $set: { Status: 0 } },
            { multi: true }
          )
          .exec();

        let find = await bankdb.find({
          userid: mongoose.Types.ObjectId(req.userId),
        });
        //console.log((find, "find");
        var updata = await bankdb.findOneAndUpdate(
          { _id: find[0]._id },
          { $set: { Status: 1 } }
        );
        return res.json({
          status: true,
          Message: "Bank details deleted successfully!",
        });
      } else {
        return res.json({ status: false, Message: "Please try again later!" });
      }
    } catch (error) {
      //console.log((error);
      return res.json({
        status: false,
        Message: "Internal server error, Please try again later!",
      });
    }
  }
);

router.post("/update_profile", common.tokenmiddleware, async (req, res) => {
  try {
    if (req.body.username != "") {
      var updateName = await usersDB
        .updateOne(
          { _id: mongoose.Types.ObjectId(req.userId) },
          { $set: { username: req.body.username } }
        )
        .exec();
      //mobileNumber
      if (updateName) {
        return res
          .status(200)
          .json({ message: "Profile updated successfully", status: true });
      } else {
        return res
          .status(400)
          .json({ message: "Something went wrong", status: false });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Please enter all the fields", status: false });
    }
    if (req.body.mobileNumber != "") {
      var updateMobile = await usersDB
        .updateOne(
          { _id: mongoose.Types.ObjectId(req.userId) },
          { $set: { mobileNumber: req.body.mobileNumber } }
        )
        .exec();
      if (updateMobile) {
        return res
          .status(200)
          .json({ message: "Profile updated successfully", status: true });
      } else {
        return res
          .status(400)
          .json({ message: "Something went wrong", status: false });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Please enter all the fields", status: false });
    }
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong!",
      status: false,
      error: err.message,
    });
  }
});

router.get("/deleteAccount", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = { _id: req.userId };
    var userProfile = {
      account_status: 0,
    };
    //console.log((userProfile, "===userProfile===");
    let userUpdate = await usersDB.findOneAndUpdate(userId, userProfile);
    if (userUpdate) {
      return res
        .status(200)
        .json({ status: true, message: "Account deleted successfully" });
    } else {
      return res.status(200).json({
        status: false,
        message: "Something went wrong, Please try again later",
      });
    }
  } catch (error) {
    //console.log(("ERROR FROM deleteAccount UPDATE", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error, Please try again later",
    });
  }
});

router.post("/getStopOrders", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    //var pair   = req.body.pair;
    var currency_id = "";
    if (req.body.FilPerpage != "" || req.body.FilPage != "") {
      // if(typeof req.body.FilPerpage =="number" && typeof req.body.FilPage =="number")
      // {
      var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 0);
      var page = Number(req.body.FilPage ? req.body.FilPage : 0);
      // if (typeof perPage !== 'undefined' && perPage !== '' && perPage > 0 &&
      // typeof page !== 'undefined' && page !== '' && page > 0) {
      var skippage = perPage * page - perPage;
      // console.log(pair,'=-=-=-=pair-=-=-=-=pair-=-=-=-=-==',userId);
      orderDB
        .find(
          {
            userId: mongoose.mongo.ObjectId(userId.toString()),
            ordertype: "Stop",
          },
          {
            firstSymbol: 1,
            toSymbol: 1,
            pairName: 1,
            ordertype: 1,
            tradeType: 1,
            amount: 1,
            price: 1,
            total: 1,
            createddate: 1,
            stoporderprice: 1,
            filledAmount: 1,
          }
        )
        .skip(skippage)
        .limit(perPage)
        .sort({ _id: -1 })
        .exec(function (err, resp) {
          orderDB
            .find({
              userId: mongoose.mongo.ObjectId(userId.toString()),
              ordertype: "Stop",
            })
            .countDocuments()
            .exec(function (err1, count) {
              var cancel_orders = [];
              if (resp.length > 0) {
                for (var i = 0; i < resp.length; i++) {
                  var obj = {
                    _id: resp[i]._id,
                    createddate: moment(resp[i].createddate).format(
                      "DD.MM.YYYY hh:mm:a"
                    ),
                    pairName: resp[i].firstSymbol + "/" + resp[i].toSymbol,
                    ordertype: resp[i].ordertype,
                    tradeType: resp[i].tradeType,
                    amount: parseFloat(resp[i].amount).toFixed(4),
                    filledAmount: parseFloat(resp[i].filledAmount).toFixed(4),
                    price: parseFloat(resp[i].price).toFixed(4),
                    stoporderprice: parseFloat(resp[i].stoporderprice).toFixed(
                      4
                    ),
                    total: parseFloat(resp[i].total).toFixed(4),
                  };
                  cancel_orders.push(obj);
                }
              }
              var returnJson = {
                status: true,
                result: cancel_orders,
                current: page,
                count: count,
                pages: Math.ceil(count / perPage),
              };
              res.json(returnJson);
            });
        });
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Please enter pagination fields" });
    }
  } catch (e) {
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.get("/kycStatus", common.tokenmiddleware, async (req, res) => {
  try {
    let getKYC = await usersDB
      .findOne({ _id: req.userId }, { kycstatus: 1 })
      .limit(1)
      .exec();
    let bankdata = await bankdb.find({ userid: req.userId }).exec();
    //console.log((
    //   bankdata.length,
    //   "==-=getKYC-=-=---=-=-getKYC=-=-=-=-=-getKYC=-="
    // );

    if (getKYC) {
      return res.status(200).send({
        status: true,
        Message: getKYC,
        bankdatastatus: bankdata.length > 0 ? 1 : 0,
      });
    } else {
      return res
        .status(204)
        .json({ status: false, Message: "Please try again later" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.get("/notifications", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let notifications = await notifydb
      .find({ to_user_id: ObjectId(userId), status: 0 })
      .sort({ _id: -1 });
    if (notifications) {
      return res.json({ status: true, Message: notifications });
    } else {
      return res.json({ status: false, Message: [] });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post(
  "/getnotificationsAll",
  common.tokenmiddleware,
  async (req, res) => {
    //console.log((req.body, "req.body");
    try {
      //console.log(("-------------", req.body);

      var perPage = Number(req.body.perpage ? req.body.perpage : 5);
      var page = Number(req.body.page ? req.body.page : 1);

      var skippage = perPage * page - perPage;

      var notification = await notifydb
        .find({ to_user_id: req.userId })
        .skip(skippage)
        .limit(perPage)
        .sort({ _id: -1 })
        .exec();
      if (notification) {
        var pagedata = await notifydb.find({ to_user_id: req.userId }).count();
        var returnObj = {
          data: notification,
          current: page,
          pages: Math.ceil(pagedata / perPage),
          total: pagedata,
        };
        let updateNotify = await notifydb.updateMany(
          { status: 0, to_user_id: req.userId },
          { $set: { status: 1 } }
        );
        //console.log((returnObj, "returnObj");
        return res.status(200).send({
          success: true,
          message: "Data Successfully retrieved",
          data: returnObj,
        });
      } else {
        return res
          .status(400)
          .send({ success: true, message: "Data Does Not retrieved" });
      }
    } catch (error) {
      return res.json({
        status: false,
        Message: "Internal server error, Please try again later",
      });
    }
  }
);

router.post("/updateNotifyRecord", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let notificationsRead = await notifydb.updateOne(
      { _id: req.body._id },
      { $set: { status: 1 } }
    );
    if (notificationsRead) {
      return res.json({ status: true, Message: notificationsRead });
    } else {
      return res.json({ status: false, Message: {} });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/mobileotpverify", async (req, res) => {
  try {
    var mobile = req.body.mobile;

    //console.log(("verifyUser req.body==", req.body);

    let findUser = await usersDB.findOne({ mobileOtp: req.body.mobileOtp });

    //console.log(("finduser==", findUser);
    if (findUser) {
      if (findUser.mobileOtp == req.body.mobileOtp) {
        let verifyUser = await usersDB.updateOne(
          { mobileOtp: req.body.mobileOtp },
          { $set: { verifyMobile: 1, status: 1 } }
        );

        //console.log(("verifyUser==", verifyUser);

        if (verifyUser) {
          return res.json({
            status: true,
            Message: "Your Account verified successfully, login to continue.",
          });
        } else {
          return res.json({
            status: false,
            Message: "OTP not verified, Please try again later.",
          });
        }
      } else {
        return res.json({
          status: false,
          Message: "OTP not verified, Please try again later.",
        });
      }
    } else {
      return res.json({ status: false, Message: "Please try again later." });
    }
  } catch (e) {
    //console.log(("error from OTP", e);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/login_mobile", common.isEmpty, async (req, res) => {
  try {
    // console.log(common.encrypt(req.body.email), "req.body.----====");
    if (
      req.body.email != "" &&
      req.body.password != "" &&
      req.body.email != undefined &&
      req.body.password != undefined
    ) {
      var domain = req.body.email.split("@")[1];
      if (domain) {
        let checkEmailDomain = await emailDomainDB
          .findOne({ email_domain: domain })
          .exec();
        // console.log(checkEmailDomain, "=-=-=-=checkEmailDomain");
        if (checkEmailDomain == null) {
          usersDB
            .findOne(
              { email: common.encrypt(req.body.email) },
              {
                email: 1,
                password: 1,
                verifyEmail: 1,
                tfastatus: 1,
                tfaenablekey: 1,
                account_status: 1,
                status: 1,
                loginattempt: 1,
                logouttime: 1,
                loginStatus: 1,
              }
            )
            .exec(async (err, data) => {
              // console.log(data, "dadatadfatyada");
              if (!err) {
                if (data) {
                  if (data.account_status == 0) {
                    res.json({ status: false, Message: "User not found" });
                  } else if (
                    common.decrypt(data.password) != req.body.password
                  ) {
                    var login = await usersDB.updateOne(
                      { email: common.encrypt(req.body.email) },
                      { $inc: { loginattempt: 1 } }
                    );
                    if (data.loginattempt >= 5) {
                      var timing = new Date();
                      var timed = new Date(
                        Date.now(timing) + 1 * (60 * 60 * 1000)
                      );
                      if (data.loginattempt == 5) {
                        var logout = await usersDB.findOneAndUpdate(
                          { email: common.encrypt(req.body.email) },
                          { $set: { logouttime: timed } }
                        );
                        if (data.loginattempt == 5) {
                          var logout = await usersDB.findOneAndUpdate(
                            { email: common.encrypt(req.body.email) },
                            { $set: { logouttime: timed } }
                          );
                          return res.json({
                            status: false,
                            Message: "Too Many times Try to One Hour",
                          });
                        }
                        if (data.loginattempt >= 5) {
                          var date = new Date(timing).getTime();

                          var timestamp = await usersDB.findOne({
                            email: common.encrypt(req.body.email),
                          });

                          var dateing = new Date(timed).getTime();

                          const time1 = new Date(data.logouttime).getTime();
                          const timeDifference = time1 - date;
                          const minutesDifference = Math.floor(
                            timeDifference / (1000 * 60)
                          );
                          if (date >= data.logouttime) {
                            var logout = await usersDB.updateOne(
                              { email: common.encrypt(req.body.email) },
                              { $set: { loginattempt: 0 } }
                            );
                          }
                          return res.json({
                            status: false,
                            Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                          });
                        }
                        return res.json({
                          status: false,
                          Message: "Too Many times Try to One Hour",
                        });
                      }
                      if (data.loginattempt >= 5) {
                        var date = new Date(timing).getTime();

                        var timestamp = await usersDB.findOne({
                          email: common.encrypt(req.body.email),
                        });

                        var dateing = new Date(timed).getTime();

                        const time1 = new Date(data.logouttime).getTime();
                        const timeDifference = time1 - date;
                        const minutesDifference = Math.floor(
                          timeDifference / (1000 * 60)
                        );
                        if (date >= data.logouttime) {
                          var logout = await usersDB.updateOne(
                            { email: common.encrypt(req.body.email) },
                            { $set: { loginattempt: 0 } }
                          );
                        }
                        return res.json({
                          status: false,
                          Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                        });
                      }
                      return res.json({
                        status: false,
                        Message:
                          "Password Incorrect. Please enter a valid password.",
                      });
                    }

                    res.json({
                      status: false,
                      Message:
                        "Password Incorrect. Please enter a valid password.",
                    });
                  } else if (common.decrypt(data.email) != req.body.email) {
                    res.json({ status: false, Message: "Invalid Email" });
                  } else if (data.verifyEmail == 0 || data.status == 0) {
                    res.json({
                      status: false,
                      Message:
                        "Please verify your account or contact the administrator for assistance.",
                    });
                  } else if (data.tfastatus == 1) {
                    if (data.loginattempt >= 5) {
                      var timing = new Date();
                      var date = new Date(timing).getTime();
                      const time1 = new Date(data.logouttime).getTime();
                      const timeDifference = time1 - date;
                      const minutesDifference = Math.floor(
                        timeDifference / (1000 * 60)
                      );
                      if (date >= data.logouttime) {
                        var logout = await usersDB.updateOne(
                          { email: common.encrypt(req.body.email) },
                          { $set: { loginattempt: 0 } }
                        );
                      } else {
                        return res.json({
                          status: false,
                          Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                        });
                      }
                    }

                    const ENCRYPTION_KEY = key.ENCRYPTION_KEY;
                    const IV_LENGTH = key.IV_LENGTH;
                    let iv = crypto.randomBytes(IV_LENGTH);
                    var cipher = crypto.createCipheriv(
                      "aes-256-ctr",
                      ENCRYPTION_KEY,
                      "S19h8AnT21H8n14I"
                    );
                    const payload = {
                      _id: data._id,
                    };
                    var token = jwt.sign(payload, jwt_secret);
                    var crypted = cipher.update(
                      token.toString(),
                      "utf8",
                      "hex"
                    );
                    crypted += cipher.final("hex");
                    var socketToken = common.encrypt(data._id.toString());
                    var timestamp = Date.now();
                    return res.json({
                      status: true,
                      token: crypted,
                      tfa: 1,
                      message: "Enter TFA to login",
                      socketToken: socketToken + "_" + timestamp,
                      tfa_key: data.tfaenablekey,
                      jwNkiKmttscotlox: data.kycstatus,
                    });
                  } else {
                    if (data.loginattempt >= 5) {
                      var timing = new Date();
                      var date = new Date(timing).getTime();
                      const time1 = new Date(data.logouttime).getTime();
                      const timeDifference = time1 - date;
                      const minutesDifference = Math.floor(
                        timeDifference / (1000 * 60)
                      );
                      if (date >= data.logouttime) {
                        var logout = await usersDB.updateOne(
                          { email: common.encrypt(req.body.email) },
                          { $set: { loginattempt: 0 } }
                        );
                      } else {
                        return res.json({
                          status: false,
                          Message: `Your Email is suspended Try after ${minutesDifference} minutes`,
                        });
                      }
                    }
                    var source = req.headers["user-agent"],
                      ua = useragent.parse(source);
                    var testip =
                      req.headers["x-forwarded-for"] ||
                      req.connection.remoteAddress;
                    var replaceipAdd = testip.replace("::ffff:", "");
                    var geo = await geoip.lookup(replaceipAdd);
                    let ip_address =
                      req.header("x-forwarded-for") ||
                      req.connection.remoteAddress;
                    var findWallet = await userWalletDB
                      .findOne({ userId: data._id })
                      .exec();
                    if (findWallet == null && findWallet == undefined) {
                      var currencyArray = [];
                      let currencyData = await currencyDB.find({});
                      for (var i = 0; i < currencyData.length; i++) {
                        var value = {
                          currencyId: currencyData[i]._id,
                          currencyName: currencyData[i].currencyName,
                          currencySymbol: currencyData[i].currencySymbol,
                          amount: 0,
                        };
                        currencyArray.push(value);
                      }
                      var walletData = {
                        userId: data._id,
                        wallets: currencyArray,
                      };
                      var createWallet = await userWalletDB.create(walletData);
                    }
                    var obj = {
                      ipAddress: ip_address.replace("::ffff:", ""),
                      browser: ua.browser,
                      OS: ua.os,
                      platform: ua.platform,
                      useremail: common.decrypt(data.email),
                      user_id: data._id,
                      location: geo !== null ? geo.country : "not found",
                      activitity: "Login",
                      createdDate: new Date(),
                      modifiedDate: new Date(),
                    };
                    userLoginhistoryDB.create(
                      obj,
                      async (his_err, historyData) => {
                        if (!his_err) {
                          const payload = {
                            _id: data._id,
                          };
                          var token = jwt.sign(payload, jwt_secret);
                          var socketToken = common.encrypt(data._id.toString());
                          var timestamp = Date.now();

                          var obj = {
                            to_user_id: ObjectId(data._id),
                            to_user_name: data.username,
                            status: 0,
                            IP: ip_address,
                            message: "Login successfully",
                            link: "/notificationHistory",
                          };

                          var login = await usersDB.updateOne(
                            { email: common.encrypt(req.body.email) },
                            { $set: { loginStatus: 1 } }
                          );
                          //console.log((obj, "objobjobj");
                          let notification = await notifydb.create(obj);
                          res.json({
                            status: true,
                            Message: "Login Successfull !",
                            token: token,
                            tfa: 0,
                            socketToken: socketToken + "_" + timestamp,
                            tfa_key: data.tfaenablekey,
                            jwNkiKmttscotlox: data.kycstatus,
                          });
                        } else {
                          res.json({
                            status: false,
                            Message:
                              "Something went wrong,Please try again later",
                          });
                        }
                      }
                    );
                  }
                } else {
                  res.json({ status: false, Message: "User not found" });
                }
              } else {
                res.json({ status: false, Message: "Please try later" });
              }
            });
        } else {
          return res.json({
            status: false,
            Message: "Please try different Email ID",
          });
        }
      } else {
        return res.json({ status: false, Message: "Please try again later" });
      }
    } else {
      res.json({ status: false, Message: "Please enter all required fields" });
    }
  } catch (err) {
    // console.log(err, "error======");
    res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/changepswdlink_mobile", async (req, res) => {
  try {
    var mobile = req.body.mobile;

    usersDB
      .findOne({ mobileNumber: mobile })
      .exec(async function (err, responce) {
        if (responce !== null) {
          var username = responce.username;

          let otpGenerate = Math.floor(1000 + Math.random() * 9000);
          let updatepass = await usersDB.updateOne(
            { _id: responce._id },
            { $set: { forgotPass: 1, forgetOtp: otpGenerate } }
          );
          if (otpGenerate) {
            let resData = await mailtempDB.findOne({ key: "resetOTPMobile" });
            if (resData) {
              var etempdataDynamic = resData.body
                .replace(/###OTP###/g, otpGenerate)
                .replace(/###USERNAME###/g, mobile);
              return res.json({
                status: true,
                message:
                  "OTP sent to your mobile number, please check your mobile",
                otp_code: otpGenerate,
              });
            }
          } else {
            return res.json({
              status: false,
              message: "Please try again leter",
            });
          }
        } else {
          res.status(400).json({ message: "Mobile number not found" });
        }
      });
  } catch (err) {
    res.status(500).json({ message: "Internal server", error: err.message });
  }
});

router.post("/forgotpassword_mobile", async (req, res) => {
  try {
    if (
      req.body.password != "" &&
      req.body.password != undefined &&
      req.body.confimPassword != "" &&
      req.body.confimPassword != undefined &&
      req.body.sms_otp != undefined &&
      req.body.confimPassword != ""
    ) {
      if (req.body.password == req.body.confimPassword) {
        var code = req.body.sms_otp;
        let users = await usersDB.findOne({ forgetOtp: code }).exec();
        if (users) {
          if (users.forgotPass == 1) {
            let updatepass = await usersDB.updateOne(
              { _id: users._id },
              {
                $set: {
                  password: common.encrypt(req.body.password),
                  forgotPass: 0,
                },
              }
            );
            //console.log((updatepass, "update==passupdatepass");
            if (updatepass) {
              return res.json({
                status: true,
                Message: "Password changed successfully",
              });
            } else {
              return res.json({
                status: false,
                Message: "Please try again later",
              });
            }
          } else {
            return res.json({ status: false, Message: "OTP expired" });
          }
        } else {
          return res.json({ status: false, Message: "User Not found" });
        }
      } else {
        return res.json({
          status: false,
          Message: "Password and confirm password does not match",
        });
      }
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Please give valid" });
    }
  } catch (err) {
    //console.log((err.message, "error: err.messageerror: err.message");
    res
      .status(500)
      .json({ Message: "Internal server", Message: "Please try again later" });
  }
});

router.post("/emailupdate", common.tokenmiddleware, async (req, res) => {
  try {
    //console.log(("emailupdate", req.body);
    if (req.body.Email != "") {
      var Email = common.encrypt(req.body.Email);
      var mailUpdate = await usersDB
        .findOneAndUpdate(
          { mobileNumber: req.body.Mobilenumber },
          { $set: { email: Email } }
        )
        .exec();
      //console.log((mailUpdate, "mailupdate");
      var UpdatedUser = await usersDB.findOne({ _id: req.userId }).exec();
      //console.log((UpdatedUser, "UpdatedUser");
      return res.json({
        data: UpdatedUser,
        Message: "Email Updated Successfully!",
      });
    } else {
      return res.json({ status: false, Message: "Please fill all fileds" });
    }
  } catch {
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/mobilenumberupdate", common.tokenmiddleware, async (req, res) => {
  try {
    //console.log(("mobilenumberupdate", req.body);
    if (req.body.Mobile != "") {
      var Email = common.encrypt(req.body.Email);
      var MobileUpdate = await usersDB
        .findOneAndUpdate(
          { email: Email },
          { $set: { mobileNumber: req.body.Mobile } }
        )
        .exec();
      //console.log((MobileUpdate, "MobileUpdate");
      var UpdatedUser = await usersDB.findOne({ _id: req.userId }).exec();
      //console.log((UpdatedUser, "UpdatedUser");
      return res.json({
        data: UpdatedUser,
        Message: "Mobile Number Updated Successfully! ",
      });
    } else {
      return res.json({ status: false, Message: "Please fill all fileds" });
    }
  } catch {
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.get("/getReward", common.tokenmiddleware, async (req, res) => {
  try {
    async.parallel(
      {
        totalReferral: function (cb) {
          usersDB.findOne({ referred_by: req.userId }).count().exec(cb);
        },
        totalBonus: function (cb) {
          referralHistoryDB.find({ fromUser: req.userId }).exec(cb);
        },
      },

      async function (err, results) {
        if (!err && results) {
          var total_bonus = 0;
          var obj = {};
          if (results.totalBonus.length > 0) {
            for (var i = 0; i < results.totalBonus.length; i++) {
              var bonus = parseFloat(results.totalBonus[i].fee).toFixed(8);
              var currency_det = await currencyDB.findOne({
                _id: ObjectId(results.totalBonus[i].currencyId._id),
              });

              client.hget(
                "CurrencyConversion",
                "allpair",
                async function (err, value) {
                  let redis_response = await JSON.parse(value);
                  if (
                    redis_response != null &&
                    redis_response != "" &&
                    redis_response != undefined &&
                    Object.keys(redis_response).length > 0
                  ) {
                    if (
                      redis_response[currency_det.currencySymbol].USDT !=
                      undefined
                    ) {
                      var conversion_price =
                        redis_response[currency_det.currencySymbol].USDT;
                      var converted_bonus = +conversion_price * bonus;
                      total_bonus += converted_bonus;
                    }
                  }
                }
              );
            }
            obj = {
              totalRefCount: results.totalReferral,
              total_bonus: total_bonus,
            };

            return res.status(200).json({ status: true, data: obj });
          } else {
            obj = {
              totalRefCount: results.totalReferral,
              total_bonus: total_bonus,
            };
            return res.status(200).json({ status: true, data: obj });
          }
        }
      }
    );
  } catch (error) {
    //console.log((error, "error");
    return res.status(500).json({
      status: false,
      message: "Internal server error, Please try again later",
    });
  }
});
router.get("/gettodayReward", common.tokenmiddleware, async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );
    const endOfDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + 1
    );
    async.parallel(
      {
        totalReferral: function (cb) {
          usersDB.findOne({ referred_by: req.userId }).count().exec(cb);
        },
        totalBonus: function (cb) {
          referralHistoryDB
            .find({
              fromUser: req.userId,
              createdDate: { $gte: startOfDay, $lt: endOfDay },
            })
            .exec(cb);
        },
      },

      async function (err, results) {
        if (!err && results) {
          var total_bonus = 0;
          var obj = {};
          if (results.totalBonus.length > 0) {
            for (var i = 0; i < results.totalBonus.length; i++) {
              var bonus = parseFloat(results.totalBonus[i].fee).toFixed(8);
              var currency_det = await currencyDB.findOne({
                _id: ObjectId(results.totalBonus[i].currencyId._id),
              });

              client.hget(
                "CurrencyConversion",
                "allpair",
                async function (err, value) {
                  let redis_response = await JSON.parse(value);
                  if (
                    redis_response != null &&
                    redis_response != "" &&
                    redis_response != undefined &&
                    Object.keys(redis_response).length > 0
                  ) {
                    if (
                      redis_response[currency_det.currencySymbol].USDT !=
                      undefined
                    ) {
                      var conversion_price =
                        redis_response[currency_det.currencySymbol].USDT;
                      var converted_bonus = +conversion_price * bonus;
                      total_bonus += converted_bonus;
                    }
                  }
                }
              );
            }
            obj = {
              totalRefCount: results.totalReferral,
              total_bonus: total_bonus,
            };

            return res.status(200).json({ status: true, data: obj });
          } else {
            obj = {
              totalRefCount: results.totalReferral,
              total_bonus: total_bonus,
            };
            return res.status(200).json({ status: true, data: obj });
          }
        }
      }
    );
  } catch (error) {
    //console.log((error, "error");
    return res.status(500).json({
      status: false,
      message: "Internal server error, Please try again later",
    });
  }
});
router.get("/getbeforedayReward", common.tokenmiddleware, async (req, res) => {
  try {
    const currentDate = new Date();

    // const yesterday = new Date(currentDate);
    // yesterday.setDate(currentDate.getDate() - 1); // Set to yesterday
    var yesterday = new Date(new Date().valueOf() - 1000 * 60 * 60 * 24);

    // Start of yesterday
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0, 0, 0, 0);

    // End of yesterday
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    var yesterday = new Date(new Date().valueOf() - 1000 * 60 * 60 * 24);

    // const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    // const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
    async.parallel(
      {
        totalReferral: function (cb) {
          usersDB.findOne({ referred_by: req.userId }).count().exec(cb);
        },
        totalBonus: function (cb) {
          referralHistoryDB
            .find({
              fromUser: req.userId,
              createdDate: { $gte: startOfDay, $lt: endOfDay },
            })
            .exec(cb);
        },
      },

      async function (err, results) {
        console.log(results, "resultsresultsresults");
        if (!err && results) {
          var total_bonus = 0;
          var obj = {};
          if (results.totalBonus.length > 0) {
            for (var i = 0; i < results.totalBonus.length; i++) {
              var bonus = parseFloat(results.totalBonus[i].fee).toFixed(8);
              var currency_det = await currencyDB.findOne({
                _id: ObjectId(results.totalBonus[i].currencyId._id),
              });

              client.hget(
                "CurrencyConversion",
                "allpair",
                async function (err, value) {
                  let redis_response = await JSON.parse(value);
                  if (
                    redis_response != null &&
                    redis_response != "" &&
                    redis_response != undefined &&
                    Object.keys(redis_response).length > 0
                  ) {
                    if (
                      redis_response[currency_det.currencySymbol].USDT !=
                      undefined
                    ) {
                      var conversion_price =
                        redis_response[currency_det.currencySymbol].USDT;
                      var converted_bonus = +conversion_price * bonus;
                      total_bonus += converted_bonus;
                    }
                  }
                }
              );
            }
            obj = {
              totalRefCount: results.totalReferral,
              total_bonus: total_bonus,
            };

            return res.status(200).json({ status: true, data: obj });
          } else {
            obj = {
              totalRefCount: results.totalReferral,
              total_bonus: total_bonus,
            };
            return res.status(200).json({ status: true, data: obj });
          }
        }
      }
    );
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      status: false,
      message: "Internal server error, Please try again later",
    });
  }
});
router.post("/referralHistory", common.tokenmiddleware, async (req, res) => {
  try {
    var perPage = Number(req.body.perpage ? req.body.perpage : 5);
    var page = Number(req.body.page ? req.body.page : 1);
    var skippage = perPage * page - perPage;
    //console.log((req, "req.userId}");
    var refHistory = await usersDB
      .find(
        { referred_by: req.userId },
        { email: 1, createdDate: 1, username: 1 }
      )
      .skip(skippage)
      .limit(perPage)
      .sort({ _id: -1 })
      .exec();
    if (refHistory) {
      var pagedata = await usersDB.find({ referred_by: req.userId }).count();
      var arrayValues = [];
      for (var i = 0; i < refHistory.length; i++) {
        var obj = {
          id: i + 1,
          email: common.decrypt(refHistory[i].email),
          username: refHistory[i].username,
          createdDate: refHistory[i].createdDate,
        };
        arrayValues.push(obj);
      }
      var returnObj = {
        data: arrayValues,
        current: page,
        pages: Math.ceil(pagedata / perPage),
        total: pagedata,
      };
      return res.status(200).send({
        success: true,
        message: "Data Successfully retrieved",
        data: returnObj,
      });
    } else {
      return res
        .status(400)
        .send({ success: true, message: "Data Does Not retrieved" });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error, Please try again later",
    });
  }
});

router.get("/get_wallet", (req, res) => {
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
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userdetail",
          },
        },
        {
          $project: {
            username: "$userdetail.username",
            mobileNumber: "$userdetail.mobileNumber",
            email: "$userdetail.email",
            currencysymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyBalance: "$wallets.amount",
          },
        },
      ])
      .exec((err, resData) => {
        if (err) {
          return res.json({ Message: err, code: 200 });
        } else {
          var wallet_list = [];
          for (var i = 0; i < resData.length; i++) {
            if (resData[i].currencyBalance != 0) {
              var obj = {
                username: resData[i].username[0],
                email:
                  resData[i].email[0] != null
                    ? common.decrypt(resData[i].email[0])
                    : resData[i].mobileNumber[0],
                currencySymbol: resData[i].currencysymbol,
                currencyBalance: resData[i].currencyBalance,
              };
              //console.log((obj);
              wallet_list.push(obj);
            }
          }
          return res.json({ status: true, data: wallet_list });
        }
      });
  } catch (error) {
    return res.json({ status: false, message: "Internal server" });
  }
});

router.get("/homecurrency", (req, res) => {
  try {
    currencyDB.find({ status: "Active" }).exec(function (err, resData) {
      if (!err) {
        client.hget(
          "CurrencyConversion",
          "allpair",
          async function (err, value) {
            let redis_response = await JSON.parse(value);
            // console.log("get user balance redis response ====",redis_response)
            if (
              redis_response != null &&
              redis_response != "" &&
              redis_response != undefined &&
              Object.keys(redis_response).length > 0
            ) {
              var pushData = [];
              for (var i = 0; i < resData.length; i++) {
                if (redis_response[resData[i].currencySymbol] != undefined) {
                  //console.log("calll 1111")
                  resData[i].estimatedValueInUSDT =
                    redis_response[resData[i].currencySymbol].USDT;
                } else {
                  // console.log("calll 222")
                  var pairname =
                    resData[i].currencySymbol.toLowerCase() + "usdt";
                  var result = await RedisService.hget(
                    "BINANCE-TICKERPRICE",
                    pairname
                  );
                  if (result !== null) {
                    resData[i].estimatedValueInUSDT =
                      result.lastprice.lastprice;
                  } else {
                    var response = await RedisService.hget(
                      "GetTickerPrice",
                      pairname.toLowerCase()
                    );
                    if (response != null) {
                      resData[i].estimatedValueInUSDT =
                        response.lastprice.lastprice;
                    } else {
                      resData[i].estimatedValueInUSDT = resData[i].coin_price;
                    }
                  }
                  //binancefn.CurrencyConversion();
                }
                pushData.push(resData[i]);
              }
              var desedingdata = pushData.reverse();
              var returnJson = {
                status: true,
                Message: pushData,
                data: desedingdata,
              };
              return res.status(200).json(returnJson);
            } else {
              //console.log(("call currency conversion");
              common.currency_conversion(async function (response) {
                //console.log(("call currency conversion", response);
                if (response.status) {
                  let redis_response1 = response.message;
                  //console.log((
                  //   "get user balance redis response ====",
                  //   redis_response
                  // );
                  if (
                    redis_response1 != null &&
                    redis_response1 != "" &&
                    redis_response1 != undefined &&
                    Object.keys(redis_response1).length > 0
                  ) {
                    var pushData = [];
                    for (var i = 0; i < resData.length; i++) {
                      if (
                        redis_response1[resData[i].currencySymbol] != undefined
                      ) {
                        //console.log("calll 1111")
                        resData[i].estimatedValueInUSDT =
                          redis_response1[resData[i].currencySymbol].USDT;
                      } else {
                        // console.log("calll 222")
                        var pairname =
                          resData[i].currencySymbol.toLowerCase() + "usdt";
                        var pair_result = await RedisService.hget(
                          "BINANCE-TICKERPRICE",
                          pairname
                        );
                        if (pair_result !== null) {
                          resData[i].estimatedValueInUSDT =
                            pair_result.lastprice.lastprice;
                        } else {
                          var pair_response = await RedisService.hget(
                            "GetTickerPrice",
                            pairname.toLowerCase()
                          );
                          if (pair_response != null) {
                            resData[i].estimatedValueInUSDT =
                              pair_response.lastprice.lastprice;
                          } else {
                            resData[i].estimatedValueInUSDT =
                              resData[i].coin_price;
                          }
                        }
                        //binancefn.CurrencyConversion();
                      }
                      pushData.push(resData[i]);
                    }

                    var returnJson = {
                      status: true,
                      Message: pushData,
                    };
                    return res.status(200).json(returnJson);
                  }
                }
              });
            }
          }
        );
      }
    });
  } catch (err) {
    return res.json({ status: false, Message: "Internal Server Error" });
  }
});

router.post("/swappingHistory", common.tokenmiddleware, async (req, res) => {
  try {
    var search = req.body.search;
    var perPage = Number(req.body.perpage ? req.body.perpage : 5);
    var page = Number(req.body.page ? req.body.page : 1);
    var skippage = perPage * page - perPage;
    var loginhistory = await swapDB
      .find({ userId: req.userId })
      .skip(skippage)
      .limit(perPage)
      .sort({ _id: -1 })
      .exec();
    if (loginhistory) {
      var pagedata = await swapDB.find({ userId: req.userId }).count();
      var returnObj = {
        data: loginhistory,
        current: page,
        pages: Math.ceil(pagedata / perPage),
        total: pagedata,
      };
      return res.status(200).send({
        success: true,
        message: "Data Successfully retrieved",
        data: returnObj,
      });
    } else {
      return res
        .status(400)
        .send({ success: true, message: "Data Does Not retrieved" });
    }
  } catch (error) {
    //console.log(("ERROR FROM getSessionHisotry::", error);
    return res.json({ status: false, Message: "Internal server error" });
  }
});
router.post("/swapping", common.tokenmiddleware, async (req, res) => {
  try {
    //console.log(("req.body===", req.body);
    var userdata = await usersDB.findOne({
      _id: mongoose.Types.ObjectId(req.userId),
    });
    if (userdata.kycstatus == 1) {
      if (req.body.from_id != req.body.to_id) {
        let getCurrecy = await currencyDB
          .findOne(
            { _id: req.body.from_id },
            { _id: 1, maxSwap: 1, minSwap: 1, currencySymbol: 1, swapFee: 1 }
          )
          .exec({});
        if (getCurrecy) {
          var feeCal =
            (Number(req.body.fromAmount) * Number(getCurrecy.swapFee)) / 100;
          //console.log(("feeCal===", feeCal);
          var getToAmount =
            Number(req.body.fromAmount) * Number(req.body.currentPrice);
          //console.log(("getToAmount===", getToAmount);
          var totalCal = Number(req.body.fromAmount) + Number(feeCal);

          totalCal = parseFloat(totalCal).toFixed(8);
          //console.log(("totalCal===", typeof +totalCal);
          // if (req.body.fromAmount > getCurrecy.minSwap) {
          //   if (+req.body.fromAmount <= getCurrecy.maxSwap) {
          let getWallet = await userWalletDB
            .findOne({ userId: req.userId })
            .exec({});
          if (getWallet) {
            var wallets = getWallet.wallets;
            var Indexing = wallets.findIndex(
              (x) => x.currencyId == req.body.from_id
            );
            if (Indexing != -1) {
              var balance = parseFloat(wallets[Indexing].amount).toFixed(8);
              //console.log(("balance===", typeof +balance);
              if (+balance >= +totalCal) {
                var toIndexing = wallets.findIndex(
                  (x) => x.currencyId == req.body.to_id
                );
                if (toIndexing != -1) {
                  var tobalance = parseFloat(
                    wallets[toIndexing].amount
                  ).toFixed(8);
                  var tobalance_reserve = parseFloat(
                    wallets[toIndexing].amount_bep20_reserve
                  ).toFixed(8);
                  var detuctFrombalance = Number(balance) - Number(totalCal);
                  var addToBalance = Number(tobalance) + Number(getToAmount);
                  var addToBalance_reserve =
                    Number(tobalance_reserve) + Number(getToAmount);
                  var adminFee = Number(feeCal);
                  var updateFromBal = await userWalletDB.updateOne(
                    {
                      userId: req.userId,
                      "wallets.currencyId": req.body.from_id,
                    },
                    { $set: { "wallets.$.amount": +detuctFrombalance } },
                    { multi: true }
                  );
                  if (updateFromBal) {
                    if (req.body.from == "ADVB" && req.body.to == "ADVB(new)") {
                      //console.log(("call reserve");
                      var updateTomBal = await userWalletDB.updateOne(
                        {
                          userId: req.userId,
                          "wallets.currencyId": req.body.to_id,
                        },
                        {
                          $set: {
                            "wallets.$.amount_bep20_reserve":
                              +addToBalance_reserve,
                          },
                        },
                        { multi: true }
                      );
                    } else {
                      var updateTomBal = await userWalletDB.updateOne(
                        {
                          userId: req.userId,
                          "wallets.currencyId": req.body.to_id,
                        },
                        { $set: { "wallets.$.amount": +addToBalance } },
                        { multi: true }
                      );
                    }

                    if (updateTomBal) {
                      var obj = {
                        fromCurrency: req.body.from,
                        toCurrency: req.body.to,
                        amount: +req.body.fromAmount,
                        totalAmount: totalCal,
                        fee: feeCal,
                        price: req.body.currentPrice,
                        userId: req.userId,
                        fromCurrID: req.body.from_id,
                        toCurreID: req.body.to_id,
                      };
                      let swapCreate = await swapDB.create(obj);
                      if (swapCreate) {
                        var profitObj = {
                          type: "swap",
                          user_id: req.userId,
                          currencyid: req.body.from_id,
                          fees: feeCal,
                          fullfees: feeCal,
                          orderid: swapCreate._id,
                        };
                        let storeAdminFee = await profitDb.create(profitObj);
                        if (storeAdminFee) {
                          return res.status(200).send({
                            status: true,
                            Message: "Swaping success !",
                          });
                        } else {
                          return res.status(200).send({
                            status: false,
                            Message: "Please try again later!",
                          });
                        }
                      } else {
                        return res.status(200).send({
                          status: false,
                          Message: "Please try again later!",
                        });
                      }
                    } else {
                      return res.status(200).send({
                        status: false,
                        Message: "Please try again later!",
                      });
                    }
                  } else {
                    return res.status(200).send({
                      status: false,
                      Message: "Please try again later!",
                    });
                  }
                } else {
                  return res.status(200).send({
                    status: false,
                    Message: "Please try again later!",
                  });
                }
              } else {
                return res
                  .status(200)
                  .send({ status: false, Message: "Insufficient Balance !" });
              }
            } else {
              return res
                .status(200)
                .send({ status: false, Message: "Please try again later!" });
            }
          } else {
            return res
              .status(200)
              .send({ status: false, Message: "Please try again later!" });
          }
          //   } else {
          //     return res.status(200).send({ status: false, Message: "Please enter maximum " + getCurrecy.maxSwap + " amount" });
          //   }
          // } else {
          //   return res.status(200).send({ status: false, Message: "Please enter minimum " + getCurrecy.minSwap + " amount" });
          // }
        } else {
          return res
            .status(200)
            .send({ status: false, Message: "Please try again later!" });
        }
      } else {
        return res.status(400).send({
          status: false,
          Message: "Should not allowed same currency swapping",
        });
      }
    } else if (userdata.kycstatus == 2) {
      return res.json({
        status: false,
        Message: "Your kyc verification is pending",
      });
    } else if (userdata.kycstatus == 3) {
      return res.json({ status: false, Message: "Your kyc is rejected" });
    } else {
      return res.json({ status: false, Message: "Please update your kyc" });
    }
  } catch (error) {
    //console.log((error, "=-=-=error-=-=-error-=-=-error");
    res.json({ status: false, Message: "Internel server error!", code: 500 });
  }
});

router.post("/earningHistory", common.tokenmiddleware, async (req, res) => {
  try {
    var perPage = Number(req.body.perpage ? req.body.perpage : 5);
    var page = Number(req.body.page ? req.body.page : 1);
    var skippage = perPage * page - perPage;
    var refHistory = await referralHistoryDB
      .find({ fromUser: req.userId })
      .populate("userId", "username")
      .populate("currencyId", "currencySymbol")
      .skip(skippage)
      .limit(perPage)
      .sort({ _id: -1 })
      .exec();
    if (refHistory) {
      var pagedata = await referralHistoryDB
        .find({ fromUser: req.userId })
        .populate("userId", "username")
        .populate("currencyId", "currencySymbol")
        .count();

      var arrayValues = [];

      for (var i = 0; i < refHistory.length; i++) {
        var type = refHistory[i].type;
        if (type == "yield_staking") {
          type = "Yield Staking";
        } else if (type == "fixed_staking") {
          type = "Fixed Staking";
        } else if (type == "flexible_staking") {
          type = "Flexible Staking";
        }

        var obj = {
          id: i + 1,
          amount: parseFloat(refHistory[i].fee).toFixed(8),
          currency: refHistory[i].currencyId.currencySymbol,
          type: type,
          from: refHistory[i].userId.username,
          date: moment(refHistory[i].createdDate).format("lll"),
        };
        arrayValues.push(obj);
      }
      let earningamount = 0;

      // Iterate through the data array
      for (let i = 0; i < arrayValues.length; i++) {
        // Check if the type is "Trade Buy" and currency is "BTC" or type is "Trade Sell" and currency is "USDT"
        earningamount += parseFloat(arrayValues[i].amount);
      }

      var returnObj = {
        data: arrayValues,
        current: page,
        pages: Math.ceil(pagedata / perPage),
        total: pagedata,
        totalearning: earningamount,
      };
      return res.status(200).send({
        success: true,
        message: "Data Successfully retrieved",
        data: returnObj,
      });
    } else {
      return res
        .status(400)
        .send({ success: true, message: "Data Does Not retrieved" });
    }
  } catch (error) {
    console.log("call catch earning history===", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error, Please try again later",
    });
  }
});

//Antiphising code --Mugeshkumar

router.post("/antiphishingcode", common.tokenmiddleware, async (req, res) => {
  try {
    var OTP = Math.floor(1000 + Math.random() * 9000);
    // console.log(req.body, "=-=-=-req.body=-=-=-")

    var find = await antiPhishing.findOne({ userid: req.userId });
    if (find) {
      var addotp = await antiPhishing.updateOne(
        { userid: new mongoose.Types.ObjectId(req.userId) },
        { $set: { emailOtp: OTP, dupApcode: req.body.APcode } }
      );

      if (addotp) {
        let user = await usersDB.findOne({ _id: req.userId });
        let resData = await mailtempDB.findOne({ key: "Anti-Phising" });
        // console.log(resData,"ResSDara")
        var reciver = common.decrypt(user.email);
        // console.log(reciver, "=-=-==resData=-=-=-=-=")
        var findUsers = await antiPhishing.findOne({ userid: req.userId });

        console.log(findUsers, "findUsers");
        var code = "Anti phishing" + " " + findUsers.APcode;
        var etempdataDynamic = resData.body
          .replace(/###OTP###/g, OTP)
          .replace(/###APcode###/g, code)
          .replace(/###USERNAME###/g, reciver);
          var mailRes = await mail.sendMail(
          {
            from: {
              name: process.env.FROM_NAME,
              address: process.env.FROM_EMAIL,
            },
            to: reciver,
            subject: resData.Subject,
            html: etempdataDynamic,
          });
      }
      res.json({ Status: true, Message: "OTP sent your register Email" });
      console.log(etempdataDynamic, "etempdataDynamic");

    } else {
      var data = {
        userid: req.userId,
        dupApcode: req.body.APcode,
        emailOtp: OTP,
      };
      var create = await antiPhishing.create(data);
      // console.log(create, "=-=-==create=-=-=-=-=")
      if (create) {
        let user = await usersDB.findOne({ _id: req.userId });
        let resData = await mailtempDB.findOne({ key: "Anti-Phising" });
        // console.log(resData,"ResSDara")
        var reciver = common.decrypt(user.email);
        // console.log(reciver, "=-=-==resData=-=-=-=-=")
        var findUsers = await antiPhishing.findOne({ userid: req.userId });
        console.log(findUsers, "findUsers");

        var code = "Anti phishing" + " " + findUsers.APcode;
        var etempdataDynamic = resData.body
          .replace(/###OTP###/g, OTP)
          .replace(/###APcode###/g, code)
          .replace(/###USERNAME###/g, reciver);
          var mailRes = await mail.sendMail(
            {
              from: {
                name: process.env.FROM_NAME,
                address: process.env.FROM_EMAIL,
              },
              to: reciver,
              subject: resData.Subject,
              html: etempdataDynamic,
            });
      }

      res.json({ Status: true, Message: "OTP sent your register Email" });
    }
  } catch (error) {
    // console.log(error, "=-=-=-=error=-=-=-s")
    res.json({ Status: false, Message: "Still not verified your account" });
  }
});

router.post("/verificationOtp", common.tokenmiddleware, async (req, res) => {
  try {
    // console.log(req.body, "req.body")
    var verify = await antiPhishing.findOne({ userid: req.userId });
    // console.log(verify)
    // return
    if (verify.emailOtp == req.body.OTP) {
      if (req.body.changeAPcode == "") {
        var addotp = await antiPhishing.updateOne(
          { userid: new mongoose.Types.ObjectId(req.userId) },
          { $set: { APcode: verify.dupApcode } }
        );
      } else {
        var addotp = await antiPhishing.updateOne(
          { userid: new mongoose.Types.ObjectId(req.userId) },
          { $set: { APcode: verify.dupApcode } }
        );
      }
      const userId = req.userId;
      var updateUserstate = await usersDB.updateOne(
        { _id : req.userId },
        { $set: { AntiphisingStatus: 1 } }
      )
      const updatedUserData = await usersDB.findOne({ _id: userId });
      let lastLogin = await userLoginhistoryDB.findOne({ user_id: userId }).sort({ _id: -1 }).limit(1);
      if(lastLogin){
        userRedis.getUser(userId, function (datas){
          if(datas) {
            res.json({
              Status: true,
              Message: "Anti phishing code create successfully",
            });
          }else{
            return res.json({ status : false, Message : {} });
          }
        });
        }
    } else {
      res.json({ Status: false, Message: "Invalid OTP" });
    }
  } catch (error) {
    // console.log(error, "=-==-error=-==-")
    res.json({ Status: false, Message: "Still not verified your account" });
  }
});

router.post("/changeAntiPhising", common.tokenmiddleware, async (req, res) => {
  try {
    var findDetails = await antiPhishing.findOne({ userid: req.userId });

    if (findDetails.APcode != req.body.changeAPcode) {
      var findId = await usersDB.findOne({ _id: req.userId });
      var reciver = common.decrypt(findId.email);
      // console.log(finddate, "==-=-=-=-=reciver=-=-=-=-=-")
      var OTP = Math.floor(1000 + Math.random() * 9000);
      var addotp = await antiPhishing.updateOne(
        { userid: new mongoose.Types.ObjectId(req.userId) },
        { $set: { emailOtp: OTP, dupApcode: req.body.changeAPcode } }
      );
      // console.log(addotp, "=-=-=-=addotp")
      var finddate = await antiPhishing.findOne({ userid: req.userId });
      // console.log("okokokokok", finddate)
      if (OTP) {
        // console.log("okokokokok")
        if (finddate.Status == "false") {
          var code = "Anti phishing" + " " + finddate.APcode;
          // console.log("=-=-=-=-=Enable=-=-=-=-=")
          let resData = await mailtempDB.findOne({ key: "OTP" });
          // console.log(resData,"======ResSDara")

          var etempdataDynamic = resData.body
            .replace(/###OTP###/g, OTP)
            .replace(/###APcode###/g, code)
            .replace(/###USERNAME###/g, reciver);
            var mailRes = await mail.sendMail(
              {
                from: {
                  name: process.env.FROM_NAME,
                  address: process.env.FROM_EMAIL,
                },
                to: reciver,
                subject: resData.Subject,
                html: etempdataDynamic,
              });
          res.json({ Status: true, Message: "Code send your register Email" });
        }
        if (finddate.Status == "true") {
          let resData = await mailtempDB.findOne({ key: "OTP" });
          // console.log(resData,"======ResSDara")

          var etempdataDynamic = resData.body
            .replace(/###OTP###/g, OTP)
            .replace(/###APcode###/g, "")
            .replace(/###USERNAME###/g, reciver);
          var mailRes = await mail.sendMail(
            {
              from: {
                name: process.env.FROM_NAME,
                address: process.env.FROM_EMAIL,
              },
              to: reciver,
              subject: resData.Subject,
              html: etempdataDynamic,
            });
          var mailRes = await mail.sendMail(
            {
              from: {
                name: process.env.FROM_NAME,
                address: process.env.FROM_EMAIL,
              },
              to: reciver,
              subject: resData.Subject,
              html: etempdataDynamic,
            });
            if(mailRes != null)
            {
              res.json({
                Status: true,
                Message: "Code send your register Email",
              });
            }
            else
            {
              res
              .status(400)
              .json({ Status: false, Message: "Something went wrong, Please try again later!" });
            }
             
        }
      }
    } else {
      res.json({ Status: false, Message: "Already using this code" });
    }
  } catch (error) {
    console.log(error, "=-==-error=-==-");
    res
      .status(500)
      .json({ Status: false, Message: "Still not verified your account" });
  }
});

router.post("/findDetails", common.tokenmiddleware, async (req, res) => {
  try {
    var FindData = await antiPhishing.findOne({ userid: req.userId });
    res.json({
      Status: true,
      Message: "Details get successfully",
      data: FindData,
    });
  } catch (error) {
    res.json({ Status: false, Message: "Still not verified your account" });
  }
});

router.get("/home_currency", (req, res) => {
  try {
    currencyDB
      .find(
        { status: "Active", coinType: "1" },
        {
          currencySymbol: 1,
          estimatedValueInUSDT: 1,
          coin_change: 1,
          coin_volume: 1,
          Currency_image: 1,
          currencyName: 1,
        }
      )
      .sort({ popularOrder: 1 })
      .limit(6)
      .exec(async function (err, resData) {
        if (!err) {
          console.log("resData===", resData);
          var pushData = [];
          for (var i = 0; i < resData.length; i++) {
            console.log(resData[i], "calll 222");
            if (resData[i].currencySymbol != "USDT") {
              var pairname = resData[i].currencySymbol.toLowerCase() + "usdt";
              var result = await RedisService.hget(
                "BINANCE-TICKERPRICE",
                pairname
              );
              console.log("result===", result);
              // console.log("pairname===", pairname)
              var decimal = resData[i].currencySymbol == "ADVB" ? 6 : 2;

              if (result !== null) {
                resData[i].estimatedValueInUSDT = parseFloat(
                  result.lastprice.lastprice
                ).toFixed(decimal);
                resData[i].coin_change = parseFloat(
                  result.change_percent
                ).toFixed(2);
                resData[i].coin_volume = parseFloat(result.volume).toFixed(
                  decimal
                );
              } else {
                var response = await RedisService.hget(
                  "GetTickerPrice",
                  pairname.toLowerCase()
                );
                console.log("response===", response);

                if (response != null) {
                  resData[i].estimatedValueInUSDT = parseFloat(
                    response.lastprice.lastprice
                  ).toFixed(decimal);
                  resData[i].coin_change = parseFloat(
                    response.change_percent
                  ).toFixed(2);
                  resData[i].coin_volume = parseFloat(response.volume).toFixed(
                    decimal
                  );
                } else {
                  resData[i].estimatedValueInUSDT = parseFloat(
                    resData[i].coin_price
                  ).toFixed(decimal);
                  resData[i].coin_change = parseFloat(
                    resData[i].coin_change
                  ).toFixed(2);
                  resData[i].coin_volume = parseFloat(
                    resData[i].coin_volume
                  ).toFixed(decimal);
                }
              }
              pushData.push(resData[i]);
            }
          }
          var returnJson = {
            status: true,
            Message: pushData,
          };
          return res.status(200).json(returnJson);
        }
      });
  } catch (err) {
    return res.json({ status: false, Message: "Internal Server Error" });
  }
});
router.get("/toplosers", (req, res) => {
  axios
    .get(
      "https://min-api.cryptocompare.com/data/top/mktcapfull?limit=10&tsym=USD"
    )
    .then((response) => {
      const cryptocurrencyData = response.data.Data.map((coin) => {
        return {
          name: coin.CoinInfo.FullName,
          symbol: coin.CoinInfo.Name,
          price: coin.RAW.USD.PRICE.toFixed(2),
          volume: coin.RAW.USD.VOLUME24HOUR.toFixed(2),
          imageUrl: `https://www.cryptocompare.com${coin.CoinInfo.ImageUrl}`,
          change24Hour: coin.RAW.USD.CHANGEPCT24HOUR.toFixed(2),
        };
      });
      cryptocurrencyData.sort(
        (a, b) => parseFloat(a.change24Hour) - parseFloat(b.change24Hour)
      );

      return res.json({ status: true, toplosers: cryptocurrencyData });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
  // const apiUrl = 'https://min-api.cryptocompare.com/data/top/mktcapfull?limit=10&tsym=USD&order=asc';

  // axios.get(apiUrl)
  //   .then(response => {
  //     const cryptocurrencyData = response.data.Data.map(coin => {
  //       return {
  //         name: coin.CoinInfo.FullName,
  //         symbol: coin.CoinInfo.Name,
  //         price: coin.RAW.USD.PRICE.toFixed(2),
  //         volume: coin.RAW.USD.VOLUME24HOUR.toFixed(2),
  //         imageUrl: `https://www.cryptocompare.com${coin.CoinInfo.ImageUrl}`,
  //         change24Hour: coin.RAW.USD.CHANGEPCT24HOUR.toFixed(2)
  //       };
  //     });
  // return res.json({ status: true, toplosers:cryptocurrencyData });

  //   })
  //   .catch(error => {
  //     console.error('Error fetching data:', error);
  //   });
});

router.get("/topgainer", (req, res) => {
  axios
    .get(
      "https://min-api.cryptocompare.com/data/top/mktcapfull?limit=10&tsym=USD"
    )
    .then((response) => {
      const cryptocurrencyData = response.data.Data.map((coin) => {
        return {
          name: coin.CoinInfo.FullName,
          symbol: coin.CoinInfo.Name,
          price: coin.RAW.USD.PRICE.toFixed(2),
          volume: coin.RAW.USD.VOLUME24HOUR.toFixed(2),
          imageUrl: `https://www.cryptocompare.com${coin.CoinInfo.ImageUrl}`,
          change24Hour: coin.RAW.USD.CHANGEPCT24HOUR.toFixed(2),
        };
      });
      return res.json({ status: true, topgainers: cryptocurrencyData });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
});

router.get("/hotPairs", (req, res) => {
  axios
    .get(
      "https://min-api.cryptocompare.com/data/top/mktcapfull?limit=10&tsym=USD"
    )
    .then((response) => {
      const cryptocurrencyData = response.data.Data.map((coin) => {
        return {
          name: coin.CoinInfo.FullName,
          symbol: coin.CoinInfo.Name,
          price: coin.RAW.USD.PRICE.toFixed(2),
          volume: coin.RAW.USD.VOLUME24HOUR.toFixed(2),
          imageUrl: `https://www.cryptocompare.com${coin.CoinInfo.ImageUrl}`,
          change24Hour: coin.RAW.USD.CHANGEPCT24HOUR.toFixed(2),
        };
      });
      cryptocurrencyData.sort(
        (a, b) => parseFloat(a.volume) - parseFloat(b.volume)
      );

      return res.json({ status: true, topgainers: cryptocurrencyData });
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
  // const apiUrl = 'https://min-api.cryptocompare.com/data/top/volumes?tsym=USD';

  // axios.get(apiUrl)
  // .then(response => {
  //   const currenciesData = response.data.Data.map(currency => {
  //     console.log(currency,"currency-0-0--0-0-0-0-")
  //     const price = currency.RAW && currency.RAW.USD && currency.RAW.USD.PRICE ? currency.RAW.USD.PRICE.toFixed(2) : 'N/A';
  //     const change24Hour = currency.RAW && currency.RAW.USD && currency.RAW.USD.CHANGEPCT24HOUR ? currency.RAW.USD.CHANGEPCT24HOUR.toFixed(2) : 'N/A';
  //     const volume24Hour = currency.CONVERSIONINFO && currency.CONVERSIONINFO.CONVERSIONTOUSD && currency.CONVERSIONINFO.CONVERSIONTOUSD.VOLUME24HOUR ? currency.CONVERSIONINFO.CONVERSIONTOUSD.VOLUME24HOUR.toFixed(2) : 'N/A';

  //     return {
  //       name: currency.FullName,
  //       symbol: currency.Name,
  //       price,
  //       change24Hour,
  //       volume24Hour,
  //       imageUrl: `https://www.cryptocompare.com${currency.CoinInfo.ImageUrl}`
  //     };
  //   });
  //   res.json({ status: true, data: currenciesData });
  // })
  // .catch(error => {
  //   console.error('Error fetching top volume currencies:', error);
  //   res.status(500).json({ status: false, message: 'Failed to fetch data' });
  // });
});

router.get("/newPairs", (req, res) => {
  const coinListUrl = "https://min-api.cryptocompare.com/data/all/coinlist";
  const apiUrl =
    "https://min-api.cryptocompare.com/data/top/mktcapfull?tsym=USD";

  axios
    .get(coinListUrl)
    .then((coinListResponse) => {
      const coinListData = coinListResponse.data.Data;
      const coinSymbols = Object.keys(coinListData);

      axios
        .get(apiUrl)
        .then((priceChangeResponse) => {
          const priceChangeData = priceChangeResponse.data.Data;
          const today = moment();
          const lastYear = today.subtract(1, "year");
          const latestCoins = coinSymbols
            .map((symbol) => {
              const coinInfo = coinListData[symbol];
              const coinPriceChange = priceChangeData.find(
                (coin) => coin.CoinInfo.Name === symbol
              );
              // console.log(coinPriceChange,"coinPriceChange-----------")
              if (!coinPriceChange) {
                return null;
              }
              if (coinInfo.AssetLaunchDate) {
                const launchDate = moment(
                  coinInfo.AssetLaunchDate,
                  "YYYY-MM-DD"
                );
                // Check if the launchDate is in 2023 or 2024
                if (
                  launchDate.isBetween(
                    "2010-01-01",
                    "2024-12-31",
                    undefined,
                    "[]"
                  )
                ) {
                  return {
                    id: coinInfo.Id,
                    symbol: coinInfo.Symbol,
                    fullName: coinInfo.FullName,
                    imageUrl: `https://www.cryptocompare.com${coinInfo.ImageUrl}`,
                    price: coinPriceChange.RAW.USD.PRICE.toFixed(2),
                    change24Hour:
                      coinPriceChange.RAW.USD.CHANGEPCT24HOUR.toFixed(2),
                    volume24Hour:
                      coinPriceChange.RAW.USD.VOLUME24HOUR.toFixed(2),
                  };
                } else {
                  return null; // Exclude coins with launch dates outside 2023 and 2024
                }
              } else {
                return null;
              }
            })
            .filter((coin) => coin !== null);

          console.log(latestCoins, "latestCoins");
          console.log(JSON.stringify(latestCoins, null, 2));
          return res.json({ status: true, hotpairs: latestCoins.reverse() });
        })
        .catch((error) => {
          console.error("Error fetching price and change data:", error);
          return res.json({
            status: false,
            error: "Error fetching price and change data",
          });
        });
    })
    .catch((error) => {
      console.error("Error fetching coin list data:", error);
      return res.json({
        status: false,
        error: "Error fetching coin list data",
      });
    });
});

router.get("/test", async (req, res) => {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
    if (!response.data) {
      console.error('Failed to fetch data from Binance API');
      return;
    }

    function getTopGainers(data, count) {
      return data
        .filter(symbol => parseFloat(symbol.priceChangePercent) > 0)
        .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
        .slice(0, count);
    }

    // Function to filter top losers
    function getTopLosers(data, count) {
      return data
        .filter(symbol => parseFloat(symbol.priceChangePercent) < 0)
        .sort((a, b) => parseFloat(a.priceChangePercent) - parseFloat(b.priceChangePercent))
        .slice(0, count);
    }


    const topGainers = getTopGainers(response.data, 10);
    const topLosers = getTopLosers(response.data, 10);

    console.log('Top Gainers:');
    topGainers.forEach(symbol => console.log(`${symbol.symbol}: ${symbol.priceChangePercent}%`));

    console.log('\nTop Losers:');
    topLosers.forEach(symbol => console.log(`${symbol.symbol}: ${symbol.priceChangePercent}%`))

    console.log(topGainers, "topGainers----topGainers")
    console.log(topLosers, "topLosers----topLosers")
  } catch (error) {
    console.error('Error fetching data from Binance API:', error);
    return null;
  }

});


function removeCircularReferences(obj) {
  const seen = new WeakSet();
  function replacer(key, value) {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return; // Remove circular reference
      }
      seen.add(value);
    }
    return value;
  }
  return JSON.parse(JSON.stringify(obj, replacer));
}

router.get("/onRamp", async (req, res) => {
  try {
    const options = {
      method: "GET",
      url: "https://sandbox.api.uniramp.io/v1/onramp/supported/fiat",
      headers: {
        accept: "application/json",
        "x-api-key": "pk_sand_Qj2IMyQpB2CIOEQ6sRf3xfuS7lp9BVd9",
      },
    };
    const options2 = {
      method: "GET",
      url: "https://sandbox.api.uniramp.io/v1/onramp/supported/crypto",
      headers: {
        accept: "application/json",
        "x-api-key": "pk_sand_Qj2IMyQpB2CIOEQ6sRf3xfuS7lp9BVd9",
      },
    };
    const Fiat = await axios.request(options);
    if (Fiat.status == 200) {
      const Crypto = await axios.request(options2);

      const cleanedFiat = removeCircularReferences(Fiat);
      const cleanedCrypto = removeCircularReferences(Crypto);
      const obj = {
        Fiat: cleanedFiat.data,
        Crypto: cleanedCrypto.data,
      };

      // Now you can safely stringify and send the response
      res.json({ status: true, data: obj });
    } else {
      return res
        .status(500)
        .json({ status: false, Message: "Something Went wrong" });
    }
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/Supportedfiat", async (req, res) => {
  try {
    console.log(
      `https://sandbox.api.uniramp.io/v1/onramp/supported/fiat/${req.body.data}`
    );

    const options = {
      method: "GET",
      url: `https://sandbox.api.uniramp.io/v1/onramp/supported/fiat/${req.body.data}`,
      headers: {
        accept: "application/json",
        "x-api-key": "pk_sand_Qj2IMyQpB2CIOEQ6sRf3xfuS7lp9BVd9",
      },
    };

    const response = await axios.request(options);

    if (response.status == 200) {
      return res.json({
        status: true,
        data: response.data,
      });
    } else {
      return res.json({
        status: false,
        Message: "Something went wrong",
      });
    }
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});
router.post("/Supportedcrypto", async (req, res) => {
  try {
    console.log(
      `https://sandbox.api.uniramp.io/v1/onramp/supported/crypto/${req.body.data}`
    );

    const options = {
      method: "GET",
      url: `https://sandbox.api.uniramp.io/v1/onramp/supported/crypto/${req.body.data}`,
      headers: {
        accept: "application/json",
        "x-api-key": "pk_sand_Qj2IMyQpB2CIOEQ6sRf3xfuS7lp9BVd9",
      },
    };

    const response = await axios.request(options);

    if (response.status == 200) {
      return res.json({
        status: true,
        data: response.data,
      });
    } else {
      return res.json({
        status: false,
        Message: "Something went wrong",
      });
    }

    console.log(response, "response");
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/marketprices", async (req, res) => {
  try {
    var Address;

    if (req.body.crypto == "") {
      Address = `https://sandbox.api.uniramp.io/v1/onramp/quote/cefi?fiat=${req.body.fiat}&fiatAmount=${req.body.fiatAmount}&payment=${req.body.payment}&chain=${req.body.chain}`;
    } else {
      Address = `https://sandbox.api.uniramp.io/v1/onramp/quote/cefi?fiat=${req.body.fiat}&fiatAmount=${req.body.fiatAmount}&payment=${req.body.payment}&chain=${req.body.chain}&crypto=${req.body.crypto}`;
    }

    const options = {
      method: "GET",
      url: Address,
      headers: {
        accept: "application/json",
        "x-api-key": "pk_sand_Qj2IMyQpB2CIOEQ6sRf3xfuS7lp9BVd9",
      },
    };

    const response = await axios
      .request(options)
      .then(function (response) {
        return res.json({
          status: true,
          data: response.data,
        });
      })
      .catch(function (error) {
        return res.json({
          status: false,
          Errormessage: error.response.data.message,
        });
      });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/buycrypto", async (req, res) => {
  try {
    const Adm = await Adminwallet.findOne({
      userId: "620d4f8ebf0ecf8fd8dac67a",
    });

    const ethWallets = Adm.wallets.filter(
      (wallet) => wallet.currencySymbol == "ETH"
    );

    console.log(ethWallets, " ethWallets");

    const options = {
      method: "POST",
      url: "https://sandbox.api.uniramp.io/v1/onramp/transaction",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": "pk_sand_Qj2IMyQpB2CIOEQ6sRf3xfuS7lp9BVd9",
      },

      data: {
        cefiGateway: req.body.cefiGateway,
        fiat: req.body.fiat,
        fiatAmount: req.body.fiatAmount,
        payment: req.body.payment,
        chain: req.body.chain,
        wallet: ethWallets[0].address,
        crypto: req.body.crypto,
      },
    };

    axios
      .request(options)
      .then(function (response) {
        console.log(response.data);
        return res.json({
          status: true,
          data: response.data,
        });
      })
      .catch(function (error) {
        return res.json({
          status: false,
          Errormessage: error.response.data.message,
        });
      });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.get("/generatetheQR", async (req, res) => {
  try {

    var qrName = "SellCrypt:" + "mugeshkumar.beleaf@gmail.com";
    var secret = speakeasy.generateSecret({ length: 10 });

    console.log(secret, "secret");

    const otpauth_url = speakeasy.otpauthURL({
      secret: secret.base32,
      label: qrName,
      issuer: 'SellCrypt',
      encoding: 'base32'
    });

    var url = common.getQrUrl(otpauth_url);

    console.log(url, "url");

  } catch (error) {
    console.log(error, "error");
    res.json({ status: false, Message: "Internel server error", code: 500 });
  }
});


module.exports = router;
