let jwt = require("jsonwebtoken");
const key = require("../config/key");
const jwt_secret = key.JWT_TOKEN_SECRET;
var CryptoJS = require("crypto-js");
const password = "RJ23edrf";
var userWalletDB = require("../schema/userWallet");
var currencyDB = require("../schema/currency");
var mongoose = require("mongoose");
let ObjectId = mongoose.Types.ObjectId;
const crypto = require("crypto");
const ENCRYPTION_KEY = key.ENCRYPTION_KEY;
const IV_LENGTH = key.IV_LENGTH; // For AES, this is always 16
const randomize = require("randomatic");
var adminWallet = require("../schema/admin_wallet");
var request = require("request");
var withdrawDB = require("../schema/withdraw");
var profitDb = require("../schema/profit");
var wallet_json = require("./wallets");
const async = require("async");
var orderDB = require("../schema/orderPlace");
var tradePairDB = require("../schema/trade_pair");
var orderConfirmDB = require("../schema/confirmOrder");
var BalanceUpdationDB = require("../schema/BalanceUpdation");
var redisHelper = require("../services/redis");
var adminWalletDB = require("../schema/adminWallet");
const orderPlace = require("../schema/orderPlace");
const fs = require("fs");
const addressDB = require("../schema/userCryptoAddress");
const depositDB = require("../schema/deposit");
const mail = require("./mailhelper");
const usersDB = require("../schema/users");
var walletconfig = require("./wallets");
const Tx = require("ethereumjs-tx").Transaction;
var bsc_Common = require("@ethereumjs/common").default;
const https = require("https");
const moment = require("moment");
const axios = require("axios");

const trxhost = process.env.TRON_HOST;
const bcrypt = require('bcrypt');
const saltRounds = 12;


const TronWeb = require("tronweb");
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider("https://" + trxhost + "");
const solidityNode = new HttpProvider("https://" + trxhost + "");
const eventServer = new HttpProvider("https://" + trxhost + "");


let decryptionLevel = (exports.decryptionLevel = (text) => {
  if (text) {
    let textParts = text.split(":");
    let iv = Buffer.from(textParts.shift(), "hex");
    let encryptedText = Buffer.from(textParts.join(":"), "hex");
    let decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
});

const btchost = decryptionLevel(walletconfig.btcconfig.host);
const btcport = decryptionLevel(walletconfig.btcconfig.port);
const btcuser = decryptionLevel(walletconfig.btcconfig.username);
const btcpassword = decryptionLevel(walletconfig.btcconfig.password);

const eth_host = process.env.ETH_HOST;

const Web3 = require("web3");
const web3 = new Web3("https://" + eth_host + "");
var bsc_web3 = new Web3(
  new Web3.providers.HttpProvider(process.env.BNB_WALLET)
);
var arb_web3 = new Web3(new Web3.providers.HttpProvider(process.env.ARBITRUM_WALLET));
const matic_web3 = new Web3(process.env.MATIC_URL);


const erc20 = require("./erc20");
const bep20 = require("./bep20");
const converter = require("hex2dec");
const matic = require("./matic");

var cryptoAddressDB = require("../schema/userCryptoAddress");

var minABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "_upgradedAddress", type: "address" }],
    name: "deprecate",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "deprecated",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "_evilUser", type: "address" }],
    name: "addBlackList",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "upgradedAddress",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "balances",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "maximumFee",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "_totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "unpause",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_maker", type: "address" }],
    name: "getBlackListStatus",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" },
    ],
    name: "allowed",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "who", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "pause",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "getOwner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "newBasisPoints", type: "uint256" },
      { name: "newMaxFee", type: "uint256" },
    ],
    name: "setParams",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "amount", type: "uint256" }],
    name: "issue",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "amount", type: "uint256" }],
    name: "redeem",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "basisPointsRate",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "isBlackListed",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "_clearedUser", type: "address" }],
    name: "removeBlackList",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "MAX_UINT",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "_blackListedUser", type: "address" }],
    name: "destroyBlackFunds",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "_initialSupply", type: "uint256" },
      { name: "_name", type: "string" },
      { name: "_symbol", type: "string" },
      { name: "_decimals", type: "uint256" },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "amount", type: "uint256" }],
    name: "Issue",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "amount", type: "uint256" }],
    name: "Redeem",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "newAddress", type: "address" }],
    name: "Deprecate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "feeBasisPoints", type: "uint256" },
      { indexed: false, name: "maxFee", type: "uint256" },
    ],
    name: "Params",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "_blackListedUser", type: "address" },
      { indexed: false, name: "_balance", type: "uint256" },
    ],
    name: "DestroyedBlackFunds",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "_user", type: "address" }],
    name: "AddedBlackList",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "_user", type: "address" }],
    name: "RemovedBlackList",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  { anonymous: false, inputs: [], name: "Pause", type: "event" },
  { anonymous: false, inputs: [], name: "Unpause", type: "event" },
];

var bnb_abi = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "newPair",
        type: "address",
      },
    ],
    name: "AutomatedMarketMakerPairsUpdate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "liquidityBuyTax",
        type: "uint256",
      },
    ],
    name: "BuyTaxPercnetUpdate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "dailymaxTxAmount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "maxTxAmount",
        type: "uint256",
      },
    ],
    name: "DaiyMaxTxAmountAndMaxTxAmountUpdate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bool",
        name: "tradingActive",
        type: "bool",
      },
    ],
    name: "EnableTradingUpdate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "ExcludeFromFee",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "ExcludeFromReward",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "IncludeInFee",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "IncludeInReward",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "liquidityAddress",
        type: "address",
      },
    ],
    name: "LiquidityAddressUpdate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_numTokensSellToAddToLiquidityPercentage",
        type: "uint256",
      },
    ],
    name: "NumTokenSellToAddToLiquidityPercentageAndMaxwalletAmount",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "liquiditySellTax",
        type: "uint256",
      },
    ],
    name: "SellTaxPercent",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "tokensSwapped",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "ethReceived",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "tokensIntoLiqudity",
        type: "uint256",
      },
    ],
    name: "SwapAndLiquity",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "bool", name: "enabled", type: "bool" },
    ],
    name: "SwapAndLiquityEnabledUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "WETH",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_deadAdderess",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_liquidityAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_liquidityBuyTax",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_liquiditySellTax",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_liquidityTax",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_maxTxAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_ownerAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "_totalTax",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "airdrop",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address[]", name: "newholders", type: "address[]" },
      { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
    ],
    name: "airdropArray",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "automatedMarketMakerPairs",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tBurn", type: "uint256" }],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "subtractedValue", type: "uint256" },
    ],
    name: "decreaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "excludeFromFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "includeInFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "addedValue", type: "uint256" },
    ],
    name: "increaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "isExcludedFromFee",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newPair", type: "address" }],
    name: "setAutomatedMarketMakerPairs",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "liquidityBuyTax", type: "uint256" },
    ],
    name: "setBuyTaxPercent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "tradingActive", type: "bool" }],
    name: "setEnableTrading",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "liquidityAddress", type: "address" },
    ],
    name: "setLiquidityAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_numTokensSellToAddToLiquidityPercentage",
        type: "uint256",
      },
    ],
    name: "setNumTokensSellToAddToLiquidityPercentageAndmaxwalletamount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "liquiditySellTax", type: "uint256" },
    ],
    name: "setSellTaxPercent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bool", name: "_enabled", type: "bool" }],
    name: "setSwapAndLiquityEnabled",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "swapAndLiquityEnabled",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Pair",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapV2Router",
    outputs: [
      {
        internalType: "contract IUniswapV2Router02",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

var minABI_rptc = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "burnFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "subtractedValue", type: "uint256" },
    ],
    name: "decreaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "addedValue", type: "uint256" },
    ],
    name: "increaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "tokenAmount", type: "uint256" },
    ],
    name: "recoverBEP20",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "recoverBNB",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];

const log4js = require("log4js");
log4js.configure({
  appenders: { justbit: { type: "file", filename: "logs/switch.log" } },
  categories: { default: { appenders: ["justbit"], level: "error" } },
});

function deposit_mail(user_id, amount, symbol) {
  usersDB.findOne(
    { _id: user_id },
    { username: 1, email: 1 },
    function (err, resdata) {
      var msg = "Deposit on " + amount + " " + symbol + " was confirmed";
      resdata.email = module.exports.decrypt(resdata.email);
      mailtempDB
        .findOne({ key: "confirm_transaction" })
        .exec(function (etemperr, etempdata) {
          var etempdataDynamic = etempdata.body
            .replace(/###USERNAME###/g, resdata.username)
            .replace(
              /###MESSAGE###/g,
              "Deposit on " + amount + " " + symbol + " was confirmed"
            );
          mail.sendMail(
            {
              from: {
                name: process.env.FROM_NAME,
                address: process.env.FROM_EMAIL,
              },
              to: resdata.email,
              subject: etempdata.Subject,
              html: etempdataDynamic,
            },
            function (mailRes) { }
          );
        });
    }
  );
}

// exports.tokenmiddleware = (req, res, next) => {
//   if (!req.headers.authorization) {
//     return res.status(401).send("Warning! Access denied. Unauthorized activity detected");
//   }
//   const str = req.headers.authorization
//   const prefix = "Bearer ";
//   const startIndex = str.indexOf(prefix) + prefix.length;
//   const token = str.substring(startIndex).trim();
//   if (!token) {
//     return res.status(401).send("Warning! Access denied. Unauthorized activity detected.");
//   } else {
//     let payload = module.exports.checktoken(token);
//     if (payload) {
//       req.userId = payload;
//     }
//     if (payload == null || payload == undefined || !payload) {
//       return res.status(401).send(" Warning! Access denied. Unauthorized activity detected.");
//     }
//     next();
//   }
// };

exports.tokenmiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if Authorization header is missing
  if (!authHeader) {
    return res.status(401).send("Warning! Access denied. Unauthorized activity detected.");
  }

  // Check if the header is in the expected format (Bearer <token>)
  const [scheme, token] = authHeader.split(' ');

  // Ensure the token is present and starts with Bearer
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).send("Warning! Access denied. Unauthorized activity detected.");
  }

  try {
    // Verify and decode the token
    const payload = jwt.verify(token, jwt_secret);

    // Attach user ID to the request object
    req.userId = payload._id;
    next(); // Token is valid and not expired
  } catch (error) {
    // Handle token verification errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: false, message: "TokenExpired" });
    }
    console.log(error, "=-=-token error=-=");
    // For other errors (e.g., invalid token)
    return res.status(401).send("Warning! Access denied. Unauthorized activity detected.");
  }
};

exports.checktoken = (token) => {
  const verified = jwt.verify(token, jwt_secret, (err, decoded) => {
    if (err) {
      return err.message;
    } else {
      return decoded._id;
    }
  });
  return verified;
};

exports.verifyToken = (token) => {
  try {
    const payload = {
      _id: token,
    };
    const ENCRYPTION_KEY = key.ENCRYPTION_KEY;
    const IV_LENGTH = key.IV_LENGTH;
    let iv = crypto.randomBytes(IV_LENGTH);
    var cipher = crypto.createCipheriv(
      "aes-256-ctr",
      ENCRYPTION_KEY,
      "S19h8AnT21H8n14I"
    );
    var token = jwt.sign(payload, jwt_secret);
    var crypted = cipher.update(token.toString(), "utf8", "hex");
    crypted += cipher.final("hex");
    console.log(crypted, "cryptedcryptedcryptedcrypted");
    return crypted;
  } catch (error) {
    console.log("Error from verifyToken :::", error);
  }
};

exports.isEmpty = (req, res, next) => {
  var value = req.body;
  if (
    value === undefined ||
    value === null ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  ) {
    return res.json({ status: false, message: "Please fill all fields" });
  } else {
    next();
  }
};

exports.encrypt = (text) => {
  var key = CryptoJS.enc.Hex.parse(password);
  var encrypted = CryptoJS.AES.encrypt(text, key, { mode: CryptoJS.mode.ECB });
  var crypted = encrypted.toString();
  return crypted;
};

// Increase rounds for better security


exports.Obfuscate = async (plainPassword) => {
  try {
    let encoded = await bcrypt.hash(plainPassword, saltRounds);
    return encoded;
  } catch (error) {
    return { status: false, message: "Internal server error!" }
  }
};

exports.unlock = async (plainPassword, hash) => {
  try {
    let verify = await bcrypt.compare(plainPassword, hash);
    return verify;
  } catch (error) {
    return { status: false, message: "Internal server error!" }
  }
};

const encryption = async (text) => {
  var key = CryptoJS.enc.Hex.parse(password);
  var encrypted = CryptoJS.AES.encrypt(text, key, { mode: CryptoJS.mode.ECB });
  var crypted = encrypted.toString();
  return crypted;
};

exports.decrypt = (text) => {
  var key = CryptoJS.enc.Hex.parse(password);
  var decrypted = CryptoJS.AES.decrypt(text.toString(), key, {
    mode: CryptoJS.mode.ECB,
  });
  dec = decrypted.toString(CryptoJS.enc.Utf8);
  return dec;
};

exports.getbalance = function (userId, currency, callback) {
  userWalletDB
    .findOne(
      { userId: userId },
      { wallets: { $elemMatch: { currencyId: currency } } }
    )
    .exec(function (err, resdata) {
      if (resdata && resdata.wallets.length > 0) {
        callback(resdata.wallets[0]);
      } else {
        currencyDB
          .findOne({ _id: currency }, { currencySymbol: 1 })
          .exec(function (currErr, currRes) {
            userWalletDB
              .findOne({ userId: userId })
              .exec(function (err, wallet) {
                if (wallet) {
                  userWalletDB
                    .findOneAndUpdate(
                      { userId: userId },
                      {
                        $push: {
                          currencyId: currency,
                          wallets: {
                            currencyName: currRes.currencyName,
                            currencySymbol: currRes.currencySymbol,
                            currencyId: currency,
                            amount: 0,
                            holdAmount: 0,
                            exchangeAmount: 0,
                            withdrawAmount: 0,
                          },
                        },
                      },
                      { new: true }
                    )
                    .exec((err, newWallet) => {
                      callback(newWallet.wallets[0]);
                    });
                } else {
                  var wallet_user = { wallets: [], userId: userId };
                  wallet_user.wallets.push({
                    currencyName: currRes.currencyName,
                    currencySymbol: currRes.currencySymbol,
                    currencyId: currency,
                    amount: 0,
                    holdAmount: 0,
                    exchangeAmount: 0,
                    withdrawAmount: 0,
                  });
                  userWalletDB.create(wallet_user, function (err_w, postres_w) {
                    callback({
                      currencyId: currency,
                      amount: 0,
                      holdAmount: 0,
                      exchangeAmount: 0,
                      withdrawAmount: 0,
                    });
                  });
                }
              });
          });
      }
    });
};
exports.updateUserBalance = async function (
  userId,
  currency,
  amount,
  hold,
  callback = () => { }
) {
  console.log(userId, currency, amount, hold, "userId, currency, amount, hold,");

  if (hold == "total") {
    var balRes = await userWalletDB.updateOne(
      { userId: userId, "wallets.currencyId": currency },
      { $set: { "wallets.$.amount": +amount } },
      { multi: true }
    );
    if (balRes) {
      callback(true);
    } else {
      callback(false);
    }
  } else if (hold == "hold") {
    var balRes = await userWalletDB.updateOne(
      { userId: userId, "wallets.currencyId": currency },
      { $set: { "wallets.$.holdAmount": +amount } },
      { multi: true }
    );
    if (balRes) {
      callback(true);
    } else {
      callback(false);
    }
  }
};

exports.updateUserBalanceCancel = async function (
  userId,
  currency,
  amount,
  hold,
  callback
) {
  console.log(
    userId,
    currency,
    amount,
    hold,
    "userId, currency, amount, hold,"
  );
  if (hold == "total") {
    var balRes = await userWalletDB.updateOne(
      { userId: userId, "wallets.currencyId": currency },
      { $set: { "wallets.$.amount": +amount } },
      { multi: true }
    );
    if (balRes) {
      return true;
    } else {
      return false;
    }
  } else if (hold == "hold") {
    var balRes = await userWalletDB.updateOne(
      { userId: userId, "wallets.currencyId": currency },
      { $set: { "wallets.$.holdAmount": +amount } },
      { multi: true }
    );
    if (balRes) {
      return true;
    } else {
      return false;
    }
  }
};

let encryptionLevel = (exports.encryptionLevel = (text) => {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);

  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
});

exports.generate_otp = () => {
  var data = randomize("0", 6);
  var data1 = randomize.isCrypto;
  return data;
};

