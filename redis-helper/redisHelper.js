const mongoose = require("mongoose");

const key = require("../config/key");
const redis = require("redis");
const client = redis.createClient(key.redisdata);
const pairsDB = require("../schema/trade_pair");
const currencyDB = require("../schema/currency");
const addressDB = require("../schema/userCryptoAddress");

//--------------------SET REDIS------------------//

let getRedis = (exports.getRedis = function (key, type, callback) {
  try {
    var types = [];
    if (type != "") {
      var types = type.split(",");
    }
    if (typeof types[0] == undefined || typeof types[0] == "undefined") {
      types[0] = "";
    }
    if (typeof types[1] == undefined || typeof types[1] == "undefined") {
      types[1] = "";
    }
    if (types.length == 2) {
      var column = types[0];
      var value = types[1];
      let redisModel = mongoose.model(key);
      var getFrom = [];

      redisModel.find().exec((userErr, userRes) => {
        if (userRes) {
          for (i = 0; i < userRes.length; i++) {
            if (column != "") {
              if (isNaN(userRes[i][column])) {
                var keys = userRes[i][column];
              } else {
                var keys = i;
              }
            } else {
              var keys = i;
            }
            getFrom[keys] = userRes[i];
          }
          var response = JSON.stringify(getFrom);
          client.set(key, response);
          if (value != "" && isNaN(value)) {
            callback(getFrom[value]);
          } else {
            callback(res(getFrom, column, value));
          }
        } else {
          callback(false);
        }
      });
    } else {
      callback(false);
    }
  } catch (error) {
    console.log("Error from getRedis function:", error);
  }
});

//--------------------- PAIRS UPDATE -----------------------//

