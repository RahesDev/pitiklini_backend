const cron = require('node-cron');
const converter = require('hex2dec');
const https = require('https');

const currencyDB = require('../model/currency');
const addressDB = require('../model/cryptoaddress');
const usersDB = require('../model/user');
const mailtempDB = require('../model/mailtemplate');
const depositDB = require('../model/deposit');

const common = require('../helper/common');
const mail = require('../helper/mailhelper');
var adminWalletDB     = require('../model/adminWallet');
var fs = require('fs');
var mongoose         = require('mongoose');
const  redisService = require("../redis-helper/redisHelper")
const redis = require("redis");
const client = redis.createClient();
const superagent = require("superagent");
const notifydb = require("../model/notification");
var mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
var userWalletDB = require('../model/userWallet');

function deposit_mail(user_id,amount,symbol){
    console.log("call deposit mail====")
    usersDB.findOne({_id:user_id},{username:1,email:1,mobileNumber:1},function(err,resdata){
        var msg = 'Deposit on '+amount+' '+symbol+' was confirmed';
        if(resdata.email != null)
        {
            resdata.email = common.decrypt(resdata.email);
            mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function(etemperr,etempdata){
                var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, resdata.username).replace(/###MESSAGE###/g, 'Deposit on '+amount+' '+symbol+' was confirmed');
                mail.sendMail({ to: resdata.email, subject: etempdata.Subject, html: etempdataDynamic },function(mailRes){
                });
            });	
        }
        			
    })
}


//ERC20 tokens deposit cron
cron.schedule('*/5 * * * *', async function() {
//cron.schedule('* * * * *', async function() { 
    try {
        client.get('MaticToken', async (err, result) => {
        if (result == null) {
        console.log("call MaticToken deposits here");
            await redisService.setmaticToken(function(response){
                if(response.length>0)
                {
                    for (var i = 0; i < response.length; i++) {
                        var contract_address = response[i].contractAddress_bep20;
                        var decimal = response[i].coinDecimal_bep20;
                        // console.log("contract_address===",contract_address);
                        // console.log("decimal===",decimal);
                        erc20_deposit(i, response.length, contract_address, decimal);
                    }
                }
            })
       } else {
            //console.log("call there");
            var response = JSON.parse(result);
           // console.log("call there",response);
            if(response.length > 0)
            {
                for (var i = 0; i < response.length; i++) {
                    var contract_address = response[i].contractAddress_bep20;
                    var decimal = response[i].coinDecimal_bep20;
                    // console.log("contract_address===",contract_address);
                    // console.log("decimal===",decimal);
                    erc20_deposit(i, response.length, contract_address, decimal);
                }
            }
          }
        });
    } catch (e) {
        //console.log('BEP20 token deposit ERROR REASON ):', e.message);
    }

});

async function erc20_deposit(current, tot, contract_address, decimal) {
    try {
        // console.log("1111");
        // console.log("contract_address===",contract_address);
                //console.log("decimal===",decimal);
                await redisService.setmaticAddress(function(response){
                    if(response.length>0)
                    {
                        response.forEach(function (id, val) {
                         var obj = {
                            contractAddress: contract_address,
                            userAddress: id.address,
                            decimals: decimal
                         }
                         common.matic_token_Balance(obj, async function (balanceRes) {
                            //console.log("balance token response===",balanceRes);
                             if(balanceRes.status)
                             {
                                 var tokenbalance = balanceRes.balance;
                                 if(tokenbalance>0)
                                 {
                                            await superagent
                                            .get(process.env.MATIC_API+"api?module=account&action=tokentx&contractaddress="+contract_address+"&address=" + id.address + "&endblock=latest&sort=desc&page=1&offset=100&apikey="+process.env.MATIC_API_KEY+"")
                                            .end((err, res) => {
                                                if(!err && res)
                                                {
                                                    var responseTxn = res._body;
                                                    //console.log("responseTxn===",responseTxn)
                                                    if (responseTxn.status == '1' && responseTxn.result.length > 0) {
                                                        deposit_bep20(contract_address,responseTxn.result, 0);
                                                    } else {
                                                    }
                                                }
                                            });
                                    
                                 }
                                 else
                                 {
                                     //console.log("no balance from bep20 tokens");
                                 }
                             }
                         })
                     })
                    }
                });
    } catch (err) {
       // console.log('BEP20 DEPOSIT CRON ERROR REASON ):', err);
    }
}

