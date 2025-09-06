var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var usersDB = require("../schema/users");
const key = require("../config/key");
var userWalletDB = require("../schema/userWallet");
var currencyDB = require("../schema/currency");
const cron = require("node-cron");
var cryptoAddressDB = require("../schema/userCryptoAddress");
var walletconfig = require("../helper/wallets");
const rpc = require("node-json-rpc2");
var fs = require("fs");
const eth_host = process.env.ETH_HOST;
const tron_host = process.env.TRON_HOST;


//ETH BLOCK CHAIN //
const Web3 = require("web3");
const web3 = new Web3("https://" + eth_host + "");

const TronWeb = require("tronweb");
const tronWeb = new TronWeb({
  fullHost: "https://" + tron_host + "",
});

const axios = require("axios");

const bsc_web3 = new Web3(process.env.BNB_WALLET);
const arbit_wen3= new  Web3(process.env.ARBITRUM_WALLET)
 const matic_web3 = new Web3(process.env.MATIC_URL)
const rptc_host = common.decryptionLevel(process.env.RPTC_HOST);

var rptc_web3 = new Web3(new Web3.providers.HttpProvider(rptc_host));

//------USER CRYPTO ADDRESS GENERATE FUNCTIONALITY----//

const Coinpayments = require("coinpayments");
const CoinpaymentsCredentials = {
  key: common.decryptionLevel(process.env.COINPAYMENTS_KEY),
  secret: common.decryptionLevel(process.env.COINPAYMENTS_SECRET),
};
const coinpaymentsClient = new Coinpayments(CoinpaymentsCredentials);

