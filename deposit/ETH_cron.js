const cron = require("node-cron");
const converter = require("hex2dec");
const https = require("https");

const currencyDB = require("../schema/currency");
const addressDB = require("../schema/userCryptoAddress");
const usersDB = require("../schema/users");
const mailtempDB = require("../schema/mailtemplate");
const depositDB = require("../schema/deposit");
const common = require("../helper/common");
const mail = require("../helper/mailhelper");
var walletconfig = require("../helper/wallets");
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

let eth_deposit = (exports.eth_deposit = (address) => {
  try {
        common.get_Balance({address: address}, function (balanceRes) {
          // console.log("balanceRes===",balanceRes);
          var final_balance = +balanceRes.balance;
          //console.log("final balance===",final_balance);
          // console.log("adddress===",id);
          if (final_balance > 0) {
            https
              .get(
                "https://"+process.env.ETH_API+"/api?module=account&action=txlist&address=" +
                  address +
                  "&endblock=latest&apikey=" +
                  process.env.ETHKEY +
                  "",
                (resp) => {
                  let data = "";
                  resp.on("data", (chunk) => {
                    data += chunk;
                  });
                  resp.on("end", () => {
                    try {
                      var responseTxn = JSON.parse(data);
                      console.log("responseTxn===", responseTxn);
                      if (
                        responseTxn.status == "1" &&
                        responseTxn.result.length > 0
                      ) {
                        // console.log("call here");
                        deposit_eth(responseTxn.result, 0);
                      } else {
                      }
                    } catch (err) {}
                  });
                }
              )
              .on("error", (err) => {});
          }
        });
  } catch (e) {}
  return true;
});

// cron.schedule("*/25 * * * *", function () {
//   //cron.schedule("* * * * *",function(){
//     console.log("call eth move crons")
//   common.getadminwallet("ETH", function (adminres) {
//     var adminbalance = adminres.amount;
//     var admin_address = adminres.address;
//     client.get("ETHAddress", async (err, result) => {
//       if (result == null) {
//         //console.log("call here");
//         await redisHelper.setethAddress(function (response) {
//           if (response.length > 0) {
//             response.forEach(function (id, val) {
//               if (id.address != admin_address) {
//                 common.get_Balance({address: id.address}, function (
//                   balanceRes
//                 ) {
//                   var final_balance = balanceRes.balance;
//                   if (final_balance > 0) {
//                     common.gasPrice(function (gasresponse) {
//                       console.log("gasprice response===",gasresponse);
//                       if (gasresponse.status) {
//                         var gasprice = gasresponse.gasprice;
//                         var Gas_res = gasprice / 1000000000;
//                         var Gas_txn = Gas_res / 1000000000;
//                         var txn_fee = 30000 * Gas_txn;
//                         console.log("txn_fee",txn_fee);
//                         console.log("eth balance",final_balance)
//                         var send_amount = final_balance - txn_fee;
//                         // console.log("txn_fee===",txn_fee);
//                         // console.log("send_amount====",send_amount);
//                         addressDB
//                           .find({
//                             address: id.address,
//                           })
//                           .exec(function (err, userdata) {
//                             if (userdata) {
//                               var privateKey = common.decryptionLevel(
//                                 userdata[0].privateKey
//                               );
//                               var obj = {
//                                 from: id.address,
//                                 to: admin_address,
//                                 gasLimit: 30000,
//                                 gasPrice: gasprice,
//                                 value: send_amount,
//                                 privateKey: privateKey.substring(2),
//                               };
//                               console.log("eth send params==",obj);
//                               common.sendTransaction(obj, function (transfer) {
//                                 //console.log("send transaction response===",transfer);
//                               });
//                             }
//                           });
//                       }
//                     });
//                   } else {
//                     //console.log("no balance from user wallets");
//                   }
//                 });
//               }
//             });
//           }
//         });
//       } else {
//         //console.log("call there");
//         var response = JSON.parse(result);
//         response.forEach(function (id, val) {
//           if (id.address != admin_address) {
//             common.get_Balance({address: id.address}, function (balanceRes) {
//               var final_balance = balanceRes.balance;
//               if (final_balance > 0) {
//                 common.gasPrice(function (gasresponse) {
//                   // console.log("gasprice response===",gasresponse);
//                   if (gasresponse.status) {
//                     var gasprice = gasresponse.gasprice;
//                     var Gas_res = gasprice / 1000000000;
//                     var Gas_txn = Gas_res / 1000000000;
//                     var txn_fee = 30000 * Gas_txn;
//                     var send_amount = final_balance - txn_fee;
//                     // console.log("txn_fee===",txn_fee);
//                     // console.log("send_amount====",send_amount);
//                     addressDB
//                       .find({
//                         address: id.address,
//                       })
//                       .exec(function (err, userdata) {
//                         if (userdata) {
//                           var privateKey = common.decryptionLevel(
//                             userdata[0].privateKey
//                           );
//                           var obj = {
//                             from: id.address,
//                             to: admin_address,
//                             gasLimit: 30000,
//                             gasPrice: gasprice,
//                             value: send_amount,
//                             privateKey: privateKey.substring(2),
//                           };
//                           common.sendTransaction(obj, function (transfer) {
//                             //console.log("send transaction response===",transfer);
//                           });
//                         }
//                       });
//                   }
//                 });
//               } else {
//                 //console.log("no balance from user wallets");
//               }
//             });
//           }
//         });
//       }
//     });
//   });
// });

