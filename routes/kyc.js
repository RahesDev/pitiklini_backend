require("dotenv").config();
var express = require("express");
var router = express.Router();
var common = require("../helper/common");
const axios = require("axios");
var antiPhishing = require("../schema/antiphising");
var usersDB = require("../schema/users");
var mailtempDB = require("../schema/mailtemplate");
var verificationDB = require("../schema/VerificationAuto");
var mail = require("../helper/mailhelper");
var kycDB = require("../schema/kyc");
const async = require("async");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; 
const DATASPIKE_API_URL = "https://sandboxapi.dataspike.io/api/v3";
// const DATASPIKE_API_URL = "https://api.dataspike.io/api/v3";
const DATASPIKE_API_KEY = process.env.DATASPIKE_API_KEY;
// const REDIRECT_URL = "https://pitiklini.blfdemo.online/kyc"; // Redirect back to your website after verification
// const WEBHOOK_URL = "https://pitiklini.blfdemo.online:3033/kyc/webhook"; 
// const REDIRECT_URL = "https://localhost:3000/kyc";
// const WEBHOOK_URL = "https://localhost:3032/kyc/webhook"; 
const REDIRECT_URL = "https://pitiklini.com/kyc";
const WEBHOOK_URL = "https://pitiklini.com/kyc/webhook"; 

const userRedis = require('../redis-helper/userRedis');
//USER SIDE  =========================================


router.post("/savekyc",common.isEmpty, common.tokenmiddleware, async (req, res) => {

  try {
    if(req.body.fullname && req.body.dob && req.body.nationality && req.body.residential && req.body.verfiType && req.body.frontDoc && req.body.backDoc && req.body.selfieDoc){
      var findUser = await usersDB.findOne({_id: req.userId},{kycstatus : 1, status : 1, verifyEmail : 1, loginStatus : 1}).exec();
      console.log("findUser",findUser);
      if(findUser){
        if(findUser.verifyEmail == 0){
          return res.json({status: true, Message: "Your account is not activated. Please verify to continue"});
        }else if(findUser.loginStatus == 1){
          return res.json({status: false, Message: "Your account is disabled. Please contact admin for assistance."});
        }else if(findUser.kycstatus == 1){
          return res.json({status: false, Message: "Your KYC verification has already been completed. Thank you for your cooperation!"});
        }else{
          var obj = {
            fullname : req.body.fullname,
            dob : req.body.dob,
            nationality : req.body.nationality,
            residential : req.body.residential,
            verfiType : req.body.verfiType,
            frontDoc : req.body.frontDoc,
            backDoc : req.body.backDoc,
            selfieDoc : req.body.selfieDoc,
            kycStatus : 2
          }
          let kycRecord = await kycDB.updateOne({userId : req.userId},{ $set: obj}, { upsert: true });
          if(kycRecord){
            let findUser = await usersDB.updateOne({_id : req.userId}, { $set : {kycstatus : 2} }).exec();
            if(findUser){
              userRedis.getUser(req.userId, function (datas){
                if(datas) {
                  return res.json({status: true, Message: "Success! Your KYC details have been successfully updated. We are reviewing your information, and you will hear from us soon. Thank you for your patience.."});
                }else{
                  return res.json({ status : false, Message : {} });
                }
              });
            }else{
              return res.json({status: false, Message: "Oops!, Please try later"});
            }
          }else{
            return res.json({status: false, Message: "Oops!, Please try later"});

          }
        }
      }else{
        return res.json({status: false, Message: "Oops! Invalid authorization. Please verify your details and try again later"});
      }
    }else{
      return res.json({status: false, Message: "Oops! Some information is missing. Please check and try again."});
    }
  } catch (error) {
    console.log("errorerrorerror", error);
    return res.json({status: false, Message: "Oops!, Something went wrong"});
  }
});


router.get("/getkyc", common.tokenmiddleware, (req, res) => {
  try {
    async.parallel(
      {
        userDetails: function (cb) {
          usersDB
            .findOne(
              {_id: req.userId},
              {kycstatus: 1}
            )
            .exec(cb);
        },
        kycDetails: function (cb) {
          kycDB
            .findOne(
              {userId: req.userId}
            )
            .exec(cb);
        },
      },
      (err, data) => {
        console.log(data,'=--=-=-data=-=-=-data-=-=-');
        if (data && typeof data.userDetails != "undefined") {
          return res.json({status: true, datas: data,});
        } else {
          return res.json({status: false, datas: []});
        }
      }
    );
  } catch (error) {
    res.json({status: false, Message: "Internel server error", code: 500});
  }
});


