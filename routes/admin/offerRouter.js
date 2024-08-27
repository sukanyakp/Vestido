const express = require("express")
const router = express.Router()

const offerController = require('../../controllers/admin/offerController')
const adminMiddlewares = require("../../middlewares/adminAuth")



router.get('/offers',adminMiddlewares.isToken,offerController.getOfferPage)
router.post('/offers',offerController.newOffer)
router.put('/editoffers',offerController.editOffer)
router.delete('/offers/:id',offerController.deleteOffer)
router.get('/editoffers',adminMiddlewares.isToken,offerController.getEditOffer)
module.exports = router