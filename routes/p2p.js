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
const usersDB = require("../schema/users");
const bankdb = require("../schema/bankdetails");
const p2pdispute = require("../schema/p2pdispute");
const p2pDisputeChatDB = require("../schema/disputeChat");
const AdminDB = require("../schema/admin");
const paymentMethod = require("../schema/paymentMethod");
const { RedisService } = require("../services/redis");
var mailtempDB = require("../schema/mailtemplate");
var mail = require("../helper/mailhelper");

//---------------------------Author Mugesh ------------------------------

router.get("/p2p_currencies", async (req, res) => {
  try {
    // Fetch active currencies with P2P status
    const currencies = await currencyDB
      .find(
        { status: "Active", p2p_status: "1" },
        {
          currencySymbol: 1,
          coinType: 1,
          currencyName: 1,
          Currency_image: 1,
          estimatedValueInUSDT: 1,
          _id: 1,
        }
      )
      .sort({ popularOrder: 1 });

    if (!currencies || currencies.length == 0) {
      return res
        .status(404)
        .json({ status: false, message: "No currencies found" });
    }

    return res.status(200).json({ status: true, data: currencies });
  } catch (err) {
    console.error("Error fetching currencies:", err);
    return res.status(500).json({
      status: false,
      message: "Something went wrong, please try again later",
    });
  }
});

// router.post("/fetch_price", common.tokenmiddleware, async (req, res) => {
//   try {
//     var firstCurrency = req.body.fromCurrency;
//     var secondCurrency = req.body.toCurrency;
//     var pair = firstCurrency + secondCurrency;
//     console.log("firstCurrency==", firstCurrency);
//     console.log("secondCurrency==", secondCurrency);
//     let currency_det = await currencyDB.findOne({
//       currencySymbol: firstCurrency,
//     });

//     let high = await p2pOrdersDB
//       .find({
//         status: { $in: ["filled"] },
//         firstCurrency: firstCurrency,
//         secondCurrnecy: secondCurrency,
//         orderType: "sell",
//       })
//       .sort({ price: -1 });
//     let low = await p2pOrdersDB
//       .find({
//         status: { $in: ["partially", "active"] },
//         firstCurrency: firstCurrency ? firstCurrency : "",
//         secondCurrnecy: secondCurrency ? secondCurrency : "",
//         orderType: "buy",
//       })
//       .sort({ price: 1 });

//     // Check if high array is not empty, then find the highest price, otherwise set to 0 or a default value
//     const highestPrice =
//       high && high.length > 0
//         ? high.reduce(
//           (max, order) => (order.price > max ? order.price : max),
//           high[0].price
//         )
//         : ""; // Default value if high array is empty

//     // Check if low array is not empty, then find the lowest price, otherwise set to 0 or a default value
//     const lowestPrice =
//       low && low.length > 0
//         ? low.reduce(
//           (min, order) => (order.price < min ? order.price : min),
//           low[0].price
//         )
//         : ""; // Default value if low array is empty

//     // Prepare the response
//     var resp = {
//       highprice: highestPrice,
//       lowprice: lowestPrice,
//       firstCurrency: firstCurrency,
//       secondCurrency: secondCurrency,
//     };

//     // Return the response as JSON
//     return res.json({ status: true, data: resp });

//     //}
//   } catch (error) {
//     console.log("catch error===", error);
//     return res.json({ status: false, message: error.message });
//   }
// });

const getCurrencyConversion = async () => {
  try {
    const allPairsRaw = await RedisService.hget("CurrencyConversion", "allpair"); // If Redis v4+
    console.log("allPairsRaw====",allPairsRaw);

    return allPairsRaw;
  } catch (error) {
    console.error("Error fetching currency conversion from Redis:", error.message);
    throw error;
  }
};

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
    const highestPrice =
      high && high.length > 0
        ? high.reduce(
            (max, order) => (order.price > max ? order.price : max),
            high[0].price
          )
        : ""; // Default value if high array is empty

    // Check if low array is not empty, then find the lowest price, otherwise set to 0 or a default value
    const lowestPrice =
      low && low.length > 0
        ? low.reduce(
            (min, order) => (order.price < min ? order.price : min),
            low[0].price
          )
        : ""; // Default value if low array is empty

    const allPairs = await getCurrencyConversion();

    console.log("allPairs=====",allPairs);

    if (!allPairs || !allPairs[firstCurrency]) {
      console.log("prices not found");
      return null;
    }

    const currency_prices = allPairs[firstCurrency]; // { BTC: x, USDT: y, INR: z, EUR: k }
    

    // Prepare the response
    var resp = {
      highprice: highestPrice,
      lowprice: lowestPrice,
      firstCurrency: firstCurrency,
      secondCurrency: secondCurrency,
      price: (currency_prices != null) ? parseFloat(currency_prices[secondCurrency]).toFixed(2) : 0
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
      requirements
    } = req.body;

    // Check if all required fields are present
    if (
      !quantity ||
      !price ||
      !minQuantity ||
      !maxQuantity ||
      !cryptoCurrency ||
      !fiatCurrency ||
      !preferredPayment ||
      !paymentTime
    ) {
      return res.json({
        status: false,
        Message: "Please provide all fields",
        bank: false,
      });
    }

    const userKyc = await usersDB.findOne({ _id: req.userId });
    if (userKyc.kycstatus != 1) {
      return res.json({
        status: false,
        Message: "Please verify your identification before proceed"
      });
    }

    let bankData;
    if (preferredPayment === "All Payment") {
      // Fetch all bank data types
      const bankTypes = ["IMPS", "UPID", "Paytm"];
      bankData = await Promise.all(
        bankTypes.map((type) => bankdb.find({ userid: req.userId, type }))
      );

      if (bankData.some((data) => !data || data.length === 0)) {
        return res.json({
          status: false,
          Message: `Please update your payment details.`,
          bank: true,
        });
      }
    } else {
      bankData = await bankdb.findOne({
        userid: req.userId,
        type: preferredPayment,
      });
      if (!bankData) {
        return res.json({
          status: false,
          Message: `Please update your ${preferredPayment} details.`,
          bank: true,
        });
      }
    }

    const userDetail = await usersDB.findOne(
      { _id: req.userId },
      { email: 1, displayname: 1 }
    );
    const newOrder = {
      userId: req.userId,
      email: common.decrypt(userDetail.email),
      displayname: userDetail.displayname,
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
      requirements: requirements
    };

    if (orderType === "sell") {
      const userBalance = await common.getUserP2PBalance(
        req.userId,
        fromcurrency
      );
      if (userBalance && userBalance.totalBalance >= quantity) {
        const updateAmount = Math.max(userBalance.totalBalance - quantity, 0);
        const updateHoldAmount = Math.max(
          userBalance.balanceHoldTotal + quantity,
          0
        );

        const savedOrder = await p2pOrdersDB.create(newOrder);
        if (savedOrder) {
          const balanceUpdate = await common.updateUserP2PBalances(
            req.userId,
            fromcurrency,
            updateAmount,
            userBalance.totalBalance,
            savedOrder._id,
            "sell"
          );
          if (balanceUpdate && balanceUpdate.nModified === 1) {
            // await common.updateHoldAmount(
            //   req.userId,
            //   fromcurrency,
            //   updateHoldAmount
            // );
            await common.updatep2pHoldAmount(
              req.userId,
              fromcurrency,
              updateHoldAmount
            );
            return res.json({
              status: true,
              Message: "Your P2P order placed successfully",
              orderId: savedOrder.orderId,
            });
          }
        }
      } else {
        return res.json({
          status: false,
          Message: "Insufficient Balance",
          bank: false,
        });
      }
    } else {
      const savedOrder = await p2pOrdersDB.create(newOrder);
      if (savedOrder) {
        return res.json({
          status: true,
          Message: "Your P2P order placed successfully",
          orderId: savedOrder.orderId,
        });
      }
    }

    return res.json({
      status: false,
      Message: "Please try again later!",
      bank: false,
    });
  } catch (error) {
    console.error("Error in postAddOrder API:", error);
    return res.send({
      success: false,
      Message: "Something went wrong",
      bank: false,
    });
  }
});

router.post("/p2p_get_order", common.tokenmiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    // Validate input
    if (!orderId) {
      return res.status(400).json({
        status: false,
        Message: "Order ID is required.",
      });
    }

    const getOrders = await p2pOrdersDB
      .findOne({ orderId })
      .populate("userId", "displayname profile_image");

    if (!getOrders) {
      return res.json({ status: true, Message: [] });
    }

    const completed_trades = await p2pOrdersDB.countDocuments({
      userId: ObjectId(getOrders.userId._id),
      status: "filled",
    });

    const filled_trades = await p2pOrdersDB.countDocuments({
      status: "filled",
    });

    const rating =
      filled_trades > 0 ? (completed_trades / filled_trades) * 100 : 0;

    const userprofile = await usersDB.findOne({
      _id: ObjectId(getOrders.userId._id),
    });

    const ordertype = getOrders.orderType === "buy" ? "Sell" : "Buy";

    const payment_method =
      getOrders.paymentMethod === "All payments"
        ? ["Bank Transfer", "UPI ID", "Paytm"]
        : [getOrders.paymentMethod];

    const order_qty = getOrders.totalAmount - getOrders.processAmount;

    const userId = req.userId;

    const userBalance = await common.getUserBalance(
      userId,
      getOrders.fromCurrency
    );
    const p2pbalance = userBalance ? userBalance.totalBalance : 0;

    const p2p_obj = {
      _id: getOrders._id,
      orderId: getOrders.orderId,
      ordertype,
      quantity: `${order_qty} ${getOrders.firstCurrency}`,
      price: `${getOrders.price} ${getOrders.secondCurrnecy}`,
      payment_method,
      currency_symbol: getOrders.firstCurrency,
      displayname: userprofile.displayname,
      profile_image:
        "https://res.cloudinary.com/dxknk0rio/image/upload/v1706862985/awdp1sb3w6sntctxfsor.png",
      p2pbalance,
      orders_count: completed_trades,
      rating: parseFloat(rating).toFixed(2),
      firstCurrency: getOrders.firstCurrency,
      secondCurrency: getOrders.secondCurrnecy,
      fromLimit: getOrders.fromLimit,
      toLimit: getOrders.toLimit,
      orderPrice: getOrders.price,
      available_qty: order_qty,
      user_id: common.encrypt(getOrders.userId._id.toString()),
      status: getOrders.status
    };

    return res.json({ status: true, Message: p2p_obj });
  } catch (error) {
    console.error("Error in p2p_get_order:", error);
    return res.status(500).json({
      status: false,
      Message: "Internal server error. Please try again later.",
    });
  }
});

