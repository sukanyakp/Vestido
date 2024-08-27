const mongoose = require("mongoose") 

const colorSchema = new mongoose.Schema({
   
    color_name: {
      type: String,
      allowNull: false
    },
    color_code: {
      type: String, // Hex color code or any other representation
      allowNull: true
    },
    isDeleted:{
        type:Boolean,
        required:false
    }  
})

module.exports = mongoose.model("color",colorSchema)  
  