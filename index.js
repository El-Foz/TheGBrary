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
const cookie=require("cookie")
const uauth=require('./userauth')
const multer=require("multer")
const fs=require("fs")
const sendEmail=require("./email")
var http = require('http').Server(app);
const io = require('socket.io')(http);
const storage = multer.diskStorage({   
    destination: function(req, file, cb) { 
       cb(null, './imgUploads');    
    }, 
    filename: function (req, file, cb) { 
       cb(null , file.originalname);   
    }
});
var upload = multer({ storage: storage })
app.set('view engine', 'ejs');
require('dotenv').config()
app.use(express.urlencoded({
    extended: true
}))
app.use(cookieParser())
app.use(express.json())
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
app.all("/", (req, res)=>{
    res.redirect("/browse")
})
app.post("/uploadbookmethod", uauth, upload.single("cover"), (req, res, next)=>{
    const file = req.file
    let userData;
    if (!file) {
  
      res.send("Please upload an Image!")
    }
    if(file.size>1000000){
        res.send("Cover Image to large! try an image under 1 megabyte!")
    }
    jwt.verify(req.cookies.uauth, process.env.uauthkey, (err, decoded)=>{
        if(err){
            return res.redirect('/login')
        }else{
            userData=decoded.data
        }
    })
    db.run("INSERT INTO BOOKS (COVERPATH, TITLE, AUTHOR, EMAIL, MIMETYPE, ISOUT) VALUES (?, ?, ?, ?, ?, ?)", [file.filename, req.body.title, req.body.author, userData.email, file.mimetype, 0])
    res.send(file)
  
})
app.get("/browse", uauth, (req, res)=>{
    db.all("SELECT * FROM BOOKS", (err, row)=>{
        if(err) console.error(err);
        var books=row
        for(var i=0; i< books.length; i++){
            let n= fs.readFileSync("imgUploads/"+books[i].COVERPATH)
            let buffer=n.toString('base64')
            
            books[i].COVERPATH=buffer        
        }
        res.render("browse", {books: books})
    })
})
app.get("/bookpage/:id", uauth, (req, res)=>{
    db.all("SELECT * FROM  BOOKS WHERE ID=?",[req.params.id], (err, row)=>{
        if(err) console.error(err);
        let books=row
        
        let n= fs.readFileSync("imgUploads/"+books[0].COVERPATH)
        let buffer=n.toString('base64')
            
        books[0].COVERPATH=buffer        
        
        res.render("booktakeout", {books: books[0]})
    })
})
app.post("/searchbooks", uauth, (req, res)=>{
    var books=[];
    
    db.all("SELECT * FROM  BOOKS", (err, row)=>{
        if(err) console.error(err);
        books=row.filter(e=>{
            
            return e.TITLE.toLowerCase().includes(req.body.search.toLowerCase())

        })
        for(var i=0; i< books.length; i++){
            let n= fs.readFileSync("imgUploads/"+books[i].COVERPATH)
            let buffer=n.toString('base64')
            
            books[i].COVERPATH=buffer        
        }

        res.render("searched", {books: books})
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
    res.send(req.file)
})
app.get("/uploadbook", uauth, (req, res)=>{
    res.sendFile(path.join(__dirname+"/html/uploadbook.html"))
})
//TODO
app.post("/takenoutbook", uauth, (req, res)=>{
    let data=req.body
    jwt.verify(req.cookies.uauth, process.env.uauthkey, (err, decoded)=>{
        if(err) res.redirect('/login')
        db.all("SELECT * FROM BOOKS WHERE ID=?", [data.bookId], (err, row)=>{
            if (err) console.error(err)
            if(row[0].EMAIL==decoded.data.email){
                
                res.status(418).send("Hell Nah")
            }else if(row[0].ISOUT===1){
                res.status(418).send("its out")   
            }else{
                db.serialize(async ()=>{
                    await db.run("UPDATE BOOKS SET ISOUT=1, OUTEMAIL=? WHERE ID=?", [decoded.data.email, data.bookId])
                    await db.all("SELECT * FROM BOOKS WHERE ID=?", [data.bookId], (err, row)=>{
                        if (err) console.error(err)
                        let emailBody=`Your Book, ${row[0].TITLE} by ${row[0].AUTHOR} has been taken out.
                        Check the "Your Books" page to communicate with the person who has taken out the book`
                        sendEmail(row[0].EMAIL, "Your Book Has Been Taken Out!", emailBody)
                    })
                })
            }
        })
                
                
    })
})
app.all("/yourbooks", uauth, (req, res)=>{
    jwt.verify(req.cookies.uauth, process.env.uauthkey, (err, decoded)=>{
        if(err){
            return res.redirect('/login')
        }
        db.all("SELECT * FROM BOOKS WHERE EMAIL=?", [decoded.data.email], (err, row)=>{
            if(err) console.error(err)
            books=row
            for(var i=0; i< books.length; i++){
                let n= fs.readFileSync("imgUploads/"+books[i].COVERPATH)
                let buffer=n.toString('base64')
                
                books[i].COVERPATH=buffer        
            }
            res.render("yourbooks", {books: books})
        })
    })
})
app.all("/takenoutbooks", uauth, (req, res)=>{
    jwt.verify(req.cookies.uauth, process.env.uauthkey, (err, decoded)=>{
        if(err){
            return res.redirect('/login')
        }
        db.all("SELECT * FROM BOOKS WHERE OUTEMAIL=?", [decoded.data.email], (err, row)=>{
            if(err) console.error(err)
            books=row
            for(var i=0; i< books.length; i++){
                let n= fs.readFileSync("imgUploads/"+books[i].COVERPATH)
                let buffer=n.toString('base64')
                
                books[i].COVERPATH=buffer        
            }
            res.render("yourbooks", {books: books})
        })
    })
})
app.get("/bookCommsPage/:id", uauth, (req, res)=>{
    db.all("SELECT * FROM BOOKS WHERE ID=? AND ISOUT=1", [req.params.id], (err, row)=>{
        if(err) console.error(err)
        var books=row
        for(var i=0; i< books.length; i++){
            let n= fs.readFileSync("imgUploads/"+books[i].COVERPATH)
            let buffer=n.toString('base64')
            books[i].COVERPATH=buffer        
        }
        jwt.verify(req.cookies.uauth, process.env.uauthkey, (err, decoded)=>{
            if(decoded.data.email==books[0].EMAIL || decoded.data.email==books[0].OUTEMAIL){
                db.all("SELECT * FROM CACHE WHERE EMAIL=?", [books[0].EMAIL], (err, row)=>{
                    if (err) console.error(err)
                    db.all("SELECT * FROM USERS WHERE EMAIL=?", [books[0].EMAIL], (err, row)=>{
                        if(err) console.error(err)
                        res.render("comms", {books: books[0], outId: row[0].DATA, name: {firstname: row[0].FIRSTNAME, lastname: row[0].LASTNAME}})
                    })
                })
            }else{
                res.redirect("/404")
            }
        })
    })
})
io.on('connection', socket => {
    // Handle private messages between two users
    console.log("test")
    const tempcookies = socket.request.headers.cookie;
    const cookies=cookie.parse(tempcookies)
    jwt.verify(cookies.uauth, process.env.uauthkey, (err, decoded)=>{
        if(err) console.error(err)
        db.run("INSERT INTO CACHE VALUES (?, ?)", [decoded.data.email, socket.id])
        
    })
    socket.on('private message', (data) => {
      const recipientSocket = io.sockets.connected[data.recipientSocketId];
      if (recipientSocket) {
        recipientSocket.emit('private message', data.message);
      }
    });
    socket.on('disconnect', () => {
        db.run("DELETE FROM CACHE WHERE DATA=?", [socket.id])
      });
  });


app.get("*",(req, res)=>{
    res.status(404)
    res.sendFile(path.join(__dirname+'/html/error404.html'))
})
http.listen(3000 || process.env.PORT, function(){
    console.log('listening on http://localhost:3000');
 });