// router.post("/bankdetails", common.tokenmiddleware, async (req, res) => {
//   try {
//     const {
//       name,
//       accountNumber,
//       bankName,
//       branch,
//       upid,
//       paytm,
//       ifsc,
//       QRcode,
//       type,
//       accountType,
//     } = req.body;

//     console.log(req.userId, "req.userId");

//     // Check if the user already has bank details
//     let existingBankDetails = await bankdb
//       .findOne({ userid: req.userId })
//       .lean()
//       .exec();
//     let status = !existingBankDetails;

//     const bankDetailsObj = {
//       Accout_HolderName: name,
//       Account_Number: accountNumber,
//       Bank_Name: bankName,
//       Branch_Name: branch,
//       Upid_ID: upid,
//       Paytm_ID: paytm,
//       IFSC_code: ifsc,
//       QRcode: QRcode,
//       userid: req.userId,
//       type: type,
//       Account_Type: accountType,
//       Status: status,
//     };

//     // If bank details exist, update them; otherwise, create new entry
//     let bankDetailsResponse;

//     bankDetailsResponse = await bankdb.create(bankDetailsObj);

//     if (bankDetailsResponse) {
//       return res.json({
//         status: true,
//         Message: "Bank details updated successfully!",
//       });
//     } else {
//       return res.status(500).json({
//         status: false,
//         Message: "Failed to update bank details.",
//       });
//     }
//   } catch (error) {
//     console.error(error, "Error updating bank details");
//     return res.status(500).json({
//       status: false,
//       Message: "Internal server error",
//       code: 500,
//     });
//   }
// });

router.post("/bankdetails", common.tokenmiddleware, async (req, res) => {
  try {
    const {
      name,
      accountNumber,
      bankName,
      // Paymentmethod_name,
      Currency,
      type
    } = req.body;

    console.log(req.userId, "req.userId");

    // Check if the user already has bank details
    let existingBankDetails = await bankdb
      .findOne({ userid: req.userId })
      .lean()
      .exec();
    let status = !existingBankDetails;

    const bankDetailsObj = {
      Accout_HolderName: name,
      Account_Number: accountNumber,
      Bank_Name: bankName,
      //Paymentmethod_name: Paymentmethod_name,
      Currency: Currency,
      userid: req.userId,
      Status: status,
      type: type
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
});

// router.get("/Get_bankdetails", common.tokenmiddleware, async (req, res) => {
//   try {
//     const getBankDetails = await bankdb
//       .find(
//         { userid: req.userId },
//         {
//           Accout_HolderName: 1,
//           Account_Number: 1,
//           Account_Type: 1,
//           Bank_Name: 1,
//           Branch_Name: 1,
//           Upid_ID: 1,
//           Paytm_ID: 1,
//           IFSC_code: 1,
//           QRcode: 1,
//           type: 1,
//           _id: 1,
//         }
//       )
//       .sort({ _id: -1 });

//     if (getBankDetails && getBankDetails.length > 0) {
//       return res.json({
//         status: true,
//         message: "Bank details retrieved successfully",
//         data: getBankDetails,
//       });
//     } else {
//       return res.json({
//         status: false,
//         message: "No bank details found",
//         data: [],
//       });
//     }
//   } catch (error) {
//     console.error("Error retrieving bank details:", error);
//     return res.status(500).json({
//       status: false,
//       message: "Internal server error",
//       code: 500,
//     });
//   }
// });


router.get("/Get_bankdetails", common.tokenmiddleware, async (req, res) => {
  try {
    const getBankDetails = await bankdb
      .find(
        { userid: req.userId },
        {
          Accout_HolderName: 1,
          Account_Number: 1,
          Bank_Name: 1,
          Paymentmethod_name: 1,
          Currency: 1,
          type: 1,
          _id: 1,
        }
      )
      .sort({ _id: -1 });

    if (getBankDetails && getBankDetails.length > 0) {
      return res.json({
        status: true,
        message: "Bank details retrieved successfully",
        data: getBankDetails,
      });
    } else {
      return res.json({
        status: false,
        message: "No bank details found",
        data: [],
      });
    }
  } catch (error) {
    console.error("Error retrieving bank details:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      code: 500,
    });
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
    let remainingBanks = await bankdb.find({
      userid: mongoose.Types.ObjectId(req.userId),
    });

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
      Account_Type: reqbody.accountType,
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

router.post("/getAllp2pOrder", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const getOrders = await p2pOrdersDB
      .find({
        status: { $in: ["active", "partially"] },
        userId: { $ne: userId },
      })
      .populate("userId", "displayname profile_image location ratings")
      .sort({ createdAt: -1 })
      .exec();

    console.log(getOrders, "getOrders");

    if (!getOrders.length) {
      return res.json({ status: true, Message: [] });
    }

    const p2p_list = await Promise.all(
      getOrders.map(async (order) => {
        if (!order.userId) return null;

        const userId = ObjectId(order.userId._id);

        // Fetch completed trades and filled trades
        const [completed_trades, filled_trades] = await Promise.all([
          p2pOrdersDB.countDocuments({ userId, status: "filled" }),
          p2pOrdersDB.countDocuments({ status: "filled" }),
        ]);

        const rating =
          filled_trades > 0 ? (completed_trades / filled_trades) * 100 : 0;
        const available_qty =
          parseFloat(order.totalAmount) - parseFloat(order.processAmount);
        
        const sellerId = ObjectId(order.userId._id);

        // *** 1️⃣ TOTAL TRADES (FILLED + PARTIALLY) ***
        const total_trades = await p2pOrdersDB.countDocuments({
          userId: sellerId,
          status: { $in: ["filled", "partially"] },
        });

        // *** 2️⃣ STAR RATING AVERAGE ***
        let avgStar = 0;
        if (order.userId.ratings && order.userId.ratings.length > 0) {
          const totalStars = order.userId.ratings.reduce(
            (sum, obj) => sum + (obj.stars || 0),
            0
          );
          avgStar = totalStars / order.userId.ratings.length;
          avgStar = parseFloat(avgStar.toFixed(1)); // round to 1 decimal
        }

        if (available_qty > 0) {
          return {
            orderId: order.orderId,
            totalAmount: order.totalAmount,
            processAmount: order.processAmount,
            firstCurrency: order.firstCurrency,
            secondCurrency: order.secondCurrnecy,
            displayname: order.userId.displayname || "Unknown",
            price: parseFloat(order.price).toFixed(2),
            fromLimit: order.fromLimit,
            toLimit: order.toLimit,
            paymentMethod: order.paymentMethod,
            orderType: order.orderType,
            trades: total_trades,
            stars: avgStar,
            orders_count: completed_trades,
            rating,
            location: order.userId.location || "India",
            profile_image:
              order.userId.profile_image ||
              "https://res.cloudinary.com/dxknk0rio/image/upload/v1706862985/awdp1sb3w6sntctxfsor.png",
            user_id: common.encrypt(userId.toString()),
            available_qty: available_qty.toFixed(8),
            pay_duration: order.pay_time,
            date: order.createdAt,
            requirements: order.requirements,
          };
        }

        return null;
      })
    );

    console.log(p2p_list, "p2p_list");


    // Filter out any null values from the list
    const filteredP2pList = p2p_list.filter(Boolean);

    return res.json({ status: true, Message: filteredP2pList });
  } catch (error) {
    console.error("Error in fetching P2P Orders:", error);
    return res.status(500).json({
      status: false,
      Message: "Internal server error, please try later!",
    });
  }
});

router.post("/getAllp2pOrderbefore", async (req, res) => {
  try {
    const getOrders = await p2pOrdersDB
      .find({ status: { $in: ["active", "partially"] } })
      .populate("userId", "displayname profile_image location ratings")
      .sort({ createdAt: -1 })
      .exec();

    console.log(getOrders, "getOrders");

    if (!getOrders.length) {
      return res.json({ status: true, Message: [] });
    }

    const p2p_list = await Promise.all(
      getOrders.map(async (order) => {
        if (!order.userId) return null;

        const userId = ObjectId(order.userId._id);

        // Fetch completed trades and filled trades
        const [completed_trades, filled_trades] = await Promise.all([
          p2pOrdersDB.countDocuments({ userId, status: "filled" }),
          p2pOrdersDB.countDocuments({ status: "filled" }),
        ]);

        const rating =
          filled_trades > 0 ? (completed_trades / filled_trades) * 100 : 0;
        const available_qty =
          parseFloat(order.totalAmount) - parseFloat(order.processAmount);

        const sellerId = ObjectId(order.userId._id);

        // *** 1️⃣ TOTAL TRADES (FILLED + PARTIALLY) ***
        const total_trades = await p2pOrdersDB.countDocuments({
          userId: sellerId,
          status: { $in: ["filled", "partially"] },
        });

        // *** 2️⃣ STAR RATING AVERAGE ***
        let avgStar = 0;
        if (order.userId.ratings && order.userId.ratings.length > 0) {
          const totalStars = order.userId.ratings.reduce(
            (sum, obj) => sum + (obj.stars || 0),
            0
          );
          avgStar = totalStars / order.userId.ratings.length;
          avgStar = parseFloat(avgStar.toFixed(1)); // round to 1 decimal
        }

        if (available_qty > 0) {
          return {
            orderId: order.orderId,
            totalAmount: order.totalAmount,
            processAmount: order.processAmount,
            firstCurrency: order.firstCurrency,
            secondCurrency: order.secondCurrnecy,
            displayname: order.userId.displayname || "Unknown",
            price: parseFloat(order.price).toFixed(2),
            fromLimit: order.fromLimit,
            toLimit: order.toLimit,
            paymentMethod: order.paymentMethod,
            orderType: order.orderType,
            trades: total_trades,
            stars: avgStar,
            orders_count: completed_trades,
            rating,
            location: order.userId.location || "India",
            profile_image:
              order.userId.profile_image ||
              "https://res.cloudinary.com/dxknk0rio/image/upload/v1706862985/awdp1sb3w6sntctxfsor.png",
            user_id: common.encrypt(userId.toString()),
            available_qty: available_qty.toFixed(8),
            pay_duration: order.pay_time,
            requirements: order.requirements,
          };
        }
        return null;
      })
    );

    console.log(p2p_list, "p2p_list");


    // Filter out any null values from the list
    const filteredP2pList = p2p_list.filter(Boolean);

    return res.json({ status: true, Message: filteredP2pList });
  } catch (error) {
    console.error("Error in fetching P2P Orders:", error);
    return res.status(500).json({
      status: false,
      Message: "Internal server error, please try later!",
    });
  }
});

router.post("/buyer_pay_cancel", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const orderId = req.body.orderId;

    // Input validation
    if (!orderId) {
      return res.json({ status: false, Message: "Order ID is required" });
    }

    const orderDetail = await p2pconfirmOrder.findOne({ orderId });

    console.log(orderDetail, "to_user");


    if (!orderDetail) {
      return res.json({ status: false, Message: "Invalid Order" });
    }

    const p2pdetail = await p2pOrdersDB.findOne({ _id: ObjectId(orderDetail.p2p_orderId) });
    let processAmount = Math.max(0, p2pdetail.processAmount - orderDetail.askAmount);
    console.log(p2pdetail, "to_user", processAmount);

    const p2pUpdate = await p2pOrdersDB.updateOne(
      { _id: ObjectId(orderDetail.p2p_orderId) },
      { $set: { processAmount, order_status: "pending" } }
    );

    console.log(p2pUpdate, "to_user");


    const p2pConfirm = await p2pconfirmOrder.updateOne(
      { orderId },
      { $set: { status: 3 } }
    );
    console.log(p2pConfirm, "to_user");

    if (orderDetail.hold_userId != null) {
      let p2p_balance = await common.getUserP2PBalance(orderDetail.hold_userId, p2pdetail.fromCurrency);
      let p2pbalance = p2p_balance.totalBalance;

      let hold_balance = p2p_balance.balanceHoldTotal;
      let escrew_amount = +hold_balance - +orderDetail.askAmount;
      escrew_amount = (+escrew_amount > 0) ? +escrew_amount : 0;

      let balance_amount = +p2pbalance + +orderDetail.askAmount;

      const balanceUpdate = await common.updateUserP2PBalances(
        orderDetail.hold_userId,
        p2pdetail.fromCurrency,
        balance_amount,
        p2pbalance,
        orderDetail._id,
        "sell"
      );

      const updateholdbalance = await common.updatep2pHoldAmount(
        orderDetail.hold_userId,
        p2pdetail.fromCurrency,
        escrew_amount
      );
    }


    if (p2pUpdate.nModified > 0 && p2pConfirm) {
      const from_user = await usersDB.findOne({ _id: ObjectId(userId) }, { displayname: 1 });
      const to_userId = userId.toString() === orderDetail.map_userId.toString() ? orderDetail.userId : orderDetail.map_userId;

      console.log(from_user, to_userId);

      const to_user = await usersDB.findOne(
        { _id: to_userId },
        { email: 1, displayname: 1 }
      );

      console.log(to_user, "to_user");


      const notificationMessage = `${from_user.displayname} has cancelled the order for ${orderDetail.askAmount} ${p2pdetail.firstCurrency} ${p2pdetail.orderType} order`;
      console.log(notificationMessage, "to_user");

      const notification = await notifyDB.create({
        from_user_id: ObjectId(userId),
        to_user_id: ObjectId(to_user._id),
        p2porderId: ObjectId(p2pdetail._id),
        from_user_name: from_user.displayname,
        to_user_name: to_user.displayname,
        status: 0,
        type: "p2p",
        message: notificationMessage,
        link: `/p2p/chat/${orderDetail.orderId}`,
      });

      console.log(notification, "notification");

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

    }
    // } else {
    //   return res.json({
    //     status: false,
    //     Message: "Something went wrong, please try again",
    //   });
    // }
  } catch (error) {
    console.error("Error in buyer_pay_cancel:", error);
    return res.json({
      status: false,
      Message: "Internal server error, Please try later!",
    });
  }
});

