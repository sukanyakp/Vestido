const express = require('express')
const router = express.Router();
const userMiddleware = require("../../middlewares/userMiddleware")

const cartController = require('../../controllers/user/cart');
const checkoutController = require('../../controllers/user/checkout')
const couponController = require('../../controllers/user/coupon')



router.get('/cart',userMiddleware.isToken,userMiddleware.isUser,cartController.getCart)
router.post('/cart',userMiddleware.isUser, cartController.addCart)

router.post('/increment-quantity',cartController.increment)
router.post('/decrement-quantity' , cartController.decrement)
router.post('/remove-item',cartController.removeItem)


router.get('/checkout',userMiddleware.isToken,userMiddleware.isUser,checkoutController.getCheckOut)

router.post('/apply-coupon',couponController.applyCoupon)
router.get('/coupons',userMiddleware.isToken,userMiddleware.isUser,couponController.getCoupons)




module.exports = router
