const twilio = require('twilio');


const accountSid = process.env.ACCOUNT_SID ; // Your Account SID from www.twilio.com/console
const authToken =  process.env.AUTHTOKEN; // Your Auth Token from www.twilio.com/console

const client = new twilio(accountSid, authToken);



exports.sendSMS  =  async (toMobile, newTemplate, cb)   => {
    client.messages.create({ body: newTemplate, to: toMobile, from: process.env.MOBILENUMBER }, function (err, resData) {
        if (err) {
            cb({ 'status': false, 'message': err });
        }
        else {
            cb({ "status": true, "data": resData });
        }
    });
}