router.post("/getp2pnotification", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.body; // default page is 1 and limit is 5
    const skip = (page - 1) * limit;

    const notifications = await notifyDB
      .find(
        { to_user_id: req.userId, type: "p2p" },
        { to_user_id: 0, from_user_id: 0 }
      )
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    console.log(notifications, "Fetched P2P notifications");

    const totalNotifications = await notifyDB.countDocuments({
      to_user_id: req.userId,
      type: "p2p",
    });

    // Update notification status only if there are notifications
    if (notifications.length > 0) {
      await notifyDB.updateMany(
        { status: 0, to_user_id: req.userId },
        { $set: { status: 1 } }
      );

      return res.status(200).json({
        success: true,
        message: "Data successfully retrieved",
        data: notifications,
        total: totalNotifications,
      });
    }

    return res.status(200).json({
      success: false,
      message: "No notifications found",
      data: [],
    });
  } catch (error) {
    console.error("Error in getp2pnotification:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/p2p_confirm_order", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId, qty, paymentMethod } = req.body;

    const userKyc = await usersDB.findOne({ _id: req.userId });
    if (userKyc.kycstatus != 1) {
      return res.json({
        status: false,
        Message: "Please verify your identification before proceed"
      });
    }

    if (!orderId || !qty) {
      return res.json({
        status: false,
        Message: "Order ID and quantity are required.",
      });
    }

    const p2pdet = await p2pOrdersDB.findOne({ orderId });
    if (!p2pdet) {
      return res.json({ status: false, Message: "Invalid request" });
    }

    // console.log(p2pdet,"-----p2pdet--processAmount--",p2pdet.totalAmount,p2pdet.processAmount);

    let processAmount = parseFloat(
      (p2pdet.totalAmount - p2pdet.processAmount).toFixed(8)
    );

    // console.log(processAmount,"-----processAmount----",);
    // console.log(qty,"----qty----");

    if (processAmount < +qty) {
      return res.json({
        status: false,
        Message: `Please enter quantity less than or equal to ${processAmount}`,
      });
    }

    const filled = p2pdet.filledAmount - +qty;
    const confirmOrder = {
      map_orderId: orderId,
      map_userId: ObjectId(userId),
      p2p_orderId: ObjectId(p2pdet._id),
      fromCurrency: p2pdet.firstCurrency,
      toCurrency: p2pdet.secondCurrnecy,
      askAmount: qty,
      askPrice: p2pdet.price,
      type: "buy",
      paymentMethod,
      filledAmount: filled,
      userId: ObjectId(p2pdet.userId),
      orderId: uid.randomUUID(6).toLowerCase(),
      firstCurrency: p2pdet.fromCurrency,
      secondCurrency: p2pdet.toCurrency,
    };

    // console.log("confirmOrder==", confirmOrder);
    const confirmation = await p2pconfirmOrder.create(confirmOrder);

    if (!confirmation) {
      console.log("confirmOrder error==");
      return res.json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }

    await p2pOrdersDB.updateOne(
      { _id: ObjectId(p2pdet._id) },
      {
        $set: {
          processAmount: p2pdet.processAmount + +qty,
          order_status: "processing",
        },
      }
    );

    const from_user = await usersDB.findOne(
      { _id: ObjectId(userId) },
      { displayname: 1 }
    );
    const to_user = await usersDB.findOne(
      { _id: ObjectId(p2pdet.userId) },
      { displayname: 1 }
    );

    const notificationMessage = `${from_user.displayname} has confirmed the order for ${confirmation.askAmount} ${p2pdet.firstCurrency} ${p2pdet.orderType} order`;
    const notification = {
      from_user_id: ObjectId(userId),
      to_user_id: ObjectId(to_user._id),
      p2porderId: ObjectId(p2pdet._id),
      from_user_name: from_user.displayname,
      to_user_name: to_user.displayname,
      status: 0,
      type: "p2p",
      message: notificationMessage,
      link: "/p2p/chat/" + confirmation.orderId,
    };

    await notifyDB.create(notification);
    common.sendResponseSocket(
      "success",
      notification.message,
      "notify",
      notification.to_user_id,
      () => { }
    );

    // Create chat records for both users
    const chatMessages = [
      {
        userId: ObjectId(to_user._id),
        user_name: to_user.displayname,
        user_msg:
          "Important: Please DO NOT share payment proof or communicate with counterpart outside the Pitiklini P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
        type: "advertiser",
      },
      {
        userId: ObjectId(userId),
        user_name: from_user.displayname,
        user_msg:
          "Do not release the crypto until you receive payment from buyer",
        type: "advertiser",
      },
    ];

    for (const chatMessage of chatMessages) {
      const newChat = {
        ...chatMessage,
        p2porderId: ObjectId(confirmation._id),
        orderId: confirmation.orderId,
        user_date: Date.now(),
        default: 1,
      };
      await p2pChatDB.create(newChat);
    }

    res.json({
      status: true,
      Message: "Order Confirmed Successfully",
      link: "/p2p/chat/" + confirmation.orderId,
    });
  } catch (e) {
    console.log("confirmOrder catch==", e);
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
            const sellBalance = await common.getUserP2PBalance(
              userId,
              p2pdet.fromCurrency
            );

            console.log(sellBalance, "innjernkdnkdwnkwenmew");

            if (sellBalance != null) {
              var selluserBalanceTotal = sellBalance.totalBalance;
              var sellholdTotal = sellBalance.balanceHoldTotal;
              console.log("sell user balance===", selluserBalanceTotal);
              console.log("sell p2p confirm amount===", p2pconfirm.askAmount);
              console.log("sell sellholdTotal===", sellholdTotal);
              // if (+selluserBalanceTotal >= +p2pconfirm.askAmount) {
              // var deductAmount = selluserBalanceTotal - p2pconfirm.askAmount;
              // deductAmount > 0 ? deductAmount : 0;
              // console.log("sell p2p deductAmount amount===", deductAmount);
              // console.log("sell p2p userid===", userId);
              // const deductbalance = await common.updateUserP2PBalances(
              //   userId,
              //   p2pdet.fromCurrency,
              //   deductAmount,
              //   selluserBalanceTotal,
              //   p2pdet._id,
              //   "sell"
              // );

              // if (deductbalance) {
              var updateHold = sellholdTotal - p2pconfirm.askAmount;
              updateHold = updateHold > 0 ? updateHold : 0;
              common.updatep2pHoldAmount(
                userId,
                p2pdet.fromCurrency,
                updateHold,
                function (hold) { }
              );
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
                {
                  $set: {
                    status: status,
                    filledAmount: remaining_amount,
                  },
                },
                { new: true }
              );
              if (confirmation) {
                const userBalance = await common.getUserP2PBalance(
                  confirmation.userId,
                  confirmation.firstCurrency
                );

                if (userBalance != null) {
                  var userBalanceTotal = userBalance.totalBalance;
                  console.log("buy user balance====", userBalanceTotal);
                  console.log(
                    "buy p2pconfirm balance====",
                    p2pconfirm.askAmount
                  );
                  var updateAmount =
                    userBalanceTotal + p2pconfirm.askAmount;
                  updateAmount > 0 ? updateAmount : 0;
                  console.log("buy updateAmount====", updateAmount);

                  common.updateUserP2PBalances(
                    confirmation.userId,
                    confirmation.firstCurrency,
                    updateAmount,
                    userBalanceTotal,
                    p2pdet._id,
                    "sell"
                  );

                  let from_user = await usersDB.findOne(
                    { _id: ObjectId(userId) },
                    { displayname: 1 , email: 1 }
                  );
                  let to_user = await usersDB.findOne(
                    {
                      _id: ObjectId(confirmation.map_userId),
                    },
                    { displayname: 1 }
                  );
                  var opp_detail = "";
                  if (
                    userId.toString() == confirmation.map_userId.toString()
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
                    type: "p2p",
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
                  if (notification != null) {
                    common.sendResponseSocket(
                      "success",
                      notification.message,
                      "notify",
                      notification.to_user_id,
                      function () { }
                    );
                    let resData = await mailtempDB.findOne({
                      key: "seller_coin_confirm",
                    });
                    if (resData) {
                      var reciver = common.decrypt(opp_detail.email);
                      var etempdataDynamic = resData.body
                        .replace(/###MESSAGE###/g, obj.message)
                        .replace(/###USERNAME###/g, opp_detail.displayname);
                      var mailRes = await mail.sendMail({
                        from: {
                          name: process.env.FROM_NAME,
                          address: process.env.FROM_EMAIL,
                        },
                        to: reciver,
                        subject: resData.Subject,
                        html: etempdataDynamic,
                      });
                    }
                    return res.json({
                      status: true,
                      Message: "Crypto Released Successfully",
                    });
                  }
                }
              } else {
                res.json({
                  status: false,
                  Message: "Something went wrong, Please try again",
                });
              }
              //  }
              // } else {
              //   res.json({ status: false, Message: "Insufficient Balance" });
              // }
            } else {
              res.json({
                status: false,
                Message: "Something went wrong, Please try again",
              });
            }
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
            const sellBalance = await common.getUserP2PBalance(
              confirmation.userId,
              p2pdet.fromCurrency
            );

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
                const userBalance = await common.getUserP2PBalance(
                  confirmation.map_userId,
                  confirmation.firstCurrency
                );

                if (userBalance != null) {
                  var userBalanceTotal = userBalance.totalBalance;
                  console.log("buyer balance====", userBalanceTotal);
                  var updateAmount = userBalanceTotal + confirmation.askAmount;
                  updateAmount > 0 ? updateAmount : 0;
                  console.log("buyer updateAmount====", updateAmount);
                  console.log("buyer userid====", confirmation.map_userId);
                  common.updateUserP2PBalances(
                    confirmation.map_userId,
                    confirmation.firstCurrency,
                    updateAmount,
                    userBalanceTotal,
                    p2pdet._id,
                    "sell"
                  );

                  let from_user = await usersDB.findOne(
                    { _id: ObjectId(userId) },
                    { displayname: 1, email: 1 }
                  );
                  let to_user = await usersDB.findOne(
                    { _id: ObjectId(confirmation.map_userId) },
                    { displayname: 1 }
                  );
                  var opp_detail = "";
                  if (userId.toString() == confirmation.map_userId.toString()) {
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
                    type: "p2p",
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
                  if (notification != null) {
                    common.sendResponseSocket(
                      "success",
                      notification.message,
                      "notify",
                      notification.to_user_id,
                      function () { }
                    );

                     let resData = await mailtempDB.findOne({
                      key: "seller_coin_confirm",
                    });
                    if (resData) {
                      var reciver = common.decrypt(opp_detail.email);
                      var etempdataDynamic = resData.body
                        .replace(/###MESSAGE###/g, obj.message)
                        .replace(/###USERNAME###/g, opp_detail.displayname);
                      var mailRes = await mail.sendMail({
                        from: {
                          name: process.env.FROM_NAME,
                          address: process.env.FROM_EMAIL,
                        },
                        to: reciver,
                        subject: resData.Subject,
                        html: etempdataDynamic,
                      });
                    }
                    return res.json({
                      status: true,
                      Message: "Crypto Released Successfully",
                    });
                  }
                }
              } else {
                res.json({
                  status: false,
                  Message: "Something went wrong, Please try again",
                });
              }
            }
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

router.post(
  "/p2p_confirm_sellorder",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { orderId, qty, paymentMethod } = req.body;
      var bodyData = req.body;

      const userKyc = await usersDB.findOne({ _id: req.userId });
      if (userKyc.kycstatus != 1) {
        return res.json({
          status: false,
          Message: "Please verify your identification before proceed"
        });
      }


      if (!orderId) {
        return res
          .status(400)
          .json({ status: false, Message: "Invalid request" });
      }

      const p2pdet = await p2pOrdersDB.findOne({ orderId });
      if (!p2pdet) {
        return res
          .status(404)
          .json({ status: false, Message: "Invalid request" });
      }


      let bankData;
      if (paymentMethod === "All Payment") {
        // Fetch all bank data types
        const bankTypes = ["IMPS", "UPID", "Paytm"];
        bankData = await Promise.all(
          bankTypes.map((type) => bankdb.find({ userid: req.userId, type }))
        );

        if (bankData.some((data) => !data || data.length === 0)) {
          return res.json({
            status: false,
            Message: `Please update your payment details.`,
            bank: true,
          });
        }
      } else {
        bankData = await bankdb.findOne({
          userid: req.userId,
          type: paymentMethod,
        });
        if (!bankData) {
          return res.json({
            status: false,
            Message: `Please update your ${paymentMethod} details.`,
            bank: true,
          });
        }
      }

      const processAmount1 = parseFloat(
        (p2pdet.totalAmount - p2pdet.processAmount).toFixed(8)
      );
      if (processAmount1 >= +bodyData.qty) {
        let p2p_balance = await common.getUserP2PBalance(userId, p2pdet.fromCurrency);
        if (+p2p_balance.totalBalance >= +bodyData.qty) {
          var filled = p2pdet.filledAmount - +bodyData.qty;
          const confirmOrder = {
            map_orderId: bodyData.orderId,
            map_userId: ObjectId(userId),
            p2p_orderId: ObjectId(p2pdet._id),
            fromCurrency: p2pdet.firstCurrency,
            toCurrency: p2pdet.secondCurrnecy,
            askAmount: bodyData.qty,
            paymentMethod: req.body.paymentMethod,
            askPrice: p2pdet.price,
            type: "sell",
            filledAmount: filled,
            userId: ObjectId(p2pdet.userId),
            orderId: uid.randomUUID(6).toLowerCase(),
            firstCurrency: p2pdet.fromCurrency,
            secondCurrency: p2pdet.toCurrency,
            hold_userId: ObjectId(userId),
          };
          console.log("confirmOrder==", confirmOrder);
          let confirmation = await p2pconfirmOrder.create(confirmOrder);
          var processAmount = 0;
          processAmount = p2pdet.processAmount + +bodyData.qty;
          let p2pUpdate = await p2pOrdersDB.updateOne(
            { _id: ObjectId(p2pdet._id) },
            {
              $set: {
                processAmount: processAmount,
                order_status: "processing",
              },
            }
          );
          if (confirmation) {

            let p2pbalance = p2p_balance.totalBalance;
            let balance_amount = +p2pbalance - +bodyData.qty;
            balance_amount = (balance_amount > 0) ? balance_amount : 0;

            const balanceUpdate = await common.updateUserP2PBalances(
              userId,
              p2pdet.fromCurrency,
              balance_amount,
              p2pbalance,
              confirmation._id,
              "sell"
            );

            let hold_balance = p2p_balance.balanceHoldTotal;
            let escrew_amount = +hold_balance + +bodyData.qty;
            const updateholdbalance = await common.updatep2pHoldAmount(
              userId,
              p2pdet.fromCurrency,
              escrew_amount
            );


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
              type: "p2p",
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
                "Important: Please DO NOT share payment proof or communicate with counter part outside the Pitiklini P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
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
              user_name: to_user.displayname,
              user_msg:
                "Important: Please DO NOT share payment proof or communicate with counter part outside the Pitiklini P2P platform to avoid scam. Payment proof shared outside the P2P platform can be misused. Any P2P related conversations should be carried out only in the order chat",
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
              if(getChat != null)
              {
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
              if(getChat != null)
              {
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
              if(getChat != null)
              {
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
              if(getChat != null)
              {
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
        }
        else {
          res.json({
            status: false,
            Message:
              "Insufficient Balance",
          });
        }

      } else {
        res.json({
          status: false,
          Message:
            "Please enter quantity less than or equal to " + processAmount,
        });
      }
    } catch (error) {
      console.error("confirmOrder error:", error);
      res.status(500).json({
        status: false,
        Message: "Something Went Wrong. Please Try Again later",
      });
    }
  }
);

router.post("/buyer_cancel", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var bodyData = req.body;
    console.log("bodyData buy cancel===", bodyData);
    if (bodyData.status != "" && bodyData.orderId != "") {
      let p2pdet = await p2pOrdersDB
        .findOne({ orderId: bodyData.orderId, userId: ObjectId(userId) })
        .exec();
      if (p2pdet) {
        let cancel = await p2pOrdersDB.findOneAndUpdate(
          { orderId: bodyData.orderId },
          { $set: { status: "cancelled", order_status: "cancelled" } },
          { new: true }
        );
        if (cancel) {
          var message = "Order Cancelled Successfully";
          res.json({ status: true, Message: message });
        } else {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        }
      } else {
        res.json({ status: true, Message: "Order Cancelled Successfully" });
      }
    }
  } catch (e) {
    console.log("bodyData buy cancel catch===", e);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/seller_cancel", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;
    var bodyData = req.body;
    console.log("bodyData sell cancel===", bodyData);
    if (bodyData.status != "" && bodyData.orderId != "") {
      let p2pdet = await p2pOrdersDB
        .findOne({ orderId: bodyData.orderId, userId: ObjectId(userId) })
        .exec();
      if (p2pdet) {
        let cancel = await p2pOrdersDB.findOneAndUpdate(
          { orderId: bodyData.orderId },
          { $set: { status: "cancelled", order_status: "cancelled" } },
          { new: true }
        );
        if (cancel) {
          const userBalance = await common.getUserP2PBalance(
            cancel.userId,
            cancel.fromCurrency
          );

          console.log(userBalance, "userBalance");

          if (userBalance != null) {
            var userBalanceTotal = userBalance.totalBalance;
            var balanceHoldTotal = userBalance.balanceHoldTotal;
            var remaining_qty = +p2pdet.totalAmount - +p2pdet.processAmount;
            var updateAmount = userBalanceTotal + remaining_qty;
            updateAmount > 0 ? updateAmount : 0;
            var updateHold = balanceHoldTotal - remaining_qty;
            updateHold = updateHold > 0 ? updateHold : 0;

            console.log(
              updateAmount,
              "updateAmount",
              userBalanceTotal,
              "userBalanceTotal",
              remaining_qty,
              "remaining_qty",
              balanceHoldTotal
            );

            const updatep2pbalance = await common.updateUserP2PBalances(
              cancel.userId,
              cancel.fromCurrency,
              updateAmount,
              userBalanceTotal,
              p2pdet._id
            );

            const updateholdbalance = await common.updatep2pHoldAmount(
              cancel.userId,
              cancel.fromCurrency,
              updateHold
            );
            return res.json({
              status: true,
              Message: "Order Cancelled Successfully",
            });
          }
        } else {
          res.json({
            status: false,
            Message: "Something went wrong, Please try again",
          });
        }
      } else {
        res.json({ status: true, Message: "Order Cancelled Successfully " });
      }
    } else {
      res.json({
        status: false,
        Message: "Something went wrong, Please try again",
      });
    }
  } catch (e) {
    console.log("sell cancel catch ex===", e);
    res.json({
      status: false,
      Message: "Something Went Wrong. Please Try Again later",
    });
  }
});

router.post("/getp2pOrder", common.tokenmiddleware, async (req, res) => {
  try {
    var userId = req.userId;

    // Fetch the confirmed order based on the order ID from the request body
    let getconfirmOrders = await p2pconfirmOrder.findOne({
      orderId: req.body.orderId,
    });

    // Fetch the order details and populate the userId field
    let getOrders = await p2pOrdersDB
      .findOne({
        orderId: getconfirmOrders.map_orderId,
      })
      .populate("userId", "displayname profile_image");

    var data = {
      firstCurrency: getOrders.firstCurrency,
      secondCurrnecy: getOrders.secondCurrnecy,
      totalAmount: getOrders.totalAmount,
      price: getOrders.price,
      fromLimit: getOrders.fromLimit,
      toLimit: getOrders.toLimit,
      available_qty: getOrders.available_qty,
      paymentMethod: getOrders.paymentMethod,
      orderType: getOrders.orderType,
      status: getOrders.status,
      email: getOrders.email,
      orderId: getOrders.orderId,
      filledAmount: getOrders.filledAmount,
      processAmount: getOrders.processAmount,
      order_status: getOrders.order_status,
      pay_time: getOrders.pay_time,
      _id: getOrders._id,
      userId: {
        _id: common.encrypt(getOrders.userId._id.toString()),
        displayname: getOrders.userId.displayname,
      },
      fromCurrency: getOrders.fromCurrency,
      toCurrency: getOrders.toCurrency,
    };

    // Fetch bank details based on the encrypted userId and payment method

    let bank = await bankdb.findOne({
      userid: ObjectId(getOrders.userId._id),
      type: getconfirmOrders.paymentMethod,
    });
    console.log("bank===", bank);

    // Count the completed trades for the user
    var completed_trades = await p2pOrdersDB
      .find({
        userId: ObjectId(getOrders.userId._id),
        status: "filled",
      })
      .countDocuments();
    console.log("completed_trades", completed_trades);

    // Count the total filled trades
    var filled_trades = await p2pOrdersDB
      .find({ status: "filled" })
      .countDocuments();
    console.log("filled_trades", filled_trades);

    // Calculate the user's rating based on completed trades
    var rating = (completed_trades / filled_trades) * 100;
    rating = !isNaN(rating) ? rating : 0;
    console.log("rating", rating);

    // Initialize p2pbalance
    var p2pbalance = "";

    // Fetch the user's balance for the currency used in the order
    const userBalance = await common.getUserBalance(
      userId,
      getOrders.fromCurrency
    );

    if (userBalance) {
      console.log(userBalance, "ihkiniknik");

      p2pbalance = userBalance.totalBalance;

      let user_bank = await bankdb.findOne({
        userid: ObjectId(getconfirmOrders.userId),
        type: getconfirmOrders.paymentMethod,
      });

      let opp_userbank = await bankdb.findOne({
        userid: ObjectId(getconfirmOrders.map_userId),
        type: getconfirmOrders.paymentMethod,
      });

      // Return the response with the encrypted userId, bank details, balance, rating, and completed count
      return res.json({
        status: true,
        Message: data,
        bank: bank,
        p2pbalance: p2pbalance,
        rating: parseFloat(rating).toFixed(2),
        completed_count: completed_trades,
        user_bank: user_bank,
        opp_userbank: opp_userbank,
        user_id: (user_bank != null) ? common.encrypt(user_bank.userid.toString()) : common.encrypt(getconfirmOrders.userId.toString()),
        opp_user_id: (opp_userbank != null) ? common.encrypt(opp_userbank.userid.toString()) : common.encrypt(getconfirmOrders.map_userId.toString()),
      });
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

router.post("/seller_confirm", common.tokenmiddleware, async (req, res) => {
  try {
    const { userId } = req;
    const { status, orderId } = req.body;

    if (!status || !orderId) return handleError(res);

    const p2pOrder = await p2pOrdersDB.findOne({ orderId }).exec();
    const p2pConfirmation = await p2pconfirmOrder
      .findOne({ map_orderId: orderId })
      .sort({ _id: -1 })
      .exec();

    if (!p2pOrder) return handleError(res, "Order not found");

    if (p2pOrder.orderType === "buy") {
      console.log("sell userId===", userId);

      const sellBalance = await common.getUserBalance(
        userId,
        p2pOrder.fromCurrency
      );

      if (!sellBalance) return handleError(res);

      const { totalBalance, balanceHoldTotal } = sellBalance;
      console.log("sell user balance===", totalBalance);
      console.log("sell p2p confirm amount===", p2pConfirmation.askAmount);
      console.log("sell sellholdTotal===", balanceHoldTotal);

      if (+totalBalance <= +p2pOrder.totalAmount)
        return handleError(res, "Insufficient Balance");

      const deductAmount = Math.max(
        totalBalance - p2pConfirmation.askAmount,
        0
      );
      console.log("sell p2p deductAmount amount===", deductAmount);
      console.log("sell p2p userid===", userId);

      const deductBalanceResult = await common.updateUserBalances(
        userId,
        p2pOrder.fromCurrency,
        deductAmount,
        totalBalance,
        p2pOrder._id,
        "sell"
      );

      if (!deductBalanceResult) return handleError(res);

      const confirmation = await p2pconfirmOrder.findOneAndUpdate(
        { map_orderId: orderId, status: 1 },
        { $set: { status: 2 } },
        { new: true }
      );

      const filledOrders = await p2pconfirmOrder.find({
        map_orderId: orderId,
        status: 2,
      });
      const totalFilled = filledOrders.reduce(
        (sum, order) => sum + order.askAmount,
        0
      );
      const remainingAmount = p2pOrder.totalAmount - totalFilled;
      const orderStatus = remainingAmount > 0 ? "pending" : "completed";
      const statusUpdate = remainingAmount > 0 ? "partially" : "filled";

      await p2pOrdersDB.findOneAndUpdate(
        { orderId },
        {
          $set: {
            status: statusUpdate,
            filledAmount: remainingAmount,
            order_status: orderStatus,
          },
        },
        { new: true }
      );

      if (!confirmation) return handleError(res);

      const buyerBalance = await common.getUserBalance(
        confirmation.userId,
        confirmation.firstCurrency
      );

      if (!buyerBalance) return handleError(res);

      const updatedBuyerBalance = Math.max(
        buyerBalance.totalBalance + p2pConfirmation.askAmount,
        0
      );

      await common.updateUserBalances(
        confirmation.userId,
        confirmation.firstCurrency,
        updatedBuyerBalance,
        buyerBalance.totalBalance,
        p2pOrder._id,
        "sell"
      );

      const [fromUser, toUser] = await Promise.all([
        usersDB.findOne({ _id: ObjectId(userId) }, { username: 1 }),
        usersDB.findOne(
          { _id: ObjectId(confirmation.userId) },
          { username: 1 }
        ),
      ]);

      const notification = await notifyDB.create({
        from_user_id: ObjectId(userId),
        to_user_id: ObjectId(toUser._id),
        p2porderId: ObjectId(p2pOrder._id),
        from_user_name: fromUser.username,
        to_user_name: toUser.username,
        type: "p2p",
        status: 0,
        message: `${fromUser.username} has released the crypto for your ${confirmation.askAmount} ${p2pOrder.firstCurrency} ${p2pOrder.orderType} order`,
        link: `/p2p/chat/${p2pOrder.orderId}`,
      });

      if (notification) {
        common.sendResponseSocket(
          "success",
          notification.message,
          "notify",
          notification.to_user_id,
          () => { }
        );
        return res.json({
          status: true,
          Message: "Crypto Released Successfully",
        });
      }
    } else {
      // Handle orderType !== 'buy' case
      const confirmation = await p2pconfirmOrder.findOneAndUpdate(
        { map_orderId: orderId, status: 1 },
        { $set: { status: 2 } },
        { new: true }
      );

      const filledOrders = await p2pconfirmOrder.find({
        map_orderId: orderId,
        status: 2,
      });
      const totalFilled = filledOrders.reduce(
        (sum, order) => sum + order.askAmount,
        0
      );
      const remainingAmount = p2pOrder.totalAmount - totalFilled;
      const orderStatus = remainingAmount > 0 ? "pending" : "completed";
      const statusUpdate = remainingAmount > 0 ? "partially" : "filled";

      await p2pOrdersDB.findOneAndUpdate(
        { orderId },
        {
          $set: {
            status: statusUpdate,
            filledAmount: remainingAmount,
            order_status: orderStatus,
          },
        },
        { new: true }
      );

      const sellBalance = await common.getUserBalance(
        confirmation.userId,
        p2pOrder.fromCurrency
      );

      if (!sellBalance) return handleError(res);

      const updatedSellHoldTotal = Math.max(
        sellBalance.balanceHoldTotal - confirmation.askAmount,
        0
      );
      await common.updatep2pHoldAmount(
        confirmation.userId,
        p2pOrder.fromCurrency,
        updatedSellHoldTotal
      );

      const buyerBalance = await common.getUserBalance(
        confirmation.map_userId,
        confirmation.firstCurrency
      );

      if (!buyerBalance) return handleError(res);

      const updatedBuyerBalance = Math.max(
        buyerBalance.totalBalance + confirmation.askAmount,
        0
      );

      await common.updateUserBalances(
        confirmation.map_userId,
        confirmation.firstCurrency,
        updatedBuyerBalance,
        buyerBalance.totalBalance,
        p2pOrder._id,
        "sell"
      );

      const [fromUser, toUser] = await Promise.all([
        usersDB.findOne({ _id: ObjectId(userId) }, { username: 1 }),
        usersDB.findOne(
          { _id: ObjectId(confirmation.map_userId) },
          { username: 1 }
        ),
      ]);

      const notification = await notifyDB.create({
        from_user_id: ObjectId(userId),
        to_user_id: ObjectId(toUser._id),
        p2porderId: ObjectId(p2pOrder._id),
        from_user_name: fromUser.username,
        to_user_name: toUser.username,
        type: "p2p",
        status: 0,
        message: `${fromUser.username} has released the crypto for your ${confirmation.askAmount} ${p2pOrder.firstCurrency} ${p2pOrder.orderType} order`,
        link: `/p2p/chat/${p2pOrder.orderId}`,
      });

      if (notification) {
        common.sendResponseSocket(
          "success",
          notification.message,
          "notify",
          notification.to_user_id,
          () => { }
        );
        return res.json({
          status: true,
          Message: "Crypto Released Successfully",
        });
      }
    }

    return handleError(res);
  } catch (error) {
    console.error(error);
    return handleError(res, "Something Went Wrong. Please Try Again later");
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
          if(getChat != null)
          {
            common.sendResponseSocket(
            "success",
            getChat,
            "p2pchat",
            opp_detail._id,
            function () { }
          );
          }
          
          var obj = {
            from_user_id: ObjectId(userId),
            to_user_id: Object(opp_detail._id),
            p2porderId: ObjectId(p2pdet._id),
            from_user_name: userdetail.displayname,
            to_user_name: opp_detail.displayname,
            status: 0,
            type: "p2p",
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
          if(getChat != null)
          {
            common.sendResponseSocket(
            "success",
            getChat,
            "p2pchat",
            opp_detail._id,
            function () { }
          );
          }
          
          let attachment_msg = bodyData.file ? "& sent attachement" : "";
          var obj = {
            from_user_id: ObjectId(userId),
            to_user_id: ObjectId(opp_detail._id),
            p2porderId: ObjectId(p2pdet._id),
            from_user_name: userdetail.displayname,
            to_user_name: opp_detail.displayname,
            status: 0,
            type: "p2p",
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



router.post("/p2p_dispute_chat", common.tokenmiddleware, async (req, res) => {
  try {
    const { type, message, file, orderId, p2porderId } = req.body;
    const userId = req.userId;
    const timestamp = Date.now();

    if (!type || !orderId || !p2porderId || !message) {
      return res.json({ status: false, Message: "Please give all fields" });
    }

    const p2pOrder = await p2pconfirmOrder.findOne({ orderId });

    if (!p2pOrder) return res.json({ status: false, Message: "Order not found" });

    let senderDetail, receiverId, chatData, notificationObj;

    if (type === "admin") {
      // Admin chatting with a user
      const targetUserId = req.body.toUserId;
      senderDetail = await adminDB.findOne({ _id: userId }, { name: 1 });

      chatData = {
        admin_name: senderDetail.name,
        admin_msg: message,
        admin_file: file || "",
        admin_date: timestamp,
        type: "admin",
        p2porderId,
        orderId,
        userId: targetUserId,
      };

      await disputeModel.create(chatData);

      // Do not store notifications for admin
      return res.json({ status: true, Message: "Message sent by admin" });
    }

    // User or Advertiser chat with admin
    senderDetail = await usersDB.findOne({ _id: userId }, { displayname: 1 });
    const isAdvertiser = type === "advertiser";

    chatData = {
      p2porderId,
      orderId,
      type,
      adv_date: isAdvertiser ? timestamp : null,
      user_date: !isAdvertiser ? timestamp : null,
      adv_name: isAdvertiser ? senderDetail.displayname : "",
      user_name: !isAdvertiser ? senderDetail.displayname : "",
      adv_msg: isAdvertiser ? message : "",
      user_msg: !isAdvertiser ? message : "",
      adv_file: isAdvertiser ? (file || "") : "",
      user_file: !isAdvertiser ? (file || "") : "",
      advertiserId: isAdvertiser ? userId : p2pOrder.map_userId,
      userId: !isAdvertiser ? userId : p2pOrder.userId,
    };

    await disputeModel.create(chatData);

    // Notify admin only if it's from a user
    const adminUserId = "";
    common.sendResponseSocket("success", chatData, "p2pchat", adminUserId, () => { });

    const attachmentMsg = file ? " & sent an attachment" : "";
    notificationObj = {
      from_user_id: userId,
      to_user_id: adminUserId,
      p2porderId,
      from_user_name: senderDetail.displayname,
      to_user_name: "Admin",
      status: 0,
      type: "p2p",
      message: `${senderDetail.displayname} has sent ${message}${attachmentMsg}`,
      link: `/p2p/chat/${orderId}`,
    };

    await notifyDB.create(notificationObj);

    common.sendResponseSocket("success", notificationObj.message, "notify", adminUserId, () => { });

    return res.json({ status: true, Message: "Message sent successfully" });

  } catch (error) {
    console.log("Error in p2p_chat:", error);
    return res.status(200).send({ success: false, Message: "Something Went Wrong" });
  }
});




router.post(
  "/cancel_confirm_order",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId)
        return res
          .status(400)
          .json({ status: false, Message: "Order ID is required" });

      const orderDetail = await p2pconfirmOrder.findOne({ orderId });
      if (!orderDetail)
        return res
          .status(404)
          .json({ status: false, Message: "Invalid Order" });

      const p2pdetail = await p2pOrdersDB.findOne({
        _id: ObjectId(orderDetail.p2p_orderId),
      });
      if (!p2pdetail)
        return res
          .status(404)
          .json({ status: false, Message: "Order not found" });

      const processAmount = Math.max(
        p2pdetail.processAmount - orderDetail.askAmount,
        0
      );

      const p2pupdate = await p2pOrdersDB.updateOne(
        { _id: ObjectId(orderDetail.p2p_orderId) },
        { $set: { processAmount, order_status: "pending" } }
      );

      const p2pconfirm = await p2pconfirmOrder.updateOne(
        { orderId },
        { $set: { status: 3 } }
      );

      if (orderDetail.hold_userId != null) {
        let p2p_balance = await common.getUserP2PBalance(orderDetail.hold_userId, p2pdetail.fromCurrency);
        let p2pbalance = p2p_balance.totalBalance;

        let hold_balance = p2p_balance.balanceHoldTotal;
        let escrew_amount = +hold_balance - +orderDetail.askAmount;
        escrew_amount = (+escrew_amount > 0) ? +escrew_amount : 0;

        let balance_amount = +p2pbalance + +orderDetail.askAmount;

        const balanceUpdate = await common.updateUserP2PBalances(
          orderDetail.hold_userId,
          p2pdetail.fromCurrency,
          balance_amount,
          p2pbalance,
          orderDetail._id,
          "sell"
        );

        const updateholdbalance = await common.updatep2pHoldAmount(
          orderDetail.hold_userId,
          p2pdetail.fromCurrency,
          escrew_amount
        );
      }


      if (p2pupdate && p2pconfirm) {
        common.sendCommonSocket(
          "success",
          "ordercancel",
          "ordercancel",
          () => { }
        );
        return res.json({
          status: true,
          Message: "Timeout Order cancelled, Please try again",
        });
      } else {
        return res
          .status(500)
          .json({
            status: false,
            Message: "Something went wrong, please try again",
          });
      }
    } catch (error) {
      console.error("Error in cancel_confirm_order:", error);
      return res
        .status(500)
        .json({
          status: false,
          Message: "Internal server error, Please try later!",
        });
    }
  }
);

router.post("/myOrders", common.tokenmiddleware, async (req, res) => {
  try {
    const { search, FilPerpage = 5, FilPage = 1 } = req.body;
    const perPage = Number(FilPerpage);
    const page = Number(FilPage);
    const filter = {};

    const userId = req.userId;
    const skip = perPage * (page - 1);

    const getOrders = await p2pOrdersDB
      .find({ userId })
      .populate("fromCurrency", "currencyName currencySymbol Currency_image")
      .skip(skip)
      .limit(perPage)
      .sort({ _id: -1 })
      .exec();

    if (!getOrders) return res.json({ status: true, Message: [] });

    const count = await p2pOrdersDB.countDocuments({ userId }).exec();
    const returnObj = {
      Message: getOrders,
      current: page,
      pages: Math.ceil(count / perPage),
      total: count,
    };

    return res.json({ status: true, returnObj });
  } catch (error) {
    console.error("Error in myOrders:", error);
    return res
      .status(500)
      .json({
        status: false,
        Message: "Internal server error, Please try later!",
      });
  }
});

router.post("/p2p_history", common.tokenmiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.body;
    const skip = (page - 1) * limit;

    const getOrders = await p2pconfirmOrder
      .find({ $or: [{ map_userId: req.userId }, { userId: req.userId }] })
      .populate("firstCurrency", "currencyName currencySymbol Currency_image")
      .skip(skip)
      .limit(limit)
      .sort({ _id: -1 })
      .exec();

    if (getOrders.length > 0) {
      getOrders.forEach((order) => {
        order.type =
          order.type === "buy" && order.userId !== req.userId ? "sell" : "buy";
      });
    }

    const count = await p2pconfirmOrder
      .countDocuments({
        $or: [{ map_userId: req.userId }, { userId: req.userId }],
      })
      .exec();

    const returnObj = {
      Message: getOrders,
      current: page,
      total: count,
    };

    return res.json({ status: true, returnObj });
  } catch (error) {
    console.error("Error in p2p_history:", error);
    return res
      .status(500)
      .json({
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
        let p2pdet = await p2pconfirmOrder.findOne({
          orderId: bodyData.orderId,
        });
        if (p2pdet) {
          let update_p2p = await p2pconfirmOrder.findOneAndUpdate(
            { orderId: bodyData.orderId },
            { $set: { status: 1, paytime: Date.now() } }
          );
          if (update_p2p) {
            var message = "Payment Confirmed Successfully";
            let from_user = await usersDB.findOne(
              { _id: ObjectId(userId) },
              { displayname: 1, email: 1 }
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
                .findOne(
                  { _id: p2pdet.map_userId },
                  { email: 1, displayname: 1 }
                )
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
              type: "p2p",
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
              if(getChat != null)
              {
                common.sendResponseSocket(
                "success",
                getChat,
                "p2pchat",
                getChat.userId,
                function () { }
                );
              }
              
            }

            let resData = await mailtempDB.findOne({
              key: "buyer_confirm_payment",
            });
            if (resData) {
              var reciver = common.decrypt(opp_detail.email);
              console.log(reciver, "reciver");
              var etempdataDynamic = resData.body
                .replace(/###MESSAGE###/g, obj.message)
                .replace(/###USERNAME###/g, opp_detail.displayname);
              var mailRes = await mail.sendMail({
                from: {
                  name: process.env.FROM_NAME,
                  address: process.env.FROM_EMAIL,
                },
                to: reciver,
                subject: resData.Subject,
                html: etempdataDynamic,
              });
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



router.post(
  "/cancel_confirmorder_sell",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId)
        return res
          .status(400)
          .json({ status: false, Message: "Order ID is required" });

      const p2pdet = await p2pconfirmOrder.findOne({ orderId });
      if (!p2pdet)
        return res
          .status(404)
          .json({ status: false, Message: "Invalid request" });

      if (p2pdet.status === 1) {
        return res
          .status(400)
          .json({ status: false, Message: "Seller cannot cancel the order" });
      }

      const getOrder = await p2pOrdersDB.findOne({
        _id: ObjectId(p2pdet.p2p_orderId),
      });
      if (!getOrder)
        return res
          .status(404)
          .json({ status: false, Message: "Order not found" });

      const updatedOrder = await p2pOrdersDB.updateOne(
        { _id: ObjectId(getOrder._id) },
        {
          $set: {
            processAmount: getOrder.processAmount - p2pdet.askAmount,
            order_status: "pending",
          },
        }
      );

      const update_p2p = await p2pconfirmOrder.updateOne(
        { orderId },
        { $set: { status: 3 } }
      );

      if (updatedOrder && update_p2p) {
        res.json({ status: true, Message: "Order cancelled successfully" });
      } else {
        res
          .status(500)
          .json({
            status: false,
            Message: "Something went wrong, please try again later",
          });
      }
    } catch (error) {
      console.error("Error in cancel_confirmorder_sell:", error);
      res
        .status(500)
        .json({
          status: false,
          Message: "Internal server error, Please try later!",
        });
    }
  }
);

module.exports = router;

router.post("/getp2pchat", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId } = req.body;

    const p2pOrder = await p2pconfirmOrder.findOne({ orderId }).exec();
    if (!p2pOrder) {
      return res
        .status(404)
        .json({ status: false, Message: "Order not found" });
    }

    console.log("p2pOrder-->", p2pOrder);

    // const whereCondn =
    //   p2pOrder.userId == userId
    //     ? { p2porderId: ObjectId(p2pOrder._id) }
    //     : {
    //       p2porderId: ObjectId(p2pOrder._id),
    //       $or: [{ advertiserId: userId }, { userId: userId }],
    //     };
    const whereCondn = {
      p2porderId: ObjectId(p2pOrder._id)
    }
    console.log("whereCondn-->", whereCondn);

    const getChat = await p2pChatDB.find(whereCondn).exec();
    console.log("getChat-->", getChat);

    const chatWithEncryptedUserId = getChat.map(chat => {
      const chatObj = chat.toObject(); // Convert MongoDB document to plain object

      // Determine which ID to encrypt (userId or advertiserId)
      const idToEncrypt = chatObj.userId || chatObj.advertiserId;

      return {
        ...chatObj,
        user_id: idToEncrypt ? common.encrypt(idToEncrypt.toString()) : null // Encrypt if ID exists
      };
    });

    return res.json({ status: true, Message: chatWithEncryptedUserId.length ? chatWithEncryptedUserId : [] });
  } catch (error) {
    console.error("Error in getp2pchat:", error);
    return res
      .status(500)
      .json({
        status: false,
        Message: "Internal server error, Please try later!",
      });
  }
});

router.post("/p2p_check_confirm", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId } = req.body;

    const p2pdet = await p2pconfirmOrder.findOne({ orderId }).exec();
    if (!p2pdet) {
      return res
        .status(404)
        .json({ status: false, Message: "Order not found" });
    }

    const bank = await bankdb
      .findOne({ userid: p2pdet.userId, type: p2pdet.paymentMethod })
      .exec();
    return res.json({ status: true, Message: p2pdet, bank_details: bank });
  } catch (error) {
    console.error("Error in p2p_check_confirm:", error);
    return res
      .status(500)
      .json({
        status: false,
        Message: "Internal server error, Please try later!",
      });
  }
});


router.post("/get_dispute", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId } = req.body;

    const p2pdet = await p2pdispute.findOne({ orderId, userId }).exec();
    if (!p2pdet) {
      return res
        .status(404)
        .json({ status: false, Message: "Order not found" });
    }


    return res.json({ status: true, Message: p2pdet });
  } catch (error) {
    console.error("Error in p2p_check_confirm:", error);
    return res
      .status(500)
      .json({
        status: false,
        Message: "Internal server error, Please try later!",
      });
  }
});


router.post("/update_dispute_statusbyadmin", common.tokenmiddleware, async (req, res) => {
  try {
    const { orderId, status, userId } = req.body;

    // Allowed statuses
    const validStatuses = ['cancel', 'resolved', 'not_resolved'];

    // Check for valid status
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ status: false, Message: "Invalid status provided." });
    }

    // Find and update the dispute
    const updatedDispute = await p2pdispute.findOneAndUpdate(
      { orderId, userId },
      { $set: { status } },
      { new: true }
    );

    if (!updatedDispute) {
      return res.status(404).json({ status: false, Message: "Dispute not found." });
    }

    // chatData = {
    //   user_date: timestamp,
    //   user_name: senderDetail.displayname,
    //   user_msg: message,
    //   user_file: (file || ""),
    //   userId: userId,
    // };


    // senderDetail = await adminDB.findOne({}).exec();
    // common.sendResponseSocket("success", chatData, "p2pchat", adminUserId, () => { });

    return res.json({
      status: true,
      Message: "Dispute status updated successfully.",
      data: updatedDispute,
    });


  } catch (error) {
    console.error("Error in update_dispute_status:", error);
    return res.status(500).json({
      status: false,
      Message: "Internal server error. Please try again later.",
    });
  }
});

router.post("/update_dispute_status", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId, status } = req.body;

    // Allowed statuses
    const validStatuses = ['cancel', 'resolved', 'not_resolved'];

    // Check for valid status
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ status: false, Message: "Invalid status provided." });
    }

    // Find and update the dispute
    const updatedDispute = await p2pdispute.findOneAndUpdate(
      { orderId, userId },
      { $set: { status } },
      { new: true }
    );

    if (!updatedDispute) {
      return res.status(404).json({ status: false, Message: "Dispute not found." });
    }



    console.log("updatedDispute", updatedDispute);

    const UserDetails = await usersDB
      .findOne({ _id: updatedDispute.userId })
      .exec();

    console.log("UserDetails", UserDetails);



    const getChat = {
      user_name: UserDetails.displayname,
      status
    }


    senderDetail = await AdminDB.findOne({}).exec();

    common.sendResponseSocket(
      "success",
      getChat,
      "updatedispute",
      senderDetail._id,
      function () { }
    );


    return res.json({
      status: true,
      Message: "Dispute status updated successfully.",
      data: updatedDispute,
    });
  } catch (error) {
    console.error("Error in update_dispute_status:", error);
    return res.status(500).json({
      status: false,
      Message: "Internal server error. Please try again later.",
    });
  }
});