router.post("/savekycs", common.isEmpty, common.tokenmiddleware, (req, res) => {
  try {
    if (
      req.body.addressProof != null &&
      req.body.addressProof != undefined &&
      req.body.addressProof != "" &&
      req.body.idproof != null &&
      req.body.idproof != undefined &&
      req.body.idproof != "" &&
      req.body.photoproof != null &&
      req.body.photoproof != undefined &&
      req.body.photoproof != ""
    ) {
      usersDB
        .findOne(
          {_id: req.userId},
          {
            username: 1,
            email: 1,
            kycstatus: 1,
            status: 1,
            verifyEmail: 1,
            _id: 1,
            mobileNumber: 1,
          }
        )
        .exec((err, data) => {
          if (!err) {
            if (data.status == 0) {
              res.json({
                status: false,
                Message: "Your account not verified",
                code: 200,
              });
            } else {
              var updateKyc = {
                proof1: req.body.addressProof,
                proof2: req.body.idproof,
                proof3: req.body.photoproof,
                kycStatus: 2,
              };
              var kycCreate = {
                proof1: req.body.addressProof,
                proof2: req.body.idproof,
                proof3: req.body.photoproof,
                email: data.email != null ? data.email : "",
                username: data.username,
                userId: req.userId,
                kycStatus: 2,
              };
              kycDB.findOne({userId: req.userId}).exec((err, kycData) => {
                if (kycData) {
                  kycDB
                    .updateOne({userId: req.userId}, {$set: updateKyc})
                    .exec((updateError, updatedData) => {
                      if (!updateError) {
                        res.json({
                          status: true,
                          Message:
                            "KYC details have been successfully updated. Kindly await approval from the admin",
                          code: 200,
                        });
                        usersDB
                          .updateOne({_id: req.userId}, {$set: {kycstatus: 2}})
                          .exec((err, data) => {});
                      } else {
                        res.json({
                          status: false,
                          Message: "Please try later",
                          code: 200,
                        });
                      }
                    });
                } else {
                  kycDB.create(kycCreate, (creErr, creaData) => {
                    if (!creErr) {
                      res.json({
                        status: true,
                        Message:
                          "Kyc details uploded successfully, Please wait for admin approve",
                        code: 200,
                      });
                      usersDB
                        .updateOne({_id: req.userId}, {$set: {kycstatus: 2}})
                        .exec((err, data) => {});
                    } else {
                      res.json({
                        status: false,
                        Message: "Please try later",
                        code: 200,
                      });
                    }
                  });
                }
              });
            }
          } else {
            res.json({status: false, Message: "User not found", code: 401});
          }
        });
    } else {
      res.json({
        status: false,
        Message: "All fields are required",
        code: 200,
      });
    }
  } catch (error) {
    res.json({status: false, Message: "Internel server error", code: 500});
  }
});

