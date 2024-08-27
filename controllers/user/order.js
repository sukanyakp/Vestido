const bcrypt = require('bcrypt');
const User = require('../../models/userSchema')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const Variant = require("../../models/variantSchema");
const Cart = require('../../models/user/cart')
const Order = require('../../models/user/order')
const Address = require('../../models/address');
const Wallet = require('../../models/user/wallet')
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const Razorpay = require('razorpay');
const order = require('../../models/user/order');
const { type } = require('os');


const razorpayInstance = new Razorpay({
    key_id: process.env.YOUR_KEY_ID ,
    key_secret: process.env.YOUR_KEY_SECRET
    
});       


const placeOrder = async (req, res) => {
    try {
        const { cartId, address, paymentMethod ,couponCode } = req.body;
        console.log(cartId, address, paymentMethod,couponCode, "cartId");

        if (!cartId || !address || !paymentMethod) {
            return res.status(400).json({ msg: 'Invalid order details' });
        }

        let userId;
        let token = req.cookies.token;

        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                return res.status(401).json({ msg: 'Token not found or invalid' });
            } else {
                userId = decode.userId;
            }
        });

        const user = await User.findById(userId);
        let userAddress = await Address.find({ 'addresses._id': new ObjectId(address) });
        let mainAddress = userAddress[0].addresses.find(addr => addr._id.equals(new ObjectId(address)));

        const cart = await Cart.aggregate([
            { $match: { _id: new ObjectId(cartId) } },
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
                    totalCartPrice: { $last: "$totalCartPrice" },
                    appliedCoupon: { $last: '$appliedCoupon' }
                }
            }
        ]);

        const discount = cart[0].appliedCoupon ? cart[0].appliedCoupon.discountAmount : 0;
        const coupon = cart[0].appliedCoupon ? cart[0].appliedCoupon.code : '';
        console.log(discount,coupon);
        
       
        const noOfItems = cart[0].items.length;
        const discountForEach = Math.ceil( discount / noOfItems);
        const discountTotal = Math.ceil(cart[0].totalCartPrice - discount ) ;
console.log( noOfItems,discountForEach,discountTotal,'discountTotal');

        // const newOrderId = uuidv4();

       
