const btc_rpc = require('node-bitcoin-rpc');
const Web3 = require('web3');
const request = require("request");
const axios = require('axios');
const cron = require('node-cron');
const converter = require('hex2dec');
const https = require('https');

const currencyDB = require('../schema/currency');
const addressDB = require('../schema/userCryptoAddress');
const usersDB = require('../schema/users');
const mailtempDB = require('../schema/mailtemplate');
const adminwallet = require('../schema/admin_wallet');
const depositDB = require('../schema/deposit');
const common = require('../helper/common');
const mail = require('../helper/mailhelper');
const admin_wallet = require('../schema/admin_wallet');
var adminWalletDB     = require('../schema/adminWallet');
var fs = require('fs');

// BTC Deposit cron

const btchost = common.decryptionLevel("2112d22cae49d293674f40f547eee00c:3c7439f415d9f0bc887a36df11e1684f");
const btcport = common.decryptionLevel("460fa9a78a1f4f4313dab613753b2681:fbdff6c78b73a79b0675888a8f431261");
const btcuser = common.decryptionLevel("269f9b962cfbbd74d5a8939bab7819ea:9d576352ef510b6f1d26de9d63c036b1");
const btcpassword = common.decryptionLevel("c628a355b3b4ec2e909ae3bd6244ec7e:e6c977398b63c234d69261f2d8473a04db9cbceb8b23f9d0d3bac0714f59ac1a");

// cron.schedule('*/5 * * * *', function() {
//     var btcconfig = {
//         'host': btchost,
//         'port': btcport,
//         'user': btcuser,
//         'password': btcpassword
//     }
//    // console.log("btcconfig==",btcconfig);
//     btc_rpc.init(btcconfig.host, +btcconfig.port, btcconfig.user, btcconfig.password);
//     btc_rpc.call('listtransactions', ['*', 1000], function(err, resp) {
//         if (err !== null) {
//             return
//         } else {
//             var transaction = resp.result;
//             for (var i = 0; i < transaction.length; i++) {
//                 (function(dep) {
//                     var val = transaction[dep];
//                     try {
//                         var txn_id = val.txid;
//                         var amount = val.amount;
//                         var resp_addr = val.address;
//                         var category = val.category;
//                         addressDB.find({
//                             "address": resp_addr
//                         }).exec(function(err, data) {
//                             if (!err && data.length > 0) {
//                                 if (category == 'receive' && btc_addr == data[0].address) {
//                                     var user_id = data[0].user_id;
//                                     var where = {
//                                         "userId": mongoose.mongo.ObjectId(user_id),
//                                         "txnid": txn_id
//                                     };
//                                     depositDB.find(where).exec(function(dep_whr, dep_det) {
//                                         if (!dep_whr) {
//                                             if (dep_det.length == 0 && +amount > 0) {
//                                                 currencyDB.find({
//                                                     "currencySymbol": "BTC"
//                                                 }).exec(function(cur_err, cur_res) {
//                                                     if (!cur_err) {
//                                                         var curr_id = cur_res[0]._id;
//                                                         common.getbalance(user_id, curr_id, function(balance) {
//                                                             var curBalance = balance.amount;
//                                                             var Balance = balance.amount + amount;
//                                                             var trans = {
//                                                                 "userId": user_id,
//                                                                 "currency": curr_id,
//                                                                 "depamt": +amount,
//                                                                 "depto": resp_addr,
//                                                                 "txnid": txn_id,
//                                                             };
//                                                             console.log('BTC user', trans)
//                                                             depositDB.create(trans, function(dep_err, dep_res) {
//                                                                 if (!dep_err) {
//                                                                     common.updateUserBalance(user_id, curr_id, Balance, function(balance) {
//                                                                         deposit_mail(user_id, amount, cur_res[0].currencySymbol);
//                                                                     })
//                                                                 }
//                                                             });
//                                                         })
//                                                     } else {}
//                                                 });
//                                             } else {}
//                                         } else {}
//                                     });
//                                 }
//                             } else {
//                                 adminwallet.findOne({
//                                     btc_address: resp_addr
//                                 }, function(err, adminres) {
//                                     if (!err && adminres) {
//                                         depositDB.find({
//                                             "txnid": txn_id
//                                         }).exec(function(dep_whr, dep_det) {
//                                             if (!dep_whr) {
//                                                 if (dep_det.length == 0 && +amount > 0) {
//                                                     currencyDB.find({
//                                                         "currencySymbol": "BTC"
//                                                     }, {
//                                                         _id: 1
//                                                     }).exec(function(cur_err, cur_res) {
//                                                         var payments = {
//                                                             "currency": cur_res[0]._id,
//                                                             "depamt": +amount,
//                                                             "depto": resp_addr,
//                                                             "type": 1,
//                                                             "txnid": txn_id
//                                                         };
//                                                         depositDB.create(payments, function(dep_err, dep_res) {})
//                                                     })
//                                                 }
//                                             }
//                                         })
//                                     }
//                                 });
//                             }
//                         });
//                     } catch (err) {}
//                 }(i));
//             }
//         }
//     });
// });

