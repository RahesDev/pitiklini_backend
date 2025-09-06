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
const trxhost = process.env.TRON_HOST;

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

let trx20_token = (exports.trx20_token = (address,privkey) => {
  try {
    console.log("call here tron token")
    client.get("TRC20", async (err, result) => {
      if (result == null) {
        //console.log("call trc20 here");
        await redisHelper.settrc20Token(function (response) {
          if (response.length > 0) {
            for (var i = 0; i < response.length; i++) {
              var contract_address = response[i].contractAddress_trc20;
              var decimal = response[i].coinDecimal_trc20;
              // console.log("contract_address===",contract_address);
              // console.log("decimal===",decimal);
              trc20_deposit(
                i,
                response.length,
                contract_address,
                decimal,
                address,
                privkey
              );
            }
          }
        });
      } else {
        //console.log("call trc20 there");
        var response = JSON.parse(result);
        //console.log("call there",response);
        if (response.length > 0) {
          for (var i = 0; i < response.length; i++) {
            var contract_address = response[i].contractAddress_trc20;
            var decimal = response[i].coinDecimal_trc20;
            // console.log("contract_address===",contract_address);
            // console.log("decimal===",decimal);
            trc20_deposit(
              i,
              response.length,
              contract_address,
              decimal,
              address,
              privkey
            );
          }
        }
      }
    });
  } catch (e) {
    //console.log('TRC20 token deposit ERROR REASON ):', e.message);
  }
});

function trc20_deposit(
  current,
  tot,
  contract_address,
  decimal,
  address,
  privatekey
) {
  try {
    var obj = {
      address: address,
      privatekey: privatekey,
      contractAddress: contract_address,
      decimal: decimal,
    };
    common.trc20_balance(obj, function (balRes) {
      console.log("trc20 here balance", balRes);
      if (balRes.status) {
        var tronbal = balRes.balance;
        var tronaddress = address;
        // console.log("tronbal",tronbal)
        // console.log("tronaddress",tronaddress)
        if (+tronbal > 0) {
          https
            .get(
              "https://" +
                trxhost +
                "/v1/accounts/" +
                tronaddress +
                "/transactions/trc20?only_confirmed=true&only_to=true&contract_address=" +
                contract_address +
                "&TRON-PRO-API-KEY=" +
                process.env.TRX_APIKEY +
                "",
              (resp) => {
                console.log("tranasctions api respresp===+++++++++++++++++++++++++++++++++++++++",resp);
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
                        return deposit_trc20(
                          contract_address,
                          response.data,
                          0
                        );
                      }
                    } catch (err) {
                      //console.log('TRX DEPOSIT CRON ERROR REASON ):', err);
                    }
                  }
                });
              }
            )
            .on("error", (err) => {
              // console.log("Error: " + err.message);
            });
        }
      }
    });
  } catch (e) {
    // console.log('TRON deposit ERROR REASON ):', e.message);
  }
}

