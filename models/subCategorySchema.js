const mongoose = require('mongoose');

const SubcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    isDeleted:{
        type: String,
        required:true
    },
    categoryId :{
        type: mongoose.Schema.Types.ObjectId,
        ref: "category"

    }


});

module.exports = mongoose.model('Subcategory', SubcategorySchema);
