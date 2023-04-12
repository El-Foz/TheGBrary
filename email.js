const nodemailer=require('nodemailer')
require('dotenv').config()
const email=(reciever, subject, text)=>{
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "thegbrary@gmail.com",
            pass: process.env.emailpw
        }
    });
    const mailConfigurations = {
    
        
        from: 'thegbrary@gmail.com',
    
        to: reciever,
    
        // Subject of Email
        subject: subject,
        
        // This would be the text of email body
        text: text
        
    };
    transporter.sendMail(mailConfigurations, function(error, info){
        if (error) throw Error(error);
        console.log('Email Sent Successfully');
    });
}
module.exports=email