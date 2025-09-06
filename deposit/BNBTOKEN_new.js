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
var adminWalletDB = require("../schema/adminWallet");
var fs = require("fs");
var mongoose = require("mongoose");
const redisService = require("../redis-helper/redisHelper");
const redis = require("redis");
const client = redis.createClient();
const superagent = require("superagent");
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

let bnb_token = (exports.bnb_token = (address) => {
  try {
    console.log("-----bnb20token")
    client.get("BEP20", async (err, result) => {
      console.log(result,"result-------")
      if (result == null) {
        //console.log("call bep20 deposits here");
        await redisService.setbep20Token(function (response) {
          console.log("call there response", response);
          if (response.length > 0) {
            for (var i = 0; i < response.length; i++) {
              if (
                response[i].contractAddress_bep20 != "" &&
                response[i].contractAddress_bep20 != undefined
              ) {
                var contract_address = response[i].contractAddress_bep20;
                var decimal = response[i].coinDecimal_bep20;
                // console.log("contract_address===", contract_address);
                // console.log("decimal===", decimal);
                erc20_deposit(
                  i,
                  response.length,
                  contract_address,
                  decimal,
                  address
                );
              }
            }
          }
        });
      } else {
        console.log("call therebep20");
        var response = JSON.parse(result);
        //console.log("call there", response);
        if (response.length > 0) {
          for (var i = 0; i < response.length; i++) {
            if (
              response[i].contractAddress_bep20 != "" &&
              response[i].contractAddress_bep20 != undefined
            ) {
              var contract_address = response[i].contractAddress_bep20;
              var decimal = response[i].coinDecimal_bep20;
              // console.log("contract_address===", contract_address);
              // console.log("decimal===", decimal);
              erc20_deposit(
                i,
                response.length,
                contract_address,
                decimal,
                address
              );
            }
          }
        }
      }
    });
  } catch (e) {
    //console.log('BEP20 token deposit ERROR REASON ):', e.message);
  }
});
async function erc20_deposit(current, tot, contract_address, decimal, address) {
  try {
    var obj = {
      contractAddress: contract_address,
      userAddress: address,
      decimals: decimal,
    };
    //console.log("obj===", obj);
    common.bep20_Balance(obj, async function (balanceRes) {
      if (balanceRes.status == true) {
        var tokenbalance = balanceRes.balance;
        if (tokenbalance > 0) {
          await superagent
            .get(
              "https://"+process.env.BSC_API+"/api?module=account&action=tokentx&contractaddress=" +
                contract_address +
                "&address=" +
                address +
                "&endblock=latest&sort=desc&page=1&offset=100&apikey=" +
                process.env.BSCTOKEN +
                ""
            )
            .end((err, res) => {
              if (!err && res) {
                var responseTxn = res._body;
                // console.log("responseTxn===", responseTxn);
                if (
                  responseTxn.status == "1" &&
                  responseTxn.result.length > 0
                ) {
                  deposit_bep20(contract_address, responseTxn.result, 0);
                } else {
                  //console.log("no balance=========from bep20 tokens");
                }
              }
            });
          //}
        } else {
          //console.log("no balance from bep20 tokens");
        }
      }
    });
  } catch (err) {
    console.log("BEP20 DEPOSIT CRON ERROR REASON ):", err);
  }
}

