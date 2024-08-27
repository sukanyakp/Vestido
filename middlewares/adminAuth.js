

const isToken = (req,res,next)=>{                              
    let token = req.cookies.admintoken
    if(token){
        next()
    }else{
        res.redirect('/admin/login')
    }
}



const isNotToken=(req,res,next)=>{
    const token = req.cookies.admintoken;
    if(token){
        res.redirect('/admin')
    }else{
        next()
    }
}

module.exports ={
    isToken,
    isNotToken
}