router.post("/dispute_order", common.tokenmiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { orderId, query, attachment, type } = req.body;

    if (!orderId) {
      return res
        .status(400)
        .json({ status: false, Message: "Invalid request" });
    }

    const p2pdet = await p2pconfirmOrder.findOne({ orderId }).exec();
    if (!p2pdet) {
      return res
        .status(404)
        .json({ status: false, Message: "Order not found" });
    }

    const p2p_order = await p2pOrdersDB
      .findOne({ orderId: p2pdet.map_orderId })
      .exec();
    const dispute = {
      orderId,
      userId: ObjectId(userId),
      query,
      attachment,
      type,
      p2p_orderId: p2p_order.orderId,
    };

    const dispute_order = await p2pdispute.create(dispute);
    if (!dispute_order) {
      return res
        .status(500)
        .json({
          status: false,
          Message: "Something went wrong, please try again later",
        });
    }

    await p2pconfirmOrder
      .updateOne({ orderId }, { $set: { dispute_status: 1 } })
      .exec();

    const from_user = await usersDB
      .findOne({ _id: ObjectId(userId) }, { displayname: 1 })
      .exec();

    var opp_detail = "";
    if (userId.toString() == p2pdet.map_userId.toString()) {
      opp_detail = await usersDB
        .findOne({ _id: p2pdet.userId }, { email: 1, username: 1 })
        .exec();
    } else {
      opp_detail = await usersDB
        .findOne({ _id: p2pdet.map_userId }, { email: 1, username: 1 })
        .exec();
    }

    const notification = await notifyDB.create({
      from_user_id: ObjectId(userId),
      to_user_id: ObjectId(opp_detail._id),
      p2porderId: ObjectId(p2pdet._id),
      from_user_name: from_user.displayname,
      to_user_name: opp_detail.displayname,
      status: 0,
      type: "p2p",
      message: `${from_user.displayname} has raised dispute for the order ${p2pdet.askAmount} ${p2pdet.fromCurrency} ${p2pdet.type} order. Please resolve this issue within the next 20 minutes. Failure to resolve it in time may result in your account being temporarily frozen for further investigation.`,
      link: `/p2p/chat/${p2pdet.orderId}`,
    });

    common.sendResponseSocket(
      "success",
      notification.message,
      "notify",
      notification.to_user_id,
      () => { }
    );
    const newRec = {
      [p2p_order.userId.toString() === userId.toString()
        ? "advertiserId"
        : "userId"]: ObjectId(userId),
      [p2p_order.userId.toString() === userId.toString()
        ? "adv_name"
        : "user_name"]: from_user.displayname,
      [p2p_order.userId.toString() === userId.toString()
        ? "adv_msg"
        : "user_msg"]: query,
      [p2p_order.userId.toString() === userId.toString()
        ? "adv_file"
        : "user_file"]: attachment || "",
      p2porderId: ObjectId(p2pdet._id),
      orderId: p2pdet.orderId,
      [p2p_order.userId.toString() === userId.toString()
        ? "adv_date"
        : "user_date"]: Date.now(),
      type:
        p2p_order.userId.toString() === userId.toString()
          ? "advertiser"
          : "user",
    };


    const newRec1 = {
      "userId": ObjectId(userId),
      "user_name": from_user.displayname,
      "user_msg": query,
      "user_file": attachment || "",
      p2porderId: ObjectId(p2pdet._id),
      orderId: p2pdet.orderId,
      "user_date": Date.now(),
      type:
        p2p_order.userId.toString() === userId.toString()
          ? "advertiser"
          : "user",
    };



    const savechat = await p2pChatDB.create(newRec);
    const savedisputechat = await p2pDisputeChatDB.create(newRec1);

    if (savechat && savedisputechat) {
      let whereCondn = { orderId: savechat.orderId };
      let getChat = await p2pChatDB
        .findOne(whereCondn)
        .limit(1)
        .sort({ _id: -1 })
        .exec();
      senderDetail = await AdminDB.findOne({}).exec();

      if(getChat != null)
      {
         common.sendResponseSocket(
        "success",
        getChat,
        "dispup2pchatteraise",
        senderDetail._id,
        function () { }
      );
      common.sendResponseSocket(
        "success",
        getChat,
        "p2pchat",
        opp_detail._id,
        function () { }
      );
      }
     




    }

    res.json({ status: true, Message: "Dispute raised successfully" });
  } catch (error) {
    console.error("Error in dispute_order:", error);
    return res
      .status(500)
      .json({
        status: false,
        Message: "Something went wrong, please try again later",
      });
  }
});

