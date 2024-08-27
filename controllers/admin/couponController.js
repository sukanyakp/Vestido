const jwt = require("jsonwebtoken")
const User = require("../../models/userSchema")
const Coupon = require('../../models/user/coupon')
const Category = require('../../models/categoryShema')
const Product = require('../../models/variantSchema')
const mongoose = require('mongoose')
const { ObjectId } = mongoose.Types;

const getCoupons = async(req,res) =>{
     
     const currentDate = new Date();

     // Remove expired coupons
     await Coupon.deleteMany({ expirationDate: { $lt: currentDate } });


    // pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;
console.log(page,limit,startIndex);

    // pipeline.push({ $skip: startIndex });
    // pipeline.push({ $limit: limit });

    const coupons = await Coupon.find().skip(startIndex).limit(limit)
    const matchCriteria = {}
    const totalCount = await Coupon.countDocuments(matchCriteria);
    const totalPages = Math.ceil(totalCount / limit);

    res.render('admin/coupons',{coupons,currentPage: page, limit,totalCount,totalPages})
}


// Create a new coupon 
  const newCoupon =   async (req, res) => {
    try {
        console.log("Hey ... newCoupon...");
        console.log(req.body,"body..");
        const { code, description, discountPercentage, minPurchase, expirationDate , redeemAmount } = req.body;
         // Check if a coupon with the same code already exists
         const existingCoupon = await Coupon.findOne({ code });
         if (existingCoupon) {
             return res.status(400).json({ success: false, message: 'Coupon code already exists' });
         }

         const couponwithSameDiscountPercentage = await Coupon.findOne({ discountPercentage})
         console.log(couponwithSameDiscountPercentage,'couponwithSameDiscountPercentage');
         if( couponwithSameDiscountPercentage){
            return res.status(400).json({ success:false , message: 'Coupon  already exists with the same discountPercentage'})
         }

        const newCoupon = new Coupon({ code, description, discountPercentage, minPurchase, expirationDate , redeemAmount,});
        await newCoupon.save();
        res.status(201).json({ success: true, message: 'Coupon created successfully', coupon: newCoupon });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// Update a coupon  
 const getEditCoupon =   async (req, res) => {
    try {
        const id = req.query.oId
        console.log(id,'id');
        
        const coupon = await Coupon.findOne({ _id:id})
        console.log(coupon,'coupon');
        const category = await Category.find()
        const product = await Product.find()
        

        res.render('admin/editcoupon',{coupon,category,product})
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


const editCoupon = async (req,res)=>{
    try {
        console.log("Hey ... newCoupon...");
        console.log(req.body,"body..");
        const { code, description, discountPercentage, minPurchase, expirationDate , redeemAmount,id } = req.body;
        const updatedData = req.body;
         // Check if a coupon with the same code already exists
        //  const existingCoupon = await Coupon.findOne({code});
        //  if (existingCoupon) {
        //      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
        //  }

         const updatedCoupon = await Coupon.findByIdAndUpdate(id, updatedData, { new: true });
         console.log(updatedCoupon,'updatedOffer');
        res.status(201).json({ success: true, message: 'Coupon created successfully', coupon: updatedCoupon });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}



// Delete a coupon

  const deleteCoupon =   async (req, res) => {
    try {
        const { id } = req.params;
        await Coupon.findByIdAndDelete(id);

        // const coupon = await Coupon.find({ })

        res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};




module.exports ={
    getCoupons,
    newCoupon,
    getEditCoupon,
    deleteCoupon,
    editCoupon

}