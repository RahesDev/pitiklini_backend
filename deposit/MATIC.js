const cron = require('node-cron');
const converter = require('hex2dec');
const https = require('https');

const currencyDB = require('../schema/currency');
const addressDB = require('../schema/userCryptoAddress');
var usersDB = require("../schema/users");
const mailtempDB = require('../schema/mailtemplate');
const depositDB = require('../schema/deposit');
const common = require('../helper/common');
const mail = require('../helper/mailhelper');
var walletconfig = require("../helper/wallets");
// const  redisHelper = require("../service/redis")
const redis          = require("redis");
const client         = redis.createClient({});
const notifydb = require("../schema/notification");
var mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
var userWalletDB = require('../schema/userWallet');
var adminWalletDB     = require('../schema/adminWallet');


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

// fetch db address
//cron.schedule('*/7 * * * *', async function () {

let matic_deposit = (exports.matic_deposit=(address)=>{
    try{

        common.matic_Balance({address:address},async function(balanceRes){
            console.log(balanceRes,"balanceRes")

      var final_balance = +balanceRes.balance;
    //   if (final_balance > 0) {
        await https.get(process.env.MATIC_API+"api?module=account&action=txlist&address=" + address + "&endblock=latest&apikey="+process.env.MATIC_API_KEY+"", (resp) => {
            // console.log(resp,"erooooppppppppppp")
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                try {
                    var responseTxn = JSON.parse(data);
                   console.log("responseTxn===", responseTxn);
                    if (responseTxn.status == '1' && responseTxn.result.length > 0) {
                       // console.log("call here");
                        deposit_bnb(responseTxn.result, 0);
                    } else {
                    }

                } catch (err) {
                }
            });
        }).on("error", (err) => {
        });

    //   }
        })
    }catch(error){
    console.log(error, "=-=-=-=--=-=-=-==--error");
    }
  return true;

})
// cron.schedule('*/3 * * * *', async function () {
//     //console.log("bnb crons====");
//     client.get('MATICAddress', async (err, result) => {
//         if (result == null) {
//             //console.log("call BNB here");
//             await redisHelper.setmaticAddress(function(response){
//                 if(response.length>0)
//                 {
//                     response.forEach(function (id, val) {
//                         common.matic_Balance({address:id.address}, async function (balanceRes) {
//                         console.log("matic balanceRes===",balanceRes);
//                             var final_balance = +balanceRes.balance;
//                            //console.log("final balance===",final_balance);
//                            // console.log("adddress===",id);
//                             if (final_balance > 0) {
//                                 console.log("call balance===",id.address)
//                                await https.get(process.env.MATIC_API+"api?module=account&action=txlist&address=" + id.address + "&endblock=latest&apikey="+process.env.MATIC_API_KEY+"", (resp) => {
//                                     let data = '';
//                                     resp.on('data', (chunk) => {
//                                         data += chunk;
//                                     });
//                                     resp.on('end', () => {
//                                         try {
//                                             var responseTxn = JSON.parse(data);
//                                            console.log("responseTxn===", responseTxn);
//                                             if (responseTxn.status == '1' && responseTxn.result.length > 0) {
//                                                // console.log("call here");
//                                                 deposit_bnb(responseTxn.result, 0);
//                                             } else {
//                                             }
    
//                                         } catch (err) {
//                                         }
//                                     });
//                                 }).on("error", (err) => {
//                                 });
//                             }
//                         })
//                     });
//                 }
//             })
//         } else {
//            // console.log("call BNB there");
//             var response = JSON.parse(result);
//             if(response.length>0)
//             {
//                 response.forEach(function (id, val) {
//                     common.matic_Balance({address:id.address}, function (balanceRes) {
//                     // console.log("balanceRes===",balanceRes);
//                         var final_balance = +balanceRes.balance;
//                        //console.log("final balance===",final_balance);
//                        // console.log("adddress===",id);
//                         if (final_balance > 0) {
//                             //console.log("call balance===")
//                           https.get(process.env.MATIC_API+"api?module=account&action=txlist&address=" + id.address + "&endblock=latest&apikey="+process.env.MATIC_API_KEY+"", (resp) => {
//                                 let data = '';
//                                 resp.on('data', (chunk) => {
//                                     data += chunk;
//                                 });
//                                 resp.on('end', () => {
//                                     try {
//                                         var responseTxn = JSON.parse(data);
//                                       // console.log("responseTxn===", responseTxn);
//                                         if (responseTxn.status == '1' && responseTxn.result.length > 0) {
//                                            // console.log("call here");
//                                             deposit_bnb(responseTxn.result, 0);
//                                         } else {
//                                         }