// PRCY Coin Deposit
// cron.schedule('* * * * *', function() {
//     try {
//         console.log("call prcy deposit====");
//         var headers = {
//             'content-type': 'application/json;'
//         };
//     var dataString = '{"jsonrpc":"2.0","id":"1","method":"listtransactions","params":[]}';

//     var options = {
//         url: 'https://208.85.19.193',
//         method: 'post',
//         headers: headers,
//         body: dataString,
//         requestCert: true,
//         rejectUnauthorized: false,
//         cert: fs.readFileSync('/home/anon/prcy.pem'),
//         auth: {
//             'user': 'prcyus3r',
//             'pass': 'PRCYjnb96BI23ESamk897o0OH2S04P5hxxxQWM'
//         }
//     };

// request(options, function(error, response, body) {
//   console.log("prcy deposit response===",body);

//     if (!error && response.statusCode == 200) {
//         const resp = JSON.parse(body);
//         console.log("prcy deposit resp===",resp);
//             var transaction = resp.result;
//             if(transaction.length > 0)
//             {
//                 // for (var i = 0; i < transaction.length; i++) {
//             //     (function(dep) {
//             //         var val = transaction[dep];
//             //         try {
//             //             var txn_id = val.txid;
//             //             var amount = val.amount;
//             //             var resp_addr = val.address;
//             //             var category = val.category;
//             //             addressDB.find({
//             //                 "address": resp_addr
//             //             }).exec(function(err, data) {
//             //                 if (!err && data.length > 0) {
//             //                     if (category == 'receive' && btc_addr == data[0].address) {
//             //                         var user_id = data[0].user_id;
//             //                         var where = {
//             //                             "userId": mongoose.mongo.ObjectId(user_id),
//             //                             "txnid": txn_id
//             //                         };
//             //                         depositDB.find(where).exec(function(dep_whr, dep_det) {
//             //                             if (!dep_whr) {
//             //                                 if (dep_det.length == 0 && +amount > 0) {
//             //                                     currencyDB.find({
//             //                                         "currencySymbol": "BTC"
//             //                                     }).exec(function(cur_err, cur_res) {
//             //                                         if (!cur_err) {
//             //                                             var curr_id = cur_res[0]._id;
//             //                                             common.getbalance(user_id, curr_id, function(balance) {
//             //                                                 var curBalance = balance.amount;
//             //                                                 var Balance = balance.amount + amount;
//             //                                                 var trans = {
//             //                                                     "userId": user_id,
//             //                                                     "currency": curr_id,
//             //                                                     "depamt": +amount,
//             //                                                     "depto": resp_addr,
//             //                                                     "txnid": txn_id,
//             //                                                 };
//             //                                                 console.log('BTC user', trans)
//             //                                                 depositDB.create(trans, function(dep_err, dep_res) {
//             //                                                     if (!dep_err) {
//             //                                                         common.updateUserBalance(user_id, curr_id, Balance, function(balance) {
//             //                                                             deposit_mail(user_id, amount, cur_res[0].currencySymbol);
//             //                                                         })
//             //                                                     }
//             //                                                 });
//             //                                             })
//             //                                         } else {}
//             //                                     });
//             //                                 } else {}
//             //                             } else {}
//             //                         });
//             //                     }
//             //                 } else {
//             //                     adminwallet.findOne({
//             //                         btc_address: resp_addr
//             //                     }, function(err, adminres) {
//             //                         if (!err && adminres) {
//             //                             depositDB.find({
//             //                                 "txnid": txn_id
//             //                             }).exec(function(dep_whr, dep_det) {
//             //                                 if (!dep_whr) {
//             //                                     if (dep_det.length == 0 && +amount > 0) {
//             //                                         currencyDB.find({
//             //                                             "currencySymbol": "BTC"
//             //                                         }, {
//             //                                             _id: 1
//             //                                         }).exec(function(cur_err, cur_res) {
//             //                                             var payments = {
//             //                                                 "currency": cur_res[0]._id,
//             //                                                 "depamt": +amount,
//             //                                                 "depto": resp_addr,
//             //                                                 "type": 1,
//             //                                                 "txnid": txn_id
//             //                                             };
//             //                                             depositDB.create(payments, function(dep_err, dep_res) {})
//             //                                         })
//             //                                     }
//             //                                 }
//             //                             })
//             //                         }
//             //                     });
//             //                 }
//             //             });
//             //         } catch (err) {}
//             //     }(i));
//             // }
//             }
//             else
//             {
//                console.log("prcy depoit empty result====",transaction)
//             }
//     }
//     })