const shortUuid = uuidv4().split('-')[0]; // Take the first part of the UUID
const newOrderId = `ORD${shortUuid}`;
console.log(newOrderId);

        const order = new Order({
            userId: userId,
            orderId: newOrderId,
            orderedItems: [],
            shippingAddress: [],
            paymentMethod: paymentMethod,
            orderStatus: 'Pending',
            totalAmount: cart[0].totalCartPrice,
            couponCode:coupon ,
            couponApplied: coupon ? true : false ,
            discountTotal:discountTotal
        });

        let date = new Date();
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        let localdate = date.toLocaleDateString('en-GB', options);

        cart[0].items.forEach((item) => {
            order.orderedItems.push({
                name: user.name,
                phone: user.phone,
                variantId: item.variantId,
                productName: item.variantDetails.productDetails.productName,
                category: item.variantDetails.productDetails.category,
                brands:item.variantDetails.productDetails.brand,
                images: item.variantDetails.images,
                quantity: item.quantity,
                price: item.price,
                color: item.variantDetails.colors,
                orderDate: localdate,
                confirmedDate: localdate,
                paymentStatus: 'Pending',
                paymentMethod: paymentMethod,
                totalAmount: (item.quantity * item.price) ,
                size: item.size
            });
        });

        order.shippingAddress.push({
            name: mainAddress.name,
            mobile: mainAddress.mobile,
            pincode: mainAddress.pincode,
            address: mainAddress.address,
            district: mainAddress.district,
            state: mainAddress.state
        });

        for (const item of cart[0].items) {
            try {

                console.log('heyy..');
                
                let variant = await Variant.findById(item.variantId);
                if (!variant) {
                    console.error(`Variant with ID ${item.variantId} not found`);
                    continue;
                }
                const index = variant.stock.findIndex(stockItem => stockItem.size.trim() === item.size.trim());
                if (index === -1) {
                    console.error(`Size ${item.size} not found for variant ID ${item.variantId}`);
                    continue;
                }
                
                if (typeof variant.stock[index].quantity !== 'number' || variant.stock[index].quantity < item.quantity) {
                    console.error(`Invalid quantity or insufficient stock for variant ID ${item.variantId}`);
                    continue;
                }
               


                variant.stock[index].quantity -= item.quantity;   //stock management
                console.log(variant.stock[index].quantity,  item.quantity, 'item.quantity' );
                console.log('2'); 
                const saveResult = await variant.save();
                console.log('Save result:', saveResult);
            } catch (error) {
                console.error('Error updating variant:', error);
            }
        }


        // console.log('hello razorpay..');
        if (paymentMethod === 'razorpay') {
            const receiptPrefix = 'order_rcptid_';
            const maxReceiptLength = 40;
            let trimmedOrderId = newOrderId.substring(0, maxReceiptLength - receiptPrefix.length);
            const receipt = `${receiptPrefix}${trimmedOrderId}`;
            // console.log('hello razorpay2..');
            const options = {
                amount: order.totalAmount * 100,
                currency: 'INR',
                receipt: receipt,
                payment_capture: '1'
            };
            // console.log('hello razorpay.3.');
            try {
                const response = await razorpayInstance.orders.create(options);
                order.razorpayOrderId = response.id;
                await order.save();

          
             return res.status(200).json({ type:'success',orderId: order._id,razorpayOrderId: order.razorpayOrderId,cartId:cartId , phoneNumber: 8756345467})
            } catch (err) {
                console.error('Error creating Razorpay order:', err);

                return res.status(500).json({ msg: 'Error creating Razorpay order', error: err });
            }
        } else if (paymentMethod === 'wallet') {
            if (user.walletBalance >= order.totalAmount) {
                user.walletBalance -= order.totalAmount;
                await user.save();

                order.orderedItems.forEach(item => {
                    item.orderStatus = 'Confirmed';
                    item.paymentStatus = 'Confirmed';
                });
                order.orderStatus = 'Confirmed';
                order.paymentStatus = 'Confirmed';
                await order.save();

               
        // Update wallet balance and add transaction history
        const walletUpdate = await Wallet.findOneAndUpdate(
            { userId: user._id },
            {
                $inc: { balance: -order.totalAmount },
                $push: {
                    transaction_history: {
                        amount: -(order.totalAmount) *100,
                        type: 'debit',
                        description: 'Order payment',
                        dateTime: new Date()
                    }
                }
            },
            { new: true }
        );
        if (!walletUpdate) {
            return res.status(400).json({
                type: 'error',
                msg: 'Wallet update failed'
            });
        }

        // console.log('walletUpdate', walletUpdate);

                await Cart.deleteOne({ _id: cartId });
                return res.status(200).json({
                    type: 'success',
                    msg: "Order placed successfully using wallet",
                    orderId: order._id
                });
            } else {
                return res.status(400).json({ type:'error', msg: 'Insufficient wallet balance' });

            }
        } else if (paymentMethod === 'Cash on delivery') {

            if ( order.totalAmount <= 1000) {
            order.orderedItems.forEach(item => {
                item.orderStatus = 'Confirmed';
                item.paymentStatus = 'Pending';
            });
            order.orderStatus = 'Confirmed';
            order.paymentStatus = 'Pending';
            await order.save();
console.log(cart[0].appliedCoupon.code,'cart[0].appliedCoupon.code');

            await Cart.deleteOne({ _id: cartId });
            return res.status(200).json({
                type: 'success',
                msg: "Order placed",
                orderId: order._id,
                // code:cart[0].appliedCoupon.code
            });
        }else {

            return res.status(400).json({
                type:'false',
                msg:'Can not Order more than 1000'

            })
        }
    }
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Internal Server Error', error: err });
    }
};


// Verify Payment Endpoint

const verifyPayment = async (req, res) => {
    console.log('hey verify..');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature ,orderId,cartId } = req.body;
    console.log(razorpay_order_id,razorpay_payment_id,razorpay_signature, orderId,cartId, "razorpay_order_id");

    try {
        // Verify the payment details with Razorpay
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.YOUR_KEY_SECRET)
                                      .update(body.toString())
                                      .digest('hex');

        if (expectedSignature === razorpay_signature) {

       
            const result = await Order.updateOne(
                { _id: new ObjectId(orderId) },
                {
                    
                    $set:{
                        'orderedItems.$[].orderStatus': 'Confirmed',
                        'orderedItems.$[].paymentStatus': 'Confirmed',
                        orderStatus: 'Confirmed',
                        paymentStatus: 'Confirmed',
                        
                }},   // confirmed 
                { new: true }
            );
          
            console.log('Update result:', result);

            await Cart.deleteOne({ _id: cartId });
            
            res.status(200).json({ type: 'success', msg: 'Payment verified and order placed successfully' });
        } else {
            res.status(400).json({ type: 'error', msg: 'Invalid payment signature' });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: 'Internal Server Error', error: err });
    }
};




   



