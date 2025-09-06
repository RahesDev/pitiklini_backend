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

const RippleAPI = require("ripple-lib").RippleAPI;

var urlType = process.env.XRP_API_NETWORK;

const Ripple = new RippleAPI({
  server: urlType,
});

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
            "Deposit on " + amount + " " + symbol + " was confirmned"
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

let xrp_deposit = (exports.xrp_deposit = () => {
  var rippleAddress = common.decryptionLevel(process.env.XRP_WALLET);
  console.log(rippleAddress, "=-=-=-=-rippleAddress");
  Ripple.connect()
    .then(function () {
      console.log("Connected to Ripple");
      return Ripple.getServerInfo();
    })
    .then(function (server_info) {
      console.log("Server Info:", server_info);
      var version = server_info.validatedLedger.ledgerVersion - 8640;
      return Ripple.getTransactions(rippleAddress, {
        minLedgerVersion: parseInt(version),
      });
    })
    .then(function (transaction_user) {
      console.log("Transactions:", transaction_user);
    })
    .catch(function (err) {
      console.error("Error:", err);
    });
  // try {
  //   Ripple.connection._config.connectionTimeout = 10000;
  //   Ripple.connect()
  //     .then(function () {
  //       console.log("connect ripple");
  //       return Ripple.getServerInfo();
  //     })
  //     .then(function (server_info) {
  //       var version = server_info.validatedLedger.ledgerVersion - 8640;
  //       Ripple.getTransactions(rippleAddress, {
  //         minLedgerVersion: parseInt(version),
  //       }).then(function (transaction_user) {
  //         console.log("transaction_user====", transaction_user);
  //         if (transaction_user.length > 0) {
  //           return UpdateDeposit_xrp(transaction_user, rippleAddress, 0);
  //         }
  //       });
  //     })
  //     .catch(function (err) {
  //       console.log(err);
  //     });
  // } catch (err) {}
});

function UpdateDeposit_xrp(transaction, addressxrp, inc) {
  var tr = inc;
  var address = transaction[tr].specification.destination.address;
  if (address != "") {
    var checkaddress = address.toLowerCase();
    var checkaddress1 = addressxrp.toLowerCase();
    console.log(checkaddress1, "usernalance", checkaddress);
    if (
      transaction[tr].outcome.result == "tesSUCCESS" &&
      checkaddress == checkaddress1
    ) {
      var txid = transaction[tr].id;
      var value = transaction[tr].specification.source.maxAmount.value;
      value = +value;
      depositDB.findOne({txnid: txid}).exec(function (dep_whr, dep_det) {
        if (!dep_whr) {
          if (!dep_det) {
            console.log(
              transaction[tr].specification.destination,
              "usernalance"
            );
            if (
              typeof transaction[tr].specification.destination.tag == "number"
            ) {
              addressDB
                .findOne({tag: transaction[tr].specification.destination.tag})
                .exec(function (err3, userdata) {
                  if (userdata) {
                    var user_id = userdata.userid;
                    currencyDB
                      .findOne({currencySymbol: "XRP"})
                      .exec(function (cur_err, currencydata) {
                        if (!cur_err) {
                          var curr_id = currencydata._id;
                          common.getUserBalance(
                            userdata.user_id,
                            currencydata._id,
                            function (balance) {
                              console.log("usernalance", balance);
                              var curBalance = balance.totalBalance;
                              var Balance = balance.totalBalance + value;
                              var payments = {
                                userId: userdata.user_id,
                                currency: curr_id,
                                depamt: +value,
                                depto: address,
                                txnid: txid,
                              };
                              console.log("XRP USER", payments);
                              var transactions = {
                                user_id: userdata.user_id,
                                currency_id: curr_id,
                                currency_symbol: currencydata.currencySymbol,
                                type: "Deposit",
                                address: address,
                                amount: +value,
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
                                    userdata.user_id,
                                    currencydata._id,
                                    Balance,
                                    curBalance,
                                    dep_res._id,
                                    "deposit",
                                    function (balance) {
                                      deposit_mail(
                                        userdata.user_id,
                                        value,
                                        currencydata.currencySymbol
                                      );
                                    }
                                  );
                                }
                              });
                            }
                          );

                          inc = inc + 1;
                          if (inc < transaction.length) {
                            UpdateDeposit_xrp(transaction, addressxrp, inc);
                          }
                        } else {
                          inc = inc + 1;
                          if (inc < transaction.length) {
                            UpdateDeposit_xrp(transaction, addressxrp, inc);
                          }
                        }
                      });
                  }
                });
            }
          } else {
            inc = inc + 1;
            if (inc < transaction.length) {
              UpdateDeposit_xrp(transaction, addressxrp, inc);
            }
          }
        } else {
          inc = inc + 1;
          if (inc < transaction.length) {
            UpdateDeposit_xrp(transaction, addressxrp, inc);
          }
        }
      });
    } else {
      inc = inc + 1;
      if (inc < transaction.length) {
        UpdateDeposit_xrp(transaction, addressxrp, inc);
      }
    }
  }
}
