var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var mongoose = require("mongoose");
var conversion = require("../helper/currencyConversion");
var WalletDB = require("../schema/userWallet");
var usersDB = require("../schema/users");
var DepositDB = require("../schema/deposit");
const RewardSettingsDB = require("../schema/RewardManagement");
const ReferralHistory = require("../schema/referralHistory"); // Import the referral history model
const CurrencyDB = require("../schema/currency");
const pairDB = require("../schema/trade_pair");
const UserReward = require('../schema/UserRewardMangement');

var addReferralFeesDB = require("../schema/addReferalFees");

router.post("/postHistory", common.tokenmiddleware, async (req, res) => {
    try {
    } catch (error) { }
});

// Get users referral details //

router.get("/getReferal", common.tokenmiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const getReferral = await usersDB.findOne({ _id: userId });

        if (getReferral) {
            const referralCode = getReferral.referralCode;

            // Use projection to get only the necessary fields
            const referralCount = await usersDB
                .find(
                    { referralByCode: referralCode , verifyEmail: 1 },
                    { createdDate: 1, displayname: 1 , uuid: 1 } // Specify fields to return
                )
                .sort({ _id: -1 });

            if (referralCount) {
                const referralCountValid = await usersDB.countDocuments({
                    referralByCode: referralCode,
                    kycstatus: 1,
                });

                const total = await ReferralHistory.aggregate([
                    {
                        $match: {
                            userId: mongoose.Types.ObjectId(req.userId), // Ensure the userId is an ObjectId
                        },
                    },
                    {
                        $group: {
                            _id: null, // Grouping by null to sum all amounts
                            totalAmount: { $sum: "$amount" }, // Summing the amount field
                        },
                    },
                ]);

                let rewardamount = 0;

                if (total.length > 0) {
                    rewardamount = total[0].totalAmount; // Return the total amount
                }
                console.log(total, "total");

                const obj = {
                    totalCount: referralCount.length,
                    qualCount: referralCountValid,
                    history: referralCount,
                    reward: rewardamount,
                };

                return res.json({
                    status: true,
                    data: obj,
                });
            }
        }

        return res.json({
            status: false,
            message: "Something went wrong, Please try later",
        });
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.json({
            status: false,
            message: "Internal server error, Please try later",
        });
    }
});

