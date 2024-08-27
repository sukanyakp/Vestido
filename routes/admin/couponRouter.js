const express = require("express")
const router = express.Router()

const adminCoupon = require('../../controllers/admin/couponController')
const adminMiddlewares = require("../../middlewares/adminAuth")


// router.get('/Coupons',adminCoupon.)

router.get('/coupons',adminMiddlewares.isToken,adminCoupon.getCoupons)
router.post('/coupons',adminCoupon.newCoupon)
router.get('/editcoupons',adminMiddlewares.isToken,adminCoupon.getEditCoupon)
router.put('/editcoupons',adminCoupon.editCoupon)
router.delete('/coupons/:id',adminCoupon.deleteCoupon)
module.exports = router