let withdraw = (exports.withdraw = function (details, types, callback) {
  try {
    var getdet = details;
    if (getdet) {
      if (getdet.amount != "" && getdet.withdraw_address != "") {
        if (getdet.amount > 0) {
          currencyDB
            .findOne({
              _id: getdet.currency_id,
            })
            .exec((curenerr, curncydet) => {
              if (curncydet) {
                if (types == "admin_withdraw") {
                  var totalamount = getdet.amount;
                } else {
                  var totalamount = getdet.receiveamount;
                }
                // if(curncydet.walletType==0) // core wallet
                // {
                if (
                  curncydet.currencySymbol === "BTC" ||
                  curncydet.currencySymbol === "LTC"
                ) {
                  if (curncydet.currencySymbol === "BTC") {
                    var wallet_config = {
                      host: decryptionLevel(wallet_json.btcconfig.host),
                      port: decryptionLevel(wallet_json.btcconfig.port),
                      user: decryptionLevel(wallet_json.btcconfig.user),
                      password: decryptionLevel(wallet_json.btcconfig.password),
                    };

                    bitcoin_rpc.init(
                      wallet_config.host,
                      wallet_config.port,
                      wallet_config.user,
                      wallet_config.password
                    );
                    bitcoin_rpc.call(
                      "validateaddress",
                      [getdet.withdraw_address],
                      function (err, address) {
                        if (!err || address) {
                          if (address.result.isvalid == true) {
                            var transferAmount = +totalamount;
                            bitcoin_rpc.call(
                              "walletpassphrase",
                              ["justbit_btc", 120],
                              function (err1, value) {
                                if (!err1) {
                                  bitcoin_rpc.call(
                                    "sendtoaddress",
                                    [
                                      getdet.withdraw_address,
                                      +transferAmount.toFixed(8),
                                    ],
                                    function (berr, btsucc) {
                                      if (!berr) {
                                        if (types == "admin") {
                                          withdrawDB.updateOne(
                                            { _id: getdet._id },
                                            {
                                              $set: {
                                                status: 2,
                                                txn_id: btsucc.result,
                                                updated_at: new Date(),
                                              },
                                            },
                                            function (err, with_res1) {
                                              var profit_payment = {
                                                type: "Withdraw",
                                                user_id: getdet.user_id,
                                                currencyid: curncydet._id,
                                                fees: getdet.fees,
                                                fullfees:
                                                  getdet.fees.toFixed(8),
                                                orderid: getdet._id,
                                              };
                                              profitDb.create(
                                                profit_payment,
                                                function (
                                                  profitErr,
                                                  profitRes
                                                ) {
                                                  btc_balance(function (
                                                    btcresponse
                                                  ) {
                                                    console.log(
                                                      "btc_balance===",
                                                      btcresponse
                                                    );
                                                    if (btcresponse.status) {
                                                      var btc_balance =
                                                        btcresponse.balance;
                                                      updateAdminBalance(
                                                        curncydet.currencySymbol,
                                                        btc_balance,
                                                        function (resp) { }
                                                      );
                                                    }
                                                  });

                                                  callback({
                                                    status: true,
                                                    message:
                                                      "Withdraw completed successfully",
                                                  });
                                                }
                                              );
                                            }
                                          );
                                        } else if (types == "admin_withdraw") {
                                          btc_balance(function (btcresponse) {
                                            console.log(
                                              "btc_balance===",
                                              btcresponse
                                            );
                                            if (btcresponse.status) {
                                              var btc_balance =
                                                btcresponse.balance;
                                              updateAdminBalance(
                                                curncydet.currencySymbol,
                                                btc_balance,
                                                function (resp) { }
                                              );
                                            }
                                          });

                                          callback({
                                            status: true,
                                            message:
                                              "Withdraw completed successfully",
                                            txid: btsucc.result,
                                          });
                                        }
                                      } else {
                                        //console.log('3',berr)
                                        callback({
                                          status: false,
                                          message:
                                            "Transaction falied.Please try again.",
                                        });
                                      }
                                    }
                                  );
                                } else {
                                  //console.log('4',err1)
                                  callback({
                                    status: false,
                                    message:
                                      "Transaction falied.Please try again.",
                                  });
                                }
                              }
                            );
                          } else {
                            callback({
                              status: false,
                              message:
                                'Enter a valid "' +
                                curncydet.currencySymbol +
                                '" address',
                            });
                          }
                        } else {
                          //console.log('1',err)
                          callback({
                            status: false,
                            message: "Transaction falied.Please try again!",
                          });
                        }
                      }
                    );
                  } else if (curncydet.currencySymbol === "LTC") {
                    var wallet_config = {
                      host: decryptionLevel(wallet_json.ltcconfig.host),
                      port: decryptionLevel(wallet_json.ltcconfig.port),
                      user: decryptionLevel(wallet_json.ltcconfig.user),
                      password: decryptionLevel(wallet_json.ltcconfig.password),
                    };

                    bitcoin_rpc.init(
                      wallet_config.host,
                      wallet_config.port,
                      wallet_config.user,
                      wallet_config.password
                    );
                    bitcoin_rpc.call(
                      "validateaddress",
                      [getdet.withdraw_address],
                      function (err, address) {
                        if (!err || address) {
                          if (address.result.isvalid == true) {
                            var transferAmount = +totalamount;
                            bitcoin_rpc.call(
                              "walletpassphrase",
                              ["ltcwallet", 120],
                              function (err1, value) {
                                if (!err1) {
                                  bitcoin_rpc.call(
                                    "sendtoaddress",
                                    [
                                      getdet.withdraw_address,
                                      +transferAmount.toFixed(8),
                                    ],
                                    function (berr, btsucc) {
                                      if (!berr) {
                                        if (types == "admin") {
                                          withdrawDB.updateOne(
                                            { _id: getdet._id },
                                            {
                                              $set: {
                                                status: 2,
                                                txn_id: btsucc.result,
                                                updated_at: new Date(),
                                              },
                                            },
                                            function (err, with_res1) {
                                              var profit_payment = {
                                                type: "Withdraw",
                                                user_id: getdet.user_id,
                                                currencyid: curncydet._id,
                                                fees: getdet.fees,
                                                fullfees:
                                                  getdet.fees.toFixed(8),
                                                orderid: getdet._id,
                                              };
                                              profitDb.create(
                                                profit_payment,
                                                function (
                                                  profitErr,
                                                  profitRes
                                                ) {
                                                  callback({
                                                    status: true,
                                                    message:
                                                      "Withdraw completed successfully",
                                                  });
                                                }
                                              );
                                            }
                                          );
                                        } else if (types == "admin_withdraw") {
                                          callback({
                                            status: true,
                                            message:
                                              "Withdraw completed successfully",
                                            txid: btsucc.result,
                                          });
                                        }
                                      } else {
                                        //console.log('3',berr)
                                        callback({
                                          status: false,
                                          message:
                                            "Transaction falied.Please try again.",
                                        });
                                      }
                                    }
                                  );
                                } else {
                                  //console.log('4',err1)
                                  callback({
                                    status: false,
                                    message:
                                      "Transaction falied.Please try again.",
                                  });
                                }
                              }
                            );
                          } else {
                            callback({
                              status: false,
                              message:
                                'Enter a valid "' +
                                curncydet.currencySymbol +
                                '" address',
                            });
                          }
                        } else {
                          //console.log('1',err)
                          callback({
                            status: false,
                            message: "Transaction falied.Please try again!",
                          });
                        }
                      }
                    );
                  }
                } else if (curncydet.currencySymbol == "ETH") {
                  getadminwallet("ETH", function (adminres) {
                    var admin_address = adminres.address;
                    var privateKey = decryptionLevel(adminres.admin_token_name);
                    var transferAmount = +totalamount;
                    get_Balance(
                      { address: admin_address },
                      function (balanceRes) {
                        var final_balance = balanceRes.balance;
                        if (final_balance > 0) {
                          gasPrice(function (gasresponse) {
                            if (gasresponse.status) {
                              var gasprice = gasresponse.gasprice;
                              var amount = transferAmount;
                              var obj = {
                                from: admin_address,
                                to: getdet.withdraw_address,
                                gasLimit: 200000,
                                gasPrice: gasprice,
                                value: amount,
                                privateKey: privateKey.substring(2),
                              };
                              sendTransaction(obj, function (transfer) {
                                //console.log("send transaction response===",transfer);
                                if (transfer.status) {
                                  if (types == "admin") {
                                    withdrawDB.updateOne(
                                      { _id: getdet._id },
                                      {
                                        $set: {
                                          status: 2,
                                          txn_id: transfer.txn_id,
                                          updated_at: new Date(),
                                        },
                                      },
                                      function (err, with_res1) {
                                        var profit_payment = {
                                          type: "Withdraw",
                                          user_id: getdet.user_id,
                                          currencyid: curncydet._id,
                                          fees: getdet.fees,
                                          fullfees: getdet.fees.toFixed(8),
                                          orderid: getdet._id,
                                        };
                                        profitDb.create(
                                          profit_payment,
                                          function (profitErr, profitRes) {
                                            get_Balance(
                                              { address: admin_address },
                                              function (adminbalanceRes) {
                                                if (adminbalanceRes.status) {
                                                  var admin_eth =
                                                    +adminbalanceRes.balance;
                                                  updateAdminBalance(
                                                    "ETH",
                                                    admin_eth,
                                                    function (balance) { }
                                                  );
                                                }
                                              }
                                            );
                                            callback({
                                              status: true,
                                              message:
                                                "Withdraw completed successfully",
                                            });
                                          }
                                        );
                                      }
                                    );
                                  } else if (types == "admin_withdraw") {
                                    get_Balance(
                                      { address: admin_address },
                                      function (adminbalanceRes) {
                                        if (adminbalanceRes.status) {
                                          var admin_eth =
                                            +adminbalanceRes.balance;
                                          updateAdminBalance(
                                            "ETH",
                                            admin_eth,
                                            function (balance) { }
                                          );
                                        }
                                      }
                                    );
                                    callback({
                                      status: true,
                                      message:
                                        "Withdraw completed successfully",
                                      txid: transfer.txn_id,
                                    });
                                  }
                                } else {
                                  callback({
                                    status: false,
                                    message:
                                      "Transaction falied.Please try again.",
                                  });
                                }
                              });
                            }
                          });
                        } else {
                          console.log("no balance from user wallets");
                        }
                      }
                    );
                  });
                } else if (curncydet.currencySymbol == "TRX") {
                  getadminwallet("TRX", function (adminres) {
                    var admin_address = adminres.trx_hexaddress;
                    var privateKey = decryptionLevel(adminres.admin_token_name);
                    //console.log("admin_address===", admin_address);
                    var transferAmount = +totalamount * 1000000;
                    var bal_obj = {
                      address: admin_address,
                    };
                    tron_balance(bal_obj, function (balanceRes) {
                      if (balanceRes.status) {
                        var tron_balance = balanceRes.balance;
                        var final_balance = tron_balance / 1000000;
                        if (final_balance > 0) {
                          var amount = transferAmount;
                          var obj = {
                            from_address: admin_res.address,
                            to_address: getdet.withdraw_address,
                            amount: amount,
                            privateKey: privateKey,
                          };
                          // console.log("tron withdraw obj===", obj);
                          tron_withdraw(obj, function (transfer) {
                            //console.log("send transaction response===", transfer);
                            if (transfer.status) {
                              if (types == "admin") {
                                withdrawDB.updateOne(
                                  { _id: getdet._id },
                                  {
                                    $set: {
                                      status: 2,
                                      txn_id: transfer.response,
                                      updated_at: new Date(),
                                    },
                                  },
                                  function (err, with_res1) {
                                    var profit_payment = {
                                      type: "Withdraw",
                                      user_id: getdet.user_id,
                                      currencyid: curncydet._id,
                                      fees: getdet.fees,
                                      fullfees: getdet.fees.toFixed(8),
                                      orderid: getdet._id,
                                    };
                                    profitDb.create(
                                      profit_payment,
                                      function (profitErr, profitRes) {
                                        tron_balance(
                                          { address: admin_address },
                                          function (adminbalanceRes) {
                                            if (adminbalanceRes.status) {
                                              var admin_tron =
                                                +adminbalanceRes.balance;
                                              updateAdminBalance(
                                                "TRX",
                                                admin_tron,
                                                function (balance) { }
                                              );
                                            }
                                          }
                                        );

                                        callback({
                                          status: true,
                                          message:
                                            "Withdraw completed successfully",
                                        });
                                      }
                                    );
                                  }
                                );
                              } else if (types == "admin_withdraw") {
                                tron_balance(
                                  { address: admin_address },
                                  function (adminbalanceRes) {
                                    if (adminbalanceRes.status) {
                                      var admin_tron = +adminbalanceRes.balance;
                                      updateAdminBalance(
                                        "TRX",
                                        admin_tron,
                                        function (balance) { }
                                      );
                                    }
                                  }
                                );

                                callback({
                                  status: true,
                                  message: "Withdraw completed successfully",
                                  txid: transfer.response,
                                });
                              }
                            } else {
                              callback({
                                status: false,
                                message: "Transaction falied.Please try again.",
                              });
                            }
                          });
                        } else {
                          console.log("no balance from admin wallets");
                          callback({
                            status: false,
                            message: "Insufficient balance from admin",
                          });
                        }
                      }
                    });
                  });
                } else if (curncydet.currencySymbol == "BNB") {
                  getadminwallet("BNB", function (adminres) {
                    var admin_address = adminres.address;
                    var privateKey = decryptionLevel(adminres.admin_token_name);
                    var transferAmount = +totalamount;
                    bnb_Balance(
                      { address: admin_address },
                      function (balanceRes) {
                        console.log("admin bnb balance====", balanceRes);
                        console.log(
                          "final_balance > transferAmount",
                          final_balance > transferAmount
                        );
                        var final_balance = balanceRes.balance;
                        if (
                          final_balance > 0 &&
                          final_balance > transferAmount
                        ) {
                          //console.log("admin bnb final_balance====",final_balance);
                          bnb_gasPrice(function (gasresponse) {
                            //console.log("admin gasPrice====",gasPrice);
                            if (gasresponse.status) {
                              var gasprice = gasresponse.gasprice;
                              var amount = transferAmount;
                              var obj = {
                                from: admin_address,
                                to: getdet.withdraw_address,
                                gasLimit: 200000,
                                gasPrice: gasprice,
                                value: amount,
                                privateKey: privateKey.substring(2),
                              };
                              console.log("admin bnb transfer====", obj);
                              bnb_sendTransaction(obj, function (transfer) {
                                //console.log("send transaction response===",transfer);
                                if (transfer.status) {
                                  if (types == "admin") {
                                    withdrawDB.updateOne(
                                      { _id: getdet._id },
                                      {
                                        $set: {
                                          status: 2,
                                          txn_id: transfer.txn_id,
                                          updated_at: new Date(),
                                        },
                                      },
                                      function (err, with_res1) {
                                        var profit_payment = {
                                          type: "Withdraw",
                                          user_id: getdet.user_id,
                                          currencyid: curncydet._id,
                                          fees: getdet.fees,
                                          fullfees: getdet.fees.toFixed(8),
                                          orderid: getdet._id,
                                        };
                                        profitDb.create(
                                          profit_payment,
                                          function (profitErr, profitRes) {
                                            bnb_Balance(
                                              { address: admin_address },
                                              function (adminbalanceRes) {
                                                if (adminbalanceRes.status) {
                                                  var admin_bnb =
                                                    +adminbalanceRes.balance;
                                                  updateAdminBalance(
                                                    "BNB",
                                                    admin_bnb,
                                                    function (balance) { }
                                                  );
                                                }
                                              }
                                            );

                                            callback({
                                              status: true,
                                              message:
                                                "Withdraw completed successfully",
                                            });
                                          }
                                        );
                                      }
                                    );
                                  } else if (types == "admin_withdraw") {
                                    bnb_Balance(
                                      { address: admin_address },
                                      function (adminbalanceRes) {
                                        if (adminbalanceRes.status) {
                                          var admin_bnb =
                                            +adminbalanceRes.balance;
                                          updateAdminBalance(
                                            "BNB",
                                            admin_bnb,
                                            function (balance) { }
                                          );
                                        }
                                      }
                                    );

                                    callback({
                                      status: true,
                                      message:
                                        "Withdraw completed successfully",
                                      txid: transfer.txn_id,
                                    });
                                  }
                                } else {
                                  callback({
                                    status: false,
                                    message:
                                      "Transaction falied.Please try again.",
                                  });
                                }
                              });
                            }
                          });
                        } else {
                          console.log("no balance from user wallets");
                          callback({
                            status: false,
                            message: "Insufficient balance",
                          });
                        }
                      }
                    );
                  });
                } else if (curncydet.currencySymbol == "RPTC") {
                  getadminwallet("RPTC", function (adminres) {
                    var admin_address = adminres.address;
                    var privateKey = decryptionLevel(adminres.admin_token_name);
                    var transferAmount = +totalamount;
                    rptc_get_Balance(
                      { address: admin_address },
                      function (balanceRes) {
                        console.log("admin rptc balance====", balanceRes);
                        console.log(
                          "final_balance > transferAmount",
                          final_balance > transferAmount
                        );
                        var final_balance = balanceRes.balance;
                        if (
                          final_balance > 0 &&
                          final_balance > transferAmount
                        ) {
                          console.log(
                            "admin rptc final_balance====",
                            final_balance
                          );
                          rptc_gasPrice(function (gasresponse) {
                            console.log("admin gasPrice====", gasPrice);
                            if (gasresponse.status) {
                              var gasprice = gasresponse.gasprice;
                              var amount = transferAmount;
                              var obj = {
                                from: admin_address,
                                to: getdet.withdraw_address,
                                gasLimit: 200000,
                                gasPrice: gasprice,
                                value: amount,
                                privateKey: privateKey.substring(2),
                              };
                              //console.log("admin rptc transfer====",obj);
                              rptc_sendTransaction(obj, function (transfer) {
                                console.log(
                                  "send transaction response===",
                                  transfer
                                );
                                if (transfer.status) {
                                  if (types == "admin") {
                                    withdrawDB.updateOne(
                                      { _id: getdet._id },
                                      {
                                        $set: {
                                          status: 2,
                                          txn_id: transfer.txn_id,
                                          updated_at: new Date(),
                                        },
                                      },
                                      function (err, with_res1) {
                                        var profit_payment = {
                                          type: "Withdraw",
                                          user_id: getdet.user_id,
                                          currencyid: curncydet._id,
                                          fees: getdet.fees,
                                          fullfees: getdet.fees.toFixed(8),
                                          orderid: getdet._id,
                                        };
                                        profitDb.create(
                                          profit_payment,
                                          function (profitErr, profitRes) {
                                            rptc_get_Balance(
                                              { address: admin_address },
                                              function (adminbalanceRes) {
                                                if (adminbalanceRes.status) {
                                                  var admin_bnb =
                                                    +adminbalanceRes.balance;
                                                  updateAdminBalance(
                                                    "RPTC",
                                                    admin_bnb,
                                                    function (balance) { }
                                                  );
                                                }
                                              }
                                            );

                                            callback({
                                              status: true,
                                              message:
                                                "Withdraw completed successfully",
                                            });
                                          }
                                        );
                                      }
                                    );
                                  } else if (types == "admin_withdraw") {
                                    rptc_get_Balance(
                                      { address: admin_address },
                                      function (adminbalanceRes) {
                                        if (adminbalanceRes.status) {
                                          var admin_bnb =
                                            +adminbalanceRes.balance;
                                          updateAdminBalance(
                                            "RPTC",
                                            admin_bnb,
                                            function (balance) { }
                                          );
                                        }
                                      }
                                    );

                                    callback({
                                      status: true,
                                      message:
                                        "Withdraw completed successfully",
                                      txid: transfer.txn_id,
                                    });
                                  }
                                } else {
                                  callback({
                                    status: false,
                                    message:
                                      "Transaction falied.Please try again.",
                                  });
                                }
                              });
                            }
                          });
                        } else {
                          console.log("no balance from user wallets");
                          callback({
                            status: false,
                            message: "Insufficient balance",
                          });
                        }
                      }
                    );
                  });
                } else if (
                  curncydet.currencyType == "2" &&
                  curncydet.erc20token == "1"
                ) {
                  getadminwallet("ETH", function (adminres) {
                    var args = {
                      adminaddress: adminres.address,
                      account1: getdet.withdraw_address,
                      privkey: decryptionLevel(adminres.admin_token_name),
                      curcontractaddress: curncydet.contractAddress,
                      curdecimal: curncydet.coinDecimal,
                      amount: totalamount,
                    };
                    tokenwithdraw(args, function (response) {
                      console.log("reponse response====", response);
                      if (response) {
                        const result = response;
                        var txHash = result.txHash;
                        if (result.status == true) {
                          if (txHash) {
                            if (txHash != "" && txHash) {
                              if (types == "admin") {
                                withdrawDB.updateOne(
                                  {
                                    _id: getdet._id,
                                  },
                                  {
                                    $set: {
                                      status: 2,
                                      txn_id: txHash,
                                      updated_at: new Date(),
                                    },
                                  },
                                  function (err, with_res1) {
                                    var profit_payment = {
                                      type: "Withdraw",
                                      user_id: getdet.user_id,
                                      currencyid: curncydet._id,
                                      fees: getdet.fees,
                                      fullfees: getdet.fees.toFixed(8),
                                      orderid: getdet._id,
                                    };
                                    profitDb.create(
                                      profit_payment,
                                      function (profitErr, profitRes) {
                                        var admin_obj = {
                                          contractAddress:
                                            curncydet.contractAddress,
                                          userAddress: adminres.address,
                                          decimals: curncydet.coinDecimal,
                                        };
                                        get_tokenBalance(
                                          admin_obj,
                                          function (adminbalanceRes) {
                                            console.log(
                                              "admin balance response===",
                                              adminbalanceRes
                                            );
                                            if (adminbalanceRes.status) {
                                              var admin_tokenbalance =
                                                +adminbalanceRes.balance;
                                              updateAdminBalance(
                                                curncydet.currencySymbol,
                                                admin_tokenbalance,
                                                function (balance) { }
                                              );
                                            }
                                          }
                                        );
                                        callback({
                                          status: true,
                                          message:
                                            "Withdraw completed successfully",
                                        });
                                      }
                                    );
                                  }
                                );
                              } else if (types == "admin_withdraw") {
                                var admin_obj = {
                                  contractAddress: curncydet.contractAddress,
                                  userAddress: adminres.address,
                                  decimals: curncydet.coinDecimal,
                                };
                                get_tokenBalance(
                                  admin_obj,
                                  function (adminbalanceRes) {
                                    console.log(
                                      "admin balance response===",
                                      adminbalanceRes
                                    );
                                    if (adminbalanceRes.status) {
                                      var admin_tokenbalance =
                                        +adminbalanceRes.balance;
                                      updateAdminBalance(
                                        curncydet.currencySymbol,
                                        admin_tokenbalance,
                                        function (balance) { }
                                      );
                                    }
                                  }
                                );

                                callback({
                                  status: true,
                                  message: "Withdraw completed successfully",
                                  txid: txHash,
                                });
                              }
                            } else {
                              console.log("3", trans_err);
                              callback({
                                status: false,
                                message: "Transaction falied.Please try again!",
                              });
                            }
                          }
                        } else {
                          callback({
                            status: false,
                            message: result.message,
                          });
                        }
                      } else {
                        callback({
                          status: false,
                          message: "Transaction falied.Please try again!",
                        });
                      }
                    });
                  });
                } else if (
                  curncydet.currencyType == "2" &&
                  curncydet.trc20token == "1"
                ) {
                  getadminwallet("TRX", function (adminres) {
                    var admin_address = adminres.address;
                    var privateKey = adminres.admin_token_name;
                    console.log("admin_address===", admin_address);
                    console.log("totalamount", totalamount);
                    var transferAmount =
                      +totalamount * Math.pow(10, curncydet.coinDecimal);
                    console.log("urncydet.coinDecimal", curncydet.coinDecimal);
                    console.log("transferAmount", totalamount);
                    var bal_obj = {
                      address: admin_address,
                    };
                    trx_balance(bal_obj, function (balanceRes) {
                      if (balanceRes.status) {
                        var final_balance = balanceRes.balance;
                        if (final_balance >= 10) {
                          var token_bal_obj = {
                            privatekey: privateKey,
                            address: admin_address,
                            contractAddress: curncydet.contractAddress,
                            decimal: curncydet.coinDecimal,
                          };
                          trc20_balance(token_bal_obj, function (tokenbal_res) {
                            if (tokenbal_res.status) {
                              var admin_token_balance = tokenbal_res.balance;
                              if (admin_token_balance > 0) {
                                var obj = {
                                  from_address: admin_address,
                                  to_address: getdet.withdraw_address,
                                  amount: transferAmount,
                                  privateKey: privateKey,
                                  contractAddress: curncydet.contractAddress,
                                  decimal: curncydet.coinDecimal,
                                };
                                console.log("trc20 withdraw obj===", obj);
                                trc20_withdraw(obj, function (transfer) {
                                  console.log(
                                    "send transaction response===",
                                    transfer
                                  );
                                  if (transfer.status) {
                                    if (types == "admin") {
                                      withdrawDB.updateOne(
                                        { _id: getdet._id },
                                        {
                                          $set: {
                                            status: 2,
                                            txn_id: transfer.response,
                                            updated_at: new Date(),
                                          },
                                        },
                                        function (err, with_res1) {
                                          var profit_payment = {
                                            type: "Withdraw",
                                            user_id: getdet.user_id,
                                            currencyid: curncydet._id,
                                            fees: getdet.fees,
                                            fullfees: getdet.fees.toFixed(8),
                                            orderid: getdet._id,
                                          };
                                          profitDb.create(
                                            profit_payment,
                                            function (profitErr, profitRes) {
                                              var admin_obj = {
                                                privatekey: privateKey,
                                                contractAddress:
                                                  curncydet.contractAddress,
                                                address: admin_address,
                                                decimal: curncydet.coinDecimal,
                                              };
                                              trc20_balance(
                                                admin_obj,
                                                function (adminbalanceRes) {
                                                  console.log(
                                                    "admin balance response===",
                                                    adminbalanceRes
                                                  );
                                                  if (adminbalanceRes.status) {
                                                    var admin_tokenbalance =
                                                      +adminbalanceRes.balance;
                                                    updateAdminBalance(
                                                      curncydet.currencySymbol,
                                                      admin_tokenbalance,
                                                      function (balance) { }
                                                    );
                                                  }
                                                }
                                              );

                                              callback({
                                                status: true,
                                                message:
                                                  "Withdraw completed successfully",
                                              });
                                            }
                                          );
                                        }
                                      );
                                    } else if (types == "admin_withdraw") {
                                      var admin_obj = {
                                        privatekey: privateKey,
                                        contractAddress:
                                          curncydet.contractAddress,
                                        address: admin_address,
                                        decimal: curncydet.coinDecimal,
                                      };
                                      trc20_balance(
                                        admin_obj,
                                        function (adminbalanceRes) {
                                          console.log(
                                            "admin balance response===",
                                            adminbalanceRes
                                          );
                                          if (adminbalanceRes.status) {
                                            var admin_tokenbalance =
                                              +adminbalanceRes.balance;
                                            updateAdminBalance(
                                              curncydet.currencySymbol,
                                              admin_tokenbalance,
                                              function (balance) { }
                                            );
                                          }
                                        }
                                      );
                                      callback({
                                        status: true,
                                        message:
                                          "Withdraw completed successfully",
                                        txid: transfer.response,
                                      });
                                    }
                                  } else {
                                    callback({
                                      status: false,
                                      message:
                                        "Transaction falied.Please try again.",
                                    });
                                  }
                                });
                              } else {
                                callback({
                                  status: false,
                                  message: "Insufficient balance from admin",
                                });
                              }
                            } else {
                              callback({
                                status: false,
                                message: "Something went wrong",
                              });
                            }
                          });
                        } else {
                          console.log("no balance from admin wallets");
                          callback({
                            status: false,
                            message: "Insufficient trx balance from admin",
                          });
                        }
                      } else {
                        callback({
                          status: false,
                          message: "Something went wrong",
                        });
                      }
                    });
                  });
                } else if (
                  curncydet.currencyType == "2" &&
                  curncydet.bep20token == "1"
                ) {
                  getadminwallet("BNB", function (adminres) {
                    var args = {
                      adminaddress: adminres.address,
                      account1: getdet.withdraw_address,
                      privkey: decryptionLevel(adminres.admin_token_name),
                      curcontractaddress: curncydet.contractAddress,
                      curdecimal: curncydet.coinDecimal,
                      amount: totalamount,
                    };
                    bnb_tokenwithdraw(args, function (response) {
                      console.log("reponse response====", response);
                      if (response) {
                        const result = response;
                        var txHash = result.txHash;
                        if (result.status == true) {
                          if (txHash) {
                            if (txHash != "" && txHash) {
                              if (types == "admin") {
                                withdrawDB.updateOne(
                                  {
                                    _id: getdet._id,
                                  },
                                  {
                                    $set: {
                                      status: 2,
                                      txn_id: txHash,
                                      updated_at: new Date(),
                                    },
                                  },
                                  function (err, with_res1) {
                                    var profit_payment = {
                                      type: "Withdraw",
                                      user_id: getdet.user_id,
                                      currencyid: curncydet._id,
                                      fees: getdet.fees,
                                      fullfees: getdet.fees.toFixed(8),
                                      orderid: getdet._id,
                                    };
                                    profitDb.create(
                                      profit_payment,
                                      function (profitErr, profitRes) {
                                        var admin_obj = {
                                          contractAddress:
                                            curncydet.contractAddress,
                                          userAddress: adminres.address,
                                          decimals: curncydet.coinDecimal,
                                        };
                                        bep20_Balance(
                                          admin_obj,
                                          function (adminbalanceRes) {
                                            console.log(
                                              "admin balance response===",
                                              adminbalanceRes
                                            );
                                            if (adminbalanceRes.status) {
                                              var admin_tokenbalance =
                                                +adminbalanceRes.balance;
                                              updateAdminBalance(
                                                curncydet.currencySymbol,
                                                admin_tokenbalance,
                                                function (balance) { }
                                              );
                                            }
                                          }
                                        );

                                        callback({
                                          status: true,
                                          message:
                                            "Withdraw completed successfully",
                                        });
                                      }
                                    );
                                  }
                                );
                              } else if (types == "admin_withdraw") {
                                var admin_obj = {
                                  contractAddress: curncydet.contractAddress,
                                  userAddress: adminres.address,
                                  decimals: curncydet.coinDecimal,
                                };
                                bep20_Balance(
                                  admin_obj,
                                  function (adminbalanceRes) {
                                    //console.log("admin balance response===",adminbalanceRes);
                                    if (adminbalanceRes.status) {
                                      var admin_tokenbalance =
                                        +adminbalanceRes.balance;
                                      updateAdminBalance(
                                        curncydet.currencySymbol,
                                        admin_tokenbalance,
                                        function (balance) { }
                                      );
                                    }
                                  }
                                );

                                callback({
                                  status: true,
                                  message: "Withdraw completed successfully",
                                  txid: txHash,
                                });
                              }
                            } else {
                              console.log("3", trans_err);
                              callback({
                                status: false,
                                message: "Transaction falied.Please try again!",
                              });
                            }
                          }
                        } else {
                          callback({
                            status: false,
                            message: result.message,
                          });
                        }
                      } else {
                        callback({
                          status: false,
                          message: "Transaction falied.Please try again!",
                        });
                      }
                    });
                  });
                }
                //}
              } else {
                callback({
                  status: false,
                  message: "Invalid currency request",
                });
              }
            });
        } else {
          callback({
            status: false,
            message: "Enter valid amount",
          });
        }
      } else {
        callback({
          status: false,
          message: "Enter a valid amount",
        });
      }
    } else {
      callback({
        status: false,
        message: "Invalid details",
      });
    }
  } catch (err) {
    //console.log(err)
    callback({
      status: false,
      message: "Something went wrong",
    });
  }
});