//                                     } catch (err) {
//                                     }
//                                 });
//                             }).on("error", (err) => {
//                             });
//                         }
//                     })
//                 });
//             }
            
//          }
//     });
// });


// cron.schedule("*/18 * * * *",function(){
//  //cron.schedule("* * * * *",function(){
//     console.log("move to admin wallet matic=====")
//     common.getadminwallet("MATIC", function (adminres) {
//         var adminbalance = adminres.amount;
//         var admin_address = adminres.address;
//         client.get('MATICAddress', async (err, result) => {
//             if (result == null) {
//                 //console.log("call here");
//                 await redisHelper.setmaticAddress(function(response){
//                     if(response.length > 0)
//                     {
//                         response.forEach(function (id, val) {
//                             if(id.address != admin_address)
//                             {
//                                 common.matic_Balance({address:id.address},function(balanceRes){
//                                     var final_balance = balanceRes.balance;
//                                     //console.log("final_balance===",final_balance);
//                                     if(final_balance>0)
//                                     {
//                                         common.matic_gasPrice(function(gasresponse){
//                                        // console.log("gasprice response===",gasresponse);
//                                             if(gasresponse.status)
//                                             {
//                                                 var gasprice = gasresponse.gasprice;
//                                                 var Gas_res = gasprice / 1000000000;
//                                                 var Gas_txn = Gas_res / 1000000000;
//                                                 var txn_fee = 200000 * Gas_txn;
//                                                 var send_amount = final_balance - txn_fee;
//                                             //    console.log("txn_fee 1111===",txn_fee);
//                                             //    console.log("send_amount 1111====",send_amount);

//                                                if(send_amount > 0)
//                                                {
//                                                 addressDB.find({
//                                                     address: id.address
//                                                     }).exec(function (err, userdata) {
//                                                         if(userdata)
//                                                         {
//                                                             if(admin_address != id.address)
//                                                             {
//                                                                 var privateKey = common.decryptionLevel(userdata[0].privateKey);
//                                                                 var obj = {
//                                                                     from:id.address,
//                                                                     to: admin_address,
//                                                                     gasLimit: 200000,
//                                                                     gasPrice: gasprice,
//                                                                     value:send_amount,
//                                                                     privateKey: (privateKey).substring(2)
//                                                                 }
//                                                                 //console.log("bnb transfer 111 ===",obj);
//                                                                 common.matic_sendTransaction(obj,function(transfer){
//                                                                     console.log("send transaction response===",transfer);

//                                                                     if(transfer.status)
//                                                                     {
//                                                                         common.matic_Balance({address:admin_address}, function (adminbalanceRes) {
//                                                                             if(adminbalanceRes.status)
//                                                                             {
//                                                                                 var admin_bnb = +adminbalanceRes.balance;
//                                                                                 common.updateAdminBalance("MATIC", admin_bnb, function (balance) { });
//                                                                             }
//                                                                         });
//                                                                     }
//                                                                 });
//                                                             }
                                                            
//                                                         }
                                                        
//                                                 });
//                                                }
                                               
//                                        }
//                                        });
//                                     }
//                                     else
//                                     {
//                                         //console.log("no balance from user wallets");
//                                     }
//                                 });
//                             }
    
