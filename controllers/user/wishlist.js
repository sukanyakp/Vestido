const bcrypt = require('bcrypt');
const User = require('../../models/userSchema')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const Variant = require('../../models/variantSchema')
const Wishlist = require('../../models/user/wishlist')
const Cart = require('../../models/user/cart')
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;



const getWishlist = async (req,res) => {
try{

    let userId
    let token = req.cookies.token
    // console.log(token); 
    jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
        if (err) {
            throw new Error(' token not found')
        } else {
            userId = decode.userId
            // console.log(userId,"decoded");
        }
    })
let user = await User.findOne({ _id: userId})

    let wishlist = await Wishlist.findOne({ userId: userId})

    if (!wishlist || !wishlist.items.length) {
        // If the wishlist is empty or does not exist, render the wishlist page with an empty cart
        return res.render("user/wishlist", { wishlitVariants: null });
    }

    const wishlitVariants = await Wishlist.aggregate([
        { $match: { _id: wishlist._id } },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "variants",
                localField: "items.variantId",
                foreignField: "_id",
                as: "items.variantDetails"
            }
        },
        { $unwind: "$items.variantDetails" },
        //lookup for productName
        {
            $lookup: {
                from: "products",
                localField: "items.variantDetails.productId",
                foreignField: "_id",
                as: "items.variantDetails.productDetails"
            }
        },
        { $unwind: "$items.variantDetails.productDetails" },

        {
            $group: {
                _id: "$_id",
                userId: { $first: "$userId" },
                items: { $push: "$items" },
               
            }
        }
        
    ])
    console.log(wishlitVariants[0].items[0].size,"wishlitVariants");
    console.log(user,"user in wishlist");
    res.render("user/wishlist",{wishlitVariants,user})

}catch(err){
    console.log(err);
}

    
}


const addWishlist = async (req,res) =>{
// console.log(" heelo wishlist");
try{

    const { id, size } = req.body
    console.log(id);

    let variant = await Variant.findOne({ _id: new ObjectId(id) })
    // console.log("cartvariant", variant);

    
    let userId
    let token = req.cookies.token
    // console.log(token);
    jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
        if (err) {
            throw new Error(' token not found')
        } else {
            userId = decode.userId
            // console.log(userId, "decoded");
        }
    })

    let cart = await Cart.findOne({ userId: userId });
    let item
    if(cart){
   
    item = cart.items.find(item => item.variantId.toString() === variant._id.toString() && item.size.trim() === size.trim());

    }
    if (item) {
        return res.status(400).json({ err: 'Item already exists in the cart', type: 'error' });
    } else {

    let wishlist = await Wishlist.findOne({ userId : userId})
    if (!wishlist) {
        wishlist = new Wishlist({
            userId: userId,
            items: []
        })
    }
   
    item = wishlist.items.find(item => item.variantId.toString() === variant._id.toString()); 
    if (item) {
        return res.status(400).json({err:' Item already exists in the wishlist', type:'error'})
     } else {
         // If the variant is not in the wishlist, add it as a new item
         wishlist.items.push({
             variantId: variant._id,
             quantity: 1,
             size: size.trim(),
             price: variant.price,
             isAvailable: variant.isVariantAvailable
         });
     }
    const newwishlist = await wishlist.save()
     console.log( newwishlist,'size');

    }

     res.status(200).json({ msg: ' item added to wishlist',type: 'success'})   

}catch(err){
    console.log(err);
}

}




const removeWishlistItem = async (req, res) => {        // cartId == itemId
    try {

        const { id, cartId } = req.body
        console.log(id, cartId, "id..");

        let userId

        let token = req.cookies.token
        console.log(token);
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error(' token not found')
            } else {
                userId = decode.userId
                console.log(userId, "decoded");
            }
        })


        const wishlist = await Wishlist.findOne({ userId: userId })
        console.log(wishlist, "wishlist");

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        // Find the item index in the items array
        const itemIndex = wishlist.items.findIndex(item => item._id.toString() === cartId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in wishlist' });
        }

        // Remove the item from the items array
        wishlist.items.splice(itemIndex, 1);


        // Save the updated cart
        await wishlist.save();

        res.json({ msg:'success' });


    } catch (err) {
        console.log(err);
    }

}





const addCart = async (req, res) => {
    try {
        const { id, size } = req.body;
        console.log("variantId", id);
        console.log(size, "size ...");

        // Fetch the variant from the database
        let variant = await Variant.findOne({ _id: new ObjectId(id) });
        console.log("cartvariant", variant);

        if (!variant) {
            return res.status(404).json({ err: 'Variant not found', type: 'error' });
        }

        // Check stock quantity for the selected size
        const stockItem = variant.stock.find(item => item.size.trim() === size.trim());
        if (!stockItem || stockItem.quantity <= 0) {
            return res.status(400).json({ err: 'Product is out of stock', type: 'error' });
        }

        let userId;
        let token = req.cookies.token;
        console.log(token);

        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                return res.redirect('/login');
            } else {
                userId = decode.userId;
                console.log(userId, "decoded");
            }
        });

        // Find or create a cart for the user
        let cart = await Cart.findOne({ userId: userId });

        if (!cart) {
            cart = new Cart({
                userId: userId,
                items: []
            });
        }

        // Check if the variant is already in the cart
        let item = cart.items.find(item => item.variantId.toString() === variant._id.toString() && item.size.trim() === size.trim());

        if (item) {
            return res.status(400).json({ err: 'Item already exists in the cart', type: 'error' });
        } else {
            // If the variant is not in the cart, add it as a new item
            cart.items.push({
                variantId: variant._id,
                quantity: 1,
                size: size,
                price: variant.price,
                isAvailable: variant.isVariantAvailable
            });
            
        }

        // Save the cart
        await cart.save();
         // Fetch the user's wishlist
         let wishlist = await Wishlist.findOne({ userId: userId });

         if (wishlist) {
             // Find the item in the wishlist and remove it
             wishlist.items = wishlist.items.filter(item => item.variantId.toString() !== variant._id.toString() || item.size.trim() !== size.trim());
             await wishlist.save();
         }

        
       
            // Fetch the updated cart to recalculate the total cart price
            const updatedCart = await Cart.findOne({ userId: userId });
            const totalCartPrice = updatedCart.items.reduce((total, item) => {
                return total + item.quantity * item.price;
            }, 0);

            const cartPriceUpdate = await Cart.updateOne(
                { userId: userId },
                { $set: { totalCartPrice: totalCartPrice} }
            );

            console.log(totalCartPrice);
            console.log("updatePrice", cartPriceUpdate);

           
        

        res.status(200).json({
            variantId: variant._id,
            quantity: 1,
            price: variant.price,
            totalCartPrice: totalCartPrice,
            msg: 'Item added to cart', type: 'success'

        });
        // res.status(200).json({ msg: 'Item added to cart', type: 'success' });

    } catch (err) {
        console.log("catcherr", err);
        res.status(500).json({ err: 'Internal Server Error', type: 'error' });
    }
};

module.exports = {
    getWishlist,
    addWishlist,
    removeWishlistItem,
    addCart
}