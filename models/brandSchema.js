const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema({
    brandname:{
        type:String,
        required:true
    },
    isDeleted:{
        type:Boolean,
        required:true
    }
})

module.exports = mongoose.model('brands',BrandSchema)