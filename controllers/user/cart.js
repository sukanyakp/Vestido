const bcrypt = require('bcrypt');
const User = require('../../models/userSchema')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const Variant = require("../../models/variantSchema");
const Cart = require('../../models/user/cart')
const Order = require('../../models/user/order')
const Coupon = require('../../models/user/coupon')
const Offer = require('../../models/admin/offer')

const Address = require('../../models/address');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;


const getCart = async (req, res) => {
    try {
        let userId;
        let token = req.cookies.token;

        if (!token) {
            return res.redirect('/login');
        }

        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error('Token not found');
            } else {
                userId = decode.userId;
            }
        });

        let user = await User.findById(userId);
        console.log(user,'user');
        
        let cart = await Cart.findOne({ userId: userId });

        if (!cart || !cart.items.length) {
            return res.render("user/cart", { cartWithVariants: null });
        }

        const cartWithVariants = await Cart.aggregate([
            { $match: { _id: cart._id } },
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
                    totalCartPrice: { $last: "$totalCartPrice" }
                }
            }
        ]);

        const offers = await Offer.find();

        // Determine the best offer price
        let updatedCartWithVariants = cartWithVariants.map(v => {
            let bestOfferPrice = v.items[0].price;
            let bestOffer = 0;
            let offerApplied = false;

            if (v.items[0].variantDetails.productDetails.offerApplied && v.items[0].variantDetails.productDetails.offerPrice < bestOfferPrice) {
                bestOfferPrice = v.items[0].variantDetails.productDetails.offerPrice;
                bestOffer = v.items[0].variantDetails.productDetails.offer;
                offerApplied = true;
            }

            v.items[0].bestOfferPrice = bestOfferPrice;
            v.items[0].offerApplied = offerApplied;
            v.items[0].offer = bestOffer;

            return v;
        });

        res.render("user/cart", { cartWithVariants: updatedCartWithVariants, user });

    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
};



const addCart = async (req, res) => {
    try {
        const { id, size } = req.body;
        // console.log("variantId", id);
        console.log(size, "size ...");

        // Fetch the variant from the database using aggregation
        let variantAggregationResult = await Variant.aggregate([
            { $match: { _id: new ObjectId(id) } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'variants',
                    localField: 'products.variants',
                    foreignField: '_id',
                    as: 'variantsDet'
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'products.category',
                    foreignField: 'categoryName',
                    as: 'categories'
                }
            },
            { $unwind: '$products' },
        ]);

        // Ensure that a variant was found
        if (!variantAggregationResult || variantAggregationResult.length === 0) {
            return res.status(404).json({ err: 'Variant not found', type: 'error' });
        }

        // Extract the first variant from the aggregation result
        let variant = variantAggregationResult[0];
        // console.log("productdetails", variant);

        // Check stock quantity for the selected size
        const stockItem = variant.stock.find(item => item.size.trim() === size.trim());
        if (!stockItem || stockItem.quantity <= 0) {
            return res.status(400).json({ message: 'Product is out of stock ', type: 'error' });
        }

        let userId;
        let token = req.cookies.token;
        // console.log(token);

        if (!token) {
            return res.redirect('/login');
        }
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                return res.redirect('/login');
            } else {
                userId = decode.userId;
                // console.log(userId, "decoded");
                
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

        // Determine the best offer price
        let bestOfferPrice = variant.price;
        let bestOffer = 0;
        let offerApplied = false;
        
        if (variant.products.offerApplied && variant.products.offerPrice < bestOfferPrice) {
            bestOfferPrice = variant.products.offerPrice;
            bestOffer = variant.products.offer;
            offerApplied = true;
        }

        variant.bestOfferPrice = bestOfferPrice;
        variant.products.offer = bestOffer;
        variant.offerApplied = offerApplied;

        console.log( variant.bestOfferPrice,variant.products.offer,variant.offerApplied);
        
        if (item) {
            return res.status(400).json({ errC: 'Item already exists in the cart', type: 'errorC' });
        } else {
            cart.items.push({
                variantId: variant._id,
                quantity: 1,
                size: size,
                price: variant.bestOfferPrice,
                isAvailable: variant.isVariantAvailable,
                offer: variant.products.offer
            });
        }

        // Save the cart
      const newCart =  await cart.save();
      console.log(newCart,'newCart');
      

        // Fetch the updated cart to recalculate the total cart price
        const updatedCart = await Cart.findOne({ userId: userId });
        const totalCartPrice = updatedCart.items.reduce((total, item) => {
            console.log( item.quantity * item.price,item.price,'item.quantity * item.price');
            
            return total + item.quantity * item.price;
            
            
        }, 0);

    const Cartt =    await Cart.updateOne(
            { userId: userId },
            { $set: { totalCartPrice: totalCartPrice ,withoutDiscount:totalCartPrice} }
        );
        console.log(totalCartPrice,Cartt,'cart');



        
    //   if(updatedCart.couponApplied ){
    //     updatedCart.items.push({
    //         variantId: variant._id,
    //         quantity: 1,
    //         size: size,
    //         price: variant.bestOfferPrice,
    //         isAvailable: variant.isVariantAvailable,
    //         offer: variant.products.offer
    //     });

        
    //     updatedCart.couponApplied = false;
    //     updatedCart.appliedCoupon = { code: null, discountAmount: 0 };
    //        // Save the cart
    //   const newCart =  await cart.save();
    //   console.log(newCart,'noCoupon');

      

    //   }
        

        res.status(200).json({
            variantId: variant._id,
            quantity: 1,
            price: variant.price,
            totalCartPrice: totalCartPrice,
            msg: 'Item added to cart', type: 'success'
        });

    } catch (err) {
        console.log("catcherr", err);
        res.status(500).json({ err: 'Internal Server Error', type: 'error' });
    }
};




