//--------------------------Author Mugeshkumar ------------------------

var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var adminDB = require("../schema/admin");
var adminloginhistoryDB = require("../schema/adminloginhistory");
var AdminSettings = require("../schema/sitesettings");
const RewardSettingsDB = require("../schema/RewardManagement"); // Assuming the model name is rewardSettings
const AirdropSettingsDB = require("../schema/AirdropManagement"); // Assuming the model name is rewardSettings
var Transaction = require("./depositNew");
const { btcdeposit } = require("./depositNew");
const key = require("../config/key");
let jwt = require("jsonwebtoken");
const tradeRedis = require("../tradeRedis/activeOrderRedis");
var redisCache = require("../redis-helper/redisHelper");
const stakingDB = require("../schema/staking");
// const key = require("../config/key");
const notifyDB = require("../schema/notification");

var tradePairDB = require("../schema/trade_pair");
var mongoose = require("mongoose");
const jwt_secret = key.JWT_TOKEN_SECRET;
var orderDB = require("../schema/orderPlace");
var useragent = require("express-useragent");
var WithdrawDB = require("../schema/withdraw");
var depositDB = require("../schema/deposit");
var moment = require("moment");
var usersDB = require("../schema/users");
var orderConfirmDB = require("../schema/confirmOrder");
const loginAttemptsDB = require("../schema/loginAttempts");
const redis = require("redis");
client = redis.createClient();
const BINANCEexchange = require("../exchanges/Binance_New");
const { RedisService } = require("../services/redis");
var adminWalletDB = require("../schema/adminWallet");
var currencyDB = require("../schema/currency");
var userWalletDB = require("../schema/userWallet");
const launchPadDB = require("../schema/launchPad");
var currencyDB = require("../schema/currency");
const blockipDB = require("../schema/ipblock.model");
var supportcategoryDB = require("../schema/supportcategory");
var supportlistDB = require("../schema/supportlist");
let ObjectId = mongoose.Types.ObjectId;
var mailtempDB = require("../schema/mailtemplate");
var mail = require("../helper/mailhelper");
var cmsDB = require("../schema/cms");
var swapDB = require("../schema/swap");
var profitDB = require("../schema/profit");
var transferDb = require("../schema/internalTransfer");
var P2PordersDB = require("../schema/p2pOrder");
var p2pConfirmOrderModel = require("../schema/p2pconfirmOrder");
var p2pDisputeModel = require("../schema/p2pdispute");
const p2pDisputeChatDB = require("../schema/disputeChat");
const antiPhishing = require("../schema/antiphising");
const TronWeb = require("tronweb");
const Web3 = require("web3");
var kycDB = require("../schema/kyc");
var cryptoAddressDB = require("../schema/userCryptoAddress");
const activeorder = require("../tradeRedis/activeOrderRedis");
const binanceexchange = require("../exchanges/binance");
const rateLimit = require("express-rate-limit");
const twoFAHistory = require("../schema/2FAhistory");
const speakeasy = require("speakeasy");
const bcrypt = require('bcrypt');
const saltRounds = 12;
const axios = require('axios');
var paymentMethod = require("../schema/paymentMethod");
var p2pdispute = require("../schema/p2pdispute");

// Rate limiting middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many login attempts, please try again later.",
});
const userRedis = require("../redis-helper/userRedis");
const p2pModel = require("../schema/p2pOrder");
const swappingHistory = require("../schema/swap");

router.use(useragent.express());

const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "type": "function"
  }
];

const BNB_API = [
  { "inputs": [{ "internalType": "uint256", "name": "_initialSupply", "type": "uint256" }], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, {
    "anonymous": false, "inputs": [{
      "indexed": true, "internalType": "address",
      "name": "from", "type": "address"
    }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event"
  }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }]


router.post("/verifyToken", (req, res) => {
  const token = req.body.token;

  if (!token) {
    return res.status(401).send("Token missing");
  }

  try {
    // Verify the token
    const payload = jwt.verify(token, jwt_secret);

    // Token is valid
    return res.status(200).send({ message: "Token is valid" });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: false, message: "TokenExpired" });
    }

    return res.status(401).send("Invalid token");
  }
});


router.post("/login", loginLimiter, common.isEmpty, async (req, res) => {
  try {
    const ip_address = (
      req.header("x-forwarded-for") || req.connection.remoteAddress
    ).replace("::ffff:", "");
    const ua = useragent.parse(req.headers["user-agent"]);

    const admin_data = await adminDB.findOne({
      email: common.encrypt(req.body.email),
    });

    if (!admin_data) {
      return res.json({ status: false, Message: "Admin not found" });
    }

    var passCheck = await common.unlock(req.body.password, admin_data.password);
    // console.log(passCheck,"-----passCheck");

    if (passCheck == false) {
      return handleIncorrectPassword(req.body.email, ip_address, res);
    }


    if (admin_data.tfa_status === 1) {
      return res.json({
        status: true,
        Message: "Please enter 2FA code",
        token: common.encryptionLevel(admin_data._id.toString()),
        tfa: admin_data.tfa_status,
      });
    }

    const loginHistory = {
      ipAddress: ip_address,
      browser: ua.browser,
      OS: ua.os,
      platform: ua.platform,
      useremail: common.decrypt(admin_data.email),
    };

    await adminloginhistoryDB.create(loginHistory);

    const payload = { _id: admin_data._id };
    const token = jwt.sign(payload, jwt_secret, { expiresIn: 300 * 60 });
    var socketToken = common.encrypt(admin_data._id.toString());
    var timestamp = Date.now();
    return res.json({
      status: true,
      Message: "Welcome back! You’ve successfully logged in and can now access your account",
      token: token,
      socketToken: socketToken + "_" + timestamp,
      admin_data: admin_data,
      tfa: admin_data.tfa_status,
    });
  } catch (error) {
    console.log(error, "error");
    return res.json({
      status: false,
      Message: "Something went wrong, please try again later",
    });
  }
});

async function handleIncorrectPassword(email, ip_address, res) {
  const loginAttempt = await loginAttemptsDB.findOne({ email: email });

  if (loginAttempt) {
    const attemptCount = loginAttempt.attempts;
    if (attemptCount >= 5) {
      return blockIpAddress(ip_address, res);
    }

    await loginAttemptsDB.updateOne(
      { email: email },
      { $set: { attempts: attemptCount + 1 } }
    );
  } else {
    const newAttempt = {
      email: email,
      attempts: 1,
    };
    await loginAttemptsDB.create(newAttempt);
  }

  return res.json({
    status: false,
    Message: "Authentication failed, Incorrect Password",
  });
}

async function blockIpAddress(ip_address, res) {
  const existingBlock = await blockipDB.findOne({ ip_address });

  if (existingBlock) {
    return res.json({
      status: false,
      Message: "Too many login attempts, Your IP is blocked",
    });
  }

  const expireTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  const newBlock = {
    ip_address: ip_address,
    expireTime: expireTime,
  };

  await blockipDB.create(newBlock);
  return res.json({
    status: false,
    Message:
      "Too many login attempts, Your IP is blocked for the next 24 hours",
  });
};

router.post('/verify_otp', common.isEmpty, async (req, res) => {

  try {

    if (req.body.userToken != "" && req.body.userToken != undefined && req.body.userToken != null) {
      let findUser = await adminDB.findOne({ email: common.encrypt(req.body.userEmail) }).exec();
      if (findUser) {
        //tfa verification 
        var verified = speakeasy.totp.verify({ secret: findUser.tfaenablekey, encoding: "base32", token: req.body.userToken, window: 1 });
        if (verified == true) {
          const payload = {
            _id: findUser._id,
          };

          const tokenID = common.encrypt(findUser._id.toString());
          const timestamp = Date.now();
          const socketToken = `${tokenID}"_${timestamp}`;
          const PTKToken = `PTK_${tokenID}`;

          var obj = {
            token: jwt.sign(payload, jwt_secret, { expiresIn: 300 * 60 }),
            Message: "Welcome back! You’ve successfully logged in and can now access your account",
            socketToken: socketToken,
            PTKToken: PTKToken
          }
          var source = req.headers["user-agent"],
            ua = useragent.parse(source);
          var testip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
          let ip_address = req.header("x-forwarded-for") || req.connection.remoteAddress;
          var obj2 = {
            ipAddress: ip_address, browser: ua.browser, OS: ua.os, platform: ua.platform, useremail: common.decrypt(findUser.email)
          };
          let createSession = await adminloginhistoryDB.create(obj2);
          if (createSession) {
            return res.json({ status: true, issue: 0, data: obj });
          } else {
            return res.json({ status: false, issue: 0, Message: "Oops!, Please try again later" });
          }
        } else {
          return res.json({ status: false, issue: 0, Message: "Oops!, Verification failed, Please enter valid Code" });
        }
      } else {
        return res.json({ status: false, issue: 1, Message: "Oops!, Please try to login" });
      }
    } else {
      return res.json({ status: false, issue: 0, Message: "Oops!, Please enter 2FA code" });
    }

  } catch (error) {
    console.log(error, '==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-');
    return res.json({ status: false, issue: 0, Message: "Oops!, Something went wrong" });

  }

});

router.get("/dashboard-counts", common.tokenmiddleware, async (req, res) => {
  try {
    const userCountPromise = usersDB.estimatedDocumentCount();

    const depositCountPromise = depositDB
      .find({ type: 0 })
      .sort({ _id: -1 })
      .then((data) => data.length);

    const withdrawCountPromise = WithdrawDB.find({
      type: 0,
      withdraw_type: 0,
      status: { $in: [1, 2, 3, 4] },
    }).countDocuments();

    const openOrdersCountPromise = orderDB
      .find({ status: "Active" })
      .countDocuments();

    const ordersCountPromise = orderConfirmDB
      .find({})
      .countDocuments()
      .then((data) => data);

    const cancelledCountPromise = orderDB
      .find({ status: "cancelled" })
      .countDocuments();

    const [
      userCount,
      depositCount,
      withdrawCount,
      openOrdersCount,
      ordersCount,
      cancelledCount,
    ] = await Promise.all([
      userCountPromise,
      depositCountPromise,
      withdrawCountPromise,
      openOrdersCountPromise,
      ordersCountPromise,
      cancelledCountPromise,
    ]);

    res.json({
      status: true,
      dashboardCounts: {
        userCount,
        depositCount,
        withdrawCount,
        openOrdersCount,
        ordersCount,
        cancelledCount,
      },
    });
  } catch (e) {
    res.json({ status: false, Message: e.message });
  }
});

router.post("/adminlogg", common.tokenmiddleware, (req, res) => {
  const page = parseInt(req.body.page) || 1; // Get the current page number, default to 1
  const limit = parseInt(req.body.limit) || 5; // Get the limit of documents per page, default to 5
  const skip = (page - 1) * limit; // Calculate how many documents to skip

  adminloginhistoryDB
    .find({}, { ipAddress: 1, browser: 1, createdDate: 1, platform: 1, OS: 1 })
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit)
    .exec((err, data) => {
      if (data) {
        adminloginhistoryDB.countDocuments({}, (err, count) => {
          if (err) {
            res.json({ status: false, Message: "Something went wrong" });
          } else {
            const totalPages = Math.ceil(count / limit); // Calculate total pages
            res.json({
              status: true,
              Message: data,
              totalPages: totalPages,
              currentPage: page,
            });
          }
        });
      } else {
        res.json({ status: false, Message: "Something went wrong" });
      }
    });
});

// router.post("/activatedUserList", common.tokenmiddleware, async (req, res) => {
//   try {
//     const { page = 1, limit = 5, keyword = "" } = req.body;
//     const query = {
//       $or: [{ displayname: { $regex: keyword, $options: "i" } }],
//     };
//     const options = {
//       sort: { _id: -1 },
//       skip: (page - 1) * limit,
//       limit: parseInt(limit),
//       projection: {
//         username: 1,
//         _id: 1,
//         email: 1,
//         verifyEmail: 1,
//         status: 1,
//         createdDate: 1,
//         displayname: 1,
//         tfastatus: 1,
//         kycstatus: 1,
//         mobileNumber: 1,
//         loginStatus:1
//       },
//     };
//     const [data, total] = await Promise.all([
//       usersDB
//         .find(query, options.projection)
//         .sort(options.sort)
//         .skip(options.skip)
//         .limit(options.limit)
//         .exec(),
//       usersDB.countDocuments(query),
//     ]);

//     const userArray = data.map((dval) => ({
//       _id: dval._id,
//       username: dval.username,
//       email: dval.email ? common.decrypt(dval.email) : dval.mobileNumber,
//       status: dval.status,
//       datetime: dval.createdDate,
//       displayname: dval.displayname,
//       tfa_status: dval.tfastatus,
//       kyc_status: dval.kycstatus,
//       loginStatus:dval.loginStatus,

//     }));

//     res.json({
//       status: true,
//       data: userArray,
//       totalPages: Math.ceil(total / limit),
//     });
//   } catch (e) {
//     res.json({
//       status: false,
//       Message: "Something Went Wrong. Please Try Again later",
//     });
//   }
// });

router.post("/activatedUserList", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, keyword = "" } = req.body;

    // Create a dynamic query based on keyword
    const query = keyword
      ? { $or: [{ displayname: { $regex: keyword, $options: "i" } }] }
      : {};

    const options = {
      sort: { _id: -1 },
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      projection: {
        username: 1,
        _id: 1,
        email: 1,
        verifyEmail: 1,
        status: 1,
        createdDate: 1,
        displayname: 1,
        tfastatus: 1,
        kycstatus: 1,
        mobileNumber: 1,
        loginStatus: 1,
        vipBadge: 1,
      },
    };

    // Fetch filtered data and total count
    const [data, total] = await Promise.all([
      usersDB
        .find(query, options.projection)
        .sort(options.sort)
        .skip(options.skip)
        .limit(options.limit)
        .exec(),
      usersDB.countDocuments(query),
    ]);

    // Map data for response
    const userArray = data.map((dval) => ({
      _id: dval._id,
      username: dval.username,
      email: dval.email ? common.decrypt(dval.email) : dval.mobileNumber,
      status: dval.status,
      datetime: dval.createdDate,
      displayname: dval.displayname,
      tfa_status: dval.tfastatus,
      kyc_status: dval.kycstatus,
      loginStatus: dval.loginStatus,
      vipBadge: dval.vipBadge,
    }));

    // Calculate total pages and return response
    res.json({
      status: true,
      data: userArray,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (e) {
    res.json({
      status: false,
      message: "Something went wrong. Please try again later",
    });
  }
});


