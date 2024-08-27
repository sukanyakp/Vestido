const mongoose = require("mongoose") 

const adminSchema = new mongoose.Schema({
    name: {
        type : String,
        required:true
    },
    email:{
        type: String,
        required:true
    },
    phone:{
        type:String,
        required:false
    },
    image:{
        type:String,
        
    },
    password:{
        type:String,
        required:false
    },
    OTPVerification:{
        type: Boolean,
        required: false,
        default: false
    },
    isListed:{
        type:Boolean,
        required:false,
        default: false
    },
    isAdmin :{
        type:Boolean,
        required:true,
        default:false
    },
    jointDate:{
        type: Date,
        required:true
       
    }

})

module.exports = mongoose.model("admin",adminSchema)  