const orderHistory = async (req, res) => {
    try {
        let userId;

        let token = req.cookies.token;
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error('Token not found');
            } else {
                userId = decode.userId;
            }
        });

        const orders = await Order.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) }
            },
            {
                $sort: { createdAt: -1 }  // Sorting by createdAt in descending order
            },
            {
                $unwind: "$orderedItems"
            },
            {
                $lookup: {
                    from: "variants", // The name of the variants collection
                    localField: "orderedItems.variantId",
                    foreignField: "_id",
                    as: "orderedItems.variantDetails"
                }
            },
            {
                $unwind: "$orderedItems.variantDetails"
            },
            {
                $group: {
                    _id: "$_id",
                    userId: { $first: "$userId" },
                    orderId: { $first: "$orderId" },
                    orderedItems: { $push: "$orderedItems" },
                    shippingAddress: { $first: "$shippingAddress" },
                    createdAt: { $first: "$createdAt" }  // Include createdAt in the group
                }
            }
        ]);

        if (!orders) {
            return res.render('user/orderHistory', { orders: null });
        }

        res.render('user/orderHistory', { orders });

    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
};




const getOrderDetails = async (req, res) => {
    
    const orderId = req.query.orderId;
    console.log("orderItemId",orderId);
    try { 
        // const orders = await Order.find({ _id: new ObjectId (orderItemId)})

        let userId;

        let token = req.cookies.token;
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error('Token not found');
            } else {
                userId = decode.userId;
            }
        });


        const orders = await Order.aggregate([
            {
                $match: { _id: new ObjectId (orderId) ,userId : new ObjectId(userId)}
            },
            {
                $unwind: "$orderedItems"
            },
            {
                $lookup: {
                    from: "variants", // The name of the variants collection
                    localField: "orderedItems.variantId",
                    foreignField: "_id",
                    as: "orderedItems.variantDetails"
                }
            },
            {
                $unwind: "$orderedItems.variantDetails"
            },
            {
                $group: {
                    _id: "$_id",
                    userId: { $first: "$userId" },
                    orderId: { $first: "$orderId" },
                    orderedItems: { $push: "$orderedItems" },
                    shippingAddress: { $first: "$shippingAddress" },
                    paymentMethod:{$first :'$paymentMethod'},
                    paymentStatus:{$first:'$paymentStatus'},
                    totalAmount:{$last:'$totalAmount'}
                }
            }
        ]);
        console.log("orderDetails", orders[0].orderedItems);

//   let  orderItem = orders.orderedItems.find(item => item._id.equals(new ObjectId(orderItemId)));     
//         console.log('order',order);


        res.render("user/order", { orders });
    } catch (error) {
        console.error("Error fetching order details:", error);
        // res.status(500).send("An error occurred while fetching order details.");
        return res.redirect('/')  
    }
};