router.post(
  "/changeUserAccountStatus",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const { status, _id } = req.body;
      const updateStatus = status === 0 ? 1 : 0;
      const updatedUser = await usersDB.findOneAndUpdate(
        { _id },
        {
          $set: {
            loginStatus: updateStatus,
            modifiedDate: Date.now(),
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      }

      if (updatedUser.status === 0) {
        common.socket_account("account_deactivate", updatedUser._id, () => { });
      }

      res.json({
        status: true,
        Message: "User Account Status Updated Successfully",
      });
    } catch (error) {
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post(
  "/changeVipBadgeStatus",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const { _id, vipBadge } = req.body;

      const updatedUser = await usersDB.findOneAndUpdate(
        { _id },
        {
          $set: {
            vipBadge: !vipBadge, // Toggle value
            modifiedDate: Date.now(),
          },
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.json({
          status: false,
          Message: "Failed to update VIP Badge status",
        });
      }

      const userId = _id;
      userRedis.getUser(userId, function (datas) {
        if (datas) {
          return res.json({
            status: true,
            Message: "VIP Badge Status Updated Successfully",
          });
        } else {
          return res.json({
            status: false,
            Message: "Redis Update Failed",
          });
        }
      });
    } catch (error) {
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post("/getKyclist", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body, "=-=-=-=-=-=-=-");

    const kycDetails = await kycDB.findOne({ userId: req.body._id }).exec();
    console.log(kycDetails, "ijjiknknknkin");
    if (!kycDetails) {
      return res.json({
        status: false,
        Message: "No KYC details found for this user",
        code: 404,
      });
    }

    const kyclist = {
      proof1: kycDetails.frontDoc,
      proof2: kycDetails.backDoc,
      proof3: kycDetails.selfieDoc,
      rejectReason: kycDetails.rejectReson,
      _id: kycDetails._id,
      kycStatus: kycDetails.kycStatus,
      userId: kycDetails.userId,
      fullName: kycDetails.fullname,
      dob: kycDetails.dob,
      residential: kycDetails.residential,
      verfiType: kycDetails.verfiType,
      nationality: kycDetails.nationality,
    };

    res.json({
      status: true,
      data: kyclist,
    });
  } catch (error) {
    console.log("Error fetching KYC data:", error);
    return res.json({
      status: false,
      Message: "Internal server error",
      code: 500,
    });
  }
});

router.post("/kycAprove", common.tokenmiddleware, async (req, res) => {
  try {
    const { userId, _id } = req.body;
    // Update the user's KYC status
    const userUpdateResult = await usersDB.updateOne(
      { _id: userId },
      { $set: { kycstatus: 1 } }
    );

    if (userUpdateResult.nModified == 0) {
      return res.json({
        status: false,
        Message: "User not found or KYC status already updated",
        code: 404,
      });
    }

    const kycUpdateResult = await kycDB.updateOne(
      { _id },
      { $set: { kycStatus: 1, approveReson: "valid" } }
    );

    if (kycUpdateResult.nModified == 0) {
      return res.json({
        status: false,
        Message: "KYC record not found or already updated",
        code: 404,
      });
    }
    console.log(userId, "=-=-userId=-=-admin=-=-");

    let getuser = await usersDB.findOne(
      { _id: userId });

    var USERNAME = getuser.displayname;
    var findDetails = await antiPhishing.findOne({ userid: userId });
    var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`

    let resData = await mailtempDB.findOne({ key: "KYC-APPROVED" });
    var etempdataDynamic = resData.body
      .replace(/###USERNAME###/g, USERNAME)
      .replace(/###APCODE###/g, findDetails && findDetails.Status == "true" ? APCODE : "");

    var mailRes = await mail.sendMail(
      {
        from: {
          name: process.env.FROM_NAME,
          address: process.env.FROM_EMAIL,
        },

        to: common.decrypt(getuser.email),
        subject: resData.Subject,
        html: etempdataDynamic,
      });
    if (mailRes != null) {
      userRedis.getUser(userId, function (datas) {
        console.log("redis datas -->>>", datas);
        if (datas) {
          common.createWallet(userId, function (response) {
            console.log("wallet response -->>", response);
            if (response.status === true) {
              return res.json({
                status: true,
                Message: "KYC approved successfully",
                code: 200,
              });
            }
            else {
              return res.json({
                status: false,
                Message: "Something went wrong , please try again later",
                code: 200,
              });
            }
          });
        } else {
          return res.json({
            status: false,
            Message: "Something went wrong , please try again later",
            code: 200,
          });
        }
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Internal server error",
      code: 500,
    });
  }
});

router.post("/kycReject", common.tokenmiddleware, async (req, res) => {
  try {
    const { userId, _id, reason } = req.body;

    // Update the user's KYC status to rejected
    const userUpdateResult = await usersDB.updateOne(
      { _id: userId },
      { $set: { kycstatus: 3 } }
    );

    if (userUpdateResult.nModified === 0) {
      return res.json({
        status: false,
        Message: "User not found or KYC status already updated",
        code: 404,
      });
    }

    // Update the KYC document with the rejection reason
    const kycUpdateResult = await kycDB.updateOne(
      { _id },
      { $set: { kycStatus: 3, rejectReson: reason } }
    );

    if (kycUpdateResult.nModified === 0) {
      return res.json({
        status: false,
        Message: "KYC record not found or already updated",
        code: 404,
      });
    }

    let getuser = await usersDB.findOne({ _id: userId });
    var findDetails = await antiPhishing.findOne({ userid: userId });
    var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`

    var USERNAME = getuser.displayname;
    var REJECTION_REASON = reason;

    let resData = await mailtempDB.findOne({ key: "KYC-REJECTION" });
    var etempdataDynamic = resData.body
      .replace(/###USERNAME###/g, USERNAME)
      .replace(/###REJECTION_REASON###/g, REJECTION_REASON)
      .replace(/###APCODE###/g, findDetails && findDetails.Status == "true" ? APCODE : "");
    var mailRes = await mail.sendMail(
      {
        from: {
          name: process.env.FROM_NAME,
          address: process.env.FROM_EMAIL,
        },

        to: common.decrypt(getuser.email),
        subject: resData.Subject,
        html: etempdataDynamic,
      });
    if (mailRes != null) {
      userRedis.getUser(userId, function (datas) {
        if (datas) {
          return res.json({
            status: true,
            Message: "KYC rejected successfully",
            code: 200,
          });
        } else {
          return res.json({
            status: false,
            Message: "Something went wrong , please try again later",
            code: 200,
          });
        }
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Internal server error",
      code: 500,
    });
  }
});

router.post(
  "/allCurrencyListCrypto",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const { page = 1, limit = 5, keyword = "" } = req.body;

      // Calculate the number of documents to skip
      const skip = (page - 1) * limit;

      // Find the currencies, apply pagination, and search keyword filter if necessary
      const query = {
        currencyName: { $regex: keyword, $options: "i" },
      };

      const totalCurrencies = await currencyDB.countDocuments(query);

      const currencyData = await currencyDB
        .find(query)
        .skip(skip)
        .limit(limit)
        .exec();

      // Format the data
      const data = currencyData.map((currency, index) => ({
        _id: currency._id,
        id: skip + index + 1,
        name: currency.currencyName,
        symbol: currency.currencySymbol,
        Currency_image: currency.Currency_image,
        status: currency.status,
        date: moment(currency.modifiedDate).format("lll"),
        currencyType: currency.currencyType,
      }));

      // Call the Binance exchange function
      // BINANCEexchange.currencyConversion();

      // Send the response with pagination info
      return res.json({
        status: true,
        data: data,
        currentPage: page,
        totalPages: Math.ceil(totalCurrencies / limit),
        totalCurrencies: totalCurrencies,
        Message: "Currency updated successfully",
      });
    } catch (error) {
      return res.json({
        status: false,
        data: {},
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post("/viewOneCurrency", common.tokenmiddleware, (req, res) => {
  try {
    currencyDB.findOne({ _id: req.body._id }).exec((err, data) => {
      if (!err) {
        return res.json({ status: true, Message: data });
      } else {
        return res.json({ status: false, Message: {} });
      }
    });
  } catch (error) {
    return res.json({
      status: false,
      data: {},
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/currencyAddUpdate", common.tokenmiddleware, async (req, res) => {
  try {
    const {
      _id,
      currencyName,
      currencySymbol,
      currencyType,
      coinType,
      status,
      tradeStatus,
      makerFee,
      takerFee,
      withdrawFee,
      minWithdrawLimit,
      maxWithdrawLimit,
      minTradeAmount,
      maxTradeAmount,
      Withdraw24Limit,
      Currency_image,
      modifiedDate,
      erc20token,
      trc20token,
      bep20token,
      rptc20token,
      p2p_status,
      minDepositLimit,
      maxDepositLimit,
      maxSwap,
      minSwap,
      swapStatus,
      swapFee,
      swapPrice,
      coin_price,
      contractAddress_erc20,
      coinDecimal_erc20,
      contractAddress_bep20,
      coinDecimal_bep20,
      contractAddress_trc20,
      coinDecimal_trc20,
      contractAddress_rptc20,
      coinDecimal_rptc20,
      // withdrawFee_usdt
    } = req.body;

    console.log(req.body);
    // Set default statuses
    const depositStatus = req.body.depositStatus || "Active";
    const withdrawStatus = req.body.withdrawStatus || "Active";

    const currencyData = {
      currencyName,
      currencySymbol,
      currencyType,
      coinType,
      status,
      depositStatus,
      withdrawStatus,
      tradeStatus,
      makerFee,
      takerFee,
      withdrawFee,
      minWithdrawLimit,
      maxWithdrawLimit,
      minTradeAmount,
      maxTradeAmount,
      Withdraw24Limit,
      Currency_image,
      modifiedDate,
      erc20token,
      trc20token,
      bep20token,
      rptc20token,
      p2p_status,
      minDepositLimit,
      maxDepositLimit,
      popularOrder: (await currencyDB.countDocuments()) + 1,
      maxSwap: +maxSwap || 0,
      minSwap: +minSwap || 0,
      swapStatus: +swapStatus || "0",
      swapFee: +swapFee || 0,
      swapPrice: +swapPrice || 0,
      coin_price: +coin_price || 0,
      contractAddress_erc20: contractAddress_erc20 || "",
      coinDecimal_erc20: coinDecimal_erc20 || "",
      contractAddress_bep20: contractAddress_bep20 || "",
      coinDecimal_bep20: coinDecimal_bep20 || "",
      contractAddress_trc20: contractAddress_trc20 || "",
      coinDecimal_trc20: coinDecimal_trc20 || "",
      contractAddress_rptc20: contractAddress_rptc20 || "",
      coinDecimal_rptc20: coinDecimal_rptc20 || "",
      // withdrawFee_usdt: withdrawFee_usdt || 0
    };

    if (!_id) {
      // Create new currency
      const createdData = await currencyDB.create(currencyData);
      await launchPadDB.updateOne(
        { symbol: currencySymbol },
        { $set: { status: 1 } }
      );
      await updateUserWallets(createdData);
      await updateAdminWallets(createdData);
      BINANCEexchange.currencyConversion();
      tradeRedis.setRedisForLaunchpad(() => { });

      return res.json({ status: true, Message: "Currency added successfully" });
    } else {
      // Update existing currency
      await currencyDB.updateOne({ _id }, { $set: currencyData });
      if (currencySymbol === "ETH") {
        await updateEthCurrencyData();
      }
      BINANCEexchange.currencyConversion();
      redisCache.updateRedisPairs(() => { });
      return res.json({
        status: true,
        Message: "Currency updated successfully",
      });
    }
  } catch (error) {
    console.error(error); // Log the error for debugging
    return res.json({
      status: false,
      Message: "Something went wrong. Please try again later",
    });
  }
});

// Helper function to update user wallets
async function updateUserWallets(createdData) {
  const userDetails = await usersDB.find({});
  const updateObj = {
    $push: {
      wallets: {
        currencyId: mongoose.Types.ObjectId(createdData._id),
        currencyName: createdData.currencyName,
        currencySymbol: createdData.currencySymbol,
        amount: 0,
      },
    },
  };
  for (const element of userDetails) {
    await userWalletDB.updateOne(
      { userId: mongoose.Types.ObjectId(element._id) },
      updateObj,
      { new: true }
    );
  }
}

// Helper function to update admin wallets
async function updateAdminWallets(createdData) {
  const updateAdminWallet = {
    $push: {
      wallets: {
        currencyId: mongoose.Types.ObjectId(createdData._id),
        currencyName: createdData.currencyName,
        currencySymbol: createdData.currencySymbol,
        amount: 0,
      },
    },
  };
  await adminWalletDB.updateOne(
    { userId: "620d4f8ebf0ecf8fd8dac67a", type: 0 },
    updateAdminWallet,
    { new: true }
  );
  await adminWalletDB.updateOne(
    { userId: "620d4f8ebf0ecf8fd8dac67a", type: 1 },
    updateAdminWallet,
    { new: true }
  );
}

// Helper function to update ETH currency data
async function updateEthCurrencyData() {
  const resData = await currencyDB.findOne(
    { currencySymbol: "ETH" },
    { block: 1, contractAddress: 1 }
  );
  if (resData) {
    await client.set("Currency", JSON.stringify(resData));
  }
}



router.post("/deletecurrency", common.tokenmiddleware, async (req, res) => {
  try {
    var deleteres = await currencyDB.findOneAndDelete({ _id: req.body._id });
    if (deleteres) {
      redisCache.updateRedisPairs(() => { });
      res
        .status(200)
        .json({ status: true, Message: "Currency deleted successfully" });
    } else {
      res
        .status(400)
        .json({ status: false, Message: "Currency does not deleted" });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      Message: "Something went wrong, please try again",
    });
  }
});

router.post("/getStaking", common.tokenmiddleware, async (req, res) => {
  try {
    let findCurrency = await stakingDB
      .findOne({ currencyId: req.body.currencyId })
      .exec({});
    if (findCurrency) {
      return res.json({ status: true, Message: findCurrency });
    } else {
      return res.json({ status: false, Message: "Please try again later" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post(
  "/updateStakingFlexible",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      console.log("req.body===", req.body);
      let findCurrency = await currencyDB
        .findOne({ _id: req.body.currencyId })
        .exec({});
      if (findCurrency) {
        let findStakeDetails = await stakingDB
          .findOne({ currencyId: req.body.currencyId })
          .exec({});
        if (findStakeDetails == null) {
          //  =======CREATE STAKING========  //
          let createStaking = await stakingDB.create(req.body);
          if (createStaking) {
            redisCache.updateRedisPairs(() => { });
            return res.json({
              status: true,
              Message:
                findCurrency.currencySymbol +
                "Currency staking process completed",
            });
          } else {
            return res.json({
              status: false,
              Message: "Please try again later",
            });
          }
        } else {
          //  =======UPDATE STAKING========  //
          var obj = {
            firstDuration: req.body.firstDuration,
            secondDuration: req.body.secondDuration,
            thirdDuration: req.body.thirdDuration,
            fourthDuration: req.body.fourthDuration,
            APRinterest: req.body.APRinterest,
            maximumStaking: req.body.maximumStaking,
            minimumStaking: req.body.minimumStaking,
            FistDurationAPY: req.body.FistDurationAPY,
            SecondDurationAPY: req.body.SecondDurationAPY,
            ThirdDurationAPY: req.body.ThirdDurationAPY,
            FourthDurationAPY: req.body.FourthDurationAPY,
            minimumStakingflex: req.body.minimumStakingflex,
            maximumStakingflex: req.body.maximumStakingflex,
            status: req.body.status,
            statusflex: req.body.statusflex,
          };
          console.log(obj, "=-=-=-=-=obj");
          let updateStaking = await stakingDB
            .updateOne({ currencyId: req.body.currencyId }, { $set: obj })
            .exec({});
          if (updateStaking) {
            redisCache.updateRedisPairs(() => { });
            return res.json({
              status: true,
              Message:
                findCurrency.currencySymbol +
                " Currency staking updating completed",
            });
          } else {
            return res.json({
              status: false,
              Message: "Please try again later",
            });
          }
        }
      } else {
        return res.json({ status: false, Message: "Please try again later" });
      }
    } catch (error) {
      console.log(error, "=-=-=-=-=error");

      return res.json({ status: false, Message: "Internal server error" });
    }
  }
);

router.post("/tradepair/view", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, keyword = "" } = req.body;

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Find the currencies, apply pagination, and search keyword filter if necessary
    const query = {
      pair: { $regex: keyword, $options: "i" },
    };

    const totalCurrencies = await tradePairDB.countDocuments(query);
    tradePairDB
      .find(query)
      .skip(skip)
      .limit(limit)
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];

          console.log(data, "data");
          for (var i = 0; i < data.length; i++) {
            var obj = {
              _id: data[i]._id,
              id: i + 1,
              pair: data[i].pair,
              status: data[i].status,
              marketPrice: data[i].marketPrice,
              min_trade_amount: data[i].min_trade_amount,
              makerFee: data[i].makerFee,
              takerFee: data[i].takerFee,
              liquidity_status: data[i].liquidity_status,
              buyspread: data[i].buyspread,
              sellspread: data[i].sellspread,
              from_symbol: data[i].from_symbol,
              market_making: data[i].market_making ? data[i].market_making : 0,
              to_symbol: data[i].to_symbol,
              value_24h: data[i].value_24h,
              volume_24h: data[i].volume_24h,
            };
            resdata.push(obj);
          }
          res.json({
            status: true,
            data: resdata,
            currentPage: page,
            totalPages: Math.ceil(totalCurrencies / limit),
            totalCurrencies: totalCurrencies,
            Message: "Currency updated successfully",
          });
        }
      });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/tradepair/changestatus", common.tokenmiddleware, (req, res) => {
  try {
    tradePairDB
      .updateOne(
        { _id: req.body._id },
        {
          $set: {
            status: req.body.status,
            modifiedDate: Date.now(),
          },
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          redisCache.setRedisPairs(function (pair_update) { });
          res.json({
            status: true,
            Message: "Trade Pair Status Changed Successfully",
            doc: data,
          });
          BINANCEexchange.currencyConversion();
        }
      });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post(
  "/tradepair/changeliqstatus",
  common.tokenmiddleware,
  (req, res) => {
    try {
      tradePairDB
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              liquidity_status: req.body.status,
              modifiedDate: Date.now(),
            },
          }
        )
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            redisCache.setRedisPairs(function (pair_update) { });
            res.json({
              status: true,
              Message: "Trade Pair Status Changed Successfully",
              doc: data,
            });
            BINANCEexchange.currencyConversion();
          }
        });
    } catch (e) {
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.get("/tradepair/currency", common.tokenmiddleware, (req, res) => {
  try {
    currencyDB
      .find({ status: "Active" }, { _id: 1, currencySymbol: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          BINANCEexchange.currencyConversion();
          var element = [];
          for (let i = 0; i < data.length; i++) {
            element.push(data[i]._id + "_" + data[i].currencySymbol);
          }
          res.json({
            status: true,
            data: element,
          });
        }
      });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post(
  "/tradepair/getTradepairOne",
  common.tokenmiddleware,
  (req, res) => {
    try {
      tradePairDB.findOne({ _id: req.body._id }).exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something went wrong",
          });
        } else {
          BINANCEexchange.currencyConversion();
          res.json({
            status: true,
            data: data,
          });
        }
      });
    } catch (e) {
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post(
  "/tradepair/deletetradepair",
  common.tokenmiddleware,
  (req, res) => {
    try {
      tradePairDB.deleteOne({ _id: req.body._id }, function (err, data) {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Trade Pair Deleted Successfully",
          });

          redisCache.setRedisPairs(function (pair_update) { });
        }
      });
    } catch (e) {
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post(
  "/tradepair/addTradePair",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const {
        _id,
        from_symbol,
        to_symbol,
        from_symbol_id,
        to_symbol_id,
        pair,
        highest_24h,
        lowest_24h,
        changes_24h,
        volume_24h,
        value_24h,
        min_trade_amount,
        max_trade_amount,
        marketPrice,
        status,
        liquidity_status,
        liquidity_available,
        liquidity_name,
        price_decimal,
        amount_decimal,
        makerFee,
        takerFee,
        buyspread,
        sellspread,
        min_qty,
        max_qty,
        min_price,
        max_price,
        min_total,
        liq_price_decimal,
        liq_amount_decimal,
      } = req.body;

      const isRequiredFieldMissing = [
        from_symbol,
        to_symbol,
        from_symbol_id,
        to_symbol_id,
        min_trade_amount,
        max_trade_amount,
        status,
        liquidity_status,
        price_decimal,
        amount_decimal,
        makerFee,
        takerFee,
      ].some((field) => !field);

      if (isRequiredFieldMissing) {
        return res.json({
          status: false,
          Message: "Please fill all required fields",
        });
      }

      if (from_symbol === to_symbol) {
        return res.json({
          status: false,
          Message: "Same Currency should not be added",
        });
      }

      const tradepairdet = await tradePairDB.findOne({
        pair: from_symbol + "_" + to_symbol,
      });

      if (!_id && tradepairdet) {
        return res.json({
          status: false,
          Message: "Pair Already Added",
        });
      }

      const tradePairData = {
        to_symbol_id,
        from_symbol_id,
        to_symbol,
        from_symbol,
        pair: from_symbol + "_" + to_symbol,
        min_trade_amount,
        max_trade_amount,
        marketPrice,
        status,
        liquidity_status,
        price_decimal,
        amount_decimal,
        makerFee,
        takerFee,
        buyspread,
        sellspread,
        modifiedDate: Date.now(),
        createdDate: _id ? undefined : Date.now(),
      };

      const saveTradePair = async (data) => {
        await binanceexchange.setTradepairRedis(data);
        await binanceexchange.orderpicker(data);
        redisCache.updateRedisPairs(() => { });
        activeorder.activeOrdersSet(() => { });
        return data;
      };

      if (_id) {
        const updatedData = await tradePairDB.findOneAndUpdate(
          { _id },
          { $set: tradePairData },
          { new: true }
        );
        await saveTradePair(updatedData);
        return res.json({
          status: true,
          Message: "Trade pair Updated Successfully",
          data: updatedData,
        });
      } else {
        const newTradePair = await tradePairDB.create(tradePairData);
        await saveTradePair(newTradePair);
        return res.json({
          status: true,
          Message: "Trade pair Added Successfully",
          data: newTradePair,
        });
      }
    } catch (e) {
      console.log(e);
      res.status(401).send("Unauthorized");
    }
  }
);

router.post("/addsitesettings", common.tokenmiddleware, async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    // console.log("existing settings-->",settings);

    if (settings) {
      settings.facebook = req.body.facebook || settings.facebook;
      settings.twitter = req.body.twitter || settings.twitter;
      settings.linkedIn = req.body.linkedIn || settings.linkedIn;
      settings.instagram = req.body.instagram || settings.instagram;
      settings.reddit = req.body.reddit || settings.reddit;
      settings.youtube = req.body.youtube || settings.youtube;
      settings.bitcointalk = req.body.bitcointalk || settings.bitcointalk;
      settings.whatsappNumber =
        req.body.whatsappNumber || settings.whatsappNumber;
      settings.email = req.body.email || settings.email;
      settings.copyrightText = req.body.copyrightText || settings.copyrightText;
      settings.coinMarketCap = req.body.coinMarketCap || settings.coinMarketCap;
      settings.coinGecko = req.body.coinGecko || settings.coinGecko;
      settings.telegram = req.body.telegram || settings.telegram;
      settings.footerContent = req.body.footerContent || settings.footerContent;
      settings.depositStatus = req.body.depositStatus || settings.depositStatus;
      settings.withdrawalStatus =
        req.body.withdrawalStatus || settings.withdrawalStatus;
      settings.siteStatus = req.body.siteStatus || settings.siteStatus;
      settings.kycStatus = req.body.kycStatus || settings.kycStatus;
      settings.kycMaintenance = req.body.kycMaintenance || settings.kycMaintenance;
      settings.depositMaintenance =
        req.body.depositMaintenance || settings.depositMaintenance;
      settings.withdrawalMaintenance =
        req.body.withdrawalMaintenance || settings.withdrawalMaintenance;
      settings.siteMaintenance =
        req.body.siteMaintenance || settings.siteMaintenance;
      settings.tradeStatus = req.body.tradeStatus || settings.tradeStatus;
      settings.tradeContent = req.body.tradeContent || settings.tradeContent;
      settings.siteLogo = req.body.siteLogo || settings.siteLogo;
      settings.favicon = req.body.favicon || settings.favicon;
      settings.modifiedDate = Date.now();
      console.log(settings, '=== settings.siteStatus =-=-=- settings.siteStatus ==-', "req.body.siteStatus ", req.body.siteStatus)

      await AdminSettings.updateOne({}, { $set: settings });
      // .then(result => {
      //   console.log("Update successful:", result);
      // })
      // .catch(error => {
      //   console.error("Error updating settings:", error);
      // });

      client.set("adminSettings", JSON.stringify(settings)); // Set cache with an expiration of 1 hour

      res.json({
        status: true,
        message: "Settings updated successfully",
        data: settings,
      });
    } else {
      settings = new AdminSettings({
        facebook: req.body.facebook,
        twitter: req.body.twitter,
        linkedIn: req.body.linkedIn,
        instagram: req.body.instagram,
        reddit: req.body.reddit,
        youtube: req.body.youtube,
        bitcointalk: req.body.bitcointalk,
        whatsappNumber: req.body.whatsappNumber,
        email: req.body.email,
        copyrightText: req.body.copyrightText,
        coinMarketCap: req.body.coinMarketCap,
        coinGecko: req.body.coinGecko,
        telegram: req.body.telegram,
        footerContent: req.body.footerContent,
        depositStatus: req.body.depositStatus,
        withdrawalStatus: req.body.withdrawalStatus,
        siteStatus: req.body.siteStatus,
        kycStatus: req.body.kycStatus,
        kycMaintenance: req.body.kycMaintenance,
        depositMaintenance: req.body.depositMaintenance,
        withdrawalMaintenance: req.body.withdrawalMaintenance,
        siteMaintenance: req.body.siteMaintenance,
        tradeStatus: req.body.tradeStatus,
        tradeContent: req.body.tradeContent,
        siteLogo: req.body.siteLogo,
        favicon: req.body.favicon,
      });

      await settings.save();

      // Add the new data to Redis cache
      client.set("adminSettings", JSON.stringify(settings)); // Set cache with an expiration of 1 hour

      res.json({
        status: true,
        message: "Settings added successfully",
        data: settings,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
});
// GET route to retrieve the settings
router.get("/getsitesettings", async (req, res) => {
  try {
    client.get("adminSettings", async (err, data) => {
      if (err) throw err;
      // console.log("data redis data-->>",data);
      if (data) {
        return res.json({ status: true, data: JSON.parse(data) });
      } else {
        const settings = await AdminSettings.findOne();

        if (settings) {
          client.set("adminSettings", JSON.stringify(settings)); // Set cache with an expiration of 1 hour
          return res.json({ status: true, data: settings });
        } else {
          return res
            .status(404)
            .json({ status: false, message: "Settings not found" });
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
});

router.post("/tradepair/viewbycurrency", (req, res) => {
  try {
    tradePairDB
      .find({ to_symbol: req.body.currency, status: 1 })
      .sort({ pair: 1 })
      .populate("from_symbol_id", "Currency_image")
      .exec((err, data) => {
        //console.log((data, "=-=-=-=-Currency_image-=-Currency_image");
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var obj = {
              _id: data[i]._id,
              id: i + 1,
              pair: data[i].pair,
              status: data[i].status,
              marketPrice: data[i].marketPrice,
              changes_24h: data[i].changes_24h,
              min_trade_amount: data[i].min_trade_amount,
              makerFee: data[i].makerFee,
              takerFee: data[i].takerFee,
              liquidity_status: data[i].liquidity_status,
              buyspread: data[i].buyspread,
              sellspread: data[i].sellspread,
              liquidity_name: data[i].liquidity_name,
              from_symbol: data[i].from_symbol,
              to_symbol: data[i].to_symbol,
              Currency_image: data[i].from_symbol_id
                ? data[i].from_symbol_id.Currency_image
                : null,
            };
            resdata.push(obj);
          }
          res.status(200).json({
            status: true,
            data: resdata,
          });
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/tradepair/viewall", common.tokenmiddleware, (req, res) => {
  try {
    tradePairDB
      .find({ status: 1 })
      .sort({ pair: 1 })
      .populate("from_symbol_id", "Currency_image")
      .exec((err, data) => {
        //console.log((data, "=-=-=-=-Currency_image-=-Currency_image");
        if (err) {
          res.status(400).json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          resdata = [];
          for (var i = 0; i < data.length; i++) {
            var obj = {
              _id: data[i]._id,
              id: i + 1,
              pair: data[i].pair,
              status: data[i].status,
              marketPrice: data[i].marketPrice,
              changes_24h: data[i].changes_24h,
              min_trade_amount: data[i].min_trade_amount,
              makerFee: data[i].makerFee,
              takerFee: data[i].takerFee,
              liquidity_status: data[i].liquidity_status,
              buyspread: data[i].buyspread,
              sellspread: data[i].sellspread,
              liquidity_name: data[i].liquidity_name,
              from_symbol: data[i].from_symbol,
              to_symbol: data[i].to_symbol,
              Currency_image: data[i].from_symbol_id
                ? data[i].from_symbol_id.Currency_image
                : null,
            };
            resdata.push(obj);
          }
          res.status(200).json({
            status: true,
            data: resdata,
          });
        }
      });
  } catch (e) {
    res.status(500).json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/userbalance", common.tokenmiddleware, (req, res) => {
  var userid = req.body.userId;
  userWalletDB
    .aggregate([
      { $unwind: "$wallets" },
      {
        $lookup: {
          from: "currency",
          localField: "wallets.currencyId",
          foreignField: "_id",
          as: "currency",
        },
      },
      {
        $match: { userId: mongoose.Types.ObjectId(userid) },
      },
      {
        $project: {
          currencyname: "$currency.currencySymbol",
          balance: "$wallets.amount",
          image: "$currency.Currency_image",
        },
      },
    ])
    .exec((err, data) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        var balancedata = [];
        for (var i = 0; i < data.length; i++) {
          if (data[i].image.length != 0) {
            var obj = {
              currencyname: data[i].currencyname,
              balance: parseFloat(data[i].balance).toFixed(8),
              image: data[i].image,
            };
            balancedata.push(obj);
          }
        }
        res.json({
          status: true,
          Message: balancedata,
        });
      }
    });
});

router.post("/useraddress", common.tokenmiddleware, (req, res) => {
  var userid = req.body.userId;

  cryptoAddressDB
    .aggregate([
      {
        $match: { user_id: mongoose.Types.ObjectId(userid) },
      },
      {
        $lookup: {
          from: "currency",
          localField: "currency",
          foreignField: "_id",
          as: "currency",
        },
      },
      { $unwind: "$currency" },
      {
        $project: {
          currencyname: "$currency.currencySymbol",
          address: 1,
          image: "$currency.Currency_image",
        },
      },
    ])
    .exec((err, data) => {
      console.log("addres data", data);
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        var eth_wallets = [];
        //console.log((data.length, "data.length");
        for (var j = 0; j < data.length; j++) {
          if (data[j].currencyname == "ETH") {
            var obj = {
              address: data[j].address,
              image: data[j].image,
              currency: data[j].currencyname,
            };
            eth_wallets.push(obj);
          }
        }
        res.json({
          status: true,
          Message: data,
          eth_wallets: eth_wallets,
        });
      }
    });
});

router.post("/support_category_list", common.tokenmiddleware, async (req, res) => {
  try {
    // Get page and limit from the request body with default values if not provided
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 5;

    // Calculate the skip value for pagination
    const skip = (page - 1) * limit;

    // Get the total number of categories for calculating total pages
    const totalRecords = await supportcategoryDB.countDocuments();

    // Find categories with pagination
    supportcategoryDB
      .find({}, { _id: 1, category: 1, status: 1 })
      .sort({ _id: -1 })  // Sort in descending order based on _id
      .skip(skip)          // Skip documents for pagination
      .limit(limit)        // Limit the number of documents returned
      .exec((err, data) => {
        if (err) {
          return res.json({
            status: false,
            message: "Something Went Wrong. Please Try Again later",
          });
        }

        // Prepare the response data
        const category = data.map((item, index) => ({
          _id: item._id,
          id: skip + index + 1, // Maintain proper indexing across pages
          category: item.category,
          status: item.status,
        }));

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / limit);

        // Send response with paginated data and total pages
        res.json({
          status: true,
          data: category,
          totalPages: totalPages,
          totalRecords: totalRecords,  // Optional, if you want to show total records
        });
      });
  } catch (e) {
    // console.log("=====support_category_list catch============", e.message);
    return res.json({
      status: false,
      message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_category_get", common.tokenmiddleware, (req, res) => {
  try {
    supportcategoryDB
      .findOne({ _id: req.body._id }, { category: 1, status: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something went wrong",
          });
        } else {
          res.json({
            status: true,
            data: data,
          });
        }
      });
  } catch (e) {
    //console.log(("=====support_category_get catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_category_update", common.tokenmiddleware, (req, res) => {
  try {
    // console.log(req.body,"=-=-=req.body=-=-=support add");
    if (req.body._id) {
      supportcategoryDB
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              category: req.body.category,
              status: parseInt(req.body.status),
              updated_at: Date.now(),
            },
          }
        )
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            res.json({
              status: true,
              Message: "Support Category Updated Successfully",
            });
          }
        });
    } else if (!req.body._id) {
      var curr = {
        category: req.body.category,
        status: parseInt(req.body.status),
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      supportcategoryDB.create(curr, (err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Support Category Added Successfully",
          });
        }
      });
    } else {
      res.json({
        status: false,
        Message: "Something went wrong",
      });
    }
  } catch (e) {
    //console.log(("=====support_category_update catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_category_delete", common.tokenmiddleware, function (req, res) {
  try {
    supportcategoryDB.deleteOne({ _id: req.body._id }, function (err, data) {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        res.json({
          status: true,
          Message: "Support Category Deleted Successfully",
        });
      }
    });
  } catch (e) {
    //console.log(("=====support_category_delete catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

// router.post("/support_list", (req, res) => {
//   try {
//     var perPage = Number(req.body.limit ? req.body.limit : 0);
//     var page = Number(req.body.page ? req.body.page  : 0);
//     page = parseInt(page) + parseInt(1);
//     if (
//       typeof perPage !== "undefined" &&
//       perPage !== "" &&
//       perPage > 0 &&
//       typeof page !== "undefined" &&
//       page !== "" &&
//       page > 0
//     ) {
//       var skippage = perPage * page - perPage;
//       supportlistDB
//         .aggregate([
//           {
//             $lookup: {
//               from: "users",
//               localField: "userId",
//               foreignField: "_id",
//               as: "userdata",
//             },
//           },
//           {
//             $unwind: {
//               path: "$userdata",
//             },
//           },
//           {
//             $sort: { created_at: 1 },
//           },
//           {
//             $project: {
//               _id: 1,
//               created_at: 1,
//               updated_at: 1,
//               userId: 1,
//               message: 1,
//               image: 1,
//               status: 1,
//               category: 1,
//               reply: 1,
//               userData: "$userdata",
//             },
//           },
//         ])
//         .exec((err, data) => {
//           // console.log(data, "=-=-= raw data from DB =-=-="); // Log raw data here
//           if (err) {
//             res.json({
//               status: false,
//               Message: "Something Went Wrong. Please Try Again later",
//             });
//           } else {
//             supportlistDB
//               .find({})
//               .countDocuments()
//               .sort({ _id: -1 })
//               .exec(function (err, count) {
//                 var userArray = [];
//                 for (let dval of data) {
//                   var obj = {
//                     _id: dval._id,
//                     created_at: dval.created_at,
//                     updated_at: dval.updated_at,
//                     userId: dval.userId,
//                     message: dval.message,
//                     image: dval.image,
//                     status: dval.status,
//                     reply: dval.reply,
//                     email: common.decrypt(dval.userData.email),
//                     category: dval.category,
//                   };
//                   userArray.push(obj);
//                 }
//                 // console.log(userArray,"=-=-userArray=-=");
//                 res.json({
//                   status: true,
//                   data: userArray,
//                   count: count,
//                   pages: Math.ceil(count / perPage),
//                 });
//               });
//           }
//         });
//     } else {
//       return res.json({
//         status: false,
//         Message: "Please enter Pagination field",
//       });
//     }
//   } catch (e) {
//     // console.log(e,"=====support_list catch============");
//     res.json({
//       status: false,
//       Message: "Something Went Wrong. Please Try Again later",
//     });
//   }
// });

router.post("/support_list", common.tokenmiddleware, (req, res) => {
  try {
    // Get page and limit from request body, set default values if not provided
    var perPage = Number(req.body.limit ? req.body.limit : 5); // Default to 5 if no limit provided
    var page = Number(req.body.page ? req.body.page : 1);      // Default to 1 if no page provided

    // Calculate the number of documents to skip
    var skipDocuments = (page - 1) * perPage;

    if (perPage > 0 && page > 0) {
      // Aggregation pipeline for pagination
      supportlistDB
        .aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userdata",
            },
          },
          {
            $unwind: {
              path: "$userdata",
            },
          },
          {
            $sort: { created_at: -1 }, // Sort by created_at (most recent first)
          },
          {
            $skip: skipDocuments,  // Skip documents based on the page number
          },
          {
            $limit: perPage,      // Limit the number of documents to return
          },
          {
            $project: {
              _id: 1,
              created_at: 1,
              updated_at: 1,
              userId: 1,
              message: 1,
              image: 1,
              status: 1,
              category: 1,
              reply: 1,
              userData: {
                email: "$userdata.email",
              },
            },
          },
        ])
        .exec((err, data) => {
          if (err) {
            return res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            // Count the total number of documents for pagination
            supportlistDB
              .countDocuments()
              .exec((err, totalCount) => {
                if (err) {
                  return res.json({
                    status: false,
                    Message: "Something Went Wrong. Please Try Again later",
                  });
                }

                // Decrypt email field in userData
                var userArray = data.map(dval => ({
                  _id: dval._id,
                  created_at: dval.created_at,
                  updated_at: dval.updated_at,
                  userId: dval.userId,
                  message: dval.message,
                  image: dval.image,
                  status: dval.status,
                  reply: dval.reply,
                  email: common.decrypt(dval.userData.email),
                  category: dval.category,
                }));

                // Send paginated response with total page count
                res.json({
                  status: true,
                  data: userArray,
                  totalCount: totalCount,    // Total number of records
                  totalPages: Math.ceil(totalCount / perPage), // Total number of pages
                });
              });
          }
        });
    } else {
      return res.json({
        status: false,
        Message: "Please provide valid pagination parameters",
      });
    }
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});


router.post("/support_view", common.tokenmiddleware, (req, res) => {
  try {
    usersDB.findOne({ _id: req.body._id }).exec((err, value) => {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong",
        });
      } else {
        supportlistDB
          .aggregate([
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userdata",
              },
            },
            {
              $unwind: {
                path: "$userdata",
              },
            },
            {
              $match: {
                _id: ObjectId(req.body._id),
              },
            },

            {
              $project: {
                _id: 1,
                created_at: 1,
                updated_at: 1,
                userId: 1,
                category: 1,
                message: 1,
                image: 1,
                status: 1,
                reply: 1,
                userData: "$userdata",
              },
            },
          ])
          .exec((err, data) => {
            //console.log(("get support view err===", err);
            //console.log(("get support view data=====", data);
            if (err) {
              res.json({
                status: false,
                Message: "Something Went Wrong. Please Try Again later",
              });
            } else {
              var userArray = [];
              for (let dval of data) {
                var obj = {
                  _id: dval._id,
                  created_at: dval.created_at,
                  updated_at: dval.updated_at,
                  userId: dval.userId,
                  category: dval.category,
                  message: dval.message,
                  image: dval.image,
                  status: dval.status,
                  reply: dval.reply,
                  email: common.decrypt(dval.userData.email),
                };
                userArray.push(obj);
              }
              res.json({
                status: true,
                data: userArray,
              });
            }
          });
      }
    });
  } catch (e) {
    // console.log("=====support_view catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/support_save", common.tokenmiddleware, (req, res) => {
  try {
    console.log(req.body, "-=-req.body in supoort save ");
    supportlistDB
      .findOneAndUpdate(
        {
          _id: req.body._id,
        },
        {
          $set: {
            updated_at: Date.now(),
          },
          $push: {
            reply: {
              message: req.body.message,
              image: req.body.image,
              tag: req.body.tag,
              posted_at: Date.now(),
            },
          },
        },
        { new: true }
      )
      .exec((err, data) => {
        // console.log("support data==", data);
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          usersDB
            .findOne({ _id: ObjectId(data.userId) })
            .exec((err1, userdata) => {
              if (!err1) {
                var usermail = common.decrypt(userdata.email);
                mailtempDB
                  .findOne({ key: "support" })
                  .exec(function (etemperr, etempdata) {
                    //console.log((etempdata, "etempdata");
                    if (req.body.image != null) {
                      var message =
                        "Your ticket #" +
                        data._id.toString().substring(0, 8) +
                        " was resolved, and reply for the ticket was " +
                        req.body.message +
                        ", <br> kindly check this attachment <img src=" +
                        ">";
                    } else {
                      var message =
                        "Your ticket #" +
                        data._id.toString().substring(0, 8) +
                        " was resolved, and reply for the ticket was " +
                        req.body.message +
                        "";
                    }

                    var etempdataDynamic = etempdata.body
                      .replace(/###MESSAGE###/g, message)
                      .replace(/###USERNAME###/g, userdata.username)
                      .replace(
                        /###IMAGE###/,
                        req.body.image ? req.body.image : ""
                      );
                    var mailRes = mail.sendMail(
                      {
                        from: {
                          name: process.env.FROM_NAME,
                          address: process.env.FROM_EMAIL,
                        },
                        to: usermail,
                        subject: etempdata.Subject,
                        html: etempdataDynamic,
                      });
                    // console.log(mailRes, "mailRes response===");
                    if (mailRes) {
                      // console.log(err, "mail response===", userdata);
                      return res.json({
                        status: true,
                        Message: "Admin Message Send Successfully",
                      });
                    }
                  });
              }
            });
        }
      });
  } catch (e) {
    // console.log("=====support_save catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/mailtemplate_list", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, keyword = "" } = req.body;

    // Calculate the number of documents to skip for pagination
    const skip = (page - 1) * limit;

    // Construct the query for filtering by keyword
    const query = keyword
      ? { Subject: { $regex: keyword, $options: "i" } }  // Search in 'Subject' field
      : {};  // No filter if keyword is empty

    // Find the total count of documents that match the query
    const totalItems = await mailtempDB.countDocuments(query);

    // Fetch the paginated data that matches the query
    const data = await mailtempDB
      .find(query, { _id: 1, Subject: 1, status: 1, modifiedDate: 1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Map the fetched data to the required structure
    const maildata = data.map((item, index) => ({
      _id: item._id,
      id: index + 1 + skip,  // Offset by the number of skipped items
      title: item.Subject,
      status: item.status,
      date: moment(item.modifiedDate).format("lll"),
    }));

    // Send the response with the paginated data
    res.json({
      status: true,
      data: maildata,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,  // Send total items for frontend pagination
    });
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});


router.post("/mailtemplate_get", common.tokenmiddleware, (req, res) => {
  try {
    mailtempDB
      .findOne({ _id: req.body._id }, { _id: 1, Subject: 1, body: 1, status: 1, key: 1 })
      .exec((err, resData) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong",
          });
        } else {
          res.json({
            status: true,
            data: resData,
          });
        }
      });
  } catch (e) {
    //console.log(("=====mailtemplate_get catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong",
    });
  }
});