router.post("/p2p_confirm_check", common.tokenmiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    const p2pdet = await p2pconfirmOrder.findOne({ orderId }).exec();
    if (!p2pdet) {
      return res
        .status(404)
        .json({ status: false, Message: "Order not found" });
    }

    return res.json({ status: true, Message: p2pdet });
  } catch (error) {
    console.error("Error in p2p_confirm_check:", error);
    return res
      .status(500)
      .json({
        status: false,
        Message: "Internal server error, Please try later!",
      });
  }
});

router.get("/get_p2p_payments", async (req, res) => {
  try {
    let payment_methods = await paymentMethod.find({ status: "1" });
    if (payment_methods.length > 0) {
      return res.json({ status: true, data: payment_methods });
    }
    else {
      return res.json({ status: true, data: [] });
    }
  } catch (error) {
    return res.json({ status: false });
  }
});



router.post("/get_dispute_chat", common.tokenmiddleware, async (req, res) => {
  try {

    const { orderId } = req.body;

    const userId = req.userId;

    console.log("Received p2porderId:", orderId);
    const disputeData = await p2pconfirmOrder.findOne({ orderId }).exec();

    if (!disputeData) {
      return res.status(404).json({ status: false, message: "Dispute not found" });
    }

    const allChats = await p2pDisputeChatDB.find({ userId, p2porderId: disputeData._id }).exec();

    return res.status(200).json({ status: true, Message: allChats });


  }
  catch (e) {
    console.error("Error in :", e);
    return res.status(500).json({
      status: false,
      data: [],
      message: "Something went wrong",
    });
  }
});

