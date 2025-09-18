const nodemailer = require("nodemailer");
const sgTransport = require("nodemailer-sendgrid-transport");
const common = require("./common");
const sitesettingsDB = require("../schema/sitesettings");
const key = require("../config/key");
const api_key = key.sendgrid_api;
const from_mail = process.env.FROM_EMAIL;
const axios = require('axios');

const transporter = nodemailer.createTransport({
  secure: false,
  port: process.env.EMAIL_PORT,
  host: process.env.EMAIL_HOST,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.sendEMail = function (mailRequest) {
  return new Promise(function (resolve, reject) {
    transporter.sendMail(mailRequest, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve("The message was sent!");
      }
    });
  });
};


const sendSmsOtp = async () => {
  const apiKey = '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'; // Replace with your Brevo API key
  const senderName = 'JD'; 
  const message = `Your OTP is: ${1234}`;
const  mobileNumber= 7010889149
  const data = {
    sender: senderName,
    recipient: mobileNumber,
    content: message,
    type: 'transactional'
  };

  try {
    const response = await axios.post('https://api.brevo.com/v3/transactionalSMS/sms', data, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('SMS sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending SMS:', error.response ? error.response.data : error.message);
  }
};

// Example usage:
// const mobileNumber = '1234567890'; // Replace with the recipient's mobile number
// const otp = Math.floor(100000 + Math.random() * 900000); // Generate a random 6-digit OTP
// sendSmsOtp(mobileNumber, otp);


// module.exports = {
// 	sendMail : function(values,callback){
// 		sitesettingsDB.findOne({},function(err,sitedata){
// 			var config  = sitedata;
// 			// values.html = values.html.replace(/###FBLINK###/g, config.fb_url).replace(/###DRIBBLE###/g, config.dribble_url).replace(/###INSTALINK###/g, config.insta_url).replace(/###LOGO###/g, config.siteLogo).replace(/###SITENAME###/g, config.siteName).replace(/###COPYRIGHTS###/g, config.copy_right_text);

// 			var maildata = {};
// 				maildata = getmailhelperdetails();

// 			var transporter = nodemailer.createTransport(sgTransport({
// 				auth: {
// 					api_key: maildata.api_key
// 				}
// 			}));

// 			var mailOptions = {
// 				from: maildata.email,
// 				to: values.to,
// 				subject: values.subject,
// 				html: values.html
// 			};
// 			transporter.sendMail(mailOptions, function(error, info){
// 				if (error) {
// 					console.log(error);
// 				}else{
// 					callback(true);
// 				}
// 				console.log(info)
// 			});
// 		});
// 	}
// };

// function getmailhelperdetails(){
// 	var mailhelperdata = {};
// 	    mailhelperdata.api_key = api_key;
// 	    mailhelperdata.email = from_mail;
// 	return mailhelperdata;
// }


// // Create transporter using SendGrid
// const transporter = nodemailer.createTransport(sgTransport({
//   auth: {
//     api_key: api_key
//   }
// }));



// Main function to send an email
const sendMail = async (options) => {
  console.log(options, "dadsfasdfasdfasdfasdfas")
  try {
    const mailOptions = {
      // from:  { name: process.env.FROM_NAME, address: process.env.FROM_EMAIL }, // Sender address
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: options.to, // List of recipients
      subject: options.subject, // Subject line
      html: options.html // HTML body
    };

    // Send email using the transporter
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", result);
    return result;
    // return {status:true}
  } catch (error) {
    console.error("Error sending email: ", error);
    throw error;
  }

  //  try {
  //     const response = await axios.post(
  //       'https://api.brevo.com/v3/smtp/email',
  //       {
  //         sender: {
  //           name: process.env.FROM_NAME,
  //           email: process.env.FROM_EMAIL
  //         },
  //         to: [
  //           {
  //             email: options.to,
  //             name: 'John Doe'
  //           }
  //         ],
  //         subject: options.subject,
  //         htmlContent: options.html
  //       },
  //       {
  //         headers: {
  //           // Accept: 'application/json',
  //           'Content-Type': 'application/json',
  //           'api-key': process.env.BREVO_APIKEY
  //         }
  //       }
  //     );
  
  //     console.log('Email sent successfully:', response.data);

  //     if(response.data != null)
  //     {
  //       return true;
  //     }
  //   } catch (error) {
  //     console.error('Error sending email:', error.response ? error.response.data : error.message);
  //     return false;
  //   }
};





module.exports = {
  sendMail,
  sendSmsOtp,
  transporter
};
