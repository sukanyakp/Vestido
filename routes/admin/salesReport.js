const express = require("express")
const router = express.Router()
const salesReport = require('../../controllers/admin/salesReport')
const adminMiddlewares = require("../../middlewares/adminAuth")


router.get('/salesreport',adminMiddlewares.isToken,salesReport.getSalesReport)


module.exports= router