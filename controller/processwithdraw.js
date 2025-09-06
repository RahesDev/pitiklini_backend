const axios = require('axios');
const { sendMail } = require('../helper/mailhelper');
const withdrawDB = require('../schema/withdraw');
const usersDB = require('../schema/users');
const currencyDB = require('../schema/currency');
var cryptoAddressDB = require("../schema/userCryptoAddress");
const moment = require('moment');
const mongoose = require('mongoose');
const secrets = require('secrets.js-grempe');
const sodium = require('libsodium-wrappers');
var mailtempDB = require("../schema/mailtemplate");
var userWalletDB= require ("../schema/userWallet");
var adminwalletDB= require ("../schema/adminWallet");
var profitDB = require ("../schema/profit");
var adminDB = require ("../schema/admin");
const speakeasy = require("speakeasy");
var common = require("../helper/common");
var antiPhishing = require("../schema/antiphising");
var mail = require("../helper/mailhelper");
const bufferTime = 30;
const notify = require("../schema/notification");

async function generateSignature(url) {
    await sodium.ready;
    const message = Buffer.from(url, 'utf8');
    const privateKey = Buffer.from(process.env.PRIVATEKEY_WITHDRAW, 'hex');
    const signature = sodium.crypto_sign_detached(message, privateKey);
    return Buffer.from(signature).toString('hex');
}

async function getSignedPrivateKeyShare(url, req) {
    const signature = await generateSignature(url);
    const response = await axios.get(url, {
        headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature
        }
    });
    return response.data;
}
async function generateSignature2(data) {
    await sodium.ready;
    const message = Buffer.from(JSON.stringify(data), 'utf8');
    const privateKey = Buffer.from(process.env.LIBSODIUMPRIVATE_KEY, 'hex');
    const signature = sodium.crypto_sign_detached(message, privateKey);
    return Buffer.from(signature).toString('hex');
}

async function checkWithdrawalLimit(userId, currencyId, amount) {
    const currency = await currencyDB.findById(currencyId);
    if (!currency) throw new Error("Currency not found.");
    const startOfDay = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();
    const totalWithdrawalsToday = await withdrawDB.aggregate([
        {
            $match: {
                user_id: mongoose.Types.ObjectId(userId),
                currency_id: mongoose.Types.ObjectId(currencyId),
                created_at: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: [2, 0] }
            }
        },
        {
            $group: {
                _id: "$currency_id",
                totalAmount: { $sum: "$amount" }
            }
        }
    ]);

    const totalAmountWithdrawn = totalWithdrawalsToday.length > 0 ? totalWithdrawalsToday[0].totalAmount : 0;
    return {
        exceedsLimit: amount > currency.autoWithdrawLimit,
        totalAmountWithdrawn
    };
}

