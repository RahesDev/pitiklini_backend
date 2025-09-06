var express = require("express");
var router = express.Router();
const currencyDB = require("../schema/currency");
const common = require("../helper/common");
var mongoose = require("mongoose");
let ObjectId = mongoose.Types.ObjectId;
const p2pOrdersDB = require("../schema/p2pOrder");
const { default: ShortUniqueId } = require("short-unique-id");
const uid = new ShortUniqueId();
const p2pChatDB = require("../schema/p2pChat");
const p2pconfirmOrder = require("../schema/p2pconfirmOrder");
const notifyDB = require("../schema/notification");
const kyc = require("../schema/kyc");
const usersDB = require("../schema/users");
const moment = require("moment");
const userWalletDB = require("../schema/userWallet");
const bankdb = require("../schema/bankdetails");
const p2pdispute = require("../schema/p2pdispute");
const { RedisService } = require("../services/redis");


//---------------------------Author Mugesh ------------------------------


router.get("/p2p_currencies", async (req, res) => {
  try {
    // Fetch active currencies with P2P status
    const currencies = await currencyDB
      .find(
        { status: "Active", p2p_status: "1" },
        { currencySymbol: 1, coinType: 1, currencyName: 1, Currency_image: 1, estimatedValueInUSDT: 1, _id: 1 }
      )
      .sort({ popularOrder: 1 });

    if (!currencies || currencies.length == 0) {
      return res.status(404).json({ status: false, message: "No currencies found" });
    }

    return res.status(200).json({ status: true, data: currencies });


  } catch (err) {
    console.error("Error fetching currencies:", err);
    return res.status(500).json({ status: false, message: "Something went wrong, please try again later" });
  }
});


router.post("/fetch_price", common.tokenmiddleware, async (req, res) => {
  try {
    var firstCurrency = req.body.fromCurrency;
    var secondCurrency = req.body.toCurrency;
    var pair = firstCurrency + secondCurrency;
    console.log("firstCurrency==", firstCurrency);
    console.log("secondCurrency==", secondCurrency);
    let currency_det = await currencyDB.findOne({
      currencySymbol: firstCurrency,
    });

    let high = await p2pOrdersDB
      .find({
        status: { $in: ["filled"] },
        firstCurrency: firstCurrency,
        secondCurrnecy: secondCurrency,
        orderType: "sell",
      })
      .sort({ price: -1 });
    let low = await p2pOrdersDB
      .find({
        status: { $in: ["partially", "active"] },
        firstCurrency: firstCurrency ? firstCurrency : "",
        secondCurrnecy: secondCurrency ? secondCurrency : "",
        orderType: "buy",
      })
      .sort({ price: 1 });

    // Check if high array is not empty, then find the highest price, otherwise set to 0 or a default value
    const highestPrice = high && high.length > 0
      ? high.reduce((max, order) => order.price > max ? order.price : max, high[0].price)
      : ""; // Default value if high array is empty

    // Check if low array is not empty, then find the lowest price, otherwise set to 0 or a default value
    const lowestPrice = low && low.length > 0
      ? low.reduce((min, order) => order.price < min ? order.price : min, low[0].price)
      : ""; // Default value if low array is empty

    // Prepare the response
    var resp = {
      highprice: highestPrice,
      lowprice: lowestPrice,
      firstCurrency: firstCurrency,
      secondCurrency: secondCurrency,
    };

    // Return the response as JSON
    return res.json({ status: true, data: resp });


    //}
  } catch (error) {
    console.log("catch error===", error);
    return res.json({ status: false, message: error.message });
  }
});

router.post("/postAddOrder", common.tokenmiddleware, async (req, res) => {
  try {
    const {
      quantity,
      price,
      minQuantity,
      maxQuantity,
      cryptoCurrency,
      fiatCurrency,
      preferredPayment,
      paymentTime,
      orderType,
      fromcurrency,
    } = req.body;


    console.log(req.body);
    // Check if all required fields are present
    if (!quantity || !price || !minQuantity || !maxQuantity || !cryptoCurrency || !fiatCurrency || !preferredPayment || !paymentTime) {
      return res.json({ status: false, Message: "Please provide all fields", bank: false });
    }

    const bankdata = await bankdb.findOne({ userid: req.userId });
    if (!bankdata) {
      return res.json({ status: false, Message: "Please update your bank details", bank: true });
    }

    const userdetail = await usersDB.findOne({ _id: req.userId }, { email: 1, displayname: 1 });

    const newRec = {
      userId: req.userId,
      email: common.decrypt(userdetail.email),
      displayname: userdetail.displayname,
      orderType,
      firstCurrency: cryptoCurrency,
      secondCurrnecy: fiatCurrency,
      totalAmount: quantity,
      price,
      fromLimit: minQuantity,
      toLimit: maxQuantity,
      paymentMethod: preferredPayment,
      status: "active",
      orderId: uid.randomUUID(6).toLowerCase(),
      fromCurrency: fromcurrency,
      toCurrency: req.body.tocurrency,
      filledAmount: quantity,
      pay_time: paymentTime,
      available_qty: quantity,
    };


    console.log(newRec, "newRec");

    if (orderType === "sell") {
      const userBalance = await common.getUserBalance(req.userId, fromcurrency);

      if (userBalance != null) {
        console.log(userBalance, "ujjujnju");

        if (userBalance.totalBalance >= quantity) {
          try {
            console.log("jnjnjnjnjnjmn");

            const saveP2P = await p2pOrdersDB.create(newRec);

            console.log(saveP2P, "jnjnjnjnjnjmn");

            if (saveP2P) {
              const updateAmount = Math.max(userBalance.totalBalance - quantity, 0);
              const updateHoldAmount = Math.max(userBalance.balanceHoldTotal + quantity, 0);

              const balanceUpdate = await common.updateUserBalances(
                req.userId,
                fromcurrency,
                updateAmount,
                userBalance.totalBalance,
                saveP2P._id,
                "sell"
              );

              console.log(balanceUpdate, "ihnikjikjijikjijij");

              if (balanceUpdate && balanceUpdate.nModified === 1) {
                await common.updateHoldAmount(req.userId, fromcurrency, updateHoldAmount);
                return res.json({ status: true, Message: "Your P2P order placed successfully", orderId: saveP2P.orderId });
              } else {
                return res.json({ status: false, Message: "Failed to update balance." });
              }
            }
          } catch (error) {
            console.error("Error placing P2P sell order:", error);
            return res.json({ status: false, Message: "Failed to place order, please try again later." });
          }
        } else {
          console.log('Insufficient Balance');
          return res.json({ status: false, Message: "Insufficient Balance", bank: false });
        }
      } else {
        console.log('User balance not found or error occurred');
        return res.json({ status: false, Message: "Please try again later!", bank: false });
      }

      console.log("=============outer");

    } else {
      try {
        const saveP2P = await p2pOrdersDB.create(newRec);
        if (saveP2P) {
          return res.json({ status: true, Message: "Your P2P order placed successfully", orderId: saveP2P.orderId });
        }
      } catch (error) {
        console.error("Error placing P2P buy order:", error);
        return res.json({ status: false, Message: "Failed to place order, please try again later." });
      }
    }


    return res.json({ status: false, Message: "Please try again later222222222!", bank: false });
  } catch (error) {
    console.error("Error in postAddOrder API:", error);
    return res.send({ success: false, Message: "Something went wrong", bank: false });
  }
});

router.post("/p2p_get_order", common.tokenmiddleware, async (req, res) => {
  try {

    let getOrders = await p2pOrdersDB.findOne({
      orderId: req.body.orderId,
    }).populate('userId', 'displayname profile_image');

    console.log(getOrders, "ihnujhnjnjhnjn");

    var completed_trades = await p2pOrdersDB.find({
      userId: ObjectId(getOrders.userId._id),
      status: "filled",
    }).countDocuments();

    var filled_trades = await p2pOrdersDB
      .find({ status: "filled" })
      .countDocuments();

    var rating = (completed_trades / filled_trades) * 100;
    rating = (!isNaN(rating)) ? rating : 0;

    if (getOrders != null) {
      let userprofile = await usersDB.findOne({ _id: ObjectId(getOrders.userId._id) });

      console.log(userprofile, "userprofile");
      var ordertype = "";
      if (getOrders.orderType == "buy") {
        ordertype = "Sell";
      } else if (getOrders.orderType == "sell") {
        ordertype = "Buy";
      }
      var payment_method = "";
      if (getOrders.paymentMethod == "All payments") {
        payment_method = ["Bank Transfer", "UPI ID", "Paytm"];
      } else {
        payment_method = [getOrders.paymentMethod];
      }
      var order_qty = +getOrders.totalAmount - +getOrders.processAmount;

      var userId = req.userId;
      var p2pbalance = 0;
      common.getUserBalance(
        userId,
        getOrders.fromCurrency,
        function (userBalance) {
          console.log("p2p balance response===", userBalance.totalBalance);
          if (userBalance != null) {
            p2pbalance = userBalance.totalBalance;
          } else {
            p2pbalance = 0;
          }
        }
      );

      var p2p_obj = {
        _id: getOrders._id,
        orderId: getOrders.orderId,
        ordertype: ordertype,
        quantity: order_qty + " " + getOrders.firstCurrency,
        price: getOrders.price + " " + getOrders.secondCurrnecy,
        payment_method: payment_method,
        currency_symbol: getOrders.firstCurrency,
        displayname: userprofile.displayname,
        profile_image: "https://res.cloudinary.com/dxknk0rio/image/upload/v1706862985/awdp1sb3w6sntctxfsor.png",
        p2pbalance: p2pbalance,
        orders_count: +completed_trades,
        rating: rating,
        firstCurrency: getOrders.firstCurrency,
        secondCurrency: getOrders.secondCurrnecy,
        fromLimit: getOrders.fromLimit,
        toLimit: getOrders.toLimit,
        orderPrice: getOrders.price,
        orders_count: completed_trades,
        rating: parseFloat(rating).toFixed(2),
        user_id: getOrders.userId._id,
        // available_qty: +getOrders.filledAmount,
        available_qty: +order_qty,
      };
      return res.json({ status: true, Message: p2p_obj });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});


router.post(
  "/bankdetails",
  common.tokenmiddleware,
  async (req, res) => {

    try {
      const { name, accountNumber, bankName, branch, upid, paytm, ifsc, QRcode, type, accountType } = req.body;

      console.log(req.userId, "req.userId");

      // Check if the user already has bank details
      let existingBankDetails = await bankdb.findOne({ userid: req.userId }).lean().exec();
      let status = !existingBankDetails;

      const bankDetailsObj = {
        Accout_HolderName: name,
        Account_Number: accountNumber,
        Bank_Name: bankName,
        Branch_Name: branch,
        Upid_ID: upid,
        Paytm_ID: paytm,
        IFSC_code: ifsc,
        QRcode: QRcode,
        userid: req.userId,
        type: type,
        Account_Type: accountType,
        Status: status,
      };

      // If bank details exist, update them; otherwise, create new entry
      let bankDetailsResponse;

      bankDetailsResponse = await bankdb.create(bankDetailsObj);


      if (bankDetailsResponse) {
        return res.json({
          status: true,
          Message: "Bank details updated successfully!",
        });
      } else {
        return res.status(500).json({
          status: false,
          Message: "Failed to update bank details.",
        });
      }
    } catch (error) {
      console.error(error, "Error updating bank details");
      return res.status(500).json({
        status: false,
        Message: "Internal server error",
        code: 500,
      });
    }
  }
);


router.get("/Get_bankdetails", common.tokenmiddleware, async (req, res) => {
  try {
    let getBankDetails = await bankdb
      .find({ userid: req.userId })
      .sort({ _id: -1 })
      .exec();
    if (getBankDetails) {
      return res.json({
        status: true,
        Message: "bank details are getted",
        data: getBankDetails,
      });
    } else {
      return res.json({ status: false, Message: [], data: [] });
    }
  } catch (error) {
    res.json({ status: false, Message: "Internel server error", code: 500 });
  }
});

router.post("/deletbankDetails", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body, "delete account");

    // Delete the specific bank detail
    let deletedData = await bankdb.deleteOne({
      _id: req.body._id,
      userid: req.userId,
    });

    if (deletedData.deletedCount === 0) {
      return res.json({ status: false, message: "Bank details not found!" });
    }

    // Check if any other bank details exist for the user
    let remainingBanks = await bankdb.find({ userid: mongoose.Types.ObjectId(req.userId) });

    if (remainingBanks.length > 0) {
      // Set all remaining bank details to inactive
      await bankdb.updateMany(
        { userid: mongoose.Types.ObjectId(req.userId) },
        { $set: { Status: 0 } }
      );

      // Activate the first remaining bank detail
      await bankdb.findOneAndUpdate(
        { _id: remainingBanks[0]._id },
        { $set: { Status: 1 } }
      );
    }

    return res.json({
      status: true,
      message: "Bank details deleted successfully!",
    });
  } catch (error) {
    console.error(error);
    return res.json({
      status: false,
      message: "Internal server error. Please try again later!",
    });
  }
});



router.post("/updateBankdetails", common.tokenmiddleware, async (req, res) => {
  try {
    var reqbody = req.body;
    var status = "";
    let getBankDetails = await bankdb.find({ userid: req.userId }).exec();
    status = getBankDetails.length == 0 ? 1 : 0;

    var obj = {
      Accout_HolderName: reqbody.name,
      Account_Number: reqbody.accountNumber,
      Bank_Name: reqbody.bankName,
      Branch_Name: reqbody.branch,
      Upid_ID: reqbody.upid,
      Paytm_ID: reqbody.paytm,
      IFSC_code: reqbody.ifsc,
      QRcode: reqbody.QRcode,
      type: reqbody.type,
      Account_Type: reqbody.accountType
    };

    console.log(req.body, "-=-reqbody=-=-=", obj);
    const createbankdetails = await bankdb.updateOne(
      { _id: reqbody._id },
      { $set: obj }
    );

    console.log(createbankdetails, "--=-=createbankdetails=-=-");
    if (createbankdetails) {
      return res.json({
        status: true,
        Message: "Bank details updated successfully!!",
      });
    } else {
      return res.json({
        status: true,
        Message: "Bank details not updated successfully!!",
      });
    }
  } catch (error) {
    console.log(error, "=-=-=error-=-");
    res.json({ status: false, Message: "Internel server error", code: 500 });
  }
});

