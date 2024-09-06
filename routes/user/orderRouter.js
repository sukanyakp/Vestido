const express = require('express') ;
const router = express.Router();

const OrderController = require('../../controllers/user/order')
const userMiddleware = require("../../middlewares/userMiddleware")

router.post('/placeorder',OrderController.placeOrder)

// router.get('/orders',OrderController.getOrder)
router.get('/order-history',userMiddleware.isToken,userMiddleware.isUser,OrderController.orderHistory)
router.post('/verifyPayment',OrderController.verifyPayment)


router.get('/order',userMiddleware.isToken,userMiddleware.isUser,OrderController.getOrderDetails)
// router.post('/orders/cancel/:orderId',OrderController.cancelOrder)
router.post('/cancel-order',OrderController.cancelOrder)
router.post('/return-order',OrderController.returnOrder)
router.post('/updateOrderStatus',OrderController.razorpayFailure)

router.post('/payagain',OrderController.payAgain)
router.post('/payagainverify',OrderController.payAgainVerifyPayment)

module.exports = router