router.post(
  "/create-verification-session",
  common.tokenmiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;

      const findUser = await usersDB
        .findOne({ _id: userId }, { kycstatus: 1, status: 1, verifyEmail: 1, loginStatus: 1, applicantId: 1 })
        .exec();

      console.log("User Found:", findUser);

      if (!findUser) {
        return res.status(404).json({ status: false, message: "User not found" });
      }

      if (findUser.verifyEmail == 0) {
        return res.status(400).json({ status: false, message: "Your account is not activated. Please verify to continue" });
      }

      if (findUser.loginStatus == 1) {
        return res.status(403).json({ status: false, message: "Your account is disabled. Please contact admin for assistance." });
      }

      if (findUser.kycstatus == 1) {
        return res.status(400).json({ status: false, message: "Your KYC verification has already been completed. Thank you for your cooperation!" });
      }

      if (!DATASPIKE_API_KEY) {
        console.error("DataSpike API Key is missing");
        return res.status(500).json({ status: false, message: "Missing DataSpike API Key" });
      }
      let applicantId = findUser.applicantId;

      if (!applicantId) {
        const headers = {
          "ds-api-token": DATASPIKE_API_KEY, 
          "Content-Type": "application/json",
        };
        const applicantResponse = await axios.post(
          `${DATASPIKE_API_URL}/applicants`,
          { external_id: userId },
          { headers }
        );
        applicantId = applicantResponse.data.id;
        await usersDB.findByIdAndUpdate(userId, { applicantId }); 
      }

      const headers = {
        "ds-api-token": DATASPIKE_API_KEY, 
        "Content-Type": "application/json",
      };
      const response = await axios.post(
        `${DATASPIKE_API_URL}/verifications`,
        {
          applicant_id: applicantId,
          redirect_url: REDIRECT_URL,
          webhook_url: WEBHOOK_URL,
          document_types: ["passport", "driver_license", "id_card"], 
          selfie_check: true, 
        },
        { headers },
      );
      // console.log(
      //   "userId -- ", userId,
      //   "REDIRECT_URL -- ", REDIRECT_URL,
      //   "WEBHOOK_URL -- ", WEBHOOK_URL,
      //   "headers -- ", headers,
      //   "total response send -- ", response, 
      // );
      console.log("DataSpike Verification Created:", response.data);

      const { id, verification_url } = response.data;

      return res.status(201).json({
        status: true,
        message: "Verification session created successfully",
        sessionId: id,
        url: verification_url, 
      });
    } catch (error) {
      console.error(" Error in Verification Session:", error.response?.data || error.message);
      res.status(500).json({ status: false, message: "Internal server error", code: 500 });
    }
  }
);