function deposit_bep20(contractAddress, response, inc) {
  // console.log("response===", response);
  // console.log("inc===",inc);
  if (response[inc]) {
    var transaction = response[inc];
    // console.log("transaction====", transaction);
    var currencytable = {
      contractAddress_bep20: contractAddress,
    };
    //console.log("currencytable====", currencytable);
    currencyDB.findOne(currencytable).exec(function (err3, currencydata) {
      // console.log("currencytable====", currencydata);
      if (currencydata) {
        var address = transaction.to;
        // console.log("address====================================", address);
        var txid = transaction.hash;
        var value = transaction.value;
        var currency_id = currencydata._id;
        if (currencydata.currencyType == "2") {
          var ether_balance =
            value / Math.pow(10, currencydata.coinDecimal_bep20);
          // console.log("erc20 balance====", ether_balance);
          //var confirmations = transaction.confirmations;
          addressDB
            .findOne({
              address: transaction.to.toLowerCase(),
              //currencySymbol: currencydata.currencySymbol,
            })
            .exec(function (err, userdata) {
              //console.log("userdata====", userdata);
              if (userdata != null) {
                usersDB
                  .findOne({_id: userdata.user_id})
                  .exec(function (err4, siteuser) {
                    // console.log("siteuser====", siteuser);
                    if (siteuser != null) {
                      //if (confirmations > 10) {
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
                                    // console.log("usernalance", balance);
                                    var curBalance = balance.amount_bep20;
                                    var Balance =
                                      balance.amount_bep20 + ether_balance;
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
                                    console.log("Token USER", payments);
                                    var transactions = {
                                      user_id: userdata.user_id,
                                      currency_id: curr_id,
                                      currency_symbol:
                                        currencydata.currencySymbol,
                                      type: "Deposit",
                                      address: address,
                                      amount: +ether_balance,
                                      fees: 0,
                                      status: "Completed",
                                      txn_id: txid,
                                    };
                                    // console.log('txn USER', transactions);
                                    depositDB.create(payments, function (
                                      dep_err,
                                      dep_res
                                    ) {
                                      if (!dep_err) {
                                        common.updateUserTokenBalances(
                                          "BEP20",
                                          userdata.user_id,
                                          currencydata._id,
                                          Balance,
                                          curBalance,
                                          dep_res._id,
                                          "deposit",
                                          coinBalance,
                                          coinBalance_update,
                                          async function (balance) {
                                            var obj = {
                                              to_user_id: ObjectId(
                                                userdata.user_id
                                              ),
                                              to_user_name: userdata.username,
                                              status: 0,
                                              message:
                                                "" +
                                                ether_balance +
                                                " " +
                                                currencydata.currencySymbol +
                                                " received successfully",
                                              link: "/notificationHistory",
                                            };
                                            var reciver = common.decrypt(
                                              siteuser.email
                                            );
                                            var msg =
                                              "Deposit on " +
                                              ether_balance +
                                              " " +
                                              currencydata.currencySymbol +
                                              " was confirmed";
                                            let notification = await notifydb.create(
                                              obj
                                            );
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
                              deposit_bep20(contractAddress, response, inc2);
                            } else {
                              var inc2 = inc + 1;
                              deposit_bep20(contractAddress, response, inc2);
                            }
                          });
                      // } else {
                      //   var inc2 = inc + 1;
                      //   deposit_bep20(contractAddress, response, inc2);
                      // }
                    } else {
                      common.getadminwallet("BNB", function (adminres) {
                        var adminbalance_coin = adminres.amount;
                        var admin_address = adminres.address;
                        if (admin_address == transaction.to.toLowerCase()) {
                          // console.log("call eth admin")
                          if (currencydata.currencyType == "2") {
                            var ether_balance =
                              transaction.value /
                              Math.pow(10, currencydata.coinDecimal_bep20);
                            depositDB
                              .find({
                                txnid: transaction.hash,
                              })
                              .exec(function (dep_whr, dep_det) {
                                if (!dep_whr) {
                                  if (dep_det.length == 0) {
                                    var payments = {
                                      currency: currency_id,
                                      depamt: +ether_balance,
                                      depto: transaction.to,
                                      type: 1,
                                      txnid: transaction.hash,
                                    };
                                    //  console.log(currencydata.currencySymbol + ' admin', payments);
                                    var transactions = {
                                      currency_id: currency_id,
                                      currency_symbol:
                                        currencydata.currencySymbol,
                                      type: "Deposit",
                                      address: transaction.to,
                                      amount: +ether_balance,
                                      fees: 0,
                                      status: "Completed",
                                      txn_id: transaction.hash,
                                    };
                                    // console.log('txn USER', transactions);
                                    depositDB.create(payments, function (
                                      dep_err,
                                      dep_res
                                    ) {
                                      if (!dep_err && dep_res) {
                                        //var total = adminbalance + ether_balance;
                                        //common.updateAdminBalance(currencydata.currencySymbol, +total, function (balance) { });
                                        var admin_obj = {
                                          contractAddress: contractAddress,
                                          userAddress: transaction.to,
                                          decimals: currencydata.coinDecimal_bep20,
                                        };
                                        common.bep20_Balance(
                                          admin_obj,
                                          function (adminbalanceRes) {
                                            // console.log("admin balance response===",adminbalanceRes);
                                            if (adminbalanceRes.status) {
                                              var admin_tokenbalance = +adminbalanceRes.balance;
                                              var admin_coinbalance = +adminbalance_coin;
                                              var admin_coinbalance_update =
                                                +adminbalance_coin +
                                                admin_tokenbalance;
                                              common.updateAdminTokenBalance(
                                                "BEP20",
                                                currencydata.currencySymbol,
                                                admin_tokenbalance,
                                                admin_coinbalance_update,
                                                function (balance) {}
                                              );
                                            }
                                          }
                                        );
                                      }
                                    });
                                  } else {
                                    var inc2 = inc + 1;
                                    deposit_bep20(
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
                common.getadminwallet("BNB", function (adminres) {
                  var adminbalance_coin = adminres.amount;
                  var admin_address = adminres.address;
                  if (admin_address == transaction.to.toLowerCase()) {
                    // console.log("call eth admin")
                    if (currencydata.currencyType == "2") {
                      var ether_balance =
                        transaction.value /
                        Math.pow(10, currencydata.coinDecimal_bep20);
                      depositDB
                        .find({
                          txnid: transaction.hash,
                        })
                        .exec(function (dep_whr, dep_det) {
                          if (!dep_whr) {
                            if (dep_det.length == 0) {
                              var payments = {
                                currency: currency_id,
                                depamt: +ether_balance,
                                depto: transaction.to,
                                type: 1,
                                txnid: transaction.hash,
                              };
                              //  console.log(currencydata.currencySymbol + ' admin', payments);
                              var transactions = {
                                currency_id: currency_id,
                                currency_symbol: currencydata.currencySymbol,
                                type: "Deposit",
                                address: transaction.to,
                                amount: +ether_balance,
                                fees: 0,
                                status: "Completed",
                                txn_id: transaction.hash,
                              };
                              //console.log('txn USER', transactions);
                              depositDB.create(payments, function (
                                dep_err,
                                dep_res
                              ) {
                                if (!dep_err && dep_res) {
                                  //var total = adminbalance + ether_balance;
                                  //common.updateAdminBalance(currencydata.currencySymbol, +total, function (balance) { });
                                  var admin_obj = {
                                    contractAddress: contractAddress,
                                    userAddress: transaction.to,
                                    decimals: currencydata.coinDecimal_bep20,
                                  };
                                  common.bep20_Balance(admin_obj, function (
                                    adminbalanceRes
                                  ) {
                                    // console.log("admin balance response===",adminbalanceRes);
                                    if (adminbalanceRes.status) {
                                      var admin_tokenbalance = +adminbalanceRes.balance;
                                      var admin_coinbalance = +adminbalance_coin;
                                      var admin_coinbalance_update =
                                        +adminbalance_coin + admin_tokenbalance;
                                      common.updateAdminTokenBalance(
                                        "BEP20",
                                        currencydata.currencySymbol,
                                        admin_tokenbalance,
                                        admin_coinbalance_update,
                                        function (balance) {}
                                      );
                                    }
                                  });
                                }
                              });
                            } else {
                              var inc2 = inc + 1;
                              deposit_bep20(contractAddress, response, inc2);
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
          deposit_bep20(contractAddress, response, inc2);
        }
      }
    });
  }
}

//BEP20 tokens move to admin wallet cron
//cron.schedule("*/15 * * * *", function () {
//   cron.schedule("* * * * *", function () {
//   common.getadminwallet("BNB", function (response) {
//     //console.log("response====",response);
//     var admin_address = response.address;
//     var admin_key = common.decryptionLevel(response.admin_token_name);

//     client.get("BEP20", async (err, result) => {
//       if (result == null) {
//         //console.log("call here");
//         await redisService.setbep20Token(function (response) {
//           if (response.length > 0) {
//             for (var i = 0; i < response.length; i++) {
//               var contract_address = response[i].contractAddress_bep20;
//               var currencySymbol = "BNB";
//               var decimals = response[i].coinDecimal_bep20;
//               bep20_move(
//                 i,
//                 response.length,
//                 currencySymbol,
//                 decimals,
//                 contract_address,
//                 admin_address,
//                 admin_key
//               );
//             }
//           }
//         });
//       } else {
//         //console.log("call there");
//         var response = JSON.parse(result);
//         if (response.length > 0) {
//           for (var i = 0; i < response.length; i++) {
//             var contract_address = response[i].contractAddress_bep20;
//             var currencySymbol = "BNB";
//             var decimals = response[i].coinDecimal_bep20;
//             bep20_move(
//               i,
//               response.length,
//               currencySymbol,
//               decimals,
//               contract_address,
//               admin_address,
//               admin_key
//             );
//           }
//         }
//       }
//     });
//   });
// });

async function bep20_move(
  current,
  tot,
  currencySymbol,
  decimal,
  contract_address,
  admin_address,
  admin_key
) {
  await redisService.setbnbAddress(function (response) {
    if (response.length > 0) {
      response.forEach(function (id, val) {
        var obj = {
          contractAddress: contract_address,
          userAddress: id.address,
          decimals: decimal,
        };
        common.bep20_Balance(obj, function (balanceRes) {
          //console.log("balance token response===",balanceRes);
          if (balanceRes.status) {
            var tokenbalance = balanceRes.balance;
            if (tokenbalance > 0) {
              addressDB
                .findOne({
                  address: id.address,
                })
                .exec(async (err, address_data) => {
                  if (address_data) {
                    depositDB
                      .find({
                        depto: id.address,
                      })
                      .exec(function (dep_where, dep_dets) {
                        if (!dep_where) {
                          if (dep_dets.length > 0) {
                            let useraddress = address_data.address;
                            var privkey = common.decryptionLevel(
                              address_data.privateKey
                            );
                            let adminaddress = admin_address;
                            var string_private = privkey.substring(2);
                            let decimals = decimal;
                            if (useraddress != adminaddress) {
                              var args = {
                                currencyAddress: useraddress,
                                userAddress: adminaddress,
                                privkey: string_private,
                                decimals: decimals,
                                userprivatekey: admin_key.substring(2),
                                contract_address: contract_address,
                              };
                              //console.log(args, 'bep20 move cron [[[=====argsargs')
                              try {
                                common.bnb_sendtoken(args, function (respData) {
                                  if (respData.status) {
                                    console.log(
                                      "BEP20 MOVE TO ADMINM WALLET, SUCCESS"
                                    );
                                  } else {
                                    console.log(
                                      respData.message,
                                      "=respData.data.messagerespData.data.message==="
                                    );
                                  }
                                });
                              } catch (e) {
                                //console.log('BEP20 MOVE ADMIN WALLET ERROR REASON ):', e.message);
                              }
                            }
                          } else {
                            console.log("no new record in deposit");
                          }
                        }
                      });
                  }
                });
            }
          }
        });
      });
    }
  });
}
