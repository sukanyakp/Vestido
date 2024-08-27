
const Coupon = require('../../models/user/coupon')
const jwt = require('jsonwebtoken')
const Cart = require('../../models/user/cart')
const Variant = require('../../models/variantSchema')



// router.get('/coupons',
 const getCoupons =    async (req, res) => {
    try {
        const coupons = await Coupon.find({ expirationDate: { $gte: new Date() } });
        res.json(coupons);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const applyCoupon = async (req, res) => {
    try {
        console.log("Attempting to apply coupon");
        const { couponCode } = req.body;
        console.log(req.body, "request body");

        let userId;
        let token = req.cookies.token;

        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error('Token not found or invalid');
            } else {
                userId = decode.userId;
            }
        });

        console.log(req.userId, 'req.userId');

        // Find the coupon in the database
        const coupon = await Coupon.findOne({ code: couponCode });
        console.log(coupon, 'coupon');

        // Check if coupon exists
        if (!coupon) {
            return res.status(400).json({ success: false, message: "Invalid coupon code" });
        }

        // Check if coupon has expired
        if (new Date() > coupon.expirationDate) {
            return res.status(400).json({ success: false, message: "Coupon has expired" });
        }

        // Find the user's cart
        const userCart = await Cart.findOne({ userId: userId });
        if (!userCart) {
            return res.status(400).json({ success: false, message: "Cart not found" });
        }
        

        // Check if the coupon is already applied
        if (userCart.couponApplied && userCart.appliedCoupon.code === couponCode ) {
            // Remove the coupon
            let totalCartPrice = 0;
            userCart.items.forEach(item => {    // original price 
                let discountAmount = (item.price * coupon.discountPercentage) / (100 - coupon.discountPercentage);
                item.price += discountAmount;
                totalCartPrice += ( item.price * item.quantity);
            });

        
            userCart.totalCartPrice  = totalCartPrice
            userCart.couponApplied = false;
            userCart.appliedCoupon = { code: null, discountAmount: 0 };

console.log(totalCartPrice,'totalCartPrice');
console.log(userCart, "Removed ");


            await userCart.save();

            return res.status(200).json({
                success: true,
                message: "Coupon removed successfully",
                totalCartPrice: totalCartPrice,
                items:userCart.items,
                discountAmount: userCart.appliedCoupon.discountAmount  // not necessary
            });
        } else {
            // Check if the total cart price meets the minimum purchase requirement for the coupon
            if (userCart.totalCartPrice < coupon.minPurchase) {
                return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} is required` });
            }

            // Apply the coupon and update cart item prices
            let totalCartPrice = 0;
            userCart.items.forEach(item => {
                item.originalPrice = item.price   // originalPrice
                console.log( item.originalPrice,' item.originalPrice');
                
                let discountAmount = (item.price * coupon.discountPercentage ) / 100;
                item.price -= discountAmount;
                totalCartPrice +=( item.price * item.quantity);
            });
           
            userCart.couponApplied = true;
            userCart.appliedCoupon = { code: couponCode, discountAmount: userCart.totalCartPrice - totalCartPrice };
            userCart.discountAmount = userCart.totalCartPrice - totalCartPrice
            userCart.totalCartPrice = totalCartPrice
      
            console.log(userCart.appliedCoupon.discountAmount,'userCart.appliedCoupon.discountAmount' );

          const carrt =  await userCart.save();
          console.log(carrt,'appliedcart');
          

            return res.status(200).json({
                success: true,
                message: "Coupon applied successfully",
                // discountAmount: userCart.totalCartPrice - totalCartPrice,
                totalCartPrice: totalCartPrice,
                items:userCart.items,
                discountAmount: userCart.appliedCoupon.discountAmount
            });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: err.message });
    }
};











module.exports ={
    applyCoupon,
    getCoupons

}