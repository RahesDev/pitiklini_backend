var express = require("express");
require("dotenv").config();
var router = express.Router();
var usersDB = require("../schema/users");
const key = require("../config/key");
var userWalletDB = require("../schema/userWallet");
var currencyDB = require("../schema/currency");
const cron = require("node-cron");
var cryptoAddressDB = require("../schema/userCryptoAddress");
var adminWalletDB = require("../schema/adminWallet");
var Deposit = require("../schema/deposit");
var walletconfig = require("../helper/wallets");
const rpc = require("node-json-rpc2");
var fs = require("fs");
//console.log (process.env.LIBSODIUMPRIVATE_KEY,">>>>>>>>>>>>>>>>>>>>>>>.")
const eth_host = process.env.ETH_HOST;
const tron_host = process.env.TRON_HOST;
var common = require("../helper/common");

//ETH BLOCK CHAIN //
const Web3 = require("web3");
const web3 = new Web3("https://" + eth_host + "");

const TronWeb = require("tronweb");
const tronWeb = new TronWeb({
  fullHost: "https://" + tron_host + "",
});

const axios = require("axios");

const bsc_web3 = new Web3(process.env.BNB_WALLET);
const arbit_wen3 = new Web3(process.env.ARBITRUM_WALLET);
const matic_web3 = new Web3(process.env.MATIC_URL);
const rptc_host = common.decryptionLevel(process.env.RPTC_HOST);

var rptc_web3 = new Web3(new Web3.providers.HttpProvider(rptc_host));

//------USER CRYPTO ADDRESS GENERATE FUNCTIONALITY----//

const Coinpayments = require("coinpayments");
const CoinpaymentsCredentials = {
  key: common.decryptionLevel(process.env.COINPAYMENTS_KEY),
  secret: common.decryptionLevel(process.env.COINPAYMENTS_SECRET),
};
const coinpaymentsClient = new Coinpayments(CoinpaymentsCredentials);
const sodium = require("libsodium-wrappers");

(async () => {
  await sodium.ready;
})();

// router.post(
//   "/generateAddress",
//   common.isEmpty,
//   common.tokenmiddleware,
//   async (req, res) => {
//     try {
//       console.log(req.userId);
//       console.log(req.body, "((*(*(*(*(*(*(*(*(*(");
//       let getCurrency = await currencyDB.findOne({
//         _id: req.body.currId,
//         currencySymbol: req.body.currencySymbol,
//       });
//       if (getCurrency) {
//         var netWork = req.body.network;
//         var currencyFind =
//           netWork == "erc20token"
//             ? "ETH"
//             : netWork == "bep20token"
//               ? "BNB"
//               : netWork == "arb20token"
//                 ? "ARB"
//                 : netWork == "trc20token"
//                   ? "TRX"
//                   : netWork == "matictoken"
//                     ? "MATIC"
//                     : req.body.currencySymbol;

//         console.log(currencyFind, req.userId, "=============");
//         let findAddress = await cryptoAddressDB.findOne(
//           { $and: [{ user_id: req.userId }, { currencySymbol: currencyFind }] },
//           { address: 1, tag: 1, currencySymbol: 1 }
//         );
//         if (findAddress) {
//           console.log("((*(*(*(*(INSIDE*(*(*(*(*(");
//           var result = {
//             address: findAddress.address,
//             qrcode:
//               "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
//               findAddress.address +
//               "&choe=UTF-8&chld=L",
//             currencySymbol: findAddress.currencySymbol,
//             network: currencyFind,
//             sendCurrency: req.body.currencySymbol,
//           };
//           return res.json({ status: true, Message: "success", data: result });
//         } else {
//           console.log("((*(*(*(OUTSIDE*(*(*(*(*(*(");
//           let userId = req.userId;
//           var url = "";
//           var blockchain = currencyFind;
//           console.log(blockchain, "=-=-=-blockchainblockchain");
//           if (blockchain == "BTC") {
//             console.log("BTCBTCBTCBTCBTCBTC");
//             url = process.env.WALLETCALL + common.decrypt(process.env.BTC_CALL);
//           } else if (blockchain == "ETH") {
//             url = process.env.WALLETCALL + common.decrypt(process.env.EVM_CALL);
//           } else if (blockchain == "BNB") {
//             url = process.env.WALLETCALL + common.decrypt(process.env.EVM_CALL);
//           } else if (blockchain == "ARB") {
//             url = process.env.WALLETCALL + common.decrypt(process.env.EVM_CALL);
//           } else if (blockchain == "MATIC") {
//             url = process.env.WALLETCALL + common.decrypt(process.env.EVM_CALL);
//           } else if (blockchain == "XRP") {
//             url = process.env.WALLETCALL + common.decrypt(process.env.XRP_CALL);
//           } else if (blockchain == "TRX") {
//             url = process.env.WALLETCALL + common.decrypt(process.env.TRX_CALL);
//           } else {
//             url = "";
//             console.log("No correct");
//           }
//           const data = {
//             userKey: userId,
//             coinKey: blockchain,
//             curencyId: getCurrency._id,
//           };
//           console.log(data, "datadatadatadata");
//           console.log(url, "urlurlurlurlurlurl");