//     }
//     catch(err)
//     {
//         console.log("prcy depoit catch error====",err)
//     }
 
// });

// LTC Deposit cron

const ltchost = common.decryptionLevel("55c05f817a569b806131b2b6686fff23:9d9dd10a708a3a6c58aa174d1541e26e");
const ltcport = common.decryptionLevel("4584d226d0b64147da63af543f2fc392:be0da7a820cbe75237691810e3881d74");
const ltcuser = common.decryptionLevel("38c875672b23829e232cb0762829834e:593c562f84342f9f38aa62f1666d69e7");
const ltcpassword = common.decryptionLevel("b6c20afaacae08e8af3c97a665bf5dd7:9c556dbc90149642a06d6954c58dcedf19c2cd2fe95b8512c39e3f9f0368d2a7");

// cron.schedule('*/5 * * * *', function() {
//     var ltcconfig = {
//         'host': ltchost,
//         'port': ltcport,
//         'user': ltcuser,
//         'password': ltcpassword
//     }
//     btc_rpc.init(ltcconfig.host, +ltcconfig.port, ltcconfig.user, ltcconfig.password);
//     btc_rpc.call('listtransactions', ['*', 1000], function(err, resp) {
//         if (err !== null) {
//             return
//         } else {
//             var transaction = resp.result;
//             for (var i = 0; i < transaction.length; i++) {
//                 (function(dep) {
//                     var val = transaction[dep];
//                     try {
//                         var txn_id = val.txid;
//                         var amount = val.amount;
//                         var resp_addr = val.address;
//                         var category = val.category;
//                         addressDB.find({
//                             "address": resp_addr
//                         }).exec(function(err, data) {
//                             if (!err && data.length > 0) {
//                                 if (category == 'receive' && btc_addr == data[0].address) {
//                                     var user_id = data[0].user_id;
//                                     var where = {
//                                         "userId": mongoose.mongo.ObjectId(user_id),
//                                         "txnid": txn_id
//                                     };
//                                     depositDB.find(where).exec(function(dep_whr, dep_det) {
//                                         if (!dep_whr) {
//                                             if (dep_det.length == 0 && +amount > 0) {
//                                                 currencyDB.find({
//                                                     "currencySymbol": "LTC"
//                                                 }).exec(function(cur_err, cur_res) {
//                                                     if (!cur_err) {
//                                                         var curr_id = cur_res[0]._id;
//                                                         common.getbalance(user_id, curr_id, function(balance) {
//                                                             var curBalance = balance.amount;
//                                                             var Balance = balance.amount + amount;
//                                                             var trans = {
//                                                                 "userId": user_id,
//                                                                 "currency": curr_id,
//                                                                 "depamt": +amount,
//                                                                 "depto": resp_addr,
//                                                                 "txnid": txn_id,
//                                                             };
//                                                             console.log('LTC user', trans)
//                                                             depositDB.create(trans, function(dep_err, dep_res) {
//                                                                 if (!dep_err) {
//                                                                     common.updateUserBalance(user_id, curr_id, Balance, function(balance) {
//                                                                         deposit_mail(user_id, amount, cur_res[0].currencySymbol);
//                                                                     })
//                                                                 }
//                                                             });
//                                                         })
//                                                     } else {}
//                                                 });
//                                             } else {}
//                                         } else {}
//                                     });
//                                 }
//                             } else {
//                                 adminwallet.findOne({
//                                     btc_address: resp_addr
//                                 }, function(err, adminres) {
//                                     if (!err && adminres) {
//                                         depositDB.find({
//                                             "txnid": txn_id
//                                         }).exec(function(dep_whr, dep_det) {
//                                             if (!dep_whr) {
//                                                 if (dep_det.length == 0 && +amount > 0) {
//                                                     currencyDB.find({
//                                                         "currencySymbol": "LTC"
//                                                     }, {
//                                                         _id: 1
//                                                     }).exec(function(cur_err, cur_res) {
//                                                         var payments = {
//                                                             "currency": cur_res[0]._id,
//                                                             "depamt": +amount,
//                                                             "depto": resp_addr,
//                                                             "type": 1,
//                                                             "txnid": txn_id
//                                                         };
//                                                         depositDB.create(payments, function(dep_err, dep_res) {})
//                                                     })
//                                                 }
//                                             }
//                                         })
//                                     }
//                                 });
//                             }
//                         });
//                     } catch (err) {}
//                 }(i));
//             }
//         }
//     });
// })


