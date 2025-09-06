const { check } = require("express-validator");
const currencyDB = require("../schema/currency");
const speakeasy = require("speakeasy");
const User = require("../schema/users");
const SiteSettings = require("../schema/sitesettings.js");
const moment = require('moment');
const mongoose = require('mongoose');
const withdrawDB = require("../schema/withdraw");
const WAValidator = require("multicoin-address-validator");
const adminDB = require ("../schema/admin.js");

const isValidAmount = (value, maxLength) => {
  const numberValue = parseFloat(value);
  if (isNaN(numberValue)) return false;
  const totalLength = value.replace('.', '').length;
  return totalLength <= maxLength;
};
const validateCurrency = async (req, res, next) => {
  try {
    const { currency_symbol } = req.body;
    req.currency = await currencyDB.findOne({ currencySymbol: currency_symbol.toUpperCase() });
console.log("currency data:",req.currency)
    if (!req.currency) {
      return res.status(404).json({ status: false, message: "Currency not found." });
    }

    if (req.currency.withdrawStatus !== "Active") {
      return res.status(400).json({ status: false, message: "Invalid or inactive token." });
    }
   next(); 
  } catch (err) {
    return res.status(500).json({ status: false, message: "An error occurred while validating the currency.", error: err.message });
  }
};



const validateUser = async (req, res, next) => {
  req.user = await User.findById(req.userId);

  if (!req.user) {
    return res.status(404).json({ status: false, message: "User not found." });
  }

  if (req.user.kycstatus === 0) {
    return res.status(403).json({ status: false, message: "KYC is required to make a withdrawal." });
  }

  if (req.user.tfastatus === 0) {
    return res.status(403).json({ status: false, message: "2FA must be enabled to make a withdrawal." });
  }

  next();
};

const validateAdmin = async (req, res, next) => {
  console.log(req.userId,"req.userId")
  req.user = await adminDB.findById(req.userId);

  if (!req.user) {
    return res.status(404).json({ status: false, message: "User not found." });
  }

  if (req.user.tfastatus === 0) {
    return res.status(403).json({ status: false, message: "2FA must be enabled to make a withdrawal." });
  }

  next();
};

const validateSiteSettings = async (req, res, next) => {
  const siteSettings = await SiteSettings.findOne();
  if (siteSettings && siteSettings.withdrawStatus === "Deactive") {
    return res.status(403).json({ status: false, message: "Withdrawals are currently disabled site-wide." });
  }
  next();
};
const validateWithdrawalAddress = check("withdrawalAddress")
  .notEmpty().withMessage("Withdrawal address is required")
  .custom(async (value, { req }) => {
    console.log('Request Body:', req.body);
    console.log('Currency Type:', req.currency.currencyType);
    console.log('Network Type:', req.body.networkType);

    if (req.currency.currencyType === "1") {
      // Direct currencies
      const isValid = WAValidator.validate(value, req.currency.currencySymbol, { networkType: "both" });
      if (!isValid) {
        throw new Error("Invalid withdrawal address for the specified direct currency.");
      }
    } else if (req.currency.currencyType === "2") {
      // Tokens
      const supportedNetworks = [
        req.currency.erc20token === "1" ? "ERC20" : null,
        req.currency.trc20token === "1" ? "TRC20" : null,
        req.currency.bep20token === "1" ? "BEP20" : null,
        req.currency.rptc20token === "1" ? "RPTC20" : null,
        req.currency.matictoken === "1" ? "MATIC" : null
      ].filter(network => network !== null);

      if (!supportedNetworks.length) {
        throw new Error("No supported networks available for the token.");
      }

      const networkType = req.body.networkType;
      if (!networkType) {
        throw new Error("Network type is required for token withdrawals.");
      }

      if (!supportedNetworks.includes(networkType)) {
        throw new Error(`Unsupported network type. Supported networks are: ${supportedNetworks.join(', ')}.`);
      }

      // const isValid = WAValidator.validate(value, req.currency.currencySymbol, { networkType });
      // if (!isValid) {
      //   throw new Error("Invalid withdrawal address for the specified token and network.");
      // }
    }

    return true;
  });

const validateWithdrawalAmount = check("withdrawalAmount")
  .notEmpty().withMessage("Withdrawal amount is required")
  .custom(async (value, { req }) => {
    const amount = parseFloat(value);
    if (isNaN(amount)) throw new Error("Please enter a valid numeric amount.");
    if (amount < req.currency.minWithdrawLimit || amount > req.currency.maxWithdrawLimit) {
      throw new Error(`The withdrawal amount must be between ${req.currency.minWithdrawLimit} and ${req.currency.maxWithdrawLimit}.`);
    }
    if (!isValidAmount(value, 10)) {
      throw new Error("The amount should be no more than 10 digits in total.");
    }

    const startOfDay = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();
    const totalWithdrawalsToday = await withdrawDB.aggregate([
      {
        $match: {
          user_id: mongoose.Types.ObjectId(req.userId),
          currency_id: mongoose.Types.ObjectId(req.currency._id),
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
    const withdrawLimit = req.currency.Withdraw24Limit ;
    if (totalAmountWithdrawn + amount > withdrawLimit) {
      throw new Error(`The total amount withdrawn today exceeds the limit of ${withdrawLimit}.`);
    }
    return true;
  });
 
 const validateOTP = check("otp")
  .custom(async (value, { req }) => {
    console.log('User 2FA Status:', req.user.tfastatus);
    console.log('User:', req.user);
    console.log('Provided OTP:', value);
    console.log('Stored Secret:', req.user.tfaenablekey); 

    if (req.user.tfastatus === 1) {
      if (!value) {
        throw new Error("2FA code is required if 2FA is enabled.");
      };

      // const userIden = req.user._id;
      // const findUser = await withdrawDB.findOne({user_id:userIden});
      // const currentTime = new Date();
      // if(currentTime > findUser.expireTime) {
      //   throw new Error("OTP has expired. Please request a new OTP.");
      // }

      const verified = speakeasy.totp.verify({
        secret: req.user.tfaenablekey, 
        encoding: 'base32',
        token: value,
        window: 1 
      });

      console.log('Is OTP Verified:', verified); 

      if (!verified) {
        throw new Error("Invalid 2FA code. Please provide a valid OTP.");
      }
    }

    return true;
  });


const checkUserBalance = async (req, res, next) => {
  const withdrawalAmount = parseFloat(req.body.withdrawalAmount);
  const userBalance = parseFloat(req.user.balance);
  const withdrawalFee = req.currency.withdrawFee || 0;
  const totalAmount = withdrawalAmount + withdrawalFee;
  if (userBalance < totalAmount) {
    return res.status(400).json({ status: false, message: "Insufficient balance to cover withdrawal amount and fees." });
  }
  next();
};

const validateWithdrawal = [
  validateCurrency,
  validateUser,
  validateSiteSettings,
  validateWithdrawalAddress,
  validateWithdrawalAmount,
  // validateOTP,
  checkUserBalance
];

const validateWithdrawal2 = [
  validateCurrency,
  validateAdmin,
  validateSiteSettings,
  validateWithdrawalAddress,
  validateWithdrawalAmount,
  // validateOTP,
  checkUserBalance
];

module.exports = {
  validateWithdrawal , validateWithdrawal2
};