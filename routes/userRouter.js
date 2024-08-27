const express = require('express') ;
const router = express.Router();
const userController = require('../controllers/user/userController') ;
const profileController = require('../controllers/user/profile');
const cartController = require('../controllers/user/cart');
const wishlistController = require('../controllers/user/wishlist')
const userMiddleware = require("../middlewares/userMiddleware")
const OrderController = require('../controllers/user/order')
const checkoutController = require('../controllers/user/checkout')
const passport = require("passport")
router.use(passport.initialize())
router.use(passport.session())





router.get("/",userMiddleware.isToken,userMiddleware.isUser,userController.getHome)
router.get("/login",userMiddleware.isNotToken,userController.getLogin)
router.get("/register",userMiddleware.isNotToken,userController.getRegister)

router.get("/otp",userMiddleware.isNotToken,userController.getOTP)
router.post("/register",userController.register)
router.post("/verifyotp",userController.verifyOTP)
router.post("/login",userController.userLogin)
router.get("/resendOTP",userMiddleware.isNotToken,userController.resendOtp,userController.getOTP)
router.get("/otplogin",userMiddleware.isNotToken,userController.otpLogin)
router.post("/otplogin",userController.checkOTPEmail)


// //google auth
router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/login' }),userController.googleSuccess);
router.get('/auth/google',passport.authenticate('google', { scope: ['profile', 'email'] }));


router.post('/addlogin')


router.get("/shops" ,userController.getShops)

router.get('/product',userMiddleware.isToken,userMiddleware.isUser,userController.getProductDetail)

router.get('/logout',userMiddleware.isToken,userMiddleware.isUser,userController.userLogout)










module.exports = router