// ETH DEPOSIT CRON
// cron.schedule('*/5 * * * *', function() {
//     currencyDB.findOne({
//         currencySymbol: 'ETH'
//     }, {
//         block: 1,
//         contractAddress: 1
//     }, function(err, response) {
//         if (!err) {
//             var max_blocknumber = response.block;
//           // console.log("max_blocknumber",max_blocknumber);
            
//             // https.get("https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=WP93Y4S472FBH5NVN6FUXA7JAHNWS1AF15", (resp) => {
//             https.get("https://api-ropsten.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=WP93Y4S472FBH5NVN6FUXA7JAHNWS1AF15", (resp) => {

//                 let data = '';
//                 resp.on('data', (chunk) => {
//                     data += chunk;
//                 });
//                 resp.on('end', () => {
//                     if (IsJsonString(data)) {
//                         var responseTxn = JSON.parse(data);
//                         if (responseTxn.result != null) {
//                             var count = converter.hexToDec(responseTxn.result);
//                             console.log("count",count);
//                             if (max_blocknumber !== null && max_blocknumber < count) {
//                                 transactions = [];
//                                 get_eth_transactions(count, max_blocknumber);
//                             } else {
//                                return update_blockno(response.contractAddress);
//                             }
//                         }
//                     }
//                 });
//             }).on("error", (err) => {
//                 console.log("Error: " + err.message);
//             });
//         }
//     });
// });

function get_eth_transactions(to, inc) {
   // console.log("etth transactions to====",to);
   // console.log("etth transactions inc====",inc);
    if (inc <= to) {
        var blknum = converter.decToHex(inc.toString());
   // console.log("blknum",blknum);
        // https.get("https://api.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag="+blknum+"&boolean=true&apikey=WP93Y4S472FBH5NVN6FUXA7JAHNWS1AF15", (resp) => {
       https.get("https://api-ropsten.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag=" + blknum + "&boolean=true&apikey=WP93Y4S472FBH5NVN6FUXA7JAHNWS1AF15", (resp) => {
       // https.get("https://api-ropsten.etherscan.io/api?module=proxy&action=eth_getBlockByNumber&tag=0xa29189&boolean=true&apikey=WP93Y4S472FBH5NVN6FUXA7JAHNWS1AF15", (resp) => {

            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                try {
                    var responseTxn = JSON.parse(data);
                    if (responseTxn.result.transactions.length > 0) {
                        deposit_eth_erc20(responseTxn.result.transactions, 0);
                        var inc2 = inc + 1;
                        get_eth_transactions(to, inc2);
                    } else {
                        var inc2 = inc + 1;
                        get_eth_transactions(to, inc2);

                    }

                } catch (err) {
                    var inc2 = inc + 1;
                    get_eth_transactions(to, inc2)
                }
            });
        }).on("error", (err) => {
            var inc2 = inc + 1;
            get_eth_transactions(to, inc2)
            console.log("Error: " + err.message);
        });
    } else {
        return deposit_eth_erc20(transactions, 0);
    }
}