async function deposit_bep20(contractAddress, response, inc) {
    //console.log("response===",response);
    console.log("inc===", inc);
    if (response[inc]) {

        var transaction = response[inc];
        // console.log("transaction====", transaction);
        var currencytable = {
            "contractAddress_bep20": contractAddress
        }
        //console.log("currencytable====", currencytable);
        var currencydata = await currencyDB.findOne(currencytable);
        //console.log("currencytable====", currencydata);
        var address = transaction.to;
        //console.log("address====", address);
        var txid = transaction.hash;
        //console.log("transaction.hash====",transaction.hash)
        var value = transaction.value;
        var currency_id = currencydata._id;
        if (currencydata.currencyType == '2') {
            var ether_balance = (value / Math.pow(10, currencydata.coinDecimal_bep20));
            //console.log("erc20 balance====", ether_balance);
            //var confirmations = transaction.confirmations;
            var userdata = await addressDB.findOne({
                address: transaction.to.toLowerCase(),
                currencySymbol: currencydata.currencySymbol
            }).populate('user_id');

            if (userdata != null) {

                if(userdata.user_id != null)
                {
                    var depositData = await depositDB.find({
                        "userId": userdata.user_id._id,
                        "txnid": transaction.hash
                    });
                    console.log("depositData====",depositData.length)
                    if (depositData.length == 0) {
                        console.log('_________________________________________')
                        if (currencydata) {
                            var curr_id = currencydata._id;
                                var balanceData = await userWalletDB.findOne({
                                    'userId': ObjectId(userdata.user_id._id)
                                },{
                                    'wallets': { $elemMatch: { currencyId: currencydata._id } }
                                });
                                var walletData = balanceData.wallets[0];
                                if (walletData != null) {
                                    var obj = {
                                        totalBalance: walletData.amount,
                                        balanceHoldTotal: walletData.holdAmount,
                                        amount_matic: walletData.amount_matic,
                                    }
                                var balance = obj;
                                //console.log("usernalance", balance);
                                var curBalance = balance.amount_matic;
                                var Balance = balance.amount_matic + ether_balance;
                                var coinBalance = balance.totalBalance;
                                var coinBalance_update = balance.totalBalance + ether_balance;
                                var payments = {
                                    "userId": userdata.user_id._id,
                                    "currency": curr_id,
                                    "depamt": +ether_balance,
                                    "depto": address,
                                    "txnid": transaction.hash,
                                };
                                console.log('Token USER', payments)
                                var dep_res = await depositDB.create(payments)
                                if (dep_res) {

                                    var balanceUpdate_token = await userWalletDB.updateOne({ userId: userdata.user_id._id, "wallets.currencyId": ObjectId(currencydata._id) }, { "$set": { "wallets.$.amount_matic": +Balance } }, { multi: true });
                                    var balanceUpdate_coin = await userWalletDB.updateOne({ userId: userdata.user_id._id, "wallets.currencyId": ObjectId(currencydata._id) }, { "$set": { "wallets.$.amount": +coinBalance_update } }, { multi: true });

                                        var obj = {
                                            to_user_id: ObjectId(userdata.user_id._id),
                                            to_user_name: userdata.user_id.username,
                                            status: 0,
                                            message: '' + ether_balance + ' ' + currencydata.currencySymbol + ' received successfully',
                                            link: "/notificationHistory",
                                        };

                                        let notification = await notifydb.create(obj);

                                        deposit_mail(userdata.user_id._id, ether_balance, currencydata.currencySymbol);
                                }
                        
                                }else{
                                    console.log('*******ss')
                                }
                        }
                    } else {
                    }
                }      
              }
            }
            else {
            }
            console.log("********")
            var inc2 = inc + 1;
            deposit_bep20(contractAddress, response, inc2)
        }
}

// BEP20 tokens move to admin wallet cron
// cron.schedule('*/25 * * * *', function() {
// //cron.schedule('* * * * *', function() {
//     common.getadminwallet("MATIC", function (response) {
//             //console.log("response====",response);
//         var admin_address = response.address;
//         var admin_key = common.decryptionLevel(response.admin_token_name);

