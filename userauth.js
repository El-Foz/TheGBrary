const jwt=require('jsonwebtoken')
const uauth=(req, res, next)=>{
    if(!req.cookies.uauth){
        return res.redirect('/login')
    }else{
        jwt.verify(req.cookies.uauth, process.env.uauthkey, (err, decoded)=>{
            if(err){
                return res.redirect('/login')
            }else{
                next()
            }
        })
    }
}
//test
module.exports=uauth