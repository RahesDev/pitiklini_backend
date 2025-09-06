const request = require("request");
const axios = require("axios");
const cron = require("node-cron");
const converter = require("hex2dec");
const https = require("https");

const currencyDB = require("../schema/currency");
const addressDB = require("../schema/userCryptoAddress");
const usersDB = require("../schema/users");
const mailtempDB = require("../schema/mailtemplate");
const adminwallet = require("../schema/admin_wallet");
const depositDB = require("../schema/deposit");
const common = require("../helper/common");
const mail = require("../helper/mailhelper");
const admin_wallet = require("../schema/admin_wallet");
var adminWalletDB = require("../schema/adminWallet");
var fs = require("fs");
var mongoose = require("mongoose");
const redisHelper = require("../redis-helper/redisHelper");

const key = require("../config/key");
const redis = require("redis");
const client = redis.createClient(key.redisdata);
const notifydb = require("../schema/notification");
var mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

function deposit_mail(user_id, amount, symbol) {
  usersDB.findOne({_id: user_id}, {username: 1, email: 1}, function (
    err,
    resdata
  ) {
    var msg = "Deposit on " + amount + " " + symbol + " was confirmed";
    resdata.email = common.decrypt(resdata.email);
    mailtempDB
      .findOne({key: "confirm_transaction"})
      .exec(function (etemperr, etempdata) {
        var etempdataDynamic = etempdata.body
          .replace(/###USERNAME###/g, resdata.username)
          .replace(
            /###MESSAGE###/g,
            "Deposit on " + amount + " " + symbol + " was confirmed"
          );
        mail.sendMail(
          {
            from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
            to: resdata.email,
            subject: etempdata.Subject,
            html: etempdataDynamic,
          },
          function (mailRes) {}
        );
      });
  });
}

let tron_deposit = (exports.tron_deposit = (address) => {
  try {
    console.log("call here tron",address);
    var obj = {
      address: address,
    };
    common.trx_balance(obj, function (balRes) {
      if (balRes.status) {
        var tronbal = balRes.balance / 1000000;
        var tronaddress = address;
        // console.log("tronbal", tronbal);
        // console.log("tronaddress",tronaddress)
        if (+tronbal > 0) {
          //  console.log("11111");
          https
            .get(
              "https://"+process.env.TRX_API+"/v1/accounts/" +
                tronaddress +
                "/transactions?only_confirmed=true&only_to=true",
              (resp) => {
                let data = "";
                resp.on("data", (chunk) => {
                  data += chunk;
                });
                resp.on("end", () => {
                  if (IsJsonString(data)) {
                    var response = JSON.parse(data);
                    // console.log('tron ::::::::::',response,'tron');
                    // console.log('tron data ::::::::::',response.data,'tron');
                    // console.log('tron data ::::::::::',response.data.length,'tron');
                    try {
                      if (response.data.length > 0) {
                        return trx_deposit(response.data, 0);
                      }
                    } catch (err) {
                      // console.log('TRX DEPOSIT CRON ERROR REASON ):', err);
                    }
                  }
                });
              }
            )
            .on("error", (err) => {
              console.log("Error: " + err.message);
            });
        }
      }
    });
  } catch (e) {
    console.log("TRON deposit ERROR REASON ):", e.message);
  }
});

function trx_deposit(response, inc) {
  console.log("response.length===", response.length);
  console.log("response[inc]---", inc);
  if (response.length > inc) {
    // console.log("call 1111====");
    if (response[inc]) {
      var transaction = response[inc];
      // console.log("transaction====",transaction);
      // console.log("transaction====",transaction.raw_data.contract);
      // console.log("transaction type====",transaction.raw_data.contract[0].type);
      // console.log("transaction parameter====",transaction.raw_data.contract[0].parameter);
      var txn_type = transaction.raw_data.contract[0].type;
      // console.log("txn_type====",txn_type);
      if (txn_type == "TransferContract") {
        //console.log("call TransferContract====");
        var currencytable = {
          currencySymbol: "TRX",
        };
        currencyDB.findOne(currencytable).exec(function (err3, currencydata) {
          if (currencydata) {
            var txn_obj = transaction.raw_data.contract[0].parameter;
            var address = txn_obj.value.to_address;
            //console.log("tron obj=",txn_obj);
            var txid = transaction.txID;
            var value = txn_obj.value.amount;
            var currency_id = currencydata._id;
            common.getadminwallet("TRX", function (adminaddress) {
              if(adminaddress != null)
              {
                if(adminaddress.trx_hexaddress.toLowerCase() != txn_obj.value.owner_address.toLowerCase())
                {
                  if (currencydata.currencySymbol == "TRX") {
                    var tron_balance = value / Math.pow(10, currencydata.coinDecimal);
                    addressDB
                      .find({
                        trx_hexaddress: address,
                      })
                      .exec(function (err, userdata) {
                        // console.log("userdata====", userdata);
                        if (userdata != null && userdata.length > 0) {
                          usersDB
                            .findOne({_id: userdata[0].user_id})
                            .exec(function (err4, siteuser) {
                              //console.log("siteuser====", siteuser);
                              if (siteuser != null) {
                                if (userdata.length > 0) {
                                  depositDB
                                    .find({
                                      userId: userdata[0].user_id,
                                      txnid: txid,
                                    })
                                    .exec(function (err2, depositData) {
                                      if (depositData.length == 0) {
                                        if (currencydata) {
                                          var curr_id = currencydata._id;
                                          common.getUserBalance(
                                            userdata[0].user_id,
                                            currencydata._id,
                                            function (balance) {
                                              //console.log("usernalance", balance);
                                              var curBalance = balance.totalBalance;
                                              var Balance =
                                                balance.totalBalance + tron_balance;
                                              var payments = {
                                                userId: userdata[0].user_id,
                                                currency: curr_id,
                                                depamt: +tron_balance,
                                                depto: userdata[0].address,
                                                txnid: txid,
                                              };
                                              console.log("TRX USER", payments);
                                              var transactions = {
                                                user_id: userdata[0].user_id,
                                                currency_id: curr_id,
                                                currency_symbol:
                                                  currencydata.currencySymbol,
                                                type: "Deposit",
                                                address: userdata[0].address,
                                                amount: +tron_balance,
                                                fees: 0,
                                                status: "Completed",
                                                txn_id: txid,
                                              };
                                              console.log("txn USER", transactions);
                                              depositDB.create(payments, function (
                                                dep_err,
                                                dep_res
                                              ) {
                                                if (!dep_err) {
                                                  common.updateUserBalances(
                                                    userdata[0].user_id,
                                                    currencydata._id,
                                                    Balance,
                                                    curBalance,
                                                    dep_res._id,
                                                    "deposit",
                                                    async function (balance) {
                                                      var obj = {
                                                        to_user_id: ObjectId(
                                                          userdata[0].user_id
                                                        ),
                                                        to_user_name:
                                                          userdata[0].username,
                                                        status: 0,
                                                        message:
                                                          "" +
                                                          tron_balance +
                                                          " " +
                                                          currencydata.currencySymbol +
                                                          " received successfully",
                                                        link: "/notificationHistory",
                                                      };
      
                                                      let notification = await notifydb.create(
                                                        obj
                                                      );
                                                      var reciver = common.decrypt(
                                                        siteuser.email
                                                      );
                                                      var msg =
                                                        "Deposit on " +
                                                        tron_balance +
                                                        " " +
                                                        currencydata.currencySymbol +
                                                        " was confirmed";
                                                      mailtempDB
                                                        .findOne({
                                                          key: "confirm_transaction",
                                                        })
                                                        .exec(function (
                                                          etemperr,
                                                          etempdata
                                                        ) {
                                                          var etempdataDynamic = etempdata.body
                                                            .replace(
                                                              /###USERNAME###/g,
                                                              siteuser.username
                                                            )
                                                            .replace(
                                                              /###MESSAGE###/g,
                                                              msg
                                                            );
                                                          mail.sendMail(
                                                            {
                                                              from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
                                                              to: reciver,
                                                              subject:
                                                                etempdata.Subject,
                                                              html: etempdataDynamic,
                                                            },
                                                            function (mailRes) {
                                                              console.log(
                                                                mailRes,
                                                                "======mailREs===========================",
                                                                reciver
                                                              );
                                                            }
                                                          );
                                                        });
                                                    }
                                                  );
                                                }
                                              });
                                            }
                                          );
                                        }
                                        var inc2 = inc + 1;
                                        trx_deposit(response, inc2);
                                      } else {
                                        var inc2 = inc + 1;
                                        trx_deposit(response, inc2);
                                      }
                                    });
                                }
                              } else {
                                common.getadminwallet("TRX", function (adminres) {
                                  var adminbalance = adminres.amount;
                                  var admin_address = adminres.address;
                                  if (admin_address == address) {
                                    // console.log("call eth admin")
                                    if (currencydata.currencySymbol == "TRX") {
                                      var tron_balance =
                                        value /
                                        Math.pow(10, currencydata.coinDecimal);
                                      depositDB
                                        .find({
                                          txnid: txid,
                                        })
                                        .exec(function (dep_whr, dep_det) {
                                          if (!dep_whr) {
                                            if (dep_det.length == 0) {
                                              var payments = {
                                                currency: currency_id,
                                                depamt: +tron_balance,
                                                depto: address,
                                                type: 1,
                                                txnid: txid,
                                              };
                                              //  console.log(currencydata.currencySymbol + ' admin', payments);
                                              var transactions = {
                                                currency_id: currency_id,
                                                currency_symbol:
                                                  currencydata.currencySymbol,
                                                type: "Deposit",
                                                address: address,
                                                amount: +tron_balance,
                                                fees: 0,
                                                status: "Completed",
                                                txn_id: txid,
                                              };
                                              console.log(
                                                "admin txn USER",
                                                transactions
                                              );
                                              depositDB.create(payments, function (
                                                dep_err,
                                                dep_res
                                              ) {
                                                if (!dep_err && dep_res) {
                                                  // var total = adminbalance + tron_balance;
                                                  // common.updateAdminBalance(currencydata._id, +total, function (balance) { });
      
                                                  common.tron_balance(
                                                    {address: transaction.to},
                                                    function (adminbalanceRes) {
                                                      if (adminbalanceRes.status) {
                                                        var admin_tron = +adminbalanceRes.balance;
                                                        common.updateAdminBalance(
                                                          currencydata.currencySymbol,
                                                          admin_tron,
                                                          function (balance) {}
                                                        );
                                                      }
                                                    }
                                                  );
                                                }
                                              });
                                            } else {
                                              var inc2 = inc + 1;
                                              trx_deposit(response, inc2);
                                            }
                                          }
                                        });
                                    }
                                  }
                                });
                              }
                            });
                        } else {
                          var inc2 = inc + 1;
                          trx_deposit(response, inc2);
                        }
                      });
                  } else {
                    var inc2 = inc + 1;
                    trx_deposit(response, inc2);
                  }
                }
                else
                {
                  var inc2 = inc + 1;
                  trx_deposit(response, inc2);
                }
              }
              else
              {
                var inc2 = inc + 1;
                trx_deposit(response, inc2);
              }
            });
           
          }
        });
      } else {
        var inc2 = inc + 1;
        trx_deposit(response, inc2);
      }
    } else {
      var inc2 = inc + 1;
      trx_deposit(response, inc2);
    }
  } else {
    // console.log("call 2222====");
  }
}

// tron move to admin wallet
// cron.schedule("*/30 * * * *",function(){
//   //cron.schedule("* * * * *",function(){
//     try
//     {
//         common.getadminwallet("TRX", function (adminres) {
//             var adminbalance = adminres.amount;
//             var admin_address = adminres.trx_hexaddress;
//             client.get('TRXAddress', async (err, result) => {
//             if (result == null) {
//                 //console.log("call here");
//                 await redisHelper.settronAddress(function(response){
//                     if(response.length > 0)
//                     {
//                         response.forEach(function (id, val) {
//                             // console.log("id====",id);
//                              var address = id.trx_hexaddress;
//                              var obj = {
//                                  address: address
//                              }
//                              common.tron_balance(obj,function(balRes){
//                                  if(balRes.status)
//                                  {
//                                      var tronbal = balRes.balance / 1000000;
//                                      var tronaddress = id.address;
//                                   console.log("tronbal",tronbal)
//                                      console.log("tronaddress",tronaddress)
//                                      if(+tronbal>10)
//                                      {
//                                          var privateKey = id.privateKey;
//                                          var deduct_amount = +tronbal - 10
//                                          var send_amount = deduct_amount * 1000000;
//                                          //var send_amount = 2 * 1000000;
//                                          var obj = {
//                                              from_address: id.address,
//                                              to_address: adminres.address,
//                                              amount:send_amount,
//                                              privateKey: privateKey
//                                          }
//                                         console.log("trx send ===",obj);
//                                          common.tron_withdraw(obj,function(transfer){
//                                              console.log("send trx transaction response===",transfer);
//                                          });
//                                      }
//                                      else
//                                      {
//                                          //console.log("no balance from user wallets");
//                                      }

//                                  }

//                             });
//                         });
//                     }

//                 })
//             } else {
//                 //console.log("call there");
//                 var response = JSON.parse(result);
//                 if(response.length > 0)
//                 {
//                     response.forEach(function (id, val) {
//                         // console.log("id====",id);
//                          var address = id.trx_hexaddress;
//                          var obj = {
//                              address: address
//                          }
//                          common.tron_balance(obj,function(balRes){
//                              if(balRes.status)
//                              {
//                                  var tronbal = balRes.balance / 1000000;
//                                  var tronaddress = id.address;
//                               console.log("tronbal",tronbal)
//                                  console.log("tronaddress",tronaddress)
//                                  if(+tronbal>10)
//                                  {
//                                      var privateKey = id.privateKey;
//                                      var deduct_amount = +tronbal - 10
//                                      var send_amount = deduct_amount * 1000000;
//                                      //var send_amount = 2 * 1000000;
//                                      var obj = {
//                                          from_address: id.address,
//                                          to_address: adminres.address,
//                                          amount:send_amount,
//                                          privateKey: privateKey
//                                      }
//                                     console.log("trx send ===",obj);
//                                      common.tron_withdraw(obj,function(transfer){
//                                          console.log("send trx transaction response===",transfer);
//                                      });
//                                  }
//                                  else
//                                  {
//                                      //console.log("no balance from user wallets");
//                                  }

//                              }

//                         });
//                     });
//                 }

//             }
//        })
//       })
//     }
//     catch(ex)
//     {
//       //console.log("tron move error===",ex);
//     }

// });

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