//           //const response = await axios.post( url,data,{headers: {'Content-Type': 'application/json','Authorization': 'Bearer your_token_here'}}  );
//           const privateKey = Buffer.from(
//             process.env.LIBSODIUMPRIVATE_KEY,
//             "hex"
//           );
//           const message = Buffer.from(JSON.stringify(data));
//           const signature = sodium.crypto_sign_detached(message, privateKey);

//           console.log(
//             "Generated Signature:",
//             Buffer.from(signature).toString("hex")
//           );

//           // Send POST request with the signature
//           const response = await axios.post(url, data, {
//             headers: {
//               "Content-Type": "application/json",
//               "X-Signature": Buffer.from(signature).toString("hex"),
//             },
//             timeout: 10000
//           });

//           console.log("Response Headers:", response.headers);
//           console.log("Response Data:", response.data);

//           var resulData = response.data.data;
//           if (resulData) {
//             var obj = {
//               user_id: userId,
//               address: resulData.address,
//               currencySymbol: req.body.currencySymbol,
//               userIdKey: resulData.phase2,
//               currency: getCurrency._id,
//               publicKey:
//                 req.body.currencySymbol === "XRP" ||
//                   req.body.currencySymbol === "TRX"
//                   ? resulData.publicKey
//                   : "",
//               trx_hexaddress:
//                 req.body.currencySymbol === "TRX" ? resulData.hex : "",
//             };

//             console.log("Database Object:", obj);
//             let addAddress = await cryptoAddressDB.create(obj);
//             try {
//               if (addAddress) {
//                 var result = {
//                   address: resulData.address,
//                   qrcode:
//                     "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" +
//                     resulData.address +
//                     "&choe=UTF-8&chld=L",
//                   currencySymbol: getCurrency.currencySymbol,
//                 };
//                 return res.json({
//                   status: true,
//                   Message: "success",
//                   data: result,
//                 });
//               }
//             } catch (err) {
//               console.log(err);
//               return res.json({
//                 status: false,
//                 Message: "Please try again later",
//               });
//             }
//           } else {
//             return res.json({
//               status: false,
//               Message: "Please try again later",
//             });
//           }
//         }
//       } else {
//         return res.json({ status: false, Message: "Oops!, Invalid Details" });
//       }
//     } catch (error) {
//       console.log(error, "=-=-=-errrr0r");
//       return res.json({
//         status: false,
//         Message: "Internal server error",
//         error: error,
//       });
//     }
//   }
// );

// ADDRESS GENERATION Final

