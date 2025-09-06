const mongoose = require("mongoose");

const CurrencySchema = mongoose.Schema({
  currencyName: { type: String },
  currencySymbol: { type: String },
  walletSymbol: { type: String },
  currencyType: { type: String }, // 1-Coin, 2-Token
  coinType: { type: String }, // 1-Crypto, 2-Fiat
  Currency_image: { type: String },
  status: { type: String },
  depositStatus: { type: String, default: "Active" },
  withdrawStatus: { type: String, default: "Active" },
  launchpadStatus: { type: String, default: "DeActive" },
  autoWithdrawLimit: { type: Number, default: 1000 },
  tradeStatus: { type: String },
  makerFee: { type: Number, default: 0 },
  takerFee: { type: Number, default: 0 },
  withdrawFee: { type: Number, default: 0 },
  minWithdrawLimit: { type: Number, default: 0 },
  maxWithdrawLimit: { type: Number, default: 0 },
  maxTradeAmount: { type: Number, default: 0 },
  minTradeAmount: { type: Number, default: 0 },
  Withdraw24Limit: { type: Number, default: 0 },
  estimatedValueInRON: { type: Number, default: 0 },
  estimatedValueInBTC: { type: Number, default: 0 },
  estimatedValueInUSD: { type: Number, default: 0 },
  estimatedValueInEUR: { type: Number, default: 0 },
  estimatedValueInETH: { type: Number, default: 0 },
  estimatedValueInUSDT: { type: Number, default: 0 },
  estimatedValueInINR: { type: Number, default: 0 },
  pripopularOrderceChange: { type: Number, default: 0 },
  popularOrder: { type: Number, default: 0 },
  contractAddress: { type: String },
  coinDecimal: { type: String ,default: "0" },
  block: { type: Number, default: 0 },
  walletType: { type: Number, default: 0 }, // 0 - corewallet, 1-coinpayments
  erc20token: { type: String }, // 2-false,1-true
  trc20token: { type: String }, // 2-false,1-true
  bep20token: { type: String }, // 2-false,1-true
  rptc20token: { type: String }, // 2-false,1-true
  matictoken: { type: String, default: "0" },
  coin_volume: { type: Number, default: 0 },
  launchPadFee: { type: Number, default: 0 },
  stakeAdminProfit: { type: Number, default: 0 },
  stakeFlexibleInterest: { type: Number, default: 0 },
  p2p_status: { type: String }, // 2-false,1-true
  fixedStakingStatus: { type: String, default: "Deactive" }, // Active means available for stake else not availble for stake
  flexibleStakingStatus: { type: String, default: "Deactive" }, // Active means available for stake else not availble for stake
  p2p_status: { type: String }, // 2-false,1-true
  minDepositLimit: { type: Number, default: 0.01 },
  maxDepositLimit: { type: Number, default: 1000 },
  coin_price: { type: Number, default: 0 },
  coin_change: { type: Number, default: 0 },
  createdDate: { type: Date, default: Date.now() },
  modifiedDate: { type: Date, default: Date.now() },
  swapFee: { type: Number, default: 0 },
  minSwap: { type: Number, default: 0 },
  maxSwap: { type: Number, default: 0 },
  swapStatus: { type: Number, default: "0" }, // 0 - false, 1 - true
  swapPrice: { type: Number, default: 0 },
  contractAddress_erc20: { type: String },
  contractAddress_bep20: { type: String },
  contractAddress_trc20: { type: String },
  contractAddress_rptc20: { type: String },
  contractAddress_matic: { type: String },
  coinDecimal_matic: { type: String },
  coinDecimal_erc20: { type: String },
  coinDecimal_bep20: { type: String },
  coinDecimal_trc20: { type: String },
  coinDecimal_rptc20: { type: String },
  withdrawFee_usdt: { type: Number, default: 0 },
});

module.exports = mongoose.model("currency", CurrencySchema, "currency");
