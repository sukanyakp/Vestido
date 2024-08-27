const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true 
    },
    totalCartPrice: {
        type: Number,
        required: false,
        default: 0
    },
    withoutDiscount:{
        type:Number,
        required:false,
        default:0
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    discountAmount:{
        type: Number,
        required: false,
        default: 0
    },
    appliedCoupon: {
        code: {
            type: String,
            default: null
        },
        discountAmount: {
            type: Number,
            default: 0
        }
    },
    items: [{
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        size: {
            type: String,
            required: true
        },
        originalPrice: {  // origianlPrice
            type: Number,
            required: false
        },
        price: {
            type: Number,
            required: true
        },
        isAvailable: {
            type: Boolean,
            required: true
        },
        offer:{
            type:Number,
            required:false
        }
    }]
});

module.exports = mongoose.model('Cart', cartSchema);