// const increment = async (req, res) => {
//     try {
//         const { vId, quantity, itemId, size } = req.body;

//         console.log("increment", vId, quantity, itemId, size);

//         // Aggregate query to find the variant and related data
//         const variant = await Variant.aggregate([
//             { $match: { _id: new ObjectId(vId) } },
//             {
//                 $lookup: {
//                     from: 'products',
//                     localField: 'productId',
//                     foreignField: '_id',
//                     as: 'products'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'variants',
//                     localField: 'products.variants',
//                     foreignField: '_id',
//                     as: 'variantsDet'
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'categories',
//                     localField: 'products.category',
//                     foreignField: 'categoryName',
//                     as: 'categories'
//                 }
//             },
//             { $unwind: '$products' }
//         ]);

//         if (!variant || variant.length === 0) {
//             return res.status(404).json({ message: "Variant not found" });
//         }

//         const variantData = variant[0];
//         const normalizedSize = size.trim().toLowerCase();
//         const sizeStock = variantData.stock.find(stockItem => stockItem.size.trim().toLowerCase() === normalizedSize);

//         if (!sizeStock) {
//             return res.status(400).json({ message: "Size not found" });
//         }

//         if (quantity > sizeStock.quantity) {
//             return res.status(400).json({ message: `Only ${sizeStock.quantity} quantity left` });
//         }

//         // Extract userId from JWT token
//         let userId;
//         let token = req.cookies.token;
//         jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
//             if (err) {
//                 throw new Error('Token not found');
//             } else {
//                 userId = decode.userId;
//             }
//         });

//         const userCart = await Cart.findOne({ userId: userId });

//         let pricePerUnit = variantData.price;

//         // Check if there's an active product offer
//         if (variantData.products.offerApplied && variantData.products.offerPrice < variantData.price) {
//             pricePerUnit = variantData.products.offerPrice;
//         }

//         if (userCart) {

//             const normalizedSize = size.trim()

//             console.log("Update query conditions:", {
//                 userId: userId.toString(),
//                 'items.variantId': vId.toString(),
//                 'items.size': normalizedSize
//             });
            
//             // const cartUpdateResult2 = await Cart.updateOne(
//             //     { userId: userId, 'items.variantId':  new mongoose.Types.ObjectId(vId), 'items.size': normalizedSize },
//             //     { $set: { 'items.$.quantity': quantity, 'items.$.price': pricePerUnit } }
//             // );

