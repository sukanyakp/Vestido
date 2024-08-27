const bcrypt = require('bcrypt');
const User = require('../../models/userSchema')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const Variant = require("../../models/variantSchema");
const Cart = require('../../models/user/cart')
const Order = require('../../models/user/order')
const Coupon = require('../../models/user/coupon')
const Address = require('../../models/address');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const Razorpay = require('razorpay');


const instance = new Razorpay({
    key_id: process.env.YOUR_KEY_ID ,
    key_secret: process.env.YOUR_KEY_SECRET
    
});



const getCheckOut = async (req, res) => {

    try {
        let userId
        let token = req.cookies.token
        // console.log(token); 
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {             
                return res.redirect('/login')     
            } else {
                userId = decode.userId
                // console.log(userId,"decoded");
            }
        })

        let address = await Address.findOne({ userId: userId })
        //   console.log(" addresszzz",address);

        let userDetails = await User.findOne({ _id: userId })
        //   console.log("userDetails",userDetails);

        const cartDetails = await Cart.aggregate([
            { $match: { userId: new ObjectId(userId) } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "variants",
                    localField: "items.variantId",
                    foreignField: "_id",
                    as: "items.variantDetails"
                }
            },
            { $unwind: "$items.variantDetails" },
            //lookup for productName
            {
                $lookup: {
                    from: "products",
                    localField: "items.variantDetails.productId",
                    foreignField: "_id",
                    as: "items.variantDetails.productDetails"
                }
            },
            { $unwind: "$items.variantDetails.productDetails" },

            {
                $group: {
                    _id: "$_id",
                    userId: { $first: "$userId" },
                    items: { $push: "$items" },
                    totalCartPrice: { $last: "$totalCartPrice" },
                    couponApplied :{ $first:'$couponApplied'},
                    appliedCoupon:{$first:'$appliedCoupon'},
                    withoutDiscount:{$first:'$withoutDiscount'},
                    discountAmount:{$first:'$discountAmount'}
                }
            }


        ]);
        
        const coupons = await Coupon.find({ expirationDate: { $gte: new Date() } });

        if (cartDetails.length === 0) {
            if( coupons.length === 0){
                return res.render('user/checkout', { address, cartDetails: null,coupons:null });
            }
           
        }   

        if(!coupons){
            res.render('user/checkout', { address, cartDetails ,coupons:null })
        }

        if(!cartDetails){
            res.render('user/checkout', { address, cartDetails:null ,coupons })
        }
       
        res.render('user/checkout', { address, cartDetails ,coupons })

    } catch (err) {
        console.log(err);
    }

}


module.exports ={
    getCheckOut

}