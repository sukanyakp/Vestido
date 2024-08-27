const jwt = require("jsonwebtoken")
const User = require("../../models/userSchema")
const Offer = require('../../models/admin/offer')
const Category = require('../../models/categoryShema')
const Products = require('../../models/productSchema')
const Variant = require('../../models/variantSchema')
const Product = require('../../models/productSchema')

const mongoose = require('mongoose')
const { ObjectId } = mongoose.Types;


const getOfferPage = async(req,res)=>{

     const currentDate = new Date()
     await Offer.deleteMany({ validUntil :{$lt : currentDate}})
    // pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;
    console.log(page,limit,startIndex);

    const offer = await Offer.find({}).skip(startIndex).limit(limit)
    // console.log(offer,'offer');
    const category = await Category.find()
    const product = await Products.find()
// console.log(category,'category');
// console.log(product,'pro');
const matchCriteria = {}
const totalCount = await Offer.countDocuments(matchCriteria);
const totalPages = Math.ceil(totalCount / limit);

    res.render('admin/addOffer',{offer,category,product, currentPage: page, limit,totalCount,totalPages})

}


const newOffer = async (req, res) => {
    try {
        console.log("Hey ... offer...");
        console.log(req.body, "body..");
        const { offerName, discount, redeem_amount, offerType, category, productName, categoryName, product, validUntil } = req.body;
        console.log(offerName, discount, redeem_amount, offerType, category, productName, categoryName, product, validUntil);

        // Check if an offer with the same name already exists
        const existingOffer = await Offer.findOne({ offerName });
        if (existingOffer) {
            return res.status(400).json({ success: false, message: 'Offer Name already exists' });
        }

        const newOffer = new Offer({
            offerName,
            discount,
            redeemAmount: redeem_amount,
            offerType: offerType,
            categoryId: category,
            productId: product,
            categoryName: categoryName,
            productName: productName,
            expirationDate:validUntil,
            validUntil
        });

        const newOne = await newOffer.save();
        console.log(newOne);

        if (newOffer.offerType === 'productWise') {
            const existingProductOffer = await Product.findOne({ _id: new ObjectId(newOffer.productId), offerApplied: true });

            if (existingProductOffer && existingProductOffer.offer >= discount) {
                console.log('Existing offer has a greater or equal discount, skipping update.');
            } else {
                const variants = await Variant.find({ productId: new ObjectId(newOffer.productId) });
                if (variants.length > 0) {
                    const realPrice = variants[0].price;
                    const offerPrice = realPrice - (realPrice * discount / 100);
                    console.log(realPrice, 'realPrice');
                    console.log(offerPrice, 'offerPrice');
                    console.log('Product-wise offer detected...');

                    await Product.updateMany(
                        { _id: new ObjectId(newOffer.productId) },
                        { $set: { offerApplied: true, offerName: newOffer.offerName, offerPrice: offerPrice, offer: discount } }
                    );
                }
            }
        } else if (newOffer.offerType === 'categoryWise') {
            console.log('Category-wise offer detected...');

            const products = await Product.find({ category: newOffer.categoryName });

            for (const product of products) {
                const existingProductOffer = await Product.findOne({ _id: product._id, offerApplied: true });

                if (existingProductOffer && existingProductOffer.offer >= discount) {
                    console.log(`Existing offer for product ${product._id} has a greater or equal discount, skipping update.`);
                } else {
                    const variants = await Variant.find({ productId: product._id });

                    for (const variant of variants) {
                        const realPrice = variant.price;
                        const offerPrice = realPrice - (realPrice * discount / 100);
                        console.log(realPrice, 'realPrice');
                        console.log(offerPrice, 'offerPrice');

                        await Product.updateOne(
                            { _id: product._id },
                            { $set: { offerApplied: true, offerName: newOffer.offerName, offerPrice: offerPrice, offer: discount } }
                        );
                    }
                }
            }
        }

        res.status(201).json({ success: true, message: 'Offer created successfully', offer: newOffer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



const getEditOffer = async(req,res)=>{
    const id = req.query.oId
    console.log(id,'oId');
    const offer = await Offer.findOne({_id:id})
    console.log(offer,'offer');
    const category = await Category.find()
    const product = await Products.find()

    res.render('admin/editOffer',{offer,category,product})
}
// Update a coupon  
const editOffer =   async (req, res) => {
    try {
        // const { id } = req.params;
        const id = req.query.oId
        console.log(id,'id');
        const updatedData = req.body;
        const { offerName, discount, offerType, categoryName , productName,validUntil } = req.body;
        console.log(offerName, discount, offerType, categoryName , productName,validUntil);


        const updatedOffer = await Offer.findByIdAndUpdate(id, updatedData, { new: true });
console.log(updatedOffer,'updatedOffer');

        if (updatedOffer.offerType === 'productWise') {
            const variants = await Variant.find({ productId: new ObjectId(updatedOffer.productId) });
            const realPrice = variants[0].price;
            const offerPrice = realPrice - (realPrice * discount / 100);

            console.log('Product-wise offer detected...');

            const updatedProducts = await Product.updateOne(
                {_id: new ObjectId( updatedOffer.productId)},
                { $set:{offerApplied:true,offerName: updatedOffer.offerName,offerPrice: offerPrice ,offer:discount} }
            )
            console.log(updatedProducts, 'updatedProducts');
        }  else if (updatedOffer.offerType === 'categoryWise') {
            const products = await Product.find({ category: updatedOffer.categoryName });


            for (const product of products) {
                // Find the variant prices for each product
                const variants = await Variant.find({ productId: product._id });

                // Apply the offer to each variant of the product
                for (const variant of variants) {
                    const realPrice = variant.price;
                    const offerPrice = realPrice - (realPrice * discount / 100);
                    console.log(realPrice, 'realPrice');
                    console.log(offerPrice, 'offerPrice');


                    // Update the product with the offer details
                    await Product.updateOne(
                        { _id: product._id },
                        { $set: { offerApplied: true, offerName: updatedOffer.offerName, offerPrice: offerPrice, offer: discount } }
                    );
                }
            }        
          
        }

        res.status(200).json({ success: true, message: 'Offer updated successfully', offer : updatedOffer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete a coupon

  const deleteOffer =   async (req, res) => {
    try {
        console.log('hey delete offer..');
        
        const { id } = req.params;
        console.log(id,'id');
        const deletedOffer =  await Offer.findByIdAndDelete(id);

        if (deletedOffer.offerType === 'productWise') {
            console.log('Product-wise offer detected...');

            const updatedProducts = await Product.updateMany(
                {_id: new ObjectId( deletedOffer.productId)},
                { $set:{offerApplied:false,offerName: ' ',offerPrice:'' ,offer:''} }
            )
            console.log(updatedProducts, 'updated variants');
        }  else if (deletedOffer.offerType === 'categoryWise') {
            console.log('Category-wise offer detected...');

            const products = await Product.find({ category: deletedOffer.categoryName });

            for (const product of products) {
                // Find the variant prices for each product
                const variants = await Variant.find({ productId: product._id });

                // Apply the offer to each variant of the product
                for (const variant of variants) {
                   
                    // Update the product with the offer details
                    await Product.updateOne(
                        { _id: product._id },
                        { $set: { offerApplied: false, offerName: '', offerPrice: '', offer: '' } }
                    );
                }
            }
        }




        res.status(200).json({ success: true, message: 'Offer deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};



// const addOffer = async(req,res) =>{
//     try{

//         console.log('adding offer?');

//         const {offerName,discount,redeemAmount,validUntil}= req.body
//         console.log(offerName,discount,redeemAmount,validUntil);

//         let date = new Date(validUntil);
//         const options = { day: 'numeric', month: 'short', year: 'numeric' };
//         let localdate = date.toLocaleDateString('en-GB', options);
    
//         const newOffer = new Offer ({offerName,discount,redeemAmount,validUntil: localdate })
//         await newOffer.save()
//         console.log(newOffer);
//         res.status(200).json({
//              success:true,
//              message:'Offer created successfully',
//              name: newOffer.offerName,
//              discount: newOffer.discount,
//              redeemAmount:redeemAmount,
//              validUntil: newOffer.validUntil})
//     }catch(err){
//         res.status(500).json({ success: false, message: err.message });
//     }

// }
module.exports = {
    getOfferPage,
    newOffer,
    getEditOffer,
    editOffer,
    deleteOffer

}