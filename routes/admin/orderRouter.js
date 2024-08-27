const express = require('express')
const router = express.Router()
const orderController = require('../../controllers/admin/orderController')
const adminMiddlewares = require("../../middlewares/adminAuth")

// router.post('/update-order-status',orderController.updateOrderStatus)

module.exports = router;