router.post("/generateAddress", common.isEmpty, common.tokenmiddleware, async (req,res) => {
  try {

    let getCurrency = await currencyDB.findOne({ _id : req.body.currId, currencySymbol : req.body.currencySymbol});
    if(getCurrency){
      var netWork = req.body.network;
      var currencyFind = netWork == "erc20token" ? "ETH" : netWork == "bep20token" ? "BNB" : netWork == "arb20token" ? "ARB" :  netWork == "trc20token"  ? "TRX" : netWork == "matictoken"  ? "MATIC" :  req.body.currencySymbol
      let findAddress = await cryptoAddressDB.findOne({ $and: [ { user_id: req.userId }, { currencySymbol: currencyFind }]},{ address: 1, tag: 1, currencySymbol: 1});
       if(findAddress){
        var result = {
          address: findAddress.address,
          qrcode:   "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" + findAddress.address +"&choe=UTF-8&chld=L",
          currencySymbol: findAddress.currencySymbol,
          network : currencyFind,
          sendCurrency :  req.body.currencySymbol
        };
        return res.json({status :  true, Message : "success", data : result});
       }else{
        let userId = req.userId
        var url = "";
        var blockchain = currencyFind;
      if( blockchain== "BTC"){
           url = process.env.WALLETCALL+common.decrypt(process.env.BTC_CALL)
        }else if(blockchain == "ETH"){
           url = process.env.WALLETCALL+common.decrypt(process.env.EVM_CALL)
        }else if( blockchain== "BNB"){
           url = process.env.WALLETCALL+common.decrypt(process.env.EVM_CALL)
        }else if( blockchain== "ARB"){
          url = process.env.WALLETCALL+common.decrypt(process.env.EVM_CALL)
        }else if( blockchain== "MATIC"){
          url = process.env.WALLETCALL+common.decrypt(process.env.EVM_CALL)
        }else if( blockchain == "XRP"){
          url = process.env.WALLETCALL+common.decrypt(process.env.XRP_CALL)
        }else if( blockchain == "TRX"){
          url = process.env.WALLETCALL+common.decrypt(process.env.TRX_CALL)
        }else{
          url = ""
        }
          const data = {
              userKey   : userId,
              coinKey   : blockchain,
              curencyId : getCurrency._id
          };
          const response = await axios.post( url,data,{headers: {'Content-Type': 'application/json','Authorization': 'Bearer your_token_here'}}  );
          var resulData = response.data.data;
          if(resulData){
            var obj = {
              user_id        : userId,
              address        : resulData.address,
              currencySymbol : blockchain,
              userIdKey      : resulData.phase2,
              currency       : getCurrency._id,
              publicKey      : blockchain == "XRP" ? resulData.publicKey : blockchain == "TRX" ? resulData.publicKey : "",
              trx_hexaddress : blockchain== "TRX" ? resulData.hex : ""
            }
            let addAddress = await cryptoAddressDB.create(obj);
            if(addAddress){
              var result = {
                address: resulData.address,
                qrcode:   "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" + resulData.address+"&choe=UTF-8&chld=L",
                currencySymbol: getCurrency.currencySymbol,
                network : currencyFind,
                sendCurrency :  req.body.currencySymbol
              };
              return res.json({ status: true, Message : "success", data : result});
            }else{
              return res.json({ status: false, Message: "Please try again later" });
            }
          }else{
            return res.json({ status: false, Message: "Please try again later" });
          }
       }
    }else{
      return res.json({ status: false, Message: "Oops!, Invalid Details"});
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error",error:error });
  }
} );


router.post(
  "/getUserAddress",
  common.isEmpty,
  common.tokenmiddleware,
  (req, res) => {
    console.log(req.body, "----addrObj----addrObj----addrObj-");
    try {
      var user_id = req.userId;
      //var curr_sym = (req.body.currency=="USDT")?"ETH":req.body.currency;
      if (
        req.body.currId != "" &&
        req.body.currId != undefined &&
        req.body.currId != null
      ) {
        currencyDB
          .findOne(
            { _id: req.body.currId },
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
              console.log("walletType====", currencydata.walletType);
              console.log("erc20token====", currencydata.erc20token);
              console.log("trc20token====", currencydata.trc20token);
              var network = "";
              var balance = 0;
              if (currencydata.erc20token == "1") {
                network = "ERC20";
              } else if (currencydata.trc20token == "1") {
                network = "Tron";
              } else if (currencydata.bep20token == "1") {
                network = "BEP20";
              }

              common.getbalance(
                user_id,
                currencydata._id,
                function (userbalance) {
                  if (userbalance != null) {
                    balance = userbalance.amount;
                  }
                }
              );

              cryptoAddressDB
                .findOne(
                  {
                    $and: [
                      { user_id: req.userId },
                      { currencySymbol: currency },
                    ],
                  },
                  { address: 1, tag: 1 }
                )
                .exec(async (err, data) => {
                  console.log(data);
                  if (err) {
                    return res.json({
                      status: false,
                      Message: "Pleary try leter",
                    });
                  } else if (data) {
                    var address = data.address;
                    var tag = data.tag != null ? data.tag : "";
                    var qrcode =
                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                      address +
                      "&choe=UTF-8&chld=L";
                    var result = {
                      address: address,
                      tag: tag,
                      qrcode: qrcode,
                      currencySymbol: currency,
                      network: network,
                      balance: balance,
                    };
                    console.log("result===", result);
                    return res.json({ status: true, Message: result });
                  } else {
                    if (currencydata.walletType == 0) {
                      if (currency == "BTC") {
                        usersDB
                          .findOne({ _id: user_id }, { username: 1 })
                          .exec(async (err, userdata) => {
                            if (!err && userdata) {
                              var username = userdata.username;
                              var args = {
                                type: "btc_address",
                                username: username,
                              };
                              console.log("args===", args);
                              common.btc_address(args, function (respData) {
                                if (respData.status) {
                                  console.log("respData====", respData.address);
                                  var address_response = respData;
                                  if (address_response.address != null) {
                                    var obj = {
                                      address: address_response.address,
                                      currencySymbol: currency,
                                      currency: currencydata._id,
                                      user_id: user_id,
                                    };
                                    console.log(obj);
                                    cryptoAddressDB.create(
                                      obj,
                                      (createError, addressData) => {
                                        if (createError) {
                                          return res.json({
                                            status: false,
                                            Message:
                                              "Address not create, Please try later",
                                          });
                                        } else {
                                          if (addressData) {
                                            var address = addressData.address;
                                            var qrcode =
                                              "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                              address +
                                              "&choe=UTF-8&chld=L";
                                            var result = {
                                              address: address,
                                              qrcode: qrcode,
                                              currencySymbol: currency,
                                              network: network,
                                              balance: balance,
                                            };
                                          } else {
                                            var result = {};
                                          }
                                          console.log(
                                            "adress response===",
                                            result
                                          );
                                          return res.json({
                                            status: true,
                                            Message: result,
                                          });
                                        }
                                      }
                                    );
                                  }
                                }
                              });
                            }
                          });
                      } else if (currency == "ETH") {
                        var account = web3.eth.accounts.create();
                        var obj = {
                          address: account.address.toLowerCase(),
                          privateKey: common.encryptionLevel(
                            account.privateKey
                          ),
                          currencySymbol: currency,
                          currency: currencydata._id,
                          user_id: req.userId,
                        };
                        console.log(obj);
                        cryptoAddressDB.create(
                          obj,
                          (createError, addressData) => {
                            if (createError) {
                              return res.json({
                                status: false,
                                Message: "Address not create, Please try later",
                              });
                            } else {
                              if (addressData) {
                                var address = addressData.address;
                                var qrcode =
                                  "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                  address +
                                  "&choe=UTF-8&chld=L";
                                var result = {
                                  address: address,
                                  qrcode: qrcode,
                                  currencySymbol: currency,
                                  network: network,
                                  balance: balance,
                                };
                              } else {
                                var result = {};
                              }
                              console.log("adress response===", result);
                              return res.json({
                                status: true,
                                Message: result,
                              });
                            }
                          }
                        );
                      } else if (currency == "BNB") {
                        var account = bsc_web3.eth.accounts.create();
                        var obj = {
                          address: account.address.toLowerCase(),
                          privateKey: common.encryptionLevel(
                            account.privateKey
                          ),
                          currencySymbol: currency,
                          currency: currencydata._id,
                          user_id: req.userId,
                        };
                        console.log(obj);
                        cryptoAddressDB.create(
                          obj,
                          (createError, addressData) => {
                            if (createError) {
                              return res.json({
                                status: false,
                                Message: "Address not create, Please try later",
                              });
                            } else {
                              if (addressData) {
                                var address = addressData.address;
                                var qrcode =
                                  "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                  address +
                                  "&choe=UTF-8&chld=L";
                                var result = {
                                  address: address,
                                  qrcode: qrcode,
                                  currencySymbol: currency,
                                  network: network,
                                  balance: balance,
                                };
                              } else {
                                var result = {};
                              }
                              console.log("adress response===", result);
                              return res.json({
                                status: true,
                                Message: result,
                              });
                            }
                          }
                        );
                      } else if (currency == "ARB"){
                        var account = arbit_wen3.eth.accounts.create();
                        console.log(account,"arbitaccount")
                        var obj = {
                          address: account.address.toLowerCase(),
                          privateKey: common.encryptionLevel(
                            account.privateKey
                          ),
                          currencySymbol: currency,
                          currency: currencydata._id,
                          user_id: req.userId,
                        };
                        console.log(obj);
                        cryptoAddressDB.create(
                          obj,
                          (createError, addressData) => {
                            if (createError) {
                              return res.json({
                                status: false,
                                Message: "Address not create, Please try later",
                              });
                            } else {
                              if (addressData) {
                                var address = addressData.address;
                                var qrcode =
                                  "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                  address +
                                  "&choe=UTF-8&chld=L";
                                var result = {
                                  address: address,
                                  qrcode: qrcode,
                                  currencySymbol: currency,
                                  network: network,
                                  balance: balance,
                                };
                              } else {
                                var result = {};
                              }
                              console.log("adress response===", result);
                              return res.json({
                                status: true,
                                Message: result,
                              });
                            }
                          }
                        );
                      }
                      
                      else if (currency == "TRX") {
                        var account = await tronWeb.createAccount();
                        console.log("trx account====", account);
                        var obj = {
                          address: account.address.base58,
                          privateKey: common.encryptionLevel(
                            account.privateKey
                          ),
                          currencySymbol: currency,
                          currency: currencydata._id,
                          user_id: req.userId,
                          trx_hexaddress: account.address.hex.toLowerCase(),
                        };
                        console.log(obj);
                        cryptoAddressDB.create(
                          obj,
                          (createError, addressData) => {
                            if (createError) {
                              return res.json({
                                status: false,
                                Message: "Address not create, Please try later",
                              });
                            } else {
                              if (addressData) {
                                var address = addressData.address;
                                var qrcode =
                                  "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                  address +
                                  "&choe=UTF-8&chld=L";
                                var result = {
                                  address: address,
                                  qrcode: qrcode,
                                  currencySymbol: currency,
                                  network: network,
                                  balance: balance,
                                };
                              } else {
                                var result = {};
                              }
                              console.log("adress response===", result);
                              return res.json({
                                status: true,
                                Message: result,
                              });
                            }
                          }
                        );
                      }  else if (currency == "MATIC") {
                        var account = matic_web3.eth.accounts.create();
                        var obj = {
                          address: account.address.toLowerCase(),
                          privateKey: common.encryptionLevel(account.privateKey),
                          currencySymbol: currency,
                          currency: currencydata._id,
                          user_id: req.userId,
                          // evm_chain: "1",
                        };
                        console.log(obj);
                        cryptoAddressDB.create(
                          obj,
                          (createError, addressData) => {
                            if (createError) {
                              callback({
                                status: false,
                                Message: "Address not create, Please try later",
                              });
                            } else {
                              if (addressData) {
                                var address = addressData.address;
                                var qrcode =
                                  "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                  address +
                                  "&choe=UTF-8&chld=L";
                                var result = {
                                  address: address,
                                  qrcode: qrcode,
                                  currencySymbol: currency,
                                  balance: balance,
                                };
                              } else {
                                var result = {};
                              }
                              console.log("adress response===", result);
                              callback({ status: true, Message: result });
                            }
                          }
                        );
                      } 
                      else if (currency == "XRP") {
                        var account = common.decryptionLevel(
                          process.env.XRP_WALLET
                        );
                        var obj = {
                          address: account,
                          privateKey: process.env.XRP_SECRET,
                          currencySymbol: currency,
                          currency: currencydata._id,
                          user_id: req.userId,
                          tag: Math.floor(Math.random() * 999999),
                        };
                        console.log(obj, "onj=-=-=-=-");
                        cryptoAddressDB.create(
                          obj,
                          (createError, addressData) => {
                            if (createError) {
                              return res.json({
                                status: false,
                                Message: "Address not create, Please try later",
                              });
                            } else {
                              if (addressData) {
                                var address = addressData.address;
                                var qrcode =
                                  "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                  address +
                                  "&choe=UTF-8&chld=L";
                                var result = {
                                  address: address,
                                  qrcode: qrcode,
                                  tag: addressData.tag,
                                  currencySymbol: currency,
                                  network: network,
                                };
                              } else {
                                var result = {};
                              }
                              console.log("adress response===", result);
                              return res.json({
                                status: true,
                                Message: result,
                              });
                            }
                          }
                        );
                      } else if (
                        currencydata.currencyType == "2" &&
                        currencydata.erc20token == "1"
                      ) {
                        cryptoAddressDB
                          .findOne(
                            {
                              $and: [
                                { user_id: req.userId },
                                { currencySymbol: "ETH" },
                              ],
                            },
                            { address: 1, privateKey: 1 }
                          )
                          .exec(async (err, data) => {
                            if (err) {
                              return res.json({
                                status: false,
                                Message: "Pleary try leter",
                              });
                            } else if (data) {
                              var address = data.address;
                              var private = data.privateKey;
                              var qrcode =
                                "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                address +
                                "&choe=UTF-8&chld=L";
                              var result = {
                                address: address,
                                qrcode: qrcode,
                                currencySymbol: currency,
                              };
                              console.log("result===etch", result);

                              var obj = {
                                address: address.toLowerCase(),
                                privateKey: private,
                                currencySymbol: currencydata.currencySymbol,
                                currency: currencydata._id,
                                user_id: req.userId,
                              };
                              cryptoAddressDB.create(
                                obj,
                                (createError, addressData) => {
                                  if (createError) {
                                    return res.json({
                                      status: false,
                                      Message:
                                        "Address not create, Please try later",
                                    });
                                  } else {
                                    if (addressData) {
                                      var address = addressData.address;
                                      var qrcode =
                                        "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                        address +
                                        "&choe=UTF-8&chld=L";
                                      var result = {
                                        address: address,
                                        qrcode: qrcode,
                                        network: network,
                                        balance: balance,
                                      };
                                    } else {
                                      var result = {};
                                    }
                                    console.log("adress response===", result);
                                    return res.json({
                                      status: true,
                                      Message: result,
                                    });
                                  }
                                }
                              );
                              return res.json({
                                status: true,
                                Message: result,
                              });
                            } else {
                              var eth_data = await currencyDB.findOne({
                                currencySymbol: "ETH",
                              });
                              var account = web3.eth.accounts.create();
                              var obj = {
                                address: account.address.toLowerCase(),
                                privateKey: common.encryptionLevel(
                                  account.privateKey
                                ),
                                currencySymbol: eth_data.currencySymbol,
                                currency: eth_data._id,
                                user_id: req.userId,
                              };
                              cryptoAddressDB.create(
                                obj,
                                (createError, addressData) => {
                                  if (createError) {
                                    return res.json({
                                      status: false,
                                      Message:
                                        "Address not create, Please try later",
                                    });
                                  } else {
                                    if (addressData) {
                                      var address = addressData.address;
                                      var qrcode =
                                        "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                        address +
                                        "&choe=UTF-8&chld=L";
                                      var result = {
                                        address: address,
                                        qrcode: qrcode,
                                        network: network,
                                        balance: balance,
                                      };
                                    } else {
                                      var result = {};
                                    }
                                    console.log("adress response===", result);
                                    return res.json({
                                      status: true,
                                      Message: result,
                                    });
                                  }
                                }
                              );
                            }
                          });
                      } else if (
                        currencydata.currencyType == "2" &&
                        currencydata.trc20token == "1"
                      ) {
                        console.log("call trc20");
                        cryptoAddressDB
                          .findOne(
                            {
                              $and: [
                                { user_id: req.userId },
                                { currencySymbol: "TRX" },
                              ],
                            },
                            { address: 1, privateKey: 1, trx_hexaddress: 1 }
                          )
                          .exec(async (err, data) => {
                            if (err) {
                              return res.json({
                                status: false,
                                Message: "Pleary try leter",
                              });
                            } else if (data) {
                              var address = data.address;
                              var private = data.privateKey;
                              var trx_hexaddress = data.trx_hexaddress;
                              console.log("call trc20 address ===", data);
                              var obj = {
                                address: address,
                                privateKey: private,
                                currencySymbol: currency,
                                currency: currencydata._id,
                                user_id: req.userId,
                                trx_hexaddress: trx_hexaddress.toLowerCase(),
                              };
                              console.log(obj);
                              cryptoAddressDB.create(
                                obj,
                                (createError, addressData) => {
                                  if (createError) {
                                    return res.json({
                                      status: false,
                                      Message:
                                        "Address not create, Please try later",
                                    });
                                  } else {
                                    if (addressData) {
                                      var address = addressData.address;
                                      var qrcode =
                                        "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                        address +
                                        "&choe=UTF-8&chld=L";
                                      var result = {
                                        address: address,
                                        qrcode: qrcode,
                                        currencySymbol: currency,
                                        network: network,
                                        balance: balance,
                                      };
                                    } else {
                                      var result = {};
                                    }
                                    console.log("adress response===", result);
                                    return res.json({
                                      status: true,
                                      Message: result,
                                    });
                                  }
                                }
                              );
                            } else {
                              var trx_data = await currencyDB.findOne({
                                currencySymbol: "TRX",
                              });
                              var account = await tronWeb.createAccount();
                              console.log("trx account====", account);
                              var obj = {
                                address: account.address.base58,
                                privateKey: common.encryptionLevel(
                                  account.privateKey
                                ),
                                currencySymbol: trx_data.currencySymbol,
                                currency: trx_data._id,
                                user_id: req.userId,
                                trx_hexaddress:
                                  account.address.hex.toLowerCase(),
                              };
                              console.log(obj);
                              cryptoAddressDB.create(
                                obj,
                                (createError, addressData) => {
                                  if (createError) {
                                    return res.json({
                                      status: false,
                                      Message:
                                        "Address not create, Please try later",
                                    });
                                  } else {
                                    if (addressData) {
                                      var address = addressData.address;
                                      var qrcode =
                                        "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                        address +
                                        "&choe=UTF-8&chld=L";
                                      var result = {
                                        address: address,
                                        qrcode: qrcode,
                                        currencySymbol: currency,
                                        network: network,
                                        balance: balance,
                                      };
                                    } else {
                                      var result = {};
                                    }
                                    console.log("adress response===", result);
                                    return res.json({
                                      status: true,
                                      Message: result,
                                    });
                                  }
                                }
                              );
                            }
                          });
                      } else if (
                        currencydata.currencyType == "2" &&
                        currencydata.bep20token == "1"
                      ) {
                        cryptoAddressDB
                          .findOne(
                            {
                              $and: [
                                { user_id: req.userId },
                                { currencySymbol: "BNB" },
                              ],
                            },
                            { address: 1, privateKey: 1 }
                          )
                          .exec(async (err, data) => {
                            if (err) {
                              return res.json({
                                status: false,
                                Message: "Pleary try leter",
                              });
                            } else if (data) {
                              var address = data.address;
                              var private = data.privateKey;

                              var obj = {
                                address: address.toLowerCase(),
                                privateKey: private,
                                currencySymbol: currencydata.currencySymbol,
                                currency: currencydata._id,
                                user_id: req.userId,
                              };
                              cryptoAddressDB.create(
                                obj,
                                (createError, addressData) => {
                                  if (createError) {
                                    return res.json({
                                      status: false,
                                      Message:
                                        "Address not create, Please try later",
                                    });
                                  } else {
                                    if (addressData) {
                                      var address = addressData.address;
                                      var qrcode =
                                        "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                        address +
                                        "&choe=UTF-8&chld=L";
                                      var result = {
                                        address: address,
                                        qrcode: qrcode,
                                        network: network,
                                        balance: balance,
                                      };
                                    } else {
                                      var result = {};
                                    }
                                    console.log("adress response===", result);
                                    return res.json({
                                      status: true,
                                      Message: result,
                                    });
                                  }
                                }
                              );
                            } else {
                              var bnb_data = await currencyDB.findOne({
                                currencySymbol: "BNB",
                              });
                              var account = bsc_web3.eth.accounts.create();
                              var obj = {
                                address: account.address.toLowerCase(),
                                privateKey: common.encryptionLevel(
                                  account.privateKey
                                ),
                                currencySymbol: bnb_data.currencySymbol,
                                currency: bnb_data._id,
                                user_id: req.userId,
                              };
                              cryptoAddressDB.create(
                                obj,
                                (createError, addressData) => {
                                  if (createError) {
                                    return res.json({
                                      status: false,
                                      Message:
                                        "Address not create, Please try later",
                                    });
                                  } else {
                                    if (addressData) {
                                      var address = addressData.address;
                                      var qrcode =
                                        "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                        address +
                                        "&choe=UTF-8&chld=L";
                                      var result = {
                                        address: address,
                                        qrcode: qrcode,
                                        network: network,
                                        balance: balance,
                                      };
                                    } else {
                                      var result = {};
                                    }
                                    console.log("adress response===", result);
                                    return res.json({
                                      status: true,
                                      Message: result,
                                    });
                                  }
                                }
                              );
                            }
                          });
                      }
                    } else {
                      var account = await coinpaymentsClient.getCallbackAddress(
                        {
                          currency: currency,
                        }
                      );
                      console.log("coinpayments account====", account);
                      var obj = {
                        address: account.address,
                        currencySymbol: currency,
                        currency: currencydata._id,
                        user_id: req.userId,
                        tag: account.dest_tag ? account.dest_tag : "",
                      };
                      console.log(obj);
                      cryptoAddressDB.create(
                        obj,
                        (createError, addressData) => {
                          if (createError) {
                            return res.json({
                              status: false,
                              Message: "Address not create, Please try later",
                            });
                          } else {
                            if (addressData) {
                              var address = addressData.address;
                              var qrcode =
                                "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                address +
                                "&choe=UTF-8&chld=L";
                              var result = {
                                address: address,
                                qrcode: qrcode,
                                currencySymbol: currency,
                                network: network,
                                balance: balance,
                              };
                            } else {
                              var result = {};
                            }
                            console.log("adress response===", result);
                            return res.json({
                              status: true,
                              Message: result,
                            });
                          }
                        }
                      );
                    }
                  }
                });
            }
          });
      } else {
        return res.json({ status: false, Message: "Enter valid details" });
      }
    } catch (error) {
      console.log(error, "----addrObj----addrObj----addrObj-");

      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post("/mobile_currency_network", async (req, res) => {
  try {
    if (
      req.body.currency != "" &&
      req.body.currency != undefined &&
      req.body.currency != null
    ) {
      var user_id = req.userId;
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
            rptc20token: 1,
            matictoken: 1,
          }
        )
        .exec((cerr, currencydata) => {
          console.log(currencydata, "currencydata");
          if (currencydata.currencyType == 1) {
            return res.json({ status: false, data: [] });
          } else {
            var network_cur = {};
            var network_names = [];
            if (currencydata.erc20token == "1") {
              network_cur = {
                value: "erc20token",
                label: "ERC20",
              };
              network_names.push(network_cur);
            }
            if (currencydata.bep20token == "1") {
              network_cur = {
                value: "bep20token",
                label: "BEP20",
              };
              network_names.push(network_cur);
            }
            if (currencydata.trc20token == "1") {
              network_cur = {
                value: "trc20token",
                label: "TRC20",
              };
              network_names.push(network_cur);
            }
            console.log(network_names, "network_names");
            console.log(network_cur, "network_cur");
            return res.json({ status: true, data: network_names });
          }
        });
    } else {
      return res.json({ status: false, Message: "Enter valid details" });
    }
  } catch (error) {
    console.log(
      "====================send otp catch====================",
      error
    );
    return res.json({
      status: false,
      message: "Something went wrong",
    });
  }
});
router.post(
  "/getUserAddress_network",
  common.isEmpty,
  common.tokenmiddleware,
  (req, res) => {
    console.log(req.body, "----addrObj----addrObj----addrObj-");
    try {
      var user_id = req.userId;
      //var curr_sym = (req.body.currency=="USDT")?"ETH":req.body.currency;
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
              rptc20token: 1,
              matictoken: 1,
            }
          )
          .exec((cerr, currencydata) => {
            console.log("cerr=====", cerr);
            if (cerr) {
              return res.json({ status: false, Message: "Pleary try leter" });
            } else {
              var currency = currencydata.currencySymbol;
              var network = req.body.network;
              var balance = 0;
              var network_currency = "";
              var network_name = "";
              var network_balance = 0;
              if (network == "erc20token") {
                network_currency = "ETH";
                network_name = "ERC20";
              } else if (network == "trc20token") {
                network_currency = "TRX";
                network_name = "TRC20";
              } else if (network == "bep20token") {
                network_currency = "BNB";
                network_name = "BEP20";
              } else if (network == "rptc20token") {
                network_currency = "RPTC";
                network_name = "RPTC20";
              } else if (network == "matictoken") {
                network_currency = "MATIC";
                network_name = "MATIC";
              }
              var addressrptc = {
                user_id: user_id,
              };
              common.rptc_update_address(addressrptc, function (resp) {});

              common.getbalance(
                user_id,
                currencydata._id,
                function (userbalance) {
                  if (userbalance != null) {
                    balance = userbalance.amount;

                    if (network == "erc20token") {
                      network_balance = userbalance.amount_erc20;
                    } else if (network == "trc20token") {
                      network_balance = userbalance.amount_trc20;
                    } else if (network == "bep20token") {
                      network_balance = userbalance.amount_bep20;
                    } else if (network == "rptc20token") {
                      network_balance = userbalance.amount_rptc20;
                    } else if (network == "matictoken") {
                      network_balance = userbalance.amount_matic;
                    }
                  }
                }
              );

              cryptoAddressDB
                .findOne(
                  {
                    $and: [
                      { user_id: req.userId },
                      { currencySymbol: currency, network: network_name },
                    ],
                  },
                  { address: 1, tag: 1 }
                )
                .exec(async (err, data) => {
                  if (err) {
                    return res.json({
                      status: false,
                      Message: "Pleary try leter",
                    });
                  } else if (data) {
                    var address = data.address;
                    var tag = data.tag != null ? data.tag : "";
                    var qrcode =
                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                      address +
                      "&choe=UTF-8&chld=L";
                    var result = {
                      address: address,
                      tag: tag,
                      qrcode: qrcode,
                      currencySymbol: currency,
                      balance: balance,
                    };
                    console.log("result===cccc", result);
                    return res.json({ status: true, Message: result });
                  } else {
                    if (currency == "BTC") {
                      usersDB
                        .findOne({ _id: user_id }, { username: 1 })
                        .exec(async (err, userdata) => {
                          if (!err && userdata) {
                            var username = userdata.username;
                            var args = {
                              type: "btc_address",
                              username: username,
                            };
                            console.log("args===", args);
                            common.btc_address(args, function (respData) {
                              if (respData.status) {
                                console.log("respData====", respData.address);
                                var address_response = respData;
                                if (address_response.address != null) {
                                  var obj = {
                                    address: address_response.address,
                                    currencySymbol: currency,
                                    currency: currencydata._id,
                                    user_id: user_id,
                                  };
                                  console.log(obj);
                                  cryptoAddressDB.create(
                                    obj,
                                    (createError, addressData) => {
                                      if (createError) {
                                        return res.json({
                                          status: false,
                                          Message:
                                            "Address not create, Please try later",
                                        });
                                      } else {
                                        if (addressData) {
                                          var address = addressData.address;
                                          var qrcode =
                                            "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                            address +
                                            "&choe=UTF-8&chld=L";
                                          var result = {
                                            address: address,
                                            qrcode: qrcode,
                                            currencySymbol: currency,
                                            balance: balance,
                                          };
                                        } else {
                                          var result = {};
                                        }
                                        console.log(
                                          "adress response===",
                                          result
                                        );
                                        return res.json({
                                          status: true,
                                          Message: result,
                                        });
                                      }
                                    }
                                  );
                                }
                              }
                            });
                          }
                        });
                    } else if (currency == "ETH") {
                      var account = web3.eth.accounts.create();
                      var obj = {
                        address: account.address.toLowerCase(),
                        privateKey: common.encryptionLevel(account.privateKey),
                        currencySymbol: currency,
                        currency: currencydata._id,
                        user_id: req.userId,
                      };
                      console.log(obj);
                      cryptoAddressDB.create(
                        obj,
                        (createError, addressData) => {
                          if (createError) {
                            return res.json({
                              status: false,
                              Message: "Address not create, Please try later",
                            });
                          } else {
                            if (addressData) {
                              var address = addressData.address;
                              var qrcode =
                                "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                address +
                                "&choe=UTF-8&chld=L";
                              var result = {
                                address: address,
                                qrcode: qrcode,
                                currencySymbol: currency,
                                balance: balance,
                              };
                            } else {
                              var result = {};
                            }
                            console.log("adress response===", result);
                            return res.json({ status: true, Message: result });
                          }
                        }
                      );
                    } else if (currency == "BNB") {
                      var account = bsc_web3.eth.accounts.create();
                      var obj = {
                        address: account.address.toLowerCase(),
                        privateKey: common.encryptionLevel(account.privateKey),
                        currencySymbol: currency,
                        currency: currencydata._id,
                        user_id: req.userId,
                      };
                      console.log(obj);
                      cryptoAddressDB.create(
                        obj,
                        (createError, addressData) => {
                          if (createError) {
                            return res.json({
                              status: false,
                              Message: "Address not create, Please try later",
                            });
                          } else {
                            if (addressData) {
                              var address = addressData.address;
                              var qrcode =
                                "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                address +
                                "&choe=UTF-8&chld=L";
                              var result = {
                                address: address,
                                qrcode: qrcode,
                                currencySymbol: currency,
                                balance: balance,
                              };
                            } else {
                              var result = {};
                            }
                            console.log("adress response===", result);
                            return res.json({ status: true, Message: result });
                          }
                        }
                      );
                    } else if (currency == "TRX") {
                      var account = await tronWeb.createAccount();
                      console.log("trx account====", account);
                      var obj = {
                        address: account.address.base58,
                        privateKey: common.encryptionLevel(account.privateKey),
                        currencySymbol: currency,
                        currency: currencydata._id,
                        user_id: req.userId,
                        trx_hexaddress: account.address.hex.toLowerCase(),
                      };
                      console.log(obj);
                      cryptoAddressDB.create(
                        obj,
                        (createError, addressData) => {
                          if (createError) {
                            return res.json({
                              status: false,
                              Message: "Address not create, Please try later",
                            });
                          } else {
                            if (addressData) {
                              var address = addressData.address;
                              var qrcode =
                                "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                address +
                                "&choe=UTF-8&chld=L";
                              var result = {
                                address: address,
                                qrcode: qrcode,
                                currencySymbol: currency,
                                balance: balance,
                              };
                            } else {
                              var result = {};
                            }
                            console.log("adress response===", result);
                            return res.json({ status: true, Message: result });
                          }
                        }
                      );
                    } else if (currency == "RPTC") {
                      var account = rptc_web3.eth.accounts.create();
                      var obj = {
                        address: account.address.toLowerCase(),
                        privateKey: common.encryptionLevel(account.privateKey),
                        currencySymbol: currency,
                        currency: currencydata._id,
                        user_id: req.userId,
                      };
                      console.log(obj);
                      cryptoAddressDB.create(
                        obj,
                        (createError, addressData) => {
                          if (createError) {
                            return res.json({
                              status: false,
                              Message: "Address not create, Please try later",
                            });
                          } else {
                            if (addressData) {
                              var address = addressData.address;
                              var qrcode =
                                "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                address +
                                "&choe=UTF-8&chld=L";
                              var result = {
                                address: address,
                                qrcode: qrcode,
                                currencySymbol: currency,
                                balance: balance,
                              };
                            } else {
                              var result = {};
                            }
                            console.log("adress response===", result);
                            var details = {
                              address: addressData.address,
                              privateKey: addressData.privateKey,
                              user_id: addressData.user_id,
                            };
                            common.rptc_token_address(
                              details,
                              function (resp) {}
                            );
                            return res.json({ status: true, Message: result });
                          }
                        }
                      );
                    } else if (currency == "MATIC") {
                      var account = matic_web3.eth.accounts.create();
                      var obj = {
                        address: account.address.toLowerCase(),
                        privateKey: encryptionLevel(account.privateKey),
                        currencySymbol: currency,
                        currency: currencydata._id,
                        user_id: details.userId,
                        evm_chain: "1",
                      };
                      console.log(obj);
                      cryptoAddressDB.create(
                        obj,
                        (createError, addressData) => {
                          if (createError) {
                            callback({
                              status: false,
                              Message: "Address not create, Please try later",
                            });
                          } else {
                            if (addressData) {
                              var address = addressData.address;
                              var qrcode =
                                "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                address +
                                "&choe=UTF-8&chld=L";
                              var result = {
                                address: address,
                                qrcode: qrcode,
                                currencySymbol: currency,
                                balance: balance,
                              };
                            } else {
                              var result = {};
                            }
                            console.log("adress response===", result);
                            callback({ status: true, Message: result });
                          }
                        }
                      );
                    } else if (
                      currencydata.currencyType == "2" &&
                      network_name == "ERC20"
                    ) {
                      cryptoAddressDB
                        .findOne(
                          {
                            $and: [
                              { user_id: req.userId },
                              { currencySymbol: "ETH" },
                            ],
                          },
                          { address: 1, privateKey: 1 }
                        )
                        .exec(async (err, data) => {
                          if (err) {
                            return res.json({
                              status: false,
                              Message: "Pleary try leter",
                            });
                          } else if (data) {
                            var address = data.address;
                            var private = data.privateKey;
                            var qrcode =
                              "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                              address +
                              "&choe=UTF-8&chld=L";
                            var result = {
                              address: address,
                              qrcode: qrcode,
                              currencySymbol: currency,
                            };
                            console.log("result===eyh", result);
                            var obj = {
                              address: address.toLowerCase(),
                              privateKey: private,
                              currencySymbol: currencydata.currencySymbol,
                              currency: currencydata._id,
                              user_id: req.userId,
                              network: network_name,
                            };
                            cryptoAddressDB.create(
                              obj,
                              (createError, addressData) => {
                                if (createError) {
                                  return res.json({
                                    status: false,
                                    Message:
                                      "Address not create, Please try later",
                                  });
                                } else {
                                  if (addressData) {
                                    var address = addressData.address;
                                    var qrcode =
                                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                      address +
                                      "&choe=UTF-8&chld=L";
                                    var result = {
                                      address: address,
                                      qrcode: qrcode,
                                      network: network_name,
                                      balance: balance,
                                      network_balance: network_balance,
                                    };
                                  } else {
                                    var result = {};
                                  }
                                  console.log("adress response===", result);
                                  return res.json({
                                    status: true,
                                    Message: result,
                                  });
                                }
                              }
                            );
                          } else {
                            var eth_data = await currencyDB.findOne({
                              currencySymbol: "ETH",
                            });
                            var account = web3.eth.accounts.create();
                            var obj = {
                              address: account.address.toLowerCase(),
                              privateKey: common.encryptionLevel(
                                account.privateKey
                              ),
                              currencySymbol: eth_data.currencySymbol,
                              currency: eth_data._id,
                              user_id: req.userId,
                            };
                            cryptoAddressDB.create(
                              obj,
                              (createError, addressData) => {
                                if (createError) {
                                  return res.json({
                                    status: false,
                                    Message:
                                      "Address not create, Please try later",
                                  });
                                } else {
                                  if (addressData) {
                                    var address = addressData.address;
                                    var qrcode =
                                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                      address +
                                      "&choe=UTF-8&chld=L";
                                    var result = {
                                      address: address,
                                      qrcode: qrcode,
                                      network: network_name,
                                      balance: balance,
                                      network_balance: network_balance,
                                    };
                                  } else {
                                    var result = {};
                                  }
                                  console.log("adress response===", result);
                                  return res.json({
                                    status: true,
                                    Message: result,
                                  });
                                }
                              }
                            );
                          }
                        });
                    } else if (
                      currencydata.currencyType == "2" &&
                      network_name == "TRC20"
                    ) {
                      console.log("call trc20");
                      cryptoAddressDB
                        .findOne(
                          {
                            $and: [
                              { user_id: req.userId },
                              { currencySymbol: "TRX" },
                            ],
                          },
                          { address: 1, privateKey: 1, trx_hexaddress: 1 }
                        )
                        .exec(async (err, data) => {
                          if (err) {
                            return res.json({
                              status: false,
                              Message: "Pleary try leter",
                            });
                          } else if (data) {
                            var address = data.address;
                            var private = data.privateKey;
                            var trx_hexaddress = data.trx_hexaddress;
                            console.log("call trc20 address ===", data);
                            var obj = {
                              address: address,
                              privateKey: private,
                              currencySymbol: currency,
                              currency: currencydata._id,
                              user_id: req.userId,
                              trx_hexaddress: trx_hexaddress.toLowerCase(),
                              network: network_name,
                            };
                            console.log(obj);
                            cryptoAddressDB.create(
                              obj,
                              (createError, addressData) => {
                                if (createError) {
                                  return res.json({
                                    status: false,
                                    Message:
                                      "Address not create, Please try later",
                                  });
                                } else {
                                  if (addressData) {
                                    var address = addressData.address;
                                    var qrcode =
                                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                      address +
                                      "&choe=UTF-8&chld=L";
                                    var result = {
                                      address: address,
                                      qrcode: qrcode,
                                      currencySymbol: currency,
                                      network: network_name,
                                      balance: balance,
                                      network_balance: network_balance,
                                    };
                                  } else {
                                    var result = {};
                                  }
                                  console.log("adress response===", result);
                                  return res.json({
                                    status: true,
                                    Message: result,
                                  });
                                }
                              }
                            );
                          } else {
                            var trx_data = await currencyDB.findOne({
                              currencySymbol: "TRX",
                            });
                            var account = await tronWeb.createAccount();
                            console.log("trx account====", account);
                            var obj = {
                              address: account.address.base58,
                              privateKey: common.encryptionLevel(
                                account.privateKey
                              ),
                              currencySymbol: trx_data.currencySymbol,
                              currency: trx_data._id,
                              user_id: req.userId,
                              trx_hexaddress: account.address.hex.toLowerCase(),
                            };
                            console.log(obj);
                            cryptoAddressDB.create(
                              obj,
                              (createError, addressData) => {
                                if (createError) {
                                  return res.json({
                                    status: false,
                                    Message:
                                      "Address not create, Please try later",
                                  });
                                } else {
                                  if (addressData) {
                                    var address = addressData.address;
                                    var qrcode =
                                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                      address +
                                      "&choe=UTF-8&chld=L";
                                    var result = {
                                      address: address,
                                      qrcode: qrcode,
                                      currencySymbol: currency,
                                      network: network_name,
                                      balance: balance,
                                      network_balance: network_balance,
                                    };
                                  } else {
                                    var result = {};
                                  }
                                  console.log("adress response===", result);
                                  return res.json({
                                    status: true,
                                    Message: result,
                                  });
                                }
                              }
                            );
                          }
                        });
                    } else if (
                      currencydata.currencyType == "2" &&
                      network_name == "BEP20"
                    ) {
                      cryptoAddressDB
                        .findOne(
                          {
                            $and: [
                              { user_id: req.userId },
                              { currencySymbol: "BNB" },
                            ],
                          },
                          { address: 1, privateKey: 1 }
                        )
                        .exec(async (err, data) => {
                          if (err) {
                            return res.json({
                              status: false,
                              Message: "Pleary try leter",
                            });
                          } else if (data) {
                            var address = data.address;
                            var private = data.privateKey;

                            var obj = {
                              address: address.toLowerCase(),
                              privateKey: private,
                              currencySymbol: currencydata.currencySymbol,
                              currency: currencydata._id,
                              user_id: req.userId,
                              network: network_name,
                            };
                            cryptoAddressDB.create(
                              obj,
                              (createError, addressData) => {
                                if (createError) {
                                  return res.json({
                                    status: false,
                                    Message:
                                      "Address not create, Please try later",
                                  });
                                } else {
                                  if (addressData) {
                                    var address = addressData.address;
                                    var qrcode =
                                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                      address +
                                      "&choe=UTF-8&chld=L";
                                    var result = {
                                      address: address,
                                      qrcode: qrcode,
                                      network: network,
                                      balance: balance,
                                      network: network_name,
                                      network_balance: network_balance,
                                    };
                                  } else {
                                    var result = {};
                                  }
                                  console.log("adress response===", result);
                                  return res.json({
                                    status: true,
                                    Message: result,
                                  });
                                }
                              }
                            );
                          } else {
                            var bnb_data = await currencyDB.findOne({
                              currencySymbol: "BNB",
                            });
                            var account = bsc_web3.eth.accounts.create();
                            var obj = {
                              address: account.address.toLowerCase(),
                              privateKey: common.encryptionLevel(
                                account.privateKey
                              ),
                              currencySymbol: bnb_data.currencySymbol,
                              currency: bnb_data._id,
                              user_id: req.userId,
                            };
                            cryptoAddressDB.create(
                              obj,
                              (createError, addressData) => {
                                if (createError) {
                                  return res.json({
                                    status: false,
                                    Message:
                                      "Address not create, Please try later",
                                  });
                                } else {
                                  if (addressData) {
                                    var address = addressData.address;
                                    var qrcode =
                                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                      address +
                                      "&choe=UTF-8&chld=L";
                                    var result = {
                                      address: address,
                                      qrcode: qrcode,
                                      network: network,
                                      balance: balance,
                                      network: network_name,
                                      network_balance: network_balance,
                                    };
                                  } else {
                                    var result = {};
                                  }
                                  console.log("adress response===", result);
                                  return res.json({
                                    status: true,
                                    Message: result,
                                  });
                                }
                              }
                            );
                          }
                        });
                    } else if (
                      currencydata.currencyType == "2" &&
                      network_name == "RPTC20"
                    ) {
                      cryptoAddressDB
                        .findOne(
                          {
                            $and: [
                              { user_id: req.userId },
                              { currencySymbol: "RPTC" },
                            ],
                          },
                          { address: 1, privateKey: 1 }
                        )
                        .exec(async (err, data) => {
                          if (err) {
                            return res.json({
                              status: false,
                              Message: "Pleary try leter",
                            });
                          } else if (data) {
                            var address = data.address;
                            var private = data.privateKey;

                            var obj = {
                              address: address.toLowerCase(),
                              privateKey: private,
                              currencySymbol: currencydata.currencySymbol,
                              currency: currencydata._id,
                              user_id: req.userId,
                              network: network_name,
                            };
                            cryptoAddressDB.create(
                              obj,
                              (createError, addressData) => {
                                if (createError) {
                                  return res.json({
                                    status: false,
                                    Message:
                                      "Address not create, Please try later",
                                  });
                                } else {
                                  if (addressData) {
                                    var address = addressData.address;
                                    var qrcode =
                                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                      address +
                                      "&choe=UTF-8&chld=L";
                                    var result = {
                                      address: address,
                                      qrcode: qrcode,
                                      network: network_name,
                                      balance: balance,
                                      network_balance: network_balance,
                                    };
                                  } else {
                                    var result = {};
                                  }
                                  console.log("adress response===", result);
                                  return res.json({
                                    status: true,
                                    Message: result,
                                  });
                                }
                              }
                            );
                          } else {
                            var bnb_data = await currencyDB.findOne({
                              currencySymbol: "RPTC",
                            });
                            var account = rptc_web3.eth.accounts.create();
                            var obj = {
                              address: account.address.toLowerCase(),
                              privateKey: common.encryptionLevel(
                                account.privateKey
                              ),
                              currencySymbol: bnb_data.currencySymbol,
                              currency: bnb_data._id,
                              user_id: req.userId,
                            };
                            cryptoAddressDB.create(
                              obj,
                              (createError, addressData) => {
                                if (createError) {
                                  return res.json({
                                    status: false,
                                    Message:
                                      "Address not create, Please try later",
                                  });
                                } else {
                                  if (addressData) {
                                    var address = addressData.address;
                                    var qrcode =
                                      "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
                                      address +
                                      "&choe=UTF-8&chld=L";
                                    var result = {
                                      address: address,
                                      qrcode: qrcode,
                                      network: network_name,
                                      balance: balance,
                                      network_balance: network_balance,
                                    };
                                  } else {
                                    var result = {};
                                  }
                                  console.log("adress response===", result);
                                  return res.json({
                                    status: true,
                                    Message: result,
                                  });
                                }
                              }
                            );
                          }
                        });
                    }
                  }
                });
            }
          });
      } else {
        return res.json({ status: false, Message: "Enter valid details" });
      }
    } catch (error) {
      common.create_log(error.message, function (resp) {});
      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.get("/update_rptc", async (req, res) => {
  var address_data = await cryptoAddressDB.find({ currencySymbol: "RPTC" });
  if (address_data.length) {
    for (var i = 0; i < address_data.length; i++) {
      var obj = {
        address: address_data[i].address,
        privateKey: address_data[i].privateKey,
        user_id: address_data[i].user_id,
      };
      common.rptc_token_address(obj, function (resp) {
        console.log("resp==", resp);
      });
    }
  }
});

module.exports = router;