// Route to handle order cancellation
// router.post('/orders/cancel/:orderId',
    
    
const cancelOrder = async (req, res) => {
    try {
        const { itemId ,reason} = req.body;
        console.log('Cancelling order for item:', itemId,reason);

        const order = await Order.findOne({ "orderedItems._id": itemId });
        // console.log(order,'order');
        

        let date = new Date();
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        let localdate = date.toLocaleDateString('en-GB', options);

        if (order) {
            const orderedItem = order.orderedItems.id(itemId);
            if (orderedItem) {
                orderedItem.orderStatus = 'Canceled';
                orderedItem.cancelledDate = localdate;


                   // Increase the stock quantity for the canceled item
                   const variant = await Variant.findById(orderedItem.variantId);
                   if (variant) {
                       const stockIndex = variant.stock.findIndex(stockItem => stockItem.size.trim() === orderedItem.size.trim());
                       if (stockIndex !== -1) {
                           variant.stock[stockIndex].quantity += orderedItem.quantity;
                           await variant.save(); // Save the updated stock
                       } else {
                           console.error(`Size ${orderedItem.size} not found for variant ID ${orderedItem.variantId}`);
                       }
                   } else {
                       console.error(`Variant with ID ${orderedItem.variantId} not found`);
                   }


                await order.save();



                // Check if payment status is 'Confirmed'
                if (orderedItem.paymentStatus === 'Confirmed') {
                    let userId;
                    let token = req.cookies.token;

                    jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
                        if (err) {
                            return res.status(401).json({ msg: 'Token not found or invalid' });
                        } else {
                            userId = decode.userId;
                        }
                    });

                    const user = await User.findById(userId);
                    console.log(user);
                    let orderTotal = order.totalAmount;
                    let orderedItemAmount = orderedItem.totalAmount 
                    console.log(orderTotal,orderedItemAmount, 'order.totalAmount');

                    const newBalance = await User.findOneAndUpdate(
                        { _id: userId},
                        {  $inc: { walletBalance: orderedItemAmount } },
                        { new: true, upsert: true }
                    )

                    // const newBalance = user.walletBalance + orderedItemAmount;

                    // await user.save()
                    console.log(newBalance.walletBalance, 'user.walletBalance');
                    

                    const walletUpdate = await Wallet.findOneAndUpdate(
                        { userId: user._id },
                        {
                            $inc: { balance: orderedItemAmount }, // Increment the existing balance by the order total
                            $push: {
                                transaction_history: {
                                    amount: orderedItemAmount *100 ,
                                    type: 'credit',
                                    description: 'Order payment refund',
                                    dateTime: new Date()
                                }
                            }
                        },
                        { new: true, upsert: true } // Upsert will insert if no document is found
                    );

                    console.log('walletUpdate', walletUpdate);
                }

                res.json({ success: true, canceledDate: orderedItem.cancelledDate ,itemId:itemId });
            } else {
                res.status(404).json({ success: false, message: 'Ordered item not found' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
};


  


// returnOrder
const returnOrder = async (req, res) => {
    try {
        const { itemId ,reason} = req.body;
        console.log('Returning order for item:', itemId,reason);

        const order = await Order.findOne({ "orderedItems._id": itemId });

        if (order) {
            const orderedItem = order.orderedItems.id(itemId);
            console.log(orderedItem.totalAmount, ' totalAmount...');

            let date = new Date();
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            let localdate = date.toLocaleDateString('en-GB', options);

            if (orderedItem) {
               
                orderedItem.orderStatus = 'Returned';
                orderedItem.returnedDate = localdate; 
                
                   // Increase the stock quantity for the canceled item
                   const variant = await Variant.findById(orderedItem.variantId);
                   if (variant) {
                       const stockIndex = variant.stock.findIndex(stockItem => stockItem.size.trim() === orderedItem.size.trim());
                       if (stockIndex !== -1) {
                           variant.stock[stockIndex].quantity += orderedItem.quantity;
                           await variant.save(); // Save the updated stock
                       } else {
                           console.error(`Size ${orderedItem.size} not found for variant ID ${orderedItem.variantId}`);
                       }
                   } else {
                       console.error(`Variant with ID ${orderedItem.variantId} not found`);
                   }


                await order.save();

              
                    let userId;
                    let token = req.cookies.token;

                    jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
                        if (err) {
                            return res.status(401).json({ msg: 'Token not found or invalid' });
                        } else {
                            userId = decode.userId;
                        }
                    });

                    const user = await User.findById(userId);
                    console.log(user.walletBalance, 'user.walletBalance');
                    let orderTotal = orderedItem.totalAmount;
                    console.log(orderTotal, 'order.totalAmount');

                    const newBalance = user.walletBalance + orderTotal;

                    // Update wallet balance and add transaction history
                    const walletUpdate = await Wallet.findOneAndUpdate(
                        { userId: user._id },
                        {
                            $inc: { balance: orderTotal },
                            $push: {
                                transaction_history: {
                                    amount: orderTotal *100,
                                    type: 'credit',
                                    description: 'Order payment refund',
                                    dateTime: new Date()
                                }
                            }
                        },
                        { new: true, upsert: true } // Upsert will insert if no document is found
                    );

                    console.log('walletUpdate', walletUpdate);
                

                res.json({ success: true, itemId, status: 'Returned', msg: "Order returned successfully, payment will be returned through wallet", returnedDate: orderedItem.returnedDate });

            } else {
                res.status(404).json({ success: false, message: 'Ordered item not found' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Failed to return order' });
    }
};

  
  
 

const razorpayFailure = async (req, res) => {
    try {
        console.log('Handling Razorpay payment failure');

        const { orderId, status ,cartId} = req.body;
        console.log(orderId, status,cartId, 'status');

        // Validate orderId
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        // Validate the status (though it should always be "Pending" in this case)
        if (status !== 'Pending') {
            return res.status(400).json({ error: 'Invalid status provided' });
        }

        // Update order in the database
        const result = await Order.updateOne(
            { _id: new ObjectId(orderId) },
            {
                $set: {
                    'orderedItems.$[].orderStatus': 'Confirmed',
                    'orderedItems.$[].paymentStatus': 'Pending',
                    orderStatus: 'Confirmed',
                    paymentStatus: 'Pending'
                }
            },
            { new: true }
        );

        // Check if the update was successful
        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Order not found or already updated' });
        }

        console.log(result, 'Order status updated successfully');

        await Cart.deleteOne({ _id: cartId });

        // Send a success response
        res.status(200).json({ message: 'Order status updated to payment pending' });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};




const payAgain = async (req, res) => {
    try {
        console.log('pay again?..');

        const orderId = req.query.orderId
        // const { orderId } = req.body;

        console.log(orderId, 'orderId');

        // Convert amount to paise
        // const amountInPaise = amount * 100;

        const orders = await Order.findOne({ _id:orderId})
        console.log(orders,'orders');
        
        console.log(orders.totalAmount,'totalamount');
        

        const receiptPrefix = 'order_rcptid_';
        const maxReceiptLength = 40;
        let trimmedOrderId = orderId.substring(0, maxReceiptLength - receiptPrefix.length);
        const receipt = `${receiptPrefix}${trimmedOrderId}`;

        const options = {
            amount: orders.totalAmount * 100,
            currency: 'INR',
            receipt: receipt,
            payment_capture: '1'
        };

        const response = await razorpayInstance.orders.create(options);
                orders.razorpayOrderId = response.id;
                await orders.save();
        // Create Razorpay order
        // const order = await razorpayInstance.orders.create({
        //     amount: orders.totalAmount,
        //     currency: 'INR',
        //     receipt: crypto.randomBytes(10).toString('hex') // Generate a unique receipt ID
        // });

        // Respond with order details
        res.json({
            type: 'success',
            msg: 'Order created successfully',
            amount: orders.totalAmount ,
            order_id: orderId ,// Return the Razorpay order ID
            phoneNumber: 8756345467,
            razorpayOrderId: orders.razorpayOrderId
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            type: 'error',
            msg: 'Internal Server Error'
        });
    }
}




// Verify Payment Endpoint

const payAgainVerifyPayment = async (req, res) => {

    console.log('hey payagain verify..');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature ,orderId } = req.body;

    console.log(razorpay_order_id,razorpay_payment_id,razorpay_signature, orderId, "razorpay_order_id");

    try {
        // Verify the payment details with Razorpay
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.YOUR_KEY_SECRET)
                                      .update(body.toString())
                                      .digest('hex');

        if (expectedSignature === razorpay_signature) {

       
            const result = await Order.updateOne(
                { _id: new ObjectId(orderId) },
                {
                    
                    $set:{
                        'orderedItems.$[].orderStatus': 'Confirmed',
                        'orderedItems.$[].paymentStatus': 'Confirmed',
                        orderStatus: 'Confirmed',
                        paymentStatus: 'Confirmed',
                        
                }},   // confirmed 
                { new: true }
            );
          
            console.log('Update result:', result);

            // await Cart.deleteOne({ _id: cartId });
            
            res.status(200).json({ type: 'success', msg: 'Payment verified and order placed successfully' });
        } else {
            res.status(400).json({ type: 'error', msg: 'Invalid payment signature' });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: 'Internal Server Error', error: err });
    }
};



module.exports = {

    placeOrder, 
    orderHistory,
    verifyPayment,
    getOrderDetails,
    cancelOrder,
    returnOrder,
    razorpayFailure,
    payAgain,
    payAgainVerifyPayment

}