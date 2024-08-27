const mongoose = require("mongoose") 

const addressSchema = new mongoose.Schema({
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        required:false

    },      
    addresses : [{
        name: {
            type : String,
            required:true
        },
        mobile:{
            type: Number,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        },
        address:{
            type:String,
            required:true        
        },
        district:{
            type:String,
            required:false
        },
        state:{
            type: String,
            required: false,
            default: false
        },
        landMark:{
            type:String,
            required:false,
            default: false
        },
        altMob:{
            type:Number,
            required:false,
            default: false
        },

        }]
    
  

})

module.exports = mongoose.model("address",addressSchema)  