router.get("/getReferralRewards", common.tokenmiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        // Step 1: Get the current user's referral code
        const getReferral = await usersDB.findOne(
            { _id: userId },
            { referralCode: 1 }
        );
        if (!getReferral) {
            return res.status(404).json({
                status: false,
                message: "User not found",
            });
        }

        const referralCode = getReferral.referralCode;

        // Step 2: Find users referred by this referral code
        const referredUsers = await usersDB
            .find(
                { referralByCode: referralCode },
                { _id: 1, createdDate: 1, displayname: 1 }
            )
            .sort({ _id: -1 });

        if (referredUsers.length === 0) {
            return res.status(404).json({
                status: false,
                message: "No referred users found",
            });
        }

        let totalReferralRewards = 0; // Track total rewards issued

        // Step 3: Parallelize deposits and reward processing for each referred user
        const rewardPromises = referredUsers.map(async (referredUser) => {
            try {
                const deposit = await DepositDB.findOne({
                    userId: referredUser._id,
                }).sort({ createdDate: 1 });

                const history = await ReferralHistory.findOne({
                    fromUser: referredUser._id,
                });
                if (history) return 0; // Already got the reward

                if (!deposit) return 0; // If no deposit, skip this user

                const currencyInfo = await CurrencyDB.findOne({
                    _id: deposit.currency,
                });
                if (!currencyInfo) return 0; // Skip if currency not found

                const usdtValue = await conversion.currencyConversion(
                    currencyInfo.currencySymbol,
                    "USDT"
                );
                const depositUSDTValue = usdtValue * deposit.depamt;

                // Step 4: Get referral reward details from admin settings
                const rewardSettings = await RewardSettingsDB.findOne({
                    referralStatus: 1,
                });
                if (!rewardSettings) return 0; // No active reward settings

                const referralAmountPercentage = rewardSettings.referralAmount;
                const referralRewardAmount =
                    (depositUSDTValue * referralAmountPercentage) / 100;

                // Step 5: Get the reward currency information
                const referralCurrencyInfo = await CurrencyDB.findOne({
                    _id: rewardSettings.referralCurrency,
                });
                if (!referralCurrencyInfo) return 0; // Skip if reward currency not found

                const tradePair = await pairDB.findOne({ pair: "VTX_USDT" });
                if (!tradePair) return 0; // Skip if trade pair not found

                const vtxMarketPrice = tradePair.marketPrice;
                const vtxRewardAmount = referralRewardAmount / vtxMarketPrice;

                const balanceUpdate = await incrementVTXBalance(
                    userId,
                    vtxRewardAmount,
                    referredUser._id
                );

                return balanceUpdate; // Return reward amount for this user
            } catch (err) {
                console.error(
                    `Error processing reward for user ${referredUser._id}:`,
                    err
                );
                return 0; // Return 0 on error for this user
            }
        });

        // Step 6: Calculate total rewards from all referred users
        const rewards = await Promise.all(rewardPromises);
        totalReferralRewards = rewards.reduce((acc, reward) => acc + reward, 0);

        if (totalReferralRewards > 0) {
        return res.status(200).json({
            status: true,
            message: "Referral rewards processed successfully",
            data: {
                totalReferralRewards,
            },
        })
    } else {
        return res.status(404).json({
            status: false,
            message: "No referral rewards to process",
        });
    }
    } catch (error) {
        console.error("Error processing referral rewards:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
});

async function incrementVTXBalance(userId, vtxRewardAmount, fromUserId) {
    try {
        // Step 1: Find the user's wallet document based on userId
        const userWallet = await WalletDB.findOne({
            userId: mongoose.Types.ObjectId(userId),
        });

        if (!userWallet) {
            return { status: 404, message: "User wallet not found" };
        }

        // Step 2: Locate the VTX wallet in the user's wallets array
        const vtxWallet = userWallet.wallets.find(
            (wallet) => wallet.currencySymbol === "VTX"
        );

        if (!vtxWallet) {
            return { status: 404, message: "VTX wallet not found for the user" };
        }

        // Step 3: Increment the VTX amount by vtxRewardAmount
        vtxWallet.amount += vtxRewardAmount;

        // Step 4: Save the updated wallet document
        await userWallet.save();

        // Step 5: After updating the balance, create a referral history entry
        const referralHistoryEntry = new ReferralHistory({
            currencyId: vtxWallet.currencyId, // VTX currency ID
            amount: vtxRewardAmount, // Rewarded amount in VTX
            userId: userId, // The user receiving the reward
            fromUser: fromUserId, // The user who referred
            totalAmount: vtxRewardAmount, // Updated total amount in the wallet
            fee: 0, // Assuming no fee, can be updated if needed
            type: "Referral Reward", // Type of transaction
            createdDate: Date.now(),
            modifiedDate: Date.now(),
        });

        // Save the referral history entry to the database
        await referralHistoryEntry.save();

        // Step 6: Update or create a UserReward record for the user
        const userReward = await UserReward.findOneAndUpdate(
            { userId: userId }, // Find by userId
            {
                $push: {
                    rewards: {
                        type: "Referral Reward", // Type of reward
                        amount: vtxRewardAmount, // Reward amount
                        currency: "VTX", // Reward currency
                        dateClaimed: new Date(), // Date the reward was claimed
                    },
                },
            },
            { upsert: true, new: true } // Create if it doesn't exist, and return the updated document
        );

        return {
            status: 200,
            message: "VTX balance updated and referral history created successfully",
            updatedAmount: vtxWallet.amount,
            userReward: userReward,
        };
    } catch (error) {
        console.error("Error incrementing VTX balance or creating history:", error);
        return { status: 500, message: "Internal server error" };
    }
}

