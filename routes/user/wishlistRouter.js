const express = require('express')
const router = express.Router()

const wishlistController = require('../../controllers/user/wishlist')
const userMiddleware = require("../../middlewares/userMiddleware")


router.get('/wishlist',userMiddleware.isToken,userMiddleware.isUser,wishlistController.getWishlist)
router.post('/wishlist',wishlistController.addWishlist)
router.post('/remove-wishlist-item',wishlistController.removeWishlistItem)

router.post('/wishlistcart',wishlistController.addCart)



module.exports = router