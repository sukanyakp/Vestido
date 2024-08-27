const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const wishlistSchema = new Schema({
    userId: {
    type: mongoose.Schema.Types.ObjectId,
     required: true 
   }, 
items: [{

   variantId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    size:{
        type:String,
        required: true
    },
    price:{
        type:Number,
        required:true
    }, 
    isAvailable:{
        type:Boolean,
        required:true
    },   
}]  
});

module.exports = mongoose.model('wishlist', wishlistSchema);

