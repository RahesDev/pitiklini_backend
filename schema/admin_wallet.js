var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var AdminwalletSchema = new Schema({	
	"btc_address":{type: String,default:""},
	"ltc_address":{type: String,default:""},
	"eth_address":{type: String,default:""},
	"btc_balance":{type: Number,default:0},
	"ltc_balance":{type: Number,default:0},
	"eth_balance":{type: Number,default:0},
	"okb_balance":{type: Number,default:0},
	"usdt_balance":{type: Number,default:0},
    "link_balance":{type: Number,default:0},
	"wbtc_balance":{type: Number,default:0},
	"dai_balance":{type: Number,default:0},
    "busd_balance":{type: Number,default:0},
    "uni_balance":{type: Number,default:0},
	"okb_contract_address":{type: String,default:""},
    "usdt_contract_address":{type: String,default:""},
    "link_contract_address":{type: String,default:""},
    "wbtc_contract_address":{type: String,default:""},
    "dai_contract_address":{type: String,default:""},
    "busd_contract_address":{type: String,default:""},
    "uni_contract_address":{type: String,default:""},
    "admin_token_name":{type: String,default:""}
});
module.exports = mongoose.model('admin_wallet', AdminwalletSchema, 'admin_wallet')