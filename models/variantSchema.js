const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
    colors: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    stock: [{
        size: { type: String, required: true },
        quantity: { type: Number, required: true }
    }],
    images: {
        type: [String],
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'product'
    },
    categoryName: {
        type: String,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isVariantAvailable: {
        type: Boolean,
        required: true,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('variants', variantSchema);
