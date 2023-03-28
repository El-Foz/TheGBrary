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
const uauth=require('./userauth')
require('dotenv').config()
app.use(express.urlencoded({
    extended: true
}))
app.use(cookieParser())

const SQLite3 = sql.verbose();
const db = new SQLite3.Database('project.db');
app.all('/login',(req, res)=>{
    res.sendFile(path.join(__dirname+'/html/login.html'))
})
app.get('/signup',(req, res)=>{
    res.sendFile(path.join(__dirname+'/html/signup.html'))
})
app.post('/signupcomplete', (req, res)=>{
    const {firstname, lastname, useremail, pw, reenterpw}=req.body;
    if(reenterpw==pw){
        var hashedpw=crypto.createHash('md5').update(pw).digest('hex');
        db.all('SELECT EMAIL FROM USERS', (err, row)=>{
            let doesEmailExist=false
            for(let z in row){
                if(row[z].EMAIL==useremail){
                    doesEmailExist=true
                    break
                }
            }
            if(!doesEmailExist){
                emailauth(useremail, firstname, lastname, hashedpw)
                res.sendFile(path.join(__dirname+'/html/checkemail.html'))
            }else{
                res.sendFile(path.join(__dirname+'/html/emailexists.html'))
            }
        })
    }else{
        res.sendFile(path.join(__dirname+'/html/pwandreenterpw.html'))
    }
})
app.post('/logincomplete', (req, res, next)=>{
    const { email, pw }=req.body
    db.all('SELECT * FROM USERS', (err, row)=>{
        if(err) console.log(err);
        let hashedpw=crypto.createHash('md5').update(pw).digest('hex');
        let uverif=row.map((item)=>{
            return {email: item.EMAIL, pw:item.PW}
        })
        const test={
            email: email,
            pw: hashedpw
        }
        //test test cannot be found in uverif for some reason or another. RIP I guess
        let isVerified=false
        let numOfIndex;
        for(let z in uverif){
            if(uverif[z].email==test.email && uverif[z].pw==test.pw){
                isVerified=true
                numOfIndex=z
                break
            }
        }
        if(isVerified){

            let x=uverif.indexOf(test)
            const uauthtoken=jwt.sign({
                data: {
                    firstname: row[numOfIndex].FIRSTNAME,
                    lastname: row[numOfIndex].LASTNAME,
                    id: row[numOfIndex].ID,
                    email:row[numOfIndex].EMAIL
                }
            }, process.env.uauthkey, {expiresIn:'7d'})
            res.cookie('uauth', uauthtoken)
            return res.redirect("/")
        }else{
            return res.redirect("/login")
        }
    })
    
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
app.all('/', uauth, (req, res)=>{
    res.send('test')
})
app.use((req, res)=>{
    res.status(404)
    res.sendFile(path.join(__dirname+'/html/error404.html'))
})





app.listen(3000, ()=>{
    console.log('running on http://localhost:3000')
})