const jwt=require('jsonwebtoken')
const uauth=(req, res, next)=>{
    if(!req.cookies.uauth){
        return res.redirect('/login')
    }else{
        jwt.verify(req.cookies.uauth, process.env.uauthkey, (err, decoded)=>{
            if(err){
                console.log("penis")
                return res.redirect('/login')
            }else{
                next()
            }
        })
    }
}
module.exports=uauth