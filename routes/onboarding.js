var express = require("express");
var mongoose = require("mongoose");
var router = express.Router();
var common = require("../helper/common");

var usersDB = require("../schema/users");
const dns = require('dns');
const ShortUniqueId = require("short-unique-id");

const bcrypt = require('bcrypt');
const saltRounds = 12;
var mailtempDB = require("../schema/mailtemplate");
var mail = require("../helper/mailhelper");
const geoip = require("geoip-lite");
const userLoginhistoryDB = require("../schema/userLoginHistory");
var useragent = require("express-useragent");
const speakeasy = require("speakeasy");
const LoginAttemptDB = require("../schema/loginAttempts");
let jwt = require("jsonwebtoken");
const key = require("../config/key");
const jwt_secret = key.JWT_TOKEN_SECRET;
var moment = require("moment");
const { v4: uuidv4 } = require('uuid');
const userRedis = require('../redis-helper/userRedis');
const antiPhishing = require("../schema/antiphising");
const ObjectId = mongoose.Types.ObjectId;
const notifydb = require("../schema/notification");
const userWallet = require("../schema/userWallet");
const currency = require("../schema/currency");


const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

//Registration//

router.post('/onboardingUser', common.isEmpty, async (req, res) => {

  try {
    if (req.body.password && req.body.confirmPassword && req.body.email) {
      const isValid = req.body.password.length > 7 && req.body.password.length < 128 ? req.body.password == req.body.confirmPassword ? true : false : false;
      if (isValid == true) {
        var domainDns = req.body.email.split("@")[1]
        dns.resolveMx(domainDns, async (err, addresses) => {
          if (err) {
            return res.json({ status: false, Message: "Please try a different email address" });

          } else {
            let findUser = await usersDB.findOne({ email: common.encrypt(req.body.email) }).exec();
            if (findUser) {
              return res.json({ status: false, Message: "Email ID already exists" });
            } else {
              let lock = await bcrypt.hash(req.body.password, saltRounds);
              // var referral_code = await new ShortUniqueId({ length: 8 });
              // var uid = referral_code();
              var fou_digit = Math.floor(1000 + Math.random() * 9000);
              var obj = {
                displayname: req.body.email.split("@")[0],
                email: common.encrypt(req.body.email),
                password: lock,
                uuid: uuidv4().slice(0, 8),
                emailOtp: fou_digit,
                otpGenerateAt: new Date(),
                // referralCode: process.env.REFCODE + uid,
                // referralByCode: req.body.referral_code && req.body.referral_code != undefined && req.body.referral_code != null ? req.body.referral_code : "",
              };
              let createUser = await usersDB.create(obj);
              if (createUser) {
                let resData = await mailtempDB.findOne({ key: "OTP" });
                const findDetails = await antiPhishing.findOne({ userid: createUser._id });
                const message = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`;
                var etempdataDynamic = resData.body.replace(/###OTP###/g, fou_digit).replace(/###USERNAME###/g, req.body.email).replace(/###APCODE###/g, findDetails && findDetails.Status === "true" ? message : "");;
                var mailRes = await mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: req.body.email, subject: resData.Subject, html: etempdataDynamic });
                if (mailRes != null) {
                  var source = req.headers["user-agent"],
                    ua = useragent.parse(source);
                  var testip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
                  var replaceipAdd = testip.replace("127.0. 0.1 ", "");
                  var geo = await geoip.lookup(replaceipAdd);
                  let ip_address = req.header("x-forwarded-for") || req.connection.remoteAddress;

                  var obj = {
                    ipAddress: ip_address, browser: ua.browser, OS: ua.os, platform: ua.platform, useremail: common.encrypt(req.body.email), user_id: createUser._id,
                    location: geo !== null ? geo.country : "not found", activitity: "Signup", createdDate: new Date(), modifiedDate: new Date(),
                  };

                  let createSession = await userLoginhistoryDB.create(obj);

                  if (createSession) {
                    res.json({ status: true, Message: "Registration successful! An OTP has been sent to your registered email." });
                  } else {
                    return res.json({ status: false, Message: "Oops!, Please try again later" });
                  }

                } else {
                  return res.json({
                    Message: "Oops! We couldn’t send the email at this time. Please try again later ",
                  });
                }
              } else {
                return res.json({ status: false, Message: "Oops!, Please try again later" });
              }
            }
          }
        });
      } else {
        return res.json({ status: false, Message: "Oops!, Invalid password pattern detected, Adjust your password and try again." });
      }
    } else {
      return res.json({ status: false, Message: "Oops!, Enter all fields" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Oops!, Something went wrong" });
  }
});

router.post('/login', common.isEmpty, async (req, res) => {

  try {
    const { email, password } = req.body;
    if (req.body.email && req.body.email) {
      var findUser = await usersDB.findOne({ email: common.encrypt(email) }).exec();
      var findAttempts = await LoginAttemptDB.findOne({ email: common.encrypt(email) }).exec();
      const now = Date.now();
      if (findUser != null && findUser != undefined && findUser != "") {
        let verifyPasswrod = await common.unlock(password, findUser.password);
        if (verifyPasswrod == true) {
          if (findUser.verifyEmail == 0) {
            return res.json({ status: false, Message: "Your account is not activated. Please verify to continue" });
          }else {
            if (findUser.loginStatus == 1) {
              return res.json({ status: false, Message: "Your account is disabled. Please contact admin for assistance." });
            } else if (findUser.disputeStatus == 0)  {
              let resData = await mailtempDB.findOne({ key: "account_freeze_dispute" });
              const findDetails = await antiPhishing.findOne({ userid: findUser._id });
              const message = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`;
              var etempdataDynamic = resData.body.replace(/###USERNAME###/g, req.body.email)
              .replace(/###APCODE###/g, findDetails && findDetails.Status === "true" ? message : "");
              var mailRes = await mail.sendMail({ from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, to: req.body.email, subject: resData.Subject, html: etempdataDynamic });
              if (mailRes != null) {
                return res.json({ status: false, Message: "Your account has been frozen by the admin due to a P2P dispute. A notification email has been sent to your registered email address with further details." });
              }
            } else if (findAttempts && findAttempts.lockoutUntil && findAttempts.lockoutUntil > now) {
              return res.json({ status: false, Message: "Account locked. Try again later" });
            } else {
              const payload = {
                _id: findUser._id,
              };
              var token = jwt.sign(payload, jwt_secret, { expiresIn: 300*60 });
              var tokenJwt = findUser.tfastatus == 0 ? token : ""
              var messageTfa = "Please enter your 2FA authentication code to proceed";
              var messageSucc = "Welcome back! You’ve successfully logged in and can now access your account";
              var messageNotice = findUser.tfastatus == 0 ? messageSucc : messageTfa
              const ID = common.encrypt(findUser._id.toString());
              const timestamp = Date.now();
              const socketToken = `${ID}"_${timestamp}`;
              const PTKToken = `PTK_${ID}`;

              console.log(ID,timestamp,socketToken, PTKToken, "PTKToken" );

              var obj = {
                token: tokenJwt,
                tfa: findUser.tfastatus,
                socketToken: findUser.tfastatus ==  0 ? socketToken : "",
                PTKToken: findUser.tfastatus == 0 ?  PTKToken : "",
                message: messageNotice
              }
              var source = req.headers["user-agent"],
                ua = useragent.parse(source);
              var testip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
              var replaceipAdd = testip.replace("127.0. 0.1 ", "");
              var geo = await geoip.lookup(replaceipAdd);
              let ip_address = req.header("x-forwarded-for") || req.connection.remoteAddress;
              let findIP = await userLoginhistoryDB.findOne({ user_id: findUser._id, ipAddress: ip_address }).exec();
              console.log(findIP,"---findIP---");
              if (findIP == null) {
                let resData = await mailtempDB.findOne({ key: "idaddress" });
                var etempdataDynamic = resData.body.replace(/###USERNAME###/g, req.body.email).replace(/###WHEN###/g, moment().format('YYYY-MM-DD HH:mm:ss')).replace(/###IP###/g, ip_address);
                var mailRes = await mail.sendMail( { from: {name: process.env.FROM_NAME, address: process.env.FROM_EMAIL},to: req.body.email, subject: resData.Subject, html: etempdataDynamic });                     
                console.log(mailRes,'--=-=-=-mailRes=-=-');
                // return;
                if (mailRes != null) {
                var obj2 = {
                  ipAddress: ip_address, browser: ua.browser, OS: ua.os, platform: ua.platform, useremail: common.encrypt(req.body.email), user_id: findUser._id,
                  location: geo !== null ? geo.country : "not found", activitity: findUser.tfastatus == 0 ? "Login" : "TFARedirection", createdDate: new Date(), modifiedDate: new Date(),
                };
                let createSession = await userLoginhistoryDB.create(obj2);
                if (createSession) {
                  var objNotify = {
                    to_user_id: ObjectId(findUser._id),
                    to_user_name: findUser.displayname,
                    status: 0,
                    IP: ip_address,
                    message: "Login successfully",
                  };
                  let notification = await notifydb.create(objNotify);
                  let userAttempts = await LoginAttemptDB.updateOne({ email: common.encrypt(email) }, { $set: { lockoutUntil: null, attempts: 0 } });
                  let wallet_check = await userWallet.findOne({userId:ObjectId(findUser._id)});
                  if(wallet_check == null)
                  {
                    const currencyData = await currency.find({});
                    if (currencyData) {
                      const currencyArray = currencyData.map((currency) => ({
                        currencyId: currency._id,
                        currencyName: currency.currencyName,
                        currencySymbol: currency.currencySymbol,
                        amount: 0,
                      }));

                      const wallet_obj = {
                        userId: findUser._id,
                        wallets: currencyArray,
                      };

                      const wall_data = await userWallet.create(wallet_obj);
                    }
                  }
                  userRedis.getUser(findUser._id, function (datas){
                    if(datas) {
                      return res.json({ status: true, Message: messageNotice , data: obj });
                    }else{
                      return res.json({ status : false, Message : {} });
                    }
                  });
                } else {
                  return res.json({ status: false, Message: "Oops!, Please try again later" });
                }
                } else {
                  return res.json({
                    Message: "Oops! We couldn’t send the email at this time. Please try again later ",
                  });
                }
              } else {
                var obj2 = {
                  ipAddress: ip_address, browser: ua.browser, OS: ua.os, platform: ua.platform, useremail: common.encrypt(req.body.email), user_id: findUser._id,
                  location: geo !== null ? geo.country : "not found", activitity: findUser.tfastatus == 0 ? "Login" : "TFARedirection", createdDate: new Date(), modifiedDate: new Date(),
                };
                let createSession = await userLoginhistoryDB.create(obj2);
                if (createSession) {
                  var objNotify = {
                    to_user_id: ObjectId(findUser._id),
                    to_user_name: findUser.displayname,
                    status: 0,
                    IP: ip_address,
                    message: "Login successfully",
                  };
                  let notification = await notifydb.create(objNotify);
                  let userAttempts = await LoginAttemptDB.updateOne({ email: common.encrypt(email) }, { $set: { lockoutUntil: null, attempts: 0 } });
                  let wallet_check = await userWallet.findOne({userId:ObjectId(findUser._id)});
                  if(wallet_check == null)
                  {
                    const currencyData = await currency.find({});
                    if (currencyData) {
                      const currencyArray = currencyData.map((currency) => ({
                        currencyId: currency._id,
                        currencyName: currency.currencyName,
                        currencySymbol: currency.currencySymbol,
                        amount: 0,
                      }));

                      const wallet_obj = {
                        userId: findUser._id,
                        wallets: currencyArray,
                      };

                      const wall_data = await userWallet.create(wallet_obj);
                    }
                  }
                  userRedis.getUser(findUser._id, function (datas){
                    if(datas) {
                      return res.json({ status: true, Message: messageNotice , data: obj });
                    }else{
                      return res.json({ status : false, Message : {} });
                    }
                  });
                } else {
                  return res.json({ status: false, Message: "Oops!, Please try again later" });
                }
              }
            }
          }
        } else {
          let userAttempts = await LoginAttemptDB.findOne({ email: common.encrypt(email) });
          if (!userAttempts) {
            userAttempts = await LoginAttemptDB.create({ email: common.encrypt(email) });
          }
          userAttempts.attempts += 1;
          let saveAttempt = await LoginAttemptDB.updateOne({ email: userAttempts.email }, { $set: { attempts: userAttempts.attempts } }).exec();
          if (saveAttempt) {
            if (userAttempts.attempts >= MAX_ATTEMPTS) {
              let saveAttempt = await LoginAttemptDB.updateOne({ email: userAttempts.email }, { $set: { lockoutUntil: userAttempts.lockoutUntil = Date.now() + LOCKOUT_TIME } }).exec();
              if (saveAttempt) {
                if (userAttempts.lockoutUntil < Date.now() || userAttempts.lockoutUntil == null) {
                  let saveAttempt = await LoginAttemptDB.updateOne({ email: userAttempts.email }, { $set: { attempts: 0 } }).exec();
                  return res.json({ status: false, Message: "Incorrect Password!" });
                } else {
                  return res.json({ status: false, Message: "Too many failed login attempts. Account locked for 15 minutes." });
                }
              }
            } else {
              return res.json({ status: false, Message: "Incorrect Password!" });

            }
          } else {
            return res.json({ status: false, Message: "Incorrect Password!" });

          }
        }
      } else {
        return res.json({ status: false, Message: "Oops!, User not found" });
      }

    }
    else {
      return res.json({ status: false, Message: "Oops!, Enter all fields" });
    }
  } catch (error) {
    console.log(error, "asdfasfasdfasdfasdf");
    return res.json({ status: false, Message: "Oops!, Something went wrong" });
  }
});


router.post('/tfaLogin', common.isEmpty, async (req, res) => {

  try {

    if (req.body.userToken != "" && req.body.userToken != undefined && req.body.userToken != null) {
      let findUser = await usersDB.findOne({ email: common.encrypt(req.body.userEmail) }).exec();
      if (findUser) {
        //tfa verification 
        var verified = speakeasy.totp.verify({ secret: findUser.tfaenablekey, encoding: "base32", token: req.body.userToken, window: 1 });
        if (verified == true) {
          const payload = {
            _id: findUser._id,
          };

          const tokenID = common.encrypt(findUser._id.toString());
          const timestamp = Date.now();
          const socketToken = `${tokenID}"_${timestamp}`;
          const PTKToken = `PTK_${tokenID}`;

          var obj = {
            token: jwt.sign(payload, jwt_secret),
            message: "Welcome back! You’ve successfully logged in and can now access your account",
            socketToken:socketToken,
            PTKToken:PTKToken
          }
          var source = req.headers["user-agent"],
            ua = useragent.parse(source);
          var testip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
          var replaceipAdd = testip.replace("127.0. 0.1 ", "");
          var geo = await geoip.lookup(replaceipAdd);
          let ip_address = req.header("x-forwarded-for") || req.connection.remoteAddress;
          var obj2 = {
            ipAddress: ip_address, browser: ua.browser, OS: ua.os, platform: ua.platform, useremail: findUser.email, user_id: findUser._id,
            location: geo !== null ? geo.country : "not found", activitity: "TFALogin", createdDate: new Date(), modifiedDate: new Date(),
          };
          let createSession = await userLoginhistoryDB.create(obj2);

          let wallet_check = await userWallet.findOne({userId:ObjectId(findUser._id)});
          if(wallet_check == null)
          {
            const currencyData = await currency.find({});
            if (currencyData) {
              const currencyArray = currencyData.map((currency) => ({
                currencyId: currency._id,
                currencyName: currency.currencyName,
                currencySymbol: currency.currencySymbol,
                amount: 0,
              }));

              const wallet_obj = {
                userId: findUser._id,
                wallets: currencyArray,
              };

              const wall_data = await userWallet.create(wallet_obj);
            }
          }
          if (createSession) {
            userRedis.getUser(findUser._id, function (datas){
              if(datas) {
                return res.json({ status: true, issue: 0, data: obj });
              }else{
                return res.json({ status : false, Message : {} });
              }
            });
          } else {
            return res.json({ status: false, issue: 0, Message: "Oops!, Please try again later" });
          }
        } else {
          return res.json({ status: false, issue: 0, Message: "Oops!, Verification failed, Please enter valid Code" });
        }
      } else {
        return res.json({ status: false, issue: 1, Message: "Oops!, Please try to login" });
      }
    } else {
      return res.json({ status: false, issue: 0, Message: "Oops!, Please enter 2FA code" });
    }

  } catch (error) {
    console.log(error, '==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
    return res.json({ status: false, issue: 0, Message: "Oops!, Something went wrong" });

  }

});




router.get('/getQRCode', common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId
    let findCode = await usersDB.findOne({ _id: userId }).exec();
    console.log(findCode, "=-findCode=-");
    if (findCode) {
      if (findCode.tfaenablekey != "") {
        var obj = {
          tfa_url: findCode.tfa_url,
          tfaenablekey: findCode.tfaenablekey
        }
        return res.json({ status: true, data: obj });
      } else {
        var qrName = "Pitiklini:" + common.decrypt(findCode.email);
        var secret = speakeasy.generateSecret({ length: 10 });
        const otpauth_url = speakeasy.otpauthURL({
          secret: secret.base32, label: qrName, issuer: "Pitiklini", encoding: 'base32'
        });
        var tfa_url = common.getQrUrl(otpauth_url);
        let findCodeFinal = await usersDB.updateOne({ _id: userId }, { $set: { tfaenablekey: secret.base32, tfa_url: tfa_url } }).exec();
        var obj = {
          tfa_url: tfa_url,
          tfaenablekey: secret.base32
        }
        return res.json({ status: true, data: obj });
      }
    }

  } catch (error) {
    console.log(error, "error");
    return res.json({ status: false, Message: "Oops!, Something went wrong" });

  }
});


// Change password - Security 
router.post('/changePassword', common.tokenmiddleware, async (req, res) => {
  try {
    if (req.body.oldPass && req.body.password && req.body.cpass) {
      if (req.body.password == req.body.cpass) {
        var userId = req.userId;
        let userData = await usersDB.findOne({ _id: userId })
        let oldPassCheck = await common.unlock(req.body.oldPass, userData.password);
        if (oldPassCheck == true) {
          let lock = await bcrypt.hash(req.body.password, saltRounds);
          let passUpdate = await usersDB.updateOne(
            { _id: userId },
            { $set: { password: lock } }
          );
          if (passUpdate) {
            return res.json({
              status: true,
              Message: "Password changed successfully, login with your new password",
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
      } else {
        return res.json({
          status: false,
          Message: "Password and confirm password are not same !",
        });
      }
    } else {
      return res.json({ status: false, Message: "Oops!, Enter all fields" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Oops!, Something went wrong" });
  }
});

// Forgot password - Login
router.post('/forgotpassword', async (req, res) => {
  try {
    if (req.body.password && req.body.confimPassword && req.body.email) {
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
        } else {
          return res.json({ status: false, Message: "User not found" });
        }
      } else {
        return res.json({
          status: false,
          Message: "Password and confirm password are not same !",
        });
      }
    } else {
      return res.json({ status: false, Message: "Oops!, Enter all fields" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Oops!, Something went wrong" });
  }
});





module.exports = router;
