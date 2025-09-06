var express = require('express');
var router = express.Router();
const ipblock = require('../schema/ipblock.model');

//----------------------GET BLOCKED IP LIST-------------AUTH-MUNEESH-----------------------//

router.get('/getblockedip', (req, res) => {
    try {
        ipblock.find().exec((err, data) => {
            if (err) {
                res.status(400).json({ status: false, Message: 'Something Went Wrong. Please Try Again later'})
            } else {
                res.status(200).json({ status: true, result: data, Message: 'Retrieved data Successfully'})
            }
        })
    } catch (e) {
        res.status(500).json({ status: false, Message: 'Something Went Wrong. Please Try Again later' })
    }
});
//----------------------DELETE BLOCKED IP INDIVIDUALLY-------------AUTH-MUNEESH-----------------------//

router.post('/deleteblockedip', function (req, res) {
    try {
        ipblock.deleteOne({ _id: req.body._id }, function (err, data) {
            if (err) {
                res.status(400).json({ status: false, Message: 'Something Went Wrong. Please Try Again later'})
            } else {
                res.status(200).json({ status: true,Message: data, Message:"IP Address Unblocked" })
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, Message: 'Something Went Wrong. Please Try Again later' })
    }
});


//----------------------ADD NEW  IP TO BLOCKED -------------AUTH-MUNEESH-----------------------//

router.post('/insertblockedip', (req, res) => {
    try {
        var curr = {
            ip_address: req.body.ipaddressvalue,
            createdDate: Date.now(),
            modifiedDate: Date.now(),
        }
        ipblock.findOne({ 'ip_address': req.body.ipaddressvalue }).exec((err, ipdetails) => {
            if (err) {
                res.status(400).json({ status: false, Message: "Please try again later",})
            } else {
                if (ipdetails) {
                    res.status(400).json({ status: false, ipdetails: ipdetails, Message: 'Already exists!' })
                } else if (ipdetails == null || ipdetails == undefined) {
                    // var ipv6 = (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(curr.ip_address));
                    var ipv4 = (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(curr.ip_address))
                    if(  ipv4){
                        ipblock.create(curr, (err, data) => {
                            if (err) {
                                res.status(400).json({ status: false, Message: 'Something Went Wrong. Please Try Again later'})
                            } else {
                                res.status(200).json({ status: true, ipdetails: ipdetails, Result: data ,Message: 'IP Address Blocked'})
                            }
                        })
                    }else{
                        res.json({ status: false, Message: 'IP Address Invalid'})
                    }
                }
            }
        })
    } catch (e) {
        res.status(500).json({ status: false, Message: 'Something Went Wrong. Please Try Again later' })
    }
});

module.exports = router;
