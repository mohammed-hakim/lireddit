// "use strict";
// import nodemailer from "nodemailer";

// // async..await is not allowed in global scope, must use a wrapper
// export async function sendEmail(to:string , html : string) {

//     //   let testAccount = await nodemailer.createTestAccount();
//     //     console.log('test : ',testAccount);

//     let testAccount = {
//         user: 'hm5u6phd3zufrabd@ethereal.email',
//         pass: 'JJ5xp7c25jPtWeJtUw',
//     }
    
//   // create reusable transporter object using the default SMTP transport

  
//   let transporter = nodemailer.createTransport({
//     host: "smtp.ethereal.email",
//     port: 587,
//     secure: false, // true for 465, false for other ports
//     auth: {
//       user: testAccount.user, // generated ethereal user
//       pass: testAccount.pass, // generated ethereal password
//     },
//   });

  

//   // send mail with defined transport object
//   let info = await transporter.sendMail({
//     from: '"Fred Foo 👻" <foo@example.com>',
//     to,
//     subject: "Hello ✔", 
//     html
//   });


  

//   console.log("Message sent: %s", info.messageId);
//   // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

//   // Preview only available when sending through an Ethereal account
//   console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
//   // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...

// }


import { resetPassTemplate } from './resetPass.template';
import nodemailer from 'nodemailer';

export async function sendEmail(to: string, text: string) {
  var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      // user: 'godev88pro@gmail.com',
      // pass: 'hakimdev88$$2',
      type: 'OAuth2',
      user: 'godev88pro@gmail.com',
      clientId: '255504928021-tgcc197tabh3tjhaq090vuap3i3ddu1c.apps.googleusercontent.com',
      clientSecret: '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',
      refreshToken: '1//04rNWI_nvFxGYCgYIARAAGAQSNwF-L9IrsLudztmXWYEkcOSTuSZa92pIpQsvxSzLkjtFgrBQh8TP2gNrG9EPCHRnpPE32hq8gVk',
      accessToken: 'ya29.a0AVA9y1shHn9H8Pdw-f-NRZhI6xZmeCUOADvLT55w-6CWxD3jNzV3DZRLKVv4f4gpxP-DQIoPkCM3IlmFaN-z9Z6D-iDLNDeMbDjTmTEGg05Baf_Hpxf8SavfT88QUiUTlnUPbF4Te3H5uBUe2mZ1YIymB57waCgYKATASARISFQE65dr8ww_XAIeOOWBnJ5Upl0VnpA0163',
      expires: 1484314697598
    },
  });

  let info = await transporter.sendMail({
    from: '"modimex shop ✨" <godev88pro@gmail.com>', // sender address
    to, // list of receivers
    subject: 'reset-password', // Subject line
    // text, // plain text body
    html: resetPassTemplate(text), // html body
  });
  console.log({info})
    console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...

}