router.post("/mailtemplate_update", common.tokenmiddleware, async (req, res) => {
  try {
    const { _id, key, status, Subject, body } = req.body; // Destructure request body
    console.log(req.body, "=-=-req..body..=-=-");
    // If _id is present, handle the update operation
    if (_id) {
      const existingTemplate = await mailtempDB.findOne({ _id }).exec();

      if (!existingTemplate) {
        return res.json({
          success: false,
          Message: "Record not found",
        });
      }

      await mailtempDB.updateOne(
        { _id: _id },
        {
          $set: {
            status: status,
            Subject: Subject,
            body: body,
            key: key,
            modifiedDate: Date.now(),
          },
        }
      );

      return res.json({
        success: true,
        Message: "Mail Template is Successfully Updated",
      });
    }

    // If _id is not present, handle the create operation
    else {
      // Check if the key already exists
      const keyExists = await mailtempDB.findOne({ key: key }).exec();

      if (keyExists) {
        return res.json({
          success: false,
          Message: "The Key already exists",
        });
      }

      // Create new template
      const newTemplate = new mailtempDB({
        key: key,
        status: status,
        Subject: Subject,
        body: body,
        createdDate: Date.now(),
        modifiedDate: Date.now(),
      });

      await newTemplate.save();

      return res.json({
        success: true,
        Message: "Mail Template is Successfully Created",
      });
    }
  } catch (e) {
    return res.json({
      success: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/deletetemplate", common.tokenmiddleware, function (req, res) {
  try {
    mailtempDB.deleteOne({ _id: req.body._id }, function (err, data) {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        res.json({
          status: true,
          Message: "Mail Template Deleted Successfully",
        });
      }
    });
  } catch (e) {
    //console.log(("=====support_category_delete catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/cms_list", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, keyword = "" } = req.body;

    // Calculate the number of documents to skip for pagination
    const skip = (page - 1) * limit;

    // Build the query based on the keyword filter
    const query = {
      heading: { $regex: keyword, $options: "i" }, // Case-insensitive search in 'heading'
    };

    // Count the total number of documents matching the filter for pagination
    const totalItems = await cmsDB.countDocuments(query);

    // Find the data with pagination and filtering
    const data = await cmsDB
      .find(query, { _id: 1, heading: 1, status: 1, title: 1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Format the data for the response
    const cmsdata = data.map((item, index) => ({
      _id: item._id,
      id: skip + index + 1, // Pagination offset for item id
      heading: item.heading,
      status: item.status,
      title: item.title,
    }));

    // Send the response with paginated data
    res.json({
      status: true,
      data: cmsdata,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit), // Calculate total pages
      totalItems, // Total matching items
    });
  } catch (e) {
    console.log("======cms_list catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/cms_update", common.tokenmiddleware, (req, res) => {
  try {
    // Check if _id is provided in the request body
    if (req.body._id) {
      // Update logic: Find the document with the provided _id and update it
      cmsDB.findOne({ _id: req.body._id }).exec((err, data) => {
        if (err || !data) {
          res.json({
            status: false,
            Message: "Record not found",
          });
        } else {
          // Update the found record
          cmsDB
            .updateOne(
              { _id: req.body._id },
              {
                $set: {
                  heading: req.body.heading,
                  title: req.body.title,
                  content_description: req.body.content_description,
                  updated_at: Date.now(),
                  status: req.body.status,
                },
              }
            )
            .exec((err) => {
              if (err) {
                res.json({
                  status: false,
                  Message: "Something Went Wrong. Please Try Again later",
                });
              } else {
                res.json({
                  status: true,
                  Message: "CMS Updated Successfully",
                });
              }
            });
        }
      });
    } else {
      // Create logic: Check if the heading already exists
      cmsDB.findOne({ heading: req.body.heading }).exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else if (data) {
          // If heading already exists, return error
          res.json({
            status: false,
            Message: "Heading already exists.",
          });
        } else {
          // Create a new record
          const newCms = new cmsDB({
            heading: req.body.heading,
            title: req.body.title,
            link: req.body.link,
            meta_keyword: req.body.meta_keyword,
            content_description: req.body.content_description,
            meta_description: req.body.meta_description,
            created_at: Date.now(),
            updated_at: Date.now(),
            status: req.body.status,
          });
          newCms.save((err) => {
            if (err) {
              res.json({
                status: false,
                Message: "Something Went Wrong. Please Try Again later",
              });
            } else {
              res.json({
                status: true,
                Message: "CMS Created Successfully",
              });
            }
          });
        }
      });
    }
  } catch (e) {
    console.log("======cms_update catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/cms_get", common.tokenmiddleware, (req, res) => {
  try {
    cmsDB
      .findOne(
        { _id: req.body._id },
        {
          heading: 1,
          _id: 1,
          link: 1,
          title: 1,
          status: 1,
          meta_keyword: 1,
          meta_description: 1,
          content_description: 1,
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something went wrong",
          });
        } else {
          res.json({
            status: true,
            data: data,
          });
        }
      });
  } catch (e) {
    console.log("======cms_get catch=======", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/deletecmsdetail", common.tokenmiddleware, function (req, res) {
  try {
    cmsDB.deleteOne({ _id: req.body._id }, function (err, data) {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        res.json({
          status: true,
          Message: "CMS Detail Deleted Successfully",
        });
      }
    });
  } catch (e) {
    //console.log(("=====support_category_delete catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get("/admindetails", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    adminDB
      .findOne({ _id: userId }, { userName: 1, tfa_status: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            data: data,
          });
        }
      });
  } catch (e) {
    //console.log(("====admin details catch====", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.get('/getQRcode', common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    let findCode = await adminDB.findOne({ _id: userId }).exec();
    console.log(findCode, "=-findCode=-");
    if (findCode) {
      console.log(findCode.tfaenablekey, "--------findCode.tfaenablekey-----");
      if (findCode.tfaenablekey && findCode.tfaenablekey != "") {
        console.log("it comes wrongly---------");
        var obj = {
          tfa_url: findCode.tfa_url,
          tfaenablekey: findCode.tfaenablekey
        }
        return res.json({ status: true, data: obj });
      } else {
        console.log("it comes correctly---------");
        var qrName = "Pitiklini:" + common.decrypt(findCode.email);
        var secret = speakeasy.generateSecret({ length: 10 });
        const otpauth_url = speakeasy.otpauthURL({
          secret: secret.base32, label: qrName, issuer: "Pitiklini", encoding: 'base32'
        });
        var tfa_url = common.getQrUrl(otpauth_url);
        let findCodeFinal = await adminDB.updateOne({ _id: userId }, { $set: { tfaenablekey: secret.base32, tfa_url: tfa_url } }).exec();
        var obj = {
          tfa_url: tfa_url,
          tfaenablekey: secret.base32
        }
        return res.json({ status: true, data: obj });
      }
    }

  } catch (error) {
    console.log(error, "error");
    return res.json({ status: false, Message: "Oops!, Something went wrong" });

  }
});

router.post("/changeTfaStatus", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body, "-----req.body--");
    let info = req.body;
    let status;
    let usermail;
    if (info.tfa_code == "") {
      return res.json({ status: false, message: "Please enter tfa code" });
    } else if (typeof +info.tfa_code != "number") {
      return res.json({
        status: false,
        message: "Please enter valid tfa code",
      });
    } else {
      console.log("enetered correctly trfa");
      adminDB
        .findOne({ _id: req.userId })
        .select({ tfaenablekey: 1, email: 1, tfa_status: 1 })
        .exec(async function (userErr, userRes) {
          var verified = speakeasy.totp.verify({
            secret: userRes.tfaenablekey,
            encoding: "base32",
            token: info.userToken,
          });
          usermail =
            userRes.email != null
              ? common.decrypt(userRes.email)
              : "";
          if (verified) {
            if (userRes.tfa_status == 0) {
              updatedRule = { tfa_status: 1 };
              status = "enabled";
            } else {
              var qrName = "Pitiklini:" + usermail;
              var secret = speakeasy.generateSecret({ length: 10 });

              const otpauth_url = speakeasy.otpauthURL({
                secret: secret.base32,
                label: qrName,
                issuer: 'Pitiklini',
                encoding: 'base32'
              });

              var url = common.getQrUrl(otpauth_url);

              updatedRule = {
                tfa_status: 0,
                tfaenablekey: secret.base32,
                tfa_url: url,
              };
              status = "disabled";
            }

            console.log(updatedRule, "updatedRule =-------");


            if (userRes) {
              var source = req.headers["user-agent"],
                ua = useragent.parse(source);
              let ip_address =
                req.header("x-forwarded-for") || req.connection.remoteAddress;
              var history = {
                userId: req.userId,
                email:
                  userRes.email != null ? userRes.email : userRes.mobileNumber,
                ipAddress: ip_address,
                browser: ua.browser,
                OS: ua.os,
                Status: status,
              };
              var create = await twoFAHistory.create(history);
              console.log(create, "History stored");
            }
            adminDB
              .updateOne({ _id: req.userId }, { $set: updatedRule })
              .exec(function (errUpdate, resUpdate) {
                if (resUpdate.ok == 1) {
                  return res.json({
                    status: true,
                    result: updatedRule,
                    Message: "2FA has been " + status,
                  });


                  // mailtemplateDB.findOne({ "title": 'tfa_enable_alert'}).exec(function(etemperr,etempdata) {
                  //   var msg   = 'TFA has been enabled'
                  //   var etempdataDynamic = etempdata.mailcontent.replace(/###USERNAME###/g, resData.usermail).replace(/###MESSAGE###/g, msg);
                  //   mail.sendMail({ to: usermail, subject: etempdata.mailsubject, html: etempdataDynamic },function(mailRes){
                  //  //console.log((mailRes,'mailResmailResmailRes');
                  //   });
                  // });
                } else {
                  return res.json({
                    status: false,
                    Message: "2FA has not updated",
                  });
                }
              });
          } else {
            return res.json({ status: false, Message: "Invalid 2FA Code" });
          }
        });
    }
  } catch (e) {
    return res.json({ status: false, Message: "Something went wrong" });
  }
});