function deposit_eth_erc20(response, inc) {
  // console.log("deposit_eth_erc20",response);

    if (response[inc]) {

        var transaction = response[inc];

        if (transaction.contractAddress) {
            var currencytable = {
                "contractAddress": transaction.contractAddress
            }
        } else {
            var currencytable = {
                "contractAddress": '0x0000000000000000000000000000000000000000'
            }
        }
       // console.log("currencytable",currencytable);
        currencyDB.findOne(currencytable).exec(function(err3, currencydata) {
            if (currencydata) {
                //console.log("currencydata",currencydata);
                var address = transaction.to;
                var fromaddress = transaction.from;
                var txid = transaction.hash;
                var value = transaction.value;
                var currency_id = currencydata._id;
                if (currencydata.currencySymbol == 'ETH') {
                   // console.log("call hre-----");
                    if (value) {
                        var ether_balance1 = converter.hexToDec(value);
                        var ether_balance = (ether_balance1 / Math.pow(10, currencydata.coinDecimal));
                    } else {
                        var ether_balance = 0;
                    }
                } else {
                    var ether_balance = (value / Math.pow(10, currencydata.coinDecimal));
                }
                var confirmations = 5;
           // console.log("to address====",address);
                addressDB.find({
                    address: transaction.to
                }).exec(function(err, userdata) {
                    if (userdata) {
                       //console.log("userdata===",userdata);
                        if (userdata.length > 0) {
                            if (confirmations > 3) {
                                depositDB.find({
                                    "userId": userdata[0].user_id,
                                    "txnid": txid
                                }).exec(function(err2, depositData) {
                                  // console.log("depositData length===",depositData.length);
                                    if (depositData.length == 0) {
                                        if (currencydata) {
                                            var curr_id = currencydata._id;
                                            common.getbalance(userdata[0].user_id, currencydata._id, function(balance) {
                                                //console.log("usernalance", balance);
                                                var curBalance = balance.amount;
                                                var Balance = balance.amount + ether_balance;
                                                var payments = {
                                                    "userId": userdata[0].user_id,
                                                    "currency": curr_id,
                                                    "depamt": +ether_balance,
                                                    "depto": address,
                                                    "txnid": txid,
                                                };
                                                console.log('ETH USER', payments)
                                                depositDB.create(payments, function(dep_err, dep_res) {
                                                    if (!dep_err) {
                                                        common.updateUserBalance(userdata[0].user_id, currencydata._id, Balance, function(balance) {
                                                            deposit_mail(userdata[0].user_id, ether_balance, currencydata.currencySymbol);
                                                        })
                                                    }
                                                });
                                            })
                                        }
                                        var inc2 = inc + 1;
                                        deposit_eth_erc20(response, inc2)
                                    } else {
                                        var inc2 = inc + 1;
                                        deposit_eth_erc20(response, inc2)
                                    }
                                })
                            } else {
                                var inc2 = inc + 1;
                                deposit_eth_erc20(response, inc2)
                            }
                        } else {
                            // admin_wallet.findOne({
                            //     eth_address: address
                            // }, function(err, adminres) {
                            //     if (!err && adminres) {
                                
                                common.getadminwallet("ETH", function (adminres) {
                                    var adminbalance = adminres.amount;
                                    var admin_address = adminres.address;
                                    if(admin_address == transaction.to)
                                    {
                                        console.log("call eth admin")
                                        if (currencydata.currencySymbol == 'ETH') {
                                            if (transaction.value) {
                                                var ether_balance1 = converter.hexToDec(transaction.value);
                                                var ether_balance = (ether_balance1 / Math.pow(10, currencydata.coinDecimal));
                                            } else {
                                                var ether_balance = 0;
                                            }
                                        } else {
                                            var ether_balance = (transaction.value / Math.pow(10, currencydata.coinDecimal));
                                        }
                                            depositDB.find({
                                                "txnid": transaction.hash
                                            }).exec(function(dep_whr, dep_det) {
                                                if (!dep_whr) {
                                                    if (dep_det.length == 0) {
                                                        var payments = {
                                                            "currency": currency_id,
                                                            "depamt": +ether_balance,
                                                            "depto": transaction.to,
                                                            "type": 1,
                                                            "txnid": transaction.hash
                                                        };
                                                        console.log(currencydata.currencySymbol + ' admin', payments);
                                                        depositDB.create(payments, function(dep_err, dep_res) {
                                                            if(!dep_err && dep_res)
                                                            {
                                                                var total = adminbalance + ether_balance;
                                                                common.updateAdminBalance(currencydata.currencySymbol, +total, function (balance) {});
                                                            }
                                                        })
                                                    }
                                                }
                                            });

                                    }
                                    
                                });
                            //     }
                            // })
                            var inc2 = inc + 1;
                            deposit_eth_erc20(response, inc2)
                        }
                    }
                })
            } else {
                var inc2 = inc + 1;
                deposit_eth_erc20(response, inc2)
            }
        });
    }
}