let setRedisPairs = (exports.setRedisPairs = function (callback) {
  try {
    client.get("Pairs", (err, pairData) => {
      if (!err && pairData != null) {
        var datas = JSON.parse(pairData);
        callback(datas);
      } else {
        pairsDB.find({status: 1}).exec(function (err, resData) {
          if (resData.length > 0) {
            var response = JSON.stringify(resData);
            client.set("Pairs", response);
            for (let i = 0; i < resData.length; i++) {
              let pair = resData[i]; 
              let name = pair.name; 
              let status = pair.status; 
        
              console.log("Name:", name, "Status:", status); 
            }
            callback(resData);
          } else {
            callback([]);
          }
        });

        return;

        pairsDB.find({status: 1}).exec((err, pairsData) => {
          if (!err) {
            if (pairsData.length > 0) {
              var response = JSON.stringify(pairsData);
              client.set("Pairs", response);
            }
            callback(0);
          } else {
            return false;
          }
        });
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let updateRedisPairs = (exports.updateRedisPairs = function (callback) {
  pairsDB.find({status: 1}).exec(function (err, resData) {
    if (resData?.length > 0) {
      var response = JSON.stringify(resData);
      client.set("Pairs", response);
      // console.log(resData,"=-=-=-=-reaDataa=-=--=");
      resData.forEach(pair => {
        let name = pair.pair;   
        let status = pair.status;
        // console.log("Name:", name, "Status:", status);
  
        client.hset("tradepair", name, JSON.stringify(pair), (err, res) => {
          if (err) {
            // console.error("Error setting data in Redis:", err);
          } else {
            // console.log(`Stored pair ${name} in Redis successfully`);
          }
        });
      });
      callback(resData);
    } else {
      callback([]);
    }
  });
});

let getTradePair = (exports.getTradePair = function (pairName, callback) {
  client.hget("tradepair", pairName, (err, result) => {
    if (err) {
      console.error("Error fetching data from Redis:", err);
      callback(null); // Return null on error
    } else if (result) {
      const pairData = JSON.parse(result); // Parse the stored pair data
      console.log(`Fetched pair ${pairName} from Redis:`, pairData);
      callback(pairData); // Return the pair data
    } else {
      console.log(`Pair ${pairName} not found in Redis`);
      callback(null); // Return null if not found
    }
  });
});


//hset using forloop
// for (let i = 0; i < resData.length; i++) {
//   let pair = resData[i];  // Get each object in resData
//   let name = pair.name;   // Get the name property
//   let status = pair.status; // Get the status property

//   console.log("Name:", name, "Status:", status); // Log the name and status
// }


// sample usage for get trade pair
// getTradePair("BTC_USDT", function(pairData) {
//   if (pairData) {
//     console.log("Trade pair data:", pairData);
//   } else {
//     console.log("Pair not found");
//   }
// });

let setRedisCurrency = (exports.setRedisCurrency = function (callback) {
  try {
    client.get("Currency", (err, pairData) => {
      if (pairData != null) {
        // var datas = JSON.parse(pairData);
        // callback(datas)
      } else {
        currencyDB.findOne(
          {currencySymbol: "ETH"},
          {block: 1, contractAddress: 1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("Currency", response);
              // callback(resData);
            } else {
              // callback([])
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let seterc20Token = (exports.seterc20Token = function (callback) {
  try {
    client.get("ErcToken", (err, pairData) => {
      if (pairData != null) {
        var datas = JSON.parse(pairData);
        callback(datas);
      } else {
        currencyDB.find(
          {currencyType: "2", erc20token: "1"},
          {block: 1, contractAddress_erc20: 1, coinDecimal_erc20: 1,_id:1,currencySymbol:1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("ErcToken", response);
              callback(resData);
            } else {
              callback([]);
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let settronAddress = (exports.settronAddress = function (callback) {
  try {
    client.get("TRXAddress", (err, trxData) => {
      if (trxData != null) {
        var datas = JSON.parse(trxData);
        callback(datas);
      } else {
        addressDB.find(
          {currencySymbol: "TRX"},
          {address: 1, trx_hexaddress: 1, privateKey: 1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("TRXAddress", response);
              callback(resData);
            } else {
              callback([]);
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let settrc20Token = (exports.settrc20Token = function (callback) {
  try {
    client.get("TRC20", (err, tokenData) => {
      //console.log("call trc20 tokendata",tokenData);
      if (tokenData != null) {
        var datas = JSON.parse(tokenData);
        callback(datas);
      } else {
        currencyDB.find(
          {currencyType: "2", trc20token: "1"},
          {contractAddress_trc20: 1, coinDecimal_trc20: 1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("TRC20", response);
              callback(resData);
            } else {
              callback([]);
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let setethAddress = (exports.setethAddress = function (callback) {
  try {
    client.get("ETHAddress", (err, resData) => {
      if (resData != null) {
        var datas = JSON.parse(resData);
        callback(datas);
      } else {
        addressDB.find(
          {currencySymbol: "ETH"},
          {address: 1, privateKey: 1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("ETHAddress", response);
              callback(resData);
            } else {
              callback([]);
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let setbep20Token = (exports.setbep20Token = function (callback) {
  try {
    client.get("BEP20", (err, tokenData) => {
      if (tokenData != null) {
        var datas = JSON.parse(tokenData);
        callback(datas);
      } else {
        currencyDB.find(
          {currencyType: "2", bep20token: "1"},
          {contractAddress_bep20: 1, coinDecimal_bep20: 1,currencySymbol:1,_id:1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("BEP20", response);
              callback(resData);
            } else {
              callback([]);
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let setbnbAddress = (exports.setbnbAddress = function (callback) {
  try {
    client.get("BNBAddress", (err, resData) => {
      if (resData != null) {
        var datas = JSON.parse(resData);
        callback(datas);
      } else {
        addressDB.find(
          {currencySymbol: "BNB"},
          {address: 1, privateKey: 1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("BNBAddress", response);
              callback(resData);
            } else {
              callback([]);
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let setmaticToken = exports.setmaticToken = function(callback) {
  try {
      client.get('MaticToken',(err,pairData) => {
          if(pairData != null){
              var datas = JSON.parse(pairData);
              callback(datas)
          }
          else{
              currencyDB.find({ currencyType: '2', matictoken:'1' }, { block: 1, contractAddress_matic: 1,coinDecimal_matic:1}, function(err, resData) {
                  if(resData !== null){
                      var response = JSON.stringify(resData);
                      client.set('MaticToken', response);
                      callback(resData);
                  }
                  else{
                      callback([])
                  }
              });
          }
      });
  } catch (error) {
      console.log('====ERROR FROM setRedisPairs', error);
  }
}

let setmaticAddress = exports.setmaticAddress = function(callback) {
  try {
      client.get('MATICAddress',(err,resData) => {
          if(resData != null){
              var datas = JSON.parse(resData);
              callback(datas)
          }
          else{
              addressDB.find({ currencySymbol: 'MATIC' }, { address: 1,privateKey:1 }, function(err, resData) {
                  if(resData !== null){
                      var response = JSON.stringify(resData);
                      client.set('MATICAddress', response);
                      callback(resData);
                  }
                  else{
                      callback([])
                  }
              });
          }
      });
  } catch (error) {
      console.log('====ERROR FROM setRedisPairs', error);
  }
}

let setrptc20Token = (exports.setrptc20Token = function (callback) {
  try {
    client.get("RPTC20", (err, tokenData) => {
      if (tokenData != null) {
        var datas = JSON.parse(tokenData);
        callback(datas);
      } else {
        currencyDB.find(
          {currencyType: "2", rptc20token: "1"},
          {contractAddress_rptc20: 1, coinDecimal_rptc20: 1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("RPTC20", response);
              callback(resData);
            } else {
              callback([]);
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

let setrptcAddress = (exports.setrptcAddress = function (callback) {
  try {
    client.get("RPTCAddress", (err, resData) => {
      if (resData != null) {
        var datas = JSON.parse(resData);
        callback(datas);
      } else {
        addressDB.find(
          {currencySymbol: "RPTC"},
          {address: 1, privateKey: 1},
          function (err, resData) {
            if (resData !== null) {
              var response = JSON.stringify(resData);
              client.set("RPTCAddress", response);
              callback(resData);
            } else {
              callback([]);
            }
          }
        );
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});
