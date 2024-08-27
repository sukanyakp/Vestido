const express = require('express')
const router = express.Router();

const profileController = require('../../controllers/user/profile')
const userMiddleware = require("../../middlewares/userMiddleware")

router.get('/address',userMiddleware.isToken,userMiddleware.isUser,profileController.getAddress)

router.get('/profile',userMiddleware.isToken,userMiddleware.isUser,profileController.getUserProfile)

router.post('/address',profileController.addAddress)
router.post('/password',profileController.changePassword)

router.post('/add-money',profileController.addMoneyToWallet)

router.post('/payment-success',profileController.paymentSuccess)
router.get('/transaction-history',userMiddleware.isToken,userMiddleware.isUser,profileController.transactionHistory)

module.exports = router