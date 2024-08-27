const express = require("express")
const router = express.Router()
const adminController = require("../../controllers/admin/adminController")
const adminMiddlewares = require("../../middlewares/adminAuth")
const productController = require("../../controllers/admin/productController")
const orderController = require('../../controllers/admin/orderController')


router.get("/",adminMiddlewares.isToken,adminController.getAdmin)
router.get("/login",adminMiddlewares.isNotToken,adminController.getAdminLogin)
router.post("/login",adminController.validateLogin)
router.get("/users",adminMiddlewares.isToken,adminController.getUser)
router.get('/category',adminMiddlewares.isToken,adminController.getCategory)
router.get('/addcategory',adminMiddlewares.isToken,adminController.getAddNewCategory)
router.get('/brands',adminMiddlewares.isToken,productController.getBrands)
router.get('/deletedcategories',adminMiddlewares.isToken,adminController.getDeletedCategories)

router.get("/orders",adminMiddlewares.isToken,orderController.getOrders)
router.get("/orderDetails",adminMiddlewares.isToken,orderController.getOrderDetails)
router.post('/update-order-status',orderController.updateOrderStatus)

router.get("/otp",adminMiddlewares.isToken,adminController.getAdminOtp)
router.get("/adminotplogin",adminMiddlewares.isToken,adminController.getAdminOtpEmail)

router.post("/verifyotpemail",adminController.checkOTPEmail)

router.get('/bolckedusers',adminMiddlewares.isToken,adminController.getBlockedUser)
router.post('/blockuser',adminController.blockuser)
router.post('/unblockuser',adminController.unBlockUser)

router.get('/logout',adminMiddlewares.isToken,adminController.adminLogOut)

module.exports = router