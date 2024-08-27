const mongoose = require("mongoose") 


const orderSchema = new mongoose.Schema({
        userId: {
            type : mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true
        },
        orderId: {
            type: String,
            unique:true
        },
        orderedItems: [{
            name:{
            type: String,
            required: true
            },
            phone:{
            type:Number,
            required:true
               },
           variantId:{
           type:mongoose.Schema.Types.ObjectId,
           required:true
           },
           productName:{
            type: String,
            required: true
           },
           images: {
            type: [String],
            required: true
           },
           quantity:{
            type: Number,
            required:true
           },
           price:{
            type:Number,
            required:true
           },
           offer: {
            type: Number,  // from this
            default: 0
        },
        totalPrice: {
            type: Number,
            required: false// not requird
        },
        discountAmount: {
            type: Number,
            default: 0
        },
        totalAmount: {
            type: Number,
            default: 0
        },
           category:{
            type:String,
            required:true
           },
             brands:{
            type:String,
            required:true
           },
           color:{
            type:String,
            required:true
           },
           size:{
            type:String,
            required:true
           },
            orderStatus:{
            type:String,
            default: 'Pending',
            required:true
            },        
            totalAmount:{
            type:Number,
            required:true        
            },       
            paymentStatus:{
                type:String,
                default:'Pending',
                required:true
            },
            paymentMethod:{
                type:String,
                required:true,            
            }, 
            orderDate:{
                type: String, 
                required: false
            },
            
            confirmedDate: {
                type: String, 
                required: false
            },
            shippedDate: {
                type: Date,
            //    default :Date.now()
                // type: Date,
                // default:Date.now,
                // required: false
            },
            deliveredDate: {
                type: Date,
                // default:Date.now()
               
            },
            cancelledDate: {
                type: String,
                required: false,
                default:''
            },
            returnedDate: {
                type: String,
                required: false,
                default:''
            },

        }],
        
        shippingAddress:[{
            name:{ type: String,required:true},
            mobile :{type:Number,required:true},
            pincode:{type:Number,required:true},
            address:{type:String,required:true},
            district:{ type:String,required:false},
            state:{ type:String, required:true},          
           
        }],
        orderStatus:{
            type:String,
            default: 'Pending',
            required:true
            },
        paymentStatus:{
                type:String,
                default:'Pending',
                required:true
            },
        paymentMethod:{
                type:String,
                required:true,
              
            },
            orderDate:{
            type: String, 
            required: false
            }, 
            totalAmount:{
                type:Number,
                required:true        
            },
            createdAt: {
                type: Date,
                default: Date.now()
            },
            couponApplied:{       
                type:Boolean,
                default:false
            },
            couponCode:{
                type: String, 
                required: false

            }

})

module.exports = mongoose.model("orders",orderSchema)  