router.post("/generateAddress", common.isEmpty, common.tokenmiddleware, async (req,res) => {
  try {
    let getCurrency = await currencyDB.findOne({ _id : req.body.currId, currencySymbol : req.body.currencySymbol});
    var get_user_wallet = await  userWalletDB.findOne({userId:req.userId})
    if(!get_user_wallet){
      let currencyArray = await currencyDB.find({}).map(currency => ({currencyId: currency._id,currencyName: currency.currencyName,currencySymbol: currency.currencySymbol}));
      let walletData = {
        userId: req.userId,
        wallets: currencyArray,
        };
        await userWalletDB.create(walletData);
    }else{
      let walletIndex = get_user_wallet.wallets.findIndex(wallet => wallet.currencyId.equals(getCurrency._id));
          if (walletIndex !== -1) {
          } else {
          get_user_wallet.wallets.push({
          currencyId: getCurrency._id,
          currencyName: getCurrency.currencyName,
          currencySymbol: getCurrency.currencySymbol,
          });
          await get_user_wallet.save();
         }
    }
    if(getCurrency != null){
      var netWork = req.body.network;
      var currencyFind = netWork == "erc20token" ? "ETH" : netWork == "bep20token" ? "BNB" :  netWork == "trc20token"  ? "TRX" : netWork == "matictoken"  ? "MATIC" :  req.body.currencySymbol
      console.log(currencyFind,"currencyFind");
      console.log(req.body.network,"req.body.network");
      let find_currency = await currencyDB.findOne({currencySymbol: currencyFind});
      let findAddress = await cryptoAddressDB.findOne({ $and: [ { user_id: req.userId }, { currencySymbol: currencyFind }]},{ address: 1, tag: 1, currencySymbol: 1});
       if(findAddress != null){
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
          console.log(data,"=-=-=-=-=-=--=")
          console.log(url,"=-=-=-=-=-=--=")
          //const response = await axios.post( url,data,{headers: {'Content-Type': 'application/json','Authorization': 'Bearer your_token_here'}}  );
          const privateKey = Buffer.from(process.env.LIBSODIUMPRIVATE_KEY, 'hex');
          const message = Buffer.from(JSON.stringify(data));
          const signature = sodium.crypto_sign_detached(message, privateKey);
  
          console.log('Generated Signature:', Buffer.from(signature).toString('hex'));
          // Send POST request with the signature
          const response = await axios.post(url, data, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${req.headers.authorization}`,
              'X-Signature': Buffer.from(signature).toString('hex')
            }
          });
  
          console.log('Response Headers:', response.headers);
          console.log('Response Data:', response.data);
  
          var resulData = response.data.data;
          if (resulData) {
            var obj = {
              user_id: userId,
              address: resulData.address,
              privateKey:resulData.currency_private_key,
              currencySymbol: find_currency.currencySymbol,
              userIdKey: resulData.privateKey,
              currency: find_currency._id,
              publicKey: req.body.currencySymbol === "XRP" || req.body.currencySymbol === "TRX" ? resulData.publicKey : "",
              trx_hexaddress: req.body.currencySymbol === "TRX" ? resulData.hex : ""
            };
  
            console.log('Database Object:', obj);
            let addAddress = await cryptoAddressDB.create(obj);
            try {
              if (addAddress) {
                var result = {
                  address: resulData.address,
                  qrcode: "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" + resulData.address + "&choe=UTF-8&chld=L",
                  currencySymbol: getCurrency.currencySymbol,
                };
                return res.json({ status: true, Message: "success", data: result });
              }
            } catch (err) {
              console.log(err)
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
    console.log(error,"--0-0-0-0-0-")
    return res.json({ status: false, Message: "Internal server error",error:error });
  }
} );

// admin address generation

// router.post("/generateAdminAddress", common.isEmpty, common.tokenmiddleware, async (req,res) => {
//   try {
//     let getCurrency = await currencyDB.findOne({ _id : req.body.currId, currencySymbol : req.body.currencySymbol});
//     var get_user_wallet = await  adminWalletDB.findOne({userId:req.userId})
//     if(!get_user_wallet){
//       let currencyArray = await currencyDB.find({}).map(currency => ({currencyId: currency._id,currencyName: currency.currencyName,currencySymbol: currency.currencySymbol}));
//       let walletData = {
//         userId: req.userId,
//         wallets: currencyArray,
//         };
//         await adminWalletDB.create(walletData);
//     }else{
//       let walletIndex = get_user_wallet.wallets.findIndex(wallet => wallet.currencyId.equals(getCurrency._id));
//           if (walletIndex !== -1) {
//           } else {
//           get_user_wallet.wallets.push({
//           currencyId: getCurrency._id,
//           currencyName: getCurrency.currencyName,
//           currencySymbol: getCurrency.currencySymbol,
//           });
//           await get_user_wallet.save();
//          }
//     }
//     if(getCurrency){
//       var netWork = req.body.network;
//       var currencyFind = netWork == "erc20token" ? "ETH" : netWork == "bep20token" ? "BNB" : netWork == "arb20token" ? "ARB" :  netWork == "trc20token"  ? "TRX" : netWork == "matictoken"  ? "MATIC" :  req.body.currencySymbol == "LINK"?"ETH":req.body.currencySymbol
//       let findAddress = await cryptoAddressDB.findOne({ $and: [ { user_id: req.userId }, { currencySymbol: currencyFind }]},{ address: 1, tag: 1, currencySymbol: 1});
//        if(findAddress){
//         var result = {
//           address: findAddress.address,
//           qrcode:   "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" + findAddress.address +"&choe=UTF-8&chld=L",
//           currencySymbol: findAddress.currencySymbol,
//           network : currencyFind,
//           sendCurrency :  req.body.currencySymbol
//         };
//         return res.json({status :  true, Message : "success", data : result});
//        }else{
//         let userId = req.userId
//         var url = "";
//         var blockchain = currencyFind;
//       if( blockchain== "BTC"){
//            url = process.env.WALLETCALL+common.decrypt(process.env.BTC_CALL)
//            console.log(url,"????????????????????")
//         }else if(blockchain == "ETH"){
//            url = process.env.WALLETCALL+common.decrypt(process.env.EVM_CALL)
//         }else if( blockchain== "BNB"){
//            url = process.env.WALLETCALL+common.decrypt(process.env.EVM_CALL)
//         }else if( blockchain== "ARB"){
//           url = process.env.WALLETCALL+common.decrypt(process.env.EVM_CALL)
//         }else if( blockchain== "MATIC"){
//           url = process.env.WALLETCALL+common.decrypt(process.env.EVM_CALL)
//         }else if( blockchain == "XRP"){
//           url = process.env.WALLETCALL+common.decrypt(process.env.XRP_CALL)
//         }else if( blockchain == "TRX"){
//           url = process.env.WALLETCALL+common.decrypt(process.env.TRX_CALL)
//         }else{
//           url = ""
//         }
//         if (!url) {
//           console.error("Invalid blockchain, URL not generated.");
//           return res.json({ status: false, Message: "Invalid blockchain type." });
//         }
        
//         const privateKeyHex = process.env.LIBSODIUMPRIVATE_KEY;
//         if (!privateKeyHex) {
//           throw new Error("Private key is missing from environment variables");
//         }
//         const privateKey = Buffer.from(privateKeyHex, 'hex');
//           const data = {
//             userKey: userId,
//             coinKey: blockchain,
//             curencyId: getCurrency._id,
//           };
//           console.log("Data to Sign:", data);
          
//           try {
//             const message = Buffer.from(JSON.stringify(data));
          
//             const messageBuffer = Buffer.from(message, 'utf8');

//             const signature = sodium.crypto_sign_detached(messageBuffer, privateKey);
//             console.log("Generated Signature:", Buffer.from(signature).toString('hex'));
          
//             var response = await axios.post(url, data, {
//               headers: {
//                 'Content-Type': 'application/json',
//                 'X-Signature': Buffer.from(signature).toString('hex'),
//               },
//             });
          
//             console.log("Response Data:", response.data);
//           } catch (error) {
//             console.error("Error in signature generation or API call:", error);
//             throw error;
//           }
  
//           console.log('Response Headers:', response.headers);
//           console.log('Response Data:', response.data);
  
//           var resulData = response.data.data;
//           if (resulData) {
//             var obj = {
//               user_id: userId,
//               address: resulData.address,
//               currencySymbol: req.body.currencySymbol,
//               userIdKey: resulData.phase2,
//               currency: getCurrency._id,
//               publicKey: req.body.currencySymbol === "XRP" || req.body.currencySymbol === "TRX" ? resulData.publicKey : "",
//               trx_hexaddress: req.body.currencySymbol === "TRX" ? resulData.hex : ""
//             };
  
//             console.log('Database Object:', obj);
//             let addAddress = await cryptoAddressDB.create(obj);
//             try {
//               if (addAddress) {
//                 var result = {
//                   address: resulData.address,
//                   qrcode: "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" + resulData.address + "&choe=UTF-8&chld=L",
//                   currencySymbol: getCurrency.currencySymbol,
//                 };
//                 return res.json({ status: true, Message: "success", data: result });
//               }
//             } catch (err) {
//               console.log(err)
//               return res.json({ status: false, Message: "Please try again later" });
//             }
//           }else{
//             return res.json({ status: false, Message: "Please try again later" });
//           }
//        }
//     }else{
//       return res.json({ status: false, Message: "Oops!, Invalid Details"});
//     }
//   } catch (error) {
//     console.log(error,"--0-0-0-0-0-")
//     return res.json({ status: false, Message: "Internal server error",error:error });
//   }
// } );

router.post("/generateAdminAddress", common.isEmpty, common.tokenmiddleware, async (req,res) => {
  try {
    let getCurrency = await currencyDB.findOne({ _id : req.body.currId, currencySymbol : req.body.currencySymbol});
    var get_user_wallet = await  adminWalletDB.findOne({userId:req.userId})
    if(!get_user_wallet){
      let currencyArray = await currencyDB.find({}).map(currency => ({currencyId: currency._id,currencyName: currency.currencyName,currencySymbol: currency.currencySymbol}));
      let walletData = {
        userId: req.userId,
        wallets: currencyArray,
        };
        await adminWalletDB.create(walletData);
    }else{
      let walletIndex = get_user_wallet.wallets.findIndex(wallet => wallet.currencyId.equals(getCurrency._id));
          if (walletIndex !== -1) {
          } else {
          get_user_wallet.wallets.push({
          currencyId: getCurrency._id,
          currencyName: getCurrency.currencyName,
          currencySymbol: getCurrency.currencySymbol,
          });
          await get_user_wallet.save();
         }
    }
    if(getCurrency){
      var netWork = req.body.network;
      var currencyFind = netWork == "erc20token" ? "ETH" : netWork == "bep20token" ? "BNB" : netWork == "arbtoken" ? "ARB" :  netWork == "trc20token"  ? "TRX" : netWork == "matictoken"  ? "MATIC" :  req.body.currencySymbol == "LINK"?"ETH":req.body.currencySymbol
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
          console.log(data,"=-=-=-=-=-=--=")
          //const response = await axios.post( url,data,{headers: {'Content-Type': 'application/json','Authorization': 'Bearer your_token_here'}}  );
          const privateKey = Buffer.from(process.env.LIBSODIUMPRIVATE_KEY, 'hex');
          const message = Buffer.from(JSON.stringify(data));
          const signature = sodium.crypto_sign_detached(message, privateKey);
  
          console.log('Generated Signature:', Buffer.from(signature).toString('hex'));
          // Send POST request with the signature
          const response = await axios.post(url, data, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${req.headers.authorization}`,
              'X-Signature': Buffer.from(signature).toString('hex')
            }
          });
  
          console.log('Response Headers:', response.headers);
          console.log('Response Data:', response.data);
  
          var resulData = response.data.data;
          if (resulData) {
            var obj = {
              user_id: userId,
              address: resulData.address,
              currencySymbol: req.body.currencySymbol,
              userIdKey: resulData.phase2,
              currency: getCurrency._id,
              publicKey: req.body.currencySymbol === "XRP" || req.body.currencySymbol === "TRX" ? resulData.publicKey : "",
              trx_hexaddress: req.body.currencySymbol === "TRX" ? resulData.hex : ""
            };
  
            console.log('Database Object:', obj);
            let addAddress = await cryptoAddressDB.create(obj);
            try {
              if (addAddress) {
                var result = {
                  address: resulData.address,
                  qrcode: "https://quickchart.io/chart?cht=qr&chs=280x280&chl=" + resulData.address + "&choe=UTF-8&chld=L",
                  currencySymbol: getCurrency.currencySymbol,
                };
                return res.json({ status: true, Message: "success", data: result });
              }
            } catch (err) {
              console.log(err)
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
    console.log(error,"--0-0-0-0-0-")
    return res.json({ status: false, Message: "Internal server error",error:error });
  }
} );

router.post(
  "/checkBalance",
  common.isEmpty,
  common.tokenmiddleware,
  async (req, res) => {
    try {
      let getCurrency = await currencyDB.findOne({
        _id: req.body.currId,
        currencySymbol: req.body.currencySymbol,
      });
      var userId = req.userId;
      var blockchain = "BNB";
      const data = {
        userKey: userId,
        coinKey: blockchain,
        curencyId: getCurrency._id,
        bnbAddress: "0x6F65fEcA162f808EC9F541ADab8C8f6cd7aFA0B1",
        ethAddress: "0x5AE1Ab6E7Ff1A9090B71C36a79473A420BBeF196",
        contractBNB: "0x86f4CdDB8A1Dc2F642a7c5304a0fdbd70994C469",
        contractETH: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      };
      //const response = await axios.post( url,data,{headers: {'Content-Type': 'application/json','Authorization': 'Bearer your_token_here'}}  );
      const privateKey = Buffer.from(process.env.LIBSODIUMPRIVATE_KEY, "hex");
      const message = Buffer.from(JSON.stringify(data));
      const signature = sodium.crypto_sign_detached(message, privateKey);

      // console.log('Generated Signature:', Buffer.from(signature).toString('hex'));
      var url =
        process.env.WALLETCALL + "/api/v1/evmChain/mainnet/checkBalance";
      // var url = process.env.WALLETCALL + "/api/v1/evmChain/mainnet/evmTokenBalance";

      // console.log(url, '==-url-=-=')
      // Send POST request with the signature
      const response = await axios.post(url, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmI4OTk4MjIwODI4ZTA1ZDhlMTU0YmIiLCJpYXQiOjE3MjYzMjcyODF9.V2bxLvHofBNYJi2wGM2A_giwUSyFYINRqTUzrxsME_A`,
          "X-Signature": Buffer.from(signature).toString("hex"),
        },
      });

      res.json(response.data);

      //btc//

      // const btcdata = {
      //   btcAddress : req.body.btcAddress
      // };
      // var btcURL = process.env.WALLETCALL+"/api/v1/bitcoin/mainnet/btcbalance";

      // const btcBalance = await axios.post(btcURL, btcdata, {
      //   headers: {
      //   'Content-Type': 'application/json',
      //   'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmI4OTk4MjIwODI4ZTA1ZDhlMTU0YmIiLCJpYXQiOjE3MjYzMjcyODF9.V2bxLvHofBNYJi2wGM2A_giwUSyFYINRqTUzrxsME_A`,
      //   'X-Signature': Buffer.from(signature).toString('hex')
      //   }
      // });

      // res.json(btcBalance.data);

      //xrp//

      // const xrpData = {
      //   xrpAddress: req.body.xrpddress
      // };
      // var xrpURL = process.env.WALLETCALL + "/api/v1/xrpNetwork/mainnet/xrpBalanceFind";

      // const xrpBalance = await axios.post(xrpURL, xrpData, {
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmI4OTk4MjIwODI4ZTA1ZDhlMTU0YmIiLCJpYXQiOjE3MjYzMjcyODF9.V2bxLvHofBNYJi2wGM2A_giwUSyFYINRqTUzrxsME_A`,
      //     'X-Signature': Buffer.from(signature).toString('hex')
      //   }
      // });
      // console.log('xrpBalance', xrpBalance.data);
      // res.json(xrpBalance.data);

      // tron

      // const tronData = {
      //   trxAddress: req.body.trxAddress,
      //   tokenContractAddress: req.body.tokenContractAddress  // NEED for Token Balance
      // };
      // var trxURL = process.env.WALLETCALL + "/api/v1/trxNetwork/mainnet/trxBalanceFind";                  // OWN Currecy Balance

      // const trxBalance = await axios.post(trxURL, tronData, {
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NmI4OTk4MjIwODI4ZTA1ZDhlMTU0YmIiLCJpYXQiOjE3MjYzMjcyODF9.V2bxLvHofBNYJi2wGM2A_giwUSyFYINRqTUzrxsME_A`,
      //     'X-Signature': Buffer.from(signature).toString('hex')
      //   }
      // });
      // console.log('trxBalanceFind', trxBalance.data);
      // res.json(trxBalance.data);
    } catch (error) {
      console.log("errorerrorerror", error);
      return res.json({
        status: false,
        Message: "Internal server error",
        error: error,
      });
    }
  }
);

// router.get(
//   "/UserwalletBalance",
//   common.tokenmiddleware,
//   async (req, res) => {
//     try {
//       let userId = req.userId;

//       // Fetch user addresses
//       let userAddresses = await cryptoAddressDB.find(
//         { user_id: userId },
//         { address: 1, tag: 1, currencySymbol: 1 }
//       );
//       if (!userAddresses || userAddresses.length === 0) {
//         return res.json({
//           status: false,
//           message: "No addresses found for this user.",
//         });
//       }

//       // Fetch currency details
//       const trc20Tokens = await currencyDB.find(
//         { trc20token: 1 },
//         { currencySymbol: 1, contractAddress_trc20: 1, currencyName: 1 }
//       );
//       const bep20Tokens = await currencyDB.find(
//         { bep20token: 1 },
//         { currencySymbol: 1, contractAddress_bep20: 1, currencyName: 1 }
//       );

//       const tronAddress = userAddresses.find(
//         (addr) => addr.currencySymbol === "TRON"
//       )?.address;
//       const bnbAddress = userAddresses.find(
//         (addr) => addr.currencySymbol === "BNB"
//       )?.address;

//       // Initialize results object
//       const results = {};

//       // Helper function to get balance
//       const getBalance = async (
//         currency,
//         address,
//         contractAddress,
//         apiUrl,
//         type,
//         res
//       ) => {
//         try {
//           const data = {
//             userKey: userId,
//             coinKey: currency,
//             address,
//             contractAddress,
//             type,
//             token: res,
//           };

//           const privateKey = Buffer.from(
//             process.env.LIBSODIUMPRIVATE_KEY,
//             "hex"
//           );
//           const message = Buffer.from(JSON.stringify(data));
//           const signature = sodium.crypto_sign_detached(message, privateKey);

//           const response = await axios.post(apiUrl, data, {
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
//               "X-Signature": Buffer.from(signature).toString("hex"),
//             },
//           });

//           console.log(response.data, "response.data");

//           results[res] = response.data;
//         } catch (error) {
//           console.error(`Error fetching ${res} balance:`, error);
//           results[res] = {
//             status: false,
//             message: `Error fetching ${res} balance.`,
//           };
//         }
//       };

//       // Iterate over user addresses and fetch balances
//       // for (const addressInfo of userAddresses) {
//       //   const { address, currencySymbol } = addressInfo;

//       //   switch (currencySymbol) {
//       //     case "BNB":
//       //       await getBalance(
//       //         "BNB",
//       //         address,
//       //         "",
//       //         `${process.env.WALLETCALL}/api/v1/evmChain/mainnet/checkBalance`,
//       //         "Currency",
//       //         "BNB"
//       //       );
//       //       break;
//       //     case "ETH":
//       //       await getBalance(
//       //         "ETH",
//       //         address,
//       //         "",
//       //         `${process.env.WALLETCALL}/api/v1/evmChain/mainnet/checkBalance`,
//       //         "Currency",
//       //         "ETH"
//       //       );
//       //       break;
//       //     case "BTC":
//       //       await getBalance(
//       //         "BTC",
//       //         address,
//       //         "",
//       //         `${process.env.WALLETCALL}/api/v1/bitcoin/mainnet/btcbalance`,
//       //         "Currency",
//       //         "BTC"
//       //       );
//       //       break;
//       //     case "XRP":
//       //       await getBalance(
//       //         "XRP",
//       //         address,
//       //         "",
//       //         `${process.env.WALLETCALL}/api/v1/xrpNetwork/mainnet/xrpBalanceFind`,
//       //         "Currency",
//       //         "XRP"
//       //       );
//       //       break;
//       //     case "TRON":
//       //       await getBalance(
//       //         "TRON",
//       //         address,
//       //         "",
//       //         `${process.env.WALLETCALL}/api/v1/trxNetwork/mainnet/trxBalanceFind`,
//       //         "Currency",
//       //         "TRON"
//       //       );
//       //       break;
//       //     default:
//       //       break;
//       //   }
//       // }

//       for (const addressInfo of userAddresses) {
//         const { address, currencySymbol } = addressInfo;
//         const currencyEndpoints = {
//           BNB: `${process.env.WALLETCALL}${process.env.EVM_Wallet}`,
//           ETH: `${process.env.WALLETCALL}${process.env.EVM_Wallet}`,
//           BTC: `${process.env.WALLETCALL}${process.env.BTC_Wallet}`,
//           XRP: `${process.env.WALLETCALL}${process.env.XRP_Wallet1}`,
//           TRON: `${process.env.WALLETCALL}${process.env.TRX_Wallet}`,
//         };

//         if (currencyEndpoints[currencySymbol]) {
//           await getBalance(
//             currencySymbol,
//             address,
//             "",
//             currencyEndpoints[currencySymbol],
//             "Currency",
//             currencySymbol
//           );
//         }
//       }
//       if (tronAddress) {
//         for (const token of trc20Tokens) {
//           await getBalance(
//             "TRC",
//             tronAddress,
//             token.contractAddress_trc20,
//             `${process.env.WALLETCALL}/api/v1/trxNetwork/mainnet/trxBalanceFind`,
//             "Token",
//             `TRC-20-${token.currencySymbol}`
//           );
//         }
//       }

//       if (bnbAddress) {
//         for (const token of bep20Tokens) {
//           await getBalance(
//             "BNB",
//             bnbAddress,
//             token.contractAddress_bep20,
//             `${process.env.WALLETCALL}/api/v1/evmChain/mainnet/checkBalance`,
//             "Token",
//             `BEP-20-${token.currencySymbol}`
//           );
//         }
//       }

//       // Combine all `data` arrays into a single array
//       const mergedData = Object.keys(results).reduce((acc, key) => {
//         if (results[key].data && Array.isArray(results[key].data)) {
//           return acc.concat(results[key].data);
//         }
//         return acc;
//       }, []);

//       // Step: Check transaction hashes, update user wallet, and find currencyId
//       for (const transaction of mergedData) {
//         const currencySymbol = transaction.currency.toUpperCase(); // Assuming transaction contains currencySymbol
//         const amount = transaction.amount || transaction.amountReceived || 0; // Get transaction amount

//         // Step 3: Find the user's wallet for this currency
//         const userWallet = await userWalletDB.findOne({
//           userId: userId,
//         });

//         if (userWallet) {
//           // Step 4: Find the wallet for the specific currenc
//           const wallet = userWallet.wallets.find(
//             (wallet) => wallet.currencySymbol === currencySymbol
//           );

//           if (wallet) {
//             const currencyId = wallet.currencyId; // Get the currencyId from the user's wallet

//             // Step 5: Check if the transaction hash already exists in the database
//             const existingTransaction = await Deposit.findOne({
//               txnid: transaction.transactionHash,
//             });

//             if (!existingTransaction) {
//               // Step 6: Update the user's wallet amount
//               await userWalletDB.updateOne(
//                 { userId: userId, "wallets.currencySymbol": currencySymbol },
//                 {
//                   $inc: { "wallets.$.amount": Number(amount) }, // Increment wallet balance
//                 },
//                 { new: true }
//               );

//               // Step 7: Insert new deposit into the Deposit collection
//               const deposit = {
//                 userId: userId,
//                 currency: currencyId, // Use currencyId from the wallet
//                 depamt: amount, // Amount of the deposit
//                 txnid: transaction.transactionHash, // Transaction hash
//                 status: 1, // Completed status
//                 depto: transaction.toAddress || "", // Deposit destination (if applicable)
//                 username: req.username || "", // Username from the request
//                 depType: 0, // Assuming 0 means crypto deposit
//                 createddate: Date.now(),
//                 updateddate: Date.now(),
//               };

//               await Deposit.insertMany([deposit]); // Insert the deposit into the database
//               console.log(
//                 `Deposit for transaction ${transaction.transactionHash} inserted successfully.`
//               );
//             } else {
//               console.log(
//                 `Transaction with hash ${transaction.transactionHash} already exists.`
//               );
//             }
//           } else {
//             console.error(
//               `Currency ${currencySymbol} not found in user wallet.`
//             );
//           }
//         } else {
//           console.error(`User wallet not found for userId: ${userId}`);
//         }
//       }

//       // Return success message with the number of new deposits added
//       res.json({
//         status: true,
//         message: `${mergedData.length} new deposits processed.`,
//       });
//     } catch (error) {
//       console.error("Error in /getuserBalance:", error);
//       res.json({ status: false, message: "Internal server error", error });
//     }
//   }
// );


router.get("/UserwalletBalance", common.tokenmiddleware, async (req, res) => {
  try {
    let userId = req.userId;
    
    // Fetch user addresses
    let userAddresses = await cryptoAddressDB.find(
      { user_id: userId },
      { address: 1, tag: 1, currencySymbol: 1 }
    );
    if (!userAddresses || userAddresses.length === 0) {
      return res.json({
        status: false,
        message: "No addresses found for this user.",
      });
    }

    // Fetch currency details in parallel
    const [trc20Tokens, bep20Tokens] = await Promise.all([
      currencyDB.find({ trc20token: 1 }, { currencySymbol: 1, contractAddress_trc20: 1, currencyName: 1 }),
      currencyDB.find({ bep20token: 1 }, { currencySymbol: 1, contractAddress_bep20: 1, currencyName: 1 })
    ]);

    const tronAddress = userAddresses.find((addr) => addr.currencySymbol === "TRON")?.address;
    const bnbAddress = userAddresses.find((addr) => addr.currencySymbol === "BNB")?.address;

    const results = {};

    // Helper function to get balance
    const getBalance = async (currency, address, contractAddress, apiUrl, type, res) => {
      try {
        const data = { userKey: userId, coinKey: currency, address, contractAddress, type, token: res };

        const privateKey = Buffer.from(process.env.LIBSODIUMPRIVATE_KEY, "hex");
        const message = Buffer.from(JSON.stringify(data));
        const signature = sodium.crypto_sign_detached(message, privateKey);

        const response = await axios.post(apiUrl, data, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AUTH_TOKEN}`,
            "X-Signature": Buffer.from(signature).toString("hex"),
          },
        });

        results[res] = response.data;
      } catch (error) {
        console.error(`Error fetching ${res} balance:`, error);
        results[res] = { status: false, message: `Error fetching ${res} balance.` };
      }
    };

    // Mapping currency symbols to endpoints
    const currencyEndpoints = {
      BNB: `${process.env.WALLETCALL}${process.env.EVM_Wallet}`,
      ETH: `${process.env.WALLETCALL}${process.env.EVM_Wallet}`,
      BTC: `${process.env.WALLETCALL}${process.env.BTC_Wallet}`,
      XRP: `${process.env.WALLETCALL}${process.env.XRP_Wallet1}`,
      TRON: `${process.env.WALLETCALL}${process.env.TRX_Wallet}`,
    };

    await Promise.all(userAddresses.map(async (addressInfo) => {
      const { address, currencySymbol } = addressInfo;
      if (currencyEndpoints[currencySymbol]) {
        await getBalance(currencySymbol, address, "", currencyEndpoints[currencySymbol], "Currency", currencySymbol);
      }
    }));

    if (tronAddress) {
      await Promise.all(trc20Tokens.map(async (token) => {
        await getBalance(
          "TRC",
          tronAddress,
          token.contractAddress_trc20,
          `${process.env.WALLETCALL}/api/v1/trxNetwork/mainnet/trxBalanceFind`,
          "Token",
          `TRC-20-${token.currencySymbol}`
        );
      }));
    }

    if (bnbAddress) {
      await Promise.all(bep20Tokens.map(async (token) => {
        await getBalance(
          "BNB",
          bnbAddress,
          token.contractAddress_bep20,
          `${process.env.WALLETCALL}/api/v1/evmChain/mainnet/checkBalance`,
          "Token",
          `BEP-20-${token.currencySymbol}`
        );
      }));
    }

    // Merging results and processing transactions
    const mergedData = Object.keys(results).reduce((acc, key) => {
      if (results[key].data && Array.isArray(results[key].data)) {
        return acc.concat(results[key].data);
      }
      return acc;
    }, []);

    // Process each transaction, check if it already exists, update user wallet
    await Promise.all(mergedData.map(async (transaction) => {
      const currencySymbol = transaction.currency.toUpperCase();
      const amount = transaction.amount || transaction.amountReceived || 0;

      const userWallet = await userWalletDB.findOne({ userId: userId });
      if (userWallet) {
        const wallet = userWallet.wallets.find((wallet) => wallet.currencySymbol === currencySymbol);
        if (wallet) {
          const currencyId = wallet.currencyId;
          const existingTransaction = await Deposit.findOne({ txnid: transaction.transactionHash });

          if (!existingTransaction) {
            await userWalletDB.updateOne(
              { userId: userId, "wallets.currencySymbol": currencySymbol },
              { $inc: { "wallets.$.amount": Number(amount) } }
            );

            const deposit = {
              userId: userId,
              currency: currencyId,
              depamt: amount,
              txnid: transaction.transactionHash,
              status: 1,
              depto: transaction.toAddress || "",
              username: req.username || "",
              depType: 0,
              createddate: Date.now(),
              updateddate: Date.now(),
            };
            await Deposit.insertMany([deposit]);
          }
        }
      }
    }));

    res.json({
      status: true,
      message: `${mergedData.length} new deposits processed.`,
    });
  } catch (error) {
    console.error("Error in /getuserBalance:", error);
    res.json({ status: false, message: "Internal server error", error });
  }
});


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
                      } else if (currency == "ARB") {
                        var account = arbit_wen3.eth.accounts.create();
                        console.log(account, "arbitaccount");
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
                      } else if (currency == "TRX") {
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
                      } else if (currency == "MATIC") {
                        var account = matic_web3.eth.accounts.create();
                        var obj = {
                          address: account.address.toLowerCase(),
                          privateKey: common.encryptionLevel(
                            account.privateKey
                          ),
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
                      } else if (currency == "XRP") {
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
              common.rptc_update_address(addressrptc, function (resp) { });

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
                              function (resp) { }
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
      common.create_log(error.message, function (resp) { });
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