//         client.get('MaticToken', async (err, result) => {
//             if (result == null) {
//                 //console.log("call here");
//                 await redisService.setmaticToken(function(response){
//                     if(response.length>0)
//                    {
//                     for (var i = 0; i < response.length; i++) {
//                         var contract_address = response[i].contractAddress_bep20;
//                         var currencySymbol = response[i].currencySymbol;
//                         var decimals = response[i].coinDecimal_bep20;
//                         bep20_move(i, response.length, currencySymbol, decimals, contract_address, admin_address, admin_key);
//                     }
//                     }
//                 });
//             } else {
//                 //console.log("call there");
//                 var response = JSON.parse(result);
//                 if(response.length>0)
//                 {
//                     for (var i = 0; i < response.length; i++) {
//                         var contract_address = response[i].contractAddress_bep20;
//                         var currencySymbol = response[i].currencySymbol;
//                         var decimals = response[i].coinDecimal_bep20;
//                         bep20_move(i, response.length, currencySymbol, decimals, contract_address, admin_address, admin_key);
//                     }
//                 }
                
//             }
//         });
//     });
// });

// async function bep20_move(current, tot, currencySymbol, decimal, contract_address, admin_address, admin_key) {

//     await redisService.setmaticAddress(function(response){
//         if(response.length>0)
//         {
//             response.forEach(function (id, val) {
//                      var obj = {
//                         contractAddress: contract_address,
//                         userAddress: id.address,
//                         decimals: decimal
//                      }
//                      common.matic_token_Balance(obj, function (balanceRes) {
//                          //console.log("balance token response===",balanceRes);
//                          if(balanceRes.status)
//                          {
//                              var tokenbalance = balanceRes.balance;
//                              if(tokenbalance>0)
//                              {
//                                 addressDB.findOne({
//                                     address: id.address
//                                 }).exec(async (err, address_data) => {

//                                     if(address_data)
//                                     {
//                                         depositDB.find({
//                                             "depto": id.address
//                                         }).exec(function (dep_where, dep_dets) {
//                                             if (!dep_where) {
//                                                 if (dep_dets.length > 0) {

//                                         let useraddress = address_data.address;
//                                         var privkey = common.decryptionLevel(address_data.privateKey);
//                                         let adminaddress = admin_address;
//                                         var string_private = privkey.substring(2);
//                                         let decimals = decimal;
//                                         if(useraddress != adminaddress)
//                                         {
//                                             var args = {
//                                                 currencyAddress: useraddress,
//                                                 userAddress: adminaddress,
//                                                 privkey: string_private,
//                                                 decimals: decimals,
//                                                 userprivatekey: admin_key.substring(2),
//                                                 contract_address: contract_address
//                                             };
//                                            //console.log(args, 'bep20 move cron [[[=====argsargs')
//                                             try {
//                                                 common.matic_sendtoken(args, function (respData) {
//                                                     if (respData.status) {
//                                                         console.log('BEP20 MOVE TO ADMINM WALLET, SUCCESS')

//                                                         var admin_obj = {
//                                                             contractAddress: contract_address,
//                                                             userAddress: adminaddress,
//                                                             decimals: decimals
//                                                         }
//                                                         common.matic_token_Balance(admin_obj, function (adminbalanceRes) {
//                                                             // console.log("admin balance response===",adminbalanceRes);
//                                                             if(adminbalanceRes.status)
//                                                             {
//                                                                 var admin_tokenbalance = +adminbalanceRes.balance;
//                                                                 common.updateAdminBalance(currencySymbol, admin_tokenbalance, function (balance) { });
//                                                             }
//                                                         })
//                                                     } else  {
//                                                         console.log(respData.message, '=respData.data.messagerespData.data.message===')
//                                                     }
//                                                    });
                            
//                                             } catch (e) {
//                                                 //console.log('BEP20 MOVE ADMIN WALLET ERROR REASON ):', e.message);
//                                             }
//                                         }
//                                           }
//                                         else
//                                         {
//                                            console.log("no new record in deposit")
//                                         }
//                                         }
//                                        });
                                         
//                                     }

//                                 });
//                              }
//                             }
//                         });
//                     });
//         }
//         });
// }