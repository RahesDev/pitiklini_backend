const mongoose = require("mongoose");

const airdropSettingsSchema = new mongoose.Schema({
    dropTime: {
        type: Number,
        default: 0,
    },
    dropStart: {
        type: String, // Change to String to store values like "3am", "3pm"
        default: "12am", // Default value
    },
    dropEnd: {
        type: Number,
        default: 0,
    },
    dropDate: {
        type: Date,
    },
    firstthreeToken: {
        type: Number,
        default: 0, 
    },
    fourfiveToken: {
        type: Number,
        default: 0, 
    },
    sixtotenToken: {
        type: Number,
        default: 0, 
    },
    aftertenToken: {
        type: Number,
        default: 0, 
    },
    airdropProcessed: {
        type: Boolean,
        default: true, 
    },
    status: {
        type: Number,
        enum: [0, 1], // 0 means inactive, 1 means active
        default: 0, // Default is inactive
    },
    createdAt: {
        type: Date,
        default: Date.now, // Automatically set the creation date
    },
    updatedAt: {
        type: Date,
        default: Date.now, // Automatically update the last modified date
    },
});

// Add a pre-save hook to update the "updatedAt" field on every save
airdropSettingsSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("AirdropSettings", airdropSettingsSchema);