//             // console.log( cartUpdateResult2,'cartUpdateResult2','updated');
            
//             // if (cartUpdateResult2.modifiedCount === 0) {
//             //     return res.status(400).json({ message: 'Cart item not found for update' });
//             // }

//             // const updatedCart2 = await Cart.findOne({ userId: userId });
            
//             // Calculate withoutDiscount considering offer prices but ignoring coupon discounts

//             const withoutDiscount = userCart.items.reduce((total, item) => {
//                 const effectivePrice = item.offerApplied && item.offerPrice < item.price
//                     ? item.offerPrice
//                     : item.price;

//                 return total + item.quantity * effectivePrice;
//             }, 0);

//             console.log(withoutDiscount, 'withoutDiscount');
            
//             // Apply coupon logic if a coupon is applied
//             if (userCart.couponApplied) {
//                 userCart.items.forEach(item => {
//                     if (item.variantId.toString() === vId && item.size === size) {
//                         pricePerUnit = item.price; // Use the discounted price in the cart for totalCartPrice
//                         console.log(pricePerUnit, 'pricePerUnit');
//                     }
//                 });
//             }

//             const cartItem = userCart.items.find(item => item.variantId.toString() === vId && item.size === size);
//             const maxQuantityPerUser = 5;

//             if (cartItem && quantity > maxQuantityPerUser) {
//                 return res.status(400).json({ message: `Reached the maximum quantity of ${maxQuantityPerUser} for this item` });
//             }
//         }
//         const totalPrice = quantity * pricePerUnit;

//         console.log(totalPrice, 'totalPrice');       

//        const cartUpdateResult = await Cart.updateOne(
//                 { userId: userId, 'items.variantId':  new mongoose.Types.ObjectId(vId), 'items.size': normalizedSize },
//                 { $set: { 'items.$.quantity': quantity, 'items.$.price': pricePerUnit } }
//             );

// console.log(cartUpdateResult,'updated');

//         if (cartUpdateResult.modifiedCount > 0) {
//             const updatedCart = await Cart.findOne({ userId: userId });

//             // Calculate totalCartPrice considering any applied coupon
//             const totalCartPrice = updatedCart.items.reduce((total, item) => {
//                 return total + item.quantity * item.price;
//             }, 0);

//             // Update cart with totalCartPrice
//             await Cart.updateOne(
//                 { userId: userId },
//                 { $set: { totalCartPrice: totalCartPrice } }
//             );

//             // Calculate the discount amount
//             const discountAmount = withoutDiscount - totalCartPrice;

//             return res.status(200).json({
//                 variantId: vId,
//                 quantity: quantity,
//                 pricePerUnit: pricePerUnit,
//                 totalPrice: totalPrice,
//                 totalCartPrice: totalCartPrice,
//                 withoutDiscount: withoutDiscount,
//                 discountAmount: discountAmount
//             });
//         } else {
//             return res.status(400).json({ message: 'Cart update failed' });
//         }
//     } catch (err) {
//         console.log(err);
//         res.status(500).json({ message: err.message });
//     }
// };




