const Order = require('../../models/user/order')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Variant = require('../../models/variantSchema')
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const getOrders = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;
    console.log(page, limit, startIndex);

    let orders = await Order.find({}).sort({ createdAt: -1 }).skip(startIndex).limit(limit).lean();

   
    for (let order of orders) {
      for (let item of order.orderedItems) {
    
        let variant = await Variant.findOne({ _id: item.variantId }).lean();
        let product = await Product.findOne({ productName: item.productName }).lean();
  
        item.variantDetails = variant;
        item.productDetails = product || { offerApplied: false, offer: 0, offerPrice: 0 };
      }
    }

 
    const totalCount = await Order.countDocuments({});
    const totalPages = Math.ceil(totalCount / limit);
    console.log(totalCount, totalPages);


    res.render("admin/orders", { orders, currentPage: page, limit, totalCount, totalPages });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};





const getOrderDetails = async (req, res) => {
  const orderId = req.query.orderId;
  console.log("orderItemId", orderId);

  try {
      console.log("hey..");

      let pipeline = [
        {
          $match: { _id: new mongoose.Types.ObjectId(orderId) }
      },
      {
          $unwind: "$orderedItems"
      },
      {
          $lookup: {
              from: "variants",
              localField: "orderedItems.variantId",
              foreignField: "_id",
              as: "orderedItems.variantDetails"
          }
      },
      {
          $unwind: "$orderedItems.variantDetails"
      },
      {
          $lookup: {
              from: "products",
              localField: "orderedItems.variantDetails.productId", // Assuming variantDetails contain productId
              foreignField: "_id",
              as: "orderedItems.productDetails"
          }
      },
      {
          $unwind: "$orderedItems.productDetails"
      },
      {
          $group: {
              _id: "$_id",
              userId: { $first: "$userId" },
              orderId: { $first: "$orderId" },
              orderedItems: { $push: "$orderedItems" },
              shippingAddress: { $first: "$shippingAddress" },
              orderStatus: { $first: "$orderStatus" },
              paymentStatus: { $first: "$paymentStatus" },
              paymentMethod: { $first: "$paymentMethod" },
              orderDate: { $first: "$orderDate" },
              totalAmount: { $first: "$totalAmount" },
              createdAt: { $first: "$createdAt" },
              couponApplied:{$first:'$couponApplied'},   // changed here..
              couponCode:{$first: '$couponCode'}
          }
      }

      ]

    // pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;

    pipeline.push({ $skip: startIndex });
    pipeline.push({ $limit: limit });

      const orders = await Order.aggregate(pipeline);
      
      const matchCriteria = { _id: new mongoose.Types.ObjectId(orderId)}
      const totalCount = await Order.countDocuments(matchCriteria).exec();
      const totalPages = Math.ceil(totalCount / limit);

      console.log("orderDetails", orders[0].orderedItems);
      res.render("admin/orderDetails", { orders,currentPage: page, limit,totalCount,totalPages });
  } catch (err) {
      console.log(err);
  }
};




// update order status

const updateOrderStatus = async (req, res) => {
    try {
      const { itemId, status } = req.body;
      console.log(itemId, status);
      console.log('trying to change the status ..');
  
      const order = await Order.findOne({ "orderedItems._id": itemId });
  
      if (order) {
        const orderedItem = order.orderedItems.id(itemId);  // itemId
        if (orderedItem) {
          orderedItem.orderStatus = status;
         

          if(status === 'Delivered' ){
            orderedItem.deliveredDate = new Date();
            orderedItem.paymentStatus = 'Confirmed' 
          }else if( status == 'Shipped'){
            orderedItem.shippedDate = new Date()
          }
        const statuss =  await order.save();
          console.log(statuss,'statuss..');
          res.status(200).json({ success: true ,message:'status changed' });
        } else {
          res.status(404).json({ success: false, message: 'Ordered item not found' });
        }
      } else {
        res.status(404).json({ success: false, message: 'Order not found' });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
  };


module.exports ={

    getOrders,
    getOrderDetails,
    updateOrderStatus

}