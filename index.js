const express=require('express')
const app=express()
const path=require('path')
app.use(express.static("public"))
const sql=require('sqlite3')
const jwt=require('jsonwebtoken')
const crypto=require('crypto')
const nodemailer=require('nodemailer')
const cookieParser=require("cookie-parser")
const {emailauth}=require('./emailauth.js')
require('dotenv').config()
app.use(express.urlencoded({
    extended: true
}))
app.use(cookieParser())
const SQLite3 = sql.verbose();
const db = new SQLite3.Database('project.db');
app.get('/',(req, res)=>{
    res.sendFile(path.join(__dirname+'/html/login.html'))
})
app.get('/signup',(req, res)=>{
    res.sendFile(path.join(__dirname+'/html/signup.html'))
})
app.listen(3000, ()=>{
    console.log('running on http://localhost:3000')
})
app.post('/signupcomplete', (req, res)=>{
    const {firstname, lastname, useremail, pw, reenterpw}=req.body;
    if(reenterpw==pw){
        var hashedpw=crypto.createHash('md5').update(pw).digest('hex');
        emailauth(useremail, firstname, lastname, hashedpw)
        res.sendFile(path.join(__dirname+'/html/checkemail.html'))
    }else{
        res.sendFile(path.join(__dirname+'/html/pwandreenterpw.html'))
    }
})

app.get('/verify/:token', (req, res)=>{
    const {token} = req.params;
    
    // Verifying the JWT token 
    jwt.verify(token, process.env.jwtkey, function(err, decoded) {
        if (err) {
            console.log(err);
            res.send("Email verification failed, possibly the link is invalid or expired, NERD");
        }
        else {
            db.serialize(async ()=>{
                await db.run(`insert into USERS (FIRSTNAME, LASTNAME, EMAIL, PW) VALUES (?, ?, ?, ?)`, [decoded.data.firstname, decoded.data.lastname, decoded.data.email, decoded.data.pw])
                await res.send('verification complete. you may close this tab.')
            })
        }
    });
})