const increment = async (req, res) => {
    try {
        const { vId, quantity, itemId, size } = req.body;

        console.log("increment", vId, quantity, itemId, size);

        const variant = await Variant.aggregate([
            { $match: { _id: new ObjectId(vId) } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'variants',
                    localField: 'products.variants',
                    foreignField: '_id',
                    as: 'variantsDet'
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'products.category',
                    foreignField: 'categoryName',
                    as: 'categories'
                }
            },
            { $unwind: '$products' }
        ]);

        if (!variant || variant.length === 0) {
            return res.status(404).json({ message: "Variant not found" });
        }

        const variantData = variant[0];
        const normalizedSize = size.trim().toLowerCase();
        const sizeStock = variantData.stock.find(stockItem => stockItem.size.trim().toLowerCase() === normalizedSize);

        if (!sizeStock) {
            return res.status(400).json({ message: "Size not found" });
        }

        if (quantity > sizeStock.quantity) {
            return res.status(400).json({ message: `Only ${sizeStock.quantity} quantity left` });
        }

        let pricePerUnit = variantData.price;
        if (variantData.products.offerApplied && variantData.products.offerPrice < variantData.price) {
            pricePerUnit = variantData.products.offerPrice;
        }

        let userId;
        let token = req.cookies.token;
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error('Token not found');
            } else {
                userId = decode.userId;
            }
        });

        const userCart = await Cart.findOne({ userId: userId });

      
        if (userCart) {
           
            // Apply coupon logic if a coupon is applied
            if (userCart.couponApplied) {
                const couponDiscount = userCart.appliedCoupon.discountAmount;
                userCart.items.forEach(item => {
                    if (item.variantId.toString() === vId && item.size === size) {
                        pricePerUnit = item.price;  // cart item.price (possibly discounted)
                    }
                });
            }

            const cartItem = userCart.items.find(item => item.variantId.toString() === vId && item.size === size);
            const maxQuantityPerUser = 5;

            if (cartItem && quantity > maxQuantityPerUser) {
                return res.status(400).json({ message: `Reached the maximum quantity of ${maxQuantityPerUser} for this item` });
            }
        }

        const totalPrice = quantity * pricePerUnit;

        const cartUpdateResult = await Cart.updateOne(
            { userId: userId, 'items.variantId': vId, 'items.size': size },
            { $set: { 'items.$.quantity': quantity, 'items.$.price': pricePerUnit } }
        );

        let withoutDiscount = 0;
        if (cartUpdateResult.modifiedCount > 0) {
            
            const updatedCart = await Cart.findOne({ userId: userId });
             // Calculate withoutDiscount using the original item price (ignoring coupon effects)
             withoutDiscount = updatedCart.items.reduce((total, item) => {
                const originalPrice = item.originalPrice || item.price; // Ensure original price is used
                console.log(originalPrice,'original');
                
                return total +( item.quantity  )* originalPrice;
            }, 0);
            console.log(withoutDiscount, 'withoutDiscount');



            const totalCartPrice = updatedCart.items.reduce((total, item) => {
                return total + item.quantity * item.price;
            }, 0);

            const discountAmount = withoutDiscount - totalCartPrice;

            const cartPriceUpdate = await Cart.updateOne(
                { userId: userId },
                { $set: { totalCartPrice: totalCartPrice ,withoutDiscount:withoutDiscount,discountAmount:discountAmount} }
            );

          
            return res.status(200).json({
                variantId: vId,
                quantity: quantity,
                pricePerUnit: pricePerUnit,
                totalPrice: totalPrice,
                totalCartPrice: totalCartPrice,
                withoutDiscount: withoutDiscount,
                discountAmount: discountAmount
            });
        }
        //  else {
        //     return res.status(400).json({ message: 'Cart update failed' });
        // }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message });
    }
};





