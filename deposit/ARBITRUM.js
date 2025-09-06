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
          .replace(/###MESSAGE###/g, msg);
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

let arbit_deposit = (exports.arbit_deposit = (address) => {
  console.log("call arb here 10");
  try {
    common.arbit_balance({address: address}, function (balanceRes) {
      console.log("balanceRes===arb",balanceRes);
      var final_balance = +balanceRes.balance;
      //console.log("final balance===", final_balance);
      // console.log("adddress===",id);
      if (final_balance > 0) {
var data =`https://${process.env.ARBITRUM_API}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${process.env.ARBITRUM_TOKEN}`
              
        console.log("call balance===",data,"datadatadata")
        https
          .get(
            "https://" +
              process.env.ARBITRUM_API +
              "/api?module=account&action=txlist&address=" +
              address +
              "&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=" +
              process.env.ARBITRUM_TOKEN +
              "",
            (resp) => {
// console.log(resp,"rerep arg")
              let data = "";
              resp.on("data", (chunk) => {
                data += chunk;
              });
              resp.on("end", () => {
                try {
                  console.log(data,"dataargetdata")
                  var responseTxn = JSON.parse(data);
                  console.log("responseTxn===", responseTxn);
                  if (
                    responseTxn.status == "1" &&
                    responseTxn.result.length > 0
                  ) {
                    console.log("call here");
                    deposit_arbit(responseTxn.result, 0);
                  } else {
                  }
                } catch (err) {
                  console.log(err,"arnerrr")
                }
              });
            }
          )
          .on("error", (err) => {console.log(err,"===============================")});
      }
      else{
    console.log( "=-=-=++++++++-=--=-=-=-==--error");

      }
    });
  } catch (e) {
    console.log(e, "=-=-=-=--=-=-=-==--error");
  }
  return true;
});

function deposit_arbit(response, inc) {
  console.log("response[inc]====", response[inc]);
  console.log("response[inc]====", inc);
  if (response[inc]) {
    var transaction = response[inc];
    // var currencytable = {
    //   contractAddress: "0x0000000000000000000000000000000000000000",
    //   currencySymbol: "BNB",
    // };
    currencyDB.findOne({currencySymbol: "ARB"}).exec(function (err3, currencydata) {
    console.log(currencydata,"currencydata")
      if (currencydata) {
        var address = transaction.to;
        var txid = transaction.hash;
        var value = transaction.value;
        var currency_id = currencydata._id;
        console.log(transaction,"transaction")
        if (currencydata.currencySymbol == "ARB") {
          common.getadminwallet("ARB", function (adminaddress) {
            console.log(adminaddress,"adminaddress")
            if (adminaddress != null) {
              if (
                adminaddress.address.toLowerCase() !=
                transaction.from.toLowerCase()
              ) {
                var ether_balance =
                  value / Math.pow(10, currencydata.coinDecimal?currencydata.coinDecimal:"0");
                  console.log(ether_balance,"ether_balance")
                addressDB
                  .find({
                    address: transaction.to.toLowerCase(),
                    currencySymbol: currencydata.currencySymbol,
                  })
                  .exec(function (err, userdata) {
                    console.log("userdata====", userdata);
                    if (userdata != null && userdata.length > 0) {
                      usersDB
                        .findOne({_id: userdata[0].user_id})
                        .exec(function (err4, siteuser) {
                          console.log("siteuser====", siteuser);
                          if (siteuser != null) {
                            // console.log("call user====", siteuser);
                            if (userdata.length > 0) {
                              //  console.log("call confirmations here===", txid);
                              depositDB
                                .find({
                                  userId: userdata[0].user_id,
                                  txnid: txid,
                                })
                                .exec(function (err2, depositData) {
                                  console.log(depositData,"depositData")
                                  if (depositData.length == 0) {
                                    if (currencydata) {
                                      var curr_id = currencydata._id;
                                      common.getadminwallet("ARB", function (
                                        response
                                      ) {
                                        // console.log("response====", response);
                                        var admin_address = response.address.toLowerCase();
                                        if (
                                          admin_address !=
                                          transaction.from.toLowerCase()
                                        ) {
                                          common.getUserBalance(
                                            userdata[0].user_id,
                                            currencydata._id,
                                            function (balance) {
                                              // console.log("usernalance", balance);
                                              var curBalance =
                                                balance.totalBalance;
                                              var Balance =
                                                balance.totalBalance +
                                                ether_balance;
                                              var payments = {
                                                userId: userdata[0].user_id,
                                                currency: curr_id,
                                                depamt: +ether_balance,
                                                depto: address,
                                                txnid: txid,
                                              };
                                              console.log("BNB USER", payments);
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
                                              console.log(
                                                "txn USER",
                                                transactions
                                              );
                                              depositDB.create(
                                                payments,
                                                async function (
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
                                                        //
                                                        var obj = {
                                                          to_user_id: ObjectId(
                                                            userdata[0].user_id
                                                          ),
                                                          to_user_name:
                                                            userdata[0]
                                                              .username,
                                                          status: 0,
                                                          message:
                                                            "" +
                                                            ether_balance +
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
                                                            key:
                                                              "confirm_transaction",
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
                                                              function (
                                                                mailRes
                                                              ) {
                                                                console.log(
                                                                  mailRes,
                                                                  "======mailREs===========================",
                                                                  reciver
                                                                );
                                                              }
                                                            );
                                                          });
                                                        //
                                                      }
                                                    );
                                                  }
                                                }
                                              );
                                            }
                                          );
                                        }
                                      });
                                    }
                                    var inc2 = inc + 1;
                                    deposit_arbit(response, inc2);
                                  } else {
                                    var inc2 = inc + 1;
                                    deposit_arbit(response, inc2);
                                  
                                  }
                                });
                            }
                          } else {
                            //console.log("call admin BNB deposit=====")
                            common.getadminwallet("BNB", function (adminres) {
                              var adminbalance = adminres.amount;
                              var admin_address = adminres.address;
                              //console.log("call admin BNB deposit admin_address=====",admin_address);
                              if (
                                admin_address == transaction.to.toLowerCase()
                              ) {
                                //console.log("call bnb admin======")
                                if (currencydata.currencySymbol == "BNB") {
                                  var ether_balance =
                                    transaction.value /
                                    Math.pow(10, currencydata.coinDecimal);
                                  // console.log("call admin BNB deposit ether_balance=====",ether_balance);
                                  depositDB
                                    .find({
                                      txnid: transaction.hash,
                                    })
                                    .exec(function (dep_whr, dep_det) {
                                      //console.log("dep details length===",dep_det.length);
                                      if (!dep_whr) {
                                        if (dep_det.length == 0) {
                                          var payments = {
                                            currency: currency_id,
                                            depamt: +ether_balance,
                                            depto: transaction.to,
                                            type: 1,
                                            txnid: transaction.hash,
                                          };
                                          console.log(
                                            currencydata.currencySymbol +
                                              " admin",
                                            payments
                                          );
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
                                              // var total = adminbalance + ether_balance;
                                              // common.updateAdminBalance(currencydata.currencySymbol, +total, function (balance) { });
                                              common.bnb_Balance(
                                                {address: transaction.to},
                                                function (adminbalanceRes) {
                                                  if (adminbalanceRes.status) {
                                                    var admin_bnb = +adminbalanceRes.balance;
                                                    common.updateAdminBalance(
                                                      currencydata.currencySymbol,
                                                      admin_bnb,
                                                      function (balance) {}
                                                    );
                                                  }
                                                }
                                              );
                                            }
                                          });
                                        } else {
                                          var inc2 = inc + 1;
                                          deposit_arbit(response, inc2);
                                        }
                                      }
                                    });
                                }
                              } else {
                                var inc2 = inc + 1;
                                deposit_arbit(response, inc2);
                              }
                            });
                          }
                        });
                    } else {
                      var inc2 = inc + 1;
                      deposit_arbit(response, inc2);
                    }
                  });
              } else {
                var inc2 = inc + 1;
                deposit_arbit(response, inc2);
              }
            } else {
              var inc2 = inc + 1;
              deposit_arbit(response, inc2);
            }
          });
        } else {
          var inc2 = inc + 1;
          deposit_arbit(response, inc2);
        }
      }
    });
  }
}
