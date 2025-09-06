const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema({

  facebook: { type: String, default: '' },
  twitter: { type: String, default: '' },
  linkedIn: { type: String, default: '' },
  instagram: { type: String, default: '' },
  reddit: { type: String, default: '' },
  youtube: { type: String, default: '' },
  bitcointalk: { type: String, default: '' },
  whatsappNumber: { type: String, default: '' },
  email: { type: String, default: '' },
  copyrightText: { type: String, default: '' },
  coinMarketCap: { type: String, default: '' },
  coinGecko: { type: String, default: '' },
  telegram: { type: String, default: '' },
  footerContent: { type: String, default: '' }, // Text area content
  depositStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  depositMaintenance: { type: String, default: '' },
  withdrawalStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  withdrawalMaintenance: { type: String, default: '' },
  siteStatus: { type: String, default: 'Inactive' },
  kycStatus: { type: String, default: 'Active' },
  kycMaintenance: { type: String, default: '' },
  tradeStatus: { type: Number, default: 0},
  tradeContent: { type: String, default: "" },
  siteMaintenance: { type: String, default: '' },
  siteLogo: { type: String, default: '' }, // URL string
  favicon: { type: String, default: '' },  // URL string
  createdDate: { type: Date, default: Date.now },
  modifiedDate: { type: Date, default: Date.now },
});

// Export the model
module.exports = mongoose.model('AdminSettings', adminSettingsSchema, 'adminSettings');
