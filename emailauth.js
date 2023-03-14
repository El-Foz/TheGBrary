const jwt=require('jsonwebtoken')
const nodemailer=require('nodemailer')
require('dotenv').config()
const emailauth=(email, firstname, lastname, pw)=>{
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "thegbrary@gmail.com",
            pass: process.env.emailpw
        }
    });
    const token = jwt.sign({
            data: {firstname, lastname, email, pw} 
        }, process.env.jwtkey, { expiresIn: '5m' }  
    ); 
    const mailConfigurations = {
  
        // It should be a string of sender/server email
        from: 'thegbrary@gmail.com',
      
        to: email,
      
        // Subject of Email
        subject: 'Gbrary Verification',
          
        // This would be the text of email body
        text: `Hey Nerd. You just came to the GBrary. Click this link to verify your email.
        http://localhost:3000/verify/${token}`
          
    };
    transporter.sendMail(mailConfigurations, function(error, info){
        if (error) throw Error(error);
        console.log('Email Sent Successfully');
    });
}
module.exports={emailauth}