function deposit_trc20(contractAddress, response, inc) {
  if (response[inc]) {
    var transaction = response[inc];
    //console.log("transaction====", transaction);
    var currencytable = {
      contractAddress_trc20: contractAddress,
    };
    //console.log("currencytable====", currencytable);
    currencyDB.findOne(currencytable).exec(function (err3, currencydata) {
      if (currencydata) {
        // console.log("currencytable====", currencydata);
        var address = transaction.to;
        //console.log("address====", address);
        var txid = transaction.transaction_id;
        var value = transaction.value;
        var currency_id = currencydata._id;
        if (currencydata.currencyType == "2") {
          console.log(transaction,"transaction2")

          var ether_balance =
            value / Math.pow(10, currencydata.coinDecimal_trc20);
          console.log("erc20 balance====", ether_balance);
          addressDB
            .findOne({
              address: transaction.to,
              //currencySymbol: currencydata.currencySymbol,
              //network: "TRC20"
            })
            .exec(function (err, userdata) {
              // console.log("userdata====", userdata);
              if (userdata != null) {
                usersDB
                  .findOne({_id: userdata.user_id})
                  .exec(function (err4, siteuser) {
                    // console.log("siteuser====", siteuser);
                    if (siteuser != null) {
                      depositDB
                        .find({
                          userId: userdata.user_id,
                          txnid: txid,
                        })
                        .exec(function (err2, depositData) {
                          if (depositData.length == 0) {
                            if (currencydata) {
                              var curr_id = currencydata._id;
                              common.getUserBalance(
                                userdata.user_id,
                                currencydata._id,
                                function (balance) {
                                  //console.log("usernalance", balance);
                                  var coinBalance = balance.totalBalance;
                                  var coinBalance_update =
                                    balance.totalBalance + ether_balance;
                                  var payments = {
                                    userId: userdata.user_id,
                                    currency: curr_id,
                                    depamt: +ether_balance,
                                    depto: address,
                                    txnid: txid,
                                  };
                                  //console.log('Token USER', payments)
                                  depositDB.create(payments, function (
                                    dep_err,
                                    dep_res
                                  ) {
                                    if (!dep_err) {
                                      common.updateUserBalance(
                                        userdata.user_id,
                                        currencydata._id,
                                        coinBalance_update,
                                        "total",
                                        async function (balance) {
                                          var reciver = common.decrypt(
                                            siteuser.email
                                          );
                                          var msg =
                                            "Deposit on " +
                                            ether_balance +
                                            " " +
                                            currencydata.currencySymbol +
                                            " was confirmed";
                                          // deposit_mail(
                                          //   userdata[0].user_id,
                                          //   ether_balance,
                                          //   currencydata.currencySymbol
                                          // );
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
                                                .replace(/###MESSAGE###/g, msg);
                                              mail.sendMail(
                                                {
                                                  from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
                                                  to: reciver,
                                                  subject: etempdata.Subject,
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
                            deposit_trc20(contractAddress, response, inc2);
                          } else {
                            var inc2 = inc + 1;
                            deposit_trc20(contractAddress, response, inc2);
                          }
                        });
                    } else {
                      common.getadminwallet("USDT", function (adminres) {
                        var adminbalance_coin = adminres.amount;
                        var admin_address = adminres.address;
                        if (admin_address == transaction.to) {
                          // console.log("call eth admin")
                    console.log(transaction,"transaction")

                          if (currencydata.currencyType == "2") {
                            var ether_balance =
                              transaction.value /
                              Math.pow(10, currencydata.coinDecimal_trc20);
                            depositDB
                              .find({
                                txnid: transaction.transaction_id,
                              })
                              .exec(function (dep_whr, dep_det) {
                                if (!dep_whr) {
                                  if (dep_det.length == 0) {
                                    var payments = {
                                      currency: currency_id,
                                      depamt: +ether_balance,
                                      depto: transaction.to,
                                      type: 1,
                                      txnid: transaction.transaction_id,
                                    };
                                    console.log(
                                      currencydata.currencySymbol + " admin",
                                      payments
                                    );
                                    depositDB.create(payments, async function (
                                      dep_err,
                                      dep_res
                                    ) {
                                      if (!dep_err && dep_res) {
                                        //var total = adminbalance + ether_balance;
                                        //common.updateAdminBalance(currencydata.currencySymbol, +total, function (balance) { });

                                        var admin_obj = {
                                          contractAddress:
                                            currencydata.contractAddress_trc20,
                                          address: transaction.to,
                                          privatekey: adminres.admin_token_name,
                                          decimal: currencydata.coinDecimal_trc20,
                                        };
                                        common.trc20_balance(
                                          admin_obj,
                                          function (adminbalanceRes) {
                                            // console.log("admin balance response===",adminbalanceRes);
                                            if (adminbalanceRes.status) {
                                              var admin_tokenbalance = +adminbalanceRes.balance;
                                              var admin_coinbalance = +adminbalance_coin;
                                              var admin_coinbalance_update =
                                                +adminbalance_coin +
                                                admin_tokenbalance;
                                              common.updateAdminBalance(
                                                currencydata.currencySymbol,
                                                +admin_coinbalance_update,
                                                function (balance) {}
                                              );
                                            }
                                          }
                                        );
                                      }
                                    });
                                  } else {
                                    var inc2 = inc + 1;
                                    deposit_trc20(
                                      contractAddress,
                                      response,
                                      inc2
                                    );
                                  }
                                }
                              });
                          }
                        }
                      });
                    }
                  });
              } else {
                common.getadminwallet("USDT", function (adminres) {
                  var adminbalance_coin = adminres.amount;
                  var admin_address = adminres.address;
                  if (admin_address == transaction.to) {
                    console.log(transaction,"transaction")
                    // console.log("call eth admin")
                    if (currencydata.currencyType == "2") {
                      var ether_balance =
                        transaction.value /
                        Math.pow(10, currencydata.coinDecimal_trc20);
                      depositDB
                        .find({
                          txnid: transaction.transaction_id,
                        })
                        .exec(function (dep_whr, dep_det) {
                          if (!dep_whr) {
                            if (dep_det.length == 0) {
                              var payments = {
                                currency: currency_id,
                                depamt: +ether_balance,
                                depto: transaction.to,
                                type: 1,
                                txnid: transaction.transaction_id,
                              };
                              console.log(
                                currencydata.currencySymbol + " admin",
                                payments
                              );
                              depositDB.create(payments, async function (
                                dep_err,
                                dep_res
                              ) {
                                if (!dep_err && dep_res) {
                                  //var total = adminbalance + ether_balance;
                                  //common.updateAdminBalance(currencydata.currencySymbol, +total, function (balance) { });

                                  var admin_obj = {
                                    contractAddress:
                                      currencydata.contractAddress_trc20,
                                    address: transaction.to,
                                    privatekey: adminres.admin_token_name,
                                    decimal: currencydata.coinDecimal_trc20,
                                  };
                                  common.trc20_balance(admin_obj, function (
                                    adminbalanceRes
                                  ) {
                                    // console.log("admin balance response===",adminbalanceRes);
                                    if (adminbalanceRes.status) {
                                      var admin_tokenbalance = +adminbalanceRes.balance;
                                      var admin_coinbalance = +adminbalance_coin;
                                      var admin_coinbalance_update =
                                        +adminbalance_coin + admin_tokenbalance;
                                      common.updateAdminBalance(
                                        currencydata.currencySymbol,
                                        +admin_coinbalance_update,
                                        function (balance) {}
                                      );
                                    }
                                  });
                                }
                              });
                            } else {
                              var inc2 = inc + 1;
                              deposit_trc20(contractAddress, response, inc2);
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
          deposit_trc20(contractAddress, response, inc2);
        }
      }
    });
  }
}

// TRC20 tokens move to admin wallet cron
//cron.schedule('*/20 * * * *', function() {
// cron.schedule('*/40 * * * * *', function() {
//     try{
//         common.getadminwallet("TRX", function (response) {
//             //console.log("adminwallet response====",response);
//         var admin_address = response.address;
//         var admin_key = response.admin_token_name;

//         client.get('TRC20', async (err, result) => {
//             if (result == null) {
//                // console.log("call here");
//                 await redisHelper.settrc20Token(function(response){
//                     if(response.length>0)
//                     {
//                         for (var i = 0; i < response.length; i++) {
//                             var contract_address = response[i].contractAddress_trc20;
//                             var currencySymbol = "TRX";
//                             var decimals = response[i].coinDecimal_trc20;
//                             trx20_move(i, response.length, currencySymbol, decimals, contract_address, admin_address, admin_key);
//                         }
//                     }
//                 })
//             } else {
//                 //console.log("call there");
//                 var response = JSON.parse(result);
//                 if(response.length>0)
//                 {
//                 for (var i = 0; i < response.length; i++) {
//                     var contract_address = response[i].contractAddress_trc20;
//                     var currencySymbol = "TRX";
//                     var decimals = response[i].coinDecimal_trc20;
//                     trx20_move(i, response.length, currencySymbol, decimals, contract_address, admin_address, admin_key);
//                 }
//                 }
//             }
//         });
//     });
//     }
//     catch(ex)
//     {
//       console.log("trc20 move catch===",ex);
//     }

// });

function trx20_move(
  current,
  tot,
  currencySymbol,
  decimals,
  contract_address,
  admin_address,
  admin_key
) {
  client.get("TRXAddress", async (err, result) => {
    if (result == null) {
      //console.log("call here");
      await redisHelper.settronAddress(function (response) {
        if (response.length > 0) {
          response.forEach(function (id, val) {
            var obj = {
              contractAddress: contract_address,
              address: id.address,
              privatekey: id.privateKey,
              decimal: +decimals,
            };
            //console.log("trc20 balance obj====",obj);

            common.trc20_balance(obj, function (balanceRes) {
              //console.log("balance token response===",balanceRes.balance);
              if (balanceRes.status) {
                var tokenbalance = balanceRes.balance;
                if (tokenbalance > 0) {
                  addressDB
                    .findOne({
                      address: id.address,
                    })
                    .exec(async (err, address_data) => {
                      if (address_data) {
                        let address = address_data.address;
                        var privatekey = address_data.privateKey;
                        let adminaddress = admin_address;
                        var adminprivateKey = admin_key;
                        let amount = tokenbalance * Math.pow(10, +decimals);
                        var args = {
                          address: address,
                          privatekey: privatekey,
                          adminaddress: adminaddress,
                          adminprivateKey: adminprivateKey,
                          decimal: +decimals,
                          amount: tokenbalance,
                          contractAddress: contract_address,
                        };
                        //   console.log(args, 'trc20 move args====')
                        //   return
                        try {
                          common.trx_sendtoken(args, function (respData) {
                            if (respData.status) {
                              console.log(
                                "TRC20 MOVE TO ADMINM WALLET, SUCCESS"
                              );
                            } else {
                              console.log(respData.message, "TRC20 move error");
                            }
                          });
                        } catch (e) {
                          // console.log('TRC20 MOVE ADMIN WALLET ERROR REASON ):', e.message);
                        }
                      }
                    });
                } else {
                  //console.log("no new trc20 deposits");
                }
              }
            });
          });
        }
      });
    } else {
      //console.log("call there");
      var response = JSON.parse(result);
      response.forEach(function (id, val) {
        var obj = {
          contractAddress: contract_address,
          address: id.address,
          privatekey: id.privateKey,
          decimal: +decimals,
        };
        // console.log("trc20 balance obj====",obj);

        common.trc20_balance(obj, function (balanceRes) {
          //console.log("balance token response===",balanceRes.balance);
          if (balanceRes.status) {
            var tokenbalance = balanceRes.balance;
            if (tokenbalance > 0) {
              addressDB
                .findOne({
                  address: id.address,
                })
                .exec(async (err, address_data) => {
                  if (address_data) {
                    let address = address_data.address;
                    var privatekey = address_data.privateKey;
                    let adminaddress = admin_address;
                    var adminprivateKey = admin_key;
                    let amount = tokenbalance * Math.pow(10, +decimals);
                    var args = {
                      address: address,
                      privatekey: privatekey,
                      adminaddress: adminaddress,
                      adminprivateKey: adminprivateKey,
                      decimal: +decimals,
                      amount: tokenbalance,
                      contractAddress: contract_address,
                    };
                    console.log(args, "trc20 move args====");
                    try {
                      common.trx_sendtoken(args, function (respData) {
                        if (respData.status) {
                          console.log("TRC20 MOVE TO ADMINM WALLET, SUCCESS");
                        } else {
                          console.log(respData.message, "TRC20 move error");
                        }
                      });
                    } catch (e) {
                      console.log(
                        "TRC20 MOVE ADMIN WALLET ERROR REASON ):",
                        e.message
                      );
                    }
                  }
                });
            } else {
              console.log("no new trc20 deposits");
            }
          }
        });
      });
    }
  });
}

function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