router.post("/getAllp2pOrder", async (req, res) => {
  try {
    var userId = req.userId;
    if (req.body.currency != undefined && req.body.currency != "") {
      var whereCondn = {
        $and: [
          {
            secondCurrnecy: req.body.currency,
            status: { $in: ["active", "partially"] },
          },
        ],
      };
    } else {
      var whereCondn = { $or: [{ status: "active" }, { status: "partially" }] };
    }
    let getOrders = await p2pOrdersDB.find(whereCondn).populate('userId', 'displayname profile_image location').sort({ createdAt: -1 }).exec();

    var p2p_list = [];
    if (getOrders) {
      for (var i = 0; i < getOrders.length; i++) {
        if (getOrders[i].userId != null) {
          var completed_trades = await p2pOrdersDB.find({
            userId: ObjectId(getOrders[i].userId._id),
            status: "filled",
          }).countDocuments();
          var filled_trades = await p2pOrdersDB
            .find({ status: "filled" })
            .countDocuments();
          var rating = (completed_trades / filled_trades) * 100;
          rating = (!isNaN(rating)) ? rating : 0;
          var available_qty =
            +getOrders[i].totalAmount - +getOrders[i].processAmount;
          if (available_qty > 0) {
            var obj = {
              orderId: getOrders[i].orderId,
              totalAmount: getOrders[i].totalAmount,
              processAmount: getOrders[i].processAmount,
              firstCurrency: getOrders[i].firstCurrency,
              secondCurrnecy: getOrders[i].secondCurrnecy,
              displayname: getOrders[i].displayname,
              price: parseFloat(getOrders[i].price).toFixed(2),
              fromLimit: getOrders[i].fromLimit,
              toLimit: getOrders[i].toLimit,
              paymentMethod: getOrders[i].paymentMethod,
              orderType: getOrders[i].orderType,
              orders_count: +completed_trades,
              rating: rating,
              location: (getOrders[i].userId.location != null && getOrders[i].userId.location != "") ? getOrders[i].userId.location : "India",
              profile_image: (getOrders[i].userId.profile_image != null && getOrders[i].userId.profile_image != "") ? getOrders[i].userId.profile_image : "https://res.cloudinary.com/dxknk0rio/image/upload/v1706862985/awdp1sb3w6sntctxfsor.png",
              user_id: getOrders[i].userId._id,
              available_qty: parseFloat(available_qty).toFixed(8),
              pay_duration: getOrders[i].pay_time
            };
            p2p_list.push(obj);
          }
        }
      }
      return res.json({ status: true, Message: p2p_list });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});


router.post("/p2p_confirm_order", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var bodyData = req.body;

    if (bodyData.orderId != "") {
      let p2pdet = await p2pOrdersDB.findOne({ orderId: bodyData.orderId });
      if (p2pdet) {
        var processAmount = 0;
        processAmount = p2pdet.totalAmount - p2pdet.processAmount;
        processAmount = parseFloat(processAmount).toFixed(8);
        if (processAmount >= +bodyData.qty) {
          var filled = p2pdet.filledAmount - +bodyData.qty;
          const confirmOrder = {
            map_orderId: bodyData.orderId,
            map_userId: ObjectId(userId),
            p2p_orderId: ObjectId(p2pdet._id),
            fromCurrency: p2pdet.firstCurrency,
            toCurrency: p2pdet.secondCurrnecy,
            askAmount: bodyData.qty,
            askPrice: p2pdet.price,
            type: "buy",
            filledAmount: filled,
            userId: ObjectId(p2pdet.userId),
            orderId: uid.randomUUID(6).toLowerCase(),
            firstCurrency: p2pdet.fromCurrency,
            secondCurrency: p2pdet.toCurrency,
          };
          console.log("confirmOrder==", confirmOrder);
          let confirmation = await p2pconfirmOrder.create(confirmOrder);
          var processAmount = 0;
          processAmount = p2pdet.processAmount + +bodyData.qty;
          let p2pUpdate = await p2pOrdersDB.updateOne(
            { _id: ObjectId(p2pdet._id) },
            { $set: { processAmount: processAmount, order_status: "processing" } }
          );
          if (confirmation != null) {
            var message = "Order Confirmed Successfully";
            let from_user = await usersDB.findOne(
              { _id: ObjectId(userId) },
              { username: 1 }
            );
            let to_user = await usersDB.findOne(
              { _id: ObjectId(p2pdet.userId) },
              { username: 1 }
            );
            var obj = {
              from_user_id: ObjectId(userId),
              to_user_id: ObjectId(to_user._id),
              p2porderId: ObjectId(p2pdet._id),
              from_user_name: from_user.username,
              to_user_name: to_user.username,
              status: 0,
              message:
                "" +
                from_user.username +
                " has confirmed the order for " +
                confirmation.askAmount +
                " " +
                p2pdet.firstCurrency +
                " " +
                p2pdet.orderType +
                " order",
              link: "/p2p/chat/" + confirmation.orderId,
            };
            let notification = await notifyDB.create(obj);
            common.sendResponseSocket(
              "success",
              notification.message,
              "notify",
              notification.to_user_id,
              function () { }
            );

            let newRec = {
              advertiserId: ObjectId(to_user._id),
              adv_name: to_user.username,
              adv_msg:
                "Important: Please DO NOT share payment proof or communicate with counterpart outside the Taikonz P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
              adv_file: "",
              p2porderId: ObjectId(confirmation._id),
              orderId: confirmation.orderId,
              adv_date: Date.now(),
              type: "advertiser",
              default: 1,
            };
            let savechat = await p2pChatDB.create(newRec);


            let newRec_sell = {
              userId: ObjectId(userId),
              user_name: from_user.username,
              user_msg:
                "Important: Please DO NOT share payment proof or communicate with counterpart outside the Taikonz P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
              user_file: "",
              p2porderId: ObjectId(confirmation._id),
              orderId: confirmation.orderId,
              user_date: Date.now(),
              type: "user",
              default: 1,
            };
            let savechat_Sell = await p2pChatDB.create(newRec_sell);


            if (savechat != null) {
              var whereCondn = { type: "user", orderId: savechat.orderId };
              let getChat = await p2pChatDB
                .findOne(whereCondn)
                .limit(1)
                .sort({ _id: -1 })
                .exec();
              if (getChat != null) {
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

            }

            let newRec2 = {
              advertiserId: ObjectId(to_user._id),
              adv_name: to_user.username,
              adv_msg:
                "Please make payment before within time limit to avoid the cancellation of order",
              adv_file: "",
              p2porderId: ObjectId(confirmation._id),
              orderId: confirmation.orderId,
              adv_date: Date.now(),
              type: "advertiser",
              default: 1,
            };
            let savechat2 = await p2pChatDB.create(newRec2);

            if (savechat2 != null) {
              var whereCondn = { type: "user", orderId: savechat.orderId };
              let getChat = await p2pChatDB
                .findOne(whereCondn)
                .limit(1)
                .sort({ _id: -1 })
                .exec();
              if (getChat != null) {
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

            }

            let newRec1 = {
              advertiserId: ObjectId(userId),
              adv_name: from_user.username,
              adv_msg:
                "" +
                from_user.username +
                " has created the order please wait till buyer make payment Do not release the crypto until you receive payment from buyer",
              adv_file: "",
              p2porderId: ObjectId(confirmation._id),
              orderId: confirmation.orderId,
              adv_date: Date.now(),
              type: "advertiser",
              default: 1,
            };
            let savechat1 = await p2pChatDB.create(newRec1);

            if (savechat1 != null) {
              var whereCondn = { type: "user", orderId: savechat.orderId };
              let getChat = await p2pChatDB
                .findOne(whereCondn)
                .limit(1)
                .sort({ _id: -1 })
                .exec();
              if (getChat != null) {
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );

              }

            }

            let newRec3 = {
              advertiserId: ObjectId(userId),
              adv_name: from_user.username,
              adv_msg:
                "Do not release the crypto until you receive payment from buyer",
              adv_file: "",
              p2porderId: ObjectId(confirmation._id),
              orderId: confirmation.orderId,
              adv_date: Date.now(),
              type: "advertiser",
              default: 1,
            };
            let savechat3 = await p2pChatDB.create(newRec3);

            if (savechat3 != null) {
              var whereCondn = { type: "user", orderId: savechat.orderId };
              let getChat = await p2pChatDB
                .findOne(whereCondn)
                .limit(1)
                .sort({ _id: -1 })
                .exec();
              if (getChat != null) {
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

            }

            res.json({
              status: true,
              Message: message,
              link: "/p2p/chat/" + confirmation.orderId,
            });


          } else {
            console.log("confirmOrder error==");
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          }
        } else {
          res.json({
            status: false,
            Message:
              "Please enter quantity less than or equal to " + processAmount,
          });
        }
      } else {
        res.json({ status: false, Message: "Invalid request" });
      }
    }
  } catch (e) {
    console.log("confirmOrder catch==", e);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post(
  "/p2p_confirm_sellorder",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var userId = req.userId;
      var bodyData = req.body;

      if (bodyData.orderId != "") {
        let p2pdet = await p2pOrdersDB.findOne({ orderId: bodyData.orderId });
        map_userid = p2pdet.userId;
        console.log("map_userid===", map_userid);
        if (p2pdet) {
          var processAmount = 0;
          processAmount = p2pdet.totalAmount - p2pdet.processAmount;
          processAmount = parseFloat(processAmount).toFixed(8)
          if (processAmount >= +bodyData.qty) {
            var filled = p2pdet.filledAmount - +bodyData.qty;
            const confirmOrder = {
              map_orderId: bodyData.orderId,
              map_userId: ObjectId(userId),
              p2p_orderId: ObjectId(p2pdet._id),
              fromCurrency: p2pdet.firstCurrency,
              toCurrency: p2pdet.secondCurrnecy,
              askAmount: bodyData.qty,
              askPrice: p2pdet.price,
              type: "sell",
              filledAmount: filled,
              userId: ObjectId(p2pdet.userId),
              orderId: uid.randomUUID(6).toLowerCase(),
              firstCurrency: p2pdet.fromCurrency,
              secondCurrency: p2pdet.toCurrency,
            };
            console.log("confirmOrder==", confirmOrder);
            let confirmation = await p2pconfirmOrder.create(confirmOrder);
            var processAmount = 0;
            processAmount = p2pdet.processAmount + +bodyData.qty;
            let p2pUpdate = await p2pOrdersDB.updateOne(
              { _id: ObjectId(p2pdet._id) },
              { $set: { processAmount: processAmount, order_status: "processing" } }
            );
            if (confirmation) {
              var message = "Order Confirmed Successfully";
              let from_user = await usersDB.findOne(
                { _id: ObjectId(userId) },
                { username: 1 }
              );
              let to_user = await usersDB.findOne(
                { _id: ObjectId(p2pdet.userId) },
                { username: 1 }
              );
              var obj = {
                from_user_id: ObjectId(userId),
                to_user_id: ObjectId(to_user._id),
                p2porderId: ObjectId(p2pdet._id),
                from_user_name: from_user.username,
                to_user_name: to_user.username,
                status: 0,
                message:
                  "" +
                  from_user.username +
                  " has confirmed the order for " +
                  confirmation.askAmount +
                  " " +
                  p2pdet.firstCurrency +
                  " " +
                  p2pdet.orderType +
                  " order",
                link: "/p2p/chat/" + confirmation.orderId,
              };
              let notification = await notifyDB.create(obj);
              common.sendResponseSocket(
                "success",
                notification.message,
                "notify",
                notification.to_user_id,
                function () { }
              );

              let newRec = {
                userId: ObjectId(userId),
                user_name: from_user.username,
                user_msg:
                  "Important: Please DO NOT share payment proof or communicate with counter part outside the Taikonz P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
                user_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                user_date: Date.now(),
                type: "user",
                default: 1,
              };
              let savechat = await p2pChatDB.create(newRec);

              // new msg added to seller
              let newRec_sell = {
                userId: ObjectId(to_user._id),
                user_name: to_user.username,
                user_msg:
                  "Important: Please DO NOT share payment proof or communicate with counter part outside the Taikonz P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
                user_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                user_date: Date.now(),
                type: "user",
                default: 1,
              };
              let savechat_new = await p2pChatDB.create(newRec_sell);

              if (savechat) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec2 = {
                userId: ObjectId(userId),
                user_name: from_user.username,
                user_msg:
                  "Please make payment before within time limit to avoid the cancellation of order",
                user_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                user_date: Date.now(),
                type: "user",
                default: 1,
              };
              let savechat2 = await p2pChatDB.create(newRec2);

              if (savechat2) {
                var whereCondn = { type: "user", orderId: savechat2.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec1 = {
                advertiserId: ObjectId(to_user._id),
                adv_name: to_user.username,
                adv_msg:
                  "" +
                  to_user.username +
                  " has created the order please wait till buyer make payment",
                adv_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                adv_date: Date.now(),
                type: "advertiser",
                default: 1,
              };
              let savechat1 = await p2pChatDB.create(newRec1);

              if (savechat1) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec3 = {
                advertiserId: ObjectId(to_user._id),
                adv_name: to_user.username,
                adv_msg:
                  "Do not release the crypto until you receive payment from buyer",
                adv_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                adv_date: Date.now(),
                type: "advertiser",
                default: 1,
              };
              let savechat3 = await p2pChatDB.create(newRec1);

              if (savechat3) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }
              res.json({
                status: true,
                Message: message,
                link: "/p2p/chat/" + confirmation.orderId,
              });
            } else {
              console.log("confirmOrder error==");
              res.json({
                status: false,
                Message: "Something Went Wrong. Please Try Again later",
              });
            }
          } else {
            res.json({
              status: false,
              Message:
                "Please enter quantity less than or equal to " + processAmount,
            });
          }
        } else {
          res.json({ status: false, Message: "Invalid request" });
        }
      }
    } catch (e) {
      console.log("confirmOrder catch==", e);
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);
router.post("/buyer_cancel", common.tokenmiddleware, async (req, res) => {
  try {
    const { userId } = req;
    const { status, orderId } = req.body;

    if (status && orderId) {
      const p2pOrder = await p2pOrdersDB.findOne({ orderId, userId: ObjectId(userId) });

      if (p2pOrder) {
        const cancel = await p2pOrdersDB.findOneAndUpdate(
          { orderId },
          { $set: { status: "cancelled", order_status: "cancelled" } },
          { new: true }
        );

        if (cancel) {
          return res.json({ status: true, Message: "Order Cancelled Successfully" });
        } else {
          return res.json({ status: false, Message: "Something Went Wrong. Please Try Again later" });
        }
      } else {
        return res.json({ status: true, Message: "Order Cancelled Successfully" });
      }
    } else {
      return res.json({ status: false, Message: "Invalid Request" });
    }
  } catch (error) {
    console.error("buyer_cancel error:", error);
    return res.json({ status: false, Message: "Something Went Wrong. Please Try Again later" });
  }
});

router.post("/seller_cancel", common.tokenmiddleware, async (req, res) => {
  try {
    const { userId } = req;
    const { status, orderId } = req.body;

    if (status && orderId) {
      const p2pOrder = await p2pOrdersDB.findOne({ orderId, userId: ObjectId(userId) });

      console.log(p2pOrder, "p2pOrder");

      if (p2pOrder) {
        const cancel = await p2pOrdersDB.findOneAndUpdate(
          { orderId },
          { $set: { status: "cancelled", order_status: "cancelled" } },
          { new: true, useFindAndModify: false }  // Setting useFindAndModify to false
        );

        console.log(cancel, "cancel");


        if (cancel) {
          common.getUserBalance(cancel.userId, cancel.fromCurrency, async (userBalance) => {
            if (userBalance) {
              console.log(userBalance, "userBalance");

              const remainingQty = p2pOrder.totalAmount - p2pOrder.processAmount;
              const updatedBalance = Math.max(userBalance.totalBalance + remainingQty, 0);
              const updatedHold = Math.max(userBalance.balanceHoldTotal - remainingQty, 0);

              common.updateUserBalances(cancel.userId, cancel.fromCurrency, updatedBalance, userBalance.totalBalance, p2pOrder._id, "sell cancel", (balance) => {
                common.updateHoldAmount(cancel.userId, cancel.fromCurrency, updatedHold);
                console.log(cancel, "cancel");


                return res.json({ status: true, Message: "Order Cancelled Successfully" });
              });
            }
          });
        } else {
          return res.json({ status: false, Message: "Something went wrong, Please try again" });
        }
      } else {
        return res.json({ status: true, Message: "Order Cancelled Successfully" });
      }
    } else {
      return res.json({ status: false, Message: "Invalid Request" });
    }
  } catch (error) {
    console.error("seller_cancel error:", error);
    return res.json({ status: false, Message: "Something Went Wrong. Please Try Again later" });
  }
});





router.post("/chat", common.tokenmiddleware, async (req, res) => {
  try {
    var bodyData = req.body;
    console.log("bodyData===", bodyData);
    if (bodyData.type != "" && bodyData.orderId != "") {
      if (bodyData.type == "advertiser") {
        var userId = req.userId;
        let userdetail = await usersDB
          .findOne({ _id: req.userId }, { email: 1, displayname: 1 })
          .exec();
        let newRec = {
          advertiserId: ObjectId(userId),
          adv_name: userdetail.displayname,
          adv_msg: bodyData.message,
          adv_file: bodyData.file ? bodyData.file : "",
          p2porderId: ObjectId(bodyData.p2porderId),
          orderId: bodyData.orderId,
          adv_date: Date.now(),
          type: "advertiser",
        };
        let savechat = await p2pChatDB.create(newRec);

        if (savechat) {
          var whereCondn = { type: "user", orderId: savechat.orderId };
          let getChat = await p2pChatDB
            .findOne(whereCondn)
            .limit(1)
            .sort({ _id: -1 })
            .exec();
          common.sendResponseSocket(
            "success",
            getChat,
            "p2pchat",
            getChat.userId,
            function () { }
          );
          let p2pdet = await p2pOrdersDB.findOne({ orderId: bodyData.orderId });
          let attachment_msg = bodyData.file ? "& sent attachement" : "";
          var obj = {
            from_user_id: ObjectId(userId),
            to_user_id: Object(getChat.userId),
            p2porderId: ObjectId(p2pdet._id),
            from_user_name: userdetail.displayname,
            to_user_name: p2pdet.displayname,
            status: 0,
            message:
              "" +
              userdetail.displayname +
              " has sent  " +
              bodyData.message +
              " " +
              attachment_msg +
              "",
            link: "/p2p/chat/" + p2pdet.orderId,
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
            return res.json({
              status: true,
              Message: "Message sent successfully",
            });
          }
        } else {
          return res.json({
            status: false,
            Message: "Please try again later!",
          });
        }
      } else {
        var userId = req.userId;
        let userdetail = await usersDB
          .findOne({ _id: req.userId }, { email: 1, displayname: 1 })
          .exec();
        let newRec = {
          userId: ObjectId(userId),
          user_name: userdetail.displayname,
          user_msg: bodyData.message,
          user_file: bodyData.file ? bodyData.file : "",
          p2porderId: ObjectId(bodyData.p2porderId),
          orderId: bodyData.orderId,
          user_date: Date.now(),
          type: "user",
        };
        let savechat = await p2pChatDB.create(newRec);

        if (savechat) {
          var whereCondn = { orderId: savechat.orderId };
          let getChat = await p2pChatDB
            .findOne(whereCondn)
            .limit(1)
            .sort({ _id: -1 })
            .exec();
          let p2pdet = await p2pOrdersDB.findOne({ orderId: bodyData.orderId });
          common.sendResponseSocket(
            "success",
            getChat,
            "p2pchat",
            p2pdet.userId,
            function () { }
          );
          let attachment_msg = bodyData.file ? "& sent attachement" : "";
          var obj = {
            from_user_id: ObjectId(userId),
            to_user_id: ObjectId(p2pdet.userId),
            p2porderId: ObjectId(p2pdet._id),
            from_user_name: userdetail.displayname,
            to_user_name: p2pdet.displayname,
            status: 0,
            message:
              "" +
              userdetail.displayname +
              " has sent  " +
              bodyData.message +
              " " +
              attachment_msg +
              "",
            link: "/p2p/chat/" + p2pdet.orderId,
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
            return res.json({
              status: true,
              Message: "Message sent successfully",
            });
          }
        } else {
          return res.json({
            status: false,
            Message: "Please try again later!",
          });
        }
      }
    } else {
      return res.json({ status: false, Message: "Please give all fields" });
    }
  } catch (error) {
    console.log("Error in send Chat:", error);
    return res
      .status(200)
      .send({ success: false, Message: "Something Went Wrong" });
  }
});

router.post("/p2p_chat", common.tokenmiddleware, async (req, res) => {
  try {
    var bodyData = req.body;
    console.log("bodyData===", bodyData);
    if (bodyData.type != "" && bodyData.orderId != "") {
      if (bodyData.type == "advertiser") {
        var userId = req.userId;
        let userdetail = await usersDB
          .findOne({ _id: req.userId }, { email: 1, displayname: 1 })
          .exec();
        let newRec = {
          advertiserId: ObjectId(userId),
          adv_name: userdetail.displayname,
          adv_msg: bodyData.message,
          adv_file: bodyData.file ? bodyData.file : "",
          p2porderId: ObjectId(bodyData.p2porderId),
          orderId: bodyData.orderId,
          adv_date: Date.now(),
          type: "advertiser",
        };
        let savechat = await p2pChatDB.create(newRec);

        if (savechat) {
          var whereCondn = { type: "user", orderId: savechat.orderId };
          let getChat = await p2pChatDB
            .findOne(whereCondn)
            .limit(1)
            .sort({ _id: -1 })
            .exec();

          let p2pdet = await p2pconfirmOrder.findOne({
            orderId: bodyData.orderId,
          });
          var opp_detail = "";
          if (userId.toString() == p2pdet.map_userId.toString()) {
            opp_detail = await usersDB
              .findOne({ _id: p2pdet.userId }, { email: 1, displayname: 1 })
              .exec();
          } else {
            opp_detail = await usersDB
              .findOne({ _id: p2pdet.map_userId }, { email: 1, displayname: 1 })
              .exec();
          }
          let attachment_msg = bodyData.file ? "& sent attachement" : "";
          common.sendResponseSocket(
            "success",
            getChat,
            "p2pchat",
            opp_detail._id,
            function () { }
          );
          var obj = {
            from_user_id: ObjectId(userId),
            to_user_id: Object(opp_detail._id),
            p2porderId: ObjectId(p2pdet._id),
            from_user_name: userdetail.displayname,
            to_user_name: opp_detail.displayname,
            status: 0,
            message:
              "" +
              userdetail.displayname +
              " has sent  " +
              bodyData.message +
              " " +
              attachment_msg +
              "",
            link: "/p2p/chat/" + p2pdet.orderId,
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
            return res.json({
              status: true,
              Message: "Message sent successfully",
            });
          }
        } else {
          return res.json({ status: false, Message: "Please try again later!" });
        }
      } else {
        var userId = req.userId;
        let userdetail = await usersDB
          .findOne({ _id: req.userId }, { email: 1, displayname: 1 })
          .exec();
        let newRec = {
          userId: ObjectId(userId),
          user_name: userdetail.displayname,
          user_msg: bodyData.message,
          user_file: bodyData.file ? bodyData.file : "",
          p2porderId: ObjectId(bodyData.p2porderId),
          orderId: bodyData.orderId,
          user_date: Date.now(),
          type: "user",
        };
        let savechat = await p2pChatDB.create(newRec);

        if (savechat) {
          var whereCondn = { orderId: savechat.orderId };
          let getChat = await p2pChatDB
            .findOne(whereCondn)
            .limit(1)
            .sort({ _id: -1 })
            .exec();
          let p2pdet = await p2pconfirmOrder.findOne({
            orderId: bodyData.orderId,
          });
          var opp_detail = "";
          if (userId.toString() == p2pdet.map_userId.toString()) {
            opp_detail = await usersDB
              .findOne({ _id: p2pdet.userId }, { email: 1, displayname: 1 })
              .exec();
          } else {
            opp_detail = await usersDB
              .findOne({ _id: p2pdet.map_userId }, { email: 1, displayname: 1 })
              .exec();
          }

          common.sendResponseSocket(
            "success",
            getChat,
            "p2pchat",
            opp_detail._id,
            function () { }
          );
          let attachment_msg = bodyData.file ? "& sent attachement" : "";
          var obj = {
            from_user_id: ObjectId(userId),
            to_user_id: ObjectId(opp_detail._id),
            p2porderId: ObjectId(p2pdet._id),
            from_user_name: userdetail.displayname,
            to_user_name: opp_detail.displayname,
            status: 0,
            message:
              "" +
              userdetail.displayname +
              " has sent  " +
              bodyData.message +
              " " +
              attachment_msg +
              "",
            link: "/p2p/chat/" + p2pdet.orderId,
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
            return res.json({
              status: true,
              Message: "Message sent successfully",
            });
          }
        } else {
          return res.json({ status: false, Message: "Please try again later!" });
        }
      }
    } else {
      return res.json({ status: false, Message: "Please give all fields" });
    }
  } catch (error) {
    console.log("Error in send Chat:", error);
    return res
      .status(200)
      .send({ success: false, Message: "Something Went Wrong" });
  }
});

router.post("/getp2pchat", common.tokenmiddleware, async (req, res) => {
  try {
    let userId = req.userId;
    let p2pOrder = await p2pconfirmOrder
      .findOne({ orderId: req.body.orderId })
      .exec();
    if (p2pOrder.userId == userId) {
      var whereCondn = { p2porderId: ObjectId(p2pOrder._id) };
    } else {
      var whereCondn = {
        p2porderId: ObjectId(p2pOrder._id),
        $or: [{ advertiserId: userId }, { userId: userId }],
      };
    }

    let getChat = await p2pChatDB
      .find({ p2porderId: ObjectId(p2pOrder._id) })
      .exec();
    if (getChat.length > 0) {
      return res.json({ status: true, Message: getChat });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/buyer_confirm", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var bodyData = req.body;

    if (bodyData.status != "" && bodyData.orderId != "") {
      let p2pdet = await p2pOrdersDB.findOne({ orderId: bodyData.orderId });
      let map_userid = "";
      let check_chat = await p2pChatDB
        .findOne({ p2porderId: ObjectId(p2pdet._id) })
        .limit(1)
        .sort({ _id: -1 });
      console.log("check_chat===", check_chat);
      if (check_chat) {
        console.log("check_chat 111===", check_chat.type);
        map_userid =
          check_chat.type == "advertiser"
            ? check_chat.advertiserId
            : check_chat.userId;
      } else {
        console.log("check_chat 222===", check_chat.type);
        map_userid = userId;
      }
      console.log("map_userid===", map_userid);
      if (p2pdet) {
        const confirmOrder = {
          map_orderId: bodyData.orderId,
          map_userId: ObjectId(userId),
          p2p_orderId: ObjectId(p2pdet._id),
          fromCurrency: p2pdet.firstCurrency,
          toCurrency: p2pdet.secondCurrnecy,
          askAmount: p2pdet.totalAmount,
          askPrice: p2pdet.price,
          type: "buy",
          filledAmount: p2pdet.totalAmount,
          userId: ObjectId(p2pdet.userId),
          status: 1,
          orderId: uid.randomUUID(6).toLowerCase(),
          firstCurrency: p2pdet.fromCurrency,
          secondCurrency: p2pdet.toCurrnecy,
        };
        console.log("confirmOrder==", confirmOrder);
        let confirmation = await p2pconfirmOrder.create(confirmOrder);
        var processAmount = 0;
        processAmount = p2pdet.processAmount + p2pdet.totalAmount;
        let p2pUpdate = await p2pOrdersDB.updateOne(
          { _id: ObjectId(p2pdet._id) },
          { $set: { processAmount: processAmount, order_status: "processing" } }
        );
        if (confirmation) {
          var message = "Payment Confirmed Successfully";
          let from_user = await usersDB.findOne(
            { _id: ObjectId(userId) },
            { displayname: 1 }
          );
          let to_user = await usersDB.findOne(
            { _id: ObjectId(map_userid) },
            { displayname: 1 }
          );
          var obj = {
            from_user_id: ObjectId(userId),
            to_user_id: ObjectId(to_user._id),
            p2porderId: ObjectId(p2pdet._id),
            from_user_name: from_user.displayname,
            to_user_name: to_user.displayname,
            status: 0,
            message:
              "" +
              from_user.displayname +
              " has confirmed the payment for your " +
              p2pdet.totalAmount +
              " " +
              p2pdet.firstCurrency +
              " " +
              p2pdet.orderType +
              " order",
            link: "/p2p/chat/" + p2pdet.orderId,
          };
          let notification = await notifyDB.create(obj);
          common.sendResponseSocket(
            "success",
            message,
            "notify",
            notification.to_user_id,
            function () { }
          );
          res.json({ status: true, Message: message });
        } else {
          console.log("confirmOrder error==");
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        }
      } else {
        res.json({ status: false, Message: "Invalid request" });
      }
    }
  } catch (e) {
    console.log("confirmOrder catch==", e);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

// router.post("/seller_confirm",common.tokenmiddleware,async(req,res)=>{
//     try {
//         var userId = req.userId;
//         var bodyData = req.body;

//         if(bodyData.status !="" && bodyData.orderId !=""){
//             let p2pdet = await p2pOrdersDB.findOne({orderId:bodyData.orderId}).exec();
//             if(p2pdet){
//                 if(p2pdet.orderType=="buy")
//                 {
//                     console.log("sell userId===",userId);
//                     common.getUserBalance(userId,p2pdet.fromCurrency, async function(sellBalance){
//                         if(sellBalance != null){
//                             var selluserBalanceTotal = sellBalance.totalBalance;
//                             console.log("sell user balance===",selluserBalanceTotal);
//                             console.log("p2pdet.totalAmoun===",p2pdet.totalAmount);
//                             if(+selluserBalanceTotal > +p2pdet.totalAmount)
//                             {
//                                 var deductAmount     =  selluserBalanceTotal - p2pdet.totalAmount;
//                                 deductAmount > 0 ? deductAmount : 0;
//                                 common.updateUserBalances(userId, p2pdet.fromCurrency, deductAmount, selluserBalanceTotal, p2pdet._id, "sell" , async function (deductbalance) {
//                                         if(deductbalance)
//                                         {
//                                             let confirmation  = await p2pconfirmOrder.findOneAndUpdate({ map_orderId:req.body.orderId}, { $set: { status: 2} },{new:true} );
//                                             let filled  = await p2pOrdersDB.findOneAndUpdate({ orderId:bodyData.orderId}, { $set: { status: "filled"} },{new:true} );
//                                             if(confirmation)
//                                             {
//                                             common.getUserBalance(confirmation.map_userId,confirmation.firstCurrency, async function(userBalance){
//                                                 if(userBalance != null){
//                                                     var userBalanceTotal = userBalance.totalBalance;
//                                                     var updateAmount     =  userBalanceTotal + p2pdet.totalAmount;
//                                                     updateAmount > 0 ? updateAmount : 0;
//                                                     common.updateUserBalances(confirmation.map_userId, confirmation.firstCurrency, updateAmount, userBalanceTotal, p2pdet._id, "sell" , async function (balance) {
//                                                         let from_user = await usersDB.findOne({_id:ObjectId(userId)},{displayname:1});
//                                                         let to_user = await usersDB.findOne({_id:ObjectId(confirmation.map_userId)},{displayname:1});
//                                                         var obj = {
//                                                             from_user_id: ObjectId(userId),
//                                                             to_user_id: ObjectId(to_user._id),
//                                                             p2porderId: ObjectId(p2pdet._id),
//                                                             from_user_name: from_user.displayname,
//                                                             to_user_name: to_user.displayname,
//                                                             status: 0,
//                                                             message: ""+from_user.displayname+" has released the crypto for your "+p2pdet.totalAmount+' '+p2pdet.firstCurrency+' '+p2pdet.orderType+" order",
//                                                             link: '/p2p/chat/'+p2pdet.orderId
//                                                         }
//                                                         let notification = await notifyDB.create(obj);
//                                                         if(notification)
//                                                         {
//                                                             common.sendResponseSocket("success",notification.message,"notify",notification.to_user_id,function(){});
//                                                             return res.json({ status : true, Message : "Crypto Released Successfully" });
//                                                         }

//                                                     });
//                                                 }
//                                             });
//                                             }
//                                             else
//                                             {
//                                             res.json({ status : false, Message : "Something went wrong, Please try again" });
//                                             }

//                                         }
//                                 });

//                             }
//                             else
//                             {
//                                 res.json({ status : false, Message : "Insufficient Balance" });
//                             }
//                         }
//                         else
//                         {
//                             res.json({ status : false, Message : "Something went wrong, Please try again" });
//                         }
//                     });

//                 }
//                 else
//                 {
//                     let confirmation  = await p2pconfirmOrder.findOneAndUpdate({ map_orderId:req.body.orderId}, { $set: { status: 2} },{new:true} );
//                     let filled  = await p2pOrdersDB.findOneAndUpdate({ orderId:bodyData.orderId}, { $set: { status: "filled"} },{new:true} );
//                         if(confirmation)
//                         {
//                         common.getUserBalance(confirmation.map_userId,confirmation.firstCurrency, async function(userBalance){
//                             if(userBalance != null){
//                                 var userBalanceTotal = userBalance.totalBalance;
//                                 var updateAmount     =  userBalanceTotal + p2pdet.totalAmount;
//                                 updateAmount > 0 ? updateAmount : 0;
//                                 common.updateUserBalances(confirmation.map_userId, confirmation.firstCurrency, updateAmount, userBalanceTotal, p2pdet._id, "sell" , async function (balance) {
//                                 let from_user = await usersDB.findOne({_id:ObjectId(userId)},{displayname:1});
//                                 let to_user = await usersDB.findOne({_id:ObjectId(confirmation.map_userId)},{displayname:1});
//                                     var obj = {
//                                         from_user_id: ObjectId(userId),
//                                         to_user_id: ObjectId(to_user._id),
//                                         p2porderId: ObjectId(p2pdet._id),
//                                         from_user_name: from_user.displayname,
//                                         to_user_name: to_user.displayname,
//                                         status: 0,
//                                         message: ""+from_user.displayname+" has released the crypto for your "+p2pdet.totalAmount+' '+p2pdet.firstCurrency+' '+p2pdet.orderType+" order",
//                                         link: '/p2p/chat/'+p2pdet.orderId
//                                     }
//                                     let notification = await notifyDB.create(obj);
//                                     if(notification)
//                                     {
//                                         common.sendResponseSocket("success",notification.message,"notify",notification.to_user_id,function(){});
//                                         return res.json({ status : true, Message : "Crypto Released Successfully" });
//                                     }
//                                 });
//                             }
//                         });
//                         }
//                         else
//                         {
//                         res.json({ status : false, Message : "Something went wrong, Please try again" });
//                         }
//                 }

//             }
//         }
//         else
//         {
//             res.json({ status : false, Message : "Something went wrong, Please try again" });
//         }
//     } catch (e) {
//         res.json({
//             status: false,
//             Message: 'Something Went Wrong. Please Try Again later'
//         })
//     }
// });

router.post("/getp2pOrder", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let getconfirmOrders = await p2pconfirmOrder.findOne({
      orderId: req.body.orderId,
    });
    let getOrders = await p2pOrdersDB.findOne({
      orderId: getconfirmOrders.map_orderId,
    });
    //let bank = await kyc.findOne({userId:ObjectId(getOrders.userId)});
    let bank = await bankdb.findOne({
      userid: ObjectId(getOrders.userId),
      Status: 1,
    });
    //let updatechat = await notifyDB.updateMany({ status:0, to_user_id:req.userId}, { $set: { status: 1} });
    var p2pbalance = "";
    common.getUserBalance(userId, getOrders.fromCurrency, function (
      userBalance
    ) {
      console.log("p2p balance response===", userBalance.totalBalance);
      if (userBalance != null) {
        p2pbalance = userBalance.totalBalance;
        return res.json({
          status: true,
          Message: getOrders,
          bank: bank,
          p2pbalance: p2pbalance,
        });
      } else {
        return res.json({ status: true, Message: [] });
      }
    });
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/viewp2pOrder", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let getOrders = await p2pOrdersDB.findOne({ orderId: req.body.orderId });
    let getconfirmOrders = await p2pconfirmOrder.find({
      map_orderId: req.body.orderId,
      status: { $in: [0, 1] },
    });
    let bank = await bankdb.findOne({
      userid: ObjectId(getOrders.userId),
      Status: 1,
    });
    var p2pbalance = "";
    common.getUserBalance(userId, getOrders.fromCurrency, function (
      userBalance
    ) {
      console.log("p2p balance response===", userBalance.totalBalance);
      if (userBalance != null) {
        p2pbalance = userBalance.totalBalance;
        return res.json({
          status: true,
          Message: getOrders,
          bank: bank,
          p2pbalance: p2pbalance,
          getconfirmOrders: getconfirmOrders,
        });
      } else {
        return res.json({ status: true, Message: [] });
      }
    });
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/myOrders", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body, "=-=-=p2pMyorders-=-=");
    var search = req.body.search;
    var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 5);
    var page = Number(req.body.FilPage ? req.body.FilPage : 1);
    var filter = {};

    if (typeof search !== "undefined" && search !== "" && search !== "null") {
      if (isNaN(search)) {
        filter.$or = [
          { firstCurrency: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { secondCurrnecy: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { orderId: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { status: { $regex: new RegExp(".*" + search + ".*", "i") } },
        ];
      } else {
        filter.$or = [
          { firstCurrency: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { secondCurrnecy: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { orderId: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { status: { $regex: new RegExp(".*" + search + ".*", "i") } },
        ];
      }
    }
    var userId = req.userId;
    var skippage = perPage * page - perPage;
    console.log(skippage, "=-=-=skippage=-=-=");
    console.log(perPage, "=-=-=skippage=-=-=");

    let getOrders = await p2pOrdersDB
      .find({ userId: userId })
      .skip(skippage)
      .limit(perPage)
      .sort({ _id: -1 })
      .exec();
    console.log(getOrders, "=-=-=-getOrders-=-=-=getOrders=-=-=-");
    if (getOrders) {
      let count = await p2pOrdersDB.find({ userId: userId }).count().exec();

      var returnObj = {
        Message: getOrders,
        current: page,
        pages: Math.ceil(count / perPage),
        total: count,
      };
      return res.json({ status: true, returnObj });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/getnotifyOrder", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let notifyOrders = await notifyDB.findOne({
      orderId: req.body.orderId,
      type: req.body.type,
    });
    if (notifyOrders) {
      return res.json({ status: true, Message: notifyOrders });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.get("/p2p_active_currency", async (req, res) => {
  try {
    var currencies = await currencyDB.find(
      { status: "Active", p2p_status: "1", coinType: "1" },
      { currencySymbol: 1, coinType: 1 }
    );
    var fiat_currencies = await currencyDB.find(
      { status: "Active", p2p_status: "1", coinType: "2" },
      { currencySymbol: 1, coinType: 1 }
    );
    if (currencies.length > 0) {
      return res.json({
        status: true,
        data: currencies,
        fiat: fiat_currencies,
      });
    } else {
      return res.json({ status: false, data: {} });
    }
  } catch (err) {
    return res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/p2p_list", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    if (req.body.currency != undefined && req.body.currency != "") {
      var whereCondn = {
        $and: [
          {
            firstCurrency: req.body.currency,
            status: { $in: ["active", "partially"] },
          },
        ],
      };
    } else {
      var whereCondn = { $or: [{ status: "active" }, { status: "partially" }] };
    }
    let getOrders = await p2pOrdersDB.find(whereCondn).exec();
    var p2p_list = [];
    if (getOrders) {
      for (var i = 0; i < getOrders.length; i++) {
        var completed_trades = await p2pOrdersDB.find({
          userId: ObjectId(getOrders[i].userId),
          status: "filled",
        });
        var filled_trades = await p2pOrdersDB
          .find({ status: "filled" })
          .countDocuments();
        var rating = (completed_trades / filled_trades) * 100;
        var available_qty =
          +getOrders[i].totalAmount - +getOrders[i].processAmount;
        var type = "";
        var ownOrder = "";
        if (getOrders[i].userId.toString() == userId.toString()) {
          type = getOrders[i].orderType == "buy" ? "Sell" : "Buy";
          ownOrder = true;
        } else {
          type = getOrders[i].orderType == "buy" ? "Sell" : "Buy";
          ownOrder = false;
        }
        if (available_qty > 0) {
          var obj = {
            orderId: getOrders[i].orderId,
            currency: getOrders[i].firstCurrency,
            displayname: getOrders[i].displayname,
            price: parseFloat(getOrders[i].price).toFixed(2),
            price_currency: getOrders[i].secondCurrnecy,
            limit: "₹ " + getOrders[i].fromLimit + " - ₹ " + available_qty,
            type: type,
            orders_count: +completed_trades.length,
            order_price:
              completed_trades.length > 0
                ? parseFloat(completed_trades[0].price).toFixed(2)
                : 0,
            quantity: available_qty,
            ownOrder: ownOrder,
          };
          p2p_list.push(obj);
        }
      }
      return res.json({ status: true, Message: p2p_list });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

// router.post('/get_p2p_order',common.tokenmiddleware,async (req,res) => {
//     try {
//         var userId = req.userId;
//         let getOrders = await p2pOrdersDB.findOne({orderId:req.body.orderId});
//         let bank = await kyc.findOne({userId:ObjectId(getOrders.userId)});
//         let userprofile = await usersDB.findOne({ _id: userId });
//         let updatechat = await notifyDB.updateMany({ status:0, p2porderId:ObjectId(getOrders._id)}, { $set: { status: 1} });
//         let p2pconfirm = await p2pconfirmOrder.find({map_orderId:req.body.orderId,map_userId:userId,status:{$in:[0,1]}});
//         if(getOrders){
//             var ordertype = '';
//             var button_content = '';
//             var cancel_button = '';
//             console.log("getOrders===",getOrders)
//             console.log("p2pconfirm===",p2pconfirm.length)
//             console.log("userprofile._id.toString() != getOrders.userId.toString()",userprofile._id.toString())
//             console.log("userprofile._id.toString()",getOrders.userId.toString())
//             if(getOrders.orderType=='buy')
//             {
//                 //ordertype  = (userprofile._id.toString() == getOrders.userId.toString())?"Buy":"Sell";
//                 //button_content  = (userprofile._id.toString() == getOrders.userId.toString())?"Confirm Payment":"Confirm Release";
//                 ordertype = "Sell";
//                 if(userprofile._id.toString() == getOrders.userId.toString() && (getOrders.order_status == "pending" || getOrders.order_status == "confirmed"))
//                 {
//                     button_content = "Cancel";
//                 }
//                 else if(userprofile._id.toString() != getOrders.userId.toString() && getOrders.filledAmount > 0 && p2pconfirm.length == 0)
//                 {
//                     button_content = "Confirm Order";
//                 }
//                 else if(userprofile._id.toString() == getOrders.userId.toString() && getOrders.order_status == "paid")
//                 {
//                     button_content = "Confirm Release" ;
//                 }
//                 else if(userprofile._id.toString() != getOrders.userId.toString() && getOrders.order_status == "paid" && p2pconfirm.length > 0)
//                 {
//                     button_content = "Confirm Release" ;
//                 }
//             }
//             else if(getOrders.orderType=='sell')
//             {
//                 //ordertype  = (userprofile._id.toString() == getOrders.userId.toString())?"Sell":"Buy"
//                 //button_content  = (userprofile._id.toString() == getOrders.userId.toString())?"Confirm Payment":"Confirm Release";
//                 ordertype = "Buy";
//                 if(userprofile._id.toString() == getOrders.userId.toString() && getOrders.order_status == "pending")
//                 {
//                     button_content = "Cancel" ;
//                 }
//                 else if(userprofile._id.toString() != getOrders.userId.toString() && getOrders.filledAmount >0 && p2pconfirm.length == 0)
//                 {
//                     button_content = "Confirm Order" ;
//                 }
//                 else if(userprofile._id.toString() == getOrders.userId.toString() && getOrders.order_status == "confirmed")
//                 {
//                     button_content = "Confirm Payment" ;
//                 }
//                 else if(userprofile._id.toString() != getOrders.userId.toString() && getOrders.order_status == "confirmed" && p2pconfirm.length > 0)
//                 {
//                     button_content = "Confirm Payment" ;
//                 }
//             }
//             var payment_method = '';
//             if(getOrders.paymentMethod=="All payments")
//             {
//                 payment_method = ["All payments","Bank Transfer","Gpay"];
//             }
//             else
//             {
//                 payment_method = [getOrders.paymentMethod];
//             }
//             var button_text = '';
//             if(getOrders.status == 'active' || getOrders.status == 'partially')
//             {
//                 button_text = button_content
//             }
//             if(bank != null && bank != undefined)
//             {
//                var bank_details =  {
//                     accountHolderName: bank.accountHolderName,
//                     accountNumber: bank.accountNumber,
//                     iFSCCode: bank.iFSCCode,
//                     bankName: bank.bankName,
//                     branchName: bank.branchName,
//                     branchAddress: bank.branchAddress
//                 }
//             }
//             else
//             {
//                 var bank_details = {};
//             }
//             var usertype  = (userprofile._id.toString() == getOrders.userId.toString())?"advertiser":"user";
//             var currency_det = await currencyDB.findOne({currencySymbol:getOrders.firstCurrency});
//             var p2p_obj = {
//                 _id: getOrders._id,
//                 orderId: getOrders.orderId,
//                 ordertype: ordertype,
//                 usertype:usertype,
//                 quantity: getOrders.filledAmount+' '+getOrders.firstCurrency,
//                 price: getOrders.price+' '+getOrders.secondCurrnecy,
//                 payment_method: payment_method,
//                 image: currency_det.Currency_image,
//                 currency_symbol: currency_det.currencySymbol,
//                 created_time: moment(getOrders.createdAt).format("DD.MM.YYYY h:m a"),
//                 button_text: button_text,
//                 bank_details: bank_details
//             }
//             return res.json({ status : true, Message : p2p_obj});
//         }else{
//             return res.json({ status : true, Message : [] });
//         }
//     } catch (error) {
//         console.log('-=-errorerror=-=-=-',error)
//         return res.json({ status : false, Message : "Internal server error, Please try later!" });
//     }
// });

router.post("/get_p2p_order", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let getOrders = await p2pOrdersDB.findOne({ orderId: req.body.orderId });
    //let bank = await kyc.findOne({userId:ObjectId(getOrders.userId)});
    let bank = await bankdb.findOne({
      userid: ObjectId(getOrders.userId),
      Status: true,
    });
    let userprofile = await usersDB.findOne({ _id: userId });
    // let updatechat = await notifyDB.updateMany(
    //   { status: 0, p2porderId: ObjectId(getOrders._id) },
    //   { $set: { status: 1 } }
    // );
    if (getOrders) {
      var ordertype = "";
      var button_content = "";
      var cancel_button = "";
      if (getOrders.orderType == "buy") {
        ordertype =
          userprofile._id.toString() == getOrders.userId.toString()
            ? "Buy"
            : "Sell";
        button_content =
          userprofile._id.toString() == getOrders.userId.toString()
            ? "Confirm Payment"
            : "Confirm Release";
        cancel_button =
          userprofile._id.toString() == getOrders.userId.toString()
            ? "Cancel"
            : "";
      } else if (getOrders.orderType == "sell") {
        ordertype =
          userprofile._id.toString() == getOrders.userId.toString()
            ? "Sell"
            : "Buy";
        button_content =
          userprofile._id.toString() == getOrders.userId.toString()
            ? "Confirm Release"
            : "Confirm Payment";
        cancel_button =
          userprofile._id.toString() == getOrders.userId.toString()
            ? "Cancel"
            : "";
      }
      var payment_method = "";
      if (getOrders.paymentMethod == "All payments") {
        payment_method = ["All payments", "Bank Transfer", "Gpay"];
      } else {
        payment_method = [getOrders.paymentMethod];
      }
      var button_text = "";
      if (getOrders.status == "active" || getOrders.status == "partially") {
        button_text = button_content;
      }
      if (bank != null && bank != undefined) {
        var bank_details = {
          accountHolderName: bank.accountHolderName,
          accountNumber: bank.accountNumber,
          iFSCCode: bank.iFSCCode,
          bankName: bank.bankName,
          branchName: bank.branchName,
          branchAddress: bank.branchAddress,
        };
      } else {
        var bank_details = {};
      }
      var usertype =
        userprofile._id.toString() == getOrders.userId.toString()
          ? "advertiser"
          : "user";
      var currency_det = await currencyDB.findOne({
        currencySymbol: getOrders.firstCurrency,
      });
      var p2p_obj = {
        _id: getOrders._id,
        orderId: getOrders.orderId,
        ordertype: ordertype,
        usertype: usertype,
        quantity: getOrders.totalAmount + " " + getOrders.firstCurrency,
        price: getOrders.price + " " + getOrders.secondCurrnecy,
        payment_method: payment_method,
        image: currency_det.Currency_image,
        currency_symbol: currency_det.currencySymbol,
        created_time: moment(getOrders.createdAt).format("DD.MM.YYYY h:m a"),
        button_text: button_text,
        bank_details: bank_details,
      };
      return res.json({ status: true, Message: p2p_obj });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/get_p2p_chat", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let p2pOrder = await p2pconfirmOrder
      .findOne({ orderId: req.body.orderId })
      .exec();
    var whereCondn = { p2porderId: ObjectId(p2pOrder._id) };
    let getChat = await p2pChatDB.find(whereCondn).exec();
    if (getChat.length > 0) {
      var chat_messages = [];
      for (var i = 0; i < getChat.length; i++) {
        var usertype = "";
        var message = "";
        var file = "";
        var date = "";
        if (getChat[i].type == "user") {
          usertype =
            getChat[i].userId.toString() == userId.toString()
              ? "own"
              : "opposite";
          message = getChat[i].user_msg;
          file = getChat[i].user_file;
          date = moment(getChat[i].createdAt).fromNow();
        }
        if (getChat[i].type == "advertiser") {
          usertype =
            getChat[i].advertiserId.toString() == userId.toString()
              ? "own"
              : "opposite";
          message = getChat[i].adv_msg;
          file = getChat[i].adv_file;
          date = moment(getChat[i].createdAt).fromNow();
        }

        var obj = {
          usertype: usertype,
          message: message,
          file: file,
          date: date,
        };
        chat_messages.push(obj);
      }
      return res.json({ status: true, Message: chat_messages });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});



router.post(
  "/buyer_confirm_payment",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var userId = req.userId;
      var bodyData = req.body;

      if (bodyData.status != "" && bodyData.orderId != "") {
        let p2pdet = await p2pconfirmOrder.findOne({ orderId: bodyData.orderId });
        if (p2pdet) {
          let update_p2p = await p2pconfirmOrder.findOneAndUpdate(
            { orderId: bodyData.orderId },
            { $set: { status: 1, paytime: Date.now() } }
          );
          if (update_p2p) {
            var message = "Payment Confirmed Successfully";
            let from_user = await usersDB.findOne(
              { _id: ObjectId(userId) },
              { displayname: 1 }
            );
            let to_user = await usersDB.findOne(
              { _id: ObjectId(p2pdet.map_userId) },
              { displayname: 1 }
            );
            var opp_detail = "";
            if (userId.toString() == p2pdet.map_userId.toString()) {
              opp_detail = await usersDB
                .findOne({ _id: p2pdet.userId }, { email: 1, displayname: 1 })
                .exec();
            } else {
              opp_detail = await usersDB
                .findOne({ _id: p2pdet.map_userId }, { email: 1, displayname: 1 })
                .exec();
            }
            let ordertype = "sell";
            var obj = {
              from_user_id: ObjectId(userId),
              to_user_id: ObjectId(opp_detail._id),
              p2porderId: ObjectId(p2pdet._id),
              from_user_name: from_user.displayname,
              to_user_name: opp_detail.displayname,
              status: 0,
              message:
                "" +
                from_user.displayname +
                " has confirmed the payment for your " +
                p2pdet.askAmount +
                " " +
                p2pdet.fromCurrency +
                " " +
                ordertype +
                " order",
              link: "/p2p/chat/" + p2pdet.orderId,
            };
            let notification = await notifyDB.create(obj);
            common.sendResponseSocket(
              "success",
              notification.message,
              "notify",
              notification.to_user_id,
              function () { }
            );

            let newRec = {
              advertiserId: ObjectId(opp_detail._id),
              adv_name: opp_detail.displayname,
              adv_msg: "Please wait till seller release crypto",
              adv_file: "",
              p2porderId: ObjectId(p2pdet._id),
              orderId: p2pdet.orderId,
              adv_date: Date.now(),
              type: "advertiser",
              default: 1,
            };
            let savechat = await p2pChatDB.create(newRec);

            if (savechat) {
              var whereCondn = { type: "user", orderId: savechat.orderId };
              let getChat = await p2pChatDB
                .findOne(whereCondn)
                .limit(1)
                .sort({ _id: -1 })
                .exec();
              common.sendResponseSocket(
                "success",
                getChat,
                "p2pchat",
                getChat.userId,
                function () { }
              );
            }
            res.json({ status: true, Message: message });
          } else {
            res.json({
              status: false,
              Message: "Something Went Wrong. Please Try Again later",
            });
          }
        } else {
          res.json({ status: false, Message: "Invalid request" });
        }
      }
    } catch (e) {
      console.log("confirmOrder catch==", e);
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post("/seller_confirm", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var bodyData = req.body;

    if (bodyData.status != "" && bodyData.orderId != "") {
      let p2pdet = await p2pOrdersDB
        .findOne({ orderId: bodyData.orderId })
        .exec();
      let p2pconfirm = await p2pconfirmOrder
        .findOne({ map_orderId: bodyData.orderId })
        .sort({ _id: -1 })
        .exec();
      if (p2pdet) {
        if (p2pdet.orderType == "buy") {
          console.log("sell userId===", userId);
          common.getUserBalance(userId, p2pdet.fromCurrency, async function (
            sellBalance
          ) {
            if (sellBalance != null) {
              var selluserBalanceTotal = sellBalance.totalBalance;
              var sellholdTotal = sellBalance.balanceHoldTotal;
              console.log("sell user balance===", selluserBalanceTotal);
              console.log("sell p2p confirm amount===", p2pconfirm.askAmount);
              console.log("sell sellholdTotal===", sellholdTotal);
              if (+selluserBalanceTotal > +p2pdet.totalAmount) {
                var deductAmount = selluserBalanceTotal - p2pconfirm.askAmount;
                deductAmount > 0 ? deductAmount : 0;
                console.log("sell p2p deductAmount amount===", deductAmount);
                console.log("sell p2p userid===", userId);
                common.updateUserBalances(
                  userId,
                  p2pdet.fromCurrency,
                  deductAmount,
                  selluserBalanceTotal,
                  p2pdet._id,
                  "sell",
                  async function (deductbalance) {
                    if (deductbalance) {
                      let confirmation = await p2pconfirmOrder.findOneAndUpdate(
                        { map_orderId: req.body.orderId, status: 1 },
                        { $set: { status: 2 } },
                        { new: true }
                      );
                      let filledOrder = await p2pconfirmOrder.find({
                        map_orderId: req.body.orderId,
                        status: 2,
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
                      // var updateHold     =  sellholdTotal - confirmation.askAmount;
                      // console.log("sell sellholdTotal 111===",sellholdTotal)
                      // updateHold = updateHold > 0 ? updateHold : 0;
                      // console.log("sell updateHold===",updateHold)
                      // common.updatep2pHoldAmount(req.userId,p2pdet.fromCurrency,updateHold, function (hold){});
                      let filled = await p2pOrdersDB.findOneAndUpdate(
                        { orderId: bodyData.orderId },
                        {
                          $set: {
                            status: status,
                            filledAmount: remaining_amount,
                            order_status: order_status,
                          },
                        },
                        { new: true }
                      );
                      if (confirmation) {
                        common.getUserBalance(
                          confirmation.userId,
                          confirmation.firstCurrency,
                          async function (userBalance) {
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
                              console.log("buy updateAmount====", updateAmount);
                              common.updateUserBalances(
                                confirmation.userId,
                                confirmation.firstCurrency,
                                updateAmount,
                                userBalanceTotal,
                                p2pdet._id,
                                "sell",
                                async function (balance) {
                                  let from_user = await usersDB.findOne(
                                    { _id: ObjectId(userId) },
                                    { displayname: 1 }
                                  );
                                  let to_user = await usersDB.findOne(
                                    { _id: ObjectId(confirmation.userId) },
                                    { displayname: 1 }
                                  );
                                  var obj = {
                                    from_user_id: ObjectId(userId),
                                    to_user_id: ObjectId(to_user._id),
                                    p2porderId: ObjectId(p2pdet._id),
                                    from_user_name: from_user.displayname,
                                    to_user_name: to_user.displayname,
                                    status: 0,
                                    message:
                                      "" +
                                      from_user.displayname +
                                      " has released the crypto for your " +
                                      confirmation.askAmount +
                                      " " +
                                      p2pdet.firstCurrency +
                                      " " +
                                      p2pdet.orderType +
                                      " order",
                                    link: "/p2p/chat/" + p2pdet.orderId,
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
                                    return res.json({
                                      status: true,
                                      Message: "Crypto Released Successfully",
                                    });
                                  }
                                }
                              );
                            }
                          }
                        );
                      } else {
                        res.json({
                          status: false,
                          Message: "Something went wrong, Please try again",
                        });
                      }
                    }
                  }
                );
              } else {
                res.json({ status: false, Message: "Insufficient Balance" });
              }
            } else {
              res.json({
                status: false,
                Message: "Something went wrong, Please try again",
              });
            }
          });
        } else {
          let confirmation = await p2pconfirmOrder.findOneAndUpdate(
            { map_orderId: req.body.orderId, status: 1 },
            { $set: { status: 2 } },
            { new: true }
          );
          let filledOrder = await p2pconfirmOrder.find({
            map_orderId: req.body.orderId,
            status: 2,
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
          let filled = await p2pOrdersDB.findOneAndUpdate(
            { orderId: bodyData.orderId },
            {
              $set: {
                status: status,
                filledAmount: remaining_amount,
                order_status: order_status,
              },
            },
            { new: true }
          );
          common.getUserBalance(
            confirmation.userId,
            p2pdet.fromCurrency,
            async function (sellBalance) {
              if (sellBalance != null) {
                var selluserBalanceTotal = sellBalance.totalBalance;
                var sellholdTotal = sellBalance.balanceHoldTotal;
                console.log("sell p2p userid===", userId);
                console.log("sell user balance===", selluserBalanceTotal);
                console.log("sell sellholdTotal===", sellholdTotal);
                var updateHold = sellholdTotal - confirmation.askAmount;
                console.log("sell sellholdTotal 111===", sellholdTotal);
                updateHold = updateHold > 0 ? updateHold : 0;
                console.log("sell updateHold===", updateHold);
                console.log("sell p2p userid===", req.userId);
                common.updatep2pHoldAmount(
                  confirmation.userId,
                  p2pdet.fromCurrency,
                  updateHold,
                  function (hold) { }
                );
                if (confirmation) {
                  common.getUserBalance(
                    confirmation.map_userId,
                    confirmation.firstCurrency,
                    async function (userBalance) {
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
                        common.updateUserBalances(
                          confirmation.map_userId,
                          confirmation.firstCurrency,
                          updateAmount,
                          userBalanceTotal,
                          p2pdet._id,
                          "sell",
                          async function (balance) {
                            let from_user = await usersDB.findOne(
                              { _id: ObjectId(userId) },
                              { displayname: 1 }
                            );
                            let to_user = await usersDB.findOne(
                              { _id: ObjectId(confirmation.map_userId) },
                              { displayname: 1 }
                            );
                            var obj = {
                              from_user_id: ObjectId(userId),
                              to_user_id: ObjectId(to_user._id),
                              p2porderId: ObjectId(p2pdet._id),
                              from_user_name: from_user.displayname,
                              to_user_name: to_user.displayname,
                              status: 0,
                              message:
                                "" +
                                from_user.displayname +
                                " has released the crypto for your " +
                                confirmation.askAmount +
                                " " +
                                p2pdet.firstCurrency +
                                " " +
                                p2pdet.orderType +
                                " order",
                              link: "/p2p/chat/" + p2pdet.orderId,
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
                              return res.json({
                                status: true,
                                Message: "Crypto Released Successfully",
                              });
                            }
                          }
                        );
                      }
                    }
                  );
                } else {
                  res.json({
                    status: false,
                    Message: "Something went wrong, Please try again",
                  });
                }
              }
            }
          );
        }
      }
    } else {
      res.json({
        status: false,
        Message: "Something went wrong, Please try again",
      });
    }
  } catch (e) {
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post(
  "/seller_coin_confirm",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var userId = req.userId;
      var bodyData = req.body;

      if (bodyData.status != "" && bodyData.orderId != "") {
        let p2pconfirm = await p2pconfirmOrder
          .findOne({ orderId: bodyData.orderId })
          .exec();
        let p2pdet = await p2pOrdersDB
          .findOne({ orderId: p2pconfirm.map_orderId })
          .exec();
        if (p2pdet) {
          if (p2pdet.orderType == "buy") {
            console.log("sell userId===", userId);
            common.getUserBalance(userId, p2pdet.fromCurrency, async function (
              sellBalance
            ) {
              if (sellBalance != null) {
                var selluserBalanceTotal = sellBalance.totalBalance;
                var sellholdTotal = sellBalance.balanceHoldTotal;
                console.log("sell user balance===", selluserBalanceTotal);
                console.log("sell p2p confirm amount===", p2pconfirm.askAmount);
                console.log("sell sellholdTotal===", sellholdTotal);
                if (+selluserBalanceTotal > +p2pconfirm.askAmount) {
                  var deductAmount =
                    selluserBalanceTotal - p2pconfirm.askAmount;
                  deductAmount > 0 ? deductAmount : 0;
                  console.log("sell p2p deductAmount amount===", deductAmount);
                  console.log("sell p2p userid===", userId);
                  common.updateUserBalances(
                    userId,
                    p2pdet.fromCurrency,
                    deductAmount,
                    selluserBalanceTotal,
                    p2pdet._id,
                    "sell",
                    async function (deductbalance) {
                      if (deductbalance) {
                        let confirmation = await p2pconfirmOrder.findOneAndUpdate(
                          { orderId: req.body.orderId },
                          { $set: { status: 2, dispute_status: 2 } },
                          { new: true }
                        );
                        let filledOrder = await p2pconfirmOrder.find({
                          map_orderId: confirmation.map_orderId,
                          status: 2,
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
                        // common.updatep2pHoldAmount(req.userId,p2pdet.fromCurrency,updateHold, function (hold){});
                        let filled = await p2pOrdersDB.findOneAndUpdate(
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
                          common.getUserBalance(
                            confirmation.userId,
                            confirmation.firstCurrency,
                            async function (userBalance) {
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
                                common.updateUserBalances(
                                  confirmation.userId,
                                  confirmation.firstCurrency,
                                  updateAmount,
                                  userBalanceTotal,
                                  p2pdet._id,
                                  "sell",
                                  async function (balance) {
                                    let from_user = await usersDB.findOne(
                                      { _id: ObjectId(userId) },
                                      { displayname: 1 }
                                    );
                                    let to_user = await usersDB.findOne(
                                      { _id: ObjectId(confirmation.map_userId) },
                                      { displayname: 1 }
                                    );
                                    var opp_detail = "";
                                    if (
                                      userId.toString() ==
                                      confirmation.map_userId.toString()
                                    ) {
                                      opp_detail = await usersDB
                                        .findOne(
                                          { _id: confirmation.userId },
                                          { email: 1, displayname: 1 }
                                        )
                                        .exec();
                                    } else {
                                      opp_detail = await usersDB
                                        .findOne(
                                          { _id: confirmation.map_userId },
                                          { email: 1, displayname: 1 }
                                        )
                                        .exec();
                                    }
                                    var obj = {
                                      from_user_id: ObjectId(userId),
                                      to_user_id: ObjectId(opp_detail._id),
                                      p2porderId: ObjectId(confirmation._id),
                                      from_user_name: from_user.displayname,
                                      to_user_name: opp_detail.displayname,
                                      status: 0,
                                      message:
                                        "" +
                                        from_user.displayname +
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
                                      return res.json({
                                        status: true,
                                        Message: "Crypto Released Successfully",
                                      });
                                    }
                                  }
                                );
                              }
                            }
                          );
                        } else {
                          res.json({
                            status: false,
                            Message: "Something went wrong, Please try again",
                          });
                        }
                      }
                    }
                  );
                } else {
                  res.json({ status: false, Message: "Insufficient Balance" });
                }
              } else {
                res.json({
                  status: false,
                  Message: "Something went wrong, Please try again",
                });
              }
            });
          } else {
            let confirmation = await p2pconfirmOrder.findOneAndUpdate(
              { orderId: req.body.orderId },
              { $set: { status: 2, dispute_status: 2 } },
              { new: true }
            );
            let filledOrder = await p2pconfirmOrder.find({
              map_orderId: confirmation.map_orderId,
              status: 2,
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
            let filled = await p2pOrdersDB.findOneAndUpdate(
              { orderId: p2pdet.orderId },
              { $set: { status: status, filledAmount: remaining_amount } },
              { new: true }
            );
            common.getUserBalance(
              confirmation.userId,
              p2pdet.fromCurrency,
              async function (sellBalance) {
                if (sellBalance != null) {
                  var selluserBalanceTotal = sellBalance.totalBalance;
                  var sellholdTotal = sellBalance.balanceHoldTotal;
                  console.log("sell p2p userid===", userId);
                  console.log("sell user balance===", selluserBalanceTotal);
                  console.log("sell sellholdTotal===", sellholdTotal);
                  var updateHold = sellholdTotal - confirmation.askAmount;
                  console.log("sell sellholdTotal 111===", sellholdTotal);
                  updateHold = updateHold > 0 ? updateHold : 0;
                  console.log("sell updateHold===", updateHold);
                  console.log("sell p2p userid===", req.userId);
                  common.updatep2pHoldAmount(
                    confirmation.userId,
                    p2pdet.fromCurrency,
                    updateHold,
                    function (hold) { }
                  );
                  if (confirmation) {
                    common.getUserBalance(
                      confirmation.map_userId,
                      confirmation.firstCurrency,
                      async function (userBalance) {
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
                          common.updateUserBalances(
                            confirmation.map_userId,
                            confirmation.firstCurrency,
                            updateAmount,
                            userBalanceTotal,
                            p2pdet._id,
                            "sell",
                            async function (balance) {
                              let from_user = await usersDB.findOne(
                                { _id: ObjectId(userId) },
                                { displayname: 1 }
                              );
                              let to_user = await usersDB.findOne(
                                { _id: ObjectId(confirmation.map_userId) },
                                { displayname: 1 }
                              );
                              var opp_detail = "";
                              if (
                                userId.toString() ==
                                confirmation.map_userId.toString()
                              ) {
                                opp_detail = await usersDB
                                  .findOne(
                                    { _id: confirmation.userId },
                                    { email: 1, displayname: 1 }
                                  )
                                  .exec();
                              } else {
                                opp_detail = await usersDB
                                  .findOne(
                                    { _id: confirmation.map_userId },
                                    { email: 1, displayname: 1 }
                                  )
                                  .exec();
                              }
                              var obj = {
                                from_user_id: ObjectId(userId),
                                to_user_id: ObjectId(opp_detail._id),
                                p2porderId: ObjectId(confirmation._id),
                                from_user_name: from_user.displayname,
                                to_user_name: opp_detail.displayname,
                                status: 0,
                                message:
                                  "" +
                                  from_user.displayname +
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
                                return res.json({
                                  status: true,
                                  Message: "Crypto Released Successfully",
                                });
                              }
                            }
                          );
                        }
                      }
                    );
                  } else {
                    res.json({
                      status: false,
                      Message: "Something went wrong, Please try again",
                    });
                  }
                }
              }
            );
          }
        }
      } else {
        res.json({
          status: false,
          Message: "Something went wrong, Please try again",
        });
      }
    } catch (e) {
      res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post("/p2p_confirm_check", common.tokenmiddleware, async (req, res) => {
  try {
    let userId = req.userId;
    let p2pdet = await p2pconfirmOrder.findOne({ orderId: req.body.orderId });
    console.log("p2p confirm check====", p2pdet);
    if (p2pdet != null) {
      return res.json({ status: true, Message: p2pdet });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/p2p_history", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body, "=-=-=p2pMyorders-=-=");
    var search = req.body.search;
    var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 5);
    var page = Number(req.body.FilPage ? req.body.FilPage : 1);
    var filter = {};
    var userId = req.userId;
    var skippage = perPage * page - perPage;
    console.log(skippage, "=-=-=skippage=-=-=");
    console.log(perPage, "=-=-=skippage=-=-=");

    let getOrders = await p2pconfirmOrder
      .find({ $or: [{ map_userId: userId }, { userId: userId }] })
      .skip(skippage)
      .limit(perPage)
      .sort({ _id: -1 })
      .exec();
    console.log(getOrders, "=-=-=-getOrders-=-=-=getOrders=-=-=-");
    if (getOrders) {
      if (getOrders.length > 0) {
        for (var i = 0; i < getOrders.length; i++) {
          if (getOrders[i].type == "buy") {
            getOrders[i].type = getOrders[i].userId == userId ? "sell" : "buy";
          } else if (getOrders[i].type == "sell") {
            getOrders[i].type = getOrders[i].userId == userId ? "buy" : "sell";
          }
        }
      }
      let count = await p2pconfirmOrder
        .find({ $or: [{ map_userId: userId }, { userId: userId }] })
        .count()
        .exec();
      var returnObj = {
        Message: getOrders,
        current: page,
        pages: Math.ceil(count / perPage),
        total: count,
      };
      return res.json({ status: true, returnObj });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/p2p_balance", common.tokenmiddleware, (req, res) => {
  try {
    var fiat = req.body.fiat;
    var filter = {};
    filter = {
      userId: mongoose.Types.ObjectId(req.userId),
      "currdetail.status": "Active",
      "currdetail.p2p_status": "1",
    };

    userWalletDB
      .aggregate([
        {
          $unwind: "$wallets",
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
          $match: filter,
        },
        {
          $project: {
            currencySymbol: { $arrayElemAt: ["$currdetail.currencySymbol", 0] },
            currencyName: { $arrayElemAt: ["$currdetail.currencyName", 0] },
            currencyBalance: "$wallets.amount",
            status: { $arrayElemAt: ["$currdetail.status", 0] },
            p2p_status: { $arrayElemAt: ["$currdetail.p2p_status", 0] },
            popularOrder: { $arrayElemAt: ["$currdetail.popularOrder", 0] },
            estimatedValueInUSDT: {
              $arrayElemAt: ["$currdetail.estimatedValueInUSDT", 0],
            },
            coinType: { $arrayElemAt: ["$currdetail.coinType", 0] },
            currId: { $arrayElemAt: ["$currdetail._id", 0] },
          },
        },
        { $sort: { popularOrder: 1 } },
      ])
      .exec(async (err, resData) => {
        console.log("p2p currencies list====", resData);
        if (err) {
          return res.status(200).json({ Message: err, code: 200, status: false });
        } else {
          var response_currency = [];
          client.hget("CurrencyConversion", "allpair", async function (
            err,
            value
          ) {
            let redis_response = await JSON.parse(value);
            if (
              redis_response != null &&
              redis_response != "" &&
              redis_response != undefined &&
              Object.keys(redis_response).length > 0
            ) {
              for (var i = 0; i < resData.length; i++) {
                if (
                  redis_response[resData[i].currencySymbol][fiat] != undefined
                ) {
                  var obj = {
                    _id: resData[i].currId,
                    currencySymbol: resData[i].currencySymbol,
                    currencyName: resData[i].currencyname,
                    currencyBalance: resData[i].currencyBalance,
                    estimatedValueInUSDT:
                      redis_response[resData[i].currencySymbol][fiat],
                    coinType: resData[i].coinType,
                  };
                  response_currency.push(obj);
                }
              }
              var returnJson = {
                status: true,
                data: response_currency,
              };
              return res.status(200).json(returnJson);
            }
          });
        }
      });
  } catch (error) {
    console.log("catch error==", error);
    return res
      .status(500)
      .json({ Message: "Internal server", code: 500, status: false });
  }
});

router.post("/p2p_calculation", common.tokenmiddleware, async (req, res) => {
  var orderId = req.body.orderId;
  var qty = req.body.qty;
  var orderType = req.body.orderType;
  if (orderId != null && qty != null && orderType != null) {
    var p2p_order = await p2pOrdersDB.findOne({ orderId: orderId });
    if (qty > 0) {
      var order_qty = qty;
      var min_qty = p2p_order.fromLimit;
      var max_qty = p2p_order.toLimit;
      console.log("min_qty===", min_qty);
      console.log("max_qty===", max_qty);
      console.log("order_qty===", order_qty);
      if (order_qty < p2p_order.fromLimit || order_qty > p2p_order.toLimit) {
        return res.json({
          status: false,
          Message:
            "Please enter quantity between " + min_qty + " and " + max_qty + "",
        });
      } else {
        var total = order_qty * p2p_order.price;
        total = parseFloat(total).toFixed(2);
        var obj = {};
        obj.qty = qty;
        obj.total = total;
        obj.orderId = orderId;
        obj.p2porderId = p2p_order._id;
        obj.type = p2p_order.orderType == "buy" ? "sell" : "buy";
        return res.json({ status: true, response: obj });
      }
    } else {
      return res.json({ status: false, Message: "Please enter valid quantity" });
    }
  } else {
    return res.json({ Message: "Please enter all the fields", status: false });
  }
});

router.get("/notifications", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let notifications = await notifyDB
      .find({ to_user_id: ObjectId(userId), status: 0 })
      .sort({ _id: -1 });
    if (notifications) {
      return res.json({ status: true, Message: notifications });
    } else {
      return res.json({ status: false, Message: [] });
    }
  } catch (error) {
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/dispute_order", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var bodyData = req.body;

    if (bodyData.orderId != "") {
      let p2pdet = await p2pconfirmOrder.findOne({ orderId: bodyData.orderId });
      let p2p_order = await p2pOrdersDB.findOne({ orderId: p2pdet.map_orderId });
      if (p2pdet) {
        const dispute = {
          orderId: bodyData.orderId,
          userId: ObjectId(userId),
          query: bodyData.query,
          attachment: bodyData.attachment,
          type: bodyData.type,
          p2p_orderId: p2p_order.orderId,
        };
        console.log("dispute==", dispute);
        let dispute_order = await p2pdispute.create(dispute);
        let update_p2p = await p2pconfirmOrder.updateOne(
          { orderId: bodyData.orderId },
          { $set: { dispute_status: 1 } }
        );
        if (dispute_order) {
          var message = "Dispute raised Successfully";
          let from_user = await usersDB.findOne(
            { _id: ObjectId(userId) },
            { displayname: 1 }
          );
          var opp_detail = "";
          if (userId.toString() == p2pdet.map_userId.toString()) {
            opp_detail = await usersDB
              .findOne({ _id: p2pdet.userId }, { email: 1, displayname: 1 })
              .exec();
          } else {
            opp_detail = await usersDB
              .findOne({ _id: p2pdet.map_userId }, { email: 1, displayname: 1 })
              .exec();
          }
          var obj = {
            from_user_id: ObjectId(userId),
            to_user_id: ObjectId(opp_detail._id),
            p2porderId: ObjectId(p2pdet._id),
            from_user_name: from_user.displayname,
            to_user_name: opp_detail.displayname,
            status: 0,
            message:
              "" +
              from_user.displayname +
              " has raised dispute for the order " +
              p2pdet.askAmount +
              " " +
              p2pdet.fromCurrency +
              " " +
              p2pdet.type +
              " order",
            link: "/p2p/chat/" + p2pdet.orderId,
          };
          let notification = await notifyDB.create(obj);
          common.sendResponseSocket(
            "success",
            notification.message,
            "notify",
            notification.to_user_id,
            function () { }
          );
          var newRec = "";
          if (p2p_order.userId.toString() == userId.toString()) {
            newRec = {
              advertiserId: ObjectId(userId),
              adv_name: from_user.displayname,
              adv_msg: bodyData.query,
              adv_file: bodyData.attachment ? bodyData.attachment : "",
              p2porderId: ObjectId(p2pdet._id),
              orderId: p2pdet.orderId,
              adv_date: Date.now(),
              type: "advertiser",
            };
          } else {
            newRec = {
              userId: ObjectId(userId),
              user_name: from_user.displayname,
              user_msg: bodyData.query,
              user_file: bodyData.attachment ? bodyData.attachment : "",
              p2porderId: ObjectId(p2pdet._id),
              orderId: p2pdet.orderId,
              user_date: Date.now(),
              type: "user",
            };
          }

          let savechat = await p2pChatDB.create(newRec);

          if (savechat) {
            var whereCondn = { orderId: savechat.orderId };
            let getChat = await p2pChatDB
              .findOne(whereCondn)
              .limit(1)
              .sort({ _id: -1 })
              .exec();
            common.sendResponseSocket(
              "success",
              getChat,
              "p2pchat",
              opp_detail._id,
              function () { }
            );
          }
          res.json({ status: true, Message: message });
        } else {
          console.log("confirmOrder error==");
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        }
      } else {
        res.json({ status: false, Message: "Invalid request" });
      }
    }
  } catch (e) {
    console.log("dispute raise catch==", e);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/p2p_check_confirm", common.tokenmiddleware, async (req, res) => {
  try {
    let userId = req.userId;
    let p2pdet = await p2pconfirmOrder.findOne({ orderId: req.body.orderId });

    console.log("p2p confirm check====", p2pdet);
    if (p2pdet != null) {
      console.log("p2pdet.map_userId====", p2pdet.map_userId);
      let bank = await bankdb.findOne({
        userid: ObjectId(p2pdet.map_userId),
        Status: 1,
      });
      console.log("p2pdet.bank====", bank);
      return res.json({ status: true, Message: p2pdet, bank_details: bank });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.get("/p2p_dispute_data", common.tokenmiddleware, (req, res) => {
  try {
    p2pconfirmOrder
      .find({ dispute_status: 1 })
      .sort({ _id: -1 })
      .exec(function (err, disputedata) {
        console.log("dispute data===", disputedata);
        if (!err || disputedata) {
          return res.json({ status: true, data: disputedata });
        } else {
          return res.json({
            status: false,
            data: [],
            message: "Something went wrong",
          });
        }
      });
  } catch (e) {
    console.log(
      "====================p2p dispute data catch===================="
    );
    console.log(e);
    return res.json({ status: false, data: [], message: "Something went wrong" });
  }
});

router.post("/get_dispute", common.tokenmiddleware, (req, res) => {
  try {
    p2pdispute
      .aggregate([
        {
          $match: {
            orderId: req.body._id,
          },
        },
        {
          $lookup: {
            from: "p2pconfirmOrder",
            localField: "orderId",
            foreignField: "orderId",
            as: "confirm_detail",
          },
        },
        { $unwind: "$confirm_detail" },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user_detail",
          },
        },
        { $unwind: "$user_detail" },
        {
          $project: {
            query: 1,
            attachment: 1,
            amount: "$confirm_detail.askAmount",
            price: "$confirm_detail.askPrice",
            currency: "$confirm_detail.fromCurrency",
            status: "$confirm_detail.dispute_status",
            displayname: "$user_detail.displayname",
            createdAt: 1,
            p2p_orderId: 1,
            confirm_orderId: "$confirm_detail.orderId",
            type: 1,
          },
        },

        {
          $sort: { _id: -1 },
        },
      ])
      .exec(function (err, disputedata) {
        console.log("dispute data===", disputedata);
        if (!err || disputedata) {
          return res.json({ status: true, data: disputedata });
        } else {
          return res.json({
            status: false,
            data: [],
            message: "Something went wrong",
          });
        }
      });
  } catch (e) {
    console.log(
      "====================p2p dispute data catch===================="
    );
    console.log(e);
    return res.json({ status: false, data: [], message: "Something went wrong" });
  }
});

// router.get('/p2p_dispute_data', common.tokenmiddleware, (req, res) => {
//     try {
//         p2pconfirmOrder.find({status:1}).sort({_id:-1}).exec(function (err, disputedata) {
//             console.log("dispute data===",disputedata);
//             if (!err || disputedata) {
//                 return res.json({ status: true, data: disputedata });
//             }
//             else {
//                 return res.json({ status: false, data: [], message: 'Something went wrong' });
//             }
//         })
//     }
//     catch (e) {
//         console.log('====================p2p dispute data catch====================');
//         console.log(e);
//         return res.json({ status: false, data: [], message: 'Something went wrong' });
//     }
// });

// router.post('/get_dispute', common.tokenmiddleware, (req, res) => {
//         try {
//             p2pconfirmOrder.aggregate([
//                 {
//                    $match: {
//                        orderId: req.body._id
//                    }
//                 },
//                 {
//                     $lookup: {
//                         from: "users",
//                         localField: "map_userId",
//                         foreignField: "_id",
//                         as: "user_detail"
//                     }
//                 },
//                 { $unwind: '$user_detail' },
//                 {
//                     $project: {
//                         "askAmount": 1,
//                         "askPrice": 1,
//                         "fromCurrency": 1,
//                         "status": 1,
//                         "displayname": "$user_detail.displayname",
//                         "createdAt": 1,
//                         "map_orderId": 1,
//                         "orderId":1,
//                         "type":1
//                     }
//                 },

//                 {
//                     $sort: { _id: -1 }
//                 }
//             ]).exec(function (err, disputedata) {
//                 console.log("dispute data===",disputedata);
//                 if (!err || disputedata) {
//                     return res.json({ status: true, data: disputedata });
//                 }
//                 else {
//                     return res.json({ status: false, data: [], message: 'Something went wrong' });
//                 }
//             })
//         }
//         catch (e) {
//             console.log('====================p2p dispute data catch====================');
//             console.log(e);
//             return res.json({ status: false, data: [], message: 'Something went wrong' });
//         }
// });

// router.post("/fetch_price", async (req, res) => {
//     try {
//       var firstCurrency = req.body.fromCurrency;
//       var secondCurrency = req.body.toCurrency;
//       var pair = firstCurrency+secondCurrency;
//       var result = await RedisService.hget("p2pPrice",pair.toLowerCase());
//       if(result != null)
//       {
//         return res.json({ status: true, data: result });
//       }
//       else
//       {
//         var options = [
//             {
//               "$match": {
//                 'firstCurrency': firstCurrency,
//                 'secondCurrency': secondCurrency,
//                 'status': 'filled'
//               }
//             },
//             {
//               $group: {
//                 _id: {
//                     firstCurrency: "$firstCurrency",
//                     secondCurrency: "$secondCurrency"
//                 },
//                 highprice: { $max: "$price" },
//                 lowprice: { $min: "$price" },
//               }
//             }
//           ];

//           p2pOrdersDB.aggregate(options).exec(async function (error, data) {
//               console.log("fetch price data===",data);
//             if (data.length > 0) {
//               var response = await data[0];
//               var resp = {
//                 highprice: response.highprice,
//                 lowprice: response.lowprice,
//                 firstCurrency: response.firstCurrency,
//                 secondCurrency: response.secondCurrency
//               }
//               var pair = firstCurrency+secondCurrency;
//               RedisService.hset('p2pPrice', JSON.stringify(pair.toLowerCase()), JSON.stringify(resp));
//               return res.json({ status: true, data: resp });
//             }
//             else {
//               var resp = {
//                 highprice: 0,
//                 lowprice: 0,
//                 firstCurrency: firstCurrency,
//                 secondCurrency: secondCurrency
//               }
//               var pair = firstCurrency+secondCurrency;
//               RedisService.hset('p2pPrice', JSON.stringify(pair.toLowerCase()), JSON.stringify(resp));
//               return res.json({ status: true, data: resp });
//             }
//           });
//       }

//     } catch (error) {
//       console.log("catch error===", error);
//       return res.json({ status: false, message: error.message });
//     }

//   })



router.post("/getp2pBalance", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var p2pbalance = "";
    common.getUserBalance(userId, req.body.fromCurrency, function (
      userBalance
    ) {
      console.log("p2p balance response===", userBalance.totalBalance);
      if (userBalance != null) {
        p2pbalance = userBalance.totalBalance;
        return res.json({ status: true, p2pbalance: p2pbalance });
      } else {
        return res.json({ status: true, Message: [] });
      }
    });
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post(
  "/cancel_confirm_order",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var orderId = req.body.orderId;
      var orderDetail = await p2pconfirmOrder.findOne({ orderId: orderId });

      if (orderDetail) {
        var p2pdetail = await p2pOrdersDB.findOne({
          _id: ObjectId(orderDetail.p2p_orderId),
        });
        var processAmount = 0;
        processAmount = p2pdetail.processAmount - orderDetail.askAmount;
        processAmount = processAmount < 0 ? 0 : processAmount;
        console.log("processAmount====", processAmount);
        let p2pupdate = await p2pOrdersDB.updateOne(
          { _id: ObjectId(orderDetail.p2p_orderId) },
          { $set: { processAmount: processAmount, order_status: "pending" } }
        );
        console.log("p2pupdate====", p2pupdate);
        let p2pconfirm = await p2pconfirmOrder.updateOne(
          { orderId: orderId },
          { $set: { status: 3 } }
        );
        if (p2pupdate && p2pconfirm) {
          common.sendCommonSocket(
            "success",
            "ordercancel",
            "ordercancel",
            function () { }
          );
          return res.json({
            status: true,
            Message: "Timeout Order cancelled, Please try again",
          });
        } else {
          return res.json({
            status: false,
            Message: "Something went wrong, please try again",
          });
        }
      } else {
        return res.json({ status: false, Message: "Invalid Order" });
      }
    } catch (error) {
      console.log("-=-errorerror=-=-=-", error);
      return res.json({
        status: false,
        Message: "Internal server error, Please try later!",
      });
    }
  }
);

router.post(
  "/cancel_confirmorder_sell",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var orderId = req.body.orderId;
      var orderDetail = await p2pconfirmOrder.findOne({ orderId: orderId });

      if (orderDetail) {
        let p2pconfirm = await p2pconfirmOrder.updateOne(
          { orderId: orderId },
          { $set: { dispute_status: 1, reason: "Seller not release the coin" } }
        );
        if (p2pconfirm) {
          return res.json({
            status: true,
            Message: "Timeout Dispute raised, Please release the coin",
          });
        } else {
          return res.json({
            status: false,
            Message: "Something went wrong, please try again",
          });
        }
      } else {
        return res.json({ status: false, Message: "Invalid Order" });
      }
    } catch (error) {
      console.log("-=-errorerror=-=-=-", error);
      return res.json({
        status: false,
        Message: "Internal server error, Please try later!",
      });
    }
  }
);

router.post("/read_notify", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let check_notify = await notifyDB.findOne({ _id: ObjectId(req.body._id) });
    if (check_notify != null) {
      let updateNotify = await notifyDB.updateOne(
        { status: 0, _id: ObjectId(req.body._id) },
        { $set: { status: 1 } }
      );
      if (updateNotify) {
        return res.json({ status: true });
      } else {
        return res.json({ status: false });
      }
    } else {
      return res.json({ status: false });
    }
  } catch (error) {
    console.log("-=-read_notify error=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/buyer_pay_cancel", common.tokenmiddleware, async (req, res) => {
  try {
    let userId = req.userId;
    var orderId = req.body.orderId;
    var orderDetail = await p2pconfirmOrder.findOne({ orderId: orderId });

    if (orderDetail) {
      var p2pdetail = await p2pOrdersDB.findOne({
        _id: ObjectId(orderDetail.p2p_orderId),
      });
      var processAmount = 0;
      processAmount = p2pdetail.processAmount - orderDetail.askAmount;
      processAmount = processAmount < 0 ? 0 : processAmount;
      let p2pupdate = await p2pOrdersDB.updateOne(
        { _id: ObjectId(orderDetail.p2p_orderId) },
        { $set: { processAmount: processAmount, order_status: "pending" } }
      );
      let p2pconfirm = await p2pconfirmOrder.updateOne(
        { orderId: orderId },
        { $set: { status: 3 } }
      );
      if (p2pupdate && p2pconfirm) {
        var message = "Buyer cancelled the order";
        let from_user = await usersDB.findOne(
          { _id: ObjectId(userId) },
          { displayname: 1 }
        );
        var to_user = "";
        if (userId.toString() == orderDetail.map_userId.toString()) {
          to_user = await usersDB
            .findOne({ _id: orderDetail.userId }, { email: 1, displayname: 1 })
            .exec();
        } else {
          to_user = await usersDB
            .findOne({ _id: orderDetail.map_userId }, { email: 1, displayname: 1 })
            .exec();
        }
        var obj = {
          from_user_id: ObjectId(userId),
          to_user_id: ObjectId(to_user._id),
          p2porderId: ObjectId(p2pdetail._id),
          from_user_name: from_user.displayname,
          to_user_name: to_user.displayname,
          status: 0,
          message:
            "" +
            from_user.displayname +
            " has cancelled the order for " +
            orderDetail.askAmount +
            " " +
            p2pdetail.firstCurrency +
            " " +
            p2pdetail.orderType +
            " order",
          link: "/p2p/chat/" + orderDetail.orderId,
        };
        let notification = await notifyDB.create(obj);
        common.sendResponseSocket(
          "success",
          notification.message,
          "notify",
          notification.to_user_id,
          function () { }
        );
        return res.json({
          status: true,
          Message: "Order cancelled successfully",
        });
      } else {
        return res.json({
          status: false,
          Message: "Something went wrong, please try again",
        });
      }
    } else {
      return res.json({ status: false, Message: "Invalid Order" });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post(
  "/p2p_confirm_calculation",
  common.tokenmiddleware,
  async (req, res) => {
    var userId = req.userId;
    var orderId = req.body.orderId;
    var quantity = req.body.quantity;
    var max_status = req.body.max_status;
    if (max_status == 1) {
      var p2pOrder = await p2pOrdersDB.findOne({ orderId: orderId });
      if (p2pOrder != null) {
        if (p2pOrder.orderType == "buy") {
          var available_qty = +p2pOrder.totalAmount - +p2pOrder.processAmount;
          var order_qty = +available_qty;
          var total = parseFloat(order_qty * p2pOrder.price).toFixed(2);
          var resp = {
            quantity: order_qty,
            total: total,
          };
          return res.json({ status: true, response: resp });
        } else {
          var p2pbalance = "";
          common.getUserBalance(userId, p2pOrder.firstCurrency, function (
            userBalance
          ) {
            if (userBalance != null) {
              p2pbalance = userBalance.totalBalance;
              var avail_qty = +p2pOrder.totalAmount - +p2pOrder.processAmount;
              var order_qty = avail_qty > p2pbalance ? p2pbalance : avail_qty;
              var total = parseFloat(order_qty * p2pOrder.price).toFixed(2);
              var resp = {
                quantity: order_qty,
                total: total,
              };
              return res.json({ status: true, response: resp });
            } else {
              return res.json({
                status: false,
                Message: "Something went wrong, Please try again",
              });
            }
          });
        }
      } else {
        return res.json({ status: false, Message: "Invalid order" });
      }
    } else {
      if (quantity != "") {
        var p2pOrder = await p2pOrdersDB.findOne({ orderId: orderId });
        if (p2pOrder != null) {
          if (quantity > 0) {
            var min_qty = p2pOrder.fromLimit;
            var max_qty = p2pOrder.toLimit;
            var available_qty = +p2pOrder.totalAmount - +p2pOrder.processAmount;
            if (quantity < p2pOrder.fromLimit || quantity > available_qty) {
              return res.json({
                status: false,
                Message:
                  "Please enter quantity between " +
                  min_qty +
                  " and " +
                  max_qty +
                  "",
              });
            } else {
              var total = parseFloat(quantity * p2pOrder.price).toFixed(2);
              var resp = {
                quantity: quantity,
                total: total,
              };
              return res.json({ status: true, response: resp });
            }
          } else {
            return res.json({
              status: false,
              Message: "Please enter valid quantity",
            });
          }
        } else {
          return res.json({ status: false, Message: "Invalid order" });
        }
      } else {
        return res.json({ status: false, Message: "Please enter quantity" });
      }
    }
  }
);

router.post("/processOrders", common.tokenmiddleware, async (req, res) => {
  try {
    console.log(req.body, "=-=-=p2pMyorders-=-=");
    var search = req.body.search;
    var perPage = Number(req.body.FilPerpage ? req.body.FilPerpage : 5);
    var page = Number(req.body.FilPage ? req.body.FilPage : 1);
    var filter = {};

    if (typeof search !== "undefined" && search !== "" && search !== "null") {
      if (isNaN(search)) {
        filter.$or = [
          { firstCurrency: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { secondCurrnecy: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { orderId: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { status: { $regex: new RegExp(".*" + search + ".*", "i") } },
        ];
      } else {
        filter.$or = [
          { firstCurrency: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { secondCurrnecy: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { orderId: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { status: { $regex: new RegExp(".*" + search + ".*", "i") } },
        ];
      }
    }
    var userId = req.userId;
    var skippage = perPage * page - perPage;
    console.log(skippage, "=-=-=skippage=-=-=");
    console.log(perPage, "=-=-=skippage=-=-=");

    let getOrders = await p2pconfirmOrder
      .find({ $or: [{ map_userId: userId }, { userId: userId }] })
      .skip(skippage)
      .limit(perPage)
      .sort({ _id: -1 })
      .exec();
    console.log(getOrders, "=-=-=-getOrders-=-=-=getOrders=-=-=-");
    if (getOrders) {
      let count = await p2pconfirmOrder
        .find({ $or: [{ map_userId: userId }, { userId: userId }] })
        .count()
        .exec();

      var returnObj = {
        Message: getOrders,
        current: page,
        pages: Math.ceil(count / perPage),
        total: count,
      };
      return res.json({ status: true, returnObj });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/p2p_confirmOrder", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    console.log("userId===", userId);
    var bodyData = req.body;

    if (bodyData.orderId != "") {
      let p2pdet = await p2pOrdersDB.findOne({ orderId: bodyData.orderId });
      if (p2pdet) {
        if (p2pdet.orderType == "sell") {
          var processAmount = 0;
          processAmount = p2pdet.totalAmount - p2pdet.processAmount;
          if (processAmount >= +bodyData.quantity) {
            var filled = p2pdet.filledAmount - +bodyData.quantity;
            const confirmOrder = {
              map_orderId: bodyData.orderId,
              map_userId: ObjectId(userId),
              p2p_orderId: ObjectId(p2pdet._id),
              fromCurrency: p2pdet.firstCurrency,
              toCurrency: p2pdet.secondCurrnecy,
              askAmount: bodyData.quantity,
              askPrice: p2pdet.price,
              type: "buy",
              filledAmount: filled,
              userId: ObjectId(p2pdet.userId),
              orderId: uid.randomUUID(6).toLowerCase(),
              firstCurrency: p2pdet.fromCurrency,
              secondCurrency: p2pdet.toCurrnecy,
            };
            console.log("confirmOrder==", confirmOrder);
            let confirmation = await p2pconfirmOrder.create(confirmOrder);
            var processAmount = 0;
            processAmount = p2pdet.processAmount + +bodyData.quantity;
            let p2pUpdate = await p2pOrdersDB.updateOne(
              { _id: ObjectId(p2pdet._id) },
              { $set: { processAmount: processAmount, order_status: "processing" } }
            );
            if (confirmation) {
              var message = "Order Confirmed Successfully";
              let from_user = await usersDB.findOne(
                { _id: ObjectId(userId) },
                { displayname: 1 }
              );
              let to_user = await usersDB.findOne(
                { _id: ObjectId(p2pdet.userId) },
                { displayname: 1 }
              );
              var obj = {
                from_user_id: ObjectId(userId),
                to_user_id: ObjectId(to_user._id),
                p2porderId: ObjectId(p2pdet._id),
                from_user_name: from_user.displayname,
                to_user_name: to_user.displayname,
                status: 0,
                message:
                  "" +
                  from_user.displayname +
                  " has confirmed the order for " +
                  confirmation.askAmount +
                  " " +
                  p2pdet.firstCurrency +
                  " " +
                  p2pdet.orderType +
                  " order",
                link: "/p2p/chat/" + confirmation.orderId,
              };
              let notification = await notifyDB.create(obj);
              common.sendResponseSocket(
                "success",
                notification.message,
                "notify",
                notification.to_user_id,
                function () { }
              );

              let newRec = {
                advertiserId: ObjectId(to_user._id),
                adv_name: to_user.displayname,
                adv_msg:
                  "Important: Please DO NOT share payment proof or communicate with counterpart outside the Taikonz P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
                adv_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                adv_date: Date.now(),
                type: "advertiser",
                default: 1,
              };
              let savechat = await p2pChatDB.create(newRec);

              if (savechat) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec2 = {
                advertiserId: ObjectId(to_user._id),
                adv_name: to_user.displayname,
                adv_msg:
                  "Please make payment before within time limit to avoid the cancellation of order",
                adv_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                adv_date: Date.now(),
                type: "advertiser",
                default: 1,
              };
              let savechat2 = await p2pChatDB.create(newRec2);

              if (savechat2) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec1 = {
                advertiserId: ObjectId(userId),
                adv_name: from_user.displayname,
                adv_msg:
                  "" +
                  from_user.displayname +
                  " has created the order please wait till buyer make payment Do not release the crypto until you receive payment from buyer",
                adv_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                adv_date: Date.now(),
                type: "advertiser",
                default: 1,
              };
              let savechat1 = await p2pChatDB.create(newRec1);

              if (savechat1) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec3 = {
                advertiserId: ObjectId(userId),
                adv_name: from_user.displayname,
                adv_msg:
                  "Do not release the crypto until you receive payment from buyer",
                adv_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                adv_date: Date.now(),
                type: "advertiser",
                default: 1,
              };
              let savechat3 = await p2pChatDB.create(newRec3);

              if (savechat3) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              res.json({
                status: true,
                Message: message,
                link: "/p2p/chat/" + confirmation.orderId,
                chatId: confirmation.orderId,
              });
            } else {
              console.log("confirmOrder error==");
              res.json({
                status: false,
                Message: "Something Went Wrong. Please Try Again later",
              });
            }
          } else {
            res.json({
              status: false,
              Message:
                "Please enter quantity less than or equal to " + processAmount,
            });
          }
        } else {
          var processAmount = 0;
          processAmount = p2pdet.totalAmount - p2pdet.processAmount;
          if (processAmount >= +bodyData.quantity) {
            var filled = p2pdet.filledAmount - +bodyData.quantity;
            const confirmOrder = {
              map_orderId: bodyData.orderId,
              map_userId: ObjectId(userId),
              p2p_orderId: ObjectId(p2pdet._id),
              fromCurrency: p2pdet.firstCurrency,
              toCurrency: p2pdet.secondCurrnecy,
              askAmount: bodyData.quantity,
              askPrice: p2pdet.price,
              type: "sell",
              filledAmount: filled,
              userId: ObjectId(p2pdet.userId),
              orderId: uid.randomUUID(6).toLowerCase(),
              firstCurrency: p2pdet.fromCurrency,
              secondCurrency: p2pdet.toCurrnecy,
            };
            console.log("confirmOrder==", confirmOrder);
            let confirmation = await p2pconfirmOrder.create(confirmOrder);
            var processAmount = 0;
            processAmount = p2pdet.processAmount + +bodyData.quantity;
            let p2pUpdate = await p2pOrdersDB.updateOne(
              { _id: ObjectId(p2pdet._id) },
              { $set: { processAmount: processAmount, order_status: "processing" } }
            );
            if (confirmation) {
              var message = "Order Confirmed Successfully";
              let from_user = await usersDB.findOne(
                { _id: ObjectId(userId) },
                { displayname: 1 }
              );
              let to_user = await usersDB.findOne(
                { _id: ObjectId(p2pdet.userId) },
                { displayname: 1 }
              );
              var obj = {
                from_user_id: ObjectId(userId),
                to_user_id: ObjectId(to_user._id),
                p2porderId: ObjectId(p2pdet._id),
                from_user_name: from_user.displayname,
                to_user_name: to_user.displayname,
                status: 0,
                message:
                  "" +
                  from_user.displayname +
                  " has confirmed the order for " +
                  confirmation.askAmount +
                  " " +
                  p2pdet.firstCurrency +
                  " " +
                  p2pdet.orderType +
                  " order",
                link: "/p2p/chat/" + confirmation.orderId,
              };
              let notification = await notifyDB.create(obj);
              common.sendResponseSocket(
                "success",
                notification.message,
                "notify",
                notification.to_user_id,
                function () { }
              );

              let newRec = {
                userId: ObjectId(userId),
                user_name: from_user.displayname,
                user_msg:
                  "Important: Please DO NOT share payment proof or communicate with counter part outside the Taikonz P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
                user_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                user_date: Date.now(),
                type: "user",
                default: 1,
              };
              let savechat = await p2pChatDB.create(newRec);

              if (savechat) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec2 = {
                userId: ObjectId(userId),
                user_name: from_user.displayname,
                user_msg:
                  "Please make payment before within time limit to avoid the cancellation of order",
                user_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                user_date: Date.now(),
                type: "user",
                default: 1,
              };
              let savechat2 = await p2pChatDB.create(newRec2);

              if (savechat2) {
                var whereCondn = { type: "user", orderId: savechat2.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec1 = {
                advertiserId: ObjectId(to_user._id),
                adv_name: to_user.displayname,
                adv_msg:
                  "" +
                  to_user.displayname +
                  " has created the order please wait till buyer make payment",
                adv_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                adv_date: Date.now(),
                type: "advertiser",
                default: 1,
              };
              let savechat1 = await p2pChatDB.create(newRec1);

              if (savechat1) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }

              let newRec3 = {
                advertiserId: ObjectId(to_user._id),
                adv_name: to_user.displayname,
                adv_msg:
                  "Do not release the crypto until you receive payment from buyer",
                adv_file: "",
                p2porderId: ObjectId(confirmation._id),
                orderId: confirmation.orderId,
                adv_date: Date.now(),
                type: "advertiser",
                default: 1,
              };
              let savechat3 = await p2pChatDB.create(newRec1);

              if (savechat3) {
                var whereCondn = { type: "user", orderId: savechat.orderId };
                let getChat = await p2pChatDB
                  .findOne(whereCondn)
                  .limit(1)
                  .sort({ _id: -1 })
                  .exec();
                common.sendResponseSocket(
                  "success",
                  getChat,
                  "p2pchat",
                  getChat.userId,
                  function () { }
                );
              }
              res.json({
                status: true,
                Message: message,
                link: "/p2p/chat/" + confirmation.orderId,
                chatId: confirmation.orderId,
              });
            } else {
              console.log("confirmOrder error==");
              res.json({
                status: false,
                Message: "Something Went Wrong. Please Try Again later",
              });
            }
          } else {
            res.json({
              status: false,
              Message:
                "Please enter quantity less than or equal to " + processAmount,
            });
          }
        }
      } else {
        res.json({ status: false, Message: "Invalid request" });
      }
    }
  } catch (e) {
    console.log("confirmOrder catch==", e);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/p2p_chat_view", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    if (req.body.orderId != null) {
      let getconfirmOrders = await p2pconfirmOrder.findOne({
        orderId: req.body.orderId,
      });
      let getOrders = await p2pOrdersDB.findOne({
        orderId: getconfirmOrders.map_orderId,
      });
      let bank = await bankdb.findOne(
        { userid: ObjectId(getOrders.userId), Status: 1 },
        { _id: 0, userid: 0, Status: 0, createdAt: 0, updatedAt: 0, __v: 0 }
      );
      let bank_opp = await bankdb.findOne(
        { userid: ObjectId(getconfirmOrders.map_userId), Status: 1 },
        { _id: 0, userid: 0, Status: 0, createdAt: 0, updatedAt: 0, __v: 0 }
      );
      let userdata = await usersDB.findOne({ _id: ObjectId(userId) });
      var p2pbalance = "";
      var resp_p2p = {};
      var ordertype = "";
      var timer_status = "";
      var timer_value = "";
      var usertype =
        userdata._id.toString() == getOrders.userId.toString()
          ? "advertiser"
          : "user";
      common.getUserBalance(userId, getOrders.fromCurrency, function (
        userBalance
      ) {
        console.log("p2p balance response===", userBalance.totalBalance);
        if (userBalance != null) {
          p2pbalance = userBalance.totalBalance;
          //return res.json({ status : true, Message : getOrders, bank:bank, p2pbalance: p2pbalance });
          if (getOrders.orderType == "buy") {
            if (userdata._id.toString() == getOrders.userId.toString()) {
              resp_p2p["orderType"] = "Buy";
              ordertype = "Buy";
            } else {
              resp_p2p["orderType"] = "Sell";
              ordertype = "Sell";
            }
          } else {
            if (userdata._id.toString() == getOrders.userId.toString()) {
              resp_p2p["orderType"] = "Sell";
              ordertype = "Sell";
            } else {
              resp_p2p["orderType"] = "Buy";
              ordertype = "Buy";
            }
          }
          var created_date = moment(getOrders.createdAt).format(
            "DD.MM.YYYY h:m a"
          );
          resp_p2p["created_date"] = created_date;
          resp_p2p["quantity"] =
            getOrders.filledAmount + " " + getOrders.firstCurrency;
          resp_p2p["price"] = getOrders.price + " " + getOrders.secondCurrnecy;
          if (
            userdata._id.toString() != getOrders.userId.toString() &&
            ordertype == "Sell" &&
            getconfirmOrders != ""
          ) {
            var ordertotal = getconfirmOrders.askAmount * getOrders.price;
            resp_p2p["need_to_release"] =
              getconfirmOrders.askAmount + " " + getOrders.firstCurrency;
            resp_p2p["you_will_get"] =
              parseFloat(ordertotal).toFixed(2) +
              " " +
              getOrders.secondCurrnecy;
            resp_p2p["buyer_payment_methods"] = bank;
          }

          if (
            userdata._id.toString() != getOrders.userId.toString() &&
            ordertype == "Buy" &&
            getconfirmOrders != ""
          ) {
            var ordertotal = getconfirmOrders.askAmount * getOrders.price;
            resp_p2p["need_to_pay"] =
              parseFloat(ordertotal).toFixed(2) +
              " " +
              getOrders.secondCurrnecy;
            resp_p2p["you_will_get"] =
              getconfirmOrders.askAmount + " " + getOrders.firstCurrency;
            resp_p2p["seller_payment_methods"] = bank;
          }

          if (
            userdata._id.toString() == getOrders.userId.toString() &&
            ordertype == "Sell" &&
            getconfirmOrders != ""
          ) {
            var ordertotal = getconfirmOrders.askAmount * getOrders.price;
            resp_p2p["need_to_release"] =
              getconfirmOrders.askAmount + " " + getOrders.firstCurrency;
            resp_p2p["you_will_get"] =
              parseFloat(ordertotal).toFixed(2) +
              " " +
              getOrders.secondCurrnecy;
            resp_p2p["buyer_payment_methods"] = bank_opp;
          }

          if (
            userdata._id.toString() == getOrders.userId.toString() &&
            ordertype == "Buy" &&
            getconfirmOrders != ""
          ) {
            var ordertotal = getconfirmOrders.askAmount * getOrders.price;
            resp_p2p["need_to_pay"] =
              parseFloat(ordertotal).toFixed(2) +
              " " +
              getOrders.secondCurrnecy;
            resp_p2p["you_will_get"] =
              getconfirmOrders.askAmount + " " + getOrders.firstCurrency;
            resp_p2p["seller_payment_methods"] = bank_opp;
          }

          let paymentTime =
            getOrders.pay_time != null && getOrders.pay_time != ""
              ? getOrders.pay_time
              : "15";

          if (getconfirmOrders.status == 0) {
            var timer =
              new Date(getconfirmOrders.datetime).getTime() +
              paymentTime * 60 * 1000;
            var current_time = new Date().getTime();
            if (timer > current_time) {
              timer_status = "active";
              timer_value = timer;
            } else {
              timer_status = "deactive";
            }
          } else if (getconfirmOrders.status == 1) {
            var timer =
              new Date(getconfirmOrders.paytime).getTime() + 15 * 60 * 1000;
            var current_time = new Date().getTime();
            if (timer > current_time) {
              timer_status = "active";
              timer_value = timer;
            } else {
              timer_status = "deactive";
            }
          }

          if (
            ordertype == "Buy" &&
            userdata._id.toString() == getOrders.userId.toString() &&
            getconfirmOrders.status == 0 &&
            timer_status == "active"
          ) {
            var response_text = "Payment to be made within ";
            response_text +=
              getOrders.pay_time < 60
                ? getOrders.pay_time + " minutes "
                : getOrders.pay_time / 60 == 1
                  ? getOrders.pay_time / 60 + " hour "
                  : getOrders.pay_time / 60 + " hours ";
            response_text += "Please pay fast ";
            response_text += "Do not accept third party payment ";
            response_text += "If you are not pay within ";
            response_text +=
              getOrders.pay_time < 60
                ? getOrders.pay_time + " minutes "
                : getOrders.pay_time / 60 == 1
                  ? getOrders.pay_time / 60 + " hour "
                  : getOrders.pay_time / 60 + " hours";
            response_text += "order will be cancelled automatically";
            resp_p2p["timer_text"] = response_text;
            resp_p2p["timer"] = timer_value;
          }

          if (
            ordertype == "Buy" &&
            userdata._id.toString() != getOrders.userId.toString() &&
            getconfirmOrders.status == 0 &&
            timer_status == "active"
          ) {
            var response_text = "Payment to be made within ";
            response_text +=
              getOrders.pay_time < 60
                ? getOrders.pay_time + " minutes "
                : getOrders.pay_time / 60 == 1
                  ? getOrders.pay_time / 60 + " hour "
                  : getOrders.pay_time / 60 + " hours ";
            response_text += "Please pay fast ";
            response_text += "Do not accept third party payment ";
            response_text += "If you are not pay within ";
            response_text +=
              getOrders.pay_time < 60
                ? getOrders.pay_time + " minutes "
                : getOrders.pay_time / 60 == 1
                  ? getOrders.pay_time / 60 + " hour "
                  : getOrders.pay_time / 60 + " hours";
            response_text += "order will be cancelled automatically";
            resp_p2p["timer_text"] = response_text;
            resp_p2p["timer"] = timer_value;
          }

          if (
            ordertype == "Buy" &&
            userdata._id.toString() == getOrders.userId.toString() &&
            getconfirmOrders.status == 0
          ) {
            resp_p2p["button_text1"] = "Confirm Payment";
            resp_p2p["button_text2"] = "Cancel";
          }

          if (
            ordertype == "Buy" &&
            userdata._id.toString() != getOrders.userId.toString() &&
            getconfirmOrders.status == 0
          ) {
            resp_p2p["button_text1"] = "Confirm Payment";
            resp_p2p["button_text2"] = "Cancel";
          }

          if (
            ordertype == "Buy" &&
            userdata._id.toString() == getOrders.userId.toString() &&
            getconfirmOrders.status == 1
          ) {
            resp_p2p["button_text1"] = "Raise Dispute";
          }

          if (
            ordertype == "Buy" &&
            userdata._id.toString() != getOrders.userId.toString() &&
            getconfirmOrders.status == 1
          ) {
            resp_p2p["button_text1"] = "Raise Dispute";
          }

          if (
            ordertype == "Sell" &&
            userdata._id.toString() == getOrders.userId.toString() &&
            getconfirmOrders.status == 1 &&
            timer_status == "active"
          ) {
            var response_text =
              "Buyer paid the amount, Release the crypto within 15 minutes";
            response_text +=
              "If you are not release within 15 mintutes, order will be disputed automatically";
            resp_p2p["timer_text"] = response_text;
            resp_p2p["timer"] = timer_value;
          }

          if (
            ordertype == "Sell" &&
            userdata._id.toString() != getOrders.userId.toString() &&
            getconfirmOrders.status == 1 &&
            timer_status == "active"
          ) {
            var response_text =
              "Buyer paid the amount, Release the crypto within 15 minutes";
            response_text +=
              "If you are not release within 15 mintutes, order will be disputed automatically";
            resp_p2p["timer_text"] = response_text;
            resp_p2p["timer"] = timer_value;
          }

          if (
            ordertype == "Sell" &&
            userdata._id.toString() == getOrders.userId.toString() &&
            getconfirmOrders.status == 1
          ) {
            resp_p2p["button_text1"] = "Confirm Release";
            resp_p2p["button_text2"] = "Raise Dispute";
          }

          if (
            ordertype == "Sell" &&
            userdata._id.toString() != getOrders.userId.toString() &&
            getconfirmOrders.status == 1
          ) {
            resp_p2p["button_text1"] = "Confirm Release";
            resp_p2p["button_text2"] = "Raise Dispute";
          }
          resp_p2p["orderId"] = req.body.orderId;
          resp_p2p["p2porderId"] = getconfirmOrders._id;
          resp_p2p["ordertype"] = ordertype;
          resp_p2p["usertype"] = usertype;
          resp_p2p["timer_status"] = timer_status;
          console.log("timer_status===", timer_status);
          console.log("resp_p2p timer text===", resp_p2p["timer_text"]);

          return res.json({ status: true, response: resp_p2p });
        } else {
          return res.json({ status: true, Message: [] });
        }
      });
    } else {
      res.json({
        status: false,
        Message: "Invalid Order",
      });
    }
  } catch (err) {
    console.log("p2p_chat_view catch==", err);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/view_p2p_order", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    let getOrders = await p2pOrdersDB.findOne({ orderId: req.body.orderId });
    //let bank = await kyc.findOne({userId:ObjectId(getOrders.userId)});
    let bank = await bankdb.findOne({
      userid: ObjectId(getOrders.userId),
      Status: 1,
    });

    let userprofile = await usersDB.findOne({ _id: userId });
    // let updatechat = await notifyDB.updateMany(
    //   { status: 0, p2porderId: ObjectId(getOrders._id) },
    //   { $set: { status: 1 } }
    // );
    if (getOrders) {
      var ordertype = "";
      var button_content = "";
      var cancel_button = "";
      if (getOrders.orderType == "buy") {
        ordertype =
          userprofile._id.toString() == getOrders.userId.toString()
            ? "Buy"
            : "Sell";
      } else if (getOrders.orderType == "sell") {
        ordertype =
          userprofile._id.toString() == getOrders.userId.toString()
            ? "Sell"
            : "Buy";
      }
      var payment_method = "";
      if (getOrders.paymentMethod == "All payments") {
        payment_method = ["Bank Transfer", "UPI ID", "Paytm"];
      } else {
        payment_method = [getOrders.paymentMethod];
      }
      var currency_det = await currencyDB.findOne({
        currencySymbol: getOrders.firstCurrency,
      });
      var cancel_text = "";
      if (getOrders.status != "cancelled" || getOrders.status != "filled") {
        cancel_text = "Cancel";
      }
      var order_qty = +getOrders.totalAmount - +getOrders.processAmount;
      var p2p_obj = {
        _id: getOrders._id,
        orderId: getOrders.orderId,
        ordertype: ordertype,
        //quantity: getOrders.totalAmount + " " + getOrders.firstCurrency,
        quantity: order_qty + " " + getOrders.firstCurrency,
        price: getOrders.price + " " + getOrders.secondCurrnecy,
        payment_method: payment_method,
        image: currency_det.Currency_image,
        currency_symbol: currency_det.currencySymbol,
        created_time: moment(getOrders.createdAt).format("DD.MM.YYYY h:m a"),
        bank_details: bank,
        cancel_text: cancel_text,
      };
      return res.json({ status: true, Message: p2p_obj });
    } else {
      return res.json({ status: true, Message: [] });
    }
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.get("/app_p2p_history", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var processorders = await notifyDB
      .find({ to_user_id: userId })
      .sort({ _id: -1 })
      .exec();
    var process_orders = [];
    if (processorders.length > 0) {
      for (var i = 0; i < processorders.length; i++) {
        var obj = {
          date: moment(processorders[i].createdAt).format("lll"),
          from: processorders[i].from_user_name,
          message: processorders[i].message,
          orderid: processorders[i].link.split("/")[3],
        };
        process_orders.push(obj);
      }
    }
    var myorders = await p2pOrdersDB
      .find({ userId: userId })
      .sort({ _id: -1 })
      .exec();
    var my_orders = [];
    if (myorders.length > 0) {
      for (var i = 0; i < myorders.length; i++) {
        var obj = {
          date: moment(myorders[i].created_at).format("lll"),
          currency: myorders[i].firstCurrency,
          quantity: parseFloat(myorders[i].totalAmount).toFixed(8),
          price: myorders[i].price,
          ordertype: myorders[i].orderType == "buy" ? "Buy" : "Sell",
          status: myorders[i].status,
          orderid: myorders[i].orderId,
        };
        my_orders.push(obj);
      }
    }
    var myhistory = await p2pconfirmOrder
      .find({ $or: [{ map_userId: userId }, { userId: userId }] })
      .sort({ _id: -1 })
      .exec();
    var my_history = [];
    if (myhistory) {
      if (myhistory.length > 0) {
        for (var i = 0; i < myhistory.length; i++) {
          var type = "";
          if (myhistory[i].type == "buy") {
            type = myhistory[i].userId == userId ? "Sell" : "Buy";
          } else if (myhistory[i].type == "sell") {
            type = myhistory[i].userId == userId ? "Buy" : "Sell";
          }

          var status = "";
          if (myhistory[i].status == 0) {
            status = "Confirmed";
          }
          if (myhistory[i].status == 1) {
            status = "Paid";
          } else if (myhistory[i].status == 2) {
            status = "Completed";
          } else if (myhistory[i].status == 3) {
            status = "Cancelled";
          }

          var obj = {
            date: moment(myhistory[i].datetime).format("lll"),
            currency: myhistory[i].firstCurrency,
            quantity: parseFloat(myhistory[i].askAmount).toFixed(8),
            price: myhistory[i].askPrice,
            ordertype: type,
            status: status,
            orderid: myhistory[i].orderId,
          };

          my_history.push(obj);
        }
      }
    }
    if (process_orders && my_orders && my_history) {
      return res
        .status(200)
        .send({
          success: true,
          message: "Data Successfully retrieved",
          processorders: process_orders,
          myorders: my_orders,
          myhistory: my_history,
        });
    } else {
      return res
        .status(400)
        .send({ success: true, message: "Data Does Not retrieved" });
    }
  } catch (error) {
    console.log("ERROR FROM app_p2p_history::", error);
    return res.json({ status: false, Message: "Internal server error" });
  }
});

router.post("/fetch_p2pBalance", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var p2pbalance = "";
    var currency_det = await currencyDB.findOne({
      currencySymbol: req.body.fromCurrency,
    });
    common.getUserBalance(userId, currency_det._id, function (userBalance) {
      console.log("p2p balance response===", userBalance.totalBalance);
      if (userBalance != null) {
        p2pbalance = userBalance.totalBalance;
        return res.json({
          status: true,
          balance: parseFloat(p2pbalance).toFixed(8),
        });
      } else {
        return res.json({ status: true, Message: [] });
      }
    });
  } catch (error) {
    console.log("-=-errorerror=-=-=-", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post(
  "/cancel_confirmorder",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      var orderId = req.body.orderId;
      var ordertype = req.body.ordertype;
      var orderDetail = await p2pconfirmOrder.findOne({ orderId: orderId });

      if (orderDetail) {
        if (ordertype == "Buy") {
          let p2pconfirm = await p2pconfirmOrder.updateOne(
            { orderId: orderId },
            { $set: { dispute_status: 1, reason: "Seller not release the coin" } }
          );
          if (p2pconfirm) {
            return res.json({
              status: true,
              Message: "Timeout Dispute raised, Please release the coin",
            });
          } else {
            return res.json({
              status: false,
              Message: "Something went wrong, please try again",
            });
          }
        } else {
          var p2pdetail = await p2pOrdersDB.findOne({
            _id: ObjectId(orderDetail.p2p_orderId),
          });
          var processAmount = 0;
          processAmount = p2pdetail.processAmount - orderDetail.askAmount;
          processAmount = processAmount < 0 ? 0 : processAmount;
          console.log("processAmount====", processAmount);
          let p2pupdate = await p2pOrdersDB.updateOne(
            { _id: ObjectId(orderDetail.p2p_orderId) },
            { $set: { processAmount: processAmount, order_status: "pending" } }
          );
          console.log("p2pupdate====", p2pupdate);
          let p2pconfirm = await p2pconfirmOrder.updateOne(
            { orderId: orderId },
            { $set: { status: 3 } }
          );
          if (p2pupdate && p2pconfirm) {
            common.sendCommonSocket(
              "success",
              "ordercancel",
              "ordercancel",
              function () { }
            );
            return res.json({
              status: true,
              Message: "Timeout Order cancelled, Please try again",
            });
          } else {
            return res.json({
              status: false,
              Message: "Something went wrong, please try again",
            });
          }
        }
      } else {
        return res.json({ status: false, Message: "Invalid Order" });
      }
    } catch (error) {
      console.log("-=-errorerror=-=-=-", error);
      return res.json({
        status: false,
        Message: "Internal server error, Please try later!",
      });
    }
  }
);

module.exports = router;
