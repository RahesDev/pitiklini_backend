const mongoose = require("mongoose");

const key = require("../config/key");
const redis = require("redis");
const client = redis.createClient(key.redisdata);
const pairsDB = require("../schema/trade_pair");
const currencyDB = require("../schema/currency");
const addressDB = require("../schema/userCryptoAddress");
const usersDB = require("../schema/users");
const userLoginhistoryDB = require("../schema/userLoginHistory");
const common = require('../helper/common');




getUser = exports.getUser = async (userId, callback) => {

    try {
        var includeData = {
          uuid: 1,
          email: 1,
          createdDate: 1,
          kycstatus: 1,
          displayname: 1,
          tfastatus: 1,
          verifyEmail: 1,
          referralCode: 1,
          otpstatus: 1,
          registerType: 1,
          fiat_spot_status: 1,
          account_status: 1,
          deposit_status: 1,
          AntiphisingStatus: 1,
          AntiphisingEnabledStatus: 1,
          ptk_fee_status: 1,
          vipBadge: 1,
        };
        let getuser = await usersDB.findOne({_id : userId},includeData).exec();
        if(getuser){
            let lastLogin = await userLoginhistoryDB.findOne({ user_id: userId }).sort({ _id: -1 }).limit(1);
            if(lastLogin){
                var obj = {
                    email: common.decrypt(getuser.email),
                    displayname: getuser.displayname,
                    createdDate: getuser.createdDate,
                    uuid: getuser.uuid,
                    verifyEmail: getuser.verifyEmail,
                    kycstatus: getuser.kycstatus,
                    referralCode: getuser.referralCode,
                    tfastatus: getuser.tfastatus,
                    otpstatus: getuser.otpstatus,
                    registerType: getuser.registerType,
                    fiat_spot_status: getuser.fiat_spot_status,
                    account_status: getuser.account_status,
                    deposit_status: getuser.deposit_status,
                    AntiphisingStatus: getuser.AntiphisingStatus,
                    AntiphisingEnabledStatus: getuser.AntiphisingEnabledStatus,
                    lastLogintime: lastLogin.createdDate,
                    ipAddress: lastLogin.ipAddress,
                    ptk_fee_status: getuser.ptk_fee_status,
                    vipBadge: getuser.vipBadge,
                }
                var setuser = await client.hset('getUser',userId.toString(), JSON.stringify(obj));
                client.hget('getUser', userId.toString(), async function(err, value) {
                    callback(value);
                });
            }
        }
    } catch (error) {
        callback(false);
    }


  
 

  

}