router.post(
    "/getReferalHistories",
    common.tokenmiddleware,
    async (req, res) => {
        try {
            var perPage = Number(req.body.perpage ? req.body.perpage : 5);
            var page = Number(req.body.page ? req.body.page : 1);
            console.log(perPage, "=-=-=-pr");
            var skippage = perPage * page - perPage;
            let userId = req.userId;
            const getReferral = await usersDB.findOne({ _id: userId });
            console.log(getReferral, "=-=-=-getReferral");

            if (
                getReferral != null &&
                getReferral != undefined &&
                getReferral != ""
            ) {
                const referralcode = getReferral.referralCode;
                console.log(referralcode, "=-=-=-referralcode");
                const referralCount = await usersDB
                    .find({ referralByCode: referralcode },
                        { createdDate: 1, displayname: 1 , uuid: 1 }
                    )
                    .sort({ _id: -1 })
                    .skip(skippage)
                    .limit(perPage)
                    .exec();
                var pagedata = await usersDB.find({ referralByCode: referralcode }).count();
                if (referralCount) {
                    var obj = {
                        data: referralCount,
                        current: page,
                        pages: Math.ceil(pagedata / perPage),
                        total: pagedata,
                    };
                    return res.json({
                        status: true,
                        message: "Data Successfully retrieved",
                        data: obj,
                    });
                }
            } else {
                return res.json({
                    status: false,
                    Mesage: "Something went wrong, Please try later",
                });
            }
        } catch (error) {
            return res.json({
                status: false,
                Mesage: "Internal server error, Please try late",
            });
        }
    }
);

// router.post(
//     "/getReferalHistories",
//     common.tokenmiddleware,
//     async (req, res) => {
//         try {
//             var perPage = Number(req.body.perpage ? req.body.perpage : 5);
//             var page = Number(req.body.page ? req.body.page : 1);
//             //console.log((perPage, "=-=-=-pr");
//             var skippage = perPage * page - perPage;
//             let userId = req.userId;
//             const getReferral = await usersDB.findOne({ _id: userId });
//             if (
//                 getReferral != null &&
//                 getReferral != undefined &&
//                 getReferral != ""
//             ) {
//                 const referralcode = getReferral.referralCode;
//                 const referralCount = await usersDB
//                     .find({ referral: referralcode })
//                     .sort({ _id: -1 })
//                     .skip(skippage)
//                     .limit(perPage)
//                     .exec();
//                 var pagedata = await usersDB.find({ referral: referralcode }).count();
//                 if (referralCount) {
//                     var obj = {
//                         data: referralCount,
//                         current: page,
//                         pages: Math.ceil(pagedata / perPage),
//                         total: pagedata,
//                     };
//                     return res.json({
//                         status: true,
//                         message: "Data Successfully retrieved",
//                         data: obj,
//                     });
//                 }
//             } else {
//                 return res.json({
//                     status: false,
//                     Mesage: "Something went wrong, Please try later",
//                 });
//             }
//         } catch (error) {
//             return res.json({
//                 status: false,
//                 Mesage: "Internal server error, Please try late",
//             });
//         }
//     }
// );

//================= Admin ====================//

// Referral collection //

router.post("/addFees", common.tokenmiddleware, async (req, res) => {
    try {
        var obj = {
            welcome_bonus: 20,
            referral_commision: 20,
            trading_bonus: 20,
            deposit_bonus: 20,
            minimum_deposit: 20,
        };
        const createFees = await addReferralFeesDB.create(obj);
        if (createFees) {
            return res.json({
                status: true,
                message: "Datas created",
            });
        } else {
            return res.json({
                status: false,
                message: "Datas not created",
            });
        }
    } catch (error) {
        return res.json({
            status: false,
            message: "Internal server error",
        });
    }
});

module.exports = router;
