var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var adminDB = require("../schema/admin");
var bankdetail = require("../schema/bankdetails");
var adminloginhistoryDB = require("../schema/adminloginhistory");
let jwt = require("jsonwebtoken");
const key = require("../config/key");
const jwt_secret = key.JWT_TOKEN_SECRET;
var ip = require("ip");
var useragent = require("express-useragent");
var mongoose = require("mongoose");
const crypto = require("crypto");
var mailtempDB = require("../schema/mailtemplate");
var mail = require("../helper/mailhelper");
var FaqDB = require("../schema/faq");
var AdminSettings = require("../schema/sitesettings");
var supportcategoryDB = require("../schema/supportcategory");
var supportlistDB = require("../schema/supportlist");
var usersDB = require("../schema/users");
var languageDB = require("../schema/language");
var moment = require("moment");
let ObjectId = mongoose.Types.ObjectId;
var cmsDB = require("../schema/cms");
var homecontentDB = require("../schema/homecontent");
var aboutusDB = require("../schema/aboutuscontent");
var tradePairDB = require("../schema/trade_pair");

var homecontentDB = require("../schema/homecontent");
var aboutusDB = require("../schema/aboutuscontent");
var cryptoAddressDB = require("../schema/userCryptoAddress");
var adminWalletDB = require("../schema/adminWallet");
const speakeasy = require("speakeasy");
const validator = require("node-validator");
const WAValidator = require("multicoin-address-validator");
var WithdrawDB = require("../schema/withdraw");
var orderDB = require("../schema/orderPlace");
var orderConfirmDB = require("../schema/confirmOrder");
var depositDB = require("../schema/deposit");
var contactDB = require("../schema/contact");
var request = require("request");
var fs = require("fs");
const profitDB = require("../schema/profit");
const adminBankdetails = require("../schema/adminBank");
const manualDeposit = require("../schema/manualDeposit");

var redisCache = require("../redis-helper/redisHelper");
const redis = require("redis");
client = redis.createClient();
const { RedisService } = require("../services/redis");

BINANCEexchange = require("../exchanges/binance");
var adminWalletDB = require("../schema/adminWallet");
var currencyDB = require("../schema/currency");
var userWalletDB = require("../schema/userWallet");
const launchPadDB = require("../schema/launchPad");


const tradeRedis = require("../tradeRedis/activeOrderRedis");
const p2pOrdersDB = require("../schema/p2pOrder");
const bannerDB = require("../schema/banner");
const p2pconfirmOrder = require("../schema/p2pconfirmOrder");
const notifyDB = require("../schema/notification");

const whitelistDB = require("../schema/whitelistip");
const loginAttemptsDB = require("../schema/loginAttempts");
const blockipDB = require("../schema/ipblock.model");
const userBank = require("../schema/bankdetails");
const bcrypt = require('bcrypt');
const saltRounds = 12;
var paymentMethod = require("../schema/paymentMethod");

router.use(useragent.express());
function generatePassword(length) {
  var pass = "";
  var str =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz0123456789@#$";

  for (let i = 1; i <= length; i++) {
    var char = Math.floor(Math.random() * str.length + 1);

    pass += str.charAt(char);
  }

  return pass;
}

function getUniqueListBy(arr, key) {
  return [...new Map(arr.map((item) => [item[key], item])).values()];
}

