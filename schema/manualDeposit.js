const mongoose = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");

const manualDepositSchema = mongoose.Schema({
	currency: {
		type: String,
		default: "",
		alias: 'currency_symbol'
	},
	currency_id: {
		type: mongoose.Types.ObjectId,
		ref: 'currency',
	},
	holderName: {
		type: String,
		default: ""
	},
	ifscCode: {
		type: String,
		default: ""
	},
	bankName: {
		type: String,
		default: ""
	},
	amount: {
		type: Number,
		default: 0.00
	},
	transactionID: {
		type: String,
		default: "Nil"
	},
	proofImage: {
		type: String,
		default: ""
	},
	upiID: {
		type: String,
		default: ""
	},
	depositstatus: {
		type: String,
		default: "active"
	},
	mode: {
		type: Number,
		default: 0
	},
	status: {
		type: String,
		default: 1
	},
	identifier: {
		type: String,
		default: ""
	},
	aprooveStatus: {
		type: String,
		default: 0 // 0 means => pending, 1 means => approved 2 means => rejected
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'users',
		index: true
	},
	createdDate: {
		type: Date,
		default: Date.now
	},
	modifiedDate: {
		type: Date,
		default: Date.now
	},
	remark: {
		type: String,
		default: ""
	},
});
manualDepositSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('manualDeposit', manualDepositSchema);