router.post('/changePassword', common.tokenmiddleware, async (req, res) => {
  try {
    if (req.body.oldPass && req.body.password && req.body.cpass) {
      if (req.body.password == req.body.cpass) {
        var userId = req.userId;
        let userData = await adminDB.findOne({ _id: userId })
        let oldPassCheck = await common.unlock(req.body.oldPass, userData.password);
        if (oldPassCheck == true) {
          let lock = await bcrypt.hash(req.body.password, saltRounds);
          let passUpdate = await adminDB.updateOne(
            { _id: userId },
            { $set: { password: lock } }
          );
          if (passUpdate) {
            return res.json({
              status: true,
              Message: "Password changed successfully",
            });
          } else {
            return res.json({
              status: false,
              Message: "Something went wrong, Please try again alter;",
            });
          }
        } else {
          return res.json({ status: false, Message: "Old password is wrong" });
        }
      } else {
        return res.json({
          status: false,
          Message: "Password and confirm password are not same !",
        });
      }
    } else {
      return res.json({ status: false, Message: "Oops!, Enter all fields" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Oops!, Something went wrong" });
  }
});

router.post("/forgotemailotp", async (req, res) => {
  try {
    var email = req.body.email;
    var findemail = common.encrypt(email);
    adminDB.findOne({ email: findemail }).exec(async function (err, responce) {
      if (responce !== null) {
        var fou_digit = Math.floor(1000 + Math.random() * 9000);
        let u = await adminDB
          .updateOne(
            { _id: responce._id },
            {
              $set: {
                forgotEmailotp: fou_digit,
                forgotPass: 1
              }
            },
            { upsert: true }
          );
        let resData = await mailtempDB.findOne({ key: "OTP" });
        if (resData) {
          // var reciver = req.body.email;
          var reciver = process.env.ADMIN_EMAIL;
          var etempdataDynamic = resData.body
            .replace(/###OTP###/g, fou_digit)
            .replace(/###USERNAME###/g, email);

          var mailRes = await mail.sendMail(
            {
              from: {
                name: process.env.FROM_NAME,
                address: process.env.FROM_EMAIL,
              },
              to: reciver,
              subject: resData.Subject,
              html: etempdataDynamic,
            });
          if (mailRes != null) {
            res.json({
              status: true,
              Message:
                "Email verified, OTP sent to your email",
              email: email,
              emailOtp: fou_digit,
            });
            usersDB
              .updateOne(
                { _id: responce._id },
                { $set: { expireEmail: 0 } }
              )
              .exec((err, data) => { });
          } else {
            return res.json({
              Message: "Email not verified, please try later",
            });
          }
        } else {
          return res.json({
            status: false,
            Message: "Please try again later",
          });
        }
      } else {
        res.status(400).json({ status: false, Message: "Email id not found" });
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, Message: "Internal server", error: err.message });
  }
});

router.post("/forgototpverify", async (req, res) => {
  try {
    var email = common.encrypt(req.body.email);
    let findUser = await adminDB.findOne({ email: email });
    if (findUser) {
      // console.log(findUser, "=-=findUser=-");
      if (findUser.forgotEmailotp == req.body.emailOtp) {
        let verifyUser = await adminDB.updateOne(
          { email: email },
          { $set: { status: "active" } }
        );
        if (verifyUser.ok == 1) {
          return res.json({
            status: true,
            Message: "OTP verified successfully, Reset you password.",
          });
        } else {
          return res.json({
            status: false,
            Message: "OTP not verified, Please try again later.",
          });
        }
      } else {
        return res.json({
          status: false,
          Message: "OTP not verified, Please try again later.",
        });
      }
    } else {
      return res.json({ status: false, Message: "User not found" });
    }
  } catch (e) {
    //console.log(("error from OTP", e);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post('/forgotpassword', async (req, res) => {
  try {
    if (req.body.password && req.body.confimPassword && req.body.email) {
      if (req.body.password == req.body.confimPassword) {
        var userMail = common.encrypt(req.body.email);
        let users = await adminDB.findOne({ email: userMail }).exec();
        if (users) {
          if (users.forgotPass == 1) {
            let lock = await bcrypt.hash(req.body.password, saltRounds);
            let updatepass = await adminDB.updateOne(
              { _id: users._id },
              {
                $set: {
                  password: lock,
                  forgotPass: 0,
                },
              }
            );
            if (updatepass) {
              return res.json({
                status: true,
                Message: "Password changed successfully",
              });
            } else {
              return res.json({
                status: false,
                Message: "Please try again later",
              });
            }
          }
        } else {
          return res.json({ status: false, Message: "User not found" });
        }
      } else {
        return res.json({
          status: false,
          Message: "Password and confirm password are not same !",
        });
      }
    } else {
      return res.json({ status: false, Message: "Oops!, Enter all fields" });
    }
  } catch (error) {
    return res.json({ status: false, Message: "Oops!, Something went wrong" });
  }
});

router.post("/resendemailotp", async (req, res) => {
  try {
    var email = req.body.email;
    var findemail = common.encrypt(email);

    adminDB.findOne({ email: findemail }).exec(async function (err, response) {
      if (response !== null) {
        var fou_digit = Math.floor(1000 + Math.random() * 9000);

        await adminDB.updateOne(
          { _id: response._id },
          {
            $set: {
              forgotEmailotp: fou_digit,
              forgotPass: 1,
            },
          },
          { upsert: true }
        );

        let resData = await mailtempDB.findOne({ key: "OTP" });
        if (resData) {
          var reciver = process.env.ADMIN_EMAIL;
          var etempdataDynamic = resData.body
            .replace(/###OTP###/g, fou_digit)
            .replace(/###USERNAME###/g, email);

          var mailRes = await mail.sendMail({
            from: {
              name: process.env.FROM_NAME,
              address: process.env.FROM_EMAIL,
            },
            to: reciver,
            subject: resData.Subject,
            html: etempdataDynamic,
          });

          if (mailRes != null) {
            res.json({
              status: true,
              Message: "A new OTP has been sent to your email."
            });
          } else {
            return res.json({
              status: false,
              Message: "Failed to send OTP. Please try again later.",
            });
          }
        } else {
          return res.json({
            status: false,
            Message: "Email template not found. Please try again later.",
          });
        }
      } else {
        res.status(400).json({ status: false, Message: "Email id not found" });
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, Message: "Internal server error", error: err.message });
  }
});

router.get("/get-reward", common.tokenmiddleware, async (req, res) => {
  try {
    const rewardSettings = await RewardSettingsDB.findOne(); // Get the reward settings from the database

    if (!rewardSettings) {
      return res.status(200).json({
        status: false,
        message: "No reward settings found",
      });
    }

    res.status(200).json({
      status: true,
      data: rewardSettings, // Return the retrieved reward settings
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Something went wrong, please try again",
    });
  }
});

router.post("/reward-settings", common.tokenmiddleware, async (req, res) => {
  try {
    const {
      kycStatus,
      kycCurrency,
      kycAmount,
      depositStatus,
      depositCurrency,
      depositAmount,
      minDeposit,
      tradeStatus,
      tradeCurrency,
      tradeAmount
    } = req.body;

    // Check if the reward settings exist in the DB
    const existingReward = await RewardSettingsDB.findOne();

    if (existingReward) {
      // If found, update the existing record
      existingReward.kycStatus = Number(kycStatus);
      existingReward.kycCurrency = Number(kycStatus) == 0 ? "" : kycCurrency;
      existingReward.kycAmount = Number(kycStatus) == 0 ? "" : kycAmount;
      existingReward.depositStatus = Number(depositStatus);
      existingReward.depositCurrency = Number(depositStatus) == 0 ? "" : depositCurrency;
      existingReward.depositAmount = Number(depositStatus) == 0 ? "" : depositAmount;
      existingReward.minDeposit = Number(depositStatus) == 0 ? "" : minDeposit;
      existingReward.tradeStatus = Number(tradeStatus);
      existingReward.tradeCurrency = Number(tradeStatus) == 0 ? "" : tradeCurrency;
      existingReward.tradeAmount = Number(tradeStatus) == 0 ? "" : tradeAmount;

      await existingReward.save();

      redisCache.updateRedisPairs(() => { });

      res.status(200).json({
        status: true,
        message: "Reward settings updated successfully",
      });
    } else {
      // If not found, create a new record
      const newReward = new RewardSettingsDB({
        kycStatus,
        kycCurrency,
        kycAmount,
        depositStatus,
        depositCurrency,
        depositAmount,
        minDeposit,
        tradeStatus,
        tradeCurrency,
        tradeAmount,
      });

      await newReward.save();

      redisCache.updateRedisPairs(() => { });

      res.status(200).json({
        status: true,
        message: "Reward settings created successfully",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Something went wrong, please try again",
    });
  }
});



router.post("/referral-reward-settings", common.tokenmiddleware, async (req, res) => {
  try {
    const {
      referralStatus,
      referralCurrency,
      referralAmount
    } = req.body;

    // Check if the reward settings exist in the DB
    const existingReward = await RewardSettingsDB.findOne();

    if (existingReward) {
      // If found, update the existing record
      existingReward.referralStatus = Number(referralStatus);
      existingReward.referralCurrency = Number(referralStatus) == 0 ? "" : referralCurrency;
      existingReward.referralAmount = Number(referralStatus) == 0 ? "" : referralAmount;

      await existingReward.save();

      redisCache.updateRedisPairs(() => { });

      res.status(200).json({
        status: true,
        message: "Referral settings updated successfully",
      });
    } else {
      // If not found, create a new record
      const newReward = new RewardSettingsDB({
        referralStatus,
        referralCurrency,
        referralAmount,
      });

      await newReward.save();

      redisCache.updateRedisPairs(() => { });

      res.status(200).json({
        status: true,
        message: "Referral settings created successfully",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Something went wrong, please try again",
    });
  }
});

router.get("/get-airdrop", common.tokenmiddleware, async (req, res) => {
  try {
    const airdropSetting = await AirdropSettingsDB.findOne(); // Get the reward settings from the database

    if (!airdropSetting) {
      return res.status(200).json({
        status: false,
        message: "No airdrop settings found",
      });
    }

    res.status(200).json({
      status: true,
      data: airdropSetting, // Return the retrieved reward settings
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Something went wrong, please try again",
    });
  }
});

router.post("/airdrop-settings", common.tokenmiddleware, async (req, res) => {
  try {
    // console.log(req.body,"---req.body---");
    const {
      dropTime,
      dropStart,
      dropEnd,
      dropDate,
      firstthreeToken,
      fourfiveToken,
      sixtotenToken,
      aftertenToken,
      status
    } = req.body;

    const timeFormat = /^(1[0-2]|0?[1-9])(AM|PM)$/;  // Matches "1am", "12pm", "9am", etc.
    if (!timeFormat.test(dropStart)) {
      return res.status(400).json({
        status: false,
        message: "Invalid dropTime format. Please use 'AM' or 'PM' (e.g., 3am, 4pm)."
      });
    }

    // Check if the reward settings exist in the DB
    const existingReward = await AirdropSettingsDB.findOne();

    if (existingReward) {
      // If found, update the existing record
      existingReward.dropTime = Number(dropTime);
      existingReward.dropStart = dropStart;
      existingReward.dropEnd = Number(dropEnd);
      existingReward.dropDate = dropDate;
      existingReward.firstthreeToken = Number(firstthreeToken);
      existingReward.fourfiveToken = Number(fourfiveToken);
      existingReward.sixtotenToken = Number(sixtotenToken);
      existingReward.aftertenToken = Number(aftertenToken);
      existingReward.status = Number(status)

      await existingReward.save();

      redisCache.updateRedisPairs(() => { });

      res.status(200).json({
        status: true,
        message: "Airdrop settings updated successfully",
      });
    } else {
      // If not found, create a new record
      const newReward = new AirdropSettingsDB({
        dropTime,
        dropStart,
        dropEnd,
        dropDate,
        firstthreeToken,
        fourfiveToken,
        sixtotenToken,
        aftertenToken,
        status
      });

      await newReward.save();

      redisCache.updateRedisPairs(() => { });

      res.status(200).json({
        status: true,
        message: "Airdrop settings created successfully",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Something went wrong, please try again",
    });
  }
});

//user trade ------------>

router.post("/getActiveOrders", common.tokenmiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 5; // Default to 5 items per page if not provided
    const skip = (page - 1) * limit;

    // Perform aggregation with pagination
    const orders = await orderDB.aggregate([
      {
        $match: {
          status: { $in: ["Active", "Partially"] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userdata",
        },
      },
      {
        $unwind: {
          path: "$userdata",
        },
      },
      {
        $sort: { createddate: -1 },
      },
      {
        $project: {
          _id: 1,
          pairName: 1,
          ordertype: 1,
          tradeType: 1,
          amount: 1,
          price: 1,
          total: 1,
          createddate: 1,
          orderId: 1,
          username: "$userdata.displayname",
        },
      },
      { $skip: skip },   // Skip documents based on the current page
      { $limit: limit }, // Limit documents per page
    ]);

    // Count total documents that match the filter criteria for totalPages calculation
    const totalCount = await orderDB.countDocuments({ status: { $in: ["Active", "Partially"] } });
    const totalPages = Math.ceil(totalCount / limit);

    // Format response data
    const activeOrders = orders.map(order => ({
      createddate: moment(order.createddate).format("lll"),
      pairName: order.pairName,
      ordertype: order.ordertype,
      tradeType: order.tradeType,
      amount: parseFloat(order.amount).toFixed(8),
      price: parseFloat(order.price).toFixed(8),
      total: parseFloat(order.total).toFixed(8),
      orderId: order.orderId,
      username: order.username,
      _id: order._id,
    }));

    res.json({
      status: true,
      data: activeOrders,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (e) {
    res.json({ status: false, message: e.message });
  }
});

router.post("/getCancelOrders", common.tokenmiddleware, async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.body.limit) || 5; // Default to 5 items per page if not provided
    const skip = (page - 1) * limit;

    // Perform aggregation with pagination
    const orders = await orderDB.aggregate([
      {
        $match: {
          status: "cancelled",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userdata",
        },
      },
      {
        $unwind: {
          path: "$userdata",
        },
      },
      {
        $sort: { createddate: -1 },
      },
      {
        $project: {
          pairName: 1,
          ordertype: 1,
          tradeType: 1,
          amount: 1,
          price: 1,
          total: 1,
          createddate: 1,
          orderId: 1,
          username: "$userdata.displayname",
        },
      },
      { $skip: skip },   // Skip documents based on the current page
      { $limit: limit }, // Limit documents per page
    ]);

    // Count total documents that match the filter criteria for totalPages calculation
    const totalCount = await orderDB.countDocuments({ status: "cancelled" });
    const totalPages = Math.ceil(totalCount / limit);

    // Format response data
    const cancelOrders = orders.map(order => ({
      createddate: moment(order.createddate).format("lll"),
      pairName: order.pairName,
      ordertype: order.ordertype,
      tradeType: order.tradeType,
      amount: parseFloat(order.amount).toFixed(8),
      price: parseFloat(order.price).toFixed(8),
      total: parseFloat(order.total).toFixed(8),
      orderId: order.orderId,
      username: order.username,
    }));

    res.json({
      status: true,
      result: cancelOrders,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (e) {
    res.json({ status: false, message: e.message });
  }
});

router.post("/getTradeHistory", common.tokenmiddleware, async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.body.limit) || 5; // Default to 5 items per page if not provided
    const skip = (page - 1) * limit;

    // Perform aggregation with pagination
    const tradehistory = await orderConfirmDB.aggregate([
      {
        $lookup: {
          from: "users",
          let: {
            buyer: "$buyerUserId",
            seller: "$sellerUserId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$buyer"] },
                    { $eq: ["$_id", "$$seller"] },
                  ],
                },
              },
            },
          ],
          as: "buyer_seller_name",
        },
      },
      {
        $addFields: {
          buyer: {
            $filter: {
              input: "$buyer_seller_name",
              as: "row",
              cond: { $eq: ["$$row._id", "$buyerUserId"] },
            },
          },
          seller: {
            $filter: {
              input: "$buyer_seller_name",
              as: "row",
              cond: { $eq: ["$$row._id", "$sellerUserId"] },
            },
          },
        },
      },
      {
        $project: {
          sellorderId: 1,
          sellerUserId: 1,
          type: 1,
          askAmount: 1,
          askPrice: 1,
          liquid_spread: 1,
          firstCurrency: 1,
          secondCurrency: 1,
          filledAmount: 1,
          marginAmount: 1,
          buyorderId: 1,
          buyerUserId: 1,
          total: 1,
          buy_fee: 1,
          sell_fee: 1,
          pair: 1,
          cancel_id: 1,
          cancel_order: 1,
          position: 1,
          lendIntrest: 1,
          datetime: 1,
          created_at: 1,
          orderId: 1,
          buyer: "$buyer",
          seller: "$seller",
          buyername: {
            $cond: {
              if: { $gt: [{ $size: "$buyer" }, 0] },
              then: { $arrayElemAt: ["$buyer.displayname", 0] },
              else: "",
            },
          },
          sellername: {
            $cond: {
              if: { $gt: [{ $size: "$seller" }, 0] },
              then: { $arrayElemAt: ["$seller.displayname", 0] },
              else: "",
            },
          },
        },
      },
      { $sort: { created_at: -1 } },
      { $skip: skip },   // Skip documents for pagination
      { $limit: limit }, // Limit documents per page
    ]);

    // Count total documents for pagination calculation
    const totalCount = await orderConfirmDB.countDocuments({});
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      status: true,
      data: tradehistory,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (e) {
    res.json({ status: false, message: e.message });
  }
});

// router.post("/get_all_user_swap", common.tokenmiddleware, async (req, res) => {
//   try {
//     const { page = 1, limit = 5, filterKeyword = "" } = req.body;
//     const skip = (page - 1) * limit;

//     // Define the match query based on the presence of filterKeyword
//     let matchQuery = { status: 1 };
//     if (filterKeyword) {
//       matchQuery["user.displayname"] = { $regex: filterKeyword, $options: "i" }; // Case-insensitive search on displayname
//     }

//     // Calculate the total count of documents matching the filter
//     const totalCount = await swapDB.aggregate([
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       { $match: matchQuery },
//       { $count: "totalCount" }
//     ]);

//     // Aggregate swap data with pagination and user details
//     swapDB.aggregate([
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       { $unwind: "$user" },
//       { $match: matchQuery }, // Apply the filter query here
//       {
//         $project: {
//           amount: "$amount",
//           totalAmount: "$totalAmount",
//           fromCurrency: "$fromCurrency",
//           toCurrency: "$toCurrency",
//           fee: "$fee",
//           price: "$price",
//           type: "$type",
//           date: "$createdDate",
//           username: "$user.displayname",
//         },
//       },
//       { $sort: { _id: -1 } },
//       { $skip: skip },
//       { $limit: limit },
//     ])
//     .exec((err, swaps) => {
//       console.log(swaps,"--=-=-=swaps-=-=-=");
//       if (swaps && !err) {
//         const userSwaps = swaps.map((swap) => ({
//           username: swap.username,
//           amount: swap.amount,
//           totalAmount: swap.totalAmount,
//           date: swap.date,
//           swapFrom: swap.fromCurrency,
//           swapTo: swap.toCurrency,
//           fee: swap.fee,
//           price: swap.price,
//           type: swap.type,
//           date: swap.date,
//         }));

//         const totalRecords = totalCount.length ? totalCount[0].totalCount : 0;
//         const totalPages = Math.ceil(totalRecords / limit);

//         return res.status(200).json({
//           status: true,
//           data: userSwaps,
//           totalCount: totalRecords,
//           totalPages: totalPages,
//           currentPage: page,
//         });
//       } else {
//         return res.status(500).json({
//           status: false,
//           data: [],
//           message: "Something went wrong",
//         });
//       }
//     });
//   } catch (e) {
//     console.log("get_all_user_swap catch", e);
//     return res.status(500).json({
//       status: false,
//       data: [],
//       message: "Something went wrong",
//     });
//   }
// });

router.post("/get_all_user_swap", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, filterKeyword = "" } = req.body;
    const skip = (page - 1) * limit;

    // Define the match query with status filter and optional displayname filter
    let matchQuery = {};
    if (filterKeyword) {
      matchQuery["user.displayname"] = { $regex: filterKeyword, $options: "i" }; // Case-insensitive filter
    }

    const swapAllExam = await swapDB.find({});

    // Calculate total count with aggregation
    const totalCountResult = await swapDB.aggregate([
      {
        $lookup: {
          from: "users", // 'users' collection to fetch related user data
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $match: matchQuery },
      { $count: "totalCount" }
    ]);

    const totalCount = totalCountResult.length ? totalCountResult[0].totalCount : 0;

    // Get swap data with pagination and user details
    const swaps = await swapDB.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: matchQuery }, // Apply match filter
      {
        $project: {
          amount: 1,
          totalAmount: 1,
          fromCurrency: 1,
          toCurrency: 1,
          fee: 1,
          price: 1,
          type: 1,
          date: "$createdDate",
          username: "$user.displayname",
        },
      },
      { $sort: { _id: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Map the results to the desired output structure
    const userSwaps = swaps.map((swap) => ({
      username: swap.username,
      amount: swap.amount,
      totalAmount: swap.totalAmount,
      date: swap.date,
      swapFrom: swap.fromCurrency,
      swapTo: swap.toCurrency,
      fee: swap.fee,
      price: swap.price,
      type: swap.type,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      status: true,
      data: userSwaps,
      totalCount: totalCount,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (e) {
    console.error("Error in get_all_user_swap:", e);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.post("/getprofit", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.body; // Default values for page and limit
    const skip = (page - 1) * limit;

    // console.log(skip,"---skip---limit---",limit);
    profitDB
      .aggregate([
        {
          $lookup: {
            from: "currency",
            localField: "currencyid",
            foreignField: "_id",
            as: "currency",
          },
        },
        { $unwind: "$currency" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "userdata",
          },
        },
        { $unwind: "$userdata" },
        {
          $project: {
            currencyname: "$currency.currencyName",
            currency_id: "$currency._id",
            image: "$currency.Currency_image",
            email: "$userdata.email",
            currencySymbol: "$currency.currencySymbol",
            orderid: "$orderid",
            type: "$type",
            date: "$date",
            fees: "$fees",
            fullfees: "$fullfees",
            liquidity: "$liquidity",
          },
        },
      ])
      .sort({ _id: -1 })
      .skip(skip)  // Apply pagination skip
      .limit(limit)  // Apply pagination limit
      .exec((err, getProfitData) => {
        // console.log(getProfitData,"--getProfitData---");
        if (err) {
          return res.json({
            status: false,
            Message: "Something went wrong, Please try again",
            data: [],
          });
        } else {
          profitDB.countDocuments({}, (err, count) => {
            if (err) {
              return res.json({
                status: false,
                Message: "Failed to count documents",
                data: [],
              });
            }
            const profitArray = getProfitData.map((data) => ({
              currencyname: data.currencyname,
              currency_id: data.currency_id,
              image: data.image,
              email: common.decrypt(data.email),
              currency: data.currencySymbol,
              orderid: data.orderid,
              type: data.type,
              date: data.date,
              fees: data.fees,
              fullfees: data.fullfees,
              liquidity: data.liquidity,
              profit_amount: +data.fees,
            }));

            const totalPages = Math.ceil(count / limit);

            return res.json({
              status: true,
              Message: "Success",
              value: profitArray,
              totalPages: totalPages,
              currentPage: page,
              totalRecords: count,
            });
          });
        }
      });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/getTransferHistory", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, filterKeyword = "" } = req.body;
    const skip = (page - 1) * limit;

    // Define the match query with optional filterKeyword for displayname
    let matchQuery = {};
    if (filterKeyword) {
      matchQuery["user.displayname"] = { $regex: filterKeyword, $options: "i" }; // Case-insensitive filter
    }

    // Step 1: Count total records with the filter applied
    const totalCountResult = await transferDb.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $match: matchQuery },
      { $count: "totalCount" }
    ]);

    const totalCount = totalCountResult.length ? totalCountResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Step 2: Fetch paginated transfer data with user details
    const transfers = await transferDb.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: matchQuery }, // Apply match filter
      {
        $project: {
          amount: 1,
          currency: 1,
          fromWallet: 1,
          toWallet: 1,
          createdDate: 1,
          username: "$user.displayname", // Extract displayname from user
        },
      },
      { $sort: { _id: -1 } }, // Sort by most recent
      { $skip: skip }, // Apply pagination skip
      { $limit: limit }, // Apply pagination limit
    ]);

    // Step 3: Map the results to the desired output structure
    const userTransfers = transfers.map((transfer) => ({
      username: transfer.username,
      amount: transfer.amount,
      currency: transfer.currency,
      fromWallet: transfer.fromWallet,
      toWallet: transfer.toWallet,
      createdDate: transfer.createdDate,
    }));

    // Step 4: Send the response with pagination details
    return res.status(200).json({
      status: true,
      data: userTransfers,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (e) {
    // console.error("Error in getTransferHistory:", e);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.post("/getP2POrdersHistory", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, filterKeyword = "" } = req.body;
    const skip = (page - 1) * limit;

    // Match query to filter based on email if filterKeyword is provided
    let matchQuery = {};
    if (filterKeyword) {
      matchQuery.orderId = { $regex: filterKeyword, $options: "i" }; // Case-insensitive search on email
    }

    // Step 1: Count the total documents with the filter applied
    const totalCountResult = await P2PordersDB.aggregate([
      { $match: matchQuery },
      { $count: "totalCount" }
    ]);

    const totalCount = totalCountResult.length ? totalCountResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Step 2: Fetch paginated P2P orders data
    const p2pOrders = await P2PordersDB.aggregate([
      { $match: matchQuery },
      {
        $project: {
          email: 1,
          totalAmount: 1,
          price: 1,
          firstCurrency: 1,
          secondCurrnecy: 1,
          orderType: 1,
          fromLimit: 1,
          toLimit: 1,
          orderId: 1,
          order_status: 1,
          available_qty: 1,
          createdAt: 1,
        }
      },
      { $sort: { _id: -1 } }, // Sort by most recent
      { $skip: skip }, // Apply pagination skip
      { $limit: limit } // Apply pagination limit
    ]);

    // console.log(p2pOrders,"-=-=-p2pOrders=-=-");

    // Step 3: Map the results to the desired output structure
    const userOrders = p2pOrders.map((order) => ({
      email: order.email,
      totalAmount: order.totalAmount,
      price: order.price,
      fromCurrency: order.firstCurrency,
      toCurrency: order.secondCurrnecy,
      orderType: order.orderType,
      orderId: order.orderId,
      fromLimit: order.fromLimit,
      toLimit: order.toLimit,
      order_status: order.order_status,
      available_qty: order.available_qty,
      createdAt: order.createdAt,
    }));

    // Step 4: Send the response with pagination details
    return res.status(200).json({
      status: true,
      data: userOrders,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (e) {
    // console.error("Error in getP2POrdersHistory:", e);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.post("/getP2PConfirmOrdersHistory", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, filterKeyword = "" } = req.body;
    const skip = (page - 1) * limit;

    // Filter query to match orderId if filterKeyword is provided
    let filterQuery = {};
    if (filterKeyword) {
      filterQuery.map_orderId = { $regex: filterKeyword, $options: "i" }; // Case-insensitive search
    }

    // Step 1: Count the total documents matching the filter
    const totalCountResult = await p2pConfirmOrderModel.aggregate([
      { $match: filterQuery },
      { $count: "totalCount" }
    ]);

    const totalCount = totalCountResult.length ? totalCountResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Step 2: Fetch paginated data from P2PconfirmOrdersDB
    const confirmedOrders = await p2pConfirmOrderModel.aggregate([
      { $match: filterQuery },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "fromUserData"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "map_userId",
          foreignField: "_id",
          as: "toUserData"
        }
      },
      { $unwind: { path: "$fromUserData", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$toUserData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          map_orderId: 1,
          fromCurrency: 1,
          toCurrency: 1,
          askAmount: 1,
          askPrice: 1,
          type: 1,
          paymentMethod: 1,
          filledAmount: 1,
          status: 1,
          dispute_status: 1,
          datetime: 1,
          paytime: 1,
          fromUser: "$fromUserData.email",
          toUser: "$toUserData.email"
        }
      },
      { $sort: { datetime: -1 } }, // Sort by most recent
      { $skip: skip }, // Pagination skip
      { $limit: limit } // Pagination limit
    ]);

    // console.log(confirmedOrders,"--=-=confirmedOrders=-=-");

    const userConfirmOrders = confirmedOrders.map((order) => ({
      orderId: order.map_orderId,
      fromUser: common.decrypt(order.fromUser),
      toUser: common.decrypt(order.toUser),
      price: order.askPrice,
      amount: order.askAmount,
      type: order.type,
      paymentType: order.paymentMethod,
      createdDate: order.datetime,
    }));

    // console.log(userConfirmOrders,"--=-=userConfirmOrders=-=-");

    // Step 3: Format the response and send it back to the frontend
    return res.status(200).json({
      status: true,
      data: userConfirmOrders,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (e) {
    // console.error("Error in getP2PConfirmOrdersHistory:", e);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.post("/getP2PDisputeHistory", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, filterKeyword = "" } = req.body;
    const skip = (page - 1) * limit;

    // Filter query for orderId based on filterKeyword
    let filterQuery = {};
    if (filterKeyword) {
      filterQuery.orderId = { $regex: filterKeyword, $options: "i" }; // Case-insensitive regex
    }

    // Step 1: Count the total documents matching the filter
    const totalCountResult = await p2pDisputeModel.aggregate([
      { $match: filterQuery },
      { $count: "totalCount" }
    ]);

    const totalCount = totalCountResult.length ? totalCountResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Step 2: Fetch paginated data from P2PdisputeDB with optional filtering
    const disputes = await p2pDisputeModel.aggregate([
      { $match: filterQuery },
      { $sort: { createdAt: -1 } }, // Sort by creation date, newest first
      { $skip: skip },
      { $limit: limit },

      // Lookup to fetch user data (optional, if you want to include user information)
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData"
        }
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          orderId: 1,
          p2p_orderId: 1,
          type: 1,
          query: 1,
          attachment: 1,
          status: 1,
          createdAt: 1,
          username: "$userData.displayname"// Include display name from user data
        }
      }
    ]);

    // Step 3: Format the response and send it back to the frontend
    return res.status(200).json({
      status: true,
      data: disputes,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    // console.error("Error in getP2PDisputeHistory:", error);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.post("/getDisputeDetail", common.tokenmiddleware, async (req, res) => {
  try {
    // Get _id from request payload
    const { _id } = req.body;

    // Step 1: Find the dispute record in P2PDisputeModel by _id
    const disputeRecord = await p2pDisputeModel.findOne({ _id: _id });
    if (!disputeRecord) {
      return res.status(404).json({ status: false, message: 'Dispute not found' });
    }

    // Step 2: Retrieve the p2p_orderId from the found dispute record
    const { p2p_orderId } = disputeRecord;

    // Step 3: Use p2p_orderId to find the related order in P2POrdersDB
    const orderRecord = await P2PordersDB.findOne({ orderId: p2p_orderId });
    if (!orderRecord) {
      return res.status(404).json({ status: false, message: 'Order not found' });
    }



    const p2porderRecord = await p2pConfirmOrderModel.findOne({ orderId: disputeRecord.orderId }).sort({ _id: -1 });

    if (!orderRecord) {
      return res.status(404).json({ status: false, message: 'Order not found' });
    }

    // Step 4: Combine data from both models
    const responseData = {
      disputeDetails: disputeRecord,
      orderDetails: orderRecord,
      p2porderRecord: p2porderRecord
    };

    // Step 5: Send combined data in the response
    res.status(200).json({ status: true, data: responseData });
  } catch (error) {
    // console.error('Error fetching dispute details:', error);
    res.status(500).json({ status: false, message: 'Server Error' });
  }
});

router.post("/changefreezedispute", common.tokenmiddleware, async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    // console.log(userId1,"userId1----userId2",userId2)
    await usersDB.updateMany(
      { _id: { $in: [userId1, userId2] } },
      { $set: { disputeStatus: 0 } }
    );
    res.status(200).json({ status: true, message: 'Users frozen successfully' });
  } catch (e) {
    // console.error("Error in :", e);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});


router.post("/get_dispute_chat", common.tokenmiddleware, async (req, res) => {

  try {
    const { p2porderId } = req.body;

    console.log("Received p2porderId:", p2porderId);

    const disputeData = await p2pDisputeModel.findOne({ _id: p2porderId }).exec();
    if (!disputeData) {
      return res.status(404).json({ status: false, message: "Dispute not found" });
    }

    const p2pOrder = await p2pConfirmOrderModel.findOne({ orderId: disputeData.orderId }).exec();
    if (!p2pOrder) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    // Get user who initiated the dispute
    const fromUser = await usersDB.findOne(
      { _id: ObjectId(disputeData.userId) },
      { displayname: 1 }
    ).exec();




    if (!fromUser) {
      return res.status(404).json({ status: false, message: "From user not found" });
    }

    // Get the other party
    // let toUserId = (disputeData.userId !== p2pOrder.map_userId.toString())
    //   ? p2pOrder.userId
    //   : p2pOrder.map_userId;

    var toUser = "";
    if (disputeData.userId == p2pOrder.map_userId.toString()) {
      toUser = await usersDB
        .findOne({ _id: p2pOrder.userId }, { displayname: 1 })
        .exec();
    } else {
      toUser = await usersDB
        .findOne({ _id: p2pOrder.map_userId }, { displayname: 1 })
        .exec();
    }

    // const toUser = await usersDB.findOne(
    //   { _id: ObjectId(toUserId) },
    //   { displayname: 1 }
    // ).exec();

    // Get chats
    const allChats = await p2pDisputeChatDB.find({ p2porderId: p2pOrder._id }).exec();

    const fromChat = allChats.filter(chat => chat.userId.toString() === fromUser._id.toString());
    const toChat = allChats.filter(chat => chat.userId.toString() === toUser._id.toString());

    const result = {
      from_user: fromUser,
      to_user: toUser,
      from_chat: fromChat,
      to_chat: toChat,
    };

    return res.status(200).json({ status: true, message: result });

  } catch (e) {
    console.log("Error in get_dispute_chat:", e);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.post("/p2p_chat", common.tokenmiddleware, async (req, res) => {
  try {
    const { type, message, file, orderId, p2porderId, toUserId } = req.body;
    const userId = req.userId;
    const timestamp = Date.now();

    // Validate required fields
    if (!type || !orderId || !p2porderId) {
      return res.json({ status: false, Message: "Please provide all required fields" });
    }

    // Validate that at least a message or file is sent
    if (!message && !file) {
      return res.json({ status: false, Message: "Please send a message or file" });
    }

    const p2pOrder = await p2pConfirmOrderModel.findOne({ orderId });
    if (!p2pOrder) {
      return res.json({ status: false, Message: "Order not found" });
    }

    // If Admin is sending a message
    if (type === "admin") {
      const adminDetail = await adminDB.findOne({ _id: userId }, { name: 1 });
      if (!adminDetail) {
        return res.json({ status: false, Message: "Admin not found" });
      }

      const chatData = {
        admin_name: adminDetail.name,
        admin_msg: message,
        admin_file: file || "",
        admin_date: timestamp,
        type: "admin",
        p2porderId,
        orderId,
        userId: toUserId,
      };

      await p2pDisputeChatDB.create(chatData);

      common.sendResponseSocket("success", chatData, "p2pchat", toUserId, () => { });

      const attachmentMsg = file ? " & sent an attachment" : "";
      const notificationObj = {
        from_user_id: userId,
        to_user_id: toUserId,
        p2porderId,
        from_user_name: "Admin",
        to_user_name: "Admin",
        status: 0,
        type: "p2p",
        message: `Admin has sent ${message}${attachmentMsg}`,
        link: `/p2p/dispute/${orderId}`,
      };

      await notifyDB.create(notificationObj);
      common.sendResponseSocket("success", notificationObj.message, "notify", toUserId, () => { });

      return res.json({ status: true, Message: "Message sent by admin" });
    }

    // If User is sending a message
    const userDetail = await usersDB.findOne({ _id: userId }, { displayname: 1 });
    if (!userDetail) {
      return res.json({ status: false, Message: "User not found" });
    }

    const chatData = {
      p2porderId,
      orderId,
      type,
      user_date: timestamp,
      user_name: userDetail.displayname,
      user_msg: message,
      user_file: file || "",
      userId,
    };

    await p2pDisputeChatDB.create(chatData);

    const adminDetail = await adminDB.findOne({});
    if (adminDetail) {
      const adminUserId = adminDetail._id;
      common.sendResponseSocket("success", chatData, "p2pchat", adminUserId, () => { });
    }

    return res.json({ status: true, Message: "Message sent successfully" });

  } catch (error) {
    console.log("Error in /p2p_chat:", error);
    return res.status(500).json({ success: false, Message: "Something went wrong" });
  }
});




// router.post("/get_dispute_chat", common.tokenmiddleware, async (req, res) => {
//   try {
//     const { p2porderId } = req.body;

//     // console.log("p2porderId", p2porderId);

//     // const getChat = await p2pDisputeChatDB.find({ p2porderId }).exec();

//     // res.status(200).json({ status: true, message: getChat });
//   } catch (e) {
//     return res.status(500).json({
//       status: false,
//       data: [],
//       message: "Something went wrong",
//     });
//   }
// });


router.post("/changeActivedispute", common.tokenmiddleware, async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    await usersDB.updateMany(
      { _id: { $in: [userId1, userId2] } },
      { $set: { disputeStatus: 1 } }
    );
    res.status(200).json({ status: true, message: 'Users activated successfully' });
  } catch (e) {
    // console.error("Error in :", e);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

// router.post("/getProfitDetails", common.tokenmiddleware, async (req, res) => {
//   try {
//     const { page = 1, limit = 5 } = req.body; // Default values for page and limit
//     const skip = (page - 1) * limit;
//     const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate(); // get timestamp for 24 hours ago

//     // Aggregate total fees per currency symbol
//     const totalFeesByCurrency = await profitDB.aggregate([
//       {
//         $lookup: {
//           from: "currency",
//           localField: "currencyid",
//           foreignField: "_id",
//           as: "currency",
//         },
//       },
//       { $unwind: "$currency" },
//       {
//         $group: {
//           _id: "$currency.currencySymbol",
//           totalFees: { $sum: "$fees" },
//         },
//       },
//       {
//         $project: {
//           currencySymbol: "$_id",
//           totalFees: 1,
//           _id: 0,
//         },
//       },
//     ]);

//     // Aggregate today's profit by filtering for records created within the last 24 hours
//     const todayFeesByCurrency = await profitDB.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: twentyFourHoursAgo }, // Filter for last 24 hours
//         },
//       },
//       {
//         $lookup: {
//           from: "currency",
//           localField: "currencyid",
//           foreignField: "_id",
//           as: "currency",
//         },
//       },
//       { $unwind: "$currency" },
//       {
//         $group: {
//           _id: "$currency.currencySymbol",
//           totalFees: { $sum: "$fees" },
//         },
//       },
//       {
//         $project: {
//           currencySymbol: "$_id",
//           totalFees: 1,
//           _id: 0,
//         },
//       },
//     ]);

//     // Fetch currency conversion rates for each currency symbol
//     common.currency_conversion(async (response) => {
//       if (response.status) {
//         const conversionRates = response.message;
//         let totalUSDT = 0;
//         let totalINR = 0;
//         let todayUSDT = 0;
//         let todayINR = 0;

//         // Calculate converted fees in USDT and INR for total fees
//         totalFeesByCurrency.forEach((currency) => {
//           const conversionRate = conversionRates[currency.currencySymbol];
//           if (conversionRate) {
//             const feesInUSDT = currency.totalFees * conversionRate.USDT;
//             const feesInINR = currency.totalFees * conversionRate.INR;
//             totalUSDT += feesInUSDT;
//             totalINR += feesInINR;
//           }
//         });

//         // Calculate converted fees in USDT and INR for today's fees
//         todayFeesByCurrency.forEach((currency) => {
//           const conversionRate = conversionRates[currency.currencySymbol];
//           if (conversionRate) {
//             const feesInUSDT = currency.totalFees * conversionRate.USDT;
//             const feesInINR = currency.totalFees * conversionRate.INR;
//             todayUSDT += feesInUSDT;
//             todayINR += feesInINR;
//           }
//         });

//         console.log(totalUSDT,totalINR,"--totalUSDT-totalINR-todayUSDT-todayINR--",todayUSDT,todayINR);

//         return res.json({
//           status: true,
//           Message: "Success",
//           totalFeesByCurrency,
//           totalFeesInUSDT: totalUSDT,
//           totalFeesInINR: totalINR,
//           todayFeesByCurrency,
//           todayProfitInUSDT: todayUSDT,
//           todayProfitInINR: todayINR,
//         });
//       } else {
//         return res.json({
//           status: false,
//           Message: "Currency conversion failed",
//           data: [],
//         });
//       }
//     });
//   } catch (error) {
//     return res.json({
//       status: false,
//       Message: "Something went wrong, Please try again later",
//     });
//   }
// });

router.post("/getProfitDetails", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, from, to } = req.body; // Default values for pagination, and custom date range from frontend
    const skip = (page - 1) * limit;
    const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate(); // timestamp for last 24 hours

    // Aggregate total fees per currency symbol
    const totalFeesByCurrency = await profitDB.aggregate([
      {
        $lookup: {
          from: "currency",
          localField: "currencyid",
          foreignField: "_id",
          as: "currency",
        },
      },
      { $unwind: "$currency" },
      {
        $group: {
          _id: "$currency.currencySymbol",
          totalFees: { $sum: "$fees" },
        },
      },
      {
        $project: {
          currencySymbol: "$_id",
          totalFees: 1,
          _id: 0,
        },
      },
    ]);

    // Aggregate today's profit by filtering for records created within the last 24 hours
    const todayFeesByCurrency = await profitDB.aggregate([
      {
        $match: {
          date: { $gte: twentyFourHoursAgo }, // Filter for last 24 hours
        },
      },
      {
        $lookup: {
          from: "currency",
          localField: "currencyid",
          foreignField: "_id",
          as: "currency",
        },
      },
      { $unwind: "$currency" },
      {
        $group: {
          _id: "$currency.currencySymbol",
          totalFees: { $sum: "$fees" },
        },
      },
      {
        $project: {
          currencySymbol: "$_id",
          totalFees: 1,
          _id: 0,
        },
      },
    ]);

    // Filter for custom date range if provided
    let customFeesByCurrency = [];
    if (from || to) {
      const dateFilter = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);

      customFeesByCurrency = await profitDB.aggregate([
        {
          $match: {
            date: dateFilter, // Apply date range filter
          },
        },
        {
          $lookup: {
            from: "currency",
            localField: "currencyid",
            foreignField: "_id",
            as: "currency",
          },
        },
        { $unwind: "$currency" },
        {
          $group: {
            _id: "$currency.currencySymbol",
            totalFees: { $sum: "$fees" },
          },
        },
        {
          $project: {
            currencySymbol: "$_id",
            totalFees: 1,
            _id: 0,
          },
        },
      ]);
    }

    // Fetch currency conversion rates for each currency symbol
    common.currency_conversion(async (response) => {
      if (response.status) {
        const conversionRates = response.message;
        let totalUSDT = 0;
        let totalINR = 0;
        let todayUSDT = 0;
        let todayINR = 0;
        let customUSDT = 0;
        let customINR = 0;

        // Calculate converted fees in USDT and INR for total fees
        totalFeesByCurrency.forEach((currency) => {
          const conversionRate = conversionRates[currency.currencySymbol];
          if (conversionRate) {
            const feesInUSDT = currency.totalFees * conversionRate.USDT;
            const feesInINR = currency.totalFees * conversionRate.INR;
            totalUSDT += feesInUSDT;
            totalINR += feesInINR;
          }
        });

        // Calculate converted fees in USDT and INR for today's fees
        todayFeesByCurrency.forEach((currency) => {
          const conversionRate = conversionRates[currency.currencySymbol];
          if (conversionRate) {
            const feesInUSDT = currency.totalFees * conversionRate.USDT;
            const feesInINR = currency.totalFees * conversionRate.INR;
            todayUSDT += feesInUSDT;
            todayINR += feesInINR;
          }
        });

        // Calculate converted fees in USDT and INR for custom date range
        customFeesByCurrency.forEach((currency) => {
          const conversionRate = conversionRates[currency.currencySymbol];
          if (conversionRate) {
            const feesInUSDT = currency.totalFees * conversionRate.USDT;
            const feesInINR = currency.totalFees * conversionRate.INR;
            customUSDT += feesInUSDT;
            customINR += feesInINR;
          }
        });

        return res.json({
          status: true,
          Message: "Success",
          totalFeesByCurrency,
          totalFeesInUSDT: totalUSDT,
          totalFeesInINR: totalINR,
          todayFeesByCurrency,
          todayProfitInUSDT: todayUSDT,
          todayProfitInINR: todayINR,
          customFeesByCurrency,
          customProfitInUSDT: customUSDT,
          customProfitInINR: customINR,
        });
      } else {
        return res.json({
          status: false,
          Message: "Currency conversion failed",
          data: [],
        });
      }
    });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

router.get("/downloadProfits", common.tokenmiddleware, async (req, res) => {
  try {

    // console.log(skip,"---skip---limit---",limit);
    profitDB
      .aggregate([
        {
          $lookup: {
            from: "currency",
            localField: "currencyid",
            foreignField: "_id",
            as: "currency",
          },
        },
        { $unwind: "$currency" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "userdata",
          },
        },
        { $unwind: "$userdata" },
        {
          $project: {
            currencyname: "$currency.currencyName",
            currency_id: "$currency._id",
            image: "$currency.Currency_image",
            email: "$userdata.email",
            currencySymbol: "$currency.currencySymbol",
            orderid: "$orderid",
            type: "$type",
            date: "$date",
            fees: "$fees",
            fullfees: "$fullfees",
            liquidity: "$liquidity",
          },
        },
      ])
      .sort({ _id: -1 })
      .exec((err, getProfitData) => {
        // console.log(getProfitData,"--getProfitData---");
        if (err) {
          return res.json({
            status: false,
            Message: "Something went wrong, Please try again",
            data: [],
          });
        } else {
          profitDB.countDocuments({}, (err, count) => {
            if (err) {
              return res.json({
                status: false,
                Message: "Failed to count documents",
                data: [],
              });
            }
            const profitArray = getProfitData.map((data) => ({
              currencyname: data.currencyname,
              currency_id: data.currency_id,
              image: data.image,
              email: common.decrypt(data.email),
              currency: data.currencySymbol,
              orderid: data.orderid,
              type: data.type,
              date: moment(data.date).format('lll'),
              fees: data.fees,
              fullfees: data.fullfees,
              liquidity: data.liquidity,
              profit_amount: +data.fees,
            }));

            return res.json({
              status: true,
              Message: "Success",
              value: profitArray,
              totalRecords: count,
            });
          });
        }
      });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

router.get("/create_adminWallet", async (req, res) => {
  let currencyData = await currencyDB
    .find({ status: "Active" })
    .sort({ _id: -1 })
    .exec();
  if (currencyData) {
    var currencyArray = [];
    for (var i = 0; i < currencyData.length; i++) {
      var value = {
        currencyId: currencyData[i]._id,
        currencyName: currencyData[i].currencyName,
        currencySymbol: currencyData[i].currencySymbol,
        amount: 0,
      };
      currencyArray.push(value);
    }
    var wallet_obj = {
      userId: "655465337d45725ea2ca61c3",
      wallets: currencyArray,
      type: 2,
    };

    let wall_data = await adminWalletDB.create(wallet_obj);
    return res.json({ wall_data: wall_data });
  }
});

router.post("/wallet_login", common.isEmpty, async (req, res) => {
  try {
    console.log("req.body wallet_login ---->>>", req.body.password);
    const getMail = process.env.ADMIN_EMAIL;
    const admin_data = await adminDB.findOne({
      email: common.encrypt(getMail),
    });

    if (!admin_data) {
      return res.json({ status: false, Message: "Admin not found" });
    }

    var passCheck = await common.unlock(req.body.password, admin_data.password);
    // console.log(passCheck,"-----passCheck");

    if (passCheck == false) {
      return res.json({ status: false, Message: "Incorrect Password" });
    } else {
      return res.json({
        status: true,
        Message: "Login Successful"
      });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

// router.get("/fund_wallet_list", common.tokenmiddleware, async (req, res) => {
//   try {
//     ////console.log(("req.userId===",req.userId);
//     adminWalletDB
//       .aggregate([
//         {
//           $match: { userId: mongoose.Types.ObjectId(req.userId) },
//         },
//         {
//           $unwind: "$wallets",
//         },
//         {
//           $lookup: {
//             from: "currency",
//             localField: "wallets.currencyId",
//             foreignField: "_id",
//             as: "currdetail",
//           },
//         },

//         {
//           $project: {
//             currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
//             currencysymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
//             currencyImage: { $arrayElemAt: ["$currdetail.Currency_image", 0] },
//             currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
//             depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
//             withdrawStatus: { $arrayElemAt: ["$currdetail.withdrawStatus", 0] },
//             tradeStatus: { $arrayElemAt: ["$currdetail.tradeStatus", 0] },
//             erc20token: { $arrayElemAt: ["$currdetail.erc20token", 0] },
//             trc20token: { $arrayElemAt: ["$currdetail.trc20token", 0] },
//             bep20token: { $arrayElemAt: ["$currdetail.bep20token", 0] },
//             currencyBalance: "$wallets.amount",
//             currencyAddress: "$wallets.address",
//             currid: { $arrayElemAt: ["$currdetail._id", 0] },
//           },
//         },
//       ])
//       .exec(async (err, resData) => {
//         console.log(resData, "resData");
//         if (err) {
//           return res.json({ status: false, Message: err, code: 200 });
//         } else {
//           var dataPush = [];
//           let currency = await currencyDB
//             .find({ depositStatus: "Active", coinType: 1 })
//             .sort({ popularOrder: 1 });
//           if (currency) {
//             for (var i = 0; i < currency.length; i++) {
//               for (var j = 0; j < resData.length; j++) {
//                 if (currency[i].currencySymbol == resData[j].currencysymbol) {
//                   let transformedData = {
//                     _id: resData[j]._id,
//                     currid:resData[j].currid,
//                     currencyName: resData[j].currencyName,
//                     currencysymbol: resData[j].currencysymbol,
//                     currencyImage: resData[j].currencyImage,
//                     currencyType: resData[j].currencyType,
//                     depositStatus: resData[j].depositStatus,
//                     withdrawStatus: resData[j].withdrawStatus,
//                     tradeStatus: resData[j].tradeStatus,
//                     erc20token: resData[j].erc20token,
//                     trc20token: resData[j].trc20token,
//                     bep20token: resData[j].bep20token,
//                     currencyBalance: resData[j].currencyBalance.toFixed(8)
//                     };

//                   dataPush.push(transformedData);
//                 }
//               }
//             }
//           }
//           return res.json({ status: true, data: dataPush, code: 200 });
//         }
//       });
//   } catch (error) {
//     console.log("wallet list catch=====", error.message);
//     return res.json({ status: false, Message: "Internal server", code: 500 });
//   }
// });

router.post("/fund_wallet_list", common.tokenmiddleware, async (req, res) => {
  try {
    const filterKeyword = req.body.keyword?.trim() || ""; // Get the keyword from the request

    // Match pipeline with optional keyword filter
    const matchPipeline = {
      userId: mongoose.Types.ObjectId(req.userId),
    };

    adminWalletDB
      .aggregate([
        {
          $match: matchPipeline,
        },
        {
          $unwind: "$wallets",
        },
        // Apply the filtering logic here
        {
          $match: filterKeyword
            ? {
              "wallets.currencySymbol": { $regex: filterKeyword, $options: "i" },
            }
            : {}, // No filter if keyword is empty
        },
        {
          $lookup: {
            from: "currency",
            localField: "wallets.currencyId",
            foreignField: "_id",
            as: "currdetail",
          },
        },
        {
          $project: {
            currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencysymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyImage: { $arrayElemAt: ["$currdetail.Currency_image", 0] },
            currencyType: { $arrayElemAt: ["$currdetail.currencyType", 0] },
            coinType: { $arrayElemAt: ["$currdetail.coinType", 0] },
            depositStatus: { $arrayElemAt: ["$currdetail.depositStatus", 0] },
            withdrawStatus: { $arrayElemAt: ["$currdetail.withdrawStatus", 0] },
            tradeStatus: { $arrayElemAt: ["$currdetail.tradeStatus", 0] },
            minWithdrawLimit: { $arrayElemAt: ["$currdetail.minWithdrawLimit", 0] },
            maxWithdrawLimit: { $arrayElemAt: ["$currdetail.maxWithdrawLimit", 0] },
            withdrawFee: { $arrayElemAt: ["$currdetail.withdrawFee", 0] },
            erc20token: { $arrayElemAt: ["$currdetail.erc20token", 0] },
            trc20token: { $arrayElemAt: ["$currdetail.trc20token", 0] },
            bep20token: { $arrayElemAt: ["$currdetail.bep20token", 0] },
            currencyBalance: "$wallets.amount",
            currencyAddress: "$wallets.address",
            erc20Balanceamount: "$wallets.amount_erc20",
            beb20Balanceamount: "$wallets.amount_bep20",
            trc20Balanceamount: "$wallets.amount_trc20",
            currid: { $arrayElemAt: ["$currdetail._id", 0] },
          },
        },
      ])
      .exec(async (err, resData) => {
        console.log("Resdata --- >>>", resData);
        if (err) {
          return res.json({ status: false, Message: err, code: 200 });
        } else {
          const dataPush = [];
          const currency = await currencyDB
            .find({ depositStatus: "Active", coinType: 1 })
            .sort({ popularOrder: 1 });

          if (currency) {
            for (let i = 0; i < currency.length; i++) {
              for (let j = 0; j < resData.length; j++) {
                if (currency[i].currencySymbol === resData[j].currencysymbol) {
                  const transformedData = {
                    _id: resData[j]._id,
                    currid: resData[j].currid,
                    currencyName: resData[j].currencyName,
                    currencysymbol: resData[j].currencysymbol,
                    currencyImage: resData[j].currencyImage,
                    currencyType: resData[j].currencyType,
                    coinType: resData[j].coinType,
                    depositStatus: resData[j].depositStatus,
                    withdrawStatus: resData[j].withdrawStatus,
                    tradeStatus: resData[j].tradeStatus,
                    withdrawFee: resData[j].withdrawFee,
                    minWithdrawLimit: resData[j].minWithdrawLimit,
                    maxWithdrawLimit: resData[j].maxWithdrawLimit,
                    erc20token: resData[j].erc20token,
                    trc20token: resData[j].trc20token,
                    bep20token: resData[j].bep20token,
                    erc20Balanceamount: resData[j].erc20Balanceamount,
                    beb20Balanceamount: resData[j].beb20Balanceamount,
                    trc20Balanceamount: resData[j].trc20Balanceamount,
                    currencyBalance: resData[j].currencyBalance.toFixed(8),
                  };

                  dataPush.push(transformedData);
                }
              }
            }
          }

          return res.json({ status: true, data: dataPush, code: 200 });
        }
      });
  } catch (error) {
    console.log("wallet list catch=====", error.message);
    return res.json({ status: false, Message: "Internal server error", code: 500 });
  }
});

router.get("/get_deposit_list", common.tokenmiddleware, async (req, res) => {
  try {
    const userWallets = await cryptoAddressDB.find({ user_id: req.userId });
    const btcWallets = userWallets.filter(wallet => wallet.currencySymbol === "BTC");
    const ethWallets = userWallets.filter(wallet => wallet.currencySymbol === "ETH");
    const bnbWallets = userWallets.filter(wallet => wallet.currencySymbol === "BNB");
    // const arbWallets = userWallets.filter(wallet => wallet.currencySymbol === "ARB");
    const trxWallets = userWallets.filter(wallet => wallet.currencySymbol === "TRX");
    const xrpWallets = userWallets.filter(wallet => wallet.currencySymbol === "XRP");

    console.log("btcWallets-->", btcWallets, "ethWallets-->", ethWallets);
    console.log("bnbWallets-->", bnbWallets, "trxWallets-->", trxWallets, "xrpWallets--->", xrpWallets);
    // return;

    if (btcWallets.length > 0) {
      var btc_transaction = btcdeposit(btcWallets[0].address, req.userId, btcWallets[0].currencySymbol, btcWallets[0].currency);
    }

    if (ethWallets.length > 0) {
      var eth_transaction = Transaction.ethdeposit(ethWallets[0].address, req.userId, ethWallets[0].currencySymbol, ethWallets[0].currency);
      var eth_token_transaction = Transaction.get_erc20_token(ethWallets[0].address, req.userId);
    }
    if (bnbWallets.length > 0) {
      var bnb_transaction = Transaction.bnbdeposit(bnbWallets[0].address, req.userId, bnbWallets[0].currencySymbol, bnbWallets[0].currency);
      var bnb_token_transaction = Transaction.get_bnb_token(req.userId, bnbWallets[0].address);
    }
    // return;

    // if (arbWallets.length > 0) {
    //   var arb_transaction = Transaction.arbdeposit(arbWallets[0].address, req.userId, arbWallets[0].currencySymbol, arbWallets[0].currency);
    // }

    if (trxWallets.length > 0) {
      var trx_transaction = Transaction.trxdeposit(trxWallets[0].address, req.userId, trxWallets[0].currencySymbol, trxWallets[0].currency);
      var trx_token_transaction = Transaction.get_trc20_token(trxWallets[0].address, req.userId);
    }
    if (xrpWallets.length > 0) {
      var xrp_transaction = Transaction.xrp_deposit(xrpWallets[0].address, req.userId, xrpWallets[0].currencySymbol, xrpWallets[0].currency);
    }

  } catch (err) {
    console.log("get_deposit_list_err", err, "get_deposit_list")
  }
});

const getUSDTBalance = async (address, network, contractAddress, tokenType,tokenSymbol) => {
  console.log(
    address,
    network,
    contractAddress,
    tokenType,
    "address, network, contractAddress, tokenType"
  );
  try {
    const token = {};
    switch (tokenType) {
      case "ERC20":
        const currencyDetailsERC = await currencyDB.findOne({
          currencySymbol: tokenSymbol,
        });
        console.log(
          currencyDetailsERC.contractAddress_erc20,
          "currencyDetailsERC.contractAddress_erc20"
        );
        const erc20Provider =
          network === "mainnet"
            ? `https://mainnet.infura.io/v3/${process.env.INFURAID}`
            : `https://sepolia.infura.io/v3/${process.env.INFURAID}`;
        const web3Erc20 = new Web3(erc20Provider);
        const erc20Contract = new web3Erc20.eth.Contract(
          ERC20_ABI,
          currencyDetailsERC.contractAddress_erc20
        );
        const erc20Balance = await erc20Contract.methods
          .balanceOf(address)
          .call();
        console.log(
          erc20Balance,
          "erc20Balanceerc20Balanceerc20Balanceerc20Balance"
        );
        token["ERC20"] = web3Erc20.utils.fromWei(erc20Balance, "ether");
        break;
      case "BEP20":
        const currencyDetailsBNB = await currencyDB.findOne({
          currencySymbol: tokenSymbol,
        });
        const bep20Provider =
          network === "mainnet"
            ? "https://bsc-dataseed.binance.org/"
            : "https://data-seed-prebsc-1-s1.binance.org:8545/";
        const web3Bep20 = new Web3(bep20Provider);
        const bep20Contract = new web3Bep20.eth.Contract(
          ERC20_ABI,
          currencyDetailsBNB.contractAddress_bep20
        );
        const bep20Balance = await bep20Contract.methods
          .balanceOf(address)
          .call();
        if(tokenSymbol == "USDT")
        {
          token["BEP20"] = web3Bep20.utils.fromWei(bep20Balance, "ether");
        }
        else 
        {
          token["BEP20"] = +bep20Balance / Math.pow(10, +currencyDetailsBNB.coinDecimal_bep20);
        }
        
        break;
      case "TRC20":
        const currencyDetailsTRC = await currencyDB.findOne({
          currencySymbol: tokenSymbol,
        });
        const tronWeb = new TronWeb({
          fullHost:
            network === "mainnet"
              ? "https://api.trongrid.io"
              : "https://nile.trongrid.io",
          headers: { "TRON-PRO-API-KEY": process.env.TRX_APIKEY },
        });
        const trx_Balance = await tronWeb.trx.getBalance(address);
        console.log("trx_Balance-->>", trx_Balance);
        const trx_contract = await tronWeb
          .contract()
          .at(currencyDetailsTRC.contractAddress_trc20);
        tronWeb.setAddress(address);
        const get_trx_balance = await trx_contract?.methods
          ?.balanceOf(address)
          ?.call();
        const decimals = await trx_contract.methods.decimals().call();
        token["TRC20"] = get_trx_balance / Math.pow(10, decimals);
        break;
       case "MATIC":
        const currencyDetailsMatic = await currencyDB.findOne({
          currencySymbol: tokenSymbol,
        });
        const maticProvider =
          network === "mainnet"
            ? "https://polygon-rpc.com/"
            : "https://polygon-mumbai.infura.io/v3/3f630150f0c64d0eb5d270225442888e";
        const web3Matic = new Web3(maticProvider);
        const maticContract = new web3Matic.eth.Contract(
          ERC20_ABI,
          currencyDetailsMatic.contractAddress_matic
        );
        const maticBalance = await maticContract.methods
          .balanceOf(address)
          .call();
        token["MATIC"] = web3Bep20.utils.fromWei(maticBalance, "ether");
        break;
      default:
        throw new Error("Unsupported token type");
    }
    return token;
  } catch (err) {
    console.error("Error fetching USDT balance:", err);
    return {};
  }
};

const getPTKBalance = async (address, network, contractAddress, tokenType) => {
  try {
    var token = {}
    switch (tokenType) {
      case 'BEP20':
        const currencyDetailsBNB = await currencyDB.findOne({ currencySymbol: "PTK" });
        const bep20Provider = network === 'mainnet' ? 'https://bsc-dataseed.binance.org/' : 'https://data-seed-prebsc-1-s1.binance.org:8545/';
        const web3Bep20 = new Web3(bep20Provider);
        const bep20Contract = new web3Bep20.eth.Contract(BNB_API, currencyDetailsBNB.contractAddress_bep20);
        const bep20Balance = await bep20Contract.methods.balanceOf(address).call();
        // token[tokenType] = web3Bep20.utils.fromWei(bep20Balance, 'ether');
        token[tokenType] = Number(bep20Balance) / Math.pow(10, 12);
        console.log("token[tokenType] --=--->>>", token[tokenType]);
      default:
    }
    console.log(token, "token")
    return token

  } catch (err) {
    console.error('Error fetching Pitiklini balance:', err);
    return 0;
  }
};

// const update_admin_wallet = async (userId, balances) => {
//   try {
//     const wallet = await adminWalletDB.findOne({ userId });
//     if (!wallet) {
//       console.log('Admin wallet not found');
//       return;
//     }

//     wallet.wallets.forEach(walletItem => {
//       const symbol = walletItem.currencySymbol;
//       console.log("balances[symbol] --- my done --->>>", balances[symbol]);
//       if (balances[symbol]) {
//         if (symbol === 'USDT') {
//           if (balances[symbol].ERC20) {
//             walletItem.amount_erc20 = parseFloat(balances[symbol].ERC20);
//           }
//           if (balances[symbol].BEP20) {
//             walletItem.amount_bep20 = parseFloat(balances[symbol].BEP20);
//           }
//           if (balances[symbol].TRC20) {
//             walletItem.amount_trc20 = parseFloat(balances[symbol].TRC20);
//           }
//         } else if (symbol === 'PTK' && balances[symbol].BEP20) {
//           walletItem.amount_bep20 = parseFloat(balances[symbol].BEP20);
//         } else {
//           walletItem.amount = parseFloat(balances[symbol]);
//         }
//       }
//     });

//     await wallet.save();
//   } catch (err) {
//     console.error('Error fetching balances:', err);
//     res.status(500).send('Internal Server Error');
//   }
// }

// const getBalance = async (wallets, network) => {
//   try {
//     console.log("enters second -->>>", wallets, network);
//     const balances = {};
//     for (const wallet of wallets) {
//       const { currencySymbol, address, networktype } = wallet;
//       const currencyDetails = await currencyDB.findOne({ currencySymbol });
//       switch (currencySymbol) {
//         case 'BTC':
//           const btcResponse = await axios.get(`https://blockstream.info/testnet/api/address/${address}`);
//           const totalConfirmedRecieved = btcResponse.data.chain_stats.funded_txo_sum / 10 ** 8
//           const totalConfirmedSent = btcResponse.data.chain_stats.spent_txo_sum / 10 ** 8
//           balances[currencySymbol] = (totalConfirmedRecieved - totalConfirmedSent).toFixed(8)
//           console.log("enters second BTC[]-->>>", balances[currencySymbol]);
//           break;
//         case 'ETH':
//           const ethProvider = network === 'mainnet' ? 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID' : `https://sepolia.infura.io/v3/${process.env.INFURAID}`;
//           const web3Eth = new Web3(ethProvider);
//           const ethBalance = await web3Eth.eth.getBalance(address);
//           balances[currencySymbol] = web3Eth.utils.fromWei(ethBalance, 'ether');
//           console.log("enters second ETH[]-->>>", balances[currencySymbol]);
//           break;
//         case 'BNB':
//           const bnbProvider = network === 'mainnet' ? 'https://bsc-dataseed.binance.org/' : 'https://data-seed-prebsc-1-s1.binance.org:8545/';
//           const web3Bnb = new Web3(bnbProvider);
//           const bnbBalance = await web3Bnb.eth.getBalance(address);
//           balances[currencySymbol] = web3Bnb.utils.fromWei(bnbBalance, 'ether');
//           console.log("enters second BNB[]-->>>", balances[currencySymbol]);
//           break;
//         case 'TRX':
//           const tronWeb = new TronWeb({
//             fullHost: network === 'mainnet' ? 'https://api.trongrid.io' : 'https://nile.trongrid.io',
//             headers: { "TRON-PRO-API-KEY": process.env.TRX_APIKEY },
//           });
//           const trxBalance = await tronWeb.trx.getBalance(address);
//           balances[currencySymbol] = (trxBalance / 1e6).toFixed(8); // Convert from SUN to TRX
//           console.log("enters second TRX[]-->>>", balances[currencySymbol]);
//           break;
//         case 'XRP':
//           const senderInfoResponse = await axios.post("https://s.altnet.rippletest.net:51234", {
//             method: "account_info",
//             params: [{ account: address }],
//           });
//           balances[currencySymbol] = parseInt(senderInfoResponse.data.result.account_data.Balance, 10) / Math.pow(10, "6");
//           console.log("enters second XRP[]-->>>", balances[currencySymbol]);
//           break;
//         case 'PTK':
//           if (networktype === 'BEP20') {
//             const currencyDetailsBEP = await currencyDB.findOne({ currencySymbol: 'PTK' });
//             balances[currencySymbol] = await getPTKBalance(address, network, currencyDetailsBEP.contractAddress_bep20, 'BEP20');
//             console.log("enters second PTK[]-->>>", balances[currencySymbol]);
//           }
//           break;
//         case 'USDT':
//           if (networktype === 'BEP20') {
//             const currencyDetailsBEP = await currencyDB.findOne({ currencySymbol: 'USDT' });
//             const usdcBalances = await getUSDTBalance(address, network, currencyDetailsBEP.contractAddress_bep20, 'BEP20');
//             console.log(balances[currencySymbol], " BNBbalances[currencySymbol] ");
//             balances[currencySymbol] = { ...balances[currencySymbol], ...usdcBalances };
//             console.log("enters second USDT bep[]-->>>", balances[currencySymbol]);
//           }
//           if (networktype === 'ERC20') {
//             const currencyDetailsERC = await currencyDB.findOne({ currencySymbol: 'USDT' });
//             const usdcBalances = await getUSDTBalance(address, network, currencyDetailsERC.contractAddress_erc20, 'ERC20');
//             console.log(balances[currencySymbol], " ERCbalances[currencySymbol] ");
//             balances[currencySymbol] = { ...balances[currencySymbol], ...usdcBalances };
//             console.log("enters second USDT eth[]-->>>", balances[currencySymbol]);
//           }
//           if (networktype === 'TRC20') {
//             // console.log("currencyDetailsTRC20---vx-->>comes");
//             // const tronWeb = new TronWeb({
//             //     fullHost: network === 'mainnet' ? 'https://api.trongrid.io' : 'https://nile.trongrid.io',
//             //     headers: { "TRON-PRO-API-KEY": process.env.TRX_APIKEY },
//             // });
//             // console.log("tronWeb-->>",tronWeb);

//             // const addressHere = address ; 
//             const apiUrl = `https://nile.trongrid.io/v1/accounts/${address}`;

//             const apiResponse = await axios.get(apiUrl);
//             const responseData = apiResponse.data.data[0].trc20;

//             console.log(apiResponse.data, 'apiResponse from TronGrid API:', apiResponse.data.data[0].trc20);

//             const currencyDetailsTRC20 = await currencyDB.findOne({ currencySymbol });
//             if (!currencyDetailsTRC20) {
//               throw new Error(`TRC20 token details not found for ${currencySymbol}`);
//             }
//             const contractAddress = currencyDetailsTRC20.contractAddress_trc20;

//             let matchedValue = null;
//             if (Array.isArray(responseData)) {
//               for (const item of responseData) {
//                 if (item[contractAddress]) {
//                   matchedValue = item[contractAddress];
//                   break;
//                 }
//               }
//             } else {
//               console.error("TRC20 data is not an array, expected an array of balances.");
//             }

//             if (matchedValue) {
//               const humanReadableValue = matchedValue / Math.pow(10, currencyDetailsTRC20.coinDecimal_trc20 ? currencyDetailsTRC20.coinDecimal_trc20 : "6");
//               console.log(`Matched value for contract address ${contractAddress}: ${humanReadableValue} USDT`);
//               var obj = {
//                 'TRC20': humanReadableValue,
//               }
//               balances[currencySymbol] = { ...balances[currencySymbol], ...obj };
//               console.log("enters second USDT trx[]-->>>", balances[currencySymbol]);
//             } else {
//               console.log(`No matching value found for contract address ${contractAddress}`);
//             }
//             // console.log("currencyDetailsTRC20---vx-->>",currencyDetailsTRC20.contractAddress_trc20);
//             // const contract = await tronWeb.contract().at(currencyDetailsTRC20.contractAddress_trc20);
//             // console.log("currencyDetailsTRC20---vx-->>contract",contract);
//             // const balance = await contract.methods.balanceOf(address).call();
//             // console.log(balance,"balance---<<<");
//             // balances[currencySymbol] = (balance / 1e6).toFixed(8); // Assuming TRC20 tokens have 6 decimals
//             // console.log("enters second USDT trx[]-->>>",balances[currencySymbol]);
//           }
//           break;
//         default:
//           console.log(`Unsupported currency: ${currencySymbol}`);
//       }
//     }
//     console.log(balances, "balcnecee")
//     return balances;
//   } catch (err) {
//     console.error('Error fetching balances:', err);
//     return {};
//   }
// };

// router.post("/getBalance", async (req, res) => {
//   const { network, userId } = req.body; // 'mainnet' or 'testnet'
//   console.log("network enter -->>", network);
//   try {
//     const addressDetail = await adminWalletDB.findOne({ userId: "66c35de1f9ce3961586ce5fd" });
//     if (!addressDetail) {
//       return res.status(404).send('Admin wallet not found');
//     }

//     const userAddresses = await cryptoAddressDB.find({ user_id: "66c35de1f9ce3961586ce5fd" });
//     if (!userAddresses.length) {
//       return res.status(404).send('User addresses not found');
//     }

//     const wallets = userAddresses.map(address => ({
//       currencySymbol: address.currencySymbol,
//       address: address.address,
//       admin_token_name: address.trx_hexaddress,
//       networktype: address.networktype,
//     }));

//     console.log("wallets-->>enters", wallets);

//     const ethAddress = userAddresses.find(address => address.currencySymbol === 'ETH')?.address
//     const BNBAddress = userAddresses.find(address => address.currencySymbol === 'BNB')?.address
//     const TRXAddress = userAddresses.find(address => address.currencySymbol === 'TRX')?.address
//     // const ARBAddress = userAddresses.find(address => address.currencySymbol === 'ARB')?.address
//     wallets.push({
//       networktype: 'BEP20',
//       address: BNBAddress,
//       currencySymbol: 'USDT'
//     });
//     // wallets.push({
//     //         networktype: 'ARB',
//     //         address: ARBAddress,
//     //         currencySymbol: 'USDC'
//     //         });
//     wallets.push({
//       networktype: 'BEP20',
//       address: BNBAddress,
//       currencySymbol: 'PTK'
//     });
//     wallets.push({
//       networktype: 'ERC20',
//       address: ethAddress,
//       currencySymbol: 'USDT'
//     });
//     wallets.push({
//       networktype: 'TRC20',
//       address: TRXAddress,
//       currencySymbol: 'USDT'
//     });

//     console.log("wallets-->>enters in after push", wallets);

//     const balances = await getBalance(wallets, network);
//     await update_admin_wallet('66c35de1f9ce3961586ce5fd', balances);

//     res.json(balances);

//   } catch (err) {
//     console.error('Error fetching balances:', err);
//     res.status(500).send('Internal Server Error');
//   }
// });


const update_admin_wallet = async (userId, balances) => {
  try {
    const wallet = await adminWalletDB.findOne({ userId });
    if (!wallet) {
      console.log("Admin wallet not found");
      return;
    }
    wallet.wallets.forEach((walletItem) => {
      const symbol = walletItem.currencySymbol;
      if (balances[symbol] != null) {
        if (symbol === "USDT" || symbol === "PTK") {
          if (balances[symbol].ERC20) {
            walletItem.amount_erc20 = parseFloat(balances[symbol].ERC20);
          }
          if (balances[symbol].BEP20) {
            walletItem.amount_bep20 = parseFloat(balances[symbol].BEP20);
          }
          if (balances[symbol].TRC20) {
            walletItem.amount_trc20 = parseFloat(balances[symbol].TRC20);
          }
        } else {
          walletItem.amount = parseFloat(balances[symbol]);
        }
      } else {
        console.log(`No balance found for symbol: ${symbol}`); // Debugging log
      }
    });
    try {
      await wallet.save();
      console.log("Wallet data saved successfully!");
    } catch (error) {
      console.error("Error saving wallet data:", error); // Log any error during save
    }
  } catch (err) {
    console.error("Error fetching balances:", err);
    res.status(500).send("Internal Server Error");
  }
};

const getBalance = async (wallets, network) => {
  try {
    console.log("enters second -->>>", wallets, network);
    const balances = {};
    for (const wallet of wallets) {
      const { currencySymbol, address, networktype } = wallet;
      const currencyDetails = await currencyDB.findOne({ currencySymbol });
      console.log(currencySymbol, "currencySymbolcurrencySymbolcurrencySymbol");
      switch (currencySymbol) {
        case "BTC":
          const btcResponse = await axios.get(
            network === "mainnet" ? `https://blockstream.info/api/address/${address}` : 
            `https://blockstream.info/testnet/api/address/${address}`
          );
          const totalConfirmedRecieved =
            btcResponse.data.chain_stats.funded_txo_sum / 10 ** 8;
          const totalConfirmedSent =
            btcResponse.data.chain_stats.spent_txo_sum / 10 ** 8;
          balances[currencySymbol] = (
            totalConfirmedRecieved - totalConfirmedSent
          ).toFixed(8);
          console.log("enters second BTC[]-->>>", balances[currencySymbol]);
          break;
        case "ETH":
          const ethProvider =
            network === "mainnet"
              ? `https://mainnet.infura.io/v3/${process.env.INFURAID}`
              : `https://sepolia.infura.io/v3/${process.env.INFURAID}`;
          const web3Eth = new Web3(ethProvider);
          const ethBalance = await web3Eth.eth.getBalance(address);
          balances[currencySymbol] = web3Eth.utils.fromWei(ethBalance, "ether");
          console.log("enters second ETH[]-->>>", balances[currencySymbol]);
          break;
        case "BNB":
          const bnbProvider =
            network === "mainnet"
              ? "https://bsc-dataseed.binance.org/"
              : "https://data-seed-prebsc-1-s1.binance.org:8545/";
          const web3Bnb = new Web3(bnbProvider);
          const bnbBalance = await web3Bnb.eth.getBalance(address);
          balances[currencySymbol] = web3Bnb.utils.fromWei(bnbBalance, "ether");
          console.log("enters second BNB[]-->>>", balances[currencySymbol]);
          break;
        case "TRX":
          const tronWeb = new TronWeb({
            fullHost:
              network == "mainnet"
                ? "https://api.trongrid.io"
                : "https://nile.trongrid.io",
            headers: { "TRON-PRO-API-KEY": process.env.TRX_APIKEY },
          });
          const trxBalance = await tronWeb.trx.getBalance(address);
          balances[currencySymbol] = (trxBalance / 1e6).toFixed(8); // Convert from SUN to TRX
          console.log("enters second TRX[]-->>>", balances[currencySymbol]);
          break;
        // case 'XRP':
        //   const senderInfoResponse = network == "testnet" ? await axios.post("https://s.altnet.rippletest.net:51234", {
        //     method: "account_info", params: [{ account: address }], }) :  await axios.post("https://xrplcluster.com", { method: "account_info", params: [{ account: address, ledger_index: "validated" }]});

        //   console.log(senderInfoResponse,"senderInfoResponse")
        //   balances[currencySymbol] = parseInt(senderInfoResponse?.data?.result?.account_data.Balance, 10) / Math.pow(10, "6");
        //   console.log("enters second XRP[]-->>>", balances[currencySymbol]);
        //   break;
        case "MATIC":
          const maticProvider =
            network === "mainnet"
              ? "https://polygon-rpc.com/"
              : "https://polygon-mumbai.infura.io/v3/3f630150f0c64d0eb5d270225442888e/";
          const web3Matic = new Web3(maticProvider);
          const maticBalance = await web3Matic.eth.getBalance(address);
          balances[currencySymbol] = web3Matic.utils.fromWei(maticBalance, "ether");
          console.log("enters second BNB[]-->>>", balances[currencySymbol]);
          break;
        case "USDT":
          if (networktype === "BEP20") {
            const currencyDetailsBEP = await currencyDB.findOne({
              currencySymbol: "USDT",
            });
            const usdcBalances = await getUSDTBalance(
              address,
              network,
              currencyDetailsBEP.contractAddress_bep20,
              "BEP20",
              "USDT"
            );
            console.log(
              balances[currencySymbol],
              " BNBbalances[currencySymbol] "
            );
            balances[currencySymbol] = {
              ...balances[currencySymbol],
              ...usdcBalances,
            };
            console.log(
              "enters second USDT bep[]-->>>",
              balances[currencySymbol]
            );
          }
          if (networktype === "ERC20") {
            const currencyDetailsERC = await currencyDB.findOne({
              currencySymbol: "USDT",
            });
            const usdcBalances = await getUSDTBalance(
              address,
              network,
              currencyDetailsERC.contractAddress_erc20,
              "ERC20",
              "USDT"
            );
            console.log(
              balances[currencySymbol],
              " ERCbalances[currencySymbol] "
            );
            balances[currencySymbol] = {
              ...balances[currencySymbol],
              ...usdcBalances,
            };
            console.log(
              "enters second USDT eth[]-->>>",
              balances[currencySymbol]
            );
          }
          if (networktype === "TRC20") {
            const currencyDetailsTRC = await currencyDB.findOne({
              currencySymbol: "USDT",
            });
            const usdcBalances = await getUSDTBalance(
              address,
              network,
              currencyDetailsTRC.contractAddress_trc20,
              "TRC20",
              "USDT"
            );
            // const tronWeb = new TronWeb({
            //     fullHost: network === 'mainnet' ? 'https://api.trongrid.io' : 'https://nile.trongrid.io',
            //     headers: { "TRON-PRO-API-KEY": process.env.TRX_APIKEY },
            // });
            // const trx_Balance = await tronWeb.trx.getBalance(address);
            // console.log("trx_Balance-->>",trx_Balance);

            // const trx_contract = await tronWeb.contract().at(currencyDetailsTRC.contractAddress_trc20);
            // tronWeb.setAddress(address);
            // const get_trx_balance = await trx_contract?.methods?.balanceOf(address)?.call();
            // const decimals = await trx_contract.methods.decimals().call();
            // var token_balance = get_trx_balance / Math.pow(10, decimals);
            balances[currencySymbol] = {
              ...balances[currencySymbol],
              ...usdcBalances,
            };
            console.log(
              "enters second USDT trx[]-->>>",
              balances[currencySymbol]
            );
          }
          break;
        case "PTK":
          if (networktype === "BEP20") {
            const currencyDetailsBEP = await currencyDB.findOne({
              currencySymbol: "PTK",
            });
            const usdcBalances = await getUSDTBalance(
              address,
              network,
              currencyDetailsBEP.contractAddress_bep20,
              "BEP20",
              "PTK"
            );

            // let swap_data = await swappingHistory.find({toCurrency:"PTK"});
            // let total_swap = 0;
            // if(swap_data.length > 0)
            // {
            //   for(let i=0; i<swap_data.length; i++)
            //   {
            //     total_swap += swap_data[i].receivedAmount
            //   }
            // }

            // console.log("usdcBalances",usdcBalances);

            // console.log(
            //   total_swap,
            //   " total_swap "
            // );
            // console.log(
            //   balances[currencySymbol],
            //   " PTK balances=== "
            // );
            // let final_ptk = +usdcBalances['BEP20'] - +total_swap;
            let final_ptk = +usdcBalances['BEP20'];
            console.log("final_ptk---",final_ptk);
            // balances[currencySymbol] = {
            //   ...balances[currencySymbol],
            //   // ...usdcBalances,
            //   ...final_ptk,
            // };

            balances[currencySymbol] = {"BEP20" : final_ptk};
            
          }
          break;
        default:
          console.log(`Unsupported currency: ${currencySymbol}`);
      }
    }
    console.log(balances, "balcnecee");
    return balances;
  } catch (err) {
    console.error("Error fetching balances:", err);
    return {};
  }
};

router.post("/getBalance", common.tokenmiddleware, async (req, res) => {
  // const { network, userId } = req.body; // 'mainnet' or 'testnet'
  // console.log("network enter -->>", network);
  const network = "mainnet";
  try {
    const addressDetail = await adminWalletDB.findOne({ userId: req.userId });
    console.log(addressDetail, "addressDetail");

    if (!addressDetail) {
      return res.status(404).send("Admin wallet not found");
    }

    const userAddresses = await cryptoAddressDB.find({ user_id: req.userId });
    if (!userAddresses.length) {
      var data = addressDetail.wallets;
      res.json(data);
    }

    const wallets = userAddresses.map((address) => ({
      currencySymbol: address.currencySymbol,
      address: address.address,
      admin_token_name: address.trx_hexaddress,
      networktype: address.networktype,
    }));
    console.log("wallets-->>enters", wallets);
    const ethAddress = userAddresses.find(
      (address) => address.currencySymbol === "ETH"
    )?.address;
    const BNBAddress = userAddresses.find(
      (address) => address.currencySymbol === "BNB"
    )?.address;
    const TRXAddress = userAddresses.find(
      (address) => address.currencySymbol === "TRX"
    )?.address;
    // const maticAddress = userAddresses.find(
    //   (address) => address.currencySymbol === "MATIC"
    // )?.address;
    wallets.push(
      {
      networktype: "BEP20",
      address: BNBAddress,
      currencySymbol: "USDT",
     },
     {
      networktype: "BEP20",
      address: BNBAddress,
      currencySymbol: "PTK",
     }
    );
    wallets.push(
      {
      networktype: "ERC20",
      address: ethAddress,
      currencySymbol: "USDT",
      },
      // {
      //   networktype: "ERC20",
      //   address: ethAddress,
      //   currencySymbol: "DUCAT",
      // }
     );
    wallets.push(
      {
      networktype: "TRC20",
      address: TRXAddress,
      currencySymbol: "USDT",
      },
      // {
      // networktype: "TRC20",
      // address: TRXAddress,
      // currencySymbol: "DUCAT",
      // }
     );

    //  wallets.push(
    //   {
    //   networktype: "MATIC",
    //   address: maticAddress,
    //   currencySymbol: "USDT",
    //   },
    //   {
    //   networktype: "MATIC",
    //   address: maticAddress,
    //   currencySymbol: "DUCAT",
    //   }
    //  );

    console.log("wallets-->>enters in after push", wallets);

    const balances = await getBalance(wallets, network);
    
    console.log(
      balances,
      "balancesbalancesbalancesbalances----balancesbalancesbalances"
    );
    await update_admin_wallet(req.userId, balances);
    res.json(balances);
  } catch (err) {
    console.error("Error fetching balances:", err);
    res.status(500).send("Internal Server Error");
  }
});

// router.get("/adminwallet_transactions",  common.tokenmiddleware,async (req, res) => {
//   try {
//     var get_deposit_data=  await depositDB.find({userId:req.userId}).sort({ _id: -1 })
//     console.log(get_deposit_data,"get_deposit_data")
//     var deposit = [];
//     var withdraws = [];
//       for (var i = 0; i < get_deposit_data.length; i++) {
//         var obj = {
//           createddate: moment(get_deposit_data[i].createddate).format("lll"),
//           currency: get_deposit_data[i].currencySymbol,
//           address: get_deposit_data[i].depto,
//           amount: parseFloat(get_deposit_data[i].depamt).toFixed(8),
//           transaction_id: get_deposit_data[i].txnid,
//           exploreurl: get_deposit_data[i].currencySymbol === "BNB" 
//           ? `${process.env.TESTNET_BNB}/${get_deposit_data[i].txnid}`
//           :  get_deposit_data[i].currencySymbol === "ETH"
//           ? `${process.env.TESTNET_ETH}/${get_deposit_data[i].txnid}`
//           : get_deposit_data[i].currencySymbol === "XRP"
//           ? `${process.env.TESTNET_XRP}/${get_deposit_data[i].txnid}`
//           : get_deposit_data[i].currencySymbol === "BTC"
//           ? `${process.env.TESTNET_BTC}/${get_deposit_data[i].txnid}`
//           : get_deposit_data[i].currencySymbol === "TRX"
//           ? `${process.env.TESTNET_TRX}/${get_deposit_data[i].txnid}`
//           :  get_deposit_data[i].currencySymbol === "USDT" && get_deposit_data[i].network == "trc20token"
//           ? `${process.env.TESTNET_TRX}/${get_deposit_data[i].txnid}`
//           :  get_deposit_data[i].currencySymbol === "USDT" && get_deposit_data[i].network=="erc20token"
//           ? `${process.env.TESTNET_ETH}/${get_deposit_data[i].txnid}`
//           :  get_deposit_data[i].currencySymbol === "USDT" && get_deposit_data[i].network=="bep20token"
//           ? `${process.env.TESTNET_BNB}/${get_deposit_data[i].txnid}`
//           :  get_deposit_data[i].currencySymbol === "PTK" && get_deposit_data[i].network=="bep20token"
//           ? `${process.env.TESTNET_BNB}/${get_deposit_data[i].txnid}`
//           : "",
//           type: "deposit",
//         };
//         deposit.push(obj);
//       }
//     var get_withdraw_data=  await WithdrawDB.find({user_id:req.userId}).sort({ _id: -1 })
//     var withdraws = [];
//       for (var i = 0; i < get_withdraw_data.length; i++) {
//         var obj = {
//           createddate: moment(get_withdraw_data[i].created_at).format("lll"),
//           currency: get_withdraw_data[i].currency_symbol,
//           address: get_withdraw_data[i].withdraw_address,
//           amount: parseFloat(get_withdraw_data[i].amount).toFixed(8),
//           transaction_id: get_withdraw_data[i].txn_id,
//           type: "withdraw",
//         };
//         withdraws.push(obj);
//       }
//       console.log(deposit,"depeosiii")
//       console.log(withdraws,"withdraw")
//       const mergedArray = [...deposit, ...withdraws];
//       console.log(mergedArray,"mergedArray");

//       var returnJson = {
//                   status: true,
//                   result: mergedArray,
//                 };
//                 res.json(returnJson);
//                } catch (e) {
//     console.log(e,"hiiosisi")
//     res.json({ status: false, Message: e.message });
//   }
// });

router.post("/adminwallet_transactions", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5, filterKeyword = "" } = req.body;
    const skip = (page - 1) * limit;

    console.log("page,limit,filterKeyword", page, limit, filterKeyword);

    // Fetch all deposits
    const depositData = await depositDB
      .find({ userId: req.userId })
      .sort({ _id: -1 });

    const deposits = depositData.map((item) => ({
      createddate: moment(item.createddate).format("lll"),
      currency: item.currencySymbol,
      address: item.depto,
      amount: parseFloat(item.depamt).toFixed(8),
      transaction_id: item.txnid,
      exploreurl: item.currencySymbol === "BNB"
        ? `${process.env.TESTNET_BNB}/${item.txnid}`
        : item.currencySymbol === "ETH"
          ? `${process.env.TESTNET_ETH}/${item.txnid}`
          : item.currencySymbol === "XRP"
            ? `${process.env.TESTNET_XRP}/${item.txnid}`
            : item.currencySymbol === "BTC"
              ? `${process.env.TESTNET_BTC}/${item.txnid}`
              : item.currencySymbol === "TRX"
                ? `${process.env.TESTNET_TRX}/${item.txnid}`
                : item.currencySymbol === "USDT" && item.network === "trc20token"
                  ? `${process.env.TESTNET_TRX}/${item.txnid}`
                  : item.currencySymbol === "USDT" && item.network === "erc20token"
                    ? `${process.env.TESTNET_ETH}/${item.txnid}`
                    : item.currencySymbol === "USDT" && item.network === "bep20token"
                      ? `${process.env.TESTNET_BNB}/${item.txnid}`
                      : item.currencySymbol === "PTK" && item.network === "bep20token"
                        ? `${process.env.TESTNET_BNB}/${item.txnid}`
                        : "",
      type: "deposit",
    }));

    // Fetch all withdrawals
    const withdrawData = await WithdrawDB
      .find({ user_id: req.userId })
      .sort({ _id: -1 });

    const withdraws = withdrawData.map((item) => ({
      createddate: moment(item.created_at).format("lll"),
      currency: item.currency_symbol,
      address: item.withdraw_address,
      amount: parseFloat(item.amount).toFixed(8),
      transaction_id: item.txn_id,
      type: "withdraw",
    }));

    // Combine and sort deposits and withdrawals
    const mergedArray = [...deposits, ...withdraws].sort(
      (a, b) => new Date(b.createddate) - new Date(a.createddate)
    );

    // Filter by filterKeyword in the `currency` field
    const filteredData = mergedArray.filter((item) =>
      item.currency.toLowerCase().includes(filterKeyword.toLowerCase())
    );

    // Paginate the filtered data
    const paginatedData = filteredData.slice(skip, skip + parseInt(limit));

    // Total count for pagination
    const totalCount = filteredData.length;

    res.json({
      status: true,
      result: paginatedData,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error, "Error fetching wallet transactions");
    res.json({ status: false, message: error.message });
  }
});

router.post("/ticket_close", common.tokenmiddleware, (req, res) => {
  try {
    supportlistDB
      .findOneAndUpdate(
        {
          _id: req.body._id,
        },
        {
          $set: {
            updated_at: Date.now(),
            status: "1",
          },
          $push: {
            reply: {
              message: req.body.message,
              status: "1",
              tag: req.body.tag,
              posted_at: Date.now(),
            },
          },
        },
        { new: true }
      )
      .exec(async (err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          if (req.body.tag !== "admin") {
            var findDetails = await antiPhishing.findOne({ userid: data.userId });
            var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`
            let userdata = await usersDB.findOne({ _id: ObjectId(req.userId) })
            if (userdata) {
              var usermail = common.decrypt(userdata.email);
              let resData = await mailtempDB
                .findOne({ key: "ticketclose" })
              var ticketno = data._id.toString().substring(0, 8)
              var etempdataDynamic = resData.body
                .replace(/###TICKETID###/g, ticketno)
                .replace(/###USERNAME###/g, usermail)
                .replace(/###CLOSER###/g, userdata.displayname)
                .replace(/###APCODE###/g, findDetails && findDetails.Status == "true" ? APCODE : "")

              var mailRes = await mail.sendMail(
                {
                  from: {
                    name: process.env.FROM_NAME,
                    address: process.env.FROM_EMAIL,
                  },
                  to: usermail,
                  subject: resData.Subject,
                  html: etempdataDynamic,
                },
                // function (mailRes) {
                //   res.json({
                //     status: true,
                //     Message: "Ticket Closed Successfully",
                //   });
                // }
              );
              if (mailRes != null) {
                res.json({
                  status: true,
                  Message: "Ticket Closed Successfully",
                });
              }
            }

          } else {
            let userdata = await usersDB.findOne({ _id: ObjectId(data.userId) })
            if (userdata) {
              var findDetails = await antiPhishing.findOne({ userid: req.userId });
              var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`
              var usermail = common.decrypt(userdata.email);
              let resData = await mailtempDB.findOne({ key: "ticketclose" })
              var ticketno = data._id.toString().substring(0, 8)
              var etempdataDynamic = resData.body
                .replace(/###TICKETID###/g, ticketno)
                .replace(/###USERNAME###/g, userdata.displayname)
                .replace(/###CLOSER###/g, 'ADMIN')
                .replace(/###APCODE###/g, findDetails && findDetails.Status == "true" ? APCODE : "")
              var mailRes = await mail.sendMail(
                {
                  from: {
                    name: process.env.FROM_NAME,
                    address: process.env.FROM_EMAIL,
                  },
                  to: usermail,
                  subject: resData.Subject,
                  html: etempdataDynamic,
                },
                // function (mailRes) {
                //   console.log("mailRes",mailRes)
                //   res.json({
                //     status: true,
                //     Message: "Ticket Closed Successfully",
                //   });
                // }
              );
              if (mailRes != null) {
                res.json({
                  status: true,
                  Message: "Ticket Closed Successfully",
                });
              }
            }
          }
        }
      });
  } catch (e) {
    console.log("=====support_save catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post(
  "/cancel_confirm_order",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var orderId = req.body.orderId;
      var orderDetail = await p2pConfirmOrderModel.findOne({ orderId: orderId });

      if (orderDetail) {
        var p2pdetail = await P2PordersDB.findOne({
          _id: ObjectId(orderDetail.p2p_orderId),
        });
        var processAmount = 0;
        processAmount = p2pdetail.processAmount - orderDetail.askAmount;
        processAmount = processAmount < 0 ? 0 : processAmount;
        let p2pupdate = await P2PordersDB.updateOne(
          { _id: ObjectId(orderDetail.p2p_orderId) },
          { $set: { processAmount: processAmount, order_status: "pending" } }
        );
        let p2pconfirm = await p2pConfirmOrderModel.updateOne(
          { orderId: orderId },
          { $set: { status: 3, dispute_status: 2 } }
        );

        let p2p_balance = await common.getUserP2PBalance(orderDetail.hold_userId, p2pdetail.fromCurrency);
        let p2pbalance = p2p_balance.totalBalance;

        let hold_balance = p2p_balance.balanceHoldTotal;
        let escrew_amount = +hold_balance - +orderDetail.askAmount;
        escrew_amount = (+escrew_amount > 0) ? +escrew_amount : 0;

        let balance_amount = +p2pbalance + +orderDetail.askAmount;

        const balanceUpdate = await common.updateUserP2PBalances(
          orderDetail.hold_userId,
          p2pdetail.fromCurrency,
          balance_amount,
          p2pbalance,
          orderDetail._id,
          "sell"
        );

        const updateholdbalance = await common.updatep2pHoldAmount(
          orderDetail.hold_userId,
          p2pdetail.fromCurrency,
          escrew_amount
        );

        if (p2pupdate && p2pconfirm) {
          // common.sendCommonSocket(
          //   "success",
          //   "ordercancel",
          //   "ordercancel",
          //   function () {});
          common.sendResponseSocket(
            "success",
            "Order cancelled by admin",
            "ordercancel",
            p2pconfirm.userId,
            function () { }
          );
          common.sendResponseSocket(
            "success",
            "Order cancelled by admin",
            "ordercancel",
            p2pconfirm.map_userId,
            function () { }
          );

          return res.json({
            status: true,
            message: "Order cancelled successfully",
          });
        } else {
          return res.json({
            status: false,
            message: "Something went wrong, please try again",
          });
        }
      } else {
        return res.json({ status: false, message: "Invalid Order" });
      }
    } catch (error) {
      console.log("-=-errorerror=-=-=-", error);
      return res.json({
        status: false,
        message: "Internal server error, Please try later!",
      });
    }
  }
);

router.post("/payment_method_list", async (req, res) => {
  try {
    // Get page and limit from the request body with default values if not provided
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 5;

    // Calculate the skip value for pagination
    const skip = (page - 1) * limit;

    // Get the total number of categories for calculating total pages
    const totalRecords = await paymentMethod.countDocuments();

    // Find categories with pagination
    paymentMethod
      .find({}, { _id: 1, payment_name: 1, status: 1 })
      .sort({ _id: -1 })  // Sort in descending order based on _id
      .skip(skip)          // Skip documents for pagination
      .limit(limit)        // Limit the number of documents returned
      .exec((err, data) => {
        if (err) {
          return res.json({
            status: false,
            message: "Something Went Wrong. Please Try Again later",
          });
        }

        // Prepare the response data
        const payment_methods = data.map((item, index) => ({
          _id: item._id,
          id: skip + index + 1, // Maintain proper indexing across pages
          payment_name: item.payment_name,
          status: item.status,
        }));

        // Calculate total pages
        const totalPages = Math.ceil(totalRecords / limit);

        // Send response with paginated data and total pages
        res.json({
          status: true,
          data: payment_methods,
          totalPages: totalPages,
          totalRecords: totalRecords,  // Optional, if you want to show total records
        });
      });
  } catch (e) {
    // console.log("=====payment_method_list catch============", e.message);
    return res.json({
      status: false,
      message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/payment_method_update", (req, res) => {
  try {
    console.log("payment_method_update===", req.body)
    if (req.body._id != "") {
      paymentMethod
        .updateOne(
          { _id: req.body._id },
          {
            $set: {
              payment_name: req.body.payment_name,
              status: parseInt(req.body.status),
              updated_at: Date.now(),
            },
          }
        )
        .exec((err, data) => {
          if (err) {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          } else {
            res.json({
              status: true,
              Message: "Payment Method Updated Successfully",
            });
          }
        });
    } else if (req.body._id == "") {
      var curr = {
        payment_name: req.body.payment_name,
        status: parseInt(req.body.status),
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      console.log("payment method data---", curr);
      paymentMethod.create(curr, (err, data) => {
        console.log("payment method create---", err)
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Payment Metho Added Successfully",
          });
        }
      });
    } else {
      res.json({
        status: false,
        Message: "Something went wrong",
      });
    }
  } catch (e) {
    console.log("=====payment_method_update catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/payment_method_get", (req, res) => {
  try {
    paymentMethod
      .findOne({ _id: req.body._id }, { _id: 1, payment_name: 1, status: 1 })
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something went wrong",
          });
        } else {
          res.json({
            status: true,
            data: data,
          });
        }
      });
  } catch (e) {
    //console.log(("=====support_category_get catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/payment_method_status", (req, res) => {
  try {
    paymentMethod
      .updateOne(
        { _id: req.body._id },
        {
          $set: {
            status: req.body.status,
            updated_at: Date.now(),
          },
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Payment Method Status Updated Successfully",
            doc: data,
          });
        }
      });
  } catch (e) {
    //console.log(("=====payment_method_status catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/payment_method_delete", function (req, res) {
  try {
    paymentMethod.deleteOne({ _id: req.body._id }, function (err, data) {
      if (err) {
        res.json({
          status: false,
          Message: "Something Went Wrong. Please Try Again later",
        });
      } else {
        res.json({
          status: true,
          Message: "Payment Method Deleted Successfully",
        });
      }
    });
  } catch (e) {
    //console.log(("=====payment_method_delete catch============", e.message);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/release_coin", common.tokenmiddleware, async (req, res) => {
  try {
    var bodyData = req.body;

    if (bodyData.orderId != "") {
      let p2pconfirm = await p2pConfirmOrderModel
        .findOne({ orderId: bodyData.orderId })
      console.log(p2pconfirm, "p2pconfirm");
      let p2pdet = await P2PordersDB
        .findOne({ orderId: p2pconfirm.map_orderId })
      if (p2pdet) {
        var userId = p2pconfirm.map_userId;
        var own_userId = p2pconfirm.userId;
        if (p2pdet.orderType == "buy") {
          console.log("sell userId===", p2pconfirm.map_userId);

          let sellBalance = await common.getUserP2PBalance(
            userId,
            p2pdet.fromCurrency);
          if (sellBalance != null) {
            var selluserBalanceTotal = sellBalance.totalBalance;
            var sellholdTotal = sellBalance.balanceHoldTotal;
            console.log("sell user balance===", selluserBalanceTotal);
            console.log("sell p2p confirm amount===", p2pconfirm.askAmount);
            console.log("sell sellholdTotal===", sellholdTotal);
           // if (+selluserBalanceTotal > +p2pdet.totalAmount) {
              var deductAmount =
                selluserBalanceTotal - p2pconfirm.askAmount;
              deductAmount > 0 ? deductAmount : 0;
              console.log("sell p2p deductAmount amount===", deductAmount);
              console.log("sell p2p userid===", userId);
              // let deductbalance = await common.updateUserP2PBalances(
              //   userId,
              //   p2pdet.fromCurrency,
              //   deductAmount,
              //   selluserBalanceTotal,
              //   p2pdet._id,
              //   "sell");
             // if (deductbalance) {
              var updateHold = sellholdTotal - p2pconfirm.askAmount;
                          updateHold = updateHold > 0 ? updateHold : 0;
                          common.updatep2pHoldAmount(
                            userId,
                            p2pdet.fromCurrency,
                            updateHold,
                            function (hold) {}
                          );
                let confirmation =
                  await p2pConfirmOrderModel.findOneAndUpdate(
                    { orderId: req.body.orderId },
                    { $set: { status: 2, dispute_status: 2 } },
                    { new: true }
                  );
                let filledOrder = await p2pConfirmOrderModel.find({
                  map_orderId: confirmation.map_orderId,
                });
                var total_filled = 0;
                var status = "";
                var order_status = "";
                if (filledOrder.length > 0) {
                  for (var i = 0; i < filledOrder.length; i++) {
                    total_filled += filledOrder[i].askAmount;
                  }
                }
                var remaining_amount =
                  p2pdet.totalAmount - total_filled;
                if (remaining_amount > 0) {
                  status = "partially";
                  order_status = "pending";
                } else {
                  status = "filled";
                  order_status = "completed";
                }
                // var updateHold     =  sellholdTotal - confirmation.askAmount;
                // console.log("sell sellholdTotal 111===",sellholdTotal)
                // updateHold = updateHold > 0 ? updateHold : 0;
                // console.log("sell updateHold===",updateHold)
                // common.updatep2pHoldAmount(userId,p2pdet.fromCurrency,updateHold, function (hold){});
                let filled = await P2PordersDB.updateOne(
                  { orderId: p2pdet.orderId },
                  {
                    $set: {
                      status: status,
                      filledAmount: remaining_amount,
                    },
                  },
                  { new: true }
                );
                if (confirmation) {
                  let userBalance = await common.getUserP2PBalance(
                    confirmation.userId,
                    confirmation.firstCurrency);
                  if (userBalance != null) {
                    var userBalanceTotal = userBalance.totalBalance;
                    console.log(
                      "buy user balance====",
                      userBalanceTotal
                    );
                    console.log(
                      "buy p2pconfirm balance====",
                      p2pconfirm.askAmount
                    );
                    var updateAmount =
                      userBalanceTotal + p2pconfirm.askAmount;
                    updateAmount > 0 ? updateAmount : 0;
                    console.log(
                      "buy updateAmount====",
                      updateAmount
                    );
                    common.updateUserP2PBalances(
                      confirmation.userId,
                      confirmation.firstCurrency,
                      updateAmount,
                      userBalanceTotal,
                      p2pdet._id,
                      "sell");
                    let from_user = await usersDB.findOne(
                      { _id: ObjectId(userId) },
                      { username: 1 }
                    );
                    let to_user = await usersDB.findOne(
                      { _id: ObjectId(confirmation.userId) },
                      { username: 1 }
                    );
                    var obj = {
                      from_user_id: ObjectId(userId),
                      to_user_id: ObjectId(to_user._id),
                      p2porderId: ObjectId(confirmation._id),
                      from_user_name: from_user.username,
                      to_user_name: to_user.username,
                      status: 0,
                      message:
                        "" +
                        from_user.username +
                        " has released the crypto for your " +
                        confirmation.askAmount +
                        " " +
                        p2pdet.firstCurrency +
                        " " +
                        p2pdet.orderType +
                        " order",
                      link: "/p2p/chat/" + confirmation.orderId,
                    };
                    let notification = await notifyDB.create(
                      obj
                    );
                    if (notification) {
                      common.sendResponseSocket(
                        "success",
                        notification.message,
                        "notify",
                        notification.to_user_id,
                        function () { }
                      );
                      let admin_update = await adminDB.updateOne({_id: ObjectId(req.userId)},{$set:{admin_status:"available"}});
                      const updatedDispute = await p2pdispute.findOneAndUpdate(
                        { orderId: confirmation.orderId  },
                        { $set: { status : "resolved" } },
                        { new: true }
                      );
                      return res.json({
                        status: true,
                        message: "Crypto Released Successfully",
                      });
                    }
                  }
                } else {
                  res.json({
                    status: false,
                    message: "Something went wrong, Please try again",
                  });
                }
              //}
            // } else {
            //   res.json({ status: false, message: "Insufficient Balance" });
            // }
          } else {
            res.json({
              status: false,
              message: "Something went wrong, Please try again",
            });
          }
        } else {
          let confirmation = await p2pConfirmOrderModel.findOneAndUpdate(
            { orderId: req.body.orderId },
            { $set: { status: 2, dispute_status: 2 } },
            { new: true }
          );
          let filledOrder = await p2pConfirmOrderModel.find({
            map_orderId: confirmation.map_orderId,
          });
          var total_filled = 0;
          var status = "";
          var order_status = "";
          if (filledOrder.length > 0) {
            for (var i = 0; i < filledOrder.length; i++) {
              total_filled += filledOrder[i].askAmount;
            }
          }
          var remaining_amount = p2pdet.totalAmount - total_filled;
          if (remaining_amount > 0) {
            status = "partially";
            order_status = "pending";
          } else {
            status = "filled";
            order_status = "completed";
          }
          let filled = await P2PordersDB.updateOne(
            { orderId: p2pdet.orderId },
            { $set: { status: status, filledAmount: remaining_amount } },
            { new: true }
          );
          console.log("sell p2p userid===", own_userId);

          let sellBalance = await common.getUserP2PBalance(
            own_userId,
            p2pdet.fromCurrency)
          if (sellBalance != null) {
            var selluserBalanceTotal = sellBalance.totalBalance;
            var sellholdTotal = sellBalance.balanceHoldTotal;
            console.log("sell user balance===", selluserBalanceTotal);
            console.log("sell sellholdTotal===", sellholdTotal);
            var updateHold = sellholdTotal - confirmation.askAmount;
            console.log("sell sellholdTotal 111===", sellholdTotal);
            updateHold = updateHold > 0 ? updateHold : 0;
            console.log("sell updateHold===", updateHold);
            console.log("sell p2p userid===", own_userId);
            common.updatep2pHoldAmount(
              own_userId,
              p2pdet.fromCurrency,
              updateHold,
              function (hold) { }
            );
            if (confirmation) {
              let userBalance = await common.getUserP2PBalance(
                confirmation.map_userId,
                confirmation.firstCurrency);
              if (userBalance != null) {
                var userBalanceTotal = userBalance.totalBalance;
                console.log("buyer balance====", userBalanceTotal);
                var updateAmount =
                  userBalanceTotal + confirmation.askAmount;
                updateAmount > 0 ? updateAmount : 0;
                console.log("buyer updateAmount====", updateAmount);
                console.log(
                  "buyer userid====",
                  confirmation.map_userId
                );
                common.updateUserP2PBalances(
                  confirmation.map_userId,
                  confirmation.firstCurrency,
                  updateAmount,
                  userBalanceTotal,
                  p2pdet._id,
                  "sell");
                let from_user = await usersDB.findOne(
                  { _id: ObjectId(userId) },
                  { username: 1 }
                );
                let to_user = await usersDB.findOne(
                  { _id: ObjectId(confirmation.map_userId) },
                  { username: 1 }
                );
                var obj = {
                  from_user_id: ObjectId(userId),
                  to_user_id: ObjectId(to_user._id),
                  p2porderId: ObjectId(confirmation._id),
                  from_user_name: from_user.username,
                  to_user_name: to_user.username,
                  status: 0,
                  message:
                    "" +
                    from_user.username +
                    " has released the crypto for your " +
                    confirmation.askAmount +
                    " " +
                    p2pdet.firstCurrency +
                    " " +
                    p2pdet.orderType +
                    " order",
                  link: "/p2p/chat/" + confirmation.orderId,
                };
                let notification = await notifyDB.create(obj);
                if (notification) {
                  common.sendResponseSocket(
                    "success",
                    notification.message,
                    "notify",
                    notification.to_user_id,
                    function () { }
                  );
                  let admin_update = await adminDB.updateOne({_id: ObjectId(req.userId)},{$set:{admin_status:"available"}});
                  const updatedDispute = await p2pdispute.findOneAndUpdate(
                    { orderId: confirmation.orderId  },
                    { $set: { status : "resolved" } },
                    { new: true }
                  );
                  return res.json({
                    status: true,
                    message: "Crypto Released Successfully",
                  });
                }
              }
            } else {
              res.json({
                status: false,
                message: "Something went wrong, Please try again",
              });
            }
          }
        }
        
      }
    } else {
      res.json({
        status: false,
        message: "Something went wrong, Please try again",
      });
    }
  } catch (e) {
    console.log("catch exception====", e);
    res.json({
      status: false,
      message: "Something Went Wrong. Please Try Again later",
    });
  }
});




module.exports = router;
