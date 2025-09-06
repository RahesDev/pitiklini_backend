var express = require("express");
var router = express.Router();
var common = require("../helper/common");
var usersDB = require("../schema/users");
var kycDB = require("../schema/kyc");
const async = require("async");
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