router.post("/getContent", async (req, res) => {
  try {
    console.log(req.body.title, "=-=-=-req.body.title");
    cmsDB.findOne({ title: req.body.title }).exec((err, data) => {
      if (data == undefined) {
        res.json({
          status: false,
          data: {},
        });
      } else {
        res.json({
          status: false,
          data: data,
        });
      }
      console.log(data, "=-=-=-=-=-data");
    });
  } catch (error) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post('/entry', common.isEmpty, async (req, res) => {
  try {
    //     let lock =   await bcrypt.hash("Pitiklinicrypt@2024unlock", saltRounds);
    //     var obj = {
    //       email : common.encrypt("Pitiklinicrypt@gmail.com"),
    //       password : lock,
    //     }
    //     console.log(obj,'=-=-=-=');
    //     let create = await adminDB.create(obj);
    // return false
    if (req.body.email && req.body.password) {
      let findAdmin = await adminDB.findOne({ email: common.encrypt(req.body.email) }, { tfa_status: 1, password: 1, email: 1, admintype: 1, permissions: 1 }).exec();
      if (findAdmin) {
        let verifyPasswrod = await common.unlock(req.body.password, findAdmin.password);
        if (verifyPasswrod == true) {
          var source = req.headers["user-agent"],
            ua = useragent.parse(source);
          let ip_address =
            req.header("x-forwarded-for") || req.connection.remoteAddress;
          var obj = {
            ipAddress: ip_address.replace("::ffff:", ""),
            browser: ua.browser,
            OS: ua.os,
            platform: ua.platform,
            useremail: findAdmin.email,
          };
          let creatHistory = await adminloginhistoryDB.create(obj);
          if (creatHistory) {
            const payload = {
              _id: findAdmin._id,
            };
            var token = jwt.sign(payload, jwt_secret, {
              expiresIn: 300 * 60,
            });
            return res.json({
              status: true,
              Message: "Login Successful",
              token: token,
              admin_data: findAdmin,
            });
          }
        } else {
          return res.json({ status: false, Message: "Oops!, Invalid password" });
        }
      } else {
        return res.json({ status: false, Message: "Oops!, Invalid email address" });
      }
    } else {
      return res.json({ status: false, Message: "Oops!, Enter all fields" });
    }

  } catch (error) {
    console.log(error, '--0-0-0error');
    return res.json({ status: false, Message: "Oops!, Something went wrong" });

  }
})

router.post("/admin_login", common.isEmpty, async (req, res) => {
  try {
    adminDB
      .findOne({ email: common.encrypt(req.body.email) }, {})
      .exec((err, admin_data) => {
        if (!err) {
          if (admin_data) {
            var source = req.headers["user-agent"],
              ua = useragent.parse(source);
            // if (admin_data.password == password_encrypt) {
            let ip_address =
              req.header("x-forwarded-for") || req.connection.remoteAddress;
            var obj = {
              ipAddress: ip_address.replace("::ffff:", ""),
              browser: ua.browser,
              OS: ua.os,
              platform: ua.platform,
              useremail: common.decrypt(admin_data.email),
            };
            adminloginhistoryDB.create(obj, (his_err, historyData) => {
              if (!his_err) {
                const payload = {
                  _id: admin_data._id,
                };

                var token = jwt.sign(payload, jwt_secret, {
                  expiresIn: 300 * 60,
                });

                res.json({
                  status: true,
                  Message: "Login Successful",
                  token: token,
                  admin_data: admin_data,
                });
              } else {
                res.json({
                  status: false,
                  Message: "Something went wrong,Please try again later",
                });
              }
            });
            // } else {
            //   res.json({
            //     status: false,
            //     Message: "Authentication failed, Incorrect Password",
            //   });
            // }
          } else {
            res.json({ status: false, Message: "Admin not found" });
          }
        } else {
          res.json({
            status: false,
            Message: "Something went wrong,Please try again later",
          });
        }
      });
  } catch (error) {
    console.log(error, '=-=-error')
    res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

// router.post("/login", common.isEmpty, async (req, res) => {
//   try {
//     var ip_address =
//       req.header("x-forwarded-for") || req.connection.remoteAddress;
//     ip_address = ip_address.replace("::ffff:", "");
//     var source = req.headers["user-agent"],
//       ua = useragent.parse(source);
//     var admin_data = await adminDB.findOne(
//       {email: common.encrypt(req.body.email)},
//       {}
//     );
//     if (admin_data) {
//       var password_encrypt = common.encrypt(req.body.password);
//       if (admin_data.password == password_encrypt) {
//         let otp = common.generate_otp();
//         var date = new Date();
//         var expireTime = new Date(date.getTime() + 15 * 60000);
//         var otp_update = await adminDB.findOneAndUpdate(
//           {_id: mongoose.Types.ObjectId(admin_data._id)},
//           {loginOTP: otp, expireTime: expireTime},
//           {new: true}
//         );
//         if (otp_update) {
//           var etempdata = await mailtempDB.findOne({key: "adminlogin_OTP"});
//           var etempdataDynamic = etempdata.body.replace(/###OTP###/g, otp);
//           var tomail = "";
//           if (admin_data.type == 1) {
//             tomail = process.env.FROM_EMAIL;
//           } else {
//             tomail = req.body.email;
//           }
//           var mailRes = await mail.sendMail({
//             from: {
//               name: process.env.FROM_NAME,
//               address: process.env.FROM_EMAIL,
//             },
//             to: tomail,
//             subject: etempdata.Subject,
//             html: etempdataDynamic,
//           });
//           //console.log("mail rese====",mailRes)
//           res.json({
//             status: true,
//             Message:
//               "verification OTP sent to your mail, please check your mail",
//             token: common.encryptionLevel(admin_data._id.toString()),
//             tfa: admin_data.tfa_status,
//           });
//         } else {
//           res.json({
//             status: false,
//             Message: "Something went wrong,Please try again later",
//           });
//         }
//       } else {
//         var loginattempt = await loginAttemptsDB.findOne({
//           ip_address: ip_address,
//         });
//         if (loginattempt != null) {
//           var attempcount = loginattempt.attemptCount;
//           if (attempcount < 5) {
//             var inc_count = +attempcount + 1;
//             var attempt_update = await loginAttemptsDB.findOneAndUpdate(
//               {ip_address: ip_address},
//               {attemptCount: inc_count},
//               {new: true}
//             );
//             if (attempt_update) {
//               res.json({
//                 status: false,
//                 Message: "Authentication failed, Incorrect Password",
//               });
//             }
//           } else {
//             var blockip_check = await blockipDB.findOne({
//               ip_address: ip_address,
//             });
//             if (blockip_check != null) {
//               var blockip_update = await blockipDB.findOneAndUpdate(
//                 {ip_address: ip_address},
//                 {ip_address: ip_address},
//                 {new: true}
//               );
//               if (blockip_update) {
//                 res.json({
//                   status: false,
//                   Message: "Too many login attempts, Your ip is blocked",
//                 });
//               }
//             } else {
//               var date = new Date();
//               var expireTime = new Date(date.getTime() + 24 * 60 * 60000);
//               //var expireTime = new Date(date.getTime() + 60000)
//               var obj = {
//                 ip_address: ip_address,
//                 expireTime: expireTime,
//               };
//               var blockip_create = await blockipDB.create(obj);
//               if (blockip_create) {
//                 res.json({
//                   status: false,
//                   Message:
//                     "Too many login attempts, Your ip blocked for next 24 hours",
//                 });
//               }
//             }
//           }
//         } else {
//           var obj = {
//             email: req.body.email,
//             ip_address: ip_address,
//             browser: ua.browser,
//           };
//           var loginattempt = await loginAttemptsDB.create(obj);
//           if (loginattempt) {
//             res.json({
//               status: false,
//               Message: "Authentication failed, Incorrect Password",
//             });
//           }
//         }
//       }
//     } else {
//       res.json({status: false, Message: "Admin not found"});
//     }
//     // }
//     // else
//     // {
//     //     res.json({status:false, Message:"Unable to login, Your ip is not whitelisted"});
//     // }
//   } catch (error) {
//     //console.log(("error===", error);
//     res.json({
//       status: false,
//       Message: "Something went wrong,Please try again later",
//     });
//   }
// });

// router.post("/verify_otp", common.isEmpty, (req, res) => {
//   try {
//     var dateNow = new Date();
//     var decrypted_token = common.decryptionLevel(req.body.admin_name);
//     adminDB.findOne({_id: decrypted_token}, {}).exec((err, admin_data) => {
//       if (!err) {
//         if (admin_data) {
//           if (admin_data.expireTime >= dateNow) {
//             if (admin_data.loginOTP == req.body.emailotp) {
//               if (admin_data.tfa_status == 1) {
//                 if (req.body.tfa_code != "") {
//                   var verified = speakeasy.totp.verify({
//                     secret: admin_data.tfa_code,
//                     encoding: "base32",
//                     token: req.body.tfa_code,
//                   });
//                   if (verified) {
//                     let ip_address =
//                       req.header("x-forwarded-for") ||
//                       req.connection.remoteAddress;
//                     ip_address = ip_address.replace("::ffff:", "");
//                     var source = req.headers["user-agent"],
//                       ua = useragent.parse(source);
//                     var obj = {
//                       ipAddress: ip_address,
//                       browser: ua.browser,
//                       OS: ua.os,
//                       platform: ua.platform,
//                       useremail: common.decrypt(admin_data.email),
//                     };
//                     adminloginhistoryDB.create(
//                       obj,
//                       async (his_err, historyData) => {
//                         if (!his_err) {
//                           const payload = {
//                             _id: admin_data._id,
//                           };

//                           var token = jwt.sign(payload, jwt_secret, {
//                             expiresIn: 300 * 60,
//                           });
//                           var cur_date = new Date();

//                           var etempdata = await mailtempDB.findOne({
//                             key: "adminlogin_notification",
//                           });
//                           var etempdataDynamic = etempdata.body
//                             .replace(/###ip_address###/g, ip_address)
//                             .replace(/###browser###/g, ua.browser)
//                             .replace(
//                               /###date###/g,
//                               moment(cur_date).format("lll")
//                             );
//                           var tomail = "";
//                           if (admin_data.type == 1) {
//                             tomail = process.env.FROM_EMAIL;
//                           } else {
//                             tomail = common.decrypt(admin_data.email);
//                           }
//                           mail.sendMail(
//                             {
//                               from: {
//                                 name: process.env.FROM_NAME,
//                                 address: process.env.FROM_EMAIL,
//                               },
//                               to: tomail,
//                               subject: etempdata.Subject,
//                               html: etempdataDynamic,
//                             },
//                             function (mailRes) {
//                               res.json({
//                                 status: true,
//                                 Message: "Login Successful",
//                                 token: token,
//                                 admin_data: admin_data,
//                               });
//                             }
//                           );
//                         } else {
//                           res.json({
//                             status: false,
//                             Message:
//                               "Something went wrong,Please try again later",
//                           });
//                         }
//                       }
//                     );
//                   } else {
//                     res.json({
//                       status: false,
//                       Message: "Please enter valid tfa code",
//                     });
//                   }
//                 } else {
//                   res.json({
//                     status: false,
//                     Message: "Please enter valid tfa code",
//                   });
//                 }
//               } else {
//                 let ip_address =
//                   req.header("x-forwarded-for") || req.connection.remoteAddress;
//                 ip_address = ip_address.replace("::ffff:", "");
//                 var source = req.headers["user-agent"],
//                   ua = useragent.parse(source);
//                 var obj = {
//                   ipAddress: ip_address,
//                   browser: ua.browser,
//                   OS: ua.os,
//                   platform: ua.platform,
//                   useremail: common.decrypt(admin_data.email),
//                 };
//                 adminloginhistoryDB.create(
//                   obj,
//                   async (his_err, historyData) => {
//                     if (!his_err) {
//                       const payload = {
//                         _id: admin_data._id,
//                       };

//                       var token = jwt.sign(payload, jwt_secret, {
//                         expiresIn: 300 * 60,
//                       });
//                       var etempdata = await mailtempDB.findOne({
//                         key: "adminlogin_notification",
//                       });
//                       var cur_date = new Date();
//                       var etempdataDynamic = etempdata.body
//                         .replace(/###ip_address###/g, ip_address)
//                         .replace(/###browser###/g, ua.browser)
//                         .replace(/###date###/g, moment(cur_date).format("lll"));

//                       mail.sendMail(
//                         {
//                           from: {
//                             name: process.env.FROM_NAME,
//                             address: process.env.FROM_EMAIL,
//                           },
//                           to: process.env.FROM_EMAIL,
//                           subject: etempdata.Subject,
//                           html: etempdataDynamic,
//                         },
//                         function (mailRes) {
//                           res.json({
//                             status: true,
//                             Message: "Login Successful",
//                             token: token,
//                             data: obj,
//                             admin_data: admin_data,
//                           });
//                         }
//                       );
//                     } else {
//                       res.json({
//                         status: false,
//                         Message: "Something went wrong,Please try again later",
//                       });
//                     }
//                   }
//                 );
//               }
//             } else {
//               res.json({
//                 status: false,
//                 Message: "Authentication failed, Incorrect OTP",
//               });
//             }
//           } else {
//             res.json({
//               status: false,
//               Message: "OTP expired, please try again",
//             });
//           }
//         } else {
//           res.json({status: false, Message: "Admin not found"});
//         }
//       } else {
//         res.json({
//           status: false,
//           Message: "Something went wrong,Please try again later",
//         });
//       }
//     });
//   } catch (error) {
//     res.json({
//       status: false,
//       Message: "Something went wrong,Please try again later",
//     });
//   }
// });

router.post("/login", common.isEmpty, async (req, res) => {
  // console.log(common.decrypt("DEUeTp7ci8qTCMHNMpcBYlPWQL4eTvhwy7voXAooY+g="),"emil")
  // console.log(common.decrypt("lJ+Jw6tXp6OOsWnV+6IgCA==+g="),"passwrd")
  try {
    var ip_address =
      req.header("x-forwarded-for") || req.connection.remoteAddress;
    ip_address = ip_address.replace("::ffff:", "");
    var source = req.headers["user-agent"],
      ua = useragent.parse(source);
    var admin_data = await adminDB.findOne(
      { email: common.encrypt(req.body.email) },
      {}
    );
    if (admin_data) {
      var password_encrypt = common.encrypt(req.body.password);
      if (admin_data.password == password_encrypt) {
        if (admin_data.tfa_status == 1) {
          res.json({
            status: true,
            Message:
              "Please enter 2fa code",
            token: common.encryptionLevel(admin_data._id.toString()),
            tfa: admin_data.tfa_status,
          });
        }
        else {
          var source = req.headers["user-agent"],
            ua = useragent.parse(source);
          // if (admin_data.password == password_encrypt) {
          let ip_address =
            req.header("x-forwarded-for") || req.connection.remoteAddress;
          var obj = {
            ipAddress: ip_address.replace("::ffff:", ""),
            browser: ua.browser,
            OS: ua.os,
            platform: ua.platform,
            useremail: common.decrypt(admin_data.email),
          };
          adminloginhistoryDB.create(obj, (his_err, historyData) => {
            if (!his_err) {
              const payload = {
                _id: admin_data._id,
              };

              var token = jwt.sign(payload, jwt_secret, {
                expiresIn: 300 * 60,
              });

              res.json({
                status: true,
                Message: "Login Successful",
                token: token,
                admin_data: admin_data,
                tfa: admin_data.tfa_status,
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
        var loginattempt = await loginAttemptsDB.findOne({
          ip_address: ip_address,
        });
        if (loginattempt != null) {
          var attempcount = loginattempt.attemptCount;
          if (attempcount < 5) {
            var inc_count = +attempcount + 1;
            var attempt_update = await loginAttemptsDB.findOneAndUpdate(
              { ip_address: ip_address },
              { attemptCount: inc_count },
              { new: true }
            );
            if (attempt_update) {
              res.json({
                status: false,
                Message: "Authentication failed, Incorrect Password",
              });
            }
          } else {
            var blockip_check = await blockipDB.findOne({
              ip_address: ip_address,
            });
            if (blockip_check != null) {
              var blockip_update = await blockipDB.findOneAndUpdate(
                { ip_address: ip_address },
                { ip_address: ip_address },
                { new: true }
              );
              if (blockip_update) {
                res.json({
                  status: false,
                  Message: "Too many login attempts, Your ip is blocked",
                });
              }
            } else {
              var date = new Date();
              var expireTime = new Date(date.getTime() + 24 * 60 * 60000);
              //var expireTime = new Date(date.getTime() + 60000)
              var obj = {
                ip_address: ip_address,
                expireTime: expireTime,
              };
              var blockip_create = await blockipDB.create(obj);
              if (blockip_create) {
                res.json({
                  status: false,
                  Message:
                    "Too many login attempts, Your ip blocked for next 24 hours",
                });
              }
            }
          }
        } else {
          var obj = {
            email: req.body.email,
            ip_address: ip_address,
            browser: ua.browser,
          };
          var loginattempt = await loginAttemptsDB.create(obj);
          if (loginattempt) {
            res.json({
              status: false,
              Message: "Authentication failed, Incorrect Password",
            });
          }
        }
      }
    } else {
      res.json({ status: false, Message: "Admin not found" });
    }
    // }
    // else
    // {
    //     res.json({status:false, Message:"Unable to login, Your ip is not whitelisted"});
    // }
  } catch (error) {
    //console.log(("error===", error);
    res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});



router.post("/verify_otp", common.isEmpty, (req, res) => {
  try {
    var dateNow = new Date();
    var decrypted_token = common.decryptionLevel(req.body.admin_name);
    adminDB.findOne({ _id: decrypted_token }, {}).exec((err, admin_data) => {
      if (!err) {
        if (admin_data) {
          if (admin_data.tfa_status == 1) {
            if (req.body.tfa_code != "") {
              var verified = speakeasy.totp.verify({
                secret: admin_data.tfa_code,
                encoding: "base32",
                token: req.body.tfa_code,
              });
              if (verified) {
                let ip_address =
                  req.header("x-forwarded-for") ||
                  req.connection.remoteAddress;
                ip_address = ip_address.replace("::ffff:", "");
                var source = req.headers["user-agent"],
                  ua = useragent.parse(source);
                var obj = {
                  ipAddress: ip_address,
                  browser: ua.browser,
                  OS: ua.os,
                  platform: ua.platform,
                  useremail: common.decrypt(admin_data.email),
                };
                adminloginhistoryDB.create(
                  obj,
                  async (his_err, historyData) => {
                    if (!his_err) {
                      const payload = {
                        _id: admin_data._id,
                      };

                      var token = jwt.sign(payload, jwt_secret, { expiresIn: 300 * 60 });
                      res.json({
                        status: true,
                        Message: "Login Successful",
                        token: token,
                        admin_data: admin_data
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
              } else {
                res.json({
                  status: false,
                  Message: "Please enter valid tfa code",
                });
              }
            } else {
              res.json({
                status: false,
                Message: "Please enter valid tfa code",
              });
            }
          }
        } else {
          res.json({ status: false, Message: "Admin not found" });
        }
      } else {
        res.json({
          status: false,
          Message: "Something went wrong,Please try again later",
        });
      }
    });
  } catch (error) {
    res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

//--------------------FAQ CREATE AND UPDATE----------------AUTH-SIVA----------//

router.post("/faq_create_updae", (req, res) => {
  try {
    if (req.body._id != "") {
      FaqDB.updateOne(
        { _id: req.body._id },
        {
          $set: {
            question: req.body.question,
            answer: req.body.answer,
            status: parseInt(req.body.status),
            updated_at: Date.now(),
          },
        }
      ).exec((err, updatedData) => {
        if (!err) {
          return res.json({
            status: true,
            Message: "FAQ updated successfully",
          });
        } else {
          return res.json({
            status: false,
            Message: "Something went wrong,Please try again later",
          });
        }
      });
    } else if (req.body._id == "") {
      var createObj = {
        question: req.body.question,
        answer: req.body.answer,
        status: parseInt(req.body.status),
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      FaqDB.create(createObj, (create_err, createData) => {
        if (!create_err) {
          return res.json({
            status: true,
            message: "FAQ created successfully",
          });
        } else {
          return res.json({
            status: false,
            Message: "Something went wrong,Please try again later",
          });
        }
      });
    }
  } catch (error) { }
});

//----------------------FAQ VIEW ALL DATAS----------AUTH-SIVA-----------------------//

router.get("/faq_view", (req, res) => {
  try {
    FaqDB.find().exec((err, datas) => {
      if (!err) {
        const data = [];
        var faqData = datas;
        for (var i = 0; i < faqData.length; i++) {
          var FaqData = {
            _id: faqData[i]._id,
            id: i + 1,
            question: faqData[i].question,
            status: faqData[i].status,
          };
          data.push(FaqData);
        }
        return res.json({ status: true, data: data });
      } else {
        return res.json({
          status: false,
          Message: "Something went wrong,Please try again later",
        });
      }
    });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

//----------------------GET FAQ VIEW EDIT SINGELE DATA-------------AUTH-SIVA-----------------------//

router.post("/faq_getFaq_One", (req, res) => {
  try {
    FaqDB.findOne({ _id: req.body._id }).exec((err, data) => {
      if (err) {
        return res.json({
          status: false,
          Message: "Something went wrong,Please try again later",
        });
      } else {
        return res.json({ status: true, Message: data });
      }
    });
  } catch (e) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});
//----------------------GET FAQ STATUS CHANGE SINGELE DATA-------------AUTH-SIVA-----------------------//

router.post("/changeStatus", (req, res) => {
  try {
    FaqDB.updateOne(
      { _id: req.body._id },
      { $set: { status: req.body.status } }
    ).exec((err, changedData) => {
      if (!err) {
        return res.json({
          status: true,
          Message: "Status changed successfully",
        });
      } else {
        return res.json({
          status: false,
          Message: "Status can't changed,Please try again later",
        });
      }
    });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

//----------------------GET FAQ SINGELE DATA DELETE-------------AUTH-SIVA-----------------------//

router.post("/deleteFaq", (req, res) => {
  try {
    //console.log((req.body._id);
    if (
      req.body._id != "" ||
      req.body._id != undefined ||
      req.body._id != null
    ) {
      FaqDB.findByIdAndDelete({ _id: req.body._id }).exec((err, deletedData) => {
        if (!err) {
          return res.json({
            status: true,
            Message: "Faq data deleted successfully",
          });
        } else {
          return res.json({
            status: false,
            Message: "Faq data can't changed,Please try again later",
          });
        }
      });
    } else {
      return res.json({
        status: false,
        Message: "Faq data can't changed,Please try again later",
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

router.post("/updatebankdetails1", (req, res) => {
  try {
    bankdetail
      .findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(req.body._id) },
        {
          Account_Number: req.body.accno,
          Bank_Name: req.body.bank,
          IFSC_code: req.body.branch,
          Branch_Name: req.body.ifsc,
          Name: req.body.name,
        },
        { new: true }
      )
      .exec((err, data) => {
        if (err) {
          res.status(400).json({ status: false, message: "Error with Database" });
        } else {
          res.status(200).json({
            status: true,
            message: "bank Details Updated Successfully",
          });
        }
      });
  } catch (error) {
    res.status(500).json({ status: false, message: error });
  }
});

/* manickam --- admin profile ---- */
router.get("/get_admin_profile", common.tokenmiddleware, (req, res) => {
  try {
    adminDB
      .findOne(
        { _id: mongoose.mongo.ObjectId(req.userId) },
        { email: 1, tfa_code: 1, tfa_url: 1, tfa_status: 1 }
      )
      .exec((err, data) => {
        //console.log((err, "=-=-=-==-=-=-=-err");
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          var obj = {
            email: common.decrypt(data.email),
            tfa_code: data.tfa_code,
            tfa_url: data.tfa_url,
            tfa_status: data.tfa_status,
          };
          res.json({
            status: true,
            data: obj,
          });
        }
      });
  } catch (error) {
    //console.log((error, "=-=-=-=eroor");
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/check_password", common.tokenmiddleware, (req, res) => {
  try {
    var enpass = common.encrypt(req.body.password);
    adminDB
      .findOne({ _id: mongoose.mongo.ObjectId(req.userId) }, { password: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          if (enpass == data.password) {
            res.json({
              status: true,
              Message: "",
            });
          } else {
            res.json({
              status: false,
              Message: "Old Password is Incorrect",
            });
          }
        }
      });
  } catch (error) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/update_profile", common.tokenmiddleware, (req, res) => {
  var enpass = common.encrypt(req.body.password);
  //var enemail = common.encrypt(req.body.email);
  //var changeemail=0;
  try {
    adminDB
      .findOne(
        { _id: mongoose.mongo.ObjectId(req.userId) },
        { email: 1, userName: 1 }
      )
      .exec((dataerr, admindata) => {
        if (dataerr) {
          res.json({
            status: "",
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          // if(admindata.email != enemail)
          // {
          //     changeemail = 1;
          //     adminDB.updateOne({ _id:mongoose.mongo.ObjectId(req.userId) }, { $set: { changeMail: changeemail, password: enpass } }).exec((updateerr, updatedata) => {
          //     if(updateerr)
          //     {
          //         res.json({
          //             status: '',
          //             Message: 'Something Went Wrong. Please Try Again later'
          //         })

          //     }
          //     else{

          //         mailtempDB.findOne({ key: 'change_mail' }).exec(function (err1, resData) {
          //             var email = common.decrypt(admindata.email)
          //             var body = resData.body;
          //             var cipher = crypto.createCipheriv('aes-256-ctr', 'T1Bt0Lx5jA9ML6AJ8523IAv0anRd03Ya', 'S19h8AnT21H8n14I')
          // 			var crypted = cipher.update(req.userId+'@'+new Date().getTime().toString()+'@'+enemail, 'utf8', 'hex')
          // 			crypted += cipher.final('hex');
          //             var link1 = key.siteUrl + "login?verifyemail=" + crypted;
          //          //console.log(("change mail link====",link1);
          //             var body1 = body.replace(/###USERNAME###/g, admindata.userName);
          //             body1 = body1.replace(/###LINK###/g, link1);
          //             let mailOptions = {
          //                 from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
          //                 to: email,
          //                 subject: resData.Subject,
          //                 html: body1
          //             }
          //             mail.sendMail(mailOptions)
          //                 .then(function (email) {
          //                     res.status(200).json({ status: true, Message: 'Password changed and Verifcation link sent to your mail successfully, Please confirm' });
          //                 }).catch(function (exception) {
          //                     res.status(200).json({ status: false, Message: 'Something Went Wrong. Please Try Again later' });
          //                 });
          //         });

          //     }

          // });
          // }
          // else{

          adminDB
            .updateOne(
              { _id: mongoose.mongo.ObjectId(req.userId) },
              { $set: { password: enpass } }
            )
            .exec((updateerr, updatedata) => {
              if (updateerr) {
                res.json({
                  status: "",
                  Message: "Something Went Wrong. Please Try Again later",
                });
              } else {
                res.json({
                  status: true,
                  Message: "Password Changed Successfully",
                });
              }
            });

          //}
        }
      });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/change_mail", (req, res) => {
  try {
    var cipher = crypto.createDecipheriv(
      "aes-256-ctr",
      "T1Bt0Lx5jA9ML6AJ8523IAv0anRd03Ya",
      "S19h8AnT21H8n14I"
    );
    var crypted = cipher.update(req.body.req_id, "hex", "utf8");
    crypted += cipher.final("utf8");
    let splited = crypted.split("@");
    let user_id = splited[0];
    let userTime = splited[1];
    let userMail = common.decrypt(splited[2]);
    adminDB.findOne({ _id: user_id }).exec(function (err, resData) {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        if (resData) {
          var today = new Date();
          var Christmas = new Date(+userTime);
          var diffMs = today - Christmas;
          var diffDays = Math.floor(diffMs / 86400000); // days
          var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
          var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes
          if (diffDays == 0 && diffHrs == 0 && diffMins <= 10) {
            adminDB
              .updateOne(
                { _id: resData._id },
                { $set: { email: common.encrypt(userMail), changeMail: 0 } }
              )
              .exec(function (err, resUpdate) {
                if (resUpdate.ok == 1) {
                  return res.json({
                    status: true,
                    Message: "Email Changed Successfully",
                  });
                } else {
                  return res.json({
                    status: false,
                    Message: "Something went wrong",
                  });
                }
              });
          } else {
            adminDB
              .updateOne({ _id: resData._id }, { $set: { changeMail: 0 } })
              .exec(function (uerr, resUpdate) {
                if (uerr) {
                  return res.json({
                    status: false,
                    Message: "Something went wrong",
                  });
                } else {
                  return res.json({
                    status: false,
                    Message: "Link has been expired",
                  });
                }
              });
          }
        } else {
          return res.json({ status: false, Message: "Invalid link" });
        }
      }
    });
  } catch (e) {
    //  console.log((
    //       "====================change mail catch ====================",
    //       e.message
    //     );
    return res.json({
      status: false,
      data: {},
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

/* manickam --- site settings ---- */

router.get("/get_sitedata", async (req, res) => {
  try {
    settingsDB.findOne().exec((err, data) => {
      //console.log((data, "data");
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        var obj = {
          // _id: data._id,
          siteLogo: data.siteLogo,
          Favicon: data.Favicon,
          // recaptchaSitekey: data.recaptchaSitekey,
          // recaptchaSceretkey: data.recaptchaSceretkey,
          registerStatus: data.registerStatus,
          undermaintenenceStatus: data.undermaintenenceStatus,
          // smtp_port: data.smtp_port,
          // smtp_host: common.decrypt(data.smtp_host),
          // smtp_user: common.decrypt(data.smtp_user),
          // smtp_pass: common.decrypt(data.smtp_pass),
          createdDate: data.createdDate,
          modifiedDate: data.modifiedDate,
          siteName: data.siteName,
          copy_right_text: data.copy_right_text,
          fb_url: data.fb_url,
          youtube_url: data.youtube_url,
          insta_url: data.insta_url,
          telegram_url: data.telegram_url,
          twitter_url: data.twitter_url,
          whatsapp_url: data.whatsapp_url,
          linkedin_url: data.linkedin_url,
          sendgrid_api: data.sendgrid_api,
          sendgrid_mail: data.sendgrid_mail,
          binance_apikey: data.binance_apikey,
          binance_secretkey: data.binance_secretkey,
        };
        res.json({
          status: true,
          data: data,
        });
      }
    });
  } catch (error) {
    //console.log(("site data catch erro==", error);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/update_settings", (req, res) => {
  try {
    //console.log(("sitesettings====", req.body);
    settingsDB
      .updateOne(
        { _id: req.body._id },
        {
          $set: {
            siteName: req.body.siteName,
            siteLogo: req.body.sitelogo,
            Favicon: req.body.favicon,
            recaptchaSitekey: req.body.sitekey,
            recaptchaSceretkey: req.body.sceretkey,
            registerStatus: req.body.registerStatus,
            undermaintenenceStatus: req.body.undermaintenenceStatus,
            kycStatus: req.body.kycStatus,
            smtp_port: req.body.port,
            smtp_host: common.encrypt(req.body.host),
            smtp_user: common.encrypt(req.body.uname),
            smtp_pass: common.encrypt(req.body.pass),
            copy_right_text: req.body.copy_right_text,
            fb_url: req.body.fb_url,
            youtube_url: req.body.youtube_url,
            insta_url: req.body.insta_url,
            telegram_url: req.body.telegram_url,
            sendgrid_api: req.body.sendgrid_api,
            sendgrid_mail: req.body.sendgrid_mail,
            binance_apikey: req.body.binance_apikey,
            binance_secretkey: req.body.binance_secretkey,
            twitter_url: req.body.twitter_url,
          },
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Please try again later",
          });
        } else {
          settingsDB.findOne({}).exec(async function (err, settingsdata) {
            common.sitedata(settingsdata, function () { });
            if (!err && settingsdata) {
              let siteData = await RedisService.set(
                "sitesettings",
                settingsdata
              );
              if (siteData) {
                res.json({
                  status: true,
                  Message: "Site settings update successfully",
                });
              }
            }
          });
        }
      });
  } catch (error) {
    //console.log(("catch_sitesettings update====", error.message);
    return res.json({ status: false, Message: "Something went wrong" });
  }
});

/* manickam ----support category ----*/

router.get("/support_category_list", (req, res) => {
  try {
    supportcategoryDB
      .find({}, { _id: 1, category: 1, status: 1 })
      .sort({ _id: -1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          var category = [];
          for (var i = 0; i < data.length; i++) {
            var obj = {
              _id: data[i]._id,
              id: i + 1,
              category: data[i].category,
              status: data[i].status,
            };
            category.push(obj);
          }
          res.json({
            status: true,
            data: category,
          });
        }
      });
  } catch (e) {
    //console.log(("=====support_category_list catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_category_update", (req, res) => {
  try {
    if (req.body._id != "") {
      supportcategoryDB
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              category: req.body.category,
              status: parseInt(req.body.status),
              updated_at: Date.now(),
            },
          }
        )
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            res.json({
              status: true,
              Message: "Support Category Updated Successfully",
            });
          }
        });
    } else if (req.body._id == "") {
      var curr = {
        category: req.body.category,
        status: parseInt(req.body.status),
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      supportcategoryDB.create(curr, (err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Support Category Added Successfully",
          });
        }
      });
    } else {
      res.json({
        status: false,
        Message: "Something went wrong",
      });
    }
  } catch (e) {
    //console.log(("=====support_category_update catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_category_get", (req, res) => {
  try {
    supportcategoryDB
      .findOne({ _id: req.body._id }, { category: 1, status: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something went wrong",
          });
        } else {
          res.json({
            status: true,
            data: data,
          });
        }
      });
  } catch (e) {
    //console.log(("=====support_category_get catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_category_status", (req, res) => {
  try {
    supportcategoryDB
      .updateOne(
        { _id: req.body._id },
        {
          $set: {
            status: req.body.status,
            updated_at: Date.now(),
          },
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Support Category Status Updated Successfully",
            doc: data,
          });
        }
      });
  } catch (e) {
    //console.log(("=====support_category_status catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_category_delete", function (req, res) {
  try {
    supportcategoryDB.deleteOne({ _id: req.body._id }, function (err, data) {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        res.json({
          status: true,
          Message: "Support Category Deleted Successfully",
        });
      }
    });
  } catch (e) {
    //console.log(("=====support_category_delete catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_list", (req, res) => {
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
      supportlistDB
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
            $unwind: {
              path: "$userdata",
            },
          },
          {
            $sort: { created_at: 1 },
          },
          {
            $project: {
              _id: 1,
              created_at: 1,
              updated_at: 1,
              userId: 1,
              message: 1,
              image: 1,
              status: 1,
              category: 1,
              reply: 1,
              userData: "$userdata",
            },
          },
        ])
        .skip(skippage)
        .limit(perPage)
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            supportlistDB
              .find({})
              .countDocuments()
              .sort({ _id: -1 })
              .exec(function (err, count) {
                var userArray = [];
                for (let dval of data) {
                  var obj = {
                    _id: dval._id,
                    created_at: dval.created_at,
                    updated_at: dval.updated_at,
                    userId: dval.userId,
                    message: dval.message,
                    image: dval.image,
                    status: dval.status,
                    reply: dval.reply,
                    email: common.decrypt(dval.userData.email),
                    category: dval.category,
                  };
                  userArray.push(obj);
                }
                res.json({
                  status: true,
                  data: userArray,
                  count: count,
                  pages: Math.ceil(count / perPage),
                });
              });
          }
        });
    } else {
      return res.json({
        status: false,
        Message: "Please enter Pagination field",
      });
    }
  } catch (e) {
    //console.log(("=====support_list catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_view", common.tokenmiddleware, (req, res) => {
  try {
    usersDB.findOne({ _id: req.body._id }).exec((err, value) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong",
        });
      } else {
        supportlistDB
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
              $unwind: {
                path: "$userdata",
              },
            },
            {
              $match: {
                _id: ObjectId(req.body._id),
              },
            },

            {
              $project: {
                _id: 1,
                created_at: 1,
                updated_at: 1,
                userId: 1,
                category: 1,
                message: 1,
                image: 1,
                status: 1,
                reply: 1,
                userData: "$userdata",
              },
            },
          ])
          .exec((err, data) => {
            //console.log(("get support view err===", err);
            //console.log(("get support view data=====", data);
            if (err) {
              res.json({
                status: false,
                Message: "Something Went Wrong. Please Try Again later",
              });
            } else {
              var userArray = [];
              for (let dval of data) {
                var obj = {
                  _id: dval._id,
                  created_at: dval.created_at,
                  updated_at: dval.updated_at,
                  userId: dval.userId,
                  category: dval.category,
                  message: dval.message,
                  image: dval.image,
                  status: dval.status,
                  reply: dval.reply,
                  email: common.decrypt(dval.userData.email),
                };
                userArray.push(obj);
              }
              res.json({
                status: true,
                data: userArray,
              });
            }
          });
      }
    });
  } catch (e) {
    //console.log(("=====support_view catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_save", (req, res) => {
  try {
    supportlistDB
      .findOneAndUpdate(
        {
          _id: req.body._id,
        },
        {
          $set: {
            updated_at: Date.now(),
          },
          $push: {
            reply: {
              message: req.body.message,
              image: req.body.image,
              tag: req.body.tag,
              posted_at: Date.now(),
            },
          },
        },
        { new: true }
      )
      .exec((err, data) => {
        //console.log(("support data==", data);
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          usersDB
            .findOne({ _id: ObjectId(data.userId) })
            .exec((err1, userdata) => {
              if (!err1) {
                var usermail = common.decrypt(userdata.email);
                mailtempDB
                  .findOne({ key: "support" })
                  .exec(function (etemperr, etempdata) {
                    //console.log((etempdata, "etempdata");
                    if (req.body.image != null) {
                      var message =
                        "Your ticket #" +
                        data._id.toString().substring(0, 8) +
                        " was resolved, and reply for the ticket was " +
                        req.body.message +
                        ", <br> kindly check this attachment <img src=" +
                        ">";
                    } else {
                      var message =
                        "Your ticket #" +
                        data._id.toString().substring(0, 8) +
                        " was resolved, and reply for the ticket was " +
                        req.body.message +
                        "";
                    }

                    var etempdataDynamic = etempdata.body
                      .replace(/###MESSAGE###/g, message)
                      .replace(/###USERNAME###/g, userdata.username)
                      .replace(
                        /###IMAGE###/,
                        req.body.image ? req.body.image : ""
                      );
                    mail.sendMail(
                      {
                        from: {
                          name: process.env.FROM_NAME,
                          address: process.env.FROM_EMAIL,
                        },
                        to: usermail,
                        subject: etempdata.Subject,
                        html: etempdataDynamic,
                      },
                      function (mailRes) {
                        res.json({
                          status: true,
                          Message: "Admin Message Send Successfully",
                        });
                      }
                    );
                  });
              }
            });
        }
      });
  } catch (e) {
    console.log("=====support_save catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

//--------------ADD AND EDIT CURRENCY SETTINGS  -------AUTH-SIVA----------//

router.post("/currencyAddUpdate", common.isEmpty, async (req, res) => {
  try {
    if (
      req.body._id == "" ||
      req.body._id == undefined ||
      req.body._id == null ||
      req.body._id == ""
    ) {

      var deposit_status =
        req.body.depositStatus != null &&
          req.body.depositStatus != "" &&
          req.body.depositStatus != ""
          ? req.body.depositStatus
          : "Active";
      var withdraw_status =
        req.body.withdrawStatus != null &&
          req.body.withdrawStatus != "" &&
          req.body.withdrawStatus != ""
          ? req.body.withdrawStatus
          : "Active";
      //----------currency creation--------//
      var currencies = await currencyDB.find({}).countDocuments();
      var currencyCreate = {
        currencyName: req.body.name,
        currencySymbol: req.body.symbol,
        currencyType: req.body.currencyType,
        coinType: req.body.coinType,
        status: req.body.status,
        depositStatus: "Active",
        withdrawStatus: "Active",
        tradeStatus: req.body.tradeStatus,
        makerFee: req.body.makerFee,
        takerFee: req.body.takerFee,
        withdrawFee: req.body.withdrawFee,
        minWithdrawLimit: req.body.minWithdrawLimit,
        maxWithdrawLimit: req.body.maxWithdrawLimit,
        minTradeAmount: req.body.minTradeAmount,
        maxTradeAmount: req.body.maxTradeAmount,
        Withdraw24Limit: req.body.Withdraw24Limit,
        Currency_image: req.body.Currency_image,
        // contractAddress  : req.body.contractAddress,
        // coinDecimal  : req.body.coinDecimal,
        modifiedDate: req.body.modifiedDate,
        erc20token: req.body.erc20token,
        trc20token: req.body.trc20token,
        bep20token: req.body.bep20token,
        rptc20token: req.body.rptc20token,
        p2p_status: req.body.p2p_status,
        minDepositLimit: req.body.minDepositLimit,
        maxDepositLimit: req.body.maxDepositLimit,
        popularOrder: currencies + 1,
        maxSwap: req.body.maxSwap ? +req.body.maxSwap : 0,
        minSwap: req.body.minSwap ? +req.body.minSwap : 0,
        swapStatus: req.body.swapStatus ? +req.body.swapStatus : "0",
        swapFee: req.body.swapFee ? +req.body.swapFee : 0,
        swapPrice: req.body.swapPrice ? +req.body.swapPrice : 0,
        coin_price: req.body.coin_price ? +req.body.coin_price : 0,
        contractAddress_erc20: req.body.contractAddress_erc20
          ? req.body.contractAddress_erc20
          : "",
        coinDecimal_erc20: req.body.coinDecimal_erc20
          ? req.body.coinDecimal_erc20
          : "",
        contractAddress_bep20: req.body.contractAddress_bep20
          ? req.body.contractAddress_bep20
          : "",
        coinDecimal_bep20: req.body.coinDecimal_bep20
          ? req.body.coinDecimal_bep20
          : "",
        contractAddress_trc20: req.body.contractAddress_trc20
          ? req.body.contractAddress_trc20
          : "",
        coinDecimal_trc20: req.body.coinDecimal_trc20
          ? req.body.coinDecimal_trc20
          : "",
        contractAddress_rptc20: req.body.contractAddress_rptc20
          ? req.body.contractAddress_rptc20
          : "",
        coinDecimal_rptc20: req.body.coinDecimal_rptc20
          ? req.body.coinDecimal_rptc20
          : "",
        depositStatus: deposit_status,
        withdrawStatus: withdraw_status
      };
      currencyDB.create(currencyCreate, async (err, createdData) => {
        if (!err) {
          let createData = await launchPadDB
            .updateOne({ symbol: req.body.symbol }, { $set: { status: 1 } })
            .exec({});
          var userdetails = await usersDB.find({});
          for (let index = 0; index < userdetails.length; index++) {
            const element = userdetails[index];
            var updateobj = {
              $push: {
                wallets: {
                  currencyId: mongoose.Types.ObjectId(createdData._id),
                  currencyName: createdData.currencyName,
                  currencySymbol: createdData.currencySymbol,
                  amount: 0,
                },
              },
            };
            await userWalletDB.updateOne(
              { userId: mongoose.Types.ObjectId(element._id) },
              updateobj,
              { new: true }
            );
          }

          var updateadmin_wallet = {
            $push: {
              wallets: {
                currencyId: mongoose.Types.ObjectId(createdData._id),
                currencyName: createdData.currencyName,
                currencySymbol: createdData.currencySymbol,
                amount: 0,
              },
            },
          };

          await adminWalletDB.updateOne(
            { userId: "620d4f8ebf0ecf8fd8dac67a", type: 0 },
            updateadmin_wallet,
            { new: true }
          );
          await adminWalletDB.updateOne(
            { userId: "620d4f8ebf0ecf8fd8dac67a", type: 1 },
            updateadmin_wallet,
            { new: true }
          );

          BINANCEexchange.CurrencyConversion();
          tradeRedis.setRedisForLaunchpad(function (res) { });
          return res.json({
            status: true,
            Message: "Currency added successfully",
          });
        } else {
          return res.json({
            status: false,
            Message: "Canot added currency. Please Try Again later",
          });
        }
      });
    } else {
      //----------currency updation--------//
      var deposit_status =
        req.body.depositStatus != null &&
          req.body.depositStatus != "" &&
          req.body.depositStatus != ""
          ? req.body.depositStatus
          : "Active";
      var withdraw_status =
        req.body.withdrawStatus != null &&
          req.body.withdrawStatus != "" &&
          req.body.withdrawStatus != ""
          ? req.body.withdrawStatus
          : "Active";
      currencyDB
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              currencyName: req.body.name,
              currencySymbol: req.body.symbol,
              currencyType: req.body.currencyType,
              coinType: req.body.coinType,
              status: req.body.status,
              depositStatus: "Active",
              withdrawStatus: "Active",
              tradeStatus: req.body.tradeStatus,
              makerFee: req.body.makerFee,
              takerFee: req.body.takerFee,
              withdrawFee: req.body.withdrawFee,
              minWithdrawLimit: req.body.minWithdrawLimit,
              maxWithdrawLimit: req.body.maxWithdrawLimit,
              minTradeAmount: req.body.minTradeAmount,
              maxTradeAmount: req.body.maxTradeAmount,
              Withdraw24Limit: req.body.Withdraw24Limit,
              Currency_image: req.body.Currency_image,
              // contractAddress  : req.body.contractAddress,
              // coinDecimal  : req.body.coinDecimal,
              modifiedDate: req.body.modifiedDate,
              erc20token: req.body.erc20token,
              trc20token: req.body.trc20token,
              bep20token: req.body.bep20token,
              rptc20token: req.body.rptc20token,
              p2p_status: req.body.p2p_status,
              minDepositLimit: req.body.minDepositLimit,
              maxDepositLimit: req.body.maxDepositLimit,
              maxSwap: req.body.maxSwap ? +req.body.maxSwap : 0,
              minSwap: req.body.minSwap ? +req.body.minSwap : 0,
              swapStatus: req.body.swapStatus ? +req.body.swapStatus : "0",
              swapFee: req.body.swapFee ? +req.body.swapFee : 0,
              swapPrice: req.body.swapPrice ? +req.body.swapPrice : 0,
              coin_price: req.body.coin_price ? +req.body.coin_price : 0,
              contractAddress_erc20: req.body.contractAddress_erc20
                ? req.body.contractAddress_erc20
                : "",
              coinDecimal_erc20: req.body.coinDecimal_erc20
                ? req.body.coinDecimal_erc20
                : "",
              contractAddress_bep20: req.body.contractAddress_bep20
                ? req.body.contractAddress_bep20
                : "",
              coinDecimal_bep20: req.body.coinDecimal_bep20
                ? req.body.coinDecimal_bep20
                : "",
              contractAddress_trc20: req.body.contractAddress_trc20
                ? req.body.contractAddress_trc20
                : "",
              coinDecimal_trc20: req.body.coinDecimal_trc20
                ? req.body.coinDecimal_trc20
                : "",
              contractAddress_rptc20: req.body.contractAddress_rptc20
                ? req.body.contractAddress_rptc20
                : "",
              coinDecimal_rptc20: req.body.coinDecimal_rptc20
                ? req.body.coinDecimal_rptc20
                : "",
              depositStatus: deposit_status,
              withdrawStatus: withdraw_status
            },
          }
        )
        .exec((updateError, updatedData) => {
          if (!updateError) {
            if (req.body.currencySymbol == "ETH") {
              currencyDB.findOne(
                { currencySymbol: "ETH" },
                { block: 1, contractAddress: 1 },
                async function (err, resData) {
                  if (resData !== null) {
                    var response = await JSON.stringify(resData);
                    await client.set("Currency", response);
                  }
                }
              );
            }
            BINANCEexchange.CurrencyConversion();
            return res.json({
              status: true,
              Message: "Currency updated successfully",
            });
          } else {
            return res.json({
              status: false,
              Message: "Canot updated currency. Please Try Again later",
            });
          }
        });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

//--------------ALL CRYPTO CURRENCY SETTINGS  -------AUTH-SIVA----------//

router.post("/allCurrencyListCrypto", (req, res) => {
  try {
    var perPage = Number(req.body.pageSize ? req.body.pageSize : 0);
    var page = Number(req.body.currentPage ? req.body.currentPage : 0);
    page = parseInt(page) + parseInt(1);
    var skippage = perPage * page - perPage;
    if (
      typeof perPage !== "undefined" &&
      perPage !== "" &&
      perPage > 0 &&
      typeof page !== "undefined" &&
      page !== "" &&
      page > 0
    ) {
      currencyDB
        .find({ coinType: "1" })
        .skip(skippage)
        .limit(perPage)
        .exec((err, currencyData) => {
          currencyDB
            .find({ coinType: "1" })
            .countDocuments()
            .exec(function (err1, count) {
              if (!err) {
                const data = [];
                for (var i = 0; i < currencyData.length; i++) {
                  var date = currencyData[i].modifiedDate;
                  var obj = {
                    _id: currencyData[i]._id,
                    id: i + 1,
                    name: currencyData[i].currencyName,
                    symbol: currencyData[i].currencySymbol,
                    Currency_image: currencyData[i].Currency_image,
                    status: currencyData[i].status,
                    date: moment(date).format("lll"),
                    currencyType: currencyData[i].currencyType,
                  };
                  data.push(obj);
                }
                BINANCEexchange.CurrencyConversion();
                var returnjson = {
                  data: data,
                  Message: "Currency updated successfully",
                  status: true,
                  count: count,
                  pages: Math.ceil(count / perPage),
                };
                return res.json(returnjson);
              } else {
                return res.json({
                  status: false,
                  data: {},
                  Message: "Something Went Wrong. Please Try Again later",
                });
              }
            });
        });
    } else {
      return res.json({
        status: false,
        Message: "Please enter Pagination field",
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});
//--------------VIEW EDIT CURRENCY SETTINGS  -------AUTH-SIVA----------//

router.post("/viewOneCurrency", common.isEmpty, (req, res) => {
  try {
    currencyDB.findOne({ _id: req.body._id }).exec((err, data) => {
      if (!err) {
        return res.json({ status: true, Message: data });
      } else {
        return res.json({ status: false, Message: {} });
      }
    });
  } catch (error) {
    return res.json({
      status: false,
      data: {},
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

//--------------ALL FIAT CURRENCY SETTINGS  -------AUTH-SIVA----------//

router.get("/allCurrencyListFiat", (req, res) => {
  try {
    currencyDB.find({ coinType: "2" }).exec((err, currencyData) => {
      //console.log((currencyData, "currencyData-0-0-0currencyData");
      if (!err) {
        const data = [];
        for (var i = 0; i < currencyData.length; i++) {
          var date = currencyData[i].modifiedDate;
          var obj = {
            _id: currencyData[i]._id,
            id: i + 1,
            name: currencyData[i].currencyName,
            symbol: currencyData[i].currencySymbol,
            Currency_image: currencyData[i].Currency_image,
            status: currencyData[i].status,
            date: moment(date).format("lll"),
          };
          data.push(obj);
        }
        return res.json({
          status: true,
          data: data,
          Message: "Currency updated successfully",
        });
      } else {
        return res.json({
          status: false,
          data: {},
          Message: "Something Went Wrong. Please Try Again later",
        });
      }
    });
  } catch (error) { }
});

/* manickam language settings */

router.post("/get_language", (req, res) => {
  try {
    languageDB.find().exec((err, data) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        langdata = [];
        for (var i = 0; i < data.length; i++) {
          var date = data[i].updated_at;
          var obj = {
            _id: data[i]._id,
            id: i + 1,
            name: data[i].name,
            status: data[i].status,
            date: moment(date).format("lll"),
          };
          langdata.push(obj);
        }
        res.json({
          status: true,
          data: langdata,
        });
      }
    });
  } catch (e) {
    //console.log(("===========get_language catch========", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/language_get", (req, res) => {
  try {
    languageDB
      .findOne({ _id: req.body._id }, { _id: 1, name: 1, symbol: 1, status: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something went wrong",
          });
        } else {
          res.json({
            status: true,
            data: data,
          });
        }
      });
  } catch (e) {
    //console.log(("=====language_get catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/lang_status", (req, res) => {
  try {
    languageDB
      .updateOne(
        { _id: req.body._id },
        { $set: { status: req.body.status, updated_at: Date.now() } }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Language Status Updated Successfully",
          });
        }
      });
  } catch (e) {
    //console.log(("===========lang_status catch========", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/language_update", (req, res) => {
  try {
    if (req.body._id != "") {
      languageDB
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              name: req.body.name,
              symbol: req.body.symbol,
              status: parseInt(req.body.status),
              updated_at: Date.now(),
            },
          }
        )
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            res.json({
              status: true,
              Message: "Language Updated Successfully",
            });
          }
        });
    } else if (req.body._id == "") {
      var curr = {
        name: req.body.name,
        symbol: req.body.symbol,
        status: parseInt(req.body.status),
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      languageDB.create(curr, (err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Language Added Successfully",
          });
        }
      });
    } else {
      res.json({
        status: false,
        Message: "Something went wrong",
      });
    }
  } catch (e) {
    //console.log(("=====language_update catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

/*-------manickam cms settings-------------*/

router.get("/cms_list", async (req, res) => {
  try {
    cmsDB.find({}, { _id: 1, heading: 1, status: 1 }).exec((err, data) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        var cmsdata = [];
        for (var i = 0; i < data.length; i++) {
          var obj = {
            _id: data[i]._id,
            id: i + 1,
            heading: data[i].heading,
            status: data[i].status,
          };
          cmsdata.push(obj);
        }
        res.json({
          status: true,
          data: cmsdata,
        });
      }
    });
  } catch (e) {
    console.log("======cms_list catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/cms_get", (req, res) => {
  try {
    cmsDB
      .findOne(
        { _id: req.body._id },
        {
          heading: 1,
          _id: 1,
          link: 1,
          title: 1,
          status: 1,
          meta_keyword: 1,
          meta_description: 1,
          content_description: 1,
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something went wrong",
          });
        } else {
          res.json({
            status: true,
            data: data,
          });
        }
      });
  } catch (e) {
    console.log("======cms_get catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/cms_update", (req, res) => {
  try {
    cmsDB.find({ heading: req.body.heading }).exec(function (err, data) {
      if (err) {
        res.json({
          status: false,
          Message: "Must fill give Heading.",
        });
      } else {
        if (data.length > 1) {
          res.json({
            status: false,
            Message: "Heading already exists.",
          });
        } else {
          var iid = data.filter(function (data) {
            return data.id == req.body._id;
          });
          if (iid) {
            cmsDB
              .updateOne(
                { _id: req.body._id },
                {
                  $set: {
                    heading: req.body.heading,
                    title: req.body.title,
                    link: req.body.link,
                    meta_keyword: req.body.meta_keyword,
                    content_description: req.body.content_description,
                    meta_description: req.body.meta_description,
                    updated_at: Date.now(),
                    status: req.body.status,
                  },
                }
              )
              .exec((err, data1) => {
                if (err) {
                  res.json({
                    status: false,
                    Message: "Something Went Wrong. Please Try Again later",
                  });
                } else {
                  res.json({
                    status: true,
                    Message: "CMS Updated Successfully",
                  });
                }
              });
          } else {
            res.json({
              status: false,
              Message: "Heading already exists.",
            });
          }
        }
      }
    });
  } catch (e) {
    console.log("======cms_update catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/cms_status", (req, res) => {
  try {
    cmsDB
      .updateOne(
        { _id: req.body._id },
        {
          $set: {
            status: req.body.status,
            updated_at: Date.now(),
          },
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "CMS Status Updated Successfully",
            doc: data,
          });
        }
      });
  } catch (e) {
    console.log("======cms_status catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

/* manickam mail template */

router.get("/mailtemplate_list", (req, res) => {
  try {
    mailtempDB
      .find({}, { _id: 1, Subject: 1, status: 1, modifiedDate: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          maildata = [];
          for (var i = 0; i < data.length; i++) {
            var date = data[i].modifiedDate;
            var status = data[i].status;
            if (status == "1") {
              var view_status = status;
            } else {
              var view_status = status;
            }
            var obj = {
              _id: data[i]._id,
              id: i + 1,
              title: data[i].Subject,
              status: view_status,
              date: moment(date).format("lll"),
            };
            maildata.push(obj);
          }
          res.json({
            status: true,
            data: maildata,
          });
        }
      });
  } catch (e) {
    //console.log(("=====mailtemplate_list catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/mailtemplate_update", (req, res) => {
  try {
    //console.log((req.body, "req.bodyreq.bodyreq.body");
    mailtempDB.find({ _id: req.body._id }).exec((err, data) => {
      if (err) {
        res.json({
          success: false,
          Message: "Record not found",
        });
      } else {
        mailtempDB
          .updateOne(
            { _id: req.body._id },
            {
              $set: {
                status: req.body.status,
                Subject: req.body.Subject,
                body: req.body.message,
                modifiedDate: Date.now(),
              },
            }
          )
          .exec((err, data) => {
            //console.log((err, data, "err, dataerr, dataerr, data");
            if (err) {
              res.json({
                success: false,
                Message: "Something went wrong, Please try again later",
              });
            } else {
              res.json({
                status: true,
                Message: "Mail Template is Successfully Updated",
              });
            }
          });
      }
    });
  } catch (e) {
    //console.log(("=====mailtemplate_update catch=======", e.message);
    res.json({
      success: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/mailtemplate_status", (req, res) => {
  try {
    mailtempDB
      .findByIdAndUpdate(
        { _id: req.body._id },
        { $set: { status: req.body.status, modifiedDate: Date.now() } }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            success: false,
            Message: "Something went wrong, Please try again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Mail template status updated successfully",
          });
        }
      });
  } catch (e) {
    //console.log(("=====mailtemplate_status catch=======", e.message);
    res.json({
      success: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/mailtemplate_get", (req, res) => {
  try {
    mailtempDB
      .findOne({ _id: req.body._id }, { _id: 1, Subject: 1, body: 1, status: 1 })
      .exec((err, resData) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong",
          });
        } else {
          res.json({
            status: true,
            data: resData,
          });
        }
      });
  } catch (e) {
    //console.log(("=====mailtemplate_get catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong",
    });
  }
});

/*manickam header part*/

router.get("/admindetails", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    adminDB
      .findOne({ _id: userId }, { userName: 1, tfa_status: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            data: data,
          });
        }
      });
  } catch (e) {
    //console.log(("====admin details catch====", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/sitedata", (req, res) => {
  try {
    settingsDB.findOne({}, { siteName: 1, siteLogo: 1 }).exec((err, data) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        var obj = {
          siteName: data.siteName,
          siteLogo: data.siteLogo,
        };
        res.json({
          status: true,
          data: obj,
        });
      }
    });
  } catch (e) {
    //console.log(("====get site data catch====", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});
// get home content
router.get("/homecomponent", (req, res) => {
  try {
    homecontentDB.find().exec((err, data) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something went wrong",
        });
      } else {
        res.json({
          status: true,
          Message: data,
        });
      }
    });
  } catch (e) {
    //console.log(("====get homecontent catch====", e.message);
    res.json({
      status: false,
      Message: "Something went wrong",
    });
  }
});
// upate home content
router.post("/homecomponent/update", (req, res) => {
  try {
    if (req.body._id != "") {
      homecontentDB
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              bannercontent1_title: req.body.bannercontent1_title,
              bannercontent1_desc: req.body.bannercontent1_desc,
              bannercontent2_title: req.body.bannercontent2_title,
              bannercontent2_desc: req.body.bannercontent2_desc,
              bannercontent3_title: req.body.bannercontent3_title,
              bannercontent3_desc: req.body.bannercontent3_desc,
              url1: req.body.url1,
              url2: req.body.url2,
              url3: req.body.url3,
              featuretitle1: req.body.featuretitle1,
              featuretitlec1: req.body.featuretitlec1,
              iconurl1: req.body.iconurl1,

              featuretitle2: req.body.featuretitle2,
              featuretitlec2: req.body.featuretitlec2,
              iconurl2: req.body.iconurl2,

              featuretitle3: req.body.featuretitle3,
              featuretitlec3: req.body.featuretitlec3,
              iconurl3: req.body.iconurl3,

              footertitle1: req.body.footertitle1,
              footertitlec1: req.body.footertitlec1,
              modifiedDate: Date.now(),
            },
          }
        )
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            homecontentDB
              .findOne({ _id: req.body._id })
              .exec(async function (err, homedata) {
                //console.log(("homedata======", homedata);
                if (!err && homedata) {
                  let homeData = await RedisService.set("cms_home", homedata);
                  if (homeData) {
                    res.json({
                      status: true,
                      Message: "Updated Successfully",
                    });
                  }
                }
              });
          }
        });
    } else if (req.body._id == "") {
      var curr = {
        bannercontent1_title: req.body.bannercontent1_title,
        bannercontent1_desc: req.body.bannercontent1_desc,
        bannercontent2_title: req.body.bannercontent2_title,
        bannercontent2_desc: req.body.bannercontent2_desc,
        bannercontent3_title: req.body.bannercontent3_title,
        bannercontent3_desc: req.body.bannercontent3_desc,
        url1: req.body.url1,
        url2: req.body.url2,
        url3: req.body.url3,
        featuretitle1: req.body.featuretitle1,
        featuretitlec1: req.body.featuretitlec1,
        iconurl1: req.body.iconurl1,

        featuretitle2: req.body.featuretitle2,
        featuretitlec2: req.body.featuretitlec2,
        iconurl2: req.body.iconurl2,

        featuretitle3: req.body.featuretitle3,
        featuretitlec3: req.body.featuretitlec3,
        iconurl3: req.body.iconurl3,

        footertitle1: req.body.footertitle1,
        footertitlec1: req.body.footertitlec1,
        createdDate: Date.now(),
        modifiedDate: Date.now(),
      };
      homecontentDB.create(curr, async (err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          if (data) {
            let homeData = await RedisService.set("cms_home", homedata);
            if (homeData) {
              res.json({
                status: true,
                Message: "Added Successfully",
              });
            }
          }
        }
      });
    } else {
      res.json({
        status: false,
        Message: "Something went wrong",
      });
    }
  } catch (e) {
    //console.log(("====update homecontent catch====", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});
/*-----------ADMIN LOGIN HISTORY------------AUTH---SIVA-------------*/

/*----------------ADMIN LOGIN HISTORY ------------------*/
router.get("/adminlogg", (req, res) => {
  adminloginhistoryDB
    .find({}, { ipAddress: 1, browser: 1, createdDate: 1 })
    .sort({ _id: -1 })
    .exec((err, data) => {
      if (data) {
        res.json({ status: true, Message: data });
      } else {
        res.json({ status: false, Message: "Something went wrong" });
      }
    });
});

// get about us content
router.get("/get_aboutus", (req, res) => {
  try {
    aboutusDB.find().exec((err, data) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something went wrong",
        });
      } else {
        res.json({
          status: true,
          Message: data,
        });
      }
    });
  } catch (e) {
    //console.log(("====get about us catch====", e.message);
    res.json({
      status: false,
      Message: "Something went wrong",
    });
  }
});
// upate update us content
router.post("/aboutus/update", (req, res) => {
  try {
    if (req.body._id != "") {
      aboutusDB
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              section1_title: req.body.section1_title,
              section1_desc: req.body.section1_desc,
              section2_title: req.body.section2_title,
              section2_desc: req.body.section2_desc,
              section3_title: req.body.section3_title,
              section3_desc: req.body.section3_desc,
              url1: req.body.url1,
              url2: req.body.url2,
              video_link: req.body.video_link,
              modifiedDate: Date.now(),
            },
          }
        )
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            aboutusDB
              .findOne({ _id: req.body._id })
              .exec(async function (err, aboutdata) {
                //console.log(("aboutdata======", aboutdata);
                if (!err && aboutdata) {
                  let about = await RedisService.set("cms_about", aboutdata);
                  if (about) {
                    res.json({
                      status: true,
                      Message: "Updated Successfully",
                    });
                  }
                }
              });
          }
        });
    } else if (req.body._id == "") {
      var curr = {
        section1_title: req.body.section1_title,
        section1_desc: req.body.section1_desc,
        section2_title: req.body.section2_title,
        section2_desc: req.body.section2_desc,
        section3_title: req.body.section3_title,
        section3_desc: req.body.section3_desc,
        url1: req.body.url1,
        url2: req.body.url2,
        video_link: req.body.video_link,
        createdDate: Date.now(),
        modifiedDate: Date.now(),
      };
      aboutusDB.create(curr, async (err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          if (data) {
            let aboutData = await RedisService.set("cms_about", data);
            if (aboutData) {
              res.json({
                status: true,
                Message: "Added Successfully",
              });
            }
          }
        }
      });
    } else {
      res.json({
        status: false,
        Message: "Something went wrong",
      });
    }
  } catch (e) {
    //console.log(("====update aboutus catch====", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

// get all trade pairs
router.get("/tradepair/view", common.tokenmiddleware, (req, res) => {
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
          var obj = {
            _id: data[i]._id,
            id: i + 1,
            pair: data[i].pair,
            status: data[i].status,
            marketPrice: data[i].marketPrice,
            min_trade_amount: data[i].min_trade_amount,
            makerFee: data[i].makerFee,
            takerFee: data[i].takerFee,
            liquidity_status: data[i].liquidity_status,
            buyspread: data[i].buyspread,
            sellspread: data[i].sellspread,
            from_symbol: data[i].from_symbol,
            to_symbol: data[i].to_symbol,
            value_24h: data[i].value_24h,
            volume_24h: data[i].volume_24h,
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

// get all trade pairse
router.post("/tradepair/view", common.tokenmiddleware, (req, res) => {
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

      tradePairDB
        .find()
        .skip(skippage)
        .limit(perPage)
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            tradePairDB
              .find()
              .countDocuments()
              .exec(function (err, count) {
                resdata = [];
                for (var i = 0; i < data.length; i++) {
                  var obj = {
                    _id: data[i]._id,
                    id: i + 1,
                    pair: data[i].pair,
                    status: data[i].status,
                    marketPrice: data[i].marketPrice,
                    min_trade_amount: data[i].min_trade_amount,
                    makerFee: data[i].makerFee,
                    takerFee: data[i].takerFee,
                    liquidity_status: data[i].liquidity_status,
                    buyspread: data[i].buyspread,
                    sellspread: data[i].sellspread,
                    from_symbol: data[i].from_symbol,
                    to_symbol: data[i].to_symbol,
                    value_24h: data[i].value_24h,
                    volume_24h: data[i].volume_24h,
                  };
                  resdata.push(obj);
                }
                res.json({
                  status: true,
                  data: resdata,
                  count: count,
                  pages: Math.ceil(count / perPage),
                });
              });
          }
        });
    } else {
      return res.json({ status: false, Message: "Invalid pagination request" });
    }
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

// get currency for trade pair
router.get("/tradepair/currency", (req, res) => {
  try {
    currencyDB
      .find({ status: "Active" }, { _id: 1, currencySymbol: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          BINANCEexchange.CurrencyConversion();
          var element = [];
          for (let i = 0; i < data.length; i++) {
            element.push(data[i]._id + "_" + data[i].currencySymbol);
          }
          res.json({
            status: true,
            data: element,
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

// get pair for edit
router.post(
  "/tradepair/getTradepairOne",
  common.tokenmiddleware,
  (req, res) => {
    try {
      tradePairDB.findOne({ _id: req.body._id }).exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something went wrong",
          });
        } else {
          BINANCEexchange.CurrencyConversion();
          res.json({
            status: true,
            data: data,
          });
        }
      });
    } catch (e) {
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

// create trade pair
const activeorder = require("../tradeRedis/activeOrderRedis");
const binanceexchange = require("../exchanges/binance");
router.post("/addTradePair", async (req, res) => {
  try {
    if (!req.body._id) {
      if (req.body.to_symbol == req.body.from_symbol) {
        res.json({
          status: false,
          Message: "Same Currency should not be add",
        });
      } else {
        BINANCEexchange.CurrencyConversion();
        if (
          req.body.to_symbol_id == "" &&
          req.body.from_symbol_id == "" &&
          req.body.to_symbol == "" &&
          req.body.from_symbol == "" &&
          req.body.pair == "" &&
          req.body.highest_24h == "" &&
          req.body.lowest_24h == "" &&
          req.body.changes_24h == "" &&
          req.body.volume_24h == "" &&
          req.body.value_24h == "" &&
          req.body.min_trade_amount == "" &&
          req.body.marketPrice == "" &&
          req.body.status == "" &&
          req.body.liquidity_status == "" &&
          req.body.liquidity_available == "" &&
          req.body.liquidity_name == "" &&
          req.body.price_decimal == "" &&
          req.body.amount_decimal == "" &&
          req.body.makerFee == "" &&
          req.body.takerFee == "" &&
          req.body.buyspread == "" &&
          req.body.sellspread == ""
        ) {
          res.json({
            status: false,
            Message: "Please fill all required fields",
          });
        } else {
          var tradepairdet = await tradePairDB.findOne({
            pair: req.body.from_symbol + "_" + req.body.to_symbol,
          });
          if (tradepairdet !== null) {
            res.json({
              status: false,
              Message: "Pair Already Added",
            });
          } else {
            var curr = {
              to_symbol_id: req.body.to_symbol_id,
              from_symbol_id: req.body.from_symbol_id,
              to_symbol: req.body.to_symbol,
              from_symbol: req.body.from_symbol,
              pair: req.body.pair,
              trade_price: req.body.trade_price,
              highest_24h: req.body.highest_24h,
              lowest_24h: req.body.lowest_24h,
              changes_24h: req.body.changes_24h,
              volume_24h: req.body.volume_24h,
              value_24h: req.body.value_24h,
              min_trade_amount: req.body.min_trade_amount,
              marketPrice: req.body.marketPrice,
              status: req.body.status,
              liquidity_status: req.body.liquidity_status,
              liquidity_available: req.body.liquidity_available,
              liquidity_name: req.body.liquidity_name,
              price_decimal: req.body.price_decimal,
              amount_decimal: req.body.amount_decimal,
              makerFee: req.body.makerFee,
              takerFee: req.body.takerFee,
              buyspread: req.body.buyspread,
              sellspread: req.body.sellspread,
              min_qty: req.body.min_qty,
              max_qty: req.body.max_qty,
              min_price: req.body.min_price,
              max_price: req.body.max_price,
              min_total: req.body.min_total,
              liq_price_decimal: req.body.liq_price_decimal,
              liq_amount_decimal: req.body.liq_amount_decimal,
              createdDate: Date.now(),
              modifiedDate: Date.now(),
            };
            tradePairDB.create(curr, async (err, data) => {
              if (err) {
                res.json({
                  status: false,
                  Message: "Something Went Wrong. Please Try Again later",
                });
              } else {
                redisCache.updateRedisPairs(function (pair_update) { });
                // redisCache.setRedisPairs(function(pair_update){});
                activeorder.activeOrdersSet(function (pair_update) { });
                await binanceexchange.setTradepairRedis(data);
                await binanceexchange.orderpicker(data);
                res.json({
                  status: true,
                  Message: "Trade pair Added Successfully",
                  data: data,
                });
              }
            });
          }
        }
      }
    } else {
      BINANCEexchange.CurrencyConversion();
      tradePairDB
        .findOneAndUpdate(
          { _id: req.body._id },
          {
            $set: {
              to_symbol_id: req.body.to_symbol_id,
              from_symbol_id: req.body.from_symbol_id,
              to_symbol: req.body.to_symbol,
              from_symbol: req.body.from_symbol,
              pair: req.body.pair,
              trade_price: req.body.trade_price,
              highest_24h: req.body.highest_24h,
              lowest_24h: req.body.lowest_24h,
              changes_24h: req.body.changes_24h,
              volume_24h: req.body.volume_24h,
              value_24h: req.body.value_24h,
              min_trade_amount: req.body.min_trade_amount,
              marketPrice: req.body.marketPrice,
              status: req.body.status,
              liquidity_status: req.body.liquidity_status,
              liquidity_available: req.body.liquidity_available,
              liquidity_name: req.body.liquidity_name,
              price_decimal: req.body.price_decimal,
              amount_decimal: req.body.amount_decimal,
              makerFee: req.body.makerFee,
              takerFee: req.body.takerFee,
              buyspread: req.body.buyspread,
              sellspread: req.body.sellspread,
              min_qty: req.body.min_qty,
              max_qty: req.body.max_qty,
              min_price: req.body.min_price,
              max_price: req.body.max_price,
              min_total: req.body.min_total,
              liq_price_decimal: req.body.liq_price_decimal,
              liq_amount_decimal: req.body.liq_amount_decimal,
              modifiedDate: Date.now(),
            },
          },
          { new: true }
        )
        .exec(async (err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            redisCache.updateRedisPairs(function (pair_update) { });
            // redisCache.setRedisPairs(function(pair_update){});
            activeorder.activeOrdersSet(function (pair_update) { });
            await binanceexchange.setTradepairRedis(data);
            await binanceexchange.tickerPrice(data);

            res.json({
              status: true,
              Message: "Trade pair Updated Successfully",
              data: data,
            });
          }
        });
    }
  } catch (e) {
    res.status(401).send("unauthorized");
  }
});

router.post("/tradepair/changestatus", (req, res) => {
  try {
    tradePairDB
      .updateOne(
        { _id: req.body._id },
        {
          $set: {
            status: req.body.status,
            modifiedDate: Date.now(),
          },
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          redisCache.setRedisPairs(function (pair_update) { });
          res.json({
            status: true,
            Message: "Trade Pair Status Changed Successfully",
            doc: data,
          });
          BINANCEexchange.CurrencyConversion();
        }
      });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/tradepair/changeliqstatus", (req, res) => {
  try {
    tradePairDB
      .updateOne(
        { _id: req.body._id },
        {
          $set: {
            liquidity_status: req.body.status,
            modifiedDate: Date.now(),
          },
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Trade Pair Liquidity Status Changed Successfully",
            doc: data,
          });
          socketconnect.emit("liquistatus", userDatas);

          redisCache.setRedisPairs(function (pair_update) { });
          BINANCEexchange.CurrencyConversion();
        }
      });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/tradepair/deletetradepair", function (req, res) {
  try {
    tradePairDB.deleteOne({ _id: req.body._id }, function (err, data) {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        res.json({
          status: true,
          Message: "Trade Pair Deleted Successfully",
        });

        redisCache.setRedisPairs(function (pair_update) { });
      }
    });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/tradepair/checkPair", function (req, res) {
  try {
    tradePairDB
      .find({
        $or: [{ pairs: req.body.currency1 }, { pairs: req.body.currency2 }],
      })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: data,
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

// get activated user list
router.post("/activatedUserList", async (req, res) => {
  try {
    var perPage = Number(req.body.pageSize ? req.body.pageSize : 0);
    var page = Number(req.body.currentPage ? req.body.currentPage : 0);
    page = parseInt(page) + parseInt(1);
    var skippage = perPage * page - perPage;
    if (
      typeof perPage !== "undefined" &&
      perPage !== "" &&
      perPage > 0 &&
      typeof page !== "undefined" &&
      page !== "" &&
      page > 0
    ) {
      var options = {
        offset: skippage,
        limit: perPage,
        sort: { _id: -1 },
        projection: {
          username: 1,
          _id: 1,
          email: 1,
          verifyEmail: 1,
          status: 1,
          createdDate: 1,
          tfastatus: 1,
          kycstatus: 1,
          mobileNumber: 1,
        },
      };
      var userdetail = await usersDB.paginate({ status: 1 }, options);
      // usersDB.paginate({status:1},{username:1,_id:1,email:1,verifyEmail:1,status:1,createdDate:1,tfastatus:1,kycstatus:1,mobileNumber:1},{offset: skippage, limit: perPage, sort: { createdAt: -1 } }).exec((err, data) => {
      if (!userdetail) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        userArray = [];
        for (let dval of userdetail.docs) {
          var obj = {
            _id: dval._id,
            username: dval.username,
            email:
              dval.email != null
                ? common.decrypt(dval.email)
                : dval.mobileNumber,
            status: dval.status,
            datetime: dval.createdDate,
            tfa_status: dval.tfastatus,
            kyc_status: dval.kycstatus,
          };
          userArray.push(obj);
        }
        res.json({
          status: true,
          data: userArray,
          counts: userdetail.totalDocs,
        });
      }
      // })
    } else {
      res
        .status(400)
        .send({ status: false, Message: "Invalid pagination request" });
    }
  } catch (e) {
    //console.log((e, "-=-=-error-=-=-");
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

// change user account status
router.post("/changeUserAccountStatus", common.tokenmiddleware, (req, res) => {
  try {
    var update_status = req.body.status;
    if (update_status == 0) {
      update_status = 1;
    } else if (update_status == 1) {
      update_status = 0;
    }

    usersDB
      .findOneAndUpdate(
        { _id: req.body._id },
        {
          $set: {
            loginStatus: update_status,
            modifiedDate: Date.now(),
          },
        },
        { new: true }
      )
      .exec((err, data) => {
        //console.log(("update user data===", data);
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          if (data.status == 0) {
            common.socket_account(
              "account_deactivate",
              data._id,
              function () { }
            );
          }
          res.json({
            status: true,
            Message: "User Account Status Updated Successfully",
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

// get unverified users list

router.get("/unverifiedUserList", (req, res) => {
  try {
    usersDB
      .find({ status: 0 })
      .sort({ _id: -1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          var userArray = [];
          for (let dval of data) {
            var obj = {
              _id: dval._id,
              email:
                dval.email != null
                  ? common.decrypt(dval.email)
                  : dval.mobileNumber,
              status: dval.status,
              datetime: dval.createdDate,
              tfa_status: 0,
              kyc_status: 0,
            };
            userArray.push(obj);
          }
          res.json({
            status: true,
            data: userArray,
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

router.post("/userbalance", (req, res) => {
  var userid = req.body.userId;
  userWalletDB
    .aggregate([
      { $unwind: "$wallets" },
      {
        $lookup: {
          from: "currency",
          localField: "wallets.currencyId",
          foreignField: "_id",
          as: "currency",
        },
      },
      {
        $match: { userId: mongoose.Types.ObjectId(userid) },
      },
      {
        $project: {
          currencyname: "$currency.currencySymbol",
          balance: "$wallets.amount",
          image: "$currency.Currency_image",
        },
      },
    ])
    .exec((err, data) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        var balancedata = [];
        for (var i = 0; i < data.length; i++) {
          if (data[i].image.length != 0) {
            var obj = {
              currencyname: data[i].currencyname,
              balance: parseFloat(data[i].balance).toFixed(8),
              image: data[i].image,
            };
            balancedata.push(obj);
          }
        }
        res.json({
          status: true,
          Message: balancedata,
        });
      }
    });
});

router.post("/useraddress", (req, res) => {
  var userid = req.body.userId;

  cryptoAddressDB
    .aggregate([
      {
        $match: { user_id: mongoose.Types.ObjectId(userid) },
      },
      {
        $lookup: {
          from: "currency",
          localField: "currency",
          foreignField: "_id",
          as: "currency",
        },
      },
      { $unwind: "$currency" },
      {
        $project: {
          currencyname: "$currency.currencySymbol",
          address: 1,
          image: "$currency.Currency_image",
        },
      },
    ])
    .exec((err, data) => {
      console.log("addres data", data);
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        var eth_wallets = [];
        //console.log((data.length, "data.length");
        for (var j = 0; j < data.length; j++) {
          if (data[j].currencyname == "ETH") {
            var obj = {
              address: data[j].address,
              image: data[j].image,
              currency: data[j].currencyname,
            };
            eth_wallets.push(obj);
          }
        }
        res.json({
          status: true,
          Message: data,
          eth_wallets: eth_wallets,
        });
      }
    });
});

//-----------------ADMIN WALLET LOGIN ----------------//
router.post("/wallet_login", common.isEmpty, (req, res) => {
  try {
    var password_encrypt = common.encrypt(req.body.password);
    adminDB
      .findOne({ wallet_password: password_encrypt }, {})
      .exec((err, admin_data) => {
        if (!err) {
          if (admin_data) {
            var source = req.headers["user-agent"],
              ua = useragent.parse(source);
            let ip_address =
              req.header("x-forwarded-for") || req.connection.remoteAddress;
            ip_address = ip_address.replace("::ffff:", "");
            var obj = {
              ipAddress: ip_address,
              browser: ua.browser,
              OS: ua.os,
              platform: ua.platform,
              useremail: common.decrypt(admin_data.email),
            };
            adminloginhistoryDB.create(obj, (his_err, historyData) => {
              if (!his_err) {
                const payload = {
                  _id: admin_data._id,
                };
                var token = jwt.sign(payload, jwt_secret, {
                  expiresIn: 300 * 60,
                });
                res.json({
                  status: true,
                  Message: "Login Successful",
                  token: token,
                  data: obj,
                });
              } else {
                res.json({
                  status: false,
                  Message: "Something went wrong,Please try again later",
                });
              }
            });
          } else {
            res.json({
              status: false,
              Message: "Password Incorrect. Please enter a valid password.",
            });
          }
        } else {
          res.json({
            status: false,
            Message: "Something went wrong,Please try again later",
          });
        }
      });
  } catch (error) {
    res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

router.get("/wallet_list", async (req, res) => {
  try {
    // var data="0x99deb1e50638332ffcd3e5ddf3e3f9ff0598f494fc038bfb3b9c03b87e36d56b"
    // //console.log(("=-=-=-=-=-encrytpooo=-=-=encrytpooo===",common.encryptionLevel(data));
    // var data1=common.encryptionLevel(data)
    // //console.log(("=-=-=-=-=-encrytpooo=-=-=encrytpooo===",common.decryptionLevel(data1));

    adminWalletDB
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
            erc20token: { $arrayElemAt: ["$currdetail.erc20token", 0] },
            trc20token: { $arrayElemAt: ["$currdetail.trc20token", 0] },
            bep20token: { $arrayElemAt: ["$currdetail.bep20token", 0] },
            currencyBalance: "$wallets.amount",
            currencyAddress: "$wallets.address",
            currid: { $arrayElemAt: ["$currdetail._id", 0] },
          },
        },
      ])
      .exec(async (err, resData) => {
        //console.log((resData, "oioii009090909090");
        if (err) {
          return res.json({ status: false, Message: err, code: 200 });
        } else {
          var dataPush = [];
          let currency = await currencyDB
            .find({ depositStatus: "Active", coinType: 1 })
            .sort({ popularOrder: 1 });
          if (currency) {
            for (var i = 0; i < currency.length; i++) {
              for (var j = 0; j < resData.length; j++) {
                if (currency[i].currencySymbol == resData[j].currencysymbol) {
                  dataPush.push(resData[j]);
                }
              }
            }
          }
          return res.json({ status: true, data: dataPush, code: 200 });
        }
      });
  } catch (error) {
    //console.log(("wallet list catch=====", error.message);
    return res.json({ status: false, Message: "Internal server", code: 500 });
  }
});

router.post("/updateTfa", common.tokenmiddleware, (req, res) => {
  try {
    let info = req.body;
    let status;
    let usermail;
    adminDB
      .findOne({ _id: req.userId }, { _id: 0 })
      .exec(function (userErr, adminRes) {
        var verified = speakeasy.totp.verify({
          secret: adminRes.tfa_code,
          encoding: "base32",
          token: info.tfa_code,
        });
        usermail = common.decrypt(adminRes.email);
        if (verified) {
          if (adminRes.tfa_status == 0) {
            updatedRule = { tfa_status: 1 };
            status = "enabled";
          } else {
            var qrName = "Renode " + usermail;
            var secret = speakeasy.generateSecret({
              length: 10,
              name: qrName,
            });
            var url = common.getQrUrl(secret.otpauth_url);
            updatedRule = {
              tfa_status: 0,
              tfa_code: secret.base32,
              tfa_url: url,
            };
            status = "disabled";
          }
          adminDB
            .updateOne({ _id: req.userId }, { $set: updatedRule })
            .exec(function (errUpdate, resUpdate) {
              if (resUpdate.ok == 1) {
                // mailtempDB
                //   .findOne({key: "admin_tfa_notify"})
                //   .exec(function (etemperr, etempdata) {
                //     var cur_date = new Date();
                //     var ip_address =
                //       req.header("x-forwarded-for") ||
                //       req.connection.remoteAddress;
                //     var source = req.headers["user-agent"],
                //       ua = useragent.parse(source);
                //     var tomail = "";
                //     if (adminRes.type == 1) {
                //       tomail = process.env.FROM_EMAIL;
                //     } else {
                //       tomail = common.decrypt(adminRes.email);
                //     }
                //     var etempdataDynamic = etempdata.body
                //       .replace(/###ip_address###/g, ip_address)
                //       .replace(/###browser###/g, ua.browser)
                //       .replace(/###date###/g, moment(cur_date).format("lll"))
                //       .replace(/###STATUS###/g, status);
                //     mail.sendMail(
                //       {
                //         from: {
                //           name: process.env.FROM_NAME,
                //           address: process.env.FROM_EMAIL,
                //         },
                //         to: "pavi.beleaf05@gmail.com",
                //         subject: etempdata.Subject,
                //         html: etempdataDynamic,
                //       },
                //       function (mailRes) {
                return res.json({
                  status: true,
                  result: updatedRule,
                  message: "2FA has been " + status,
                });
                //     }
                //   );
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

router.post("/admin_wallet_withdraw", common.tokenmiddleware, (req, res) => {
  try {
    var info = req.body;
    //console.log(("info======", info);
    info["amount"] = +info.amount;
    var check = validator
      .isObject()
      .withRequired("currency_id", validator.isString())
      .withRequired("currency_symbol", validator.isString())
      //.withRequired('from_address', validator.isString())
      .withRequired("tfa_code", validator.isString())
      .withRequired("withdraw_address", validator.isString())
      .withRequired("amount", validator.isNumber())
      .withRequired("withdraw_otp", validator.isString());
    // .withRequired("otp_encrypt", validator.isString());
    validator.run(check, info, function (errorCount, errors) {
      //console.log(("validate errors==", errors);
      if (errorCount == 0) {
        adminDB
          .findOne({ _id: req.userId }, { _id: 0 })
          .exec(function (adminErr, adminData) {
            var verified = speakeasy.totp.verify({
              secret: adminData.tfa_code,
              encoding: "base32",
              token: info.tfa_code,
            });
            //console.log(("tfa verified===", verified);
            if (verified) {
              //console.log(("info======", info);
              //if(req.body.withdraw_otp == common.decrypt(req.body.otp_encrypt))
              if (req.body.withdraw_otp == adminData.withdrawOTP) {
                currencyDB.findOne(
                  { _id: mongoose.Types.ObjectId(info.currency_id) },
                  { currencySymbol: 1, currencyType: 1 },
                  function (err, curn_data) {
                    //console.log(("curn_datacurn_data=====", curn_data);
                    var curr = "";
                    curr = curn_data.currencySymbol;
                    //console.log(("currcurrcurr====", curr);
                    if (curn_data) {
                      //console.log(("final====");
                      common.withdraw(info, "admin_withdraw", function (
                        resdatas
                      ) {
                        //console.log(("resdatas=======", resdatas);
                        if (resdatas.status) {
                          info.txn_id = resdatas.txid;
                          info.type = 1;
                          WithdrawDB.create(info, function (err, with_res) {
                            res.json({
                              status: true,
                              Message: "Completed successfully",
                            });
                          });
                        } else {
                          res.json({
                            status: false,
                            Message: resdatas.message,
                          });
                        }
                      });
                    } else {
                      res.json({ status: false, Message: "Invalid currency" });
                    }
                  }
                );
              } else {
                res.json({ status: false, Message: "Invalid OTP" });
              }
            } else {
              res.json({ status: false, Message: "Invalid 2FA code" });
            }
          });
      } else {
        res.json({ status: false, Message: "Enter valid details" });
      }
    });
  } catch (e) {
    //console.log((e);
  }
});

router.get("/getActiveOrders", common.tokenmiddleware, (req, res) => {
  try {
    //console.log((req.userId, "===-=-=-=-=-=-=-=-=-userID--=-==-=-=-=");
    orderDB
      .aggregate([
        {
          $match: {
            status: { $in: ["Active", "Partially"] },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userdata",
          },
        },
        {
          $unwind: {
            path: "$userdata",
          },
        },
        {
          $sort: { createddate: -1 },
        },
        {
          $project: {
            _id: 1,
            pairName: 1,
            ordertype: 1,
            tradeType: 1,
            amount: 1,
            price: 1,
            total: 1,
            createddate: 1,
            orderId: 1,
            username: "$userdata.username",
          },
        },
      ])
      .exec((err, resp) => {
        var active_orders = [];
        if (resp.length > 0) {
          for (var i = 0; i < resp.length; i++) {
            if (resp[i].amount != null && resp[i].price != null) {
              ////console.log((resp[i].amount, "==-if=====resp[i].amount")
              var obj = {
                createddate: moment(resp[i].createddate).format("lll"),
                pairName: resp[i].pairName,
                ordertype: resp[i].ordertype,
                tradeType: resp[i].tradeType,
                amount: parseFloat(resp[i].amount).toFixed(8),
                price: parseFloat(resp[i].price).toFixed(8),
                total: parseFloat(resp[i].total).toFixed(8),
                orderId: resp[i].orderId,
                username: resp[i].username,
                _id: resp[i]._id,
              };
              active_orders.push(obj);
            } else {
              //console.log((resp[i].amount, "==-=else====resp[i].amount");
            }
          }
        }
        var returnJson = {
          status: true,
          result: active_orders,
        };
        res.json(returnJson);
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/getCancelOrders", common.tokenmiddleware, (req, res) => {
  try {
    orderDB
      .aggregate([
        {
          $match: {
            status: "cancelled",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userdata",
          },
        },
        {
          $unwind: {
            path: "$userdata",
          },
        },
        {
          $sort: { createddate: -1 },
        },
        {
          $project: {
            pairName: 1,
            ordertype: 1,
            tradeType: 1,
            amount: 1,
            price: 1,
            total: 1,
            createddate: 1,
            orderId: 1,
            username: "$userdata.username",
          },
        },
      ])
      .exec((err, resp) => {
        var cancel_orders = [];
        if (resp.length > 0) {
          for (var i = 0; i < resp.length; i++) {
            if (resp[i].price != null && resp[i].amount != null) {
              var obj = {
                createddate: moment(resp[i].createddate).format("lll"),
                pairName: resp[i].pairName,
                ordertype: resp[i].ordertype,
                tradeType: resp[i].tradeType,
                amount: parseFloat(resp[i].amount).toFixed(8),
                price: parseFloat(resp[i].price).toFixed(8),
                total: parseFloat(resp[i].total).toFixed(8),
                orderId: resp[i].orderId,
                username: resp[i].username,
              };
              cancel_orders.push(obj);
            }
          }
        }
        var returnJson = {
          status: true,
          result: cancel_orders,
        };
        res.json(returnJson);
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get('/getTradeHistory', common.tokenmiddleware, (req, res) => {
  try {
    orderConfirmDB.aggregate(
      [
        {
          '$lookup': {
            'from': 'users',
            'let': {
              'buyer': '$buyerUserId',
              'seller': '$sellerUserId'
            },
            'pipeline': [
              {
                '$match': {
                  '$expr': {
                    '$or': [
                      {
                        '$eq': [
                          '$_id', '$$buyer'
                        ]
                      }, {
                        '$eq': [
                          '$_id', '$$seller'
                        ]
                      }
                    ]
                  }
                }
              }
            ],
            'as': 'buyer_seller_name'
          }
        }, {
          '$addFields': {
            'buyer': {
              '$filter': {
                'input': '$buyer_seller_name',
                'as': 'row',
                'cond': {
                  '$eq': [
                    '$$row._id', '$buyerUserId'
                  ]
                }
              }
            },
            'seller': {
              '$filter': {
                'input': '$buyer_seller_name',
                'as': 'row',
                'cond': {
                  '$eq': [
                    '$$row._id', '$sellerUserId'
                  ]
                }
              }
            }
          }
        },
        {
          '$project': {
            'sellorderId': 1,
            'sellerUserId': 1,
            'type': 1,
            'askAmount': 1,
            'askPrice': 1,
            'liquid_spread': 1,
            'firstCurrency': 1,
            'secondCurrency': 1,
            'filledAmount': 1,
            'marginAmount': 1,
            'buyorderId': 1,
            'buyerUserId': 1,
            'total': 1,
            'buy_fee': 1,
            'sell_fee': 1,
            'pair': 1,
            'cancel_id': 1,
            'cancel_order': 1,
            'position': 1,
            'lendIntrest': 1,
            'datetime': 1,
            'created_at': 1,
            'orderId': 1,
            'buyer': '$buyer',
            'seller': '$seller',
            'buyername': {
              '$cond': {
                'if': {
                  '$gt': [
                    {
                      '$size': '$buyer'
                    }, 0
                  ]
                },
                'then': {
                  '$arrayElemAt': [
                    '$buyer.username', 0
                  ]
                },
                'else': ''
              }
            },
            'sellername': {
              '$cond': {
                'if': {
                  '$gt': [
                    {
                      '$size': '$seller'
                    }, 0
                  ]
                },
                'then': {
                  '$arrayElemAt': [
                    '$seller.username', 0
                  ]
                },
                'else': ''
              }
            }
          }
        },
        { '$sort': { 'created_at': -1 } }
      ]
    ).exec(function (err, tradehistory) {
      console.log("tradehistory err====", err);
      console.log("tradehistory err====", tradehistory);
      if (!err && tradehistory) {
        var returnJson = {
          status: true,
          data: tradehistory
        }
        res.json(returnJson);
      }
      else {
        res.json({ status: false, Message: 'Something went wrong, Please try again' });
      }
    });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.post("/getTradeHistory", common.tokenmiddleware, (req, res) => {
  try {
    var perPage = Number(req.body.pageSize ? req.body.pageSize : 0);
    var page = Number(req.body.currentPage ? req.body.currentPage : 0);
    page = parseInt(page) + parseInt(1);
    var skippage = perPage * page - perPage;
    if (
      typeof perPage !== "undefined" &&
      perPage !== "" &&
      perPage > 0 &&
      typeof page !== "undefined" &&
      page !== "" &&
      page > 0
    ) {
      orderConfirmDB
        .aggregate([
          {
            $lookup: {
              from: "users",
              let: {
                buyer: "$buyerUserId",
                seller: "$sellerUserId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        {
                          $eq: ["$_id", "$$buyer"],
                        },
                        {
                          $eq: ["$_id", "$$seller"],
                        },
                      ],
                    },
                  },
                },
              ],
              as: "buyer_seller_name",
            },
          },
          {
            $addFields: {
              buyer: {
                $filter: {
                  input: "$buyer_seller_name",
                  as: "row",
                  cond: {
                    $eq: ["$$row._id", "$buyerUserId"],
                  },
                },
              },
              seller: {
                $filter: {
                  input: "$buyer_seller_name",
                  as: "row",
                  cond: {
                    $eq: ["$$row._id", "$sellerUserId"],
                  },
                },
              },
            },
          },
          {
            $project: {
              sellorderId: 1,
              sellerUserId: 1,
              type: 1,
              askAmount: 1,
              askPrice: 1,
              liquid_spread: 1,
              firstCurrency: 1,
              secondCurrency: 1,
              filledAmount: 1,
              marginAmount: 1,
              buyorderId: 1,
              buyerUserId: 1,
              total: 1,
              buy_fee: 1,
              sell_fee: 1,
              pair: 1,
              cancel_id: 1,
              cancel_order: 1,
              position: 1,
              lendIntrest: 1,
              datetime: 1,
              created_at: 1,
              orderId: 1,
              buyer: "$buyer",
              seller: "$seller",
              buyername: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: "$buyer",
                      },
                      0,
                    ],
                  },
                  then: {
                    $arrayElemAt: ["$buyer.username", 0],
                  },
                  else: "",
                },
              },
              sellername: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: "$seller",
                      },
                      0,
                    ],
                  },
                  then: {
                    $arrayElemAt: ["$seller.username", 0],
                  },
                  else: "",
                },
              },
            },
          },
          { $sort: { created_at: -1 } },
        ])
        .skip(skippage)
        .limit(perPage)
        .exec(function (err, tradehistory) {
          //console.log(("tradehistory err====", err);
          //console.log(("tradehistory err====", tradehistory);
          if (!err && tradehistory) {
            orderConfirmDB
              .find({})
              .countDocuments()
              .sort({ _id: -1 })
              .exec(function (err, count) {
                var returnJson = {
                  status: true,
                  data: tradehistory,
                  count: count,
                  pages: Math.ceil(count / perPage),
                };
                res.json(returnJson);
              });
          } else {
            res.json({
              status: false,
              Message: "Something went wrong, Please try again",
            });
          }
        });
    } else {
      res.json({ status: false, Message: "Please enter Pagination field" });
    }
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

//   router.get('/adminwallet_transactions',common.tokenmiddleware,(req,res)=>{
//    try {
//     depositDB.aggregate([{
//         $match: {
//             type: 1
//         }
//     },
//     {
//         $lookup: {
//             from: "currency",
//             localField: "currency",
//             foreignField: "_id",
//             as: "currencydata"
//         }
//     },
//     {
//         $unwind:{
//             path: '$currencydata'
//         }

//     },
//     {
//         $sort: { createddate: -1 }
//     },
//     {
//         $project:{
//             depto:1,
//             txnid:1,
//             depamt:1,
//             createddate:1,
//             currency: '$currencydata.currencySymbol'
//         }
//     }

// ]).exec((err, resp) => {

//     WithdrawDB.aggregate([{
//         $match: {
//             type: 1
//         }
//     },
//     {
//         $lookup: {
//             from: "currency",
//             localField: "currency_id",
//             foreignField: "_id",
//             as: "currencydata"
//         }
//     },
//     {
//         $unwind:{
//             path: '$currencydata'
//         }

//     },
//     {
//         $sort: { created_at: -1 }
//     },
//     {
//         $project:{
//             withdraw_address:1,
//             txn_id:1,
//             amount:1,
//             created_at:1,
//             currency: '$currencydata.currencySymbol'
//         }
//     }

// ]).exec((err1, resp1) => {

//         var deposit = [];
//         var withdraw = [];
//         var transactions = [];
//         if(!err && resp)
//         {
//             if(!err1 && resp1)
//             {

//                 for(var i=0;i<resp.length;i++)
//                 {
//                 var obj = {
//                     createddate: moment(resp[i].createddate).format('lll'),
//                     currency: resp[i].currency,
//                     address: resp[i].depto,
//                     amount: parseFloat(resp[i].depamt).toFixed(8),
//                     transaction_id: resp[i].txnid,
//                     type:"deposit"
//                 }
//                 deposit.push(obj);
//                 }

//                 for(var j=0;j<resp1.length;j++)
//                 {
//                 var obj = {
//                     createddate: moment(resp1[j].created_at).format('lll'),
//                     currency: resp1[j].currency,
//                     address: resp1[j].withdraw_address,
//                     amount: parseFloat(resp1[j].amount).toFixed(8),
//                     transaction_id: resp1[j].txn_id,
//                     type:"withdraw"
//                 }
//                 withdraw.push(obj);
//                 }

//                 if(deposit.length>0 || withdraw.length>0)
//                 {
//                     transactions = deposit.concat(withdraw);
//                     transactions.sort(function(a, b){return b.createddate - a.createddate});
//                 }

//             }

//         }
//         var returnJson = {
//             status: true,
//             result:transactions
//         }
//         res.json(returnJson);
//     });

// });
// } catch (e) {
//     res.json({status:false,Message:e.message});
// }
//   });

router.get("/userscount", common.tokenmiddleware, (req, res) => {
  try {
    usersDB
      .find()
      .estimatedDocumentCount()
      .exec((err, data) => {
        if (!err) {
          res.json({
            status: true,
            Message: data,
          });
        } else {
          res.json({
            status: false,
            Message: "Something Went Wrong Please Try Again Later",
          });
        }
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/depositcount", common.tokenmiddleware, (req, res) => {
  try {
    depositDB
      .find({ type: 0 })
      .sort({ _id: -1 })
      .exec((err, data) => {
        //console.log(("deposit count======", data);
        if (!err) {
          data = getUniqueListBy(data, "txnid");
          res.json({
            status: true,
            Message: data.length,
          });
        } else {
          res.json({
            status: false,
            Message: "Something Went Wrong Please Try Again Later",
          });
        }
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/withdrawcount", common.tokenmiddleware, (req, res) => {
  try {
    WithdrawDB.find({
      type: 0,
      withdraw_type: 0,
      status: { $in: [1, 2, 3, 4] },
    })
      .countDocuments()
      .exec((err, data) => {
        //console.log(("withdraw count======", data);
        if (!err) {
          res.json({
            status: true,
            Message: data,
          });
        } else {
          res.json({
            status: false,
            Message: "Something Went Wrong Please Try Again Later",
          });
        }
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/openorderscount", common.tokenmiddleware, (req, res) => {
  try {
    orderDB
      .find({ status: "Active" })
      .countDocuments()
      .sort({ _id: -1 })
      .exec((err, data) => {
        //console.log(("deposit count======", data);z
        if (!err) {
          res.json({
            status: true,
            Message: data,
          });
        } else {
          res.json({
            status: false,
            Message: "Something Went Wrong Please Try Again Later",
          });
        }
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/orderscount", common.tokenmiddleware, (req, res) => {
  try {
    orderConfirmDB
      .find({})
      .countDocuments()
      .sort({ _id: -1 })
      .exec((err, data) => {
        if (!err) {
          res.json({
            status: true,
            Message: +data / 2,
          });
        } else {
          res.json({
            status: false,
            Message: "Something Went Wrong Please Try Again Later",
          });
        }
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/cancelledcount", common.tokenmiddleware, (req, res) => {
  try {
    orderDB
      .find({ status: "cancelled" })
      .countDocuments()
      .sort({ _id: -1 })
      .exec((err, data) => {
        if (!err) {
          res.json({
            status: true,
            Message: data,
          });
        } else {
          res.json({
            status: false,
            Message: "Something Went Wrong Please Try Again Later",
          });
        }
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/get_contact", common.tokenmiddleware, (req, res) => {
  try {
    contactDB
      .find({})
      .lean()
      .sort({ _id: -1 })
      .exec(function (err, data) {
        if (err) {
          return res.json({
            status: false,
            message: "Something went wrong, please try again",
          });
        } else {
          if (data.length > 0) {
            var contact_data = [];
            for (var i = 0; i < data.length; i++) {
              var obj = {
                date: moment(data[i].createdDate).format("lll"),
                name: data[i].name,
                email: data[i].email,
                message: data[i].message,
                status: data[i].status,
              };
              contact_data.push(obj);
            }
            return res.json({ status: true, data: contact_data });
          } else {
            return res.json({ status: true, data: [] });
          }
        }
      });
  } catch (error) {
    return res.json({
      status: false,
      message: "Something went wrong, please try again",
    });
  }
});

router.get("/admin_wallet_balance", async (req, res) => {
  //console.log(("call admin wallet balance ====");
  try {
    currencyDB
      .find(
        { status: "Active" }
      )
      .exec(async (err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          var element = [];
          for (let i = 0; i < data.length; i++) {
            //     // if(data[i].currencySymbol == "BTC")
            //     // {
            //     // ////console.log(("call btc====");
            //     //   common.btc_balance(function(response){
            //     //       if(response.status)
            //     //       {
            //     //           var balance = response.balance;
            //     //           common.updateAdminBalance(data[i]._id, balance,function(resp){
            //     //           });
            //     //       }
            //     //   })

            //     // }

            if (data[i].currencySymbol == "ETH") {
              ////console.log(("call trx====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  address: admin_address,
                };
                common.get_Balance(obj, function (response) {
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }

            if (data[i].currencySymbol == "TRX") {
              ////console.log(("call trx====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  address: admin_address,
                };
                common.trx_balance(obj, function (response) {
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }

            //     // if(data[i].currencySymbol == 'XRP')
            //     // {
            //     //     common.adminwallet(data[i]._id,function(adminres){
            //     //         var admin_address = adminres.address;
            //     //         var obj = {
            //     //             "address": admin_address
            //     //         }
            //     //         common.xrp_Balance(obj,function(response){
            //     //             if(response.status)
            //     //             {
            //     //                 var balance = response.balance;
            //     //                 common.updateAdminBalance(data[i].currencySymbol, balance,function(resp){
            //     //                 });
            //     //             }
            //     //         })
            //     //     });
            //     // }

            //     if(data[i].currencyType=="2" && data[i].trc20=='1')
            //     {
            //    // //console.log(("call trc20====");
            //       common.adminwallet(data[i]._id,function(adminres){
            //           var admin_address = adminres.address;
            //           var obj = {
            //               "address": admin_address,
            //               "privatekey":  adminres.admin_token_name,
            //               "contractAddress": data[i].contractAddress,
            //               "decimal": data[i].coinDecimal
            //           }
            //           ////console.log(("call trc20 obj====",obj);
            //           common.trc20_balance(obj,function(response){
            //            // //console.log(("call trc20_balance response====",response);
            //             if(response.status)
            //             {
            //                 var balance = response.balance;
            //                 common.updateAdminBalance(data[i].currencySymbol, balance,function(resp){
            //                 });
            //             }
            //         })

            //       });
            //     }

            //     if(data[i].currencyType=="2" && data[i].erc20=='1')
            //     {
            //    // //console.log(("call trc20====");
            //       common.adminwallet(data[i]._id,function(adminres){
            //           var admin_address = adminres.address;
            //           var obj = {
            //               "userAddress": admin_address,
            //               "contractAddress": data[i].contractAddress,
            //               "decimals": data[i].coinDecimal
            //           }
            //           ////console.log(("call trc20 obj====",obj);
            //           common.get_tokenBalance(obj,function(response){
            //            // //console.log(("call trc20_balance response====",response);
            //             if(response.status)
            //             {
            //                 var balance = response.balance;
            //                 common.updateAdminBalance(data[i].currencySymbol, balance,function(resp){
            //                 });
            //             }
            //         })

            //       });
            //     }

            if (data[i].currencySymbol == "BNB") {
              //console.log("call trx====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  address: admin_address,
                };
                common.bnb_Balance(obj, function (response) {
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }
            if (data[i].currencySymbol == "MATIC") {
              console.log("call trx====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  address: admin_address,
                };
                common.matic_Balance(obj, function (response) {
                  if (response.status) {
                    var balance = response.balance;
                    console.log(response, "response")
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }
            if (data[i].currencyType == "2" && data[i].bep20token == '1') {
              console.log("call bep20====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = common.decryptionLevel(process.env.BNB_NAME);
                var obj = {
                  "userAddress": admin_address,
                  "contractAddress": data[i].contractAddress_bep20,
                  "decimals": data[i].coinDecimal_bep20
                }
                console.log("call bep20 obj====", obj);
                common.bep20_Balance(obj, function (response) {
                  ////console.log(("call trc20_balance response====",response);
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(data[i].currencySymbol, balance, function (resp) {
                    });
                  }
                })

              });
            }
          }
          res.json({
            status: true,
          });
        }
      });
  } catch (err) {
    //console.log(("balance catch error result==", err);
  }
});
router.post("/deletecurrency", common.tokenmiddleware, async (req, res) => {
  try {
    var deleteres = await currencyDB.findOneAndDelete({ _id: req.body._id });
    if (deleteres) {
      res
        .status(200)
        .json({ status: true, Message: "Currency deleted successfully" });
    } else {
      res
        .status(400)
        .json({ status: false, Message: "Currency does not deleted" });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      Message: "Something went wrong, please try again",
    });
  }
});
async function prcy_balance() {
  try {
    var headers = {
      "content-type": "application/json;",
    };

    var dataString =
      '{"jsonrpc":"2.0","id":"addr1","method":"getbalances","params":[]}';

    var options = {
      url: "https://208.85.19.193",
      method: "post",
      headers: headers,
      body: dataString,
      requestCert: true,
      rejectUnauthorized: false,
      cert: fs.readFileSync("/home/anon/prcy.pem"),
      auth: {
        user: "prcyus3r",
        pass: "PRCYjnb96BI23ESamk897o0OH2S04P5hxxxQWM",
      },
    };

    request(options, function (error, response, body) {
      //console.log(("get prcy balance===", body);
      if (response.statusCode == 200) {
        var resp = JSON.parse(body);
        //console.log(("resp.result.spendable", resp.result.spendable);

        return resp.result.spendable;
      }
    });
  } catch (err) {
    //console.log(("prcy catch error", err);
  }
}
// get all trade pairs
router.post("/tradepair/viewbycurrency", (req, res) => {
  try {
    tradePairDB
      .find({ to_symbol: req.body.currency, status: 1 })
      .sort({ pair: 1 })
      .populate("from_symbol_id", "Currency_image")
      .exec((err, data) => {
        //console.log((data, "=-=-=-=-Currency_image-=-Currency_image");
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var obj = {
              _id: data[i]._id,
              id: i + 1,
              pair: data[i].pair,
              status: data[i].status,
              marketPrice: data[i].marketPrice,
              changes_24h: data[i].changes_24h,
              min_trade_amount: data[i].min_trade_amount,
              makerFee: data[i].makerFee,
              takerFee: data[i].takerFee,
              liquidity_status: data[i].liquidity_status,
              buyspread: data[i].buyspread,
              sellspread: data[i].sellspread,
              liquidity_name: data[i].liquidity_name,
              from_symbol: data[i].from_symbol,
              to_symbol: data[i].to_symbol,
              Currency_image: data[i].from_symbol_id
                ? data[i].from_symbol_id.Currency_image
                : null,
            };
            resdata.push(obj);
          }
          res.status(200).json({
            status: true,
            data: resdata,
          });
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/eth_address", (req, res) => {
  common.eth_address(function (response) {
    return res.json(response);
  });
});

router.get("/tron_address", (req, res) => {
  common.tron_address(function (response) {
    return res.json(response);
  });
});

router.get("/btc_address", (req, res) => {
  var obj = {
    username: "Renode_admin",
  };
  common.btc_address(obj, function (response) {
    return res.json(response);
  });
});
/* =========== Sub Admin ============ */

// router.get("/subadmin_list", (req, res) => {
//   try {
//     adminDB
//       .find({ type: 0 })
//       .sort({ createdDate: -1 })
//       .exec(function (err, admindata) {
//         if (!err || admindata) {
//           const data = [];
//           var subadminData = admindata;
//           for (var i = 0; i < subadminData.length; i++) {
//             var obj = {
//               _id: subadminData[i]._id,
//               id: i + 1,
//               email: common.decrypt(subadminData[i].email),
//               status: subadminData[i].status,
//             };
//             data.push(obj);
//           }
//           return res.json({ status: true, Message: data });
//         } else {
//           return res.json({
//             status: false,
//             Message: "Something went wrong, Please try again",
//           });
//         }
//       });
//   } catch (e) {
//     return res.json({
//       status: false,
//       Message: "Something went wrong, Please try again",
//     });
//   }
// });

router.post('/admincreate', async (req, res) => {
  try {
    var obj = {
      email: common.encrypt(req.body.email),
      password: common.encrypt(req.body.password),
      userName: req.body.username
    }
    var createadmin = await adminDB.create(obj)

    var cipher = crypto.createCipheriv('aes-256-ctr', key.ENCRYPTION_KEY, 'S19h8AnT21H8n14I')
    var crypted = cipher.update(createadmin._id + '@' + new Date().getTime().toString(), 'utf8', 'hex')
    crypted += cipher.final('hex');
    var link = key.baseUrl_admin + 'setPassword/' + crypted;

    var qrName = '' + req.body.email;
    var secret = speakeasy.generateSecret({ length: 10, name: qrName });

    var url = common.getQrUrl(secret.otpauth_url);
    var update = await adminDB.updateOne({ _id: createadmin._id }, { "$set": { 'reset_password_timer': new Date(), tfa_url: url, tfa_code: secret.base32 } }, { new: true });
  } catch (err) {
    console.log(err, "err")
  }
})
// router.post("/subadmin_create", (req, res) => {
//   try {
//     var password = generatePassword(12);
//    //console.log(("password===", password);
//     var info = req.body;
//     info.password = common.encrypt(password);
//     info.email = common.encrypt(req.body.usermail);
//    //console.log(("info==", info);
//     var encrypmail = common.encrypt(req.body.email);
//     usersDB.findOne({ email: encrypmail }, function (err, user) {
//       if (user != null) {
//         return res.json({
//           status: false,
//           Message: "Email id already exists in user side",
//         });
//       } else {
//        //console.log(("call1111==");
//         adminDB.create(info, function (err, subadmindata) {
//          //console.log(("call222==");
//           if (!err || subadmindata) {
//            //console.log(("call success==");
//             var cipher = crypto.createCipheriv(
//               "aes-256-ctr",
//               key.ENCRYPTION_KEY,
//               "S19h8AnT21H8n14I"
//             );
//             var crypted = cipher.update(
//               subadmindata._id + "@" + new Date().getTime().toString(),
//               "utf8",
//               "hex"
//             );
//             crypted += cipher.final("hex");
//             var link = key.baseUrl_admin + "setPassword/" + crypted;

//             var qrName = "Justbit Admin " + req.body.email;
//             var secret = speakeasy.generateSecret({ length: 10, name: qrName });

//             var url = common.getQrUrl(secret.otpauth_url);

//             adminDB
//               .updateOne(
//                 { _id: subadmindata._id },
//                 {
//                   $set: {
//                     reset_password_timer: new Date(),
//                     tfa_url: url,
//                     tfa_code: secret.base32,
//                   },
//                 },
//                 { new: true }
//               )
//               .exec(function (err, resUpdate) {
//                 mailtempDB
//                   .findOne({ key: "subadmin_create" })
//                   .exec(function (etemperr, etempdata) {
//                     var etempdataDynamic = etempdata.body
//                       .replace(/###EMAIL###/g, req.body.usermail)
//                       .replace(/###LINK###/g, link);
//                     mail.sendMail(
//                       {
//                         from: {
//                           name: process.env.FROM_NAME,
//                           address: process.env.FROM_EMAIL,
//                         },
//                         to: req.body.usermail,
//                         subject: etempdata.Subject,
//                         html: etempdataDynamic,
//                       },
//                       function (mailRes) {
//                         return res.json({
//                           status: true,
//                           Message: "Subadmin added successfully",
//                         });
//                       }
//                     );
//                   });
//               });
//           } else {
//            //console.log(("call error==");
//             if (err.code.toString() == "11000") {
//               return res.json({
//                 status: false,
//                 Message: "Email id already exists",
//               });
//             } else {
//               return res.json({
//                 status: false,
//                 Message: "Something went wrong, Please try again",
//               });
//             }
//           }
//         });
//       }
//     });
//   } catch (e) {
//    //console.log(("subadmin create catch===", e);
//     return res.json({
//       status: false,
//       Message: "Something went wrong, Please try again",
//     });
//   }
// });

// router.post("/subadmin_get", (req, res) => {
//   try {
//     adminDB
//       .findOne({ _id: mongoose.Types.ObjectId(req.body._id) })
//       .exec(function (err, admindata) {
//         if (!err || admindata) {
//           admindata.email = common.decrypt(admindata.email);
//           return res.json({ status: true, Message: admindata });
//         } else {
//           return res.json({
//             status: false,
//             Message: "Something went wrong, Please try again",
//           });
//         }
//       });
//   } catch (e) {
//     return res.json({
//       status: false,
//       Message: "Something went wrong, Please try again",
//     });
//   }
// });

// router.post("/subadmin_edit", (req, res) => {
//   try {
//    //console.log(("subadmin edit ====", req.body);
//     adminDB
//       .updateOne(
//         { _id: mongoose.Types.ObjectId(req.body._id) },
//         { $set: req.body }
//       )
//       .exec(function (err, updatedata) {
//         if (!err || updatedata) {
//          //console.log(("subadmin updatedata ====", updatedata);
//           return res.json({
//             status: true,
//             Message: "Subadmin updated successfully",
//           });
//         } else {
//           return res.json({
//             status: true,
//             Message: "Something went wrong, Please try again",
//           });
//         }
//       });
//   } catch (e) {
//     return res.json({
//       status: true,
//       Message: "Something went wrong, Please try again",
//     });
//   }
// });

// router.post("/subadmin_delete", (req, res) => {
//   try {
//     adminDB.deleteOne(
//       { _id: mongoose.mongo.ObjectId(req.body._id) },
//       function (err, updatedata) {
//         if (!err || updatedata) {
//           return res.json({
//             status: true,
//             Message: "Subadmin deleted successfully",
//           });
//         } else {
//           return res.json({
//             status: false,
//             Message: "Something went wrong, Please try again",
//           });
//         }
//       }
//     );
//   } catch (e) {
//     return res.json({
//       status: false,
//       Message: "Something went wrong, Please try again",
//     });
//   }
// });

router.post("/setadminPassword", (req, res) => {
  try {
    var cipher = crypto.createDecipheriv(
      "aes-256-ctr",
      key.ENCRYPTION_KEY,
      "S19h8AnT21H8n14I"
    );
    var crypted = cipher.update(req.body._id, "hex", "utf8");
    crypted += cipher.final("utf8");
    let splited = crypted.split("@");
    let user_id = splited[0];

    adminDB.findOne({ _id: mongoose.mongo.ObjectId(user_id) }, function (
      err,
      admindata
    ) {
      if (err) {
        return res.json({
          status: false,
          Message: "Something went wrong, Please try again",
        });
      } else {
        var newpass = common.encrypt(req.body.password);
        adminDB.updateOne(
          { _id: mongoose.mongo.ObjectId(user_id) },
          { $set: { password: newpass } },
          function (err, resupdate) {
            if (err) {
              return res.json({
                status: false,
                Message: "Something went wrong, Please try again",
              });
            } else {
              return res.json({
                status: true,
                Message: "Password set successfully",
              });
            }
          }
        );
      }
    });
  } catch (e) {
    return res.json({
      status: false,
      Message: "Something went wrong, Please try again",
    });
  }
});

router.post("/subadminStatus", (req, res) => {
  try {
    adminDB
      .updateOne({ _id: req.body._id }, { $set: { status: req.body.status } })
      .exec((err, changedData) => {
        if (!err) {
          return res.json({
            status: true,
            Message: "Status changed successfully",
          });
        } else {
          return res.json({
            status: false,
            Message: "Status can't changed,Please try again later",
          });
        }
      });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

router.get("/getprofit", common.tokenmiddleware, async (req, res) => {
  try {
    // var perPage = Number(req.body.pageSize ? req.body.pageSize : 0);
    // var page = Number(req.body.currentPage ? req.body.currentPage : 0);
    // page = parseInt(page) + parseInt(1);
    // var skippage = perPage * page - perPage;
    // if (
    //   typeof perPage !== "undefined" &&
    //   perPage !== "" &&
    //   perPage > 0 &&
    //   typeof page !== "undefined" &&
    //   page !== "" &&
    //   page > 0
    // ) {
    var profitdata = await profitDB.find({});
    console.log(profitdata, "profitdata")
    profitDB
      .aggregate([
        {
          $lookup: {
            from: "currency",
            localField: "currencyid",
            foreignField: "_id",
            as: "currency",
          },
        },
        { $unwind: "$currency" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "userdata",
          },
        },
        { $unwind: "$userdata" },

        {
          $project: {
            currencyname: "$currency.currencyName",
            currency_id: "$currency._id",
            image: "$currency.Currency_image",
            email: "$userdata.email",
            currencySymbol: "$currency.currencySymbol",
            orderid: "$orderid",
            type: "$type",
            date: "$date",
            fees: "$fees",
            fullfees: "$fullfees",
            liquidity: "$liquidity",
          },
        },
      ])
      // .skip(skippage)
      // .limit(perPage)
      .sort({ _id: -1 })
      .exec((err, getProfitData) => {
        if (err) {
          return res.json({
            status: false,
            Message: "Something went wrong, Please try again",
            data: [],
          });
        } else {
          console.log(getProfitData, "getProfitData")
          profitDB
            .find({})
            .countDocuments()
            .sort({ _id: -1 })
            .exec(function (err, count) {
              var profitArray = [];
              for (var i = 0; i < getProfitData.length; i++) {
                var obj = {
                  currencyname: getProfitData[i].currencyname,
                  currency_id: getProfitData[i].currency_id,
                  image: getProfitData[i].image,
                  email: common.decrypt(getProfitData[i].email),
                  currency: getProfitData[i].currencySymbol,
                  orderid: getProfitData[i].orderid,
                  type: getProfitData[i].type,
                  date: getProfitData[i].date,
                  fees: getProfitData[i].fees,
                  fullfees: getProfitData[i].fullfees,
                  liquidity: getProfitData[i].liquidity,
                  profit_amount: +getProfitData[i].fees,
                };
                profitArray.push(obj);
              }
              var returnjson = {
                status: true,
                Message: "Success",
                value: profitArray,
                count: count,
                // pages: Math.ceil(count / perPage),
              };
              return res.json(returnjson);
            });
        }
      });
    // } else {
    //   return res.json({
    //     status: false,
    //     Message: "Please enter Pagination field",
    //   });
    // }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

router.get("/create_adminWallet", async (req, res) => {
  let currencyData = await currencyDB
    .find({ status: "Active" })
    .sort({ _id: -1 })
    .exec();
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
      userId: "655465337d45725ea2ca61c3",
      wallets: currencyArray,
      type: 2,
    };

    let wall_data = await adminWalletDB.create(wallet_obj);
    return res.json({ wall_data: wall_data });
  }
});

router.get("/bnb_address", (req, res) => {
  common.bnb_address(function (response) {
    return res.json(response);
  });
});

router.post(
  "/get_admin_bankdetails",
  common.tokenmiddleware,
  async (req, res) => {
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
        var result = await adminBankdetails.paginate(
          {},
          { offset: skippage, limit: perPage, sort: { createdAt: -1 } }
        );
        if (result) {
          res.status(200).json({
            status: true,
            data: result,
          });
        } else {
          res.status(400).json({ status: false, Message: "Does Not Rejected" });
        }
      } else {
        res
          .status(400)
          .send({ status: false, Message: "Invalid pagination request" });
      }
    } catch (error) {
      res.status(500).json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post("/updatebankdetails", common.tokenmiddleware, async (req, res) => {
  try {
    var currency_data = await currencyDB.findOne(
      { currencySymbol: req.body.currency },
      { _id: 1 }
    );
    if (req.body._id == "" || req.body._id == undefined) {
      var bank_ob = {
        Account_Number: req.body.accno,
        Bank_Name: req.body.bank,
        IFSC_code: req.body.branch,
        Branch_Name: req.body.ifsc,
        Name: req.body.name,
        adminID: req.userId,
        Account_type: req.body.account_type,
        currency: req.body.currency,
        currency_id: mongoose.Types.ObjectId(currency_data._id),
        status: req.body.status,
      };
      adminBankdetails.create(bank_ob, (err, data) => {
        if (!err) {
          res.status(200).json({
            status: true,
            event: "create",
            Message: "bank Details created Successfully",
          });
        } else {
          res.status(400).json({ status: false, Message: "Error with Database" });
        }
      });
    } else {
      adminBankdetails
        .findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(req.body._id) },
          {
            Account_Number: req.body.accno,
            Bank_Name: req.body.bank,
            IFSC_code: req.body.branch,
            Branch_Name: req.body.ifsc,
            Name: req.body.name,
            Account_type: req.body.account_type,
            currency: req.body.currency,
            currency_id: mongoose.Types.ObjectId(currency_data._id),
            status: req.body.status,
          },
          { new: true }
        )
        .exec((err, data) => {
          if (err) {
            res
              .status(400)
              .json({ status: false, Message: "Bank Detail Does not Updated" });
          } else {
            res.status(200).json({
              status: true,
              event: "update",
              Message: "bank Details Updated Successfully",
            });
          }
        });
    }
  } catch (error) {
    res.status(500).json({ status: false, Message: error });
  }
});

router.post("/delete_bank_details", async (req, res) => {
  try {
    var request = req.body;
    if (request._id !== "") {
      var result = await adminBankdetails.remove({ _id: request._id });
      if (result) {
        res
          .status(200)
          .json({ status: true, message: "bank Details Deleted Successfully" });
      } else {
        res
          .status(400)
          .json({ status: false, message: "bank Details Does Not Deleted" });
      }
    } else {
      res.status(400).json({ status: false, message: "Request Does Not Valid" });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      Message: "Something went wrong Please try again later",
    });
  }
});

router.post("/update_bank_status", async (req, res) => {
  try {
    var status = req.body.status;
    var opposite_status = status == "1" ? "0" : "1";
    var update1 = await adminBankdetails.updateOne(
      { _id: req.body._id },
      { $set: { status: req.body.status } }
    );
    var update2 = await adminBankdetails.updateMany(
      { _id: { $ne: req.body._id } },
      { $set: { status: opposite_status } }
    );
    if (update1 && update2) {
      return res
        .status(200)
        .json({ status: true, Message: "Status changed successfully" });
    } else {
      return res.status(400).json({
        status: false,
        Message: "Something went wrong,Please try again later",
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

router.post("/getdepositlist", async (req, res) => {
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
      var response = await manualDeposit.paginate(
        {},
        { offset: skippage, limit: perPage, sort: { createdDate: -1 } }
      );
      res.status(200).send({
        status: true,
        Message: "Data Retrived Successfully",
        data: response,
      });
    } else {
      res
        .status(400)
        .send({ status: false, Message: "Invalid pagination request" });
    }
  } catch (error) {
    res.status(500).send({
      status: false,
      Message: "Internal server error!, Please try again later",
    });
  }
});

router.post("/fiatdepositreject", async (req, res) => {
  try {
    if (req.body._id !== "" && req.body.currency !== "") {
      var result = await manualDeposit.findOneAndUpdate(
        { _id: req.body._id, currency: req.body.currency },
        { remark: req.body.remark, aprooveStatus: "2" },
        { new: true }
      );
      if (result) {
        res
          .status(200)
          .json({ status: true, Message: "Deposit Request Rejected" });
      } else {
        res.status(400).json({ status: false, Message: "Does Not Rejected" });
      }
    } else {
      res
        .status(400)
        .json({ status: false, Message: "Please Enter Valid Detail" });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/fiatdepositapprove", async (req, res) => {
  try {
    if (req.body._id !== "" && req.body.currency !== "") {
      var result = await manualDeposit.findOneAndUpdate(
        { _id: req.body._id, currency: req.body.currency },
        {
          aprooveStatus: "1",
          amount: req.body.amount,
          transactionID: Math.floor(Math.random() * 100000000 + 1),
        },
        { new: true }
      );
      if (result) {
        var walletupdate = await userWalletDB.updateOne(
          {
            $and: [
              { userId: mongoose.mongo.ObjectId(result.userId) },
              { "wallets.currencySymbol": result.currency },
            ],
          },
          { $inc: { "wallets.$.amount": parseFloat(result.amount) } },
          { multi: true }
        );
        if (walletupdate) {
          res
            .status(200)
            .json({ status: true, Message: "Amount Deposited Successfully" });
        } else {
          res.status(400).json({ status: false, Message: "Does Not Rejected" });
        }
      } else {
        res.status(400).json({ status: false, Message: "Does Not Rejected" });
      }
    } else {
      res.status(400).json({ status: false, Message: "Does Not Approved" });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/getP2POrders", common.tokenmiddleware, (req, res) => {
  try {
    p2pOrdersDB
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
          $unwind: {
            path: "$userdata",
          },
        },
        {
          $sort: { createddate: -1 },
        },
        {
          $project: {
            firstCurrency: 1,
            secondCurrnecy: 1,
            totalAmount: 1,
            price: 1,
            paymentMethod: 1,
            orderType: 1,
            status: 1,
            orderId: 1,
            username: "$userdata.username",
          },
        },
      ])
      .exec((err, resp) => {
        var p2p_orders = [];
        if (resp.length > 0) {
          for (var i = 0; i < resp.length; i++) {
            var obj = {
              createddate: moment(resp[i].createdAt).format("lll"),
              firstCurrency: resp[i].firstCurrency,
              secondCurrency: resp[i].secondCurrnecy,
              totalAmount: resp[i].totalAmount,
              price: resp[i].price,
              paymentMethod: resp[i].paymentMethod,
              status: resp[i].status,
              orderId: resp[i].orderId,
              username: resp[i].username,
            };
            p2p_orders.push(obj);
          }
        }
        var returnJson = {
          status: true,
          result: p2p_orders,
        };
        res.json(returnJson);
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

//--------------------BANNER CREATE AND UPDATE--------------------------//

router.post("/banner_update", (req, res) => {
  try {
    if (req.body._id != "") {
      bannerDB
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              image: req.body.image,
              status: req.body.status,
            },
          }
        )
        .exec((err, updatedData) => {
          if (!err) {
            return res.json({
              status: true,
              Message: "Banner updated successfully",
            });
          } else {
            return res.json({
              status: false,
              Message: "Something went wrong,Please try again later",
            });
          }
        });
    } else if (req.body._id == "") {
      var createObj = {
        image: req.body.image,
        status: req.body.status,
      };
      bannerDB.create(createObj, (create_err, createData) => {
        if (!create_err) {
          return res.json({
            status: true,
            message: "Banner created successfully",
          });
        } else {
          return res.json({
            status: false,
            Message: "Something went wrong,Please try again later",
          });
        }
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

//----------------------Banner VIEW ALL DATAS---------------------------------//

router.get("/banner_view", (req, res) => {
  try {
    bannerDB.find().exec((err, datas) => {
      if (!err) {
        const data = [];
        var bannerData = datas;
        for (var i = 0; i < bannerData.length; i++) {
          var obj = {
            _id: bannerData[i]._id,
            id: i + 1,
            image: bannerData[i].image,
            status: bannerData[i].status,
          };
          data.push(obj);
        }
        return res.json({ status: true, data: data });
      } else {
        return res.json({
          status: false,
          Message: "Something went wrong,Please try again later",
        });
      }
    });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

//----------------------GET Banner VIEW EDIT SINGELE DATA------------------------------------//

router.post("/banner_get", (req, res) => {
  try {
    bannerDB.findOne({ _id: req.body._id }).exec((err, data) => {
      if (err) {
        return res.json({
          status: false,
          Message: "Something went wrong,Please try again later",
        });
      } else {
        return res.json({ status: true, Message: data });
      }
    });
  } catch (e) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

//----------------------GET Banner STATUS CHANGE SINGELE DATA------------------------------------//

router.post("/changebannerStatus", (req, res) => {
  try {
    bannerDB
      .updateOne({ _id: req.body._id }, { $set: { status: req.body.status } })
      .exec((err, changedData) => {
        if (!err) {
          return res.json({
            status: true,
            Message: "Status changed successfully",
          });
        } else {
          return res.json({
            status: false,
            Message: "Status can't changed,Please try again later",
          });
        }
      });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

//----------------------GET Banner SINGELE DATA DELETE------------------------------------//

router.post("/deleteBanner", (req, res) => {
  try {
    //console.log((req.body._id);
    if (
      req.body._id != "" ||
      req.body._id != undefined ||
      req.body._id != null
    ) {
      bannerDB
        .findByIdAndDelete({ _id: req.body._id })
        .exec((err, deletedData) => {
          if (!err) {
            return res.json({
              status: true,
              Message: "Banner data deleted successfully",
            });
          } else {
            return res.json({
              status: false,
              Message: "Banner data can't changed,Please try again later",
            });
          }
        });
    } else {
      return res.json({
        status: false,
        Message: "Banner data can't changed,Please try again later",
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

router.get("/fund_wallet_list", async (req, res) => {
  try {
    ////console.log(("req.userId===",req.userId);
    adminWalletDB
      .aggregate([
        // {
        //   $match: { type: 1 },
        // },
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
            erc20token: { $arrayElemAt: ["$currdetail.erc20token", 0] },
            trc20token: { $arrayElemAt: ["$currdetail.trc20token", 0] },
            bep20token: { $arrayElemAt: ["$currdetail.bep20token", 0] },
            currencyBalance: "$wallets.amount",
            currencyAddress: "$wallets.address",
            currid: { $arrayElemAt: ["$currdetail._id", 0] },
          },
        },
      ])
      .exec(async (err, resData) => {
        if (err) {
          return res.json({ status: false, Message: err, code: 200 });
        } else {
          var dataPush = [];
          let currency = await currencyDB
            .find({ depositStatus: "Active", coinType: 1 })
            .sort({ popularOrder: 1 });
          if (currency) {
            for (var i = 0; i < currency.length; i++) {
              for (var j = 0; j < resData.length; j++) {
                if (currency[i].currencySymbol == resData[j].currencysymbol) {
                  dataPush.push(resData[j]);
                }
              }
            }
          }
          return res.json({ status: true, data: dataPush, code: 200 });
        }
      });
  } catch (error) {
    //console.log(("wallet list catch=====", error.message);
    return res.json({ status: false, Message: "Internal server", code: 500 });
  }
});

router.get("/admin_balance", async (req, res) => {
  console.log("call admin wallet balance ====");
  try {
    currencyDB
      .find(
        { status: "Active" },
        {
          _id: 1,
          currencySymbol: 1,
          contractAddress: 1,
          coinDecimal: 1,
          currencyType: 1,
          trc20: 1,
          erc20: 1,
          bep20: 1,
        }
      )
      .exec(async (err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          var element = [];
          for (let i = 0; i < data.length; i++) {
            if (data[i].currencySymbol == "BTC") {
              //console.log(("call btc====");
              common.btc_balance(function (response) {
                //console.log(("btc_balance===", response);
                if (response.status) {
                  var balance = response.balance;
                  common.updateAdminBalance(
                    data[i].currencySymbol,
                    balance,
                    function (resp) { }
                  );
                }
              });
            }

            if (data[i].currencySymbol == "ETH") {
              //console.log("call trx====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  address: admin_address,
                };
                common.get_Balance(obj, function (response) {
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }

            if (data[i].currencySymbol == "TRX") {
              //console.log(("call trx====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.trx_hexaddress;
                var obj = {
                  address: admin_address,
                };
                common.tron_balance(obj, function (response) {
                  //console.log(("call trx_balance====", response);
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }
            if (data[i].currencySymbol == "MATIC") {
              console.log("call trx====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  address: admin_address,
                };
                common.matic_Balance(obj, function (response) {
                  console.log("call matic_Balance====", response);
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }
            // if(data[i].currencySymbol == 'XRP')
            // {
            //     common.adminwallet(data[i]._id,function(adminres){
            //         var admin_address = adminres.address;
            //         var obj = {
            //             "address": admin_address
            //         }
            //         common.xrp_Balance(obj,function(response){
            //             if(response.status)
            //             {
            //                 var balance = response.balance;
            //                 common.updateAdminBalance(data[i].currencySymbol, balance,function(resp){
            //                 });
            //             }
            //         })
            //     });
            // }

            if (data[i].currencyType == "2" && data[i].trc20token == "1") {
              // console.log("call trc20====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  address: admin_address,
                  privatekey: adminres.admin_token_name,
                  contractAddress: data[i].contractAddress,
                  decimal: data[i].coinDecimal,
                };
                //console.log("call trc20 obj====",obj);
                common.trc20_balance(obj, function (response) {
                  // console.log("call trc20_balance response====",response);
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }

            if (data[i].currencyType == "2" && data[i].erc20 == "1") {
              //console.log(("call trc20====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  userAddress: admin_address,
                  contractAddress: data[i].contractAddress,
                  decimals: data[i].coinDecimal,
                };
                //console.log("call trc20 obj====",obj);
                common.get_tokenBalance(obj, function (response) {
                  //console.log(("call trc20_balance response====", response);
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }

            if (data[i].currencySymbol == "BNB") {
              //console.log("call trx====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  address: admin_address,
                };
                common.bnb_Balance(obj, function (response) {
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }

            if (data[i].currencyType == "2" && data[i].bep20token == "1") {
              //console.log(("call bep20====");
              common.adminwallet(data[i]._id, function (adminres) {
                var admin_address = adminres.address;
                var obj = {
                  userAddress: admin_address,
                  contractAddress: data[i].contractAddress,
                  decimals: data[i].coinDecimal,
                };
                //console.log("call trc20 obj====",obj);
                common.bep20_Balance(obj, function (response) {
                  //console.log(("call bep20_balance response====", response);
                  if (response.status) {
                    var balance = response.balance;
                    common.updateAdminBalance(
                      data[i].currencySymbol,
                      balance,
                      function (resp) { }
                    );
                  }
                });
              });
            }
          }
          res.json({
            status: true,
          });
        }
      });
  } catch (err) {
    //console.log(("balance catch error result==", err);
  }
});

router.get("/adminwallet_transactions", common.tokenmiddleware, (req, res) => {
  try {
    depositDB
      .aggregate([
        {
          $match: {
            type: 1,
          },
        },
        {
          $lookup: {
            from: "currency",
            localField: "currency",
            foreignField: "_id",
            as: "currencydata",
          },
        },
        {
          $unwind: {
            path: "$currencydata",
          },
        },
        {
          $sort: { createddate: -1 },
        },
        {
          $project: {
            depto: 1,
            txnid: 1,
            depamt: 1,
            createddate: 1,
            currency: "$currencydata.currencySymbol",
          },
        },
      ])
      .exec((err, resp) => {
        WithdrawDB.find({ type: 1 })
          .sort({ _id: -1 })
          .exec((witherr, withdrawdata) => {
            var deposit = [];
            var withdraws = [];
            if (!err && resp) {
              for (var i = 0; i < resp.length; i++) {
                var obj = {
                  createddate: moment(resp[i].createddate).format("lll"),
                  currency: resp[i].currency,
                  address: resp[i].depto,
                  amount: parseFloat(resp[i].depamt).toFixed(8),
                  transaction_id: resp[i].txnid,
                  type: "deposit",
                };
                deposit.push(obj);
              }
              if (!witherr && withdrawdata) {
                for (var j = 0; j < withdrawdata.length; j++) {
                  var obj1 = {
                    createddate: moment(withdrawdata[j].created_at).format(
                      "lll"
                    ),
                    currency: withdrawdata[j].currency_symbol,
                    address: withdrawdata[j].withdraw_address,
                    amount: parseFloat(withdrawdata[j].amount).toFixed(8),
                    transaction_id: withdrawdata[j].txn_id,
                    type: "withdraw",
                  };
                  withdraws.push(obj1);
                }
              }
            }
            var transactions = deposit.concat(withdraws);
            //console.log((transactions);
            transactions.sort(function (a, b) {
              return b.createddate - a.createddate;
            });
            var returnJson = {
              status: true,
              result: transactions,
            };
            res.json(returnJson);
          });
      });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.get("/allpairs", (req, res) => {
  try {
    common.getRedisPairs(function (pairs) {
      console.log(pairs, "pairs")
      if (pairs.length > 0) {
        return res.json({ status: true, data: pairs });
      } else {
        return res.json({ status: false, data: [] });
      }
    });
  } catch (ex) {
    res.json({
      status: false,
      Message: "Something went wrong, please try again",
    });
  }
});

router.post("/release_coin", common.tokenmiddleware, async (req, res) => {
  try {
    var bodyData = req.body;

    if (bodyData.orderId != "") {
      let p2pconfirm = await p2pconfirmOrder
        .findOne({ orderId: bodyData.orderId })
        .exec();
      let p2pdet = await p2pOrdersDB
        .findOne({ orderId: p2pconfirm.map_orderId })
        .exec();
      if (p2pdet) {
        var userId = p2pconfirm.map_userId;
        var own_userId = p2pconfirm.userId;
        if (p2pdet.orderType == "buy") {
          //console.log(("sell userId===", p2pconfirm.map_userId);

          common.getUserBalance(userId, p2pdet.fromCurrency, async function (
            sellBalance
          ) {
            if (sellBalance != null) {
              var selluserBalanceTotal = sellBalance.totalBalance;
              var sellholdTotal = sellBalance.balanceHoldTotal;
              //console.log(("sell user balance===", selluserBalanceTotal);
              //console.log(("sell p2p confirm amount===", p2pconfirm.askAmount);
              //console.log(("sell sellholdTotal===", sellholdTotal);
              if (+selluserBalanceTotal > +p2pdet.totalAmount) {
                var deductAmount = selluserBalanceTotal - p2pconfirm.askAmount;
                deductAmount > 0 ? deductAmount : 0;
                //console.log(("sell p2p deductAmount amount===", deductAmount);
                //console.log(("sell p2p userid===", userId);
                common.updateUserBalances(
                  userId,
                  p2pdet.fromCurrency,
                  deductAmount,
                  selluserBalanceTotal,
                  p2pdet._id,
                  "sell",
                  async function (deductbalance) {
                    if (deductbalance) {
                      let confirmation = await p2pconfirmOrder.findOneAndUpdate(
                        { orderId: req.body.orderId },
                        { $set: { status: 2, dispute_status: 2 } },
                        { new: true }
                      );
                      let filledOrder = await p2pconfirmOrder.find({
                        map_orderId: confirmation.map_orderId,
                      });
                      var total_filled = 0;
                      var status = "";
                      var order_status = "";
                      if (filledOrder.length > 0) {
                        for (var i = 0; i < filledOrder.length; i++) {
                          total_filled += filledOrder[i].askAmount;
                        }
                      }
                      var remaining_amount = p2pdet.totalAmount - total_filled;
                      if (remaining_amount > 0) {
                        status = "partially";
                        order_status = "pending";
                      } else {
                        status = "filled";
                        order_status = "completed";
                      }
                      // var updateHold     =  sellholdTotal - confirmation.askAmount;
                      // console.log("sell sellholdTotal 111===",sellholdTotal)
                      // updateHold = updateHold > 0 ? updateHold : 0;
                      // console.log("sell updateHold===",updateHold)
                      // common.updatep2pHoldAmount(userId,p2pdet.fromCurrency,updateHold, function (hold){});
                      let filled = await p2pOrdersDB.findOneAndUpdate(
                        { orderId: p2pdet.orderId },
                        {
                          $set: {
                            status: status,
                            filledAmount: remaining_amount,
                          },
                        },
                        { new: true }
                      );
                      if (confirmation) {
                        common.getUserBalance(
                          confirmation.userId,
                          confirmation.firstCurrency,
                          async function (userBalance) {
                            if (userBalance != null) {
                              var userBalanceTotal = userBalance.totalBalance;
                              //console.log((
                              //   "buy user balance====",
                              //   userBalanceTotal
                              // );
                              //console.log((
                              //   "buy p2pconfirm balance====",
                              //   p2pconfirm.askAmount
                              // );
                              var updateAmount =
                                userBalanceTotal + p2pconfirm.askAmount;
                              updateAmount > 0 ? updateAmount : 0;
                              //console.log(("buy updateAmount====", updateAmount);
                              common.updateUserBalances(
                                confirmation.userId,
                                confirmation.firstCurrency,
                                updateAmount,
                                userBalanceTotal,
                                p2pdet._id,
                                "sell",
                                async function (balance) {
                                  let from_user = await usersDB.findOne(
                                    { _id: ObjectId(userId) },
                                    { username: 1 }
                                  );
                                  let to_user = await usersDB.findOne(
                                    { _id: ObjectId(confirmation.userId) },
                                    { username: 1 }
                                  );
                                  var obj = {
                                    from_user_id: ObjectId(userId),
                                    to_user_id: ObjectId(to_user._id),
                                    p2porderId: ObjectId(confirmation._id),
                                    from_user_name: from_user.username,
                                    to_user_name: to_user.username,
                                    status: 0,
                                    message:
                                      "" +
                                      from_user.username +
                                      " has released the crypto for your " +
                                      confirmation.askAmount +
                                      " " +
                                      p2pdet.firstCurrency +
                                      " " +
                                      p2pdet.orderType +
                                      " order",
                                    link: "/p2p/chat/" + confirmation.orderId,
                                  };
                                  let notification = await notifyDB.create(obj);
                                  if (notification) {
                                    common.sendResponseSocket(
                                      "success",
                                      notification.message,
                                      "notify",
                                      notification.to_user_id,
                                      function () { }
                                    );
                                    return res.json({
                                      status: true,
                                      message: "Crypto Released Successfully",
                                    });
                                  }
                                }
                              );
                            }
                          }
                        );
                      } else {
                        res.json({
                          status: false,
                          message: "Something went wrong, Please try again",
                        });
                      }
                    }
                  }
                );
              } else {
                res.json({ status: false, message: "Insufficient Balance" });
              }
            } else {
              res.json({
                status: false,
                message: "Something went wrong, Please try again",
              });
            }
          });
        } else {
          let confirmation = await p2pconfirmOrder.findOneAndUpdate(
            { orderId: req.body.orderId },
            { $set: { status: 2, dispute_status: 2 } },
            { new: true }
          );
          let filledOrder = await p2pconfirmOrder.find({
            map_orderId: confirmation.map_orderId,
          });
          var total_filled = 0;
          var status = "";
          var order_status = "";
          if (filledOrder.length > 0) {
            for (var i = 0; i < filledOrder.length; i++) {
              total_filled += filledOrder[i].askAmount;
            }
          }
          var remaining_amount = p2pdet.totalAmount - total_filled;
          if (remaining_amount > 0) {
            status = "partially";
            order_status = "pending";
          } else {
            status = "filled";
            order_status = "completed";
          }
          let filled = await p2pOrdersDB.findOneAndUpdate(
            { orderId: p2pdet.orderId },
            { $set: { status: status, filledAmount: remaining_amount } },
            { new: true }
          );
          common.getUserBalance(
            own_userId,
            p2pdet.fromCurrency,
            async function (sellBalance) {
              if (sellBalance != null) {
                var selluserBalanceTotal = sellBalance.totalBalance;
                var sellholdTotal = sellBalance.balanceHoldTotal;
                //console.log(("sell p2p userid===", own_userId);
                //console.log(("sell user balance===", selluserBalanceTotal);
                //console.log(("sell sellholdTotal===", sellholdTotal);
                var updateHold = sellholdTotal - confirmation.askAmount;
                //console.log(("sell sellholdTotal 111===", sellholdTotal);
                updateHold = updateHold > 0 ? updateHold : 0;
                //console.log(("sell updateHold===", updateHold);
                //console.log(("sell p2p userid===", own_userId);
                common.updatep2pHoldAmount(
                  own_userId,
                  p2pdet.fromCurrency,
                  updateHold,
                  function (hold) { }
                );
                if (confirmation) {
                  common.getUserBalance(
                    confirmation.map_userId,
                    confirmation.firstCurrency,
                    async function (userBalance) {
                      if (userBalance != null) {
                        var userBalanceTotal = userBalance.totalBalance;
                        //console.log(("buyer balance====", userBalanceTotal);
                        var updateAmount =
                          userBalanceTotal + confirmation.askAmount;
                        updateAmount > 0 ? updateAmount : 0;
                        //console.log(("buyer updateAmount====", updateAmount);
                        // console.log(
                        //   "buyer userid====",
                        //   confirmation.map_userId
                        // );
                        common.updateUserBalances(
                          confirmation.map_userId,
                          confirmation.firstCurrency,
                          updateAmount,
                          userBalanceTotal,
                          p2pdet._id,
                          "sell",
                          async function (balance) {
                            let from_user = await usersDB.findOne(
                              { _id: ObjectId(userId) },
                              { username: 1 }
                            );
                            let to_user = await usersDB.findOne(
                              { _id: ObjectId(confirmation.map_userId) },
                              { username: 1 }
                            );
                            var obj = {
                              from_user_id: ObjectId(userId),
                              to_user_id: ObjectId(to_user._id),
                              p2porderId: ObjectId(confirmation._id),
                              from_user_name: from_user.username,
                              to_user_name: to_user.username,
                              status: 0,
                              message:
                                "" +
                                from_user.username +
                                " has released the crypto for your " +
                                confirmation.askAmount +
                                " " +
                                p2pdet.firstCurrency +
                                " " +
                                p2pdet.orderType +
                                " order",
                              link: "/p2p/chat/" + confirmation.orderId,
                            };
                            let notification = await notifyDB.create(obj);
                            if (notification) {
                              common.sendResponseSocket(
                                "success",
                                notification.message,
                                "notify",
                                notification.to_user_id,
                                function () { }
                              );
                              return res.json({
                                status: true,
                                message: "Crypto Released Successfully",
                              });
                            }
                          }
                        );
                      }
                    }
                  );
                } else {
                  res.json({
                    status: false,
                    message: "Something went wrong, Please try again",
                  });
                }
              }
            }
          );
        }
      }
    } else {
      res.json({
        status: false,
        message: "Something went wrong, Please try again",
      });
    }
  } catch (e) {
    //console.log(("catch exception====", e);
    res.json({
      status: false,
      message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/updateuserBalance", (req, res) => {
  try {
    //console.log(("updateuserBalance req.body===", req.body);
    var userid = req.body.userid;
    var currency = req.body.currency;
    var amount = +req.body.amount;
    if (userid != null && currency != null && amount != null) {
      common.getbalance(userid, currency, function (userbalance) {
        //console.log(("userbalance===", userbalance);
        var curBalance = +userbalance.amount;
        var Balance = curBalance + amount;
        //console.log(("curBalance===", curBalance);
        //console.log(("Balance===", Balance);
        common.updateDepositBalances(
          userid,
          currency,
          Balance,
          curBalance,
          userid,
          "admin_edit",
          function (balanceupdate) {
            //console.log(("balanceupdate===", balanceupdate);
            return res.json({
              status: true,
              Message: "Balance updated successfully",
            });
          }
        );
      });
    } else {
      return res.json({
        status: false,
        Message: "Please enter required fields",
      });
    }
  } catch (ex) {
    return res.json({ status: false, Message: "Something went wrong" });
  }
});
// change user tfa status
router.post("/changeTFAstatus", common.tokenmiddleware, (req, res) => {
  try {
    usersDB
      .findOne({ _id: mongoose.Types.ObjectId(req.body._id) })
      .select({
        mobileNumber: 1,
        tfaenablekey: 1,
        email: 1,
        tfastatus: 1,
        username: 1,
      })
      .exec(function (userErr, userRes) {
        if (!userErr && userRes) {
          if (userRes.tfastatus == 1) {
            var usermail =
              userRes.email != null
                ? common.decrypt(userRes.email)
                : userRes.mobileNumber;
            var qrName = "Renode " + usermail;
            var secret = speakeasy.generateSecret({
              length: 10,
              name: qrName,
            });
            var url = common.getQrUrl(secret.otpauth_url);
            var updatedRule = {
              tfastatus: 0,
              tfaenablekey: secret.base32,
              tfa_url: url,
            };
            usersDB
              .updateOne(
                { _id: mongoose.Types.ObjectId(req.body._id) },
                { $set: updatedRule }
              )
              .exec(function (errUpdate, resUpdate) {
                if (resUpdate.ok == 1) {
                  mailtempDB
                    .findOne({ key: "tfa_enable_alert" })
                    .exec(function (etemperr, etempdata) {
                      var msg = "Your TFA has been disabled";
                      var etempdataDynamic = etempdata.body
                        .replace(/###USERNAME###/g, userRes.username)
                        .replace(/###MESSAGE###/g, msg);
                      mail.sendMail(
                        {
                          from: {
                            name: process.env.FROM_NAME,
                            address: process.env.FROM_EMAIL,
                          },
                          to: usermail,
                          subject: etempdata.Subject,
                          html: etempdataDynamic,
                        },
                        function (mailRes) {
                          res.json({
                            status: true,
                            message: "2FA has been disabled",
                          });
                        }
                      );
                    });
                } else {
                  return res.json({
                    status: false,
                    message: "2FA has not updated",
                  });
                }
              });
          } else {
            var updatedRule = { tfastatus: 1 };
            usersDB
              .updateOne(
                { _id: mongoose.Types.ObjectId(req.body._id) },
                { $set: updatedRule }
              )
              .exec(function (errUpdate, resUpdate) {
                if (resUpdate.ok == 1) {
                  mailtempDB
                    .findOne({ key: "tfa_enable_alert" })
                    .exec(function (etemperr, etempdata) {
                      var msg = "Your TFA has been enabled";
                      var etempdataDynamic = etempdata.body
                        .replace(/###USERNAME###/g, userRes.username)
                        .replace(/###MESSAGE###/g, msg);
                      mail.sendMail(
                        {
                          from: {
                            name: process.env.FROM_NAME,
                            address: process.env.FROM_EMAIL,
                          },
                          to: usermail,
                          subject: etempdata.Subject,
                          html: etempdataDynamic,
                        },
                        function (mailRes) {
                          res.json({
                            status: true,
                            message: "2FA has been enabled",
                          });
                        }
                      );
                    });
                } else {
                  return res.json({
                    status: false,
                    message: "2FA has not updated",
                  });
                }
              });
          }
        } else {
        }
      });
  } catch (e) {
    res.json({
      status: false,
      message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/kyc_remainder", common.tokenmiddleware, (req, res) => {
  try {
    usersDB
      .findOne({ _id: mongoose.Types.ObjectId(req.body._id) })
      .select({ email: 1, kycstatus: 1, username: 1 })
      .exec(function (userErr, userRes) {
        if (!userErr && userRes) {
          if (userRes.kycstatus == 0 || userRes.kycstatus == 3) {
            var usermail = common.decrypt(userRes.email);
            mailtempDB
              .findOne({ key: "kyc_remainder" })
              .exec(function (etemperr, etempdata) {
                var etempdataDynamic = etempdata.body.replace(
                  /###USERNAME###/g,
                  userRes.username
                );
                mail.sendMail(
                  {
                    from: {
                      name: process.env.FROM_NAME,
                      address: process.env.FROM_EMAIL,
                    },
                    to: usermail,
                    subject: etempdata.Subject,
                    html: etempdataDynamic,
                  },
                  function (mailRes) {
                    res.json({ status: true, message: "remainder sent" });
                  }
                );
              });
          }
        }
      });
  } catch (e) {
    res.json({
      status: false,
      message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/blockip_check", async (req, res) => {
  try {
    let ip_address =
      req.header("x-forwarded-for") || req.connection.remoteAddress;
    var dateNow = new Date();
    var blockip_check = await blockipDB.findOne({ ip_address: ip_address });
    if (blockip_check != null) {
      if (blockip_check.expireTime >= dateNow) {
        res.json({ status: true, Message: "IP Blocked" });
      } else {
        var loginattempt = await loginAttemptsDB.findOne({
          ip_address: ip_address,
        });
        if (loginattempt != null) {
          var attempt_update = await loginAttemptsDB.deleteOne({
            ip_address: ip_address,
          });
          var blockip_update = await blockipDB.deleteOne({
            ip_address: ip_address,
          });
          if (attempt_update && blockip_update) {
            res.json({ status: false });
          }
        } else {
          res.json({ status: false });
        }
      }
    } else {
      res.json({ status: false });
    }
  } catch (ex) {
    res.json({
      status: false,
      message: "something went wrong, please try again",
    });
  }
});

router.post(
  "/cancel_confirm_order",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var orderId = req.body.orderId;
      var orderDetail = await p2pconfirmOrder.findOne({ orderId: orderId });

      if (orderDetail) {
        var p2pdetail = await p2pOrdersDB.findOne({
          _id: ObjectId(orderDetail.p2p_orderId),
        });
        var processAmount = 0;
        processAmount = p2pdetail.processAmount - orderDetail.askAmount;
        processAmount = processAmount < 0 ? 0 : processAmount;
        let p2pupdate = await p2pOrdersDB.updateOne(
          { _id: ObjectId(orderDetail.p2p_orderId) },
          { $set: { processAmount: processAmount, order_status: "pending" } }
        );
        let p2pconfirm = await p2pconfirmOrder.updateOne(
          { orderId: orderId },
          { $set: { status: 3, dispute_status: 2 } }
        );
        if (p2pupdate && p2pconfirm) {
          // common.sendCommonSocket(
          //   "success",
          //   "ordercancel",
          //   "ordercancel",
          //   function () {});
          common.sendResponseSocket(
            "success",
            "Order cancelled by admin",
            "ordercancel",
            p2pconfirm.userId,
            function () { }
          );
          common.sendResponseSocket(
            "success",
            "Order cancelled by admin",
            "ordercancel",
            p2pconfirm.map_userId,
            function () { }
          );

          return res.json({
            status: true,
            message: "Order cancelled successfully",
          });
        } else {
          return res.json({
            status: false,
            message: "Something went wrong, please try again",
          });
        }
      } else {
        return res.json({ status: false, message: "Invalid Order" });
      }
    } catch (error) {
      //console.log(("-=-errorerror=-=-=-", error);
      return res.json({
        status: false,
        message: "Internal server error, Please try later!",
      });
    }
  }
);

router.post("/key_authentication", common.tokenmiddleware, async (req, res) => {
  try {
    var response = req.body;
    if (!isNaN(response.tfa_code) && !isNaN(response.tfa_code)) {
      var otp_update = await adminDB.findOne({
        _id: mongoose.Types.ObjectId(req.userId),
        key_auth_otp: response.key_auth_otp,
      });
      var dateNow = new Date();
      if (otp_update.key_auth_expireTime >= dateNow) {
        if (otp_update && otp_update !== null) {
          var verified = speakeasy.totp.verify({
            secret: otp_update.tfa_code,
            encoding: "base32",
            token: response.tfa_code,
          });
          if (verified) {
            return res.json({
              status: true,
              message: "Successfully Authenticated !",
            });
          } else {
            return res.json({ status: false, message: "Invalid 2FA!" });
          }
        } else {
          return res.json({ status: false, message: "Invalid OTP! " });
        }
      } else {
        return res.json({ status: false, message: "Email OTP is Expired" });
      }
    } else {
      return res.json({ status: false, message: "Invalid Format" });
    }
  } catch (error) {
    return res.json({
      status: false,
      message: "Internal server error, Please try later!",
    });
  }
});
router.get("/get_otp", common.tokenmiddleware, async (req, res) => {
  try {
    let otp = common.generate_otp();
    var date = new Date();
    var expireTime = new Date(date.getTime() + 15 * 60000);
    var otp_update = await adminDB.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(req.userId) },
      { key_auth_otp: otp, key_auth_expireTime: expireTime },
      { new: true }
    );
    if (otp_update) {
      var etempdata = await mailtempDB.findOne({ key: "adminlogin_OTP" });
      var etempdataDynamic = etempdata.body.replace(/###OTP###/g, otp);
      var tomail = "";
      if (otp_update.type == 1) {
        tomail = process.env.FROM_EMAIL;
      } else {
        // tomail = req.body.email;
      }
      var mailRes = await mail.sendMail({
        from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
        to: process.env.ADMIN_EMAIL,
        subject: etempdata.Subject,
        html: etempdataDynamic,
      });
      res.status(200).json({
        status: true,
        Message: "verification OTP sent to your mail, please check your mail",
      });
    } else {
      res.status(400).json({ status: false, Message: "OTP Not Sent" });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});
router.post("/getprivatekey", common.tokenmiddleware, async (req, res) => {
  try {
    var response = req.body;
    // console.log("response===",response)
    var address = await cryptoAddressDB
      .find(
        { user_id: response.userId },
        { privateKey: 1, currency: 1, user_id: 1 }
      )
      .populate("currency", "currencyName")
      .populate("user_id", "username");
    // console.log("address====",address)
    if (address && address !== null) {
      for (let index = 0; index < address.length; index++) {
        const element = address[index];
        address[index]["privateKey"] =
          "216418ce259d192e" +
          common.decryptionLevel(element.privateKey) +
          "e1929049a207899b";
      }
      return res.status(200).json({
        status: true,
        Message: "Successfully Retrieved",
        data: address,
      });
    } else {
      return res
        .status(400)
        .json({ status: false, Message: "Private Key Has Not Retrieved" });
    }
  } catch (error) {
    //console.log((error, "===error");
    return res.status(500).json({
      status: false,
      Message: "Something went wrong,Please try again later",
    });
  }
});

router.get("/rptc_address", (req, res) => {
  common.rptc_address(function (response) {
    return res.json(response);
  });
});

router.post("/manual_deposit", common.tokenmiddleware, async (req, res) => {
  try {
    if (
      req.body.amount != "" &&
      req.body.amount != undefined &&
      req.body.amount != null
    ) {
      if (
        req.body.userId != "" &&
        req.body.userId != undefined &&
        req.body.userId != null
      ) {
        var userId = req.body.userId;
        var currency_symbol = "INR";
        let getCurrecy = await currencyDB
          .findOne(
            { currencySymbol: currency_symbol },
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
                    proofImage: "",
                    currency_id: getCurrecy._id,
                    currency: getCurrecy.currencySymbol,
                    userId: userId,
                    aprooveStatus: "1",
                    transactionID: Math.floor(Math.random() * 100000000 + 1),
                  };
                  let result = await manualDeposit.create(obj);
                  if (result) {
                    var walletupdate = await userWalletDB.updateOne(
                      {
                        $and: [
                          { userId: mongoose.mongo.ObjectId(result.userId) },
                          { "wallets.currencySymbol": result.currency },
                        ],
                      },
                      {
                        $inc: { "wallets.$.amount": parseFloat(result.amount) },
                      },
                      { multi: true }
                    );
                    if (walletupdate) {
                      res.status(200).json({
                        status: true,
                        Message: "Amount Deposited Successfully",
                      });
                    } else {
                      res.status(400).json({
                        status: false,
                        Message: "Please try again later1",
                      });
                    }
                  } else {
                    return res.status(200).send({
                      status: false,
                      Message: "Please try again later2",
                    });
                  }
                } else {
                  return res.status(200).json({
                    status: false,
                    Message: "User bank details not updated",
                    currency: currency_symbol,
                    redirect: "Bankdetails",
                  });
                }
              } else if (getuser.kycstatus == 2) {
                return res.status(200).json({
                  status: false,
                  Message: "User kyc verification is pending",
                  currency: currency_symbol,
                  redirect: "kyc",
                });
              } else if (getuser.kycstatus == 3) {
                return res.status(200).json({
                  status: false,
                  Message: "User kyc is rejected",
                  currency: currency_symbol,
                  redirect: "kyc",
                });
              } else {
                return res.status(200).json({
                  status: false,
                  Message: "User kyc is not uploaded",
                  currency: currency_symbol,
                  redirect: "kyc",
                });
              }
            } else {
              return res
                .status(200)
                .send({ status: false, Message: "Please try again later 111" });
            }
          } else {
            return res
              .status(200)
              .send({ status: false, Message: "Please try again later3" });
          }
        } else {
          return res
            .status(200)
            .send({ status: false, Message: "Please try again later4" });
        }
      } else {
        return res
          .status(400)
          .send({ status: false, Message: "Username is must" });
      }
    } else {
      return res
        .status(400)
        .send({ status: false, Message: "Enter must deposited amount" });
    }
  } catch (error) {
    return res.status(500).send({
      status: false,
      Message: "Internal server error!, Please try again later",
    });
  }
});
router.post("/viewprivatekey", common.tokenmiddleware, async (req, res) => {
  try {
    var respo = req.body;
    var userid = req.userId;
    var privatekey = await adminWalletDB
      .findOne(
        { userId: userid, type: 1 },
        { wallets: { $elemMatch: { currencySymbol: respo.currencysymbol } } }
      )
      .populate(
        "wallets.currencyId",
        "erc20token trc20token bep20token rptc20token currencyType"
      );
    if (privatekey !== null) {
      if (privatekey.wallets[0].currencyId.currencyType == "1") {
        privatekey.wallets[0].admin_token_name = common.decryptionLevel(
          privatekey.wallets[0].admin_token_name
        );
      } else {
        if (privatekey.wallets[0].currencyId.bep20token == "1") {
          var addressdetail = await adminWalletDB.findOne(
            { userId: userid, type: 1 },
            { wallets: { $elemMatch: { currencySymbol: "BNB" } } }
          );
          if (addressdetail) {
            privatekey.wallets[0].admin_token_name = common.decryptionLevel(
              addressdetail.wallets[0].admin_token_name
            );
          }
        } else if (privatekey.wallets[0].currencyId.erc20token == "1") {
          var addressdetail = await adminWalletDB.findOne(
            { userId: userid, type: 1 },
            { wallets: { $elemMatch: { currencySymbol: "ETH" } } }
          );
          if (addressdetail) {
            privatekey.wallets[0].admin_token_name = common.decryptionLevel(
              addressdetail.wallets[0].admin_token_name
            );
          }
        } else if (privatekey.wallets[0].currencyId.trc20token == "1") {
          var addressdetail = await adminWalletDB.findOne(
            { userId: userid, type: 1 },
            { wallets: { $elemMatch: { currencySymbol: "TRX" } } }
          );
          if (addressdetail) {
            privatekey.wallets[0].admin_token_name = common.decryptionLevel(
              addressdetail.wallets[0].admin_token_name
            );
          }
        } else if (privatekey.wallets[0].currencyId.rptc20token == "1") {
          var addressdetail = await adminWalletDB.findOne(
            { userId: userid, type: 1 },
            { wallets: { $elemMatch: { currencySymbol: "RPTC" } } }
          );
          if (addressdetail) {
            privatekey.wallets[0].admin_token_name = common.decryptionLevel(
              addressdetail.wallets[0].admin_token_name
            );
          }
        }
      }
      return res.status(200).send({
        status: true,
        message: "Address Found Successfully",
        data: privatekey,
      });
    } else {
      return res
        .status(400)
        .send({ status: false, message: "Address Not Found" });
    }
  } catch (error) {
    return res.status(500).send({
      status: false,
      Message: "Internal server error!, Please try again later",
    });
  }
});

router.get("/getbankDetails", common.tokenmiddleware, async (req, res) => {
  try {
    var bankdetails = await bankdetail
      .find({})
      .populate("userid", "username")
      .sort({ _id: -1 });
    if (bankdetails.length > 0) {
      return res.json({ status: true, Message: bankdetails });
    } else {
      return res.json({ status: false, Message: [] });
    }
  } catch (err) {
    return res.json({
      status: false,
      message: "Internal server error, Please try later!",
    });
  }
});

router.post("/userbalanceEditGet", (req, res) => {
  var userid = req.body.userId;
  userWalletDB
    .aggregate([
      { $unwind: "$wallets" },
      {
        $lookup: {
          from: "currency",
          localField: "wallets.currencyId",
          foreignField: "_id",
          as: "currency",
        },
      },
      { $unwind: "$currency" },
      {
        $match: { userId: mongoose.Types.ObjectId(userid) },
      },
      {
        $project: {
          currencyname: "$currency.currencySymbol",
          currency_id: "$currency._id",
          balance: "$wallets.amount",
          image: "$currency.Currency_image",
        },
      },
    ])
    .exec((err, data) => {
      //console.log(("get wallet errr====", err);
      //console.log(("get wallet data====", data);
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        var balancedata = [];
        for (var i = 0; i < data.length; i++) {
          var obj = {
            currencyname: data[i].currencyname,
            balance: parseFloat(data[i].balance).toFixed(8),
            image: data[i].image,
            currency_id: data[i].currency_id,
          };
          balancedata.push(obj);
        }
        res.json({
          status: true,
          Message: balancedata,
        });
        //console.log((balancedata, "-=-=-=-balancedata");
      }
    });
});

router.get("/activatedUserList", (req, res) => {
  try {
    usersDB
      .find(
        { status: 1 },
        {
          username: 1,
          _id: 1,
          email: 1,
          verifyEmail: 1,
          status: 1,
          createdDate: 1,
          tfastatus: 1,
          kycstatus: 1,
          mobileNumber: 1,
        }
      )
      .sort({ _id: -1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          userArray = [];
          for (let dval of data) {
            var obj = {
              _id: dval._id,
              username: dval.username,
              email:
                dval.email != null
                  ? common.decrypt(dval.email)
                  : dval.mobileNumber,
              status: dval.status,
              datetime: dval.createdDate,
              tfa_status: dval.tfastatus,
              kyc_status: dval.kycstatus,
            };
            userArray.push(obj);
          }
          res.json({
            status: true,
            data: userArray,
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

router.get("/allCurrencyListCrypto", (req, res) => {
  try {
    currencyDB.find({ coinType: "1" }).exec((err, currencyData) => {
      if (!err) {
        const data = [];
        for (var i = 0; i < currencyData.length; i++) {
          var date = currencyData[i].modifiedDate;
          var obj = {
            _id: currencyData[i]._id,
            id: i + 1,
            name: currencyData[i].currencyName,
            symbol: currencyData[i].currencySymbol,
            Currency_image: currencyData[i].Currency_image,
            status: currencyData[i].status,
            date: moment(date).format("lll"),
            currencyType: currencyData[i].currencyType,
          };
          data.push(obj);
        }
        BINANCEexchange.CurrencyConversion();
        return res.json({
          status: true,
          data: data,
          Message: "Currency updated successfully",
        });
      } else {
        return res.json({
          status: false,
          data: {},
          Message: "Something Went Wrong. Please Try Again later",
        });
      }
    });
  } catch (error) { }
});

router.post("/report_privatekey", common.tokenmiddleware, async (req, res) => {
  try {
    var respo = req.body;
    var userid = req.userId;
    var privatekey = await adminWalletDB
      .findOne({ userId: userid, type: 1 })
      .populate(
        "wallets.currencyId",
        "erc20token trc20token bep20token rptc20token currencyType"
      );
    if (privatekey !== null) {
      var private_keys = [];
      var wallets = privatekey.wallets;
      //console.log(("wallets===", wallets);
      if (wallets.length > 0) {
        for (var i = 0; i < wallets.length; i++) {
          if (wallets[i].currencyId != null) {
            if (
              wallets[i].currencyId.currencyType == "1" &&
              wallets[i].currencySymbol != "BTC"
            ) {
              var obj = {
                symbol: wallets[i].currencySymbol,
                key: common.decryptionLevel(wallets[i].admin_token_name),
              };
              private_keys.push(obj);
            }
          }
        }
      }

      //console.log(("privatekey===", private_keys);
      if (private_keys.length > 0) {
        return res.json({ status: true, data: private_keys });
      } else {
        return res.json({ status: false, message: "Keys Not Found" });
      }
    } else {
      return res.json({ status: false, message: "Address Not Found" });
    }
  } catch (error) {
    //console.log(("catch priv key error===", error);
    common.create_log(error.message, function (resp) { });
    return res.json({
      status: false,
      message: "Internal server error!, Please try again later",
    });
  }
});

router.get("/profit_wallet", async (req, res) => {
  try {
    var options = [
      {
        $lookup: {
          from: "currency",
          localField: "currencyid",
          foreignField: "_id",
          as: "currencydata",
        },
      },
      {
        $unwind: {
          path: "$currencydata",
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
            currency: "$currencydata._id",
          },
          profit_sum: { $sum: "$fees" },
          currencySymbol: {
            "$first": "$currencydata.currencySymbol"
          },
          image: {
            "$first": "$currencydata.Currency_image"
          }
        },
      }
    ];

    profitDB.aggregate(options).exec(async function (error, data) {
      console.log("profitdata---", data);
      if (data.length > 0) {
        return res.json({ status: true, data: data });
      } else {
        return res.json({ status: true, data: [] });
      }
    });
  } catch (error) {
    return res.json({ status: false });
  }
});


router.post('/addsitesettings', async (req, res) => {
  try {
    const {
      socialMediaLinks,

      contactInformation,
      miscellaneous,
      footerContent,
      depositStatus,
      withdrawalStatus,
      siteMaintenance,
      siteLogo,
      favicon
    } = req.body;

    let settings = await AdminSettings.findOne();

    if (settings) {
      // Data exists, update it in MongoDB
      settings.facebook = facebook || settings.facebook;
      settings.twitter = twitter || settings.twitter;
      settings.linkedIn = linkedIn || settings.linkedIn;
      settings.instagram = instagram || settings.instagram;
      settings.reddit = reddit || settings.reddit;
      settings.bitcointalk = bitcointalk || settings.bitcointalk;
      settings.whatsappNumber = whatsappNumber || settings.whatsappNumber;
      settings.email = email || settings.email;
      settings.copyrightText = copyrightText || settings.copyrightText;
      settings.coinMarketCap = coinMarketCap || settings.coinMarketCap;
      settings.coinGecko = coinGecko || settings.coinGecko;
      settings.telegram = telegram || settings.telegram;
      settings.footerContent = footerContent || settings.footerContent;
      settings.depositStatus = depositStatus || settings.depositStatus;
      settings.withdrawalStatus = withdrawalStatus || settings.withdrawalStatus;
      settings.siteStatus = siteStatus || settings.siteStatus;
      settings.depositMaintenance = depositMaintenance || settings.depositMaintenance;
      settings.withdrawalMaintenance = withdrawalMaintenance || settings.withdrawalMaintenance;
      settings.siteMaintenance = siteMaintenance || settings.siteMaintenance;
      settings.siteLogo = siteLogo || settings.siteLogo;
      settings.favicon = favicon || settings.favicon;
      settings.modifiedDate = Date.now();

      await settings.save();

      // Update the cache in Redis
      client.set("adminSettings", JSON.stringify(settings), 'EX', 3600); // Set cache with an expiration of 1 hour

      res.json({ status: true, message: 'Settings updated successfully', data: settings });
    } else {
      // No data exists, create a new entry in MongoDB
      settings = new AdminSettings({
        socialMediaLinks,
        contactInformation,
        miscellaneous,
        footerContent,
        depositStatus,
        withdrawalStatus,
        siteMaintenance,
        siteLogo,
        favicon
      });

      await settings.save();

      // Add the new data to Redis cache
      client.set("adminSettings", JSON.stringify(settings)); // Set cache with an expiration of 1 hour

      res.json({ status: true, message: 'Settings added successfully', data: settings });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
});

// GET route to retrieve the settings
router.get('/getsitesettings', async (req, res) => {
  try {

    // Check if the data exists in Redis cache
    client.get("adminSettings", async (err, data) => {
      if (err) throw err;

      if (data) {
        // Data exists in cache, return it
        return res.json({ status: true, data: JSON.parse(data) });
      } else {
        // Data not in cache, fetch from MongoDB
        const settings = await AdminSettings.findOne();

        if (settings) {
          // Cache the fetched data in Redis
          client.set("adminSettings", JSON.stringify(settings)); // Set cache with an expiration of 1 hour
          return res.json({ status: true, data: settings });
        } else {
          return res.status(404).json({ status: false, message: 'Settings not found' });
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
});

module.exports = router;