router.post("/webhook", async (req, res) => {
  try {
    
    const { payload } = req.body;
    const { applicant_id, external_id, status, checks } = payload;
    // console.log(" webhook req.body payload -- ", payload);
    
    await usersDB.findOneAndUpdate(
      { applicantId: applicant_id },
      { kycstatus: 1 }
    );

    const verification = new verificationDB({
      applicant_id,
      external_id,
      document_type: payload.document_type,
      organization_id: payload.organization_id,
      created_at: payload.created_at,
      completed_at: payload.completed_at,
      verification_url: payload.verification_url,
      verification_url_id: payload.verification_url_id,
      expires_at: payload.expires_at,
      checks: payload.checks,
      documents: payload.documents,
      poi_data: payload.poi_data,
      details: payload.details,
    });

    await verification.save();

    let getuser = await usersDB.findOne({ _id: external_id });
    if (!getuser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

        const userId = getuser._id.toString();
        userRedis.getUser(userId, function (datas) {
          if (datas) {
            console.log("Redis updated for user:", userId);
          } else {
            console.log("Redis update failed for user:", userId);
          }
        });

    const USERNAME = getuser.displayname;

    let findDetails = await antiPhishing.findOne({ userid: external_id });
    const APCODE = `Antiphishing Code - ${findDetails ? findDetails.APcode : ""}`;

    let resData = await mailtempDB.findOne({ key: "KYC-APPROVED" });
    if (!resData) {
      return res.status(404).json({ success: false, message: "Email template not found" });
    }

    let etempdataDynamic = resData.body
      .replace(/###USERNAME###/g, USERNAME)
      .replace(/###APCODE###/g, findDetails && findDetails.Status === "true" ? APCODE : "");

    await mail.sendMail({
      from: {
        name: process.env.FROM_NAME,
        address: process.env.FROM_EMAIL,
      },
      to: common.decrypt(getuser.email),
      subject: resData.Subject,
      html: etempdataDynamic,
    });

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});



// router.post("/webhook", async (req, res) => {
//   try {
    

//     const { payload } = req.body;
//     const { applicant_id, external_id, status, checks } = payload;

//     const errorMessages = [];

//     if (checks?.liveness?.status === "failed") {
//       errorMessages.push(...checks.liveness.errors.map(err => `Liveness Check: ${err.message}`));
//     }

//     if (checks?.document_mrz?.status === "failed") {
//       errorMessages.push(...checks.document_mrz.errors.map(err => `MRZ Check: ${err.message}`));
//     }

//     if (checks?.face_comparison?.status === "failed") {
//       errorMessages.push(...checks.face_comparison.errors.map(err => `Face Comparison: ${err.message}`));
//     }

   
//     await usersDB.findOneAndUpdate(
//       { applicantId: applicant_id },
//       {
//         kycstatus: status === "approved" ? 1 : 0,
//       }
//     );

//     const verification = new verificationDB({
//       applicant_id: webhookData.payload.applicant_id,
//       external_id: webhookData.payload.external_id,
//       status: webhookData.payload.status,
//       document_type: webhookData.payload.document_type,
//       organization_id: webhookData.payload.organization_id,
//       created_at: webhookData.payload.created_at,
//       completed_at: webhookData.payload.completed_at,
//       verification_url: webhookData.payload.verification_url,
//       verification_url_id: webhookData.payload.verification_url_id,
//       expires_at: webhookData.payload.expires_at,
//       checks: webhookData.payload.checks,
//       documents: webhookData.payload.documents,
//       poi_data: webhookData.payload.poi_data,
//       details: webhookData.payload.details,
//     });

//     await verification.save();


//     let getuser = await usersDB.findOne(
//           { _id: external_id });
    
//           var USERNAME = getuser.displayname;
//           var findDetails = await antiPhishing.findOne({ userid: userId });
//           var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`
    
//           let resData = await mailtempDB.findOne({ key: "KYC-APPROVED" });
//           var etempdataDynamic = resData.body
//           .replace(/###USERNAME###/g, USERNAME)
//           .replace(/###APCODE###/g, findDetails && findDetails.Status == "true" ? APCODE : "");
    
//           var mailRes = await mail.sendMail(
//             {
//               from: {
//                 name: process.env.FROM_NAME,
//                 address: process.env.FROM_EMAIL,
//               },
    
//               to: common.decrypt(getuser.email),
//               subject: resData.Subject,
//               html: etempdataDynamic,
//             });

//          return res.status(200).json({ success: true, message: "Webhook processed successfully" });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: "Webhook processing failed" });
//   }
// });




// router.post(
//   "/create-verification-session",
//   common.tokenmiddleware,
//   async (req, res) => {
//     try {
//       const userId = req.userId; // Fixing incorrect userId extraction
      
//       const findUser = await usersDB.findOne(
//         { _id: userId },
//         { kycstatus: 1, status: 1, verifyEmail: 1, loginStatus: 1 }
//       ).exec();
      
//       console.log("findUser:", findUser);

//       if (!findUser) {
//         return res.json({ status: false, Message: "User not found" });
//       }

//       if (findUser.verifyEmail == 0) {
//         return res.json({
//           status: false,
//           Message: "Your account is not activated. Please verify to continue",
//         });
//       } else if (findUser.loginStatus == 1) {
//         return res.json({
//           status: false,
//           Message: "Your account is disabled. Please contact admin for assistance.",
//         });
//       } else if (findUser.kycstatus == 1) {
//         return res.json({
//           status: false,
//           Message: "Your KYC verification has already been completed. Thank you for your cooperation!",
//         });
//       }

//       // Stripe API Call - Wrapped in try/catch for better debugging
//       try {
//         console.log("Creating Stripe session for user:", userId);

//         const session = await stripe.identity.verificationSessions.create({
//           type: "document",
//           metadata: { userId },
//           options: {
//             document: { allowed_types: ["driving_license", "passport", "id_card"] },
//           },
//           // return_url: process.env.VERIFICATION_RETURN_URL || "http://localhost:3000",
//         });

//         console.log("Stripe Session Created:", session);

//         const sessionDetails = await stripe.identity.verificationSessions.retrieve(session.id);
//         console.log("Session Details:", sessionDetails);

//         return res.status(201).json({
//           status: true,
//           message: "Verification session created successfully",
//           sessionId: session.id,
//           url: session.url,
//           verificationStatus: sessionDetails.status,
//         });
//       } catch (stripeError) {
//         console.error("Stripe Error:", stripeError);
//         return res.status(500).json({ status: false, Message: "Stripe API Error", error: stripeError });
//       }
//     } catch (error) {
//       console.error("Internal Server Error:", error);
//       return res.status(500).json({ status: false, Message: "Internal server error", error });
//     }
//   }
// );


// router.post("/webhook", async (req, res) => {
//   try {
//     const event = req.body;
//     // Validations
//     if (!event || !event.type || !event.data || !event.data.object) {
//       return res
//         .status(400)
//         .json({ status: false, message: "Invalid webhook event structure" });
//     }

//     const session = event.data.object;

//     if (event.type === "identity.verification_session.verified") {
//       const session = event.data.object;

//       if (!session.metadata || !session.metadata.userId) {
//         return res
//           .status(400)
//           .json({ status: false, message: "Missing userId in metadata" });
//       }

//       if (!session.verified_outputs) {
//         return res
//           .status(400)
//           .json({ status: false, message: "Missing verified outputs" });
//       }

//       const verificationData = {
//         userId: session.metadata.userId,
//         verificationId: session.id,
//         status: session.status,
//         documentType: session.verified_outputs.document?.type || "Unknown",
//         documentCountry:
//           session.verified_outputs.document?.country || "Unknown",
//         firstName: session.verified_outputs.first_name || "Unknown",
//         lastName: session.verified_outputs.last_name || "Unknown",
//         dob: session.verified_outputs.dob || "Unknown",
//       };

//       let kycRecord = await VerificationAuto.create(verificationData);
//       if (kycRecord) {
//         let findUser = await usersDB
//           .updateOne(
//             { _id: session.metadata.userId },
//             { $set: { kycstatus: 2 } }
//           )
//           .exec();
//         if (findUser) {
//           userRedis.getUser(req.userId, function (datas) {
//             if (datas) {
//               return res.json({
//                 status: true,
//                 Message:
//                   "Success! Your KYC details have been successfully updated. We are reviewing your information, and you will hear from us soon. Thank you for your patience..",
//               });
//             } else {
//               return res.json({ status: false, Message: {} });
//             }
//           });
//         } else {
//           return res.json({
//             status: false,
//             Message: "Oops!, Please try later",
//           });
//         }
//       } else {
//         return res.json({ status: false, Message: "Oops!, Please try later" });
//       }
//     } 
    
//   } catch (error) {
//     res.status(400).send("Webhook error");
//   }
// });


// router.post("/kyc/webhook", async (req, res) => {
//   try {
//     const sig = req.headers["stripe-signature"];
//     const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

//     let event;
//     try {
//       event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//     } catch (err) {
//       return res.status(400).json({ status: false, message: "Invalid signature" });
//     }


//     const session = event.data.object;

//     if (event.type === "identity.verification_session.verified") {

//       if (!session.metadata || !session.metadata.userId) {
//         return res.status(400).json({ status: false, message: "Missing userId in metadata" });
//       }

//       if (!session.verified_outputs) {
//         return res.status(400).json({ status: false, message: "Missing verified outputs" });
//       }

//       const verificationData = {
//         userId: session.metadata.userId,
//         verificationId: session.id,
//         status: session.status,
//         documentType: session.verified_outputs.document?.type || "Unknown",
//         documentCountry: session.verified_outputs.document?.country || "Unknown",
//         firstName: session.verified_outputs.first_name || "Unknown",
//         lastName: session.verified_outputs.last_name || "Unknown",
//         dob: session.verified_outputs.dob || "Unknown",
//       };

//       let kycRecord = await VerificationAuto.create(verificationData);

//       if (kycRecord) {
//         // await usersDB.updateOne({ _id: session.metadata.userId }, { $set: { kycstatus: 2 } });

//         return res.json({
//           status: true,
//           message: "Success! KYC details updated. Under review.",
//         });
//       } else {
//         return res.json({ status: false, message: "Database error. Try again." });
//       }
//     } else {
//       return res.status(200).send("Webhook received but ignored.");
//     }
//   } catch (error) {
//     return res.status(400).send("Webhook error");
//   }
// });


router.get("/getkyc", common.tokenmiddleware, (req, res) => {
  try {
    async.parallel(
      {
        userDetails: function (cb) {
          usersDB
            .findOne(
              {_id: req.userId},
              {username: 1, kycstatus: 1, verifyEmail: 1, status: 1}
            )
            .exec(cb);
        },
        kycDetails: function (cb) {
          kycDB
            .findOne(
              {userId: req.userId},
              {
                proof1: 1,
                proof2: 1,
                proof3: 1,
                IdNumber: 1,
                prrof1status: 1,
                prrof2status: 1,
                prrof3status: 1,
                prrof1reject: 1,
                prrof2reject: 1,
                prrof3reject: 1,
                rejectReson: 1,
                kycStatus: 1,
                name: 1,
                mobile_number: 1,
                kyc_email: 1,
              }
            )
            .exec(cb);
        },
      },
      (err, data) => {
        if (data && typeof data.userDetails != "undefined") {
          return res.json({status: true, datas: data,});
        } else {
          return res.json({status: false, datas: []});
        }
      }
    );
  } catch (error) {
    res.json({status: false, Message: "Internel server error", code: 500});
  }
});


//ADMIN SIDE ================================================

router.post("/admin/getKyclist", async (req, res) => {
  try {
    console.log(req.body,'=-=-=-=-=-=-=-');
    var perPage = Number(req.body.pageSize ? req.body.pageSize : 0);
    var page = Number(req.body.currentPage ? req.body.currentPage : 0);
    if (
      typeof perPage !== "undefined" &&
      perPage !== "" &&
      perPage > 0 &&
      typeof page !== "undefined" &&
      page !== "" &&
      page > 0
    ) {
      var skippage = perPage * page - perPage;
      var kyc_details_count = await kycDB.find().countDocuments().exec();
      if (kyc_details_count > 0) {
        var kyc_details = await kycDB
          .find()
          .skip(skippage)
          .limit(perPage)
          .exec();

        var kyclist = [];
        for (let item of kyc_details) {
          console.log(item, "details-=-=-=-=-=details");
          var obj = {
            username: item.username,
            email:
              item.email != "" ? common.decrypt(item.email) : item.mobileNumber,
            proof1: item.proof1,
            proof2: item.proof2,
            proof3: item.proof3,
            IdNumber: item.IdNumber,
            rejectReson: item.rejectReson,
            userId: item.userId,
            _id: item._id,
            kycStatus: item.kycStatus,
            created_at: item.created_at,
            prrof1status: item.prrof1status,
            prrof2status: item.prrof2status,
            prrof3status: item.prrof3status,
          };
          kyclist.push(obj);
        }
        res.json({
          status: true,
          data: kyclist,
          count: kyc_details_count,
          pages: Math.ceil(kyc_details_count / perPage),
        });
      } else {
        res.json({
          status: false,
          data: [],
        });
      }
    } else {
      return res.json({
        status: false,
        Message: "Please Enter pagination value",
      });
    }
  } catch (error) {
    console.log("error kyc data==", error);
    return res.json({
      status: false,
      Message: "Internal server error",
      code: 500,
    });
  }
});

router.post("/admin/kycAproove", common.tokenmiddleware, (req, res) => {
  try {
    usersDB
      .updateOne({_id: req.body.userId}, {$set: {kycstatus: 1}})
      .exec((err, data) => {
        if (!err) {
          kycDB
            .updateOne(
              {_id: req.body._id},
              {$set: {kycStatus: 1, approveReson: "valid"}}
            )
            .exec((errs, datas) => {
              if (!err) {
                usersDB
                  .findOne({_id: req.body.userId}, {kycstatus: 1})
                  .exec((err, datasgot) => {
                    userRedis.getUser(req.body.userId, function (datas){
                      if(datas) {
                        return res.json({
                          status: true,
                          Message: "Kyc approved successfully",
                          data: datasgot,
                          code: 200,
                        });
                      }else{
                        return res.json({ status: false ,
                          Message: "Something went wrong , please try again later",
                          data: {},
                          code: 200, });
                      }
                    });
                  });
              }
            });
        } else {
          return res.json({
            status: false,
            Message: "Please try later",
            code: 200,
          });
        }
      });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Internal server error",
      code: 500,
    });
  }
});

router.post("/admin/kycReject", (req, res) => {
  try {
    const { userId, _id } = req.body;

    usersDB
      .updateOne({_id: userId}, {$set: {kycstatus: 3}})
      .exec((err, data) => {
        if (!err) {
          kycDB
            .updateOne(
              {_id},
              {
                $set: {
                  kycStatus: 3,
                  rejectReson: req.body.reason,
                },
              }
            )
            .exec((errs, datas) => {
              usersDB
              .updateOne({_id: userId}, 
                {
                  $set: {kycstatus: 3}})
             
              if (!errs) {
                userRedis.getUser(userId, function (datas){
                  if(datas) {
                    return res.json({
                      status: true,
                      Message: "Kyc rejected successfully",
                      code: 200,
                    });
                  }else{
                    return res.json({ status: false,
                      Message: "Something went wrong , please try again later",
                      code: 200, });
                  }
                });
              
              }
            });
        } else {
          return res.json({
            status: false,
            Message: "Please try later",
            code: 200,
          });
        }
      });
  } catch (error) {
    return res.json({
      status: false,
      Message: "Internal server error",
      code: 500,
    });
  }
});

//MOBILE SIDE==========================================
router.post("/mobile_savekyc", common.tokenmiddleware, (req, res) => {
  try {
    if (
      req.body.addressProof != null &&
      req.body.addressProof != undefined &&
      req.body.addressProof != "" &&
      req.body.idproof != null &&
      req.body.idproof != undefined &&
      req.body.idproof != "" &&
      req.body.photoproof != null &&
      req.body.photoproof != undefined &&
      req.body.photoproof != ""
    ) {
      usersDB
        .findOne(
          {_id: req.userId},
          {
            username: 1,
            email: 1,
            kycstatus: 1,
            status: 1,
            verifyEmail: 1,
            _id: 1,
            mobileNumber: 1,
          }
        )
        .exec((err, data) => {
          if (!err) {
            if (data.status == 0) {
              res.json({
                status: false,
                Message: "Your account not verified",
                code: 200,
              });
            } else {
              var updateKyc = {
                proof1: req.body.addressProof,
                proof2: req.body.idproof,
                proof3: req.body.photoproof,
                kycStatus: 2,
              };
              var kycCreate = {
                proof1: req.body.addressProof,
                proof2: req.body.idproof,
                proof3: req.body.photoproof,
                email: data.email != null ? data.email : "",
                username: data.username,
                userId: req.userId,
                kycStatus: 2,
              };
              kycDB.findOne({userId: req.userId}).exec((err, kycData) => {
                if (kycData) {
                  kycDB
                    .updateOne({userId: req.userId}, {$set: updateKyc})
                    .exec((updateError, updatedData) => {
                      if (!updateError) {
                        res.json({
                          status: true,
                          Message:
                            "Kyc details updated successfully, Please wait for admin approve",
                          code: 200,
                        });
                        usersDB
                          .updateOne({_id: req.userId}, {$set: {kycstatus: 2}})
                          .exec((err, data) => {});
                      } else {
                        res.json({
                          status: false,
                          Message: "Please try later",
                          code: 200,
                        });
                      }
                    });
                } else {
                  kycDB.create(kycCreate, (creErr, creaData) => {
                    if (!creErr) {
                      res.json({
                        status: true,
                        Message:
                          "Kyc details uploded successfully, Please wait for admin approve",
                        code: 200,
                      });
                      usersDB
                        .updateOne({_id: req.userId}, {$set: {kycstatus: 2}})
                        .exec((err, data) => {});
                    } else {
                      res.json({
                        status: false,
                        Message: "Please try later",
                        code: 200,
                      });
                    }
                  });
                }
              });
            }
          } else {
            res.json({status: false, Message: "User not found", code: 401});
          }
        });
    } else {
      res.json({
        status: false,
        Message: "All fields are required",
        code: 200,
      });
    }
  } catch (error) {
    console.log(error, "0909090");
    res.json({status: false, Message: "Internel server error", code: 500});
  }
});

router.get("/mobile_getkyc", common.tokenmiddleware, (req, res) => {
  try {
    async.parallel(
      {
        userDetails: function (cb) {
          usersDB
            .findOne(
              {_id: req.userId},
              {username: 1, kycstatus: 1, verifyEmail: 1, status: 1}
            )
            .exec(cb);
        },
        kycDetails: function (cb) {
          kycDB
            .findOne(
              {userId: req.userId},
              {
                proof1: 1,
                proof2: 1,
                proof3: 1,
                IdNumber: 1,
                prrof1status: 1,
                prrof2status: 1,
                prrof3status: 1,
                prrof1reject: 1,
                prrof2reject: 1,
                prrof3reject: 1,
                rejectReson: 1,
                kycStatus: 1,
                name: 1,
                mobile_number: 1,
                kyc_email: 1,
              }
            )
            .exec(cb);
        },
      },
      (err, data) => {
        if (data && typeof data.userDetails != "undefined") {
          return res.json({status: true, datas: data});
        } else {
          return res.json({status: false, datas: []});
        }
      }
    );
  } catch (error) {
    res.json({status: false, Message: "Internel server error", code: 500});
  }
});


module.exports = router;