//                         });
//                     }
//                 })
//             } else {
//                 //console.log("call there");
//                 var response = JSON.parse(result);
//                 if(response.length > 0)
//                 {
//                     response.forEach(function (id, val) {
//                         if(id.address != admin_address)
//                         {
//                             common.matic_Balance({address:id.address},function(balanceRes){
//                                 var final_balance = balanceRes.balance;
//                                 //console.log("final_balance===",final_balance);
//                                 if(final_balance>0)
//                                 {
//                                     common.matic_gasPrice(function(gasresponse){
//                                    // console.log("gasprice response===",gasresponse);
//                                         if(gasresponse.status)
//                                         {
//                                             var gasprice = gasresponse.gasprice;
//                                             var Gas_res = gasprice / 1000000000;
//                                             var Gas_txn = Gas_res / 1000000000;
//                                             var txn_fee = 200000 * Gas_txn;
//                                             var send_amount = final_balance - txn_fee;
//                                         //    console.log("txn_fee 222===",txn_fee);
//                                         //    console.log("send_amount 2222====",send_amount);
//                                            if(send_amount > 0)
//                                            {
//                                             addressDB.find({
//                                                 address: id.address
//                                                 }).exec(function (err, userdata) {
//                                                     if(userdata)
//                                                     {
//                                                         var privateKey = common.decryptionLevel(userdata[0].privateKey);
//                                                         var obj = {
//                                                             from:id.address,
//                                                             to: admin_address,
//                                                             gasLimit: 200000,
//                                                             gasPrice: gasprice,
//                                                             value:send_amount,
//                                                             privateKey: (privateKey).substring(2)
//                                                         }
//                                                        // console.log("bnb transfer ===",obj);
//                                                         common.matic_sendTransaction(obj,function(transfer){
//                                                             //console.log("send transaction response===",transfer);
//                                                             if(transfer.status)
//                                                             {
//                                                                 common.matic_Balance({address:admin_address}, function (adminbalanceRes) {
//                                                                     if(adminbalanceRes.status)
//                                                                     {
//                                                                         var admin_bnb = +adminbalanceRes.balance;
//                                                                         common.updateAdminBalance("MATIC", admin_bnb, function (balance) { });
//                                                                     }
//                                                                 });
//                                                             }
//                                                         });
//                                                     }
                                                    
//                                             });
//                                            }
                                          
//                                    }
//                                    });
//                                 }
//                                 else
//                                 {
//                                     //console.log("no balance from user wallets");
//                                 }
//                             });
//                         }

//                     });
//                 }
                
//                 }
//            });
//     });
// })

async function deposit_bnb(response, inc) {
    //console.log("response===",response);
    console.log("inc===", inc);
    if (response[inc]) {

        var transaction = response[inc];
        console.log("transaction====", transaction);
        var currencytable = {
            "currencySymbol": 'MATIC'
        }
        console.log("currencytable====", currencytable);
        var currencydata = await currencyDB.findOne(currencytable);
        console.log("currencytable====", currencydata);
        var address = transaction.to;
        //console.log("address====", address);
        var txid = transaction.hash;
        //console.log("transaction.hash====",transaction.hash)
        var value = +transaction.value;
        console.log("value====", value);
        if (currencydata.currencySymbol == 'MATIC') {
            var admin_data = await adminWalletDB.findOne({ type: 1 }, { wallets: { $elemMatch: { currencySymbol: "MATIC" } } });
            var adminwallet = admin_data.wallets[0];
            var admin_address = adminwallet.address;
            if(admin_address.toLowerCase()  != transaction.from.toLowerCase())
            {
            var ether_balance = (value / Math.pow(10, +currencydata.coinDecimal));
            console.log("bnb balance====", ether_balance);
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
                                        amount_erc20: walletData.amount_erc20,
                                        amount_bep20: walletData.amount_bep20,
                                        amount_trc20: walletData.amount_trc20
                                    }
                                var balance = obj;
                                //console.log("usernalance", balance);
                                var curBalance = balance.totalBalance;
                                var Balance = balance.totalBalance + ether_balance;
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
                                    var balanceUpdate_coin = await userWalletDB.updateOne({ userId: userdata.user_id._id, "wallets.currencyId": ObjectId(currencydata._id) }, { "$set": { "wallets.$.amount": +Balance } }, { multi: true });

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
                else
                {
                    
                }

                    
                }
            }
            else {
            }
            console.log("********")
            var inc2 = inc + 1;
            deposit_bnb(response, inc2)
          }
        }
}

