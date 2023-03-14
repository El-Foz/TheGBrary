const express=require('express')
const app=express()
const path=require('path')
app.use(express.static("public"))
const sql=require('sqlite3')
const cookieParser=require("cookie-parser")
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