exports.getUserBalance = async function (userId, currency) {
  try {
    var balanceData = await userWalletDB.findOne(
      {
        userId: ObjectId(userId),
      },
      {
        wallets: { $elemMatch: { currencyId: currency } },
      }
    );

    if (balanceData && balanceData.wallets[0]) {
      var walletData = balanceData.wallets[0];
      var obj = {
        totalBalance: walletData.amount,
        balanceHoldTotal: walletData.holdAmount,
        amount_erc20: walletData.amount_erc20,
        amount_bep20: walletData.amount_bep20,
        amount_trc20: walletData.amount_trc20,
        amount_matic: walletData.amount_matic,
      };

      console.log(obj);
      return obj; // Return the balance data
    } else {
      console.log('Wallet data not found.');
      return null; // Return null if no wallet data found
    }
  } catch (error) {
    console.error("ERROR FROM getUserBalance:", error);
    return null; // Return null if an error occurs
  }
};

exports.getUserTradeBalance = async function (userId, currency, callback) {
  try {
    var balanceData = await userWalletDB.findOne(
      {
        userId: ObjectId(userId),
      },
      {
        wallets: { $elemMatch: { currencyId: currency } },
      }
    );

    if (balanceData && balanceData.wallets[0]) {
      var walletData = balanceData.wallets[0];
      var obj = {
        totalBalance: walletData.amount,
        balanceHoldTotal: walletData.holdAmount,
        amount_erc20: walletData.amount_erc20,
        amount_bep20: walletData.amount_bep20,
        amount_trc20: walletData.amount_trc20,
        amount_matic: walletData.amount_matic,
      };

      // console.log(obj);
      callback(obj); // Return the balance data
    } else {
      console.log('Wallet data not found.');
      callback(null); // Return null if no wallet data found
    }
  } catch (error) {
    console.error("ERROR FROM getUserBalance:", error);
    callback(null); // Return null if an error occurs
  }
};

exports.getUserP2PBalance = async function (userId, currency) {
  try {
    var balanceData = await userWalletDB.findOne(
      {
        userId: ObjectId(userId),
      },
      {
        wallets: { $elemMatch: { currencyId: currency } },
      }
    );

    if (balanceData && balanceData.wallets[0]) {
      var walletData = balanceData.wallets[0];
      var obj = {
        totalBalance: walletData.p2p,
        balanceHoldTotal: walletData.p2phold,

      };

      console.log(obj);
      return obj; // Return the balance data
    } else {
      console.log('Wallet data not found.');
      return null; // Return null if no wallet data found
    }
  } catch (error) {
    console.error("ERROR FROM getUserBalance:", error);
    return null; // Return null if an error occurs
  }
};


exports.getUserBalanceCancel = async function (userId, currency) {
  console.log(userId, currency, "userId, currencyuserId, currency");
  try {
    var balanceData = await userWalletDB.findOne({
      userId: userId,
    });
    var walletData = balanceData.wallets;
    var indexing = walletData.findIndex((x) => x.currencySymbol == currency);
    if (indexing != -1) {
      var obj = {
        totalBalance: walletData[indexing].amount,
        balanceHoldTotal: walletData[indexing].holdAmount,
      };
      return obj;
    } else {
      return false;
    }
  } catch (error) {
    console.log("ERROR FROM getUserBalance", error);
    return false;
  }
};

exports.userOrderDetails = function (userId, pair, currency_id, callback) {
  console.log(userId, pair, currency_id, "userId, pair, currency_id,");
  try {
    async.parallel(
      {
        balanceDetails: function (cb) {
          userWalletDB.findOne({ userId: ObjectId(userId) }).exec(cb);
        },

        activeOrder: function (cb) {
          orderDB
            .find({
              userId: ObjectId(userId),
              status: "Active",
            })
            .sort({ _id: -1 })
            .limit(5)
            .exec(cb);
        },
        cancelOrders: function (cb) {
          orderDB
            .find({
              userId: ObjectId(userId),
              status: "cancelled",
            })
            .sort({ _id: -1 })
            .limit(5)
            .exec(cb);
        },

        orderHistory: function (cb) {
          orderConfirmDB
            .find({ $or: [{ buyerUserId: ObjectId(userId) }, { sellerUserId: ObjectId(userId) }] })
            .sort({ created_at: -1 })
            .limit(5)
            .exec(cb);
        },

        pairsDatas: function (cb) {
          tradePairDB.findOne({ pair: pair }).exec(cb);
        },
      },
      async function (err, results) {
        // console.log("error userdetails===",err)
        // console.log("user results===",results)
        if (!err && results && results.balanceDetails && results.pairsDatas) {
          // console.log(']^^^^^^^^^^^^');
          var activeOrders = [];
          var cancelOrders = [];
          var tradeHistory = [];
          var userBalance = {};
          var finalresults = {};

          var pairsData = results.pairsDatas;
          var firstCurrency = pairsData.from_symbol;
          var secCurrency = pairsData.to_symbol;
          // console.log(firstCurrency,'firstCurrency');
          // console.log(secCurrency,'secCurrency');

          var balanceIndex = results.balanceDetails.wallets;
          var indexing = balanceIndex.findIndex(
            (x) => x.currencySymbol == firstCurrency
          );
          var fromCurBal = balanceIndex[indexing].amount;
          // console.log(indexing,'indexing');

          var secIndex = balanceIndex.findIndex(
            (x) => x.currencySymbol == secCurrency
          );
          var toCurBalance = balanceIndex[secIndex].amount;
          // console.log(secIndex,'secIndex',toCurBalance,'toCurBalance');

          // console.log(fromCurBal,'fromCurBalfromCurBal');
          // console.log(toCurBalance,'toCurBalancetoCurBalance');

          finalresults["fromCurrencybalance"] = fromCurBal;
          finalresults["toCurrencyBalance"] = toCurBalance;

          var allOrders = results;
          var activeOrders = allOrders.activeOrder;
          var cancelOrders = allOrders.cancelOrders;
          var tradeHistory = results.orderHistory;
          // console.log(activeOrders,'activeOrders')
          // console.log(cancelOrders,'cancelOrderscancelOrders');;

          finalresults["activeOrders"] = activeOrders;
          finalresults["cancelOrders"] = cancelOrders;
          finalresults["pairDetails"] = results.pairsDatas;
          finalresults["tradeHistory"] = tradeHistory;
          finalresults["UserId"] = userId;

          // socketconnect.emit('userDetails'+encryption(userId.toString()) ,finalresults);
          callback(finalresults);

          // return finalresults;
        }
      }
    );
  } catch (error) {
    console.log("user orderdetails error", error);
    callback(false);
    console.log("ERROR FROM userOrderDetails", error);
  }
};

exports.sendResponseSocekt = function (
  status,
  Message,
  Reaseon,
  userId,
  callback
) {
  try {
    var obj = {
      status: status,
      Message: Message,
      Reaseon: Reaseon,
    };
    socketconnect.emit(
      "socketResponse" + module.exports.encrypt(userId.toString()),
      obj
    );
  } catch (error) {
    console.log("Error From sendResponseSocekt::", error);
  }
};


exports.updateUserBalances = function (userId, currId, amount, OldBal, LastId, type) {
  return new Promise((resolve, reject) => {
    const difference = amount - OldBal;
    const referral = {
      userId: userId,
      currId: currId,
      amount: amount,
      difference: difference,
      OldBal: OldBal,
      LastId: LastId,
      Type: type,
    };

    BalanceUpdationDB.create(referral, (referErr, referRes) => {
      if (referErr) {
        console.error("Error creating referral:", referErr);
        return reject(referErr);
      }
    });

    userWalletDB
      .updateOne(
        { userId: userId, "wallets.currencyId": ObjectId(currId) },
        { $set: { "wallets.$.amount": +amount } },
        { multi: true }
      )
      .exec((balErr, balRes) => {
        if (balErr) {
          console.error("Error updating balance:", balErr);
          return reject(balErr);
        }
        console.log("Balance update result:", balRes);
        resolve(balRes);
      });
  });
};

exports.updateUserTradeBalances = function (userId, currId, amount, OldBal, LastId, type, callback) {
  try {
    const difference = amount - OldBal;
    const referral = {
      userId: userId,
      currId: currId,
      amount: amount,
      difference: difference,
      OldBal: OldBal,
      LastId: LastId,
      Type: type,
    };

    BalanceUpdationDB.create(referral, (referErr, referRes) => {
      if (referErr) {
        console.error("Error creating referral:", referErr);
        callback(false);
      }
    });

    userWalletDB
      .updateOne(
        { userId: userId, "wallets.currencyId": ObjectId(currId) },
        { $set: { "wallets.$.amount": +amount } },
        { multi: true }
      )
      .exec((balErr, balRes) => {
        if (balErr) {
          console.error("Error updating balance:", balErr);
          callback(false);
        }
        console.log("Balance update result:", balRes);
        callback(true);
      });
  }
  catch (err) {
    callback(true);
  }

};

exports.updateUserP2PBalances = async function (userId, currId, amount, OldBal, LastId, type) {
  try {
    const difference = amount - OldBal;
    const referral = {
      userId,
      currId,
      amount,
      difference,
      OldBal,
      LastId,
      Type: type,
    };

    await BalanceUpdationDB.create(referral);

    const result = await userWalletDB.updateOne(
      { userId, "wallets.currencyId": ObjectId(currId) },
      { $set: { "wallets.$.p2p": +amount } },
      { multi: true }
    ).exec();

    console.log("Balance update result:", result);
    return result;
  } catch (error) {
    console.error("Error in updateUserP2PBalances:", error);
    throw error;
  }
};



exports.updateHoldAmount = function (userId, currId, amount) {
  console.log("update hold===", currId);
  amount = amount.toFixed(8);
  userId = userId.toString();
  userWalletDB
    .updateOne(
      {
        $and: [
          { userId: mongoose.mongo.ObjectId(userId) },
          { "wallets.currencyId": ObjectId(currId) },
        ],
      },
      { $set: { "wallets.$.holdAmount": parseFloat(amount) } },
      { multi: true }
    )
    .exec(function (balErr, balRes) { });
};

exports.updatep2pHoldAmount = function (userId, currId, amount) {
  console.log("update userid===", userId);
  console.log("currId===", currId);
  amount = amount.toFixed(8);
  userId = userId.toString();
  userWalletDB
    .updateOne(
      {
        $and: [
          { userId: ObjectId(userId) },
          { "wallets.currencyId": ObjectId(currId) },
        ],
      },
      // { $set: { "wallets.$.holdAmount": parseFloat(amount) } },
      { $set: { "wallets.$.p2phold": parseFloat(amount) } },
      { multi: true }
    )
    .exec(function (balErr, balRes) {

    });
};

exports.updatewithdrawHoldAmount = function (userId, currId, amount) {
  amount = amount.toFixed(8);
  userId = userId.toString();
  userWalletDB
    .updateOne(
      {
        $and: [
          { userId: mongoose.mongo.ObjectId(userId) },
          { "wallets.currencyId": ObjectId(currId) },
        ],
      },
      { $set: { "wallets.$.withdrawAmount": parseFloat(amount) } },
      { multi: true }
    )
    .exec(function (balErr, balRes) {
      console.log("update withdraw hold error===", balErr);
      console.log("update withdraw response===", balRes);
    });
};

// exports.getQrUrl = (url) => {
//   return (
//     "https://chart.googleapis.com/chart?chs=168x168&chld=M|0&cht=qr&chl=" +
//     url +
//     ""
//   );
// };

exports.getQrUrl = (url) => {
  return ("https://quickchart.io/chart?chs=168x168&chld=M|0&cht=qr&chl=" + url + "");
}

exports.pairUpdateToRedis = async function (pair, callback) {
  try {
    let setToRedit = await redisHelper.RedisService.hget("PairDatas", pair);
    if (setToRedit) {
      return setToRedit;
    } else {
      var paris = await tradePairDB.find({});
      console.log(paris, "-----paris-----");

      for (var i = 0; i < paris.length; i++) {
        let setToRedit1 = await redisHelper.RedisService.hset(
          "PairDatas",
          paris[i].pair,
          paris[i]
        );
      }
      let setToRedit2 = await redisHelper.RedisService.hget("PairDatas", pair);
      return setToRedit2;
    }
  } catch (error) {
    console.log("Error from pairUpdateToRedis :::", error);
  }
};

let getadminwallet = (exports.getadminwallet = function (currency, callback) {
  console.log("resdata====", currency);
  adminWalletDB
    .findOne(
      { wallets: { $elemMatch: { currencySymbol: currency } } }
    )
    .exec(function (err, resdata) {
      console.log("call admin wallet", resdata);
      if (resdata && resdata.wallets.length > 0) {
        callback(resdata.wallets[0]);
      }
    });
});

let adminwallet = (exports.adminwallet = function (currency, callback) {
  adminWalletDB
    .findOne({ type: 1 }, { wallets: { $elemMatch: { currencyId: currency } } })
    .exec(function (err, resdata) {
      if (resdata && resdata.wallets.length > 0) {
        callback(resdata.wallets[0]);
      }
    });
});

let updateAdminBalance = (exports.updateAdminBalance = async function (
  currency,
  amount,
  callback
) {
  console.log("updateAdminBalance");
  console.log(currency, amount, "currency, amount,");
  var balRes = await adminWalletDB.updateOne(
    { "wallets.currencySymbol": currency, type: 1 },
    { $set: { "wallets.$.amount": +amount } },
    { multi: true }
  );
  console.log("updateAdminBalance balRes", balRes);
  if (balRes) {
    callback(true);
  } else {
    callback(false);
  }
});

exports.updateActiveOrders = async function (callback) {
  try {
    // Fetch only active or partially active orders in a single operation
    const data = await orderPlace.find({ $or: [{ status: "Active" }, { status: "partially" }] }).lean().exec();

    if (data && data.length > 0) {
      // Push relevant data into Redis without unnecessary filtering
      await redisHelper.RedisService.hset("orderPlaceActive", "Activeorders", data);

      // Check if callback is a function before calling it
      if (typeof callback === 'function') {
        callback(data);
      }
    } else {
      if (typeof callback === 'function') {
        callback([]);
      }
    }
  } catch (error) {
    console.log("Error from updateActiveOrders :::", error);

    // Handle errors gracefully
    if (typeof callback === 'function') {
      callback([]);
    }
  }
};



let getblock_no = (exports.getblock_no = function (callback) {
  try {
    web3.eth.getBlockNumber(function (err, block) {
      if (err) {
        callback({ status: false, err: err.message });
      } else {
        callback({ status: true, block: block });
      }
    });
  } catch (err) {
    callback({ status: false, message: "Something went wrong" });
  }
});
exports.updateDepositBalances = function (
  userId,
  currId,
  amount,
  OldBal,
  LastId,
  type,
  callback
) {
  var difference = amount - OldBal;
  let referral = {
    userId: userId,
    currId: currId,
    amount: amount,
    difference: difference,
    OldBal: OldBal,
    LastId: LastId,
    Type: type,
  };
  BalanceUpdationDB.create(referral, function (referErr, referRes) { });
  //console.log(userId,'userIduserIduserId');
  userWalletDB
    .updateOne(
      { userId: userId, "wallets.currencyId": currId },
      { $set: { "wallets.$.amount": +amount } },
      { multi: true }
    )
    .exec(function (balErr, balRes) {
      if (balRes) {
        callback(balRes);
      } else {
        callback(false);
      }
    });
};