function deposit_eth(response, inc) {
  if (response[inc]) {
    var transaction = response[inc];
    var currencytable = {
      contractAddress: "0x0000000000000000000000000000000000000000",
      currencySymbol: "ETH",
    };
    //console.log("currencytable===", currencytable);
    currencyDB.findOne(currencytable).exec(function (err3, currencydata) {
      if (currencydata) {
        var address = transaction.to;
        var txid = transaction.hash;
        var value = transaction.value;
        var currency_id = currencydata._id;
        if (currencydata.currencySymbol == "ETH") {
          common.getadminwallet("ETH", function (adminaddress) {
            if(adminaddress != null)
            {
              if(adminaddress.address.toLowerCase() != transaction.from.toLowerCase())
              {
                var ether_balance = value / Math.pow(10, currencydata.coinDecimal);
                //var confirmations = transaction.confirmations;
                addressDB
                  .find({
                    address: transaction.to.toLowerCase(),
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
                              // if (confirmations > 10) {
                              //console.log("call confirmations here===",txid)
                              depositDB
                                .find({
                                  userId: userdata[0].user_id,
                                  txnid: txid,
                                })
                                .exec(function (err2, depositData) {
                                  //console.log("call depositData===",deposit/Data.length)
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
                                            balance.totalBalance + ether_balance;
                                          var payments = {
                                            userId: userdata[0].user_id,
                                            currency: curr_id,
                                            depamt: +ether_balance,
                                            depto: address,
                                            txnid: txid,
                                          };
                                          console.log("ETH USER", payments);
                                          var transactions = {
                                            user_id: userdata[0].user_id,
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
                                    deposit_eth(response, inc2);
                                  } else {
                                    var inc2 = inc + 1;
                                    deposit_eth(response, inc2);
                                  }
                                });
                              // } else {
                              //     var inc2 = inc + 1;
                              //     deposit_eth(response, inc2)
                              // }
                            }
                          } else {
                            common.getadminwallet("ETH", function (adminres) {
                              console.log(adminres, "==--==-=-=-=adminres");
                              var adminbalance = adminres.amount;
                              var admin_address = adminres.address;
                              if (admin_address == transaction.to.toLowerCase()) {
                                // console.log("call eth admin")
                                if (currencydata.currencySymbol == "ETH") {
                                  var ether_balance =
                                    transaction.value /
                                    Math.pow(10, currencydata.coinDecimal);
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
                                          console.log("txn USER", transactions);
                                          depositDB.create(payments, function (
                                            dep_err,
                                            dep_res
                                          ) {
                                            if (!dep_err && dep_res) {
                                              //var total = adminbalance + ether_balance;
                                              // common.updateAdminBalance(currencydata.currencySymbol, +total, function (balance) { });
      
                                              common.get_Balance(
                                                {address: transaction.to},
                                                function (adminbalanceRes) {
                                                  if (adminbalanceRes.status) {
                                                    var admin_eth = +adminbalanceRes.balance;
                                                    common.updateAdminBalance(
                                                      currencydata.currencySymbol,
                                                      admin_eth,
                                                      function (balance) {}
                                                    );
                                                  }
                                                }
                                              );
                                            }
                                          });
                                        } else {
                                          var inc2 = inc + 1;
                                          deposit_eth(response, inc2);
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
                      deposit_eth(response, inc2);
                    }
                  });
              }
              else
              {
                var inc2 = inc + 1;
                deposit_eth(response, inc2);
              }
            }
            else
            {
              var inc2 = inc + 1;
                deposit_eth(response, inc2);
            }
          })
          
        } else {
          var inc2 = inc + 1;
          deposit_eth(response, inc2);
        }
      }
    });
  }
}