router.post("/p2p_user_ratings", common.tokenmiddleware, async (req, res) => {
  try {
    const raterId = req.userId;
    const { orderId, stars } = req.body;

    if (!orderId || !stars) {
      return res.json({ status: false, Message: "Invalid request" });
    }

    // find p2p order by orderId (orderId is the string orderId used in your app)
    const p2pdet = await p2pconfirmOrder.findOne({ orderId: orderId }).exec();
    if (!p2pdet) {
      return res.json({ status: false, Message: "Order not found" });
    }

    // Determine which user is being rated (opponent)
    let ratedUserId;
    if (p2pdet.userId && p2pdet.map_userId) {
      // If the rater is the same as userId then opponent is map_userId, else opponent is userId
      if (p2pdet.userId.toString() === raterId.toString()) {
        ratedUserId = p2pdet.map_userId;
      } else {
        ratedUserId = p2pdet.userId;
      }
    } else {
      return res.json({ status: false, Message: "Invalid order data" });
    }

    // Save rating entry
    await usersDB.findByIdAndUpdate(
      ObjectId(ratedUserId),
      {
        $push: {
          ratings: {
            stars: Number(stars),
            ratedBy: ObjectId(raterId),
            orderId: p2pdet._id,
            date: Date.now(),
          },
        },
      },
      { new: true, useFindAndModify: false }
    );

    return res.json({ status: true, Message: "Rating saved" });
  } catch (err) {
    console.error("p2p_user_ratings error:", err);
    return res.json({ status: false, Message: "Something Went Wrong" });
  }
});


module.exports = router;