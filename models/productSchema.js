const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false
    },
    gender: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    // categoryId:{
    //     type:mongoose.Schema.Types.ObjectId,
    //     ref:'categoryId'
    // },
    brand: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    variants: {
        type: [mongoose.Schema.Types.ObjectId],
        required: true,
        ref: 'variants' 
    },
    isAvailable: {
        type: Boolean,
        required: true,
        default: true
    },
    addedDate: {
        type: String,
        required: true
    },
    offerApplied:{       
        type:Boolean,
        default:false
    },
    offerName:{
        type:String,
        required:false
    },
    offerPrice:{
        type: Number,
        required: false

    },
    offer:{
        type:Number,
        required:false,
        default:0
    } 
});

module.exports = mongoose.model('product', productSchema);