async function sendAdminNotification(userName, currencySymbol, amount, totalAmountWithdrawn, withdrawalAddress) {
    let resData = await mailtempDB.findOne({ key: "withdraw_admin_request" });
    var etempdataDynamic = resData.body
        .replace(/###currencySymbol###/g, currencySymbol)
        .replace(/###amount###/g, amount)
        .replace(/###withdrawalAddress###/g, withdrawalAddress);
    const mailOptions = {
        from: { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL },
        to: process.env.ADMIN_EMAIL,
        subject: 'Withdrawal Request Pending Manual Approval',
        html: etempdataDynamic
    };

    await sendMail(mailOptions);
}

async function processWithdrawal(req, res) {
  try {
    const { currencyId, amount, otp, withdrawalAddress, networkType } =
      req.body;
    const userId = req.userId;
    console.log("User ID from token:", userId);

    const latestWithdrawal = await withdrawDB
      .findOne({
        user_id: userId,
        status: 0,
      })
      .sort({ created_at: -1 });
    if (!latestWithdrawal) {
      return res.status(400).json({
        status: false,
        message: "No pending withdrawal found for this user.",
      });
    }

    const user = await usersDB.findById(userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "Invalid user." });
    }
    if (user.tfastatus === 1) {
      const verified = speakeasy.totp.verify({
        secret: user.tfaenablekey,
        encoding: "base32",
        token: req.body.tfa,
        window: 1,
      });

      console.log("Is OTP Verified:", verified);

      if (!verified) {
        return res
          .status(400)
          .json({ status: false, message: "Invalid 2FA. Please try again." });
      }
    }

    if (
      moment().isAfter(
        moment(latestWithdrawal.expireTime).add(bufferTime, "seconds")
      )
    ) {
      return res.status(400).json({
        status: false,
        message: "OTP has expired. Please request an new OTP.",
      });
      // return res.status(400).json({ status: false, message: 'OTP has expired. Please initiate the withdrawal process again.' });
    }

    const withdrawotp = await withdrawDB.findOne({ withdrawOTP: otp });
    console.log("Withdraw OTP from DB:", withdrawotp);

    if (!withdrawotp || withdrawotp.withdrawOTP !== otp) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid OTP. Please try again." });
    }

    var get_withdraw_fees = await currencyDB.findById(currencyId);

    // var fees = (get_withdraw_fees.currencySymbol == "USDT") ? get_withdraw_fees.withdrawFee_usdt : (amount * get_withdraw_fees.withdrawFee) / 100;
    var fees = +get_withdraw_fees.withdrawFee;
    var receiveamount = amount - fees;

    const { exceedsLimit, totalAmountWithdrawn } = await checkWithdrawalLimit(
      userId,
      currencyId,
      receiveamount
    );
    if (exceedsLimit) {
      const currency = await currencyDB.findById(currencyId);
      if (!currency) {
        return res
          .status(400)
          .json({ status: false, message: "Currency not found." });
      }
      await sendAdminNotification(
        user.name,
        currency.currencySymbol,
        receiveamount,
        totalAmountWithdrawn,
        withdrawalAddress
      );
      var notification = {
        to_user_id: req.userId,
        status: 0,
        message: `Your withdrawal request has been sent to the admin for manual approval.`,
        link: "/notificationHistory",
      }

      let notifica = await notify.create(notification);
      return res.json({
        status: "manual",
        message:
          "Your withdrawal request has been sent to the admin for manual approval.",
      });
    } else {
      const currency = await currencyDB.findById(currencyId);
      if (!currency) {
        return res
          .status(400)
          .json({ status: false, message: "Currency not found." });
      }

      let tokenAddress;
      let tokenDecimal;
      if (networkType === "BEP20") {
        tokenAddress = currency.contractAddress_bep20;
        tokenDecimal = currency.coinDecimal_bep20;
      } else if (networkType === "ERC20") {
        tokenAddress = currency.contractAddress_erc20;
        tokenDecimal = currency.coinDecimal_erc20;
      } else if (networkType === "TRC20") {
        console.log("heeeeeeeeee");
        tokenAddress = currency.contractAddress_trc20;
        tokenDecimal = currency.coinDecimal_trc20;
      }

      const walletData = {
        userId: userId,
        // amount: amount,
        totalamount: amount,
        amount: receiveamount,
        receiveamount: receiveamount,
        fees: fees,
        currency: currencyId,
        address: withdrawalAddress,
        networkType,
        tokenAddress,
        tokenDecimal
      };

      console.log("Wallet Data:", walletData);

      let privateKeyShareUrl1;
      let privateKeyShareUrl2;
      let privateKeyShareUrl3;

      console.log(
        currency.currencySymbol,
        networkType,
        "currency.currencySymbol"
      );

      if (currency.currencySymbol === "BTC") {
        privateKeyShareUrl1 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShare/1`;
        privateKeyShareUrl2 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShare/2`;
        privateKeyShareUrl3 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShare/3`;
      } else if (
        currency.currencySymbol === "ETH" ||
        currency.currencySymbol === "BNB" ||
        networkType === "ERC20" ||
        networkType === "BEP20"
      ) {
        // } else if (currency.currencySymbol === 'ETH' || currency.currencySymbol === 'BNB' || (currency.currencySymbol === 'USDT'&& networkType==='ERC20') || (currency.currencySymbol === 'USDT'&& networkType==='BEP20') || (currency.currencySymbol === 'USDT'&& networkType==='TRC20') || currency.currencySymbol === 'USDT') {
        privateKeyShareUrl1 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareETH/1`;
        privateKeyShareUrl2 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareETH/2`;
        privateKeyShareUrl3 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareETH/3`;
      } else if (currency.currencySymbol === "TRX" || networkType === "TRC20") {
        console.log("sssssssssssssssssssssssssss");
        privateKeyShareUrl1 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareTRX/1`;
        privateKeyShareUrl2 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareTRX/2`;
        privateKeyShareUrl3 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareTRX/3`;
      } else if (currency.currencySymbol === "XRP") {
        privateKeyShareUrl1 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareXRP/1`;
        privateKeyShareUrl2 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareXRP/2`;
        privateKeyShareUrl3 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareXRP/3`;
      } else {
        return res
          .status(400)
          .json({ status: false, message: "Unsupported currency." });
      }

      console.log("PrivateKeyShare URL 1:", privateKeyShareUrl1);
      console.log("PrivateKeyShare URL 2:", privateKeyShareUrl2);
      console.log("PrivateKeyShare URL 3:", privateKeyShareUrl3);

      const [share1, share2, share3] = await Promise.all([
        getSignedPrivateKeyShare(privateKeyShareUrl1, req),
        getSignedPrivateKeyShare(privateKeyShareUrl2, req),
        getSignedPrivateKeyShare(privateKeyShareUrl3, req),
      ]);

      if (!share1 || !share2 || !share3) {
        throw new Error("One or more shares are undefined or invalid");
      }

      const shares = [share3, share1, share2];
      const reconstructedKey = secrets.hex2str(secrets.combine(shares));
      console.log(reconstructedKey, "??????????????????");
      if (!reconstructedKey) {
        return res
          .status(500)
          .json({ status: false, message: "Something went wrong!" });
      }

      let walletServiceUrl;
      let walletData2;

      var symbol =
        networkType === "BEP20"
          ? "BNB"
          : networkType === "ERC20"
            ? "ETH"
            : networkType === "TRC20"
              ? "TRX"
              : currency.currencySymbol;
      var get_admin_address = await cryptoAddressDB.find({
        type: 1,
        currencySymbol: symbol,
      });
      console.log(get_admin_address, "get_admin_address");

      if (currency.currencySymbol === "BTC") {
        // walletServiceUrl = 'http://localhost:3001/api/v1/bitcoin/mainnet/btctransfer';
        walletServiceUrl = `${process.env.WALLETCALL}/api/v1/bitcoin/mainnet/btctransfer`;

        walletData2 = {
          fromAddress: get_admin_address[0].address,
          fromPrivateKeyWIF: reconstructedKey,
          toAddress: walletData.address,
          amount: walletData.amount,
          chain: currency.currencySymbol,
        };
      } else if (currency.currencySymbol === "TRX" || networkType === "TRC20") {
        console.log("entered into TRX function");
        //walletServiceUrl = 'http://localhost:3001/api/v1/trxNetwork/mainnet/trxTransfer';
        walletServiceUrl = `${process.env.WALLETCALL}/api/v1/trxNetwork/mainnet/trxTransfer`;

        walletData2 = {
          fromAddress: get_admin_address[0].address,
          privateKey: reconstructedKey,
          toAddress: walletData.address,
          amount: walletData.amount * 1e6,
          tokenAddress: walletData.tokenAddress,
          tokenDecimal: walletData.tokenDecimal
        };
      } else if (networkType === "ERC20" || networkType === "BEP20") {
        //walletServiceUrl = 'http://localhost:3001/api/v1/evmChain/mainnet/ethTransfer';
        walletServiceUrl = `${process.env.WALLETCALL}/api/v1/evmChain/mainnet/ethTransfer`;

        walletData2 = {
          fromAddress: get_admin_address[0].address,
          fromPrivateKey: reconstructedKey,
          toAddress: walletData.address,
          amount: walletData.amount,
          chain: walletData.networkType === "ERC20" ? "ETH" : "BNB",
          tokenAddress: walletData.tokenAddress,
          tokenDecimal: walletData.tokenDecimal
        };
      } else if (currency.currencySymbol === "BNB") {
        walletServiceUrl = `${process.env.WALLETCALL}/api/v1/evmChain/mainnet/bnb_Transfer`;
        // walletServiceUrl = `http://localhost:3001/api/v1/evmChain/mainnet/bnb_Transfer`
        walletData2 = {
          fromAddress: get_admin_address[0].address,
          fromPrivateKey: reconstructedKey,
          toAddress: walletData.address,
          amount: walletData.amount,
          chain: currency.currencySymbol,
          tokenAddress: walletData.tokenAddress,
        };
      } else if (currency.currencySymbol === "ETH") {
        //walletServiceUrl = 'http://localhost:3001/api/v1/evmChain/mainnet/ethTransfer';
        walletServiceUrl = `${process.env.WALLETCALL}/api/v1/evmChain/mainnet/ethTransfer`;

        walletData2 = {
          fromAddress: get_admin_address[0].address,
          fromPrivateKey: reconstructedKey,
          toAddress: walletData.address,
          amount: walletData.amount,
          chain: currency.currencySymbol,
        };
      } else if (currency.currencySymbol === "TRX") {
        console.log("entered into TRX function");
        //walletServiceUrl = 'http://localhost:3000/api/v1/trxNetwork/mainnet/trxTransfer';
        walletServiceUrl = `${process.env.WALLETCALL}/api/v1/trxNetwork/mainnet/trxTransfer`;

        walletData2 = {
          fromAddress: get_admin_address[0].address,
          privateKey: reconstructedKey,
          toAddress: walletData.address,
          amount: walletData.amount * 1e6,
          tokenAddress: walletData.tokenAddress,
        };
      } else if (currency.currencySymbol === "XRP") {
        //walletServiceUrl = 'http://localhost:3001/api/v1/xrpNetwork/mainnet/xrpTransfer';
        walletServiceUrl = `${process.env.WALLETCALL}/api/v1/xrpNetwork/mainnet/xrpTransfer`;

        walletData2 = {
          fromAddress: get_admin_address[0].address,
          fromSecret: reconstructedKey,
          toAddress: walletData.address,
          amount: walletData.amount,
        };
      } else {
        return res
          .status(400)
          .json({ status: false, message: "Unsupported currency." });
      }

      console.log("Wallet Service URL:", walletServiceUrl);
      console.log("Wallet Data 2:", walletData2);
      console.log("before calling")
      const signature = await generateSignature2(walletData2);
      console.log("after calling")
      const walletResponse = await axios.post(walletServiceUrl, walletData2, {
        headers: {
          "Content-Type": "application/json",
          "X-Signature": signature,
        },
        // timeout: 7000
        timeout: 70000,
      });
      console.log("walletResponse", walletResponse.data);
      if (walletResponse && walletResponse.data.txId) {
        const updatedWithdrawal = await withdrawDB.findOneAndUpdate(
          { user_id: walletData.userId, status: 0, _id: withdrawotp._id },
          {
            $set: {
              status: 2,
              txn_id: walletResponse.data.txId,
              amount: walletData.amount,
              receiveamount: walletData.receiveamount,
              fees: walletData.fees,
              withdraw_address: walletData.address,
            },
          },
          { new: true, useFindAndModify: false }
        );

        console.log("Updated Withdrawal:", updatedWithdrawal);
        if (updatedWithdrawal) {
          const userwallet_update = await userWalletDB.findOneAndUpdate(
            {
              userId: walletData.userId,
              "wallets.currencySymbol": currency.currencySymbol,
            },
            { $inc: { "wallets.$.amount": -walletData.totalamount } }
          );
          const adminwallet_update = await adminwalletDB.findOneAndUpdate(
            {
              userId: "66c35de1f9ce3961586ce5fd",
              "wallets.currencySymbol": currency.currencySymbol,
            },
            { $inc: { "wallets.$.amount": -walletData.totalamount } }
          );
          console.log(adminwallet_update, "adminwallet_update");

          var profitObj = {
            type: "Withdraw",
            user_id: walletData.userId,
            currencyid: currency._id,
            fees: fees,
            fullfees: fees,
            orderid: updatedWithdrawal._id,
          };
          let storeAdminFee = await profitDB.create(profitObj);
          console.log("Updated userwallet_update:bnbnbnbn", userwallet_update);

          var USERNAME = user.displayname;
          //   var AMOUNT = walletResponse.data.amount
          var AMOUNT = walletData.totalamount;
          var CURRENCY = walletData.totalamount;
          var Transaction_ID = walletResponse.data.txId;

          var EXPLOREURL =
            currency.currencySymbol === "BNB"
              ? `${process.env.EXPLORER_BNB}/${walletResponse.data.txId}`
              : currency.currencySymbol === "ETH"
                ? `${process.env.EXPLORER_LINK}/${walletResponse.data.txId}`
                : currency.currencySymbol === "XRP"
                  ? `${process.env.EXPLORER_XRP}/${walletResponse.data.txId}`
                  : currency.currencySymbol === "BTC"
                    ? `${process.env.EXPLORER_BTC}/${walletResponse.data.txId}`
                    : currency.currencySymbol === "TRX"
                      ? `${process.env.EXPLORER_TRX}/${walletResponse.data.txId}`
                      : currency.currencySymbol === "USDT" && networkType === "TRC20"
                        ? `${process.env.EXPLORER_TRX}/${walletResponse.data.txId}`
                        : currency.currencySymbol === "USDT" && networkType === "ERC20"
                          ? `${process.env.EXPLORER_LINK}/${walletResponse.data.txId}`
                          : currency.currencySymbol === "USDT" && networkType === "BEP20"
                            ? `${process.env.EXPLORER_BNB}/${walletResponse.data.txId}`
                            : currency.currencySymbol === "VTX" && networkType === "BEP20"
                              ? `${process.env.EXPLORER_BNB}/${walletResponse.data.txId}`
                              : "";
          var DATE = moment(latestWithdrawal.created_at).format("lll");
          var findDetails = await antiPhishing.findOne({ userid: user._id });
          var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""
            }`;
          let resData = await mailtempDB.findOne({
            key: "CRYPTO-WITHDRAW-VERIFIED",
          });
          var etempdataDynamic = resData.body
            .replace(/###USERNAME###/g, USERNAME)
            .replace(/###AMOUNT###/g, AMOUNT)
            .replace(/###EXPLOREURL###/g, EXPLOREURL)
            .replace(
              /###CURRENCY###/g,
              currency.currencySymbol != undefined
                ? currency.currencySymbol
                : ""
            )
            .replace(/###TRANSACTION_ID###/g, Transaction_ID)
            .replace(/###DATE###/g, DATE)
            .replace(
              /###APCODE###/g,
              findDetails && findDetails.Status == "true" ? APCODE : ""
            );

          var mailRes = await mail.sendMail({
            from: {
              name: process.env.FROM_NAME,
              address: process.env.FROM_EMAIL,
            },

            to: common.decrypt(user.email),
            subject: resData.Subject,
            html: etempdataDynamic,
          });

          var notification = {
            to_user_id: req.userId,
            status: 0,
            message: `Transaction is being processed. Please wait for confirmation..`,
            link: "/notificationHistory",
          }
          let notifica = await notify.create(notification);

          if (mailRes != null) {

            return res.json({
              status: true,
              message:
                "Transaction is being processed. Please wait for confirmation..",
              data: walletResponse.data,
            });
          }
        } else {
          return res
            .status(500)
            .json({ message: "Failed to update withdrawal status." });
        }
      } else {
        const updatedWithdrawal = await withdrawDB.findOneAndUpdate(
          { user_id: walletData.userId, status: 0, _id: withdrawotp._id },
          {
            $set: {
              status: 3,
            },
          },
          { new: true, useFindAndModify: false }
        );

        await withdraw_cancel_email(
          latestWithdrawal.currency_symbol,
          user.displayname,
          latestWithdrawal.amount,
          common.decrypt(user.email),
          user._id
        );
        var notification = {
          to_user_id: req.userId,
          status: 0,
          message: `Transaction Canceled`,
          link: "/notificationHistory",
        }
        let notifica = await notify.create(notification);
        return res.status(200).json({
          status: "TransactionCanceled",
          message: "Transaction Canceled",
        });

      }
    }
  } catch (error) {
    console.log(error,"eroroorerorooreroroorerorooreroroor")
    const latestWithdrawal = await withdrawDB
      .findOne({
        user_id: req.userId,
        status: 0,
      })
      .sort({ created_at: -1 });
    const user = await usersDB.findById(req.userId);

    const updatedWithdrawal = await withdrawDB.findOneAndUpdate(
      { user_id: req.userId, status: 0 },
      {
        $set: {
          status: 3,
        },
      },
      { new: true, useFindAndModify: false }
    );
    console.log("updatedWithdrawal",updatedWithdrawal);
    
    console.error("Error in processWithdrawal:", error);
    await withdraw_cancel_email(
      latestWithdrawal.currency_symbol,
      user.displayname,
      latestWithdrawal.amount,
      common.decrypt(user.email),
      user._id,
      latestWithdrawal.created_at
    );
    return res
      .status(200)
      .json({ status: "TransactionCanceled", message: "Transaction Canceled" });
  }
}

async function processWithdrawal2(req, res) {
    try {
        const { currencyId, amount, otp, withdrawalAddress, networkType } = req.body;
        const userId = req.userId;
        console.log("User ID from token:", userId);
      
        const latestWithdrawal = await withdrawDB.findOne({
            user_id: userId,
            status: 0
        }).sort({ created_at: -1 });
        if (!latestWithdrawal) {
            return res.status(400).json({ status: false, message: 'No pending withdrawal found for this user.' });
        }

        const user = await adminDB.findById(userId);
        if (!user) {
            return res.status(400).json({ status: false, message: 'Invalid user.' });
        }

        if (user.tfastatus === 1) {

            const verified = speakeasy.totp.verify({
              secret: user.tfaenablekey, 
              encoding: 'base32',
              token: req.body.tfa,
              window: 1 
            });
          
            console.log('Is OTP Verified:', verified); 
          
            if (!verified) {
                return res.status(400).json({ status: false, message: 'Invalid 2FA. Please try again.' });
            }
        }

        if (moment().isAfter(latestWithdrawal.expireTime)) {
            return res.status(400).json({ status: false, message: 'OTP has expired. Please request an new OTP.' });
        }

        const withdrawotp = await withdrawDB.findOne({ withdrawOTP: otp });
        console.log("Withdraw OTP from DB:", withdrawotp);

        if (!withdrawotp || withdrawotp.withdrawOTP !== otp) {
            return res.status(400).json({ status: false, message: 'Invalid OTP. Please try again.' });
        }
        var get_withdraw_fees =  await currencyDB.findById(currencyId);

        var fees = (amount * get_withdraw_fees.withdrawFee) / 100;
        var receiveamount = amount - fees;

        const { exceedsLimit, totalAmountWithdrawn } = await checkWithdrawalLimit(userId, currencyId, receiveamount);
        if (exceedsLimit) {
            const currency = await currencyDB.findById(currencyId);
            if (!currency) {
                return res.status(400).json({ status: false, message: 'Currency not found.' });
            }
            await sendAdminNotification(user.userName, currency.currencySymbol, receiveamount, totalAmountWithdrawn, withdrawalAddress);
            return res.json({ status: "manual", message: "Your withdrawal request has been sent to the admin for manual approval." });
        } else {
            const currency = await currencyDB.findById(currencyId);
            if (!currency) {
                return res.status(400).json({ status: false, message: 'Currency not found.' });
            }

            let tokenAddress;
            if (networkType === 'BEP20') {
            tokenAddress = currency.contractAddress_bep20;
            coinDecimal = currency.coinDecimal_bep20;
            } else if (networkType === 'ERC20') {
            tokenAddress = currency.contractAddress_erc20;
            coinDecimal = currency.coinDecimal_erc20;
            } else if (networkType === 'TRC20') {
            console.log("heeeeeeeeee")
            tokenAddress = currency.contractAddress_trc20;
            coinDecimal = currency.coinDecimal_trc20;
            }
       
            
            const walletData = {
                userId: userId,
                amount: amount,
                receiveamount:receiveamount,
                fees:fees,
                currency: currencyId,
                address: withdrawalAddress,
                networkType,
                tokenAddress,
                coinDecimal
            };

            console.log("Wallet Data:", walletData);

            let privateKeyShareUrl1;
            let privateKeyShareUrl2;
            let  privateKeyShareUrl3

            console.log(currency.currencySymbol,networkType,"currency.currencySymbol")

            if (currency.currencySymbol === 'BTC') {
                privateKeyShareUrl1 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShare/1`;
                privateKeyShareUrl2 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShare/2`;
                privateKeyShareUrl3 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShare/3`;
            } else if (currency.currencySymbol === 'ETH' || currency.currencySymbol === 'BNB' || networkType==='ERC20' || networkType==='BEP20') {
            // } else if (currency.currencySymbol === 'ETH' || currency.currencySymbol === 'BNB' ||(currency.currencySymbol === 'USDT'&& networkType==='ERC20')||(currency.currencySymbol === 'USDT'&& networkType==='BEP20')||(currency.currencySymbol === 'PTK' && networkType==='BEP20')) {
                privateKeyShareUrl1 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareETH/1`;
                privateKeyShareUrl2 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareETH/2`;
                privateKeyShareUrl3 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareETH/3`;
            } else if (currency.currencySymbol === 'TRX' || networkType==='TRC20')  {
                privateKeyShareUrl1 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareTRX/1`;
                privateKeyShareUrl2 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareTRX/2`;
                privateKeyShareUrl3 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareTRX/3`;
            } else if (currency.currencySymbol === 'XRP') {
               privateKeyShareUrl1 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareXRP/1`;
                privateKeyShareUrl2 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareXRP/2`;
                privateKeyShareUrl3 = `${process.env.ADMIN_CALL}/api/admin/getPrivateKeyShareXRP/3`;
            }else {
                return res.status(400).json({ status: false, message: 'Unsupported currency2.' });
            }

            console.log("PrivateKeyShare URL 1:", privateKeyShareUrl1);
            console.log("PrivateKeyShare URL 2:", privateKeyShareUrl2);
            console.log("PrivateKeyShare URL 3:", privateKeyShareUrl3);

            const [share1, share2,share3] = await Promise.all([
                getSignedPrivateKeyShare(privateKeyShareUrl1, req),
                getSignedPrivateKeyShare(privateKeyShareUrl2, req),
                getSignedPrivateKeyShare(privateKeyShareUrl3, req)
            ])

            if (!share1 || !share2 || !share3) {
                throw new Error("One or more shares are undefined or invalid");
            }

            const shares = [share3, share1, share2];
            const reconstructedKey = secrets.hex2str(secrets.combine(shares));
            console.log(reconstructedKey, "??????????????????")
            if (!reconstructedKey) {
                return res.status(200).json({ status: false, message: "Something went wrong!" });
            }
            let walletServiceUrl;
            let walletData2;

            // var symbol = (currency.currencySymbol === 'USDT'&& networkType==='BEP20') || (currency.currencySymbol === 'PTK'&& networkType==='BEP20')  ? "BNB":currency.currencySymbol === 'USDT'&& networkType==='ERC20'?"ETH":currency.currencySymbol === 'USDT'&& networkType==='TRC20'?"TRX":currency.currencySymbol
            var symbol = (networkType==='BEP20') ? "BNB": networkType==='ERC20' ? "ETH" : networkType==='TRC20'?"TRX": currency.currencySymbol
           var get_admin_address = await cryptoAddressDB.find({ type:1 ,currencySymbol:symbol});
           console.log(get_admin_address,"get_admin_address")

            if (currency.currencySymbol === 'BTC') {
                // walletServiceUrl = 'http://localhost:3034/api/v1/bitcoin/mainnet/btctransfer';
                 walletServiceUrl =`${process.env.WALLETCALL}/api/v1/bitcoin/mainnet/btctransfer`
                
                walletData2 = {
                    fromAddress: get_admin_address[0].address,
                    fromPrivateKeyWIF: reconstructedKey,
                    toAddress: walletData.address,
                    amount: walletData.amount,
                    chain: currency.currencySymbol
                };
            } else if ( currency.currencySymbol === 'TRX' || networkType === 'TRC20') {
                console.log("entered into TRX function");
                // walletServiceUrl = 'http://localhost:3034/api/v1/trxNetwork/mainnet/trxTransfer';
                walletServiceUrl =`${process.env.WALLETCALL}/api/v1/trxNetwork/mainnet/trxTransfer`

                walletData2 = {
                fromAddress: get_admin_address[0].address,
                privateKey: reconstructedKey,
                toAddress: walletData.address,
                amount: walletData.amount * 1e6,
                tokenAddress: walletData.tokenAddress
                };
            }else if (networkType === 'ERC20' || networkType === 'BEP20') {
                // walletServiceUrl = 'http://localhost:3034/api/v1/evmChain/mainnet/ethTransfer';
                walletServiceUrl =`${process.env.WALLETCALL}/api/v1/evmChain/mainnet/ethTransfer`
                walletData2 = {
                    fromAddress: get_admin_address[0].address,
                    fromPrivateKey: reconstructedKey,
                    toAddress: walletData.address,
                    amount: walletData.amount,
                    chain: walletData.networkType === 'ERC20' ? 'ETH' : 'BNB',
                    tokenAddress: walletData.tokenAddress,
                    coinDecimal: walletData.coinDecimal
                };
            }else if(currency.currencySymbol === 'BNB'){
                
                walletServiceUrl =`${process.env.WALLETCALL}/api/v1/evmChain/mainnet/bnb_Transfer`
                // walletServiceUrl =`http://localhost:3034/api/v1/evmChain/mainnet/bnb_Transfer`

                walletData2 = {
                    fromAddress: get_admin_address[0].address,
                    fromPrivateKey: reconstructedKey,
                    toAddress: walletData.address,
                    amount: walletData.amount,
                    chain: currency.currencySymbol,
                    tokenAddress: walletData.tokenAddress
                };
            }
             else if (currency.currencySymbol === 'ETH') {
                // walletServiceUrl = 'http://localhost:3034/api/v1/evmChain/mainnet/ethTransfer';
                walletServiceUrl =`${process.env.WALLETCALL}/api/v1/evmChain/mainnet/ethTransfer`

                walletData2 = {
                    fromAddress: get_admin_address[0].address,
                    fromPrivateKey: reconstructedKey,
                    toAddress: walletData.address,
                    amount: walletData.amount,
                    chain: currency.currencySymbol,
                };
            }else if (currency.currencySymbol === 'TRX') {
                console.log("entered into TRX function");
                // walletServiceUrl = 'http://localhost:3000/api/v1/trxNetwork/mainnet/trxTransfer';
                walletServiceUrl =`${process.env.WALLETCALL}/api/v1/trxNetwork/mainnet/trxTransfer`
    
                walletData2 = {
                    fromAddress: get_admin_address[0].address,
                    privateKey: reconstructedKey,
                toAddress: walletData.address,
                amount: walletData.amount * 1e6,
                tokenAddress: walletData.tokenAddress
                };
                } else if (currency.currencySymbol === 'XRP') {
                // walletServiceUrl = 'http://localhost:3034/api/v1/xrpNetwork/mainnet/xrpTransfer';
                walletServiceUrl = `${process.env.WALLETCALL}/api/v1/xrpNetwork/mainnet/xrpTransfer`;
                walletData2 = {
                fromAddress: get_admin_address[0].address,
                fromSecret: reconstructedKey,
                toAddress: walletData.address,
                amount: walletData.amount,
                };
                } 
             else {
                return res.status(400).json({ status: false, message: 'Unsupported currency1.' });
            }

            console.log("Wallet Service URL:", walletServiceUrl);
            console.log("Wallet Data 2:", walletData2);

            const signature = await generateSignature2(walletData2);

         
            const walletResponse = await axios.post(walletServiceUrl, walletData2, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Signature': signature,
                },
                timeout: 70000 
            });
            console.log("walletResponse", walletResponse.data);
                if( walletResponse && walletResponse.data.txId){
                    const updatedWithdrawal = await withdrawDB.findOneAndUpdate(
                        { user_id: walletData.userId, status: 0, _id: withdrawotp._id  }, 
                        { 
                          $set: {
                            status: 2,                                                                                                                                                                                                                                                                                                                                                       
                            txn_id: walletResponse.data.txId, 
                            amount: walletData.amount,      
                            receiveamount:walletData.receiveamount,
                            fees:walletData.fees,
                            withdraw_address: walletData.address 
                          } 
                        },
                        { new: true, useFindAndModify: false } 
                      );
                      
                    console.log("Updated Withdrawal:bnbnbnbn", updatedWithdrawal);
        
                    if (updatedWithdrawal) {
                        const userwallet_update =await adminwalletDB.findOneAndUpdate(
                            { userId: walletData.userId, "wallets.currencySymbol": currency.currencySymbol },
                            { $inc: { "wallets.$.amount": -walletData.amount } }
                          );
                        // userWalletDB
                        // .findOneAndUpdate(
                        //   { userId: walletData.userId, "wallets.currencySymbol": currency.currencySymbol },
                        //   { $inc: { "wallets.$.amount": -walletData.amount } },
                        //   { multi: true }
                        // )
                        console.log(userwallet_update,"userwallet_update")
                        var profitObj = {
                            type: "Withdraw",
                            user_id: walletData.userId,
                            currencyid: currency._id,
                            fees: fees,
                            fullfees: fees,
                            orderid: updatedWithdrawal._id,
                          };
                          let storeAdminFee = await profitDB.create(profitObj);
                          console.log("Updated userwallet_update:bnbnbnbn", userwallet_update);

                          var USERNAME = user.username
                          var AMOUNT = walletResponse.amount
                          var CURRENCY = walletData.amount
                          var Transaction_ID = walletResponse.data.txId

                          var EXPLOREURL =  currency.currencySymbol === "BNB"
                          ? `${process.env.TESTNET_BNB}/${walletResponse.data.txId}`
                          : currency.currencySymbol === "ETH"
                          ? `${process.env.TESTNET_LINK}/${walletResponse.data.txId}`
                          : currency.currencySymbol === "XRP"
                          ? `${process.env.TESTNET_XRP}/${walletResponse.data.txId}`
                          : currency.currencySymbol === "BTC"
                          ? `${process.env.TESTNET_BTC}/${walletResponse.data.txId}`
                          : currency.currencySymbol === "TRX"
                          ? `${process.env.TESTNET_TRX}/${walletResponse.data.txId}`
                          :  currency.currencySymbol === "USDT" && networkType === "TRC20"
                          ? `${process.env.TESTNET_TRX}/${walletResponse.data.txId}`
                          :  currency.currencySymbol === "USDT" && networkType === "ERC20"
                          ? `${process.env.TESTNET_LINK}/${walletResponse.data.txId}`
                          :  currency.currencySymbol === "USDT" && networkType === "BEP20"
                          ? `${process.env.TESTNET_BNB}/${walletResponse.data.txId}`
                          :  currency.currencySymbol === "PTK" && networkType === "BEP20"
                          ? `${process.env.TESTNET_BNB}/${walletResponse.data.txId}`
                          : ""
                          var DATE = moment(latestWithdrawal.created_at).format('lll')
                          var findDetails = await antiPhishing.findOne({ userid: user._id });
                          var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`
                          let resData = await mailtempDB.findOne({ key: "withdraw_user_confirm" })
                          var etempdataDynamic = resData.body
                          .replace(/###USERNAME###/g, USERNAME)
                          .replace(/###AMOUNT###/g,AMOUNT)
                          .replace(/###EXPLOREURL###/g,EXPLOREURL)
                          .replace(/###CURRENCY###/g, CURRENCY) 
                          .replace(/###TRANSACTION_ID###/g, Transaction_ID) 
                          .replace(/###DATE###/g, DATE) 
                          .replace(/###APcode###/g, findDetails && findDetails.Status == "true" ? APCODE : "");

                          var mailRes = await mail.sendMail(
                            {
                              from: {
                                name: process.env.FROM_NAME,
                                address: process.env.FROM_EMAIL,
                              },
            
                              to: common.decrypt(user.email),
                              subject: resData.Subject,
                              html: etempdataDynamic,
                            });
                            if (mailRes != null) {
                                return res.json({ status: true, message: "Transaction is being processed. Please wait for confirmation..", data: walletResponse.data });
                            }
                    } else {
                        return res.status(200).json({ message: "Failed to update withdrawal status." });
                    }
                }else{
                    const updatedWithdrawal = await withdrawDB.findOneAndUpdate(
                        { user_id: walletData.userId, status: 0, _id: withdrawotp._id  }, 
                        { 
                          $set: {
                            status: 3
                          } 
                        },
                        { new: true, useFindAndModify: false } 
                      );
                      await  withdraw_cancel_email(latestWithdrawal.currency_symbol,user.username,latestWithdrawal.amount,common.decrypt(user.email),user._id)
                  return res.status(200).json({ message: "Transaction Canceled" });
                }
        
        }
    }  catch (error) {
        const latestWithdrawal = await withdrawDB.findOne({
            user_id: req.userId,
            status: 0
        }).sort({ created_at: -1 });
        const user = await adminDB.findById(req.userId);
        const updatedWithdrawal = await withdrawDB.findOneAndUpdate(
            { user_id: req.userId, status: 0}, 
            { 
              $set: {
                status: 3,                                                                                                                                                                                                                                                                                                                                                       
              } 
            },
            { new: true, useFindAndModify: false } 
          );
          console.error("Error in processWithdrawal:", error);
          await  withdraw_cancel_email(latestWithdrawal.currency_symbol,user.username,latestWithdrawal.amount,common.decrypt(user.email),user._id,latestWithdrawal.created_at)
          return res.status(200).json({ message: "Transaction Canceled" });
    }
}

const withdraw_cancel_email =async(CURRENCY,USERNAME,AMOUNT,MAIL,USERID,Date) =>{
    console.log("------=-==--=---=-=--=",MAIL)
    var findDetails = await antiPhishing.findOne({ userid: USERID});
    var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`
    const formatttedDtae = moment(Date).format("lll")

    let resData = await mailtempDB.findOne({ key: "withdraw_cancel" });
    var etempdataDynamic = resData.body
    .replace(/###USERNAME###/g, USERNAME)
    .replace(/###AMOUNT###/g,AMOUNT)
    .replace( /###CURRENCY_SYMBOL###/g, CURRENCY) 
    .replace(/###DATE###/g, formatttedDtae)
    .replace(/###APCODE###/g, findDetails && findDetails.Status == "true" ? APCODE : "");

    var mailRes = await mail.sendMail(
        {
          from: {
            name: process.env.FROM_NAME,
            address: process.env.FROM_EMAIL,
          },

          to: MAIL,
          subject: resData.Subject,
          html: etempdataDynamic,
        });
        if (mailRes != null) {
            console.log(mailRes,"mailRes")
        }
}

module.exports = {
    processWithdrawal,
    processWithdrawal2
};