// decrement function
const decrement = async (req, res) => {
    try {
        const { vId, quantity, cartId, size, couponCode } = req.body;

        console.log("decrement", vId, quantity, cartId, size, couponCode);

        const variant = await Variant.aggregate([
            { $match: { _id: new ObjectId(vId) } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'products'
                }
            },
            {
                $lookup: {
                    from: 'variants',
                    localField: 'products.variants',
                    foreignField: '_id',
                    as: 'variantsDet'
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'products.category',
                    foreignField: 'categoryName',
                    as: 'categories'
                }
            },
            { $unwind: '$products' }
        ]);

        if (!variant || variant.length === 0) {
            return res.status(404).json({ message: "Variant not found" });
        }

        const variantData = variant[0];
        let userId;

        let token = req.cookies.token;
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error('Token not found');
            } else {
                userId = decode.userId;
            }
        });

        const userCart = await Cart.findOne({ userId: userId });

        if (userCart) {
            const cartItem = userCart.items.find(item => item.variantId.toString() === vId && item.size === size);

            const minQuantityPerUser = 1;

            if (cartItem && quantity < minQuantityPerUser) {
                return res.status(400).json({ message: `Reached the minimum quantity` });
            }
        }

        
        let pricePerUnit = variantData.price;

        // // Calculate withoutDiscount using the original price, ignoring discounts or coupons
        // withoutDiscount = userCart.items.reduce((total, item) => {
        //     const originalPrice = item.originalPrice || item.price; // Use the original price
        //     return total +  (item.quantity )* originalPrice
        // }, 0);

        // if (variantData.products.offerApplied && variantData.products.offerPrice < variantData.price) {
        //     pricePerUnit = variantData.products.offerPrice;

        //     withoutDiscount = userCart.items.reduce((total, item) => {
        //         const originalPrice = item.originalPrice || item.products.offerPrice;
        //         return total + ( item.quantity  )* originalPrice
        //     }, 0);
        // }

        // Apply coupon logic
        if (userCart.couponApplied) {
            userCart.items.forEach(item => {
                if (item.variantId.toString() === vId && item.size === size) {
                    pricePerUnit = item.price; // Use the potentially discounted price from the cart
                }
            });
        }

        const totalPrice = quantity * pricePerUnit;

        const cartUpdateResult = await Cart.updateOne(
            { userId: userId, 'items.variantId': vId, 'items.size': size },
            { $set: { 'items.$.quantity': quantity, 'items.$.price': pricePerUnit } }
        );

        let withoutDiscount = 0;
        if (cartUpdateResult.modifiedCount > 0) {
            const updatedCart = await Cart.findOne({ userId: userId });
        
            // Calculate withoutDiscount using the original item price (ignoring coupon effects)
            withoutDiscount = updatedCart.items.reduce((total, item) => {
               const originalPrice = item.originalPrice || item.price; // Ensure original price is used
               console.log(originalPrice,'original');
               
               return total +( item.quantity ) * originalPrice;
           }, 0);
            const totalCartPrice = updatedCart.items.reduce((total, item) => {
                return total + item.quantity * item.price;
            }, 0);
            const discountAmount = withoutDiscount - totalCartPrice;

            const cartPriceUpdate = await Cart.updateOne(
                { userId: userId },
                { $set: { totalCartPrice: totalCartPrice,withoutDiscount:withoutDiscount,discountAmount:discountAmount } }
            );

         

            return res.status(200).json({
                variantId: vId,
                quantity: quantity,
                pricePerUnit: pricePerUnit,
                totalPrice: totalPrice,
                totalCartPrice: totalCartPrice,
                withoutDiscount: withoutDiscount,
                discountAmount: discountAmount
            });
        } else {
            return res.status(400).json({ message: 'Cart update failed' });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message });
    }
};





const removeItem = async (req, res) => {        // cartId == itemId
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


        const cart = await Cart.findOne({ userId: userId })
        console.log(cart, "cart");

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Find the item index in the items array
        const itemIndex = cart.items.findIndex(item => item._id.toString() === cartId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        // Remove the item from the items array
        cart.items.splice(itemIndex, 1);

        // Recalculate the total cart price
        cart.totalCartPrice = cart.items.reduce((total, item) => total + item.quantity * item.price, 0);

        if(cart.couponApplied ){
            cart.withoutDiscount =  cart.items.reduce((total, item) => total + item.quantity * item.originalPrice, 0);
            console.log(cart.withoutDiscount,'  cart.withoutDiscount');
            cart.discountAmount = cart.withoutDiscount- cart.totalCartPrice 
        }else{
            cart.withoutDiscount =  cart.totalCartPrice
            console.log(cart.withoutDiscount,'  cart.withoutDiscount');
            cart.discountAmount =  0
        }
      
        

        // Save the updated cart
        await cart.save();

        res.json({ totalCartPrice: cart.totalCartPrice ,withoutDiscount: cart.withoutDiscount ,discountAmount:cart.discountAmount });


    } catch (err) {
        console.log(err);
    }

}




module.exports = {
    getCart,
    addCart,
    increment,
    decrement,
    removeItem,
   

}