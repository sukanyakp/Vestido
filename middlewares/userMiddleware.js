
const jwt = require("jsonwebtoken")
const rateLimit = require('express-rate-limit');
const User = require('../models/userSchema')

const isToken = (req,res,next)=>{                              
    let token = req.cookies.token
    if(token){
        next()
    }else{
        res.render('user/home')
    }
}


// normal One 

// const isUser= (req,res,next)=>{
//    let token = req.cookies.token
//    console.log(token)
//    if(token){
//     jwt.verify(token,process.env.SECRET_KEY,(err,decode)=>{
//         if(err){
//            res.status('401')
//            res.redirect('/login')
//         }else{
//            req.user = decode
//            next()
//         }
//       })
//    }else{
//     res.redirect('/login');
//    }
 
// }



const isUser = async (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, process.env.SECRET_KEY, async (err, decoded) => {
            if (err) {
                res.status(401).redirect('/login');
            } else {
                try {
                    // Fetch the user by ID from the database
                    const user = await User.findById(decoded.userId);

                    // Check if the user is blocked (isListed is true)
                    if (!user || user.isListed) {
                        // Clear the token if the user is blocked
                        res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });
                        return res.status(403).redirect('/login');
                    }

                    // If the user is valid and not blocked, proceed
                    req.user = decoded;
                    next();
                } catch (error) {
                    console.error('Error fetching user:', error);
                    res.status(500).send('Internal Server Error');
                }
            }
        });
    } else {
        res.redirect('/login');
    }
};



// const isUser = (req, res, next) => {
//     // Extract token from cookies
//     const token = req.cookies.token;

//     if (!token) {
//         res.redirect('/login');
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
//         // Fetch the user from the database
//         User.findById(decoded.userId, (err, user) => {
//             if (err || !user || user.isListed) {
//                 // If the user is blocked, clear the token and deny access
//                 res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });
//                 return res.status(403).send("User is blocked");
//             }
//             req.user = user;
//             next();
//         });
//     } catch (error) {
//         return res.status(401).send("Invalid Token");
//     }
// };



const isNotToken=(req,res,next)=>{
    const token = req.cookies.token;
    if(token){
        res.redirect('/')
    }else{
        next()
    }
}


// // Middleware for rate limiting
// const otpRateLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 5, // Limit each IP to 5 requests per windowMs
//     message: "Too many OTP requests from this IP, please try again later"
// });




module.exports = {
    isUser,
    isToken,
    isNotToken,
    // otpRateLimiter
}