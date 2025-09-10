require("dotenv").config();
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var bodyParser = require("body-parser");
var cors = require("cors");
const { mongoose } = require("./config/db");
const key = require("./config/key");
const axios = require("axios");
var usersRouter = require("./routes/users");
var mobileUsersRouter = require("./routes/mobileUsers");
var adminRouter = require("./routes/adminapi");
var settingsRouter = require("./routes/settings");
var supportRouter = require("./routes/support");
var mobileSupportRouter = require("./routes/mobileSupport");
var kycRouter = require("./routes/kyc");
var mobileKycRouter = require("./routes/mobileKyc");
var mobileWithdrawRouter = require("./routes/mobileWithdraw");
var withdrawRouter = require("./routes/withdraw");
var userCryptoAddress = require("./userAddress/getAddress");
var mobileUserCryptoAddress = require("./userAddress/mobileGetAddress");
const swap = require("./routes/swap");
const mobileSwap = require("./routes/mobileSwap");
var p2pRouter = require("./routes/p2p");
var mobileP2pRouter = require("./routes/mobileP2P");
var trade = require("./routes/trade");
var referralRouter = require("./routes/referral");
var onboardingRouter = require("./routes/onboarding");
var mobileOnboardingRouter = require("./routes/mobileonboarding");
// var mobileDepositRouter = require("./routes/mobileDeposit");

var redisCache = require("./redis-helper/redisHelper");

const http = require("http");
var orderPlace = require("./cryptoExchange/orderPlace");
var orderCancel = require("./cryptoExchange/cancelOrder");
const fs = require("fs");
const https = require("https");
var chartRouter = require("./routes/chart");
const common = require("./helper/common");
var ip = require("ip");

var marketTrades = require("./cryptoExchange/marcketTrade");

var activeOrdersRedis = require("./tradeRedis/activeOrderRedis");

// var BinanceExchangeWS = require("./exchanges/Binance_New");
var BinanceExchangeWS = require("./exchanges/binance");

redisCache.updateRedisPairs(() => {});

activeOrdersRedis.activeOrdersSet();

BinanceExchangeWS.currentOrderBook("element");

BinanceExchangeWS.currencyConversion();

common.currency_conversion(function (resp) {});

const port = key.port;

var staking = require("./staking/staking");
var mobileStaking = require("./staking/mobileStaking");
const DATASPIKE_API_KEY = process.env.DATASPIKE_API_KEY;
// const WEBHOOK_URL = "https://db5d-2406-7400-ca-b6f9-7180-fb05-6e34-6ed5.ngrok-free.app/kyc/webhook";
const WEBHOOK_URL = "https://pitiklini.blfdemo.online:3033/kyc/webhook";
const DATASPIKE_API_URL =
  "https://sandboxapi.dataspike.io/api/v3/organization/webhooks";

var app = express();

// Import routes

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

var corsPath = {
  origin: function (origin, callback) {
    try {
      // console.log("origin====",origin)
      if (origin !== "undefined") {
        if (key.WHITELISTURL.indexOf(origin) > -1) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      } else {
        // console.log("error", 'Corss Error');
      }
    } catch (error) {
      console.log(error, "cors Error");
    }
  },
};

app.use(cors(corsPath));

app.use("/users", usersRouter);
app.use("/callUsers", mobileUsersRouter);
app.use("/adminapi", adminRouter);
app.use("/settings", settingsRouter);
app.use("/support", supportRouter);
app.use("/kyc", kycRouter);

app.use("/withdraw", withdrawRouter);
app.use("/callWithdraw", mobileWithdrawRouter);
app.use("/address", userCryptoAddress);
app.use("/orderPlaceApi", orderPlace);
app.use("/orderCancelApi", orderCancel);
app.use("/chartapi", chartRouter);
app.use("/marketTrades", marketTrades);
app.use("/swap", swap);
app.use("/staking", staking);
app.use("/p2p", p2pRouter);
app.use("/referral", referralRouter);
app.use("/onboarding", onboardingRouter);

app.use("/callOnboarding", mobileOnboardingRouter);
// app.use('/callDeposit', mobileDepositRouter);
app.use("/callAddress", mobileUserCryptoAddress);
app.use("/callStaking", mobileStaking);
app.use("/callKyc", mobileKycRouter);
app.use("/callSwap", mobileSwap);
app.use("/callSupport", mobileSupportRouter);
app.use("/callp2p", mobileP2pRouter);

const { startSocket } = require("./services/socket/socket");

app.use("/trade", trade);

require("./routes/adminMove");

const listWebhooks = async () => {
  try {
    const headers = { "ds-api-token": DATASPIKE_API_KEY };
    const response = await axios.get(DATASPIKE_API_URL, { headers });

    console.log("Existing Webhooks:", JSON.stringify(response.data, null, 2));
    return response.data.webhooks || [];
  } catch (error) {
    console.error(
      "Error fetching webhooks:",
      error.response?.data || error.message
    );
    return [];
  }
};

const deleteWebhook = async (webhookId) => {
  try {
    console.log(webhookId, "webhookId==");
    const headers = { "ds-api-token": DATASPIKE_API_KEY };
    await axios.delete(`${DATASPIKE_API_URL}/${webhookId}`, { headers });
  } catch (error) {
    console.error(
      `Webhook deletion failed (${webhookId}):`,
      error.response?.data || error.message
    );
  }
};

const registerWebhook = async () => {
  try {
    const headers = {
      "ds-api-token": DATASPIKE_API_KEY,
      "Content-Type": "application/json",
    };

    const payload = {
      is_sandbox: true,
      webhook_url: WEBHOOK_URL,
      event_types: ["AML_SCREENING", "DOCVER"],
      // redirect_url:"http://localhost:3000/kyc",
      redirect_url: "https://pitiklini.blfdemo.online/kyc",
      enabled: true,
    };

    const response = await axios.post(DATASPIKE_API_URL, payload, { headers });
    console.log("Webhook registered successfully:", response.data);
  } catch (error) {
    console.error(
      "Webhook registration failed:",
      error.response?.data || error.message
    );
  }
};

const resetWebhook = async () => {
  try {
    const webhooks = await listWebhooks();

    const matchingWebhooks = webhooks.filter(
      (w) => w.webhook_url === WEBHOOK_URL
    );

    if (matchingWebhooks.length > 0) {
      console.log(
        `Found ${matchingWebhooks.length} existing webhook(s) with the same URL. Deleting...`
      );

      for (const webhook of matchingWebhooks) {
        await deleteWebhook(webhook.webhook_id);
      }
    }

    await registerWebhook();
  } catch (error) {
    console.error(
      "Error in webhook reset process:",
      error.response?.data || error.message
    );
  }
};

// resetWebhook();

var server = "";
var ip = require("ip");
var myip = ip.address();
console.log("myip===", myip);
if (myip == "62.72.31.215") {
  const options = {
    key: fs.readFileSync("/var/www/html/backend/sslfiles/privkey.pem"),
    cert: fs.readFileSync("/var/www/html/backend/sslfiles/fullchain.pem"),
    requestCert: false,
  };
  // server = https.createServer(options, app);
  // startSocket(server);
  const httpsServer = https.createServer(options, app);
  startSocket(httpsServer);
  httpsServer.listen(key.port, "0.0.0.0", () => {
    console.log("HTTPS Server running on", key.port);
  });

  // optional HTTP fallback for testing
  const httpServer = http.createServer(app);
  httpServer.listen(3032, "0.0.0.0", () => {
    console.log("HTTP Server running on 3032");
  });
} else {
  // server = http.createServer(app);
  // startSocket(server);
  const httpServer = http.createServer(app);
  startSocket(httpServer);
  httpServer.listen(key.port, "0.0.0.0", () => {
    console.log("HTTP Server running on", key.port);
  });
}
server.listen(key.port, "0.0.0.0", () => {
  console.log("Server connected on", key.port);
});
// server.listen(key.port, () => {
//   console.log("Server connected on", key.port);
// });

module.exports = app;
