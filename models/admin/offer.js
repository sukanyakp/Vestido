const mongoose = require('mongoose')
const offerSchema = new mongoose.Schema({
    offerName:{
        type:String,
        required:true,
        index:true
    },
    // offer:{
    //     type:String,
    //     required:false,
    //     index : true
    // },
 
    offerType:{
        type:String,
        required:true,
        index : true
    },
    // typeName:{
    //     type:String,
    //     required:true
    // },
    discount: { 
        type: Number,
        required: true
    },
    redeemAmount: {
         type: Number,
         required: true
    },
    categoryName:{
        type:String,
        ref:'Category',
        required:false,
        index:true
    },
    productName:{       
        type:String,
        ref:'Product',
        required:false,
        index:true
    },
    categoryId:{
        type:String,
        // type:String,
        ref:'Category',
        required:false,
        index:true
    },
    productId:{
        type: String,
        // type:String,
        ref:'Product',
        required:false,
        index:true
    },
    isActive:{
        type:Boolean,
        require:true,
        default:true
    },
    addedDateTime:{
        type:Date,
        default:Date.now
    },
    expirationDate:{
        type:String,
        required:true

    },
    validUntil: {
        type: Date,  // Change this to Date
        required: true
    }
})

const Offer = mongoose.model('Offer',offerSchema)
module.exports = Offer