let getAccounts = (exports.getAccounts = async function (callback) {
  try {
    let accounts = await web3.eth.getAccounts();
    console.log("accounts===", accounts);
    if (accounts.length > 0) {
      callback({ status: true, accounts: accounts });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    //console.log("eth accounts catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let get_Balance = (exports.get_Balance = async function (details, callback) {
  try {
    var balance = await web3.eth.getBalance(details.address);
    balance = web3.utils.fromWei(balance, "ether");
    //console.log("balance===",balance)
    if (balance) {
      callback({ status: true, balance: balance });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    //console.log("eth get balance catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let gasPrice = (exports.gasPrice = async function (callback) {
  try {
    var gasprice = await web3.eth.getGasPrice();
    console.log("gasprice===", gasprice);
    if (gasprice) {
      callback({ status: true, gasprice: gasprice });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    console.log("eth get gasprice catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let sendTransaction = (exports.sendTransaction = async function (
  detail,
  callback
) {
  try {
    //console.log("sendtransfer===",detail);
    var amount = web3.utils.toHex(
      web3.utils.toWei(detail.value.toString(), "ether")
    );
    //console.log(amount, "amountamount");
    const accountNonce = await web3.eth.getTransactionCount(detail.from);
    console.log("accountNonce===", accountNonce);
    const txObject = {
      nonce: accountNonce,
      gasLimit: web3.utils.toHex(detail.gasLimit),
      gasPrice: web3.utils.toHex(detail.gasPrice),
      to: detail.to.toString(),
      from: detail.from,
      value: amount,
    };

    var userprivatekey1 = Buffer.from(detail.privateKey, "hex");
    const tx = new Tx(txObject, { chain: process.env.ETH_NETWORK });
    tx.sign(userprivatekey1);
    const serializedTx = tx.serialize();
    console.log(serializedTx);
    const raw1 = "0x" + serializedTx.toString("hex");
    // console.log(raw1);
    web3.eth.sendSignedTransaction(raw1, (err, txHash) => {
      console.log(txHash);
      console.log(err);
      if (txHash != "" && txHash != null && txHash != undefined) {
        callback({ status: true, txn_id: txHash, message: "success" });
      } else {
        callback({ status: false, txn_id: txHash, message: "success" });
      }
    });
  } catch (err) {
    // console.log("bsc send transaction catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let getAddress = (exports.getAddress = async function (callback) {
  try {
    var account = web3.eth.accounts.create();
    //console.log("account===",account)
    if (account) {
      callback({ status: true, account: account });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    // console.log("eth get account catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let get_tokenBalance = (exports.get_tokenBalance = async function (
  detail,
  callback
) {
  try {
    console.log("call erc20 balance", detail);
    let contractAddress = detail.contractAddress;
    let userAddress = detail.userAddress;
    let decimals = detail.decimals;
    // console.log(contractAddress, "contractAddress=====");
    // console.log(userAddress, "userAddress=====");
    // console.log(decimals, "decimals=====");
    let tokenInst = new web3.eth.Contract(minABI, contractAddress);
    tokenInst.methods
      .balanceOf(userAddress)
      .call()
      .then(function (bal) {
        //console.log(bal, "token balance=====");
        var realtokenbalance = bal / Math.pow(10, decimals);
        //console.log(realtokenbalance, "token realtokenbalance=====");
        if (realtokenbalance != null) {
          callback({ status: true, balance: realtokenbalance });
        } else {
          callback({ status: false, message: "Something went wrong" });
        }
      })
      .catch(function (error) {
        console.log("erc20 getbalance catch error====", error);
      });
  } catch (err) {
    console.log("eth get token balance catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let sendtoken = (exports.sendtoken = function (details, callback) {
  var currencyAddress = details.currencyAddress;
  var privateKey = details.privkey;
  var userAddress = details.userAddress;
  var decimals = details.decimals;
  var contractAddr = details.contract_address;
  let contract = new web3.eth.Contract(minABI, contractAddr);
  contract.methods
    .balanceOf(currencyAddress)
    .call(function (err, tokenbalance) {
      //console.log(err);

      var realtokenbalance = tokenbalance / Math.pow(10, decimals);
      // var tokenbalnce = web3.utils.fromWei(tokenbalance, "ether");

      // console.log(tokenbalance, "tokenbalnce");
      if (realtokenbalance > 0) {
        var account = currencyAddress;

        web3.eth.getBalance(account, (err, balance) => {
          //console.log(balance, "jhhk");
          // return false;
          const accountNonce = (
            web3.eth.getTransactionCount(userAddress) + 1
          ).toString(16);
          // console.log("in balance");
          web3.eth.getTransactionCount(account, (err, txCount) => {
            web3.eth.getGasPrice(function (err, getGasPrice) {
              var gaslimit = web3.utils.toHex(70000);
              var fee = web3.utils.toHex(getGasPrice) * gaslimit;
              // console.log(fee, "feeeeeee");
              if (balance > fee) {
                var send_amount = tokenbalance;
                var tokenamount = web3.utils.toHex(send_amount);
                //console.log(tokenamount, "token amount");
                try {
                  //https.get("https://"+config.apitype+".etherscan.io/api?module=contract&action=getabi&address=" + curncydet.contractAddress, (resp) => {
                  // https
                  //   .get(
                  //     "https://"+process.env.ETH_API+"/api?module=contract&action=getabi&address=" +
                  //       contractAddr +
                  //       "&apikey="+process.env.ETHKEY+"",
                  //     (resp) => {
                  //       let data = "";
                  //       resp.on("data", (chunk) => {
                  //         data += chunk;
                  //       });
                  //       resp.on("end", () => {
                  //         var abiResponse = JSON.parse(data);
                  //         if (
                  //           abiResponse.message == "OK" &&
                  //           abiResponse.result != ""
                  //         ) {
                  var contractAddress = contractAddr;
                  //const abi = JSON.parse(abiResponse.result);
                  const abi = minABI;
                  try {
                    erc20.sendERC20Transaction(
                      currencyAddress,
                      userAddress,
                      tokenamount,
                      privateKey,
                      contractAddress,
                      abi,
                      function (txid) {
                        if (txid != "" && txid) {
                          callback({
                            status: true,
                            message: "Succefully transfer",
                            tokenbalnce: realtokenbalance,
                            txHash: txid,
                          });
                        }
                      }
                    );
                  } catch (e) {
                    // console.log("catch",e)
                  }
                  //   } else {
                  //     //console.log(abiResponse)
                  //   }
                  // });
                  //   }
                  // )
                  // .on("error", (err) => {
                  //   //console.log("Error: " + err.message);
                  // });
                } catch (err) {
                  //  console.log('catch',err)
                }
              } else {
                //console.log("no balance");
                web3.eth.getTransactionCount(userAddress, (err, txCount) => {
                  web3.eth.getGasPrice(function (err, getGasPrice) {
                    var gaslimit = web3.utils.toHex(21000);
                    var fee = web3.utils.toHex(getGasPrice) * gaslimit;

                    fee =
                      parseFloat(fee - balance) +
                      parseFloat(web3.utils.toWei("0.008", "ether"));
                    let transactionObject = {
                      from: userAddress,
                      gasLimit: web3.utils.toHex(21000),
                      gasPrice: web3.utils.toHex(getGasPrice),
                      nonce: txCount,
                      to: currencyAddress,
                      value: fee,
                    };
                    var adminprivkey = details.userprivatekey;
                    var userprivatekey1 = Buffer.from(adminprivkey, "hex");

                    const tx = new Tx(transactionObject, {
                      chain: process.env.ETH_NETWORK,
                    });
                    tx.sign(userprivatekey1);
                    const serializedTx = tx.serialize();
                    //console.log(serializedTx);
                    const raw1 = "0x" + serializedTx.toString("hex");
                    //console.log(raw1);

                    web3.eth
                      .sendSignedTransaction(raw1)
                      .on("receipt", function (receipt) {
                        // console.log(receipt, "receipt");
                      })
                      .then(function (receipt) {
                        //console.log("in balance");

                        var send_amount = tokenbalance;
                        var tokenamount = web3.utils.toHex(send_amount);
                        // console.log(tokenamount, "token amount");

                        try {
                          //https.get("https://"+config.apitype+".etherscan.io/api?module=contract&action=getabi&address=" + curncydet.contractAddress, (resp) => {
                          // https
                          //   .get(
                          //     "https://"+process.env.ETH_API+"?module=contract&action=getabi&address=" +
                          //       contractAddr +
                          //       "&apikey="+process.env.ETHKEY+"",
                          //     (resp) => {
                          //       let data = "";
                          //       resp.on("data", (chunk) => {
                          //         data += chunk;
                          //       });
                          //       resp.on("end", () => {
                          //         var abiResponse = JSON.parse(data);
                          //         if (
                          //           abiResponse.message == "OK" &&
                          //           abiResponse.result != ""
                          //         ) {
                          var contractAddress = contractAddr;
                          //const abi = JSON.parse(abiResponse.result);
                          const abi = minABI;
                          try {
                            erc20.sendERC20Transaction(
                              currencyAddress,
                              userAddress,
                              tokenamount,
                              privateKey,
                              contractAddress,
                              abi,
                              function (txid) {
                                if (txid != "" && txid) {
                                  callback({
                                    status: true,
                                    message: "Succefully transfer",
                                    tokenbalnce: realtokenbalance,
                                    txHash: txid,
                                  });
                                }
                              }
                            );
                          } catch (e) {
                            //  console.log("catch",e)
                          }
                          //       } else {
                          //         //  console.log(abiResponse)
                          //       }
                          //     });
                          //   }
                          // )
                          // .on("error", (err) => {
                          //   // console.log("Error: " + err.message);
                          // });
                        } catch (err) {
                          // console.log('catch',err)
                        }
                      });
                  });
                });
              }
            });
          });
        });
      } else {
        //console.log("else part");
        callback({
          status: false,
          message: "There is no new deposit",
        });
      }
    });
});

let hex_convert = (exports.hex_convert = function (number) {
  if (number < 0) {
    number = 0xffffffff + number + 1;
  }

  return "0x" + number.toString(16).toLowerCase();
});

let bnb_tokenwithdraw = (exports.bnb_tokenwithdraw = function (
  details,
  callback
) {
  var account1 = details.account1;
  var privkey = details.privkey.substring(2);
  var useraddress = details.adminaddress;
  var contract_address = details.curcontractaddress;
  var decimal = details.curdecimal;
  var tokenInst = new bsc_web3.eth.Contract(minABI, contract_address);
  tokenInst.methods
    .balanceOf(useraddress)
    .call()
    .then(function (bal) {
      console.log(bal, "token balance=====");
      var usdt_balance = bal / Math.pow(10, decimal);
      console.log(usdt_balance, "usdt_balanceusdt_balance");
      console.log(details.amount, "MOUNTSSS");
      if (usdt_balance > details.amount) {
        console.log(bal / Math.pow(10, decimal), "token----- balance=====");
        var balance = 0;
        bsc_web3.eth.getBalance(useraddress, (err, balance) => {
          balance = balance;
          console.log(balance, "=---0000balance)");
          var balance = bsc_web3.utils.fromWei(balance, "ether");
          bsc_web3.eth.getGasPrice(function (err, getGasPrice) {
            console.log(balance, "console.log(balance);");
            bsc_web3.eth.getTransactionCount(useraddress, (err, txCount) => {
              var gaslimit = bsc_web3.utils.toHex(21000);
              var fee = bsc_web3.utils.toHex(getGasPrice) * gaslimit;
              var tokenamount = details.amount * Math.pow(10, decimal);
              //tokenamount = bsc_web3.utils.toHex(tokenamount);
              tokenamount = hex_convert(tokenamount);
              console.log(tokenamount, "token amount222");
              //   console.log(bsc_web3.utils.toHex(tokenamount), "token amount333");
              //   return false;
              var data = tokenInst.methods
                .transfer(account1, tokenamount)
                .encodeABI();
              let transactionObject = {
                gasLimit: bsc_web3.utils.toHex(200000),
                gasPrice: bsc_web3.utils.toHex(getGasPrice),
                data: data,
                nonce: bsc_web3.utils.toHex(txCount),
                from: useraddress,
                to: contract_address,
                value: "0x0",
                chainId: 1,
                // value:web3.utils.toHex(web3.utils.toWei(tokenamount,'ether'))
              };
              //console.log(privkey, "privkeyprivkey");
              //console.log(transactionObject, "transactionObject");

              var userprivatekey1 = Buffer.from(privkey, "hex");

              const BSC_MAIN = bsc_Common.custom({
                name: "bnb",
                networkId: process.env.BNB_CHAIN,
                chainId: process.env.BNB_CHAIN,
              });

              const tx = new Tx(transactionObject, { common: BSC_MAIN });

              tx.sign(userprivatekey1);
              const serializedTx = tx.serialize();
              const raw1 = "0x" + serializedTx.toString("hex");

              bsc_web3.eth.sendSignedTransaction(raw1, (err, txHash) => {
                console.log(err, "err");
                console.log(txHash, "txHash");
                if (txHash) {
                  callback({
                    status: true,
                    message: "Succefully transfer",
                    txHash: txHash,
                  });
                } else {
                  callback({
                    status: false,
                    message: "Please try again later",
                  });
                }
              });
            });
          });
        });
      } else {
        callback({
          status: false,
          message: "Insufficient balance from admin",
        });
      }
    });
});

let tokenwithdraw = (exports.tokenwithdraw = function (details, callback) {
  var account1 = details.account1;
  var privkey = details.privkey.substring(2);
  var useraddress = details.adminaddress;
  var contract_address = details.curcontractaddress;
  var decimal = details.curdecimal;
  var tokenInst = new web3.eth.Contract(minABI, contract_address);
  tokenInst.methods
    .balanceOf(useraddress)
    .call()
    .then(function (bal) {
      console.log(bal, "token balance=====");
      var usdt_balance = bal / Math.pow(10, decimal);
      console.log(usdt_balance, "usdt_balanceusdt_balance");
      if (usdt_balance > details.amount) {
        console.log(bal / Math.pow(10, decimal), "token----- balance=====");
        var balance = 0;
        web3.eth.getBalance(useraddress, (err, balance) => {
          balance = balance;
          console.log(balance, "=---0000balance)");
          var balance = web3.utils.fromWei(balance, "ether");
          web3.eth.getGasPrice(function (err, getGasPrice) {
            console.log(balance, "console.log(balance);");
            web3.eth.getTransactionCount(useraddress, (err, txCount) => {
              var gaslimit = web3.utils.toHex(21000);
              var fee = web3.utils.toHex(getGasPrice) * gaslimit;
              var tokenamount = details.amount * Math.pow(10, decimal);
              tokenamount = web3.utils.toHex(tokenamount);
              console.log(tokenamount, "token amount");
              var data = tokenInst.methods
                .transfer(account1, tokenamount)
                .encodeABI();
              let transactionObject = {
                gasLimit: web3.utils.toHex(70000),
                gasPrice: web3.utils.toHex(getGasPrice),
                data: data,
                nonce: web3.utils.toHex(txCount),
                from: useraddress,
                to: contract_address,
                value: "0x0",
                chainId: 1,
                // value:web3.utils.toHex(web3.utils.toWei(tokenamount,'ether'))
              };
              console.log(privkey, "privkeyprivkey");
              console.log(transactionObject, "transactionObject");

              var userprivatekey1 = Buffer.from(privkey, "hex");

              const tx = new Tx(transactionObject, {
                chain: process.env.ETH_NETWORK,
              });

              tx.sign(userprivatekey1);
              const serializedTx = tx.serialize();
              const raw1 = "0x" + serializedTx.toString("hex");

              web3.eth.sendSignedTransaction(raw1, (err, txHash) => {
                console.log(err, "err");
                console.log(txHash, "txHash");
                if (txHash) {
                  callback({
                    status: true,
                    message: "Succefully transfer",
                    txHash: txHash,
                  });
                } else {
                  callback({
                    status: false,
                    message: "Please try again later",
                  });
                }
              });
            });
          });
        });
      } else {
        callback({
          status: false,
          message: "Insufficient balance from admin",
        });
      }
    });
});

let tron_balance = (exports.tron_balance = async function (details, callback) {
  try {
    var address = details.address;
    var headers = {
      "content-type": "application/json;",
    };
    // console.log("tron balance address===",address);
    var dataString = '{"address":"' + address + '"}';

    var options = {
      url: "https://" + trxhost + "/wallet/getaccount",
      method: "POST",
      headers: headers,
      body: dataString,
    };

    function call(error, response, body) {
      if (!error && response.statusCode == 200) {
        var response = JSON.parse(body);
        //console.log("trx get balance===",response);
        if (Object.keys(response).length > 0) {
          callback({
            status: true,
            balance: response.balance,
            address: address,
          });
        } else {
          callback({ status: false, message: "Something went wrong" });
        }
      }
    }

    request(options, call);
  } catch (err) {
    //console.log("trx balance catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let tron_sendtransaction = (exports.tron_sendtransaction = async function (
  details,
  callback
) {
  try {
    var amount = details.amount;
    var headers = {
      "content-type": "application/json;",
    };

    var dataString =
      '{"privateKey":"' +
      details.privateKey +
      '","toAddress":"' +
      details.to_address +
      '","amount":' +
      amount +
      "}";

    var options = {
      url: "https://" + trxhost + "/wallet/easytransferbyprivate",
      method: "POST",
      headers: headers,
      body: dataString,
    };

    function call(error, response, body) {
      console.log("tron move error====", error);
      console.log("tron move response====", response);
      if (!error && response.statusCode == 200) {
        var response = JSON.parse(body);
        console.log("tron move response====", response);
        if (response.result) {
          callback({ status: true, response: response.transaction.txID });
        } else {
          callback({ status: false, message: "Something went wrong" });
        }
      }
    }

    request(options, call);
  } catch (err) {
    console.log("trx send transaction catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

// let tron_withdraw = (exports.tron_withdraw = async function (
//   details,
//   callback
// ) {
//   try {
//     var amount = details.amount;
//     var headers = {
//       "content-type": "application/json;",
//     };

//     var dataString =
//       '{"privateKey":"' +
//       details.privateKey +
//       '","toAddress":"' +
//       details.to_address +
//       '","amount":' +
//       amount +
//       ',"visible":true}';

//     var options = {
//       url: "https://" + trxhost + "/wallet/easytransferbyprivate",
//       method: "POST",
//       headers: headers,
//       body: dataString,
//     };

//     function call(error, response, body) {
//       console.log("trx error===", error);
//       // console.log("trx response===",response)
//       // console.log("trx getsign bbody===",body)
//       if (!error && response.statusCode == 200) {
//         var response = JSON.parse(body);
//         console.log("trx getsign response===", response);
//         console.log("trx response.result.result===", response.result.result);
//         console.log("trx response.result.result===", response.result.result);
//         console.log(
//           "trx response.transaction.txID===",
//           response.transaction.txID
//         );
//         if (response.result.result) {
//           callback({status: true, response: response.transaction.txID});
//         } else {
//           callback({status: false, message: "Something went wrong"});
//         }
//       }
//     }

//     request(options, call);
//   } catch (err) {
//     console.log("trx send transaction catch===", err);
//     callback({status: false, message: "Something went wrong"});
//   }
// });

let tron_withdraw = (exports.tron_withdraw = async function (
  details,
  callback
) {
  try {
    console.log("send tron details", details);
    const tronHost = new TronWeb({
      fullHost: "https://api.nileex.io",
      privateKey: decryptionLevel(details.privateKey),
    });

    const txObject = await tronHost.transactionBuilder.sendTrx(
      details.to_address,
      details.amount,
      details.from_address
    );

    // Sign the transaction
    const signedTx = await tronHost.trx.sign(
      txObject,
      decryptionLevel(details.privateKey)
    );
    const result = await tronHost.trx.sendRawTransaction(signedTx);
    console.log("Transaction ID:", result.txid);

    if (result.txid != null) {
      callback({ status: true, response: result.txid });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    console.log("trx send transaction catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

// let trc20_balance = (exports.trc20_balance = async function (
//   details,
//   callback
// ) {
//   try {
//     const privateKey = decryptionLevel(details.privatekey);
//     const address = details.address;
//     const contractAddress = details.contractAddress;
//     const decimal = details.decimal;
//     const tronWeb = new TronWeb(
//       fullNode,
//       solidityNode,
//       eventServer,
//       privateKey
//     );
//     let contract = await tronWeb.contract().at(contractAddress);
//     let result = await contract.balanceOf(address).call();
//     //console.log("balance response trc20====",result);
//     if (result) {
//       let balance_res = converter.hexToDec(result._hex);
//       //console.log("convert balance==",balance_res)
//       let balance = balance_res / Math.pow(10, decimal);
//       //console.log("balancess==",balance);
//       callback({status: true, balance: balance});
//     } else {
//       callback({status: false, message: "Something went wrong"});
//     }
//   } catch (err) {
//     //console.log("trc20 get balance error====",err);
//     callback({status: false, message: "Something went wrong"});
//   }
// });

let trc20_balance = (exports.trc20_balance = async function (
  details,
  callback
) {
  try {
    const privateKey = decryptionLevel(details.privatekey);
    const address = details.address;
    const contractAddress = details.contractAddress;
    const decimal = details.decimal;
    const tronWeb = new TronWeb(
      fullNode,
      solidityNode,
      eventServer,
      privateKey
    );
    let contract = await tronWeb.contract().at(contractAddress);
    let result = await contract.balanceOf(address).call();
    //console.log("balance response trc20====",result);
    if (result) {
      let balance_res = converter.hexToDec(result._hex);
      //console.log("convert balance==",balance_res)
      let balance = balance_res / Math.pow(10, decimal);
      //console.log("balancess==",balance);
      callback({ status: true, balance: balance });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    console.log("trc20 get balance error====", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let trx_balance = (exports.trx_balance = async function (details, callback) {
  console.log("tronbalance")
  try {
    var address = details.address;
    var headers = {
      "content-type": "application/json;",
    };
    //console.log("tron balance address===",address);
    var dataString = '{"address":"' + address + '","visible":true}';

    var options = {
      url: "https://" + trxhost + "/wallet/getaccount",
      method: "POST",
      headers: headers,
      body: dataString,
    };

    function call(error, response, body) {
      if (!error && response.statusCode == 200) {
        var response = JSON.parse(body);
        console.log("trx get balance===", response);
        if (Object.keys(response).length > 0) {
          var balance = response.balance / 1000000;
          callback({ status: true, balance: balance, address: address });
        } else {
          callback({ status: false, message: "Something went wrong" });
        }
      }
    }

    request(options, call);
  } catch (err) {
    //console.log("trx balance catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

// let trc20_withdraw = (exports.trc20_withdraw = async function (
//   details,
//   callback
// ) {
//   try {
//     const privateKey = decryptionLevel(details.privateKey);
//     const address = details.to_address;
//     const contractAddress = details.contractAddress;
//     const decimal = details.decimal;
//     const amount = details.amount;
//     const tronWeb = new TronWeb(
//       fullNode,
//       solidityNode,
//       eventServer,
//       privateKey
//     );
//     let contract = await tronWeb.contract().at(contractAddress);
//     var transfer = await contract
//       .transfer(
//         address, //address _to
//         amount //amount
//       )
//       .send({
//         feeLimit: 10000000,
//       });
//     //console.log("trc20 withdraw response trc20====",transfer);
//     if (transfer) {
//       callback({status: true, response: transfer});
//     } else {
//       callback({status: false, message: "Something went wrong"});
//     }
//   } catch (err) {
//     console.log("trc20 transfer error====", err);
//     callback({status: false, message: "Something went wrong"});
//   }
// });

let trc20_withdraw = (exports.trc20_withdraw = async function (
  details,
  callback
) {
  try {
    const privateKey = decryptionLevel(details.privateKey);
    const address = details.to_address;
    const contractAddress = details.contractAddress;
    const decimal = details.decimal;
    const amount = details.amount * Math.pow(10, decimal);
    const tronWeb = new TronWeb(
      fullNode,
      solidityNode,
      eventServer,
      privateKey
    );
    tronWeb.setAddress(details.from_address);
    let contract = await tronWeb.contract().at(contractAddress);
    var transfer = await contract
      .transfer(
        address, //address _to
        amount //amount
      )
      .send({
        feeLimit: 20000000,
      });
    console.log("trc20 withdraw response trc20====", transfer);
    if (transfer) {
      callback({ status: true, response: transfer });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    console.log("trc20 transfer error====", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let eth_address = (exports.eth_address = async function (callback) {
  try {
    var account = web3.eth.accounts.create();
    var obj = {
      address: account.address.toLowerCase(),
      privateKey: encryptionLevel(account.privateKey),
    };
    console.log(obj);
    callback(obj);
  } catch (err) {
    //console.log("eth address catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let tron_address = (exports.tron_address = async function (callback) {
  try {
    const TronWeb = require("tronweb");
    const tronWeb = new TronWeb({
      fullHost: "https://api.trongrid.io",
    });
    var account = await tronWeb.createAccount();
    const address = account.address.base58;
    const hex_address = account.address.hex;
    const private_key = account.privateKey;
    callback({
      address: address,
      hex_address: hex_address,
      private_key: encryptionLevel(private_key),
    });
  } catch (err) {
    // console.log("eth address catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let bnb_address = (exports.bnb_address = async function (callback) {
  try {
    var account = bsc_web3.eth.accounts.create();
    var obj = {
      address: account.address.toLowerCase(),
      privateKey: encryptionLevel(account.privateKey),
    };
    console.log(obj);
    callback(obj);
  } catch (err) {
    //console.log("bnb address catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let bnb_Balance = (exports.bnb_Balance = async function (details, callback) {
  try {
    var balance = await bsc_web3.eth.getBalance(details.address);
    balance = web3.utils.fromWei(balance, "ether");
    console.log("arbbalance===", balance);
    if (balance != null) {
      callback({ status: true, balance: balance });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    //console.log("bnb get balance catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});


let arbit_balance = (exports.arbit_balance = async function (details, callback) {
  try {
    var balance = await arb_web3.eth.getBalance(details.address);
    balance = web3.utils.fromWei(balance, "ether");
    //console.log("balance===",balance);
    if (balance != null) {
      callback({ status: true, balance: balance });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    //console.log("bnb get balance catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let bep20_Balance = (exports.bep20_Balance = async function (detail, callback) {
  try {
    let contractAddress = detail.contractAddress;
    let userAddress = detail.userAddress;
    let decimals = detail.decimals;
    var tokenInst = new bsc_web3.eth.Contract(minABI, contractAddress);
    tokenInst.methods
      .balanceOf(userAddress)
      .call()
      .then(function (bal) {
        console.log(bal, "token balance=====");
        var realtokenbalance = bal / Math.pow(10, decimals);
        console.log(realtokenbalance, "token realtokenbalance=====");
        if (realtokenbalance != null) {
          callback({ status: true, balance: realtokenbalance });
        } else {
          callback({ status: false, message: "Something went wrong" });
        }
      })
      .catch(function (error) {
        console.log("bep20 getbalance catch error====", error);
      });
  } catch (err) {
    console.log("bnb get token balance catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let bnb_gasPrice = (exports.bnb_gasPrice = async function (callback) {
  try {
    var gasprice = await bsc_web3.eth.getGasPrice();
    console.log("gasprice===", gasprice);
    if (gasprice) {
      callback({ status: true, gasprice: gasprice });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    //console.log("bnb get gasprice catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let bnb_sendTransaction = (exports.bnb_sendTransaction = async function (
  detail,
  callback
) {
  try {
    console.log("-0-0-0-0-0-0-0-0-0-0-0-0-===");
    console.log("-0-0-0-0-0-0-0-0-0-0-0-0-===", detail);
    var amount = bsc_web3.utils.toHex(
      bsc_web3.utils.toWei(detail.value.toString(), "ether")
    );
    console.log(amount, "amountamount");
    const accountNonce = await bsc_web3.eth.getTransactionCount(detail.from);
    console.log("accountNonce===", accountNonce);
    const txObject = {
      nonce: accountNonce,
      gasLimit: bsc_web3.utils.toHex(detail.gasLimit),
      gasPrice: bsc_web3.utils.toHex(detail.gasPrice),
      to: detail.to.toString(),
      from: detail.from,
      value: amount,
    };
    console.log("txObject===", txObject);

    var userprivatekey1 = Buffer.from(detail.privateKey, "hex");
    //console.log("txObuserprivatekey1ject===", userprivatekey1);

    const BSC_MAIN = bsc_Common.custom({
      name: "bnb",
      networkId: process.env.BNB_CHAIN,
      chainId: process.env.BNB_CHAIN,
    });
    //console.log("BSC_MAIN===", BSC_MAIN);

    const tx = new Tx(txObject, { common: BSC_MAIN });

    // const tx = new Tx(txObject, { chain: "ropsten" });
    console.log("tx===", tx);

    tx.sign(userprivatekey1);
    const serializedTx = tx.serialize();
    console.log(serializedTx);
    const raw1 = "0x" + serializedTx.toString("hex");
    console.log(raw1, "-=-=-=-=-=-=-=-=-=-=-=-====");
    bsc_web3.eth.sendSignedTransaction(raw1, (err, txHash) => {
      console.log("txHash===", txHash);
      console.log("err", err);
      callback({ status: true, txn_id: txHash, message: "success" });
    });
  } catch (err) {
    console.log("bsc send transaction catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let bnb_sendtoken = (exports.bnb_sendtoken = function (details, callback) {
  var currencyAddress = details.currencyAddress;
  var privateKey = details.privkey;
  var userAddress = details.userAddress;
  var decimals = details.decimals;
  var contractAddr = details.contract_address;
  let contract = new bsc_web3.eth.Contract(minABI, contractAddr);
  contract.methods
    .balanceOf(currencyAddress)
    .call(function (err, tokenbalance) {
      //console.log(err);

      var realtokenbalance = tokenbalance / Math.pow(10, decimals);
      // var tokenbalnce = web3.utils.fromWei(tokenbalance, "ether");

      // console.log(tokenbalance, "tokenbalnce");
      if (realtokenbalance > 0) {
        var account = currencyAddress;

        bsc_web3.eth.getBalance(account, (err, balance) => {
          //console.log(balance, "jhhk");
          // return false;
          const accountNonce = (
            bsc_web3.eth.getTransactionCount(userAddress) + 1
          ).toString(16);
          // console.log("in balance");
          bsc_web3.eth.getTransactionCount(account, (err, txCount) => {
            bsc_web3.eth.getGasPrice(function (err, getGasPrice) {
              var gaslimit = bsc_web3.utils.toHex(200000);
              var fee = bsc_web3.utils.toHex(getGasPrice) * gaslimit;
              console.log(fee, "feeeeeee");
              console.log(balance, "balancebalance");
              if (balance > fee) {
                var send_amount = tokenbalance;
                var tokenamount = bsc_web3.utils.toHex(send_amount);
                console.log(tokenamount, "token amount");
                try {
                  // https
                  //   .get(
                  //     "https://"+process.env.BSC_API+"/api?module=contract&action=getabi&address=" +
                  //       contractAddr +
                  //       "&apikey="+process.env.BSCTOKEN+"",
                  //     (resp) => {
                  //       let data = "";
                  //       resp.on("data", (chunk) => {
                  //         data += chunk;
                  //       });
                  //       resp.on("end", () => {
                  //         var abiResponse = JSON.parse(data);
                  //         console.log("bnb send token abiResponse",abiResponse)
                  //         if (
                  //           abiResponse.message == "OK" &&
                  //           abiResponse.result != ""
                  //         ) {
                  var contractAddress = contractAddr;
                  //const abi = JSON.parse(abiResponse.result);
                  const abi = minABI;
                  console.log("call here ====");
                  try {
                    bep20.sendBEP20Transaction(
                      currencyAddress,
                      userAddress,
                      tokenamount,
                      privateKey,
                      contractAddress,
                      abi,
                      function (txid) {
                        if (txid != "" && txid) {
                          callback({
                            status: true,
                            message: "Succefully transfer",
                            tokenbalnce: realtokenbalance,
                            txHash: txid,
                          });
                        }
                      }
                    );
                  } catch (e) {
                    // console.log("catch",e)
                  }
                  //       } else {
                  //         //console.log(abiResponse)
                  //       }
                  //     });
                  //   }
                  // )
                  // .on("error", (err) => {
                  //   //console.log("Error: " + err.message);
                  // });
                } catch (err) {
                  console.log("catch", err);
                }
              } else {
                console.log("no balance");
                bsc_web3.eth.getTransactionCount(
                  userAddress,
                  (err, txCount) => {
                    bsc_web3.eth.getGasPrice(function (err, getGasPrice) {
                      var gaslimit = bsc_web3.utils.toHex(21000);
                      var fee = bsc_web3.utils.toHex(getGasPrice) * gaslimit;

                      fee =
                        parseFloat(fee - balance) +
                        parseFloat(bsc_web3.utils.toWei("0.008", "ether"));
                      let transactionObject = {
                        from: userAddress,
                        gasLimit: bsc_web3.utils.toHex(21000),
                        gasPrice: bsc_web3.utils.toHex(getGasPrice),
                        nonce: txCount,
                        to: currencyAddress,
                        value: fee,
                      };
                      var adminprivkey = details.userprivatekey;
                      var userprivatekey1 = Buffer.from(adminprivkey, "hex");

                      const BSC_MAIN = bsc_Common.custom({
                        name: "bnb",
                        networkId: process.env.BNB_CHAIN,
                        chainId: process.env.BNB_CHAIN,
                      });

                      const tx = new Tx(transactionObject, {
                        common: BSC_MAIN,
                      });

                      tx.sign(userprivatekey1);
                      const serializedTx = tx.serialize();
                      //console.log(serializedTx);
                      const raw1 = "0x" + serializedTx.toString("hex");
                      //console.log(raw1);

                      bsc_web3.eth
                        .sendSignedTransaction(raw1)
                        .on("receipt", function (receipt) {
                          // console.log(receipt, "receipt");
                        })
                        .then(function (receipt) {
                          //console.log("in balance");

                          var send_amount = tokenbalance;
                          var tokenamount = bsc_web3.utils.toHex(send_amount);
                          // console.log(tokenamount, "token amount");

                          try {
                            // https
                            //   .get(
                            //     "https://"+process.env.BSC_API+"?module=contract&action=getabi&address=" +
                            //       contractAddr +
                            //       "&apikey="+process.env.BSCTOKEN+"",
                            //     (resp) => {
                            //       let data = "";
                            //       resp.on("data", (chunk) => {
                            //         data += chunk;
                            //       });
                            //       resp.on("end", () => {
                            //         var abiResponse = JSON.parse(data);
                            //         if (
                            //           abiResponse.message == "OK" &&
                            //           abiResponse.result != ""
                            //         ) {
                            var contractAddress = contractAddr;
                            // const abi = JSON.parse(
                            //   abiResponse.result
                            // );
                            const abi = minABI;
                            try {
                              bep20.sendBEP20Transaction(
                                currencyAddress,
                                userAddress,
                                tokenamount,
                                privateKey,
                                contractAddress,
                                abi,
                                function (txid) {
                                  if (txid != "" && txid) {
                                    callback({
                                      status: true,
                                      message: "Succefully transfer",
                                      tokenbalnce: realtokenbalance,
                                      txHash: txid,
                                    });
                                  }
                                }
                              );
                            } catch (e) {
                              console.log("catch bepe20", e);
                            }
                            //       } else {
                            //         //  console.log(abiResponse)
                            //       }
                            //     });
                            //   }
                            // )
                            // .on("error", (err) => {
                            //  console.log("Error: bep20 token " + err.message);
                            // });
                          } catch (err) {
                            console.log("catch bep20 token error", err);
                          }
                        });
                    });
                  }
                );
              }
            });
          });
        });
      } else {
        console.log("else part");
        callback({
          status: false,
          message: "There is no new deposit",
        });
      }
    });
});

//MATIC FUNCTIONALITIES

let matic_address = (exports.matic_address = async function (callback) {
  try {
    var account = matic_web3.eth.accounts.create();
    var obj = {
      address: account.address.toLowerCase(),
      privateKey: encryptionLevel(account.privateKey),
    };
    console.log(obj, "matic_address-0-0-0matic_address0-0-matic_address");
    callback(obj);
  } catch (err) {
    //console.log("bnb address catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let matic_Balance = (exports.matic_Balance = async function (
  details,
  callback
) {
  console.log(details, "=-=-=-=-=-=-=")
  try {
    var balance = await matic_web3.eth.getBalance(details.address);
    balance = web3.utils.fromWei(balance, "ether");
    console.log("maticblance===", balance);
    if (balance != null) {
      callback({ status: true, balance: balance });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    console.log("matic get balance catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let matic_token_Balance = (exports.matic_token_Balance = async function (
  detail,
  callback
) {
  try {
    let contractAddress = detail.contractAddress;
    let userAddress = detail.userAddress;
    let decimals = detail.decimals;
    var tokenInst = new matic_web3.eth.Contract(minABI, contractAddress);
    tokenInst.methods
      .balanceOf(userAddress)
      .call()
      .then(function (bal) {
        //console.log(bal, "token balance=====");
        var realtokenbalance = bal / Math.pow(10, decimals);
        //console.log(realtokenbalance, "token realtokenbalance=====");
        if (realtokenbalance != null) {
          callback({ status: true, balance: realtokenbalance });
        } else {
          callback({ status: false, message: "Something went wrong" });
        }
      })
      .catch(function (error) {
        //console.log("bep20 getbalance catch error====",error);
      });
  } catch (err) {
    //console.log("bnb get token balance catch===",err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let matic_gasPrice = (exports.matic_gasPrice = async function (callback) {
  try {
    var gasprice = await matic_web3.eth.getGasPrice();
    console.log("gmaticasprice===", gasprice);
    if (gasprice != null && gasprice != undefined) {
      callback({ status: true, gasprice: gasprice });
    } else {
      callback({ status: false, message: "Something went wrong" });
    }
  } catch (err) {
    console.log("bnb get gasprice catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let matic_sendTransaction = (exports.matic_sendTransaction = async function (
  detail,
  callback
) {
  try {
    console.log("sendtransfer===", detail);
    var amount = matic_web3.utils.toHex(
      matic_web3.utils.toWei(detail.value.toString(), "ether")
    );
    //console.log(amount, "amountamount");
    const accountNonce = await matic_web3.eth.getTransactionCount(detail.from);
    console.log("accountNonce===", accountNonce);
    const txObject = {
      nonce: accountNonce,
      gasLimit: matic_web3.utils.toHex(detail.gasLimit),
      gasPrice: matic_web3.utils.toHex(detail.gasPrice),
      to: detail.to.toString(),
      from: detail.from,
      value: amount,
    };

    var userprivatekey1 = Buffer.from(detail.privateKey, "hex");

    const MATIC_MAIN = bsc_Common.custom({
      name: "matic",
      networkId: process.env.MATIC_CHAIN,
      chainId: process.env.MATIC_CHAIN,
    });
    const tx = new Tx(txObject, { common: MATIC_MAIN });

    tx.sign(userprivatekey1);
    const serializedTx = tx.serialize();
    console.log(serializedTx);
    const raw1 = "0x" + serializedTx.toString("hex");
    console.log(raw1, "raw1====");
    matic_web3.eth.sendSignedTransaction(raw1, (err, txHash) => {
      console.log("txHash===", txHash);
      console.log("err", err);
      callback({ status: true, txn_id: txHash, message: "success" });
    });
  } catch (err) {
    console.log("matic send transaction catch===", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let matic_sendtoken = (exports.matic_sendtoken = function (details, callback) {
  var currencyAddress = details.currencyAddress;
  var privateKey = details.privkey;
  var userAddress = details.userAddress;
  var decimals = details.decimals;
  var contractAddr = details.contract_address;
  let contract = new matic_web3.eth.Contract(minABI, contractAddr);
  contract.methods
    .balanceOf(currencyAddress)
    .call(function (err, tokenbalance) {
      //console.log(err);

      var realtokenbalance = tokenbalance / Math.pow(10, decimals);
      // var tokenbalnce = web3.utils.fromWei(tokenbalance, "ether");

      // console.log(tokenbalance, "tokenbalnce");
      if (realtokenbalance > 0) {
        var account = currencyAddress;

        matic_web3.eth.getBalance(account, (err, balance) => {
          //console.log(balance, "jhhk");
          // return false;
          const accountNonce = (
            matic_web3.eth.getTransactionCount(userAddress) + 1
          ).toString(16);
          // console.log("in balance");
          matic_web3.eth.getTransactionCount(account, (err, txCount) => {
            matic_web3.eth.getGasPrice(function (err, getGasPrice) {
              var gaslimit = matic_web3.utils.toHex(200000);
              var fee = matic_web3.utils.toHex(getGasPrice) * gaslimit;
              console.log(fee, "feeeeeee");
              console.log(balance, "balancebalance");
              if (balance > fee) {
                var send_amount = tokenbalance;
                var tokenamount = matic_web3.utils.toHex(send_amount);
                console.log(tokenamount, "token amount");
                try {
                  https
                    .get(
                      process.env.MATIC_API +
                      "api?module=contract&action=getabi&address=" +
                      contractAddr +
                      "&apikey=" +
                      process.env.MATIC_API_KEY +
                      "",
                      (resp) => {
                        let data = "";
                        resp.on("data", (chunk) => {
                          data += chunk;
                        });
                        resp.on("end", () => {
                          var abiResponse = JSON.parse(data);
                          if (
                            abiResponse.message == "OK" &&
                            abiResponse.result != ""
                          ) {
                            var contractAddress = contractAddr;
                            const abi = JSON.parse(abiResponse.result);
                            console.log("call here ====");
                            try {
                              matic.sendMATICTransaction(
                                currencyAddress,
                                userAddress,
                                tokenamount,
                                privateKey,
                                contractAddress,
                                abi,
                                function (txid) {
                                  if (txid != "" && txid) {
                                    callback({
                                      status: true,
                                      message: "Succefully transfer",
                                      tokenbalnce: realtokenbalance,
                                      txHash: txid,
                                    });
                                  }
                                }
                              );
                            } catch (e) {
                              // console.log("catch",e)
                            }
                          } else {
                            //console.log(abiResponse)
                          }
                        });
                      }
                    )
                    .on("error", (err) => {
                      //console.log("Error: " + err.message);
                    });
                } catch (err) {
                  console.log("catch", err);
                }
              } else {
                console.log("no balance");
                matic_web3.eth.getTransactionCount(
                  userAddress,
                  (err, txCount) => {
                    matic_web3.eth.getGasPrice(function (err, getGasPrice) {
                      var gaslimit = matic_web3.utils.toHex(21000);
                      var fee = matic_web3.utils.toHex(getGasPrice) * gaslimit;

                      fee =
                        parseFloat(fee - balance) +
                        parseFloat(matic_web3.utils.toWei("0.008", "ether"));
                      let transactionObject = {
                        from: userAddress,
                        gasLimit: matic_web3.utils.toHex(21000),
                        gasPrice: matic_web3.utils.toHex(getGasPrice),
                        nonce: txCount,
                        to: currencyAddress,
                        value: fee,
                      };
                      var adminprivkey = details.userprivatekey;
                      var userprivatekey1 = Buffer.from(adminprivkey, "hex");

                      const MATIC_MAIN = bsc_Common.custom({
                        name: "matic",
                        networkId: process.env.MATIC_CHAIN,
                        chainId: process.env.MATIC_CHAIN,
                      });
                      const tx = new Tx(transactionObject, {
                        common: MATIC_MAIN,
                      });

                      tx.sign(userprivatekey1);
                      const serializedTx = tx.serialize();
                      //console.log(serializedTx);
                      const raw1 = "0x" + serializedTx.toString("hex");
                      //console.log(raw1);

                      matic_web3.eth
                        .sendSignedTransaction(raw1)
                        .on("receipt", function (receipt) {
                          // console.log(receipt, "receipt");
                        })
                        .then(function (receipt) {
                          //console.log("in balance");

                          var send_amount = tokenbalance;
                          var tokenamount = matic_web3.utils.toHex(send_amount);
                          // console.log(tokenamount, "token amount");

                          try {
                            https
                              .get(
                                process.env.MATIC_API +
                                "api?module=contract&action=getabi&address=" +
                                contractAddr +
                                "&apikey=" +
                                process.env.MATIC_API_KEY +
                                "",
                                (resp) => {
                                  let data = "";
                                  resp.on("data", (chunk) => {
                                    data += chunk;
                                  });
                                  resp.on("end", () => {
                                    var abiResponse = JSON.parse(data);
                                    if (
                                      abiResponse.message == "OK" &&
                                      abiResponse.result != ""
                                    ) {
                                      var contractAddress = contractAddr;
                                      const abi = JSON.parse(
                                        abiResponse.result
                                      );
                                      try {
                                        matic.sendMATICTransaction(
                                          currencyAddress,
                                          userAddress,
                                          tokenamount,
                                          privateKey,
                                          contractAddress,
                                          abi,
                                          function (txid) {
                                            if (txid != "" && txid) {
                                              callback({
                                                status: true,
                                                message: "Succefully transfer",
                                                tokenbalnce: realtokenbalance,
                                                txHash: txid,
                                              });
                                            }
                                          }
                                        );
                                      } catch (e) {
                                      }
                                    } else {
                                    }
                                  });
                                }
                              )
                              .on("error", (err) => {
                                // console.log("Error: " + err.message);
                              });
                          } catch (err) {
                            // console.log('catch',err)
                          }
                        });
                    });
                  }
                );
              }
            });
          });
        });
      } else {
        //console.log("else part");
        callback({
          status: false,
          message: "There is no new deposit",
        });
      }
    });
});

exports.sitedata = function (data) {
  try {
    // settingsDB.findOne().exec((err, data) => {
    //   console.log(data, "data");
    var obj = {
      siteLogo: data.siteLogo,
      Favicon: data.Favicon,
      undermaintenenceStatus: data.undermaintenenceStatus,
      kycStatus: data.kycStatus,
      siteName: data.siteName,
      copy_right_text: data.copy_right_text,
      fb_url: data.fb_url,
      youtube_url: data.youtube_url,
      insta_url: data.insta_url,
      telegram_url: data.telegram_url,
      twitter_url: data.twitter_url,
      linkedin_url: data.linkedin_url,
      sendgrid_api: data.sendgrid_api,
      sendgrid_mail: data.sendgrid_mail,
      binance_apikey: data.binance_apikey,
      binance_secretkey: data.binance_secretkey,
    };
    console.log(obj, "ojalkdjfdklsj");
    socketconnect.emit("sitesettings", obj);
    // });
  } catch (err) {
    console.log("Error From sotedata::", err);
  }
};
exports.sendResponseSocket = function (
  status,
  Message,
  Reason,
  userId,
  callback
) {
  try {
    var obj = {
      status: status,
      Message: Message,
      Reason: Reason,
    };
    socketconnect.emit(
      "socketResponse" + module.exports.encrypt(userId.toString()),
      obj
    );
  } catch (error) {
    console.log("Error From sendResponseSocekt::", error);
  }
};

exports.updateReverseHoldAmount = function (userId, currency, amount) {
  console.log("updateReverseHoldAmount===", amount);
  amount = amount < 0 ? 0 : amount;
  userId = userId.toString();
  console.log("userId=", userId);
  console.log("currency=", currency);
  userWalletDB
    .updateOne(
      {
        $and: [
          { userId: ObjectId(userId) },
          { "wallets.currencyId": ObjectId(currency) },
        ],
      },
      { $set: { "wallets.$.holdAmount": parseFloat(amount) } },
      { multi: true }
    )
    .exec(function (balErr, balRes) {
      console.log("update reverse balance error===", balErr);
      console.log("update reverse balance balRes===", balRes);
    });
};

let getRedisPairs = (exports.getRedisPairs = function (callback) {
  try {
    client.get("Pairs", (err, pairData) => {
      if (!err && pairData != null) {
        var datas = JSON.parse(pairData);
        callback(datas);
      } else {
        tradePairDB
          .find({ status: 1 })
          .populate("from_symbol_id", "Currency_image")
          .exec(function (err, resData) {
            if (resData.length > 0) {
              var response = JSON.stringify(resData);
              client.set("Pairs", response);
              callback(resData);
            } else {
              callback([]);
            }
          });
      }
    });
  } catch (error) {
    console.log("====ERROR FROM setRedisPairs", error);
  }
});

exports.socket_account = function (Message, userId, callback) {
  try {
    var obj = {
      Message: Message,
    };
    socketconnect.emit(
      "socketResponse" + module.exports.encrypt(userId.toString()),
      obj
    );
  } catch (error) {
    console.log("Error From sendResponseSocekt::", error);
  }
};

exports.sendCommonSocket = function (status, Message, Reaseon, callback) {
  try {
    var obj = {
      status: status,
      Message: Message,
      Reaseon: Reaseon,
    };
    socketconnect.emit("socketResponse", obj);
  } catch (error) {
    console.log("Error From sendResponseSocekt::", error);
  }
};

// exports.fetchInternalTickers = function(pair,callback){
//     try {
//       var pair = pair;
//       var start = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
//       var end = new Date();
//       var options = [
//           {
//             "$match": {
//               //'pair': pair,
//               'pairName': pair,
//               //'$and':[{createddate:{$lte:end}},{createddate:{$gte:start}}],
//               'status': {$in:['filled','Partially']}
//             }
//         },
//         {$sort: {
//            "createddate":-1
//         }},
//           {
//               $group: {
//                   _id: {
//                       pairName: "$pairName"
//                   },
//                   highprice   : {$max: "$price"},
//                   lowprice   : {$min: "$price"},
//                   volume     : {$sum: "$amount"},
//                   open     : {$first: "$price"},
//                   close: {$last: "$price"},
//                   tradeType: {$first: "$tradeType"}
//               }
//           }
//       ];

//       orderDB.aggregate(options).exec(async function (error, data) {
//         if(data.length>0)
//         {
//           var response = await data[0];
//           console.log("ticker price response===",response);
//           var price_change = response.open - response.close;
//           var change_percent = (response.open - response.close) / response.open * 100;
//           var lastobj = data.pop();
//           var resp = {
//             volume: response.volume,
//             highprice: response.highprice,
//             lowprice: response.lowprice,
//             price_change: price_change,
//             lastprice: {lastprice: response.open,tradeType:response.tradeType},
//             change_percent: change_percent,
//             pair: pair,
//             liquidity_status:0
//           }
//           console.log("call GetTickerPrice 1111====",resp)
//           client.hset('GetTickerPrice',pair,JSON.stringify(resp));
//           callback(true);
//         }
//         else
//         {
//           var pairdata = await tradePairDB.findOne({pair:pair});
//           var resp = {
//             volume: pairdata.volume_24h,
//             highprice: pairdata.highest_24h,
//             lowprice: pairdata.lowest_24h,
//             price_change: pairdata.changes_24h,
//             lastprice:{lastprice: pairdata.marketPrice,tradeType:''},
//             change_percent: pairdata.changes_24h,
//             pair: pair,
//             liquidity_status:0
//           }
//           console.log("call GetTickerPrice 2222====",resp)
//           client.hset('GetTickerPrice',pair,JSON.stringify(resp));
//           callback(true);
//         }
//       });
//     } catch (error) {
//       console.log("catch error===",error);
//       callback(false);
//     }
//   }

exports.fetchInternalTickers = function (pair, callback) {
  try {
    var pair = pair;
    var start = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    var end = new Date();
    var options = [
      {
        $match: {
          pair: pair,
          $and: [
            { created_at: { $lte: end } },
            { created_at: { $gte: start } },
          ],
        },
      },
      {
        $sort: {
          created_at: -1,
        },
      },
      {
        $group: {
          _id: {
            pairName: "$pair",
          },
          highprice: { $max: "$askPrice" },
          lowprice: { $min: "$askPrice" },
          volume: { $sum: "$askAmount" },
          open: { $first: "$askPrice" },
          close: { $last: "$askPrice" },
          tradeType: { $first: "$type" },
        },
      },
    ];

    orderConfirmDB.aggregate(options).exec(async function (error, data) {
      if (data.length > 0) {
        var response = await data[0];
        var price_change = response.open - response.close;
        var change_percent =
          ((response.open - response.close) / response.open) * 100;
        var lastobj = data.pop();
        var resp = {
          volume: response.volume,
          highprice: response.highprice,
          lowprice: response.lowprice,
          price_change: price_change,
          lastprice: {
            lastprice: response.open,
            tradeType: response.tradeType,
          },
          change_percent: change_percent,
          pair: pair,
          liquidity_status: 0,
        };
        console.log("call GetTickerPrice 1111====", resp);
        client.hset("GetTickerPrice", pair, JSON.stringify(resp));
        callback(true);
      } else {
        var options = [
          {
            $match: {
              pair: pair,
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
          {
            $group: {
              _id: {
                pairName: "$pair",
              },
              highprice: { $max: "$askPrice" },
              lowprice: { $min: "$askPrice" },
              volume: { $sum: "$askAmount" },
              open: { $first: "$askPrice" },
              close: { $last: "$askPrice" },
              tradeType: { $first: "$type" },
            },
          },
        ];

        var tickerdata = await orderConfirmDB.aggregate(options);

        var pairdata = await tradePairDB.findOne({ pair: pair });
        if (pairdata != null) {
          var resp = {
            volume: pairdata.volume_24h,
            highprice: pairdata.highest_24h,
            lowprice: pairdata.lowest_24h,
            price_change: pairdata.changes_24h,
            lastprice: {
              lastprice:
                tickerdata.length > 0 && tickerdata[0].open != null
                  ? tickerdata[0].open
                  : pairdata.marketPrice,
              tradeType: "",
            },
            change_percent: pairdata.changes_24h,
            pair: pair,
            liquidity_status: 0,
          };
          client.hset("GetTickerPrice", pair, JSON.stringify(resp));
          callback(true);
        }

      }
    });
  } catch (error) {
    console.log("catch error===", error);
    callback(false);
  }
};

exports.fetchInternalTradehistory = function (pair, callback) {
  try {
    var changelower = pair.replace("_", "").toLowerCase();
    var filter = {
      pair: pair,
    };
    orderConfirmDB
      .find(filter, {
        created_at: 1,
        pair: 1,
        seller_ordertype: 1,
        type: 1,
        askAmount: 1,
        askPrice: 1,
        total: 1,
      })
      .sort({ created_at: -1 })
      .limit(20)
      .exec(function (err, resp) {
        if (resp && !err) {
          var trade_history = [];
          if (resp.length > 0) {
            for (var i = 0; i < resp.length; i++) {
              var pairsplit = resp[i].pair.split("_");
              var obj = {
                tradeID:
                  resp[i].type == "sell"
                    ? resp[i].sellorderId
                    : resp[i].buyorderId,
                time: moment(resp[i].created_at).format("MM-DD-YY"),
                symbol: pairsplit[0] + pairsplit[1],
                tradeType: resp[i].type,
                amount: parseFloat(resp[i].askAmount).toFixed(4),
                price: parseFloat(resp[i].askPrice).toFixed(4),
                type: resp[i].type,
              };
              trade_history.push(obj);
            }
          }
          client.hset(
            "InternalTradeHistory",
            changelower,
            JSON.stringify(trade_history)
          );
          callback(true);
        }
      });
  } catch (error) {
    console.log(error);
    callback(false);
  }
};

let updateUserTokenBalances = (exports.updateUserTokenBalances =
  async function (
    network,
    userId,
    currId,
    amount,
    OldBal,
    LastId,
    type,
    coinBalance,
    coinBalance_update,
    callback
  ) {
    var difference = amount - OldBal;
    let referral = {
      userId: userId,
      currId: currId,
      amount: amount,
      difference: difference,
      OldBal: OldBal,
      LastId: LastId,
      Type: type,
    };
    var balanceUpdate = await BalanceUpdationDB.create(referral);
    console.log(userId, "userIduserIduserId");
    var network_select = network.toLowerCase();
    var amount_field = "amount_" + network_select;
    var balanceUpdate_token = await userWalletDB.updateOne(
      { userId: userId, "wallets.currencyId": ObjectId(currId) },
      { $set: { "wallets.$.[amount_field]": +amount } },
      { multi: true }
    );
    var balanceUpdate_coin = await userWalletDB.updateOne(
      { userId: userId, "wallets.currencyId": ObjectId(currId) },
      { $set: { "wallets.$.amount": +coinBalance_update } },
      { multi: true }
    );
    if (balanceUpdate_coin) {
      callback(balanceUpdate_coin);
    } else {
      callback(false);
    }
  });

exports.updateAdminTokenBalance = async function (
  network,
  currency,
  amount,
  coinBalance,
  callback
) {
  console.log("updateAdminTokenBalance");
  var network_select = network.toLowerCase();
  var amount_field = "amount_" + network_select;
  var balRes = await adminWalletDB.updateOne(
    { "wallets.currencySymbol": currency, type: 1 },
    { $set: { "wallets.$.[amount_field]": +amount } },
    { multi: true }
  );
  var balRes_coin = await adminWalletDB.updateOne(
    { "wallets.currencySymbol": currency, type: 1 },
    { $set: { "wallets.$.amount": +coinBalance } },
    { multi: true }
  );
  console.log("updateAdminBalance balRes", balRes_coin);
  if (balRes_coin) {
    callback(true);
    // return true;
  } else {
    callback(false);
  }
};

let withdraw_approve = (exports.withdraw_approve = function (
  details,
  types,
  callback
) {
  try {
    var getdet = details;
    console.log("getdet====", getdet);
    if (getdet) {
      if (getdet.amount != "" && getdet.withdraw_address != "") {
        if (getdet.amount > 0) {
          currencyDB
            .findOne({
              _id: getdet.currency_id,
            })
            .exec((curenerr, curncydet) => {
              console.log("curncydet", curncydet);
              if (curncydet) {
                if (types == "admin_withdraw") {
                  var totalamount = getdet.amount;
                } else {
                  var totalamount = getdet.receiveamount;
                }
                if (curncydet.walletType == 0) {
                  // core wallet
                  if (
                    curncydet.currencySymbol === "BTC" ||
                    curncydet.currencySymbol === "LTC"
                  ) {
                    if (curncydet.currencySymbol === "BTC") {
                      var wallet_config = {
                        host: decryptionLevel(wallet_json.btcconfig.host),
                        port: decryptionLevel(wallet_json.btcconfig.port),
                        user: decryptionLevel(wallet_json.btcconfig.user),
                        password: decryptionLevel(
                          wallet_json.btcconfig.password
                        ),
                      };

                      bitcoin_rpc.init(
                        wallet_config.host,
                        wallet_config.port,
                        wallet_config.user,
                        wallet_config.password
                      );
                      bitcoin_rpc.call(
                        "validateaddress",
                        [getdet.withdraw_address],
                        function (err, address) {
                          if (!err || address) {
                            if (address.result.isvalid == true) {
                              var transferAmount = +totalamount;
                              bitcoin_rpc.call(
                                "walletpassphrase",
                                ["justbit_btc", 120],
                                function (err1, value) {
                                  if (!err1) {
                                    bitcoin_rpc.call(
                                      "sendtoaddress",
                                      [
                                        getdet.withdraw_address,
                                        +transferAmount.toFixed(8),
                                      ],
                                      function (berr, btsucc) {
                                        if (!berr) {
                                          if (types == "admin") {
                                            withdrawDB.updateOne(
                                              { _id: getdet._id },
                                              {
                                                $set: {
                                                  status: 2,
                                                  txn_id: btsucc.result,
                                                  updated_at: new Date(),
                                                },
                                              },
                                              function (err, with_res1) {
                                                var profit_payment = {
                                                  type: "Withdraw",
                                                  user_id: getdet.user_id,
                                                  currencyid: curncydet._id,
                                                  fees: getdet.fees,
                                                  fullfees:
                                                    getdet.fees.toFixed(8),
                                                  orderid: getdet._id,
                                                };
                                                profitDb.create(
                                                  profit_payment,
                                                  function (
                                                    profitErr,
                                                    profitRes
                                                  ) {
                                                    btc_balance(function (
                                                      btcresponse
                                                    ) {
                                                      console.log(
                                                        "btc_balance===",
                                                        btcresponse
                                                      );
                                                      if (btcresponse.status) {
                                                        var btc_balance =
                                                          btcresponse.balance;
                                                        updateAdminBalance(
                                                          curncydet.currencySymbol,
                                                          btc_balance,
                                                          function (resp) { }
                                                        );
                                                      }
                                                    });

                                                    callback({
                                                      status: true,
                                                      message:
                                                        "Withdraw completed successfully",
                                                    });
                                                  }
                                                );
                                              }
                                            );
                                          } else if (
                                            types == "admin_withdraw"
                                          ) {
                                            btc_balance(function (btcresponse) {
                                              console.log(
                                                "btc_balance===",
                                                btcresponse
                                              );
                                              if (btcresponse.status) {
                                                var btc_balance =
                                                  btcresponse.balance;
                                                updateAdminBalance(
                                                  curncydet.currencySymbol,
                                                  btc_balance,
                                                  function (resp) { }
                                                );
                                              }
                                            });

                                            callback({
                                              status: true,
                                              message:
                                                "Withdraw completed successfully",
                                              txid: btsucc.result,
                                            });
                                          }
                                        } else {
                                          //console.log('3',berr)
                                          callback({
                                            status: false,
                                            message:
                                              "Transaction falied.Please try again.",
                                          });
                                        }
                                      }
                                    );
                                  } else {
                                    //console.log('4',err1)
                                    callback({
                                      status: false,
                                      message:
                                        "Transaction falied.Please try again.",
                                    });
                                  }
                                }
                              );
                            } else {
                              callback({
                                status: false,
                                message:
                                  'Enter a valid "' +
                                  curncydet.currencySymbol +
                                  '" address',
                              });
                            }
                          } else {
                            //console.log('1',err)
                            callback({
                              status: false,
                              message: "Transaction falied.Please try again!",
                            });
                          }
                        }
                      );
                    } else if (curncydet.currencySymbol === "LTC") {
                      var wallet_config = {
                        host: decryptionLevel(wallet_json.ltcconfig.host),
                        port: decryptionLevel(wallet_json.ltcconfig.port),
                        user: decryptionLevel(wallet_json.ltcconfig.user),
                        password: decryptionLevel(
                          wallet_json.ltcconfig.password
                        ),
                      };

                      bitcoin_rpc.init(
                        wallet_config.host,
                        wallet_config.port,
                        wallet_config.user,
                        wallet_config.password
                      );
                      bitcoin_rpc.call(
                        "validateaddress",
                        [getdet.withdraw_address],
                        function (err, address) {
                          if (!err || address) {
                            if (address.result.isvalid == true) {
                              var transferAmount = +totalamount;
                              bitcoin_rpc.call(
                                "walletpassphrase",
                                ["ltcwallet", 120],
                                function (err1, value) {
                                  if (!err1) {
                                    bitcoin_rpc.call(
                                      "sendtoaddress",
                                      [
                                        getdet.withdraw_address,
                                        +transferAmount.toFixed(8),
                                      ],
                                      function (berr, btsucc) {
                                        if (!berr) {
                                          if (types == "admin") {
                                            withdrawDB.updateOne(
                                              { _id: getdet._id },
                                              {
                                                $set: {
                                                  status: 2,
                                                  txn_id: btsucc.result,
                                                  updated_at: new Date(),
                                                },
                                              },
                                              function (err, with_res1) {
                                                var profit_payment = {
                                                  type: "Withdraw",
                                                  user_id: getdet.user_id,
                                                  currencyid: curncydet._id,
                                                  fees: getdet.fees,
                                                  fullfees:
                                                    getdet.fees.toFixed(8),
                                                  orderid: getdet._id,
                                                };
                                                profitDb.create(
                                                  profit_payment,
                                                  function (
                                                    profitErr,
                                                    profitRes
                                                  ) {
                                                    callback({
                                                      status: true,
                                                      message:
                                                        "Withdraw completed successfully",
                                                    });
                                                  }
                                                );
                                              }
                                            );
                                          } else if (
                                            types == "admin_withdraw"
                                          ) {
                                            callback({
                                              status: true,
                                              message:
                                                "Withdraw completed successfully",
                                              txid: btsucc.result,
                                            });
                                          }
                                        } else {
                                          //console.log('3',berr)
                                          callback({
                                            status: false,
                                            message:
                                              "Transaction falied.Please try again.",
                                          });
                                        }
                                      }
                                    );
                                  } else {
                                    //console.log('4',err1)
                                    callback({
                                      status: false,
                                      message:
                                        "Transaction falied.Please try again.",
                                    });
                                  }
                                }
                              );
                            } else {
                              callback({
                                status: false,
                                message:
                                  'Enter a valid "' +
                                  curncydet.currencySymbol +
                                  '" address',
                              });
                            }
                          } else {
                            //console.log('1',err)
                            callback({
                              status: false,
                              message: "Transaction falied.Please try again!",
                            });
                          }
                        }
                      );
                    }
                  } else if (curncydet.currencySymbol == "ETH") {
                    getadminwallet("ETH", function (adminres) {
                      var admin_address = adminres.address;
                      var privateKey = decryptionLevel(
                        adminres.admin_token_name
                      );
                      var transferAmount = +totalamount;
                      get_Balance(
                        { address: admin_address },
                        function (balanceRes) {
                          console.log(
                            balanceRes,
                            "=-=-=balanceRes=-=-=-balanceRes=-=-"
                          );
                          var final_balance = balanceRes.balance;
                          console.log(final_balance, "-0-0-0-0-0-0-0-0-0-0-0-");
                          if (final_balance > 0) {
                            gasPrice(function (gasresponse) {
                              console.log("  gasresponse===", gasresponse);

                              if (gasresponse.status) {
                                var gasprice = gasresponse.gasprice;
                                var amount = transferAmount;
                                var obj = {
                                  from: admin_address,
                                  to: getdet.withdraw_address,
                                  gasLimit: 200000,
                                  gasPrice: gasprice,
                                  value: amount,
                                  privateKey: privateKey.substring(2),
                                };
                                sendTransaction(obj, function (transfer) {
                                  console.log(
                                    "send transaction response===",
                                    transfer
                                  );
                                  if (transfer.status) {
                                    if (types == "admin") {
                                      withdrawDB.updateOne(
                                        { _id: getdet._id },
                                        {
                                          $set: {
                                            status: 2,
                                            txn_id: transfer.txn_id,
                                            updated_at: new Date(),
                                          },
                                        },
                                        function (err, with_res1) {
                                          var profit_payment = {
                                            type: "Withdraw",
                                            user_id: getdet.user_id,
                                            currencyid: curncydet._id,
                                            fees: getdet.fees,
                                            fullfees: getdet.fees.toFixed(8),
                                            orderid: getdet._id,
                                          };
                                          profitDb.create(
                                            profit_payment,
                                            function (profitErr, profitRes) {
                                              get_Balance(
                                                { address: admin_address },
                                                function (adminbalanceRes) {
                                                  if (adminbalanceRes.status) {
                                                    var admin_eth =
                                                      +adminbalanceRes.balance;
                                                    updateAdminBalance(
                                                      "ETH",
                                                      admin_eth,
                                                      function (balance) { }
                                                    );
                                                  }
                                                }
                                              );
                                              callback({
                                                status: true,
                                                message:
                                                  "Withdraw completed successfully",
                                              });
                                            }
                                          );
                                        }
                                      );
                                    } else if (types == "admin_withdraw") {
                                      get_Balance(
                                        { address: admin_address },
                                        function (adminbalanceRes) {
                                          if (adminbalanceRes.status) {
                                            var admin_eth =
                                              +adminbalanceRes.balance;
                                            updateAdminBalance(
                                              "ETH",
                                              admin_eth,
                                              function (balance) { }
                                            );
                                          }
                                        }
                                      );
                                      callback({
                                        status: true,
                                        message:
                                          "Withdraw completed successfully",
                                        txid: transfer.txn_id,
                                      });
                                    }
                                  } else {
                                    callback({
                                      status: false,
                                      message:
                                        "Transactionhas been falied.Please try again.",
                                    });
                                  }
                                });
                              }
                            });
                          } else {
                            console.log("no balance from user wallets");
                          }
                        }
                      );
                    });
                  } //Matic=====================
                  else if (curncydet.currencySymbol == "MATIC") {
                    getadminwallet("MATIC", function (adminres) {
                      console.log(adminres, "adminres====-=")
                      var admin_address = adminres.address;

                      var privateKey = decryptionLevel(adminres.admin_token_name);
                      console.log(privateKey, "privateKey====-=")
                      var transferAmount = +totalamount;
                      matic_Balance(
                        { address: admin_address },
                        function (balanceRes) {
                          var final_balance = balanceRes.balance;
                          if (
                            final_balance > 0 &&
                            final_balance > transferAmount
                          ) {
                            matic_gasPrice(function (gasresponse) {
                              console.log(gasresponse, "gasresponse-=-=-=gasresponse")
                              if (gasresponse.status == true) {
                                var gasprice = gasresponse.gasprice;
                                var amount = transferAmount;

                                var obj = {
                                  from: admin_address,
                                  to: getdet.withdraw_address,
                                  gasLimit: 200000,
                                  gasPrice: gasprice,
                                  value: amount,
                                  privateKey: privateKey.substring(2),
                                };
                                console.log(obj, "-0-0-0-0-0-0-0-0-0-0-0-0-0-")
                                matic_sendTransaction(obj, function (transfer) {
                                  console.log("send transaction response===", transfer);
                                  if (transfer.status) {
                                    if (types == "admin") {
                                      withdrawDB.updateOne(
                                        { _id: getdet._id },
                                        {
                                          $set: {
                                            status: 2,
                                            txn_id: transfer.txn_id,
                                            updated_at: new Date(),
                                          },
                                        },
                                        function (err, with_res1) {
                                          var profit_payment = {
                                            type: "Withdraw",
                                            user_id: getdet.user_id,
                                            currencyid: curncydet._id,
                                            fees: getdet.fees,
                                            fullfees: getdet.fees.toFixed(8),
                                            orderid: getdet._id,
                                          };
                                          profitDb.create(
                                            profit_payment,
                                            function (profitErr, profitRes) {
                                              // matic_Balance({ address: admin_address }, function (adminbalanceRes) {
                                              //       if (adminbalanceRes.status) {
                                              //           var admin_eth = +adminbalanceRes.balance;
                                              //           updateAdminBalance("MATIC", admin_eth, function (balance) {

                                              //           });
                                              //       }
                                              //   });
                                              callback({
                                                status: true,
                                                message:
                                                  "Withdraw completed successfully",
                                              });
                                            }
                                          );
                                        }
                                      );
                                    } else if (types == "admin_withdraw") {
                                      matic_Balance(
                                        { address: admin_address },
                                        function (adminbalanceRes) {
                                          if (adminbalanceRes.status) {
                                            var admin_eth =
                                              +adminbalanceRes.balance;
                                            updateAdminBalance(
                                              "MATIC",
                                              admin_eth,
                                              function (balance) { }
                                            );
                                          }
                                        }
                                      );
                                      callback({
                                        status: true,
                                        message:
                                          "Withdraw completed successfully",
                                        txid: transfer.txn_id,
                                      });
                                    }
                                  } else {
                                    callback({
                                      status: false,
                                      message:
                                        "Transaction falied.Please try again.",
                                    });
                                  }
                                });
                              }
                            });
                          } else {
                            callback({
                              status: false,
                              message: "Insufficient Balance",
                            });
                          }
                        }
                      );
                    });
                  }
                  //Matic=====================
                  else if (curncydet.currencySymbol == "TRX") {
                    getadminwallet("TRX", function (adminres) {
                      var admin_address = adminres.trx_hexaddress;
                      var privateKey = adminres.admin_token_name;
                      //console.log("admin_address===", admin_address);
                      var transferAmount = +totalamount * 1000000;
                      var bal_obj = {
                        address: adminres.address,
                      };
                      trx_balance(bal_obj, function (balanceRes) {
                        if (balanceRes.status) {
                          var tron_balance = balanceRes.balance;
                          var final_balance = tron_balance / 1000000;
                          if (final_balance > 0) {
                            var amount = transferAmount;
                            var obj = {
                              from_address: adminres.address,
                              to_address: getdet.withdraw_address,
                              amount: amount,
                              privateKey: privateKey,
                            };
                            // console.log("tron withdraw obj===", obj);
                            tron_withdraw(obj, function (transfer) {
                              //console.log("send transaction response===", transfer);
                              if (transfer.status) {
                                if (types == "admin") {
                                  withdrawDB.updateOne(
                                    { _id: getdet._id },
                                    {
                                      $set: {
                                        status: 2,
                                        txn_id: transfer.response,
                                        updated_at: new Date(),
                                      },
                                    },
                                    function (err, with_res1) {
                                      var profit_payment = {
                                        type: "Withdraw",
                                        user_id: getdet.user_id,
                                        currencyid: curncydet._id,
                                        fees: getdet.fees,
                                        fullfees: getdet.fees.toFixed(8),
                                        orderid: getdet._id,
                                      };
                                      profitDb.create(
                                        profit_payment,
                                        function (profitErr, profitRes) {
                                          trx_balance(
                                            { address: adminres.address },
                                            function (adminbalanceRes) {
                                              if (adminbalanceRes.status) {
                                                var admin_tron =
                                                  +adminbalanceRes.balance;
                                                updateAdminBalance(
                                                  "TRX",
                                                  admin_tron,
                                                  function (balance) { }
                                                );
                                              }
                                            }
                                          );

                                          callback({
                                            status: true,
                                            message:
                                              "Withdraw completed successfully",
                                          });
                                        }
                                      );
                                    }
                                  );
                                } else if (types == "admin_withdraw") {
                                  tron_balance(
                                    { address: admin_address },
                                    function (adminbalanceRes) {
                                      if (adminbalanceRes.status) {
                                        var admin_tron =
                                          +adminbalanceRes.balance;
                                        updateAdminBalance(
                                          "TRX",
                                          admin_tron,
                                          function (balance) { }
                                        );
                                      }
                                    }
                                  );

                                  callback({
                                    status: true,
                                    message: "Withdraw completed successfully",
                                    txid: transfer.response,
                                  });
                                }
                              } else {
                                callback({
                                  status: false,
                                  message:
                                    "Transaction falied.Please try again.",
                                });
                              }
                            });
                          } else {
                            console.log("no balance from admin wallets");
                            callback({
                              status: false,
                              message: "Insufficient balance from admin",
                            });
                          }
                        }
                      });
                    });
                  } else if (curncydet.currencySymbol == "BNB") {
                    getadminwallet("BNB", function (adminres) {
                      console.log("BNB wallet===", adminres);
                      var admin_address = adminres.address;
                      var privateKey = decryptionLevel(
                        adminres.admin_token_name
                      );
                      console.log(privateKey, "privateKey-0-0-privateKey");
                      var transferAmount = +totalamount;
                      bnb_Balance(
                        { address: admin_address },
                        function (balanceRes) {
                          console.log("admin bnb balance====", balanceRes);

                          var final_balance = balanceRes.balance;
                          console.log("admin bnb balance====", final_balance);
                          console.log("admin bnb balance====", transferAmount);

                          if (
                            final_balance > 0 &&
                            final_balance > transferAmount
                          ) {
                            //console.log("admin bnb final_balance====",final_balance);
                            bnb_gasPrice(function (gasresponse) {
                              //console.log("admin gasPrice====",gasPrice);
                              if (gasresponse.status) {
                                var gasprice = gasresponse.gasprice;
                                var amount = transferAmount;
                                var obj = {
                                  from: admin_address,
                                  to: getdet.withdraw_address,
                                  gasLimit: 200000,
                                  gasPrice: gasprice,
                                  value: amount,
                                  privateKey: privateKey.substring(2),
                                };
                                //console.log("admin bnb transfer====",obj);
                                bnb_sendTransaction(obj, function (transfer) {
                                  console.log(
                                    "send transaction response===",
                                    transfer
                                  );
                                  if (transfer.status) {
                                    if (types == "admin") {
                                      withdrawDB.updateOne(
                                        { _id: getdet._id },
                                        {
                                          $set: {
                                            status: 2,
                                            txn_id: transfer.txn_id,
                                            updated_at: new Date(),
                                          },
                                        },
                                        function (err, with_res1) {
                                          var profit_payment = {
                                            type: "Withdraw",
                                            user_id: getdet.user_id,
                                            currencyid: curncydet._id,
                                            fees: getdet.fees,
                                            fullfees: getdet.fees.toFixed(8),
                                            orderid: getdet._id,
                                          };
                                          profitDb.create(
                                            profit_payment,
                                            function (profitErr, profitRes) {
                                              bnb_Balance(
                                                { address: admin_address },
                                                function (adminbalanceRes) {
                                                  if (adminbalanceRes.status) {
                                                    var admin_bnb =
                                                      +adminbalanceRes.balance;
                                                    updateAdminBalance(
                                                      "BNB",
                                                      admin_bnb,
                                                      function (balance) { }
                                                    );
                                                  }
                                                }
                                              );

                                              callback({
                                                status: true,
                                                message:
                                                  "Withdraw completed successfully",
                                              });
                                            }
                                          );
                                        }
                                      );
                                    } else if (types == "admin_withdraw") {
                                      bnb_Balance(
                                        { address: admin_address },
                                        function (adminbalanceRes) {
                                          if (adminbalanceRes.status) {
                                            var admin_bnb =
                                              +adminbalanceRes.balance;
                                            updateAdminBalance(
                                              "BNB",
                                              admin_bnb,
                                              function (balance) { }
                                            );
                                          }
                                        }
                                      );

                                      callback({
                                        status: true,
                                        message:
                                          "Withdraw completed successfully",
                                        txid: transfer.txn_id,
                                      });
                                    }
                                  } else {
                                    callback({
                                      status: false,
                                      message:
                                        "Transaction falied.Please try again.",
                                    });
                                  }
                                });
                              }
                            });
                          } else {
                            console.log("no balance from user wallets");
                            callback({
                              status: false,
                              message: "Insufficient balance",
                            });
                          }
                        }
                      );
                    });
                  } else if (
                    curncydet.currencyType == "2" &&
                    getdet.network == "ERC20"
                  ) {
                    getadminwallet("ETH", function (adminres) {
                      var args = {
                        adminaddress: adminres.address,
                        account1: getdet.withdraw_address,
                        privkey: decryptionLevel(adminres.admin_token_name),
                        curcontractaddress: curncydet.contractAddress_erc20,
                        curdecimal: curncydet.coinDecimal_erc20,
                        amount: totalamount,
                      };
                      tokenwithdraw(args, function (response) {
                        // console.log("reponse response====", response);
                        if (response) {
                          const result = response;
                          var txHash = result.txHash;
                          if (result.status == true) {
                            if (txHash) {
                              if (txHash != "" && txHash) {
                                if (types == "admin") {
                                  withdrawDB.updateOne(
                                    {
                                      _id: getdet._id,
                                    },
                                    {
                                      $set: {
                                        status: 2,
                                        txn_id: txHash,
                                        updated_at: new Date(),
                                      },
                                    },
                                    function (err, with_res1) {
                                      var profit_payment = {
                                        type: "Withdraw",
                                        user_id: getdet.user_id,
                                        currencyid: curncydet._id,
                                        fees: getdet.fees,
                                        fullfees: getdet.fees.toFixed(8),
                                        orderid: getdet._id,
                                      };
                                      profitDb.create(
                                        profit_payment,
                                        function (profitErr, profitRes) {
                                          var admin_obj = {
                                            contractAddress:
                                              curncydet.contractAddress_erc20,
                                            userAddress: adminres.address,
                                            decimals:
                                              curncydet.coinDecimal_erc20,
                                          };
                                          get_tokenBalance(
                                            admin_obj,
                                            function (adminbalanceRes) {
                                              if (adminbalanceRes.status) {
                                                var admin_tokenbalance =
                                                  +adminbalanceRes.balance;
                                                updateAdminBalance(
                                                  curncydet.currencySymbol,
                                                  admin_tokenbalance,
                                                  function (balance) { }
                                                );
                                              }
                                            }
                                          );
                                          callback({
                                            status: true,
                                            message:
                                              "Withdraw completed successfully",
                                          });
                                        }
                                      );
                                    }
                                  );
                                } else if (types == "admin_withdraw") {
                                  var admin_obj = {
                                    contractAddress:
                                      curncydet.contractAddress_erc20,
                                    userAddress: adminres.address,
                                    decimals: curncydet.coinDecimal_erc20,
                                  };
                                  get_tokenBalance(
                                    admin_obj,
                                    function (adminbalanceRes) {
                                      // console.log(
                                      //   "admin balance response===",
                                      //   adminbalanceRes
                                      // );
                                      if (adminbalanceRes.status) {
                                        var admin_tokenbalance =
                                          +adminbalanceRes.balance;
                                        updateAdminBalance(
                                          curncydet.currencySymbol,
                                          admin_tokenbalance,
                                          function (balance) { }
                                        );
                                      }
                                    }
                                  );

                                  callback({
                                    status: true,
                                    message: "Withdraw completed successfully",
                                    txid: txHash,
                                  });
                                }
                              } else {
                                console.log("3", trans_err);
                                callback({
                                  status: false,
                                  message:
                                    "Transaction falied.Please try again!",
                                });
                              }
                            }
                          } else {
                            callback({
                              status: false,
                              message: result.message,
                            });
                          }
                        } else {
                          callback({
                            status: false,
                            message: "Transaction falied.Please try again!",
                          });
                        }
                      });
                    });
                  } else if (
                    curncydet.currencyType == "2" &&
                    getdet.network == "TRC20"
                  ) {
                    getadminwallet("TRX", function (adminres) {
                      var admin_address = adminres.address;
                      var privateKey = adminres.admin_token_name;
                      console.log("admin_address===", admin_address);
                      console.log("totalamount", totalamount);
                      var transferAmount =
                        +totalamount *
                        Math.pow(10, curncydet.coinDecimal_trc20);
                      console.log(
                        "urncydet.coinDecimal",
                        curncydet.coinDecimal_trc20
                      );
                      console.log("transferAmount", totalamount);
                      var bal_obj = {
                        address: admin_address,
                      };
                      trx_balance(bal_obj, function (balanceRes) {
                        if (balanceRes.status) {
                          var final_balance = balanceRes.balance;
                          if (final_balance >= 10) {
                            var token_bal_obj = {
                              privatekey: privateKey,
                              address: admin_address,
                              contractAddress: curncydet.contractAddress_trc20,
                              decimal: curncydet.coinDecimal_trc20,
                            };
                            trc20_balance(
                              token_bal_obj,
                              function (tokenbal_res) {
                                if (tokenbal_res.status) {
                                  var admin_token_balance =
                                    tokenbal_res.balance;
                                  if (admin_token_balance > 0) {
                                    var obj = {
                                      from_address: admin_address,
                                      to_address: getdet.withdraw_address,
                                      amount: transferAmount,
                                      privateKey: privateKey,
                                      contractAddress:
                                        curncydet.contractAddress_trc20,
                                      decimal: curncydet.coinDecimal_trc20,
                                    };
                                    //console.log("trc20 withdraw obj===", obj);
                                    trc20_withdraw(obj, function (transfer) {
                                      // console.log(
                                      //   "send transaction response===",
                                      //   transfer
                                      // );
                                      if (transfer.status) {
                                        if (types == "admin") {
                                          withdrawDB.updateOne(
                                            { _id: getdet._id },
                                            {
                                              $set: {
                                                status: 2,
                                                txn_id: transfer.response,
                                                updated_at: new Date(),
                                              },
                                            },
                                            function (err, with_res1) {
                                              var profit_payment = {
                                                type: "Withdraw",
                                                user_id: getdet.user_id,
                                                currencyid: curncydet._id,
                                                fees: getdet.fees,
                                                fullfees:
                                                  getdet.fees.toFixed(8),
                                                orderid: getdet._id,
                                              };
                                              profitDb.create(
                                                profit_payment,
                                                function (
                                                  profitErr,
                                                  profitRes
                                                ) {
                                                  var admin_obj = {
                                                    privatekey: privateKey,
                                                    contractAddress:
                                                      curncydet.contractAddress_trc20,
                                                    address: admin_address,
                                                    decimal:
                                                      curncydet.coinDecimal_trc20,
                                                  };
                                                  trc20_balance(
                                                    admin_obj,
                                                    function (adminbalanceRes) {
                                                      // console.log(
                                                      //   "admin balance response===",
                                                      //   adminbalanceRes
                                                      // );
                                                      if (
                                                        adminbalanceRes.status
                                                      ) {
                                                        var admin_tokenbalance =
                                                          +adminbalanceRes.balance;
                                                        updateAdminBalance(
                                                          curncydet.currencySymbol,
                                                          admin_tokenbalance,
                                                          function (balance) { }
                                                        );
                                                      }
                                                    }
                                                  );

                                                  callback({
                                                    status: true,
                                                    message:
                                                      "Withdraw completed successfully",
                                                  });
                                                }
                                              );
                                            }
                                          );
                                        } else if (types == "admin_withdraw") {
                                          var admin_obj = {
                                            privatekey: privateKey,
                                            contractAddress:
                                              curncydet.contractAddress_trc20,
                                            address: admin_address,
                                            decimal:
                                              curncydet.coinDecimal_trc20,
                                          };
                                          trc20_balance(
                                            admin_obj,
                                            function (adminbalanceRes) {
                                              // console.log(
                                              //   "admin balance response===",
                                              //   adminbalanceRes
                                              // );
                                              if (adminbalanceRes.status) {
                                                var admin_tokenbalance =
                                                  +adminbalanceRes.balance;
                                                updateAdminBalance(
                                                  curncydet.currencySymbol,
                                                  admin_tokenbalance,
                                                  function (balance) { }
                                                );
                                              }
                                            }
                                          );
                                          callback({
                                            status: true,
                                            message:
                                              "Withdraw completed successfully",
                                            txid: transfer.response,
                                          });
                                        }
                                      } else {
                                        callback({
                                          status: false,
                                          message:
                                            "Transaction falied.Please try again.",
                                        });
                                      }
                                    });
                                  } else {
                                    callback({
                                      status: false,
                                      message:
                                        "Insufficient balance from admin",
                                    });
                                  }
                                } else {
                                  callback({
                                    status: false,
                                    message: "Something went wrong",
                                  });
                                }
                              }
                            );
                          } else {
                            console.log("no balance from admin wallets");
                            callback({
                              status: false,
                              message: "Insufficient trx balance from admin",
                            });
                          }
                        } else {
                          callback({
                            status: false,
                            message: "Something went wrong",
                          });
                        }
                      });
                    });
                  } else if (
                    curncydet.currencyType == "2" &&
                    getdet.network == "BEP20"
                  ) {
                    getadminwallet("BNB", function (adminres) {
                      var args = {
                        adminaddress: adminres.address,
                        account1: getdet.withdraw_address,
                        privkey: decryptionLevel(adminres.admin_token_name),
                        curcontractaddress: curncydet.contractAddress_bep20,
                        curdecimal: curncydet.coinDecimal_bep20,
                        amount: totalamount,
                      };
                      bnb_tokenwithdraw(args, function (response) {
                        console.log("reponse response====", response);
                        if (response) {
                          const result = response;
                          var txHash = result.txHash;
                          if (result.status == true) {
                            if (txHash) {
                              if (txHash != "" && txHash) {
                                if (types == "admin") {
                                  withdrawDB.updateOne(
                                    {
                                      _id: getdet._id,
                                    },
                                    {
                                      $set: {
                                        status: 2,
                                        txn_id: txHash,
                                        updated_at: new Date(),
                                      },
                                    },
                                    function (err, with_res1) {
                                      var profit_payment = {
                                        type: "Withdraw",
                                        user_id: getdet.user_id,
                                        currencyid: curncydet._id,
                                        fees: getdet.fees,
                                        fullfees: getdet.fees.toFixed(8),
                                        orderid: getdet._id,
                                      };
                                      profitDb.create(
                                        profit_payment,
                                        function (profitErr, profitRes) {
                                          var admin_obj = {
                                            contractAddress:
                                              curncydet.contractAddress_bep20,
                                            userAddress: adminres.address,
                                            decimals:
                                              curncydet.coinDecimal_bep20,
                                          };
                                          bep20_Balance(
                                            admin_obj,
                                            function (adminbalanceRes) {
                                              console.log(
                                                "admin balance response===",
                                                adminbalanceRes
                                              );
                                              if (adminbalanceRes.status) {
                                                var admin_tokenbalance =
                                                  +adminbalanceRes.balance;
                                                updateAdminBalance(
                                                  curncydet.currencySymbol,
                                                  admin_tokenbalance,
                                                  function (balance) { }
                                                );
                                              }
                                            }
                                          );

                                          callback({
                                            status: true,
                                            message:
                                              "Withdraw completed successfully",
                                          });
                                        }
                                      );
                                    }
                                  );
                                } else if (types == "admin_withdraw") {
                                  var admin_obj = {
                                    contractAddress:
                                      curncydet.contractAddress_bep20,
                                    userAddress: adminres.address,
                                    decimals: curncydet.coinDecimal_bep20,
                                  };
                                  bep20_Balance(
                                    admin_obj,
                                    function (adminbalanceRes) {
                                      //console.log("admin balance response===",adminbalanceRes);
                                      if (adminbalanceRes.status) {
                                        var admin_tokenbalance =
                                          +adminbalanceRes.balance;
                                        updateAdminBalance(
                                          curncydet.currencySymbol,
                                          admin_tokenbalance,
                                          function (balance) { }
                                        );
                                      }
                                    }
                                  );

                                  callback({
                                    status: true,
                                    message: "Withdraw completed successfully",
                                    txid: txHash,
                                  });
                                }
                              } else {
                                console.log("3", trans_err);
                                callback({
                                  status: false,
                                  message:
                                    "Transaction falied.Please try again!",
                                });
                              }
                            }
                          } else {
                            callback({
                              status: false,
                              message: result.message,
                            });
                          }
                        } else {
                          callback({
                            status: false,
                            message: "Transaction falied.Please try again!",
                          });
                        }
                      });
                    });
                  }
                } // coinpayments
                else {

                }
              } else {
                callback({
                  status: false,
                  message: "Invalid currency request",
                });
              }
            });
        } else {
          callback({
            status: false,
            message: "Enter valid amount",
          });
        }
      } else {
        callback({
          status: false,
          message: "Enter a valid amount",
        });
      }
    } else {
      callback({
        status: false,
        message: "Invalid details",
      });
    }
  } catch (err) {
    //console.log(err)
    callback({
      status: false,
      message: "Something went wrong",
    });
  }
});

// let currency_conversion = (exports.currency_conversion = async function (
//   callback
// ) {
//   try {
//     var currencies = await currencyDB
//       .find({ status: "Active" }, { currencySymbol: 1, coinType: 1 })
//       .sort({ popularOrder: 1 })
//       .exec();

//     var fiat_from = [];
//     var fiat_to = ["BTC", "USDT", "INR"];

//     if (currencies.length > 0) {
//       for (var i = 0; i < currencies.length; i++) {
//         fiat_from.push(currencies[i].currencySymbol);
//         if (currencies[i].coinType == "2") {
//           fiat_to.push(currencies[i].currencySymbol);
//         }
//       }
//     }

//     try {
//       const requestConfig = {
//         method: "GET",
//         url:
//           "https://min-api.cryptocompare.com/data/pricemulti?fsyms=" +
//           fiat_from +
//           "&tsyms=" +
//           fiat_to +
//           "&api_key=" +
//           process.env.cryptocompare_api_1,
//       };
//       let response;
//       response = await axios(requestConfig);
//       if (response.data.Response == "Error") {
//         const requestConfig = {
//           method: "GET",
//           url:
//             "https://min-api.cryptocompare.com/data/pricemulti?fsyms=" +
//             fiat_from +
//             "&tsyms=" +
//             fiat_to +
//             "&api_key=" +
//             process.env.cryptocompare_api_2,
//         };
//         let response;
//         response = await axios(requestConfig);
//       }
//       var result = {};
//       result = response.data;

//       console.log("conversion result===", result);

//       client.hset("CurrencyConversion", "allpair", JSON.stringify(result));
//       callback({ status: true, message: result });
//     } catch (err) {
//       console.log(err.error);
//       callback({ status: false, message: "Something went wrong" });
//     }
//   } catch (err) {
//     console.log("converson catch ertt", err);
//     callback({ status: false, message: "Something went wrong" });
//   }
// });


// exports.currency_conversion = async function (callback) {
//   try {
//     // Step 1: Fetch active currencies
//     const currencies = await currencyDB
//       .find({ status: "Active" }, { currencySymbol: 1, coinType: 1 })
//       .sort({ popularOrder: 1 })
//       .exec();

//     const fiat_from = [];
//     const fiat_to = ["USD","EUR","CUP","RUB"];

//     currencies.forEach(currency => {
//       fiat_from.push(currency.currencySymbol);
//       // if (currency.coinType === "2") {
//       //   fiat_to.push(currency.currencySymbol);
//       // }
//     });

//     // Step 2: Fetch prices from CryptoCompare
//     let result = await fetchCryptoComparePrices(fiat_from, fiat_to);
//     if (!result) {
//       callback({ status: false, message: "Failed to fetch prices from CryptoCompare" });
//       return;
//     }

//     // Step 3: Fetch PTK price separately from CMC (even if PTK is in DB)
//     const PTKUsdPrice = await fetchPTKPrice();
//     console.log("PTKUsdPrice====",PTKUsdPrice);
//     if (PTKUsdPrice) {
//       // Step 4: Overwrite PTK price manually
//       result = await overwritePTKPrice(result, PTKUsdPrice);
//     } else {
//       console.error("PTK price not available, skipping PTK overwrite.");
//     }

//     console.log("final currency conversion===",result);

//     // Step 5: Save to Redis and respond
//     await client.hset("CurrencyConversion", "allpair", JSON.stringify(result));
//     callback({ status: true, message: result });

//   } catch (error) {
//     console.error("currency_conversion error:", error.message);
//     callback({ status: false, message: "Something went wrong" });
//   }
// };

// // Fetch prices from CryptoCompare
// async function fetchCryptoComparePrices(fiat_from, fiat_to) {
//   try {
//     console.log(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fiat_from}&tsyms=${fiat_to}&api_key=${process.env.cryptocompare_api_1}`)
//     const requestConfig = {
//       method: "GET",
//       url: `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fiat_from}&tsyms=${fiat_to}&api_key=${process.env.cryptocompare_api_1}`,
//     };
//     // console.log(
//     //   "currrency conversion", requestConfig
//     // )
//     let response = await axios(requestConfig);

//     if (response.data.Response === "Error") {
//       const fallbackConfig = {
//         method: "GET",
//         url: `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fiat_from}&tsyms=${fiat_to}&api_key=${process.env.cryptocompare_api_3}`,
//       };
//       response = await axios(fallbackConfig);
//     }

//     console.log("conversion data ====",response.data);

//     return response.data;
//   } catch (error) {
//     console.error("Error fetching CryptoCompare prices:", error.message);
//     return null;
//   }
// }

// // Fetch PTK price from CMC
// async function fetchPTKPrice() {
//   try {
//         var pair = "PTKUSDT";
//         var trade_pair = await tradePairDB.findOne({ pair: pair });
//         if (trade_pair != null) {
//           var pairname = pair;
//           var result = await redisHelper.RedisService.hget(
//             "BINANCE-TICKERPRICE",
//             pairname.toLowerCase()
//           );
//           if (result !== null) {
//             return (result.lastprice.lastprice != null) ? result.lastprice.lastprice : trade_pair.marketPrice;
//           } else {
//             var response = await redisHelper.RedisService.hget(
//               "GetTickerPrice",
//               pairname.toLowerCase()
//             );
//             if (response != null) {
//               return (response.lastprice.lastprice != null) ? response.lastprice.lastprice : trade_pair.marketPrice;
//             } else {
//               return trade_pair.marketPrice;
//             }
//           }
//         } else {
//           return 0.1;
//         }
//   } catch (error) {
//     return 0.1;
//   }
// }

// // Overwrite PTK prices
// async function overwritePTKPrice(result, PTKUsdPrice) {
//   try {
//     const usdPrice = result.USD.USD ? result.USD.USD : 0;
//     const usdEurPrice = result.USD.EUR ? result.USD.EUR : 0;
//     const usdCupPrice = result.USD.CUP ? result.USD.CUP : 0;
//     const usdRubPrice = result.USD.RUB ? result.USD.RUB : 0;

//     if (!usdPrice || !usdEurPrice || !usdCupPrice || !usdRubPrice) {
//       console.error("Missing rates for PTK conversion!");
//       return result;
//     }

//     // Overwrite/Insert PTK price
//     result["PTK"] = {
//       EUR: PTKUsdPrice * usdEurPrice,
//       CUP: PTKUsdPrice * usdCupPrice,
//       RUB: PTKUsdPrice * usdRubPrice,
//       USD: PTKUsdPrice * usdPrice,
//     };

//     console.log("PTK price overwritten successfully");
//     return result;
//   } catch (error) {
//     console.error("Error overwriting PTK price:", error.message);
//     return result;
//   }
// }

exports.currency_conversion = async function (callback) {
  try {
    // Step 1: Fetch active currencies
    const currencies = await currencyDB
      .find({ status: "Active" }, { currencySymbol: 1 })
      .sort({ popularOrder: 1 })
      .exec();

    const fiat_from = currencies.map(c => c.currencySymbol);
    const fiat_to = ["USDT","INR","USD","EUR","RUB"]; // Exclude CUP from CryptoCompare

    // Step 2: Fetch prices from CryptoCompare
    let result = await fetchCryptoComparePrices(fiat_from, fiat_to);
    if (!result) {
      callback({ status: false, message: "Failed to fetch prices from CryptoCompare" });
      return;
    }

    // Step 3: Fetch USD to CUP rate from fallback API
    const usdToCupRate = await fetchFiatConversion("USD", "CUP");
    if (!usdToCupRate) {
      callback({ status: false, message: "Failed to fetch USD to CUP rate" });
      return;
    }

    // Step 4: Calculate CUP for each currency via USD
    fiat_from.forEach(symbol => {
      const usdValue = result[symbol]?.USD;
      if (usdValue) {
        if (!result[symbol]) result[symbol] = {};
        result[symbol]["CUP"] = usdValue * usdToCupRate;
      }
    });

    // Step 5: Add CUP base conversions (CUP to others)
    result["CUP"] = {};
    fiat_to.concat("CUP").forEach(symbol => {
      const usdValue = result[symbol]?.USD;
      if (usdValue) {
        result["CUP"][symbol] = 1 / (usdValue / usdToCupRate);
      }
    });
    result["CUP"]["CUP"] = 1;

    // Step 6: Fetch PTK price and overwrite
    const PTKUsdPrice = await fetchPTKPrice();
    if (PTKUsdPrice) {
      result["PTK"] = {
        USDT: PTKUsdPrice,
        USD: PTKUsdPrice,
        EUR: PTKUsdPrice * (result.USD?.EUR || await fetchFiatConversion("USD", "EUR")),
        RUB: PTKUsdPrice * (result.USD?.RUB || await fetchFiatConversion("USD", "RUB")),
        CUP: PTKUsdPrice * usdToCupRate,
      };
    } else {
      console.error("PTK price not available, skipping overwrite.");
    }

    console.log("Final currency conversion ===", result);

    // Step 7: Save to Redis and return
    await client.hset("CurrencyConversion", "allpair", JSON.stringify(result));
    callback({ status: true, message: result });

  } catch (error) {
    console.error("currency_conversion error:", error.message);
    callback({ status: false, message: "Something went wrong" });
  }
};

// Fetch from CryptoCompare
async function fetchCryptoComparePrices(fiat_from, fiat_to) {
  try {
    const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fiat_from.join(",")}&tsyms=${fiat_to.join(",")}&api_key=${process.env.cryptocompare_api_1}`;
    console.log("Fetching CryptoCompare:", url);
    let response = await axios.get(url);

    // console.log("response fetchCryptoComparePrices =========", response);

    if (response.data.Response === "Error") {
      const fallbackUrl = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fiat_from.join(",")}&tsyms=${fiat_to.join(",")}&api_key=${process.env.cryptocompare_api_3}`;
      response = await axios.get(fallbackUrl);
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching CryptoCompare prices:", error.message);
    return null;
  }
}

// Fetch USD to CUP via exchangerate.host
// async function fetchFiatConversion(from, to) {
//   try {
//     const response = await axios.get(`https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1&access_key=7ebefd97325cda22696e7d6f31cec2a3`);
//     if (response.data && response.data.result) {
//       return response.data.result;
//     } else {
//       console.warn(`Missing rate from ${from} to ${to}`);
//       if (from === 'USD' && to === 'CUP') {
//         console.warn(`API missing rate, using fallback static rate for ${from} to ${to}`);
//         return 24.00; // Example fallback value (update as needed)
//       }
//       return null;
//     }
//   } catch (err) {
//     console.error(`Failed to convert ${from} to ${to}:`, err.message);
//     return null;
//   }
// }
async function fetchFiatConversion(from, to) {
  try {
    const cacheKey = `fiat:${from}:${to}`;

    // Step 1: Try Redis cache
    const cached = await redisHelper.RedisService.get(cacheKey);
    if (cached) {
      return cached; // use cached value
    }

    // Step 2: Call API if not cached
    const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1&access_key=7ebefd97325cda22696e7d6f31cec2a3`;
    const response = await axios.get(url);

    if (response.data && response.data.result) {
      const rate = response.data.result;

      // Step 3: Save to Redis with expiry (e.g. 30 mins)
      await redisHelper.RedisService.set(cacheKey, rate);
      client.expire(cacheKey, 1800); // 1800 sec = 30 mins

      return rate;
    } else {
      console.warn(`Missing rate from ${from} to ${to}`);
      if (from === "USD" && to === "CUP") {
        console.warn(`Using fallback static rate for USD→CUP`);
        return 24.0;
      }
      return null;
    }
  } catch (err) {
    console.error(`Failed to convert ${from} to ${to}:`, err.message);

    // Fallback if API fails
    if (from === "USD" && to === "CUP") {
      return 24.0;
    }
    return null;
  }
}

// Fetch PTK price from DB or Redis
async function fetchPTKPrice() {
  try {
    // const pair = "PTKUSDT";
    // const trade_pair = await tradePairDB.findOne({ pair });
    // if (!trade_pair) return 0.0027;

    // const key = pair.toLowerCase();
    // let result = await redisHelper.RedisService.hget("BINANCE-TICKERPRICE", key);
    // if (result?.lastprice?.lastprice) return result.lastprice.lastprice;

    // result = await redisHelper.RedisService.hget("GetTickerPrice", key);
    // if (result?.lastprice?.lastprice) return result.lastprice.lastprice;

    // return trade_pair.marketPrice || 0.0027;
    return 0.0027;
  } catch (error) {
    console.error("Error fetching PTK price:", error.message);
    return 0.0027;
  }
}


let create_log = (exports.create_log = async function (message, callback) {
  try {
    const logger = log4js.getLogger("justbit");
    await logger.error(message);
    callback({ status: true });
  } catch (err) {
    console.log("create_log catch ertt", err);
    callback({ status: false, message: "Something went wrong" });
  }
});

let trx_sendtoken = (exports.trx_sendtoken = async function (
  details,
  callback
) {
  try {
    var userAddress = details.address;
    var user_privateKey = details.privatekey;
    var adminAddress = details.adminaddress;
    var admin_privateKey = details.adminprivateKey;
    var decimals = details.decimal;
    var contractAddr = details.contractAddress;

    const tronWeb = new TronWeb({
      fullHost: "https://" + trxhost + "",
    });
    tronWeb.setAddress(userAddress);
    let contract = await tronWeb.contract().at(contractAddr);
    let result = await contract.balanceOf(userAddress).call();
    var amount = details.amount;
    //console.log("balance response trc20====",result);
    if (result) {
      let balance_res = converter.hexToDec(result._hex);
      console.log("user token balance==", balance_res);
      let realtokenbalance = balance_res / Math.pow(10, decimals);
      if (realtokenbalance > 0) {
        var account = userAddress;
        trx_balance({ address: account }, function (balance) {
          console.log("user tron balance", balance);
          if (balance.status == true) {
            var tron_balance = balance.balance;
            var fee = 20;
            if (tron_balance > fee) {
              var token_obj = {
                from_address: userAddress,
                privateKey: user_privateKey,
                to_address: adminAddress,
                contractAddress: contractAddr,
                decimal: decimals,
                amount: amount,
              };
              console.log("trc20 move params===", token_obj);
              trc20_withdraw(token_obj, async function (token_txn) {
                console.log("trc20 move response===", token_txn);
                if (token_txn.status) {
                  callback({ status: true });
                } else {
                  callback({ status: false });
                }
              });
            } else {
              console.log("user no tron balance");
              var transferAmount = 20 * 1000000;
              var trx_obj = {
                privateKey: admin_privateKey,
                from_address: adminAddress,
                to_address: userAddress,
                amount: transferAmount,
              };

              tron_withdraw(trx_obj, function (tron_response) {
                console.log("tron move to user response==", tron_response);
                if (tron_response.status) {
                  setTimeout(() => {
                    var token_obj = {
                      from_address: userAddress,
                      privateKey: user_privateKey,
                      to_address: adminAddress,
                      contractAddress: contractAddr,
                      decimal: decimals,
                      amount: amount,
                    };
                    console.log("trc20 move params===", token_obj);
                    trc20_withdraw(token_obj, async function (token_txn) {
                      console.log("trc20 move response===", token_txn);
                      if (token_txn.status) {
                        callback({ status: true });
                      } else {
                        callback({ status: false });
                      }
                    });
                  }, 60000);
                }
              });
            }
          } else {
            console.log("user no tron balance");
            var transferAmount = 20 * 1000000;
            var trx_obj = {
              privateKey: admin_privateKey,
              from_address: userAddress,
              to_address: userAddress,
              amount: transferAmount,
            };

            tron_withdraw(trx_obj, function (tron_response) {
              console.log("tron move to user response==", tron_response);
              if (tron_response.status) {
                setTimeout(() => {
                  var token_obj = {
                    from_address: userAddress,
                    privateKey: user_privateKey,
                    to_address: adminAddress,
                    contractAddress: contractAddr,
                    decimal: decimals,
                    amount: amount,
                  };
                  console.log("trc20 move params===", token_obj);
                  trc20_withdraw(token_obj, async function (token_txn) {
                    console.log("trc20 move response===", token_txn);
                    if (token_txn.status) {
                      callback({ status: true });
                    } else {
                      callback({ status: false });
                    }
                  });
                }, 60000);
              }
            });
          }
        });
      } else {
        //console.log("else part");
        callback({
          status: false,
        });
      }
    } else {
      callback({ status: false });
    }
  } catch (ex) {
    console.log("trc20 send token error==", ex);
    callback({ status: false });
  }
});

let getadminwallet_trade = (exports.getadminwallet_trade = function (
  currency,
  callback
) {
  adminWalletDB
    .findOne({ type: 2 }, { wallets: { $elemMatch: { currencyId: currency } } })
    .exec(function (err, resdata) {
      console.log("call admin trade wallet", resdata);
      if (resdata && resdata.wallets.length > 0) {
        callback(resdata.wallets[0]);
      }
    });
});

let updateadminTradeWallet = (exports.updateadminTradeWallet = async function (
  currency,
  amount,
  callback
) {
  console.log("updateadminTradeWallet");
  console.log(currency, amount, "currency, amount,");
  var balRes = await adminWalletDB.updateOne(
    { "wallets.currencyId": currency, type: 2 },
    { $set: { "wallets.$.amount": +amount } },
    { multi: true }
  );
  console.log("updateadminTradeWallet balRes", balRes);
  if (balRes) {
    callback(true);
  } else {
    callback(false);
  }
});

exports.createWallet = async function (
  userId,
  callback
) {
  try {
    let wallet_check = await userWalletDB.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (wallet_check == null) {
      let currencyData = await currencyDB.find({});
      if (currencyData.length > 0) {
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
          userId: userId,
          wallets: currencyArray,
        };

        let wallet_create = await userWalletDB.create(wallet_obj);
        if (wallet_create != null) {
          callback({ status: true });
        }
        else {
          callback({ status: false });
        }
      }
      else {
        callback({ status: false });
      }
    }
    else {
      callback({ status: false });
    }

  } catch (error) {
    callback({ status: false });
  }
};

let bnbgasPrice = (exports.bnbgasPrice = async function (callback) {
  try {
    var gasprice = await bsc_web3.eth.getGasPrice();
    console.log("gasprice===", gasprice);
    if (gasprice) {
      return { status: true, gasprice: gasprice };
    } else {
      return { status: false, message: "Something went wrong" };
    }
  } catch (err) {
    //console.log("bnb get gasprice catch===",err);
    return { status: false, message: "Something went wrong" };
  }
});
