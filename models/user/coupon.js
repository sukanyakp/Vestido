const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    discountPercentage:{ type: Number,required: true},// "percentage" or "fixed"
    // discountValue: { type: Number, required: true },
    minPurchase: { type: Number, required: true },
    expirationDate: { type: Date, required: true },
    creationDate: { type: Date,default:Date.now()}, //creation
    redeemAmount: { type: Number,required: true },
    isValid:{ type: Boolean,required:false,default:true}
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
