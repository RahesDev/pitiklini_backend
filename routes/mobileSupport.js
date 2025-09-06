var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");
let ObjectId = mongoose.Types.ObjectId;
var common = require("../helper/common");
var supportcategoryDB = require("../schema/supportcategory");
var supportDB = require("../schema/supportlist");
var moment = require("moment");

router.post("/ticket_list", common.tokenmiddleware, async (req, res) => {
  try {
    var perPage = Number(req.body.perpage ? req.body.perpage : 5);
    var page = Number(req.body.page ? req.body.page : 1);

    var skippage = perPage * page - perPage;
    let Details = await supportDB
      .find({userId: req.userId})
      .skip(skippage)
      .sort({_id: -1})
      .limit(perPage)
      .exec();

    if (Details) {
      var pagedata = await supportDB.find({userId: req.userId}).count();
      var returnObj = {
        data: Details,
        current: page,
        pages: Math.ceil(pagedata / perPage),
        total: pagedata,
      };
      return res.json({status: true, Message: "Detail show", data: returnObj});
    } else {
      return res.json({status: false, Message: "Please try again later"});
    }
  } catch (error) {
    console.log("12121212", error);
    return res.json({status: false, Message: "Internal error"});
  }
});

//get support category

router.get("/get_support_category", (req, res) => {
  try {
    supportcategoryDB
      .find({status: 1}, {category: 1})
      .sort({_id: -1})
      .exec(function (err, data) {
        if (err) {
          return res.json({
            status: false,
            message: "Something went wrong, Please try again later",
          });
        } else {
          return res.json({status: true, data: data});
        }
      });
  } catch (error) {
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/create_ticket", common.tokenmiddleware, (req, res) => {
  try {
    var user_id = req.userId;
    var body = {};
    body = req.body;
    console.log("support req===", body);
    if (body.Subject != "" && body.text != "" && body.Category !== "") {
      var obj = {
        userId: user_id,
        subject: body.Subject,
        message: body.text,
        category: body.Category,
        status: "0",
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      supportDB.create(obj, function (err, data) {
        console.log("support create error===", err);
        console.log("support create data===", data);
        if (data) {
          return res.json({
            status: true,
            Message:
              "Ticket raised successfully, Our Team will reply your ticket soon..",
          });
        } else {
          return res.json({
            status: false,
            Message: "Something went wrong, Please try again later.",
          });
        }
      });
    } else {
      return res.json({
        status: false,
        Message: "Please fill all the required fields",
      });
    }
  } catch (error) {
    console.log("support create error===", error);
    return res.json({
      status: false,
      Message: "Something went wrong, Please try again later.",
    });
  }
});

//get ticket
router.get("/get_ticket", common.tokenmiddleware, (req, res) => {
  try {
    var userId = req.userId;
    supportDB
      .aggregate([
        {
          $lookup: {
            from: "supportcategories",
            localField: "supportcategoryId",
            foreignField: "_id",
            as: "categorydata",
          },
        },
        {
          $unwind: {
            path: "$categorydata",
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
        {
          $match: {
            userId: ObjectId(userId),
          },
        },
        {
          $project: {
            subject: 1,
            status: 1,
            created_at: 1,
            category: "$categorydata.category",
          },
        },
      ])
      .exec((err, data) => {
        if (err) {
          return res.json({
            status: false,
            message: "Something went wrong, Please try again later",
          });
        } else {
          return res.json({status: true, data: data});
        }
      });
  } catch (error) {
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/supportList/chatview", common.tokenmiddleware, (req, res) => {
  try {
    //console.log("req.body=====",req.body);
    supportDB
      .aggregate([
        {
          $match: {
            _id: ObjectId(req.body._id),
          },
        },
        {
          $lookup: {
            from: "supportcategories",
            localField: "supportcategoryId",
            foreignField: "_id",
            as: "supportData",
          },
        },
        {
          $unwind: "$supportData",
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userData",
          },
        },
        {
          $unwind: "$userData",
        },
        // {
        //     $project: {
        //         "_id"       : 1,
        //         "created_at"  : 1,
        //         "updated_at"  : 1,
        //         "userId"      : 1,
        //         "supportcategoryId"  : 1,
        //         "message"     : 1,
        //         "image"        : 1,
        //         "status"    : 1,
        //         "reply"         : 1,
        //         "email"     : "$userData.email",
        //         "supportData" : "$supportData"
        //     }
        // }
      ])
      .exec((err, data) => {
        //console.log("datadatadatadata",data);
        //  console.log("errerr",err);
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          var userArray = [];
          for (let dval of data) {
            var obj = {
              _id: dval._id,
              created_at: dval.created_at,
              updated_at: dval.updated_at,
              userId: dval.userId,
              supportcategoryId: dval.supportcategoryId,
              message: dval.message,
              image: dval.image,
              status: dval.status,
              reply: dval.reply,
              email: common.decrypt(dval.userData.email),
              supportData: dval.supportData,
            };
            userArray.push(obj);
          }
          res.json({
            status: true,
            Message: userArray,
          });
        }
      });
  } catch (e) {
    console.log("catch support reply=====", e.message);
    res.json({
      status: false,
      Message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/supportList/update", common.tokenmiddleware, (req, res) => {
  try {
    supportDB
      .updateOne(
        {
          _id: req.body.chatId,
        },
        {
          $set: {
            status: req.body.status,
            updated_at: Date.now(),
          },
          $push: {
            reply: {
              message: req.body.message,
              image: req.body.image,
              tag: req.body.tag,
              posted_at: Date.now(),
            },
          },
        }
      )
      .exec((err, data) => {
        if (err) {
          res.json({
            status: false,
            Message: "Something Went Wrong. Please Try Again later",
          });
        } else {
          res.json({
            status: true,
            Message: "Support Added successfylly Plese wait for Admin reply",
          });
        }
      });
  } catch (e) {
    res.json({
      status: false,
      message: "Something went wrong, Please try again later",
    });
  }
});

router.post("/support_list", common.tokenmiddleware, async (req, res) => {
  try {
    let Details = await supportDB
      .find({userId: req.userId})
      .sort({_id: -1})
      .exec();

    if (Details) {
      if (Details.length > 0) {
        var supportlists = [];
        for (var i = 0; i < Details.length; i++) {
          var obj = {
            _id: Details[i]._id,
            subject: Details[i].subject,
            message: Details[i].message,
            category: Details[i].category,
            created_at: moment(Details[i].created_at).format(
              "YYYY-MM-DD, h:mm:ss a"
            ),
            updated_at: moment(Details[i].updated_at).format(
              "YYYY-MM-DD, h:mm:ss a"
            ),
          };
          supportlists.push(obj);
        }
        console.log("supportlists===", supportlists);
        return res.json({
          status: true,
          Message: "Detail show",
          data: supportlists,
        });
      }
    } else {
      return res.json({status: false, Message: "Please try again later"});
    }
  } catch (error) {
    console.log("supportlists catch===", error);
    return res.json({status: false, Message: "Internal server error"});
  }
});

router.post("/getSupportDetails", common.tokenmiddleware, async (req, res) => {
  try {
    console.log("-=-=-=-=-=-=-", req.body);
    let getSupport = await supportDB.findOne({_id: req.body._id}).exec();
    console.log(getSupport, "=-=-getSupport=-=-=-getSupport=-=-");
    if (getSupport) {
      return res.json({status: true, Message: getSupport});
    } else {
      return res.json({status: false, Message: {}});
    }
  } catch {
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

router.post("/closeTicket", common.tokenmiddleware, async (req, res) => {
  try {
    let getSupport = await supportDB
      .updateOne({_id: req.body._id}, {$set: {status: "1"}})
      .exec();
    if (getSupport) {
      return res.json({status: true, Message: "Your tiket has been closed"});
    } else {
      return res.json({status: false, Message: {}});
    }
  } catch {
    return res.json({
      status: false,
      Message: "Internal server error, Please try again later",
    });
  }
});

module.exports = router;