async function update_blockno(contract_address) {
    try {
        var currencytable = {
            "contractAddress": contract_address
        }

        var args = {
            type: "getblock_no"
        };

        let respData = await axios({
            'method': 'post',
            'url': "http://3.69.20.199:3000/walletnode",
            'data': args
        });

        if (respData.data.status) {

            var responseTxn = respData.data;
            if (responseTxn.block != null) {
                var count = responseTxn.block;
                currencyDB.updateOne(currencytable, {
                    $set: {
                        block: count
                    }
                }).exec(function(err3, currencydata) {
                    if (currencydata) {}
                });
            }

        } else {
            console.log(respData.data, '=block update error===')
        }
    } catch (error) {
        console.log("ERROR:BLOCK NUMBER UPDATION ERROR REASON ):", error)
    }

}


//---------------------ETH MOVE TO ADMINM WALLET------------------------//
// cron.schedule('*/6 * * * *', function() {
//     // admin_wallet.findOne({}, {
//     //     eth_address: 1
//     // }, function(err, response) {
//     common.getadminwallet("ETH", function (response) {
//         console.log("response====",response);
//         addressDB.find({
//             currencySymbol: 'ETH'
//         }).exec(async (err, address_data) => {
//             if (err) {
//                 console.log(err, "canot find addres")
//             } else {
//                 for (let item of address_data) {

//                     let useraddress = item.address;
//                     let privkey = common.decryptionLevel(item.privateKey);
//                     let adminaddress = response.address;
//                     var string_private = privkey;

//                     var args = {
//                         useraddress: useraddress,
//                         account1: adminaddress,
//                         privkey: string_private,
//                         type: "usertoadmin",
//                     };
//                     try {
//                         let respData = await axios({
//                             'method': 'post',
//                             'url': "http://3.69.20.199:3000/walletnode",
//                             'data': args
//                         });

//                         if (respData.data.status == 200) {
//                             console.log('ETH MOVE TO ADMINM WALLET, SUCCESS')
//                         } else if (respData.data.status == 204) {
//                             console.log(respData.data.message, '=respData.data.messagerespData.data.message===')
//                         }
//                     } catch (err) {
//                         //  console.log('ETH MOVE ADMIN WALLET ERROR REASON ):',err);
//                     }
//                 }
//             }

//         });
//     });

//    // });
// });

//ERC20 tokens deposit cron
// cron.schedule('*/5 * * * *', async function() {
//     var args = {
//         'type': 'getBlock'
//     }
//     try {
//         let respData = await axios({
//             'method': 'post',
//             'url': "http://3.69.20.199:3000/walletnode",
//             'data': args
//         });

//         if (respData && respData.data) {
//             var block_no = respData.data.block;
//             var block = +block_no - 50;
//             //common.getredisToken(function(resp){
//             currencyDB.find({
//                 status: "Active",
//                 currencyType: "2"
//             }, {
//                 contractAddress: 1
//             }).exec((err, token) => {
//                 var response = token;
//                 for (var i = 0; i < response.length; i++) {
//                     var contract_address = response[i].contractAddress;
//                     erc20_deposit(i, response.length, contract_address, block);

//                 }
//             })



//             //})

