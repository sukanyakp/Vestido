const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryName:{
        type:String,
        required:true
    },
    isDeleted:{  //isListed
        type:Boolean,
        required:true,
        default:false
    },
    offerApplied:{        // actaully not needed anymore
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
   
})

module.exports = mongoose.model('category',categorySchema)