//         }
//     } catch (e) {
//         console.log('ERC20 token deposit ERROR REASON ):', e.message);
//     }

// });

function erc20_deposit(current, tot, contract_address, block_no) {
    https.get("https://api-ropsten.etherscan.io/api?module=account&action=tokentx&sort=asc&contractaddress=" + contract_address + "&startblock=" + block_no + "&endblock=latest&apikey=WP93Y4S472FBH5NVN6FUXA7JAHNWS1AF15", (resp) => {
        // console.log("https://api-ropsten.etherscan.io/api?module=account&action=tokentx&sort=asc&contractaddress="+contract_address+"&startblock="+block_no+"&endblock=latest&apikey=WP93Y4S472FBH5NVN6FUXA7JAHNWS1AF15");
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });
        resp.on('end', () => {
            if (IsJsonString(data)) {
                var response = JSON.parse(data);
                // console.log('000000000000000000000::::::::::',response,'000000000000000000000')
                try {
                    if (response.result.length > 0) {
                        return deposit_eth_erc20(response.result, 0);
                    } else {
                       return update_blockno(contract_address);
                    }
                } catch (err) {
                    console.log('ERC20 DEPOSIT CRON ERROR REASON ):', err)
                }
            }
        });
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });
}

// ERC20 tokens move to admin wallet cron
// cron.schedule('*/1 * * * *', function() {
//     // admin_wallet.findOne({}, {
//     //     eth_address: 1,
//     //     admin_token_name: 1
//     // }, function(err, response) {
//     common.getadminwallet("ETH", function (response) {
//             console.log("response====",response);
//         var admin_address = response.address;
//         var admin_key = common.decryptionLevel(response.admin_token_name);
//         //common.getredisToken(function(resp){
//         currencyDB.find({
//             status: "Active",
//             currencyType: "2"
//         }, {
//             contractAddress: 1,
//             coinDecimal:1
//         }).exec((err, token) => {
//             var response = token;
//             for (var i = 0; i < response.length; i++) {
//                 var contract_address = response[i].contractAddress;
//                 var currencySymbol = "ETH";
//                 var decimals = response[i].coinDecimal;
//                 erc20_move(i, response.length, currencySymbol, decimals, contract_address, admin_address, admin_key);
//             }
//         });
//         // });
//     //});
//     });
// });

function erc20_move(current, tot, currencySymbol, decimal, contract_address, admin_address, admin_key) {
    addressDB.find({
        currencySymbol: currencySymbol
    }).exec(async (err, address_data) => {
        if (err) {
            return console.log(err, 'NO DATA')
        } else {
            for (let item of address_data) {
                let useraddress = item.address;
                var privkey = common.decryptionLevel(item.privateKey);
                let adminaddress = admin_address;
                var string_private = privkey.substring(2);
                let decimals = decimal;
                var args = {
                    currencyAddress: useraddress,
                    userAddress: adminaddress,
                    privkey: string_private,
                    decimals: decimals,
                    userprivatekey: admin_key.substring(2),
                    type: "tokenupdation",
                    cryptoPass: "",
                    contract_address: contract_address
                };
               // console.log(args, '[[[=====argsargs')
                try {
                    let respData = await axios({
                        'method': 'post',
                        'url': "http://3.69.20.199:3000/walletnode",
                        'data': args
                    });

                    if (respData && respData.data) {

                    }
                } catch (e) {
                    console.log('ERC20 MOVE ADMIN WALLET ERROR REASON ):', e.message);
                }
            }
        }
    });

}

function deposit_mail(user_id,amount,symbol){
    usersDB.findOne({_id:user_id},{username:1,email:1},function(err,resdata){
        var msg = 'Deposit on '+amount+' '+symbol+' was confirmed';
        resdata.email = common.decrypt(resdata.email);
        mailtempDB.findOne({ "key": 'confirm_transaction' }).exec(function(etemperr,etempdata){
            var etempdataDynamic = etempdata.body.replace(/###USERNAME###/g, resdata.username).replace(/###MESSAGE###/g, 'Deposit on '+amount+' '+symbol+' was confirmed');
            mail.sendMail({from: process.env.FROM_EMAIL, to: resdata.email, subject: etempdata.Subject, html: etempdataDynamic },function(mailRes){
            });
        });				
    })
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}