const Category = require('../../models/categoryShema');
const Brand = require("../../models/brandSchema")
const subcategory = require("../../models/subCategorySchema")
const Colors = require("../../models/colors")
const Sizes = require('../../models/sizes')
const Products = require("../../models/productSchema")
const Variant = require("../../models/variantSchema");
const Order = require('../../models/user/order')
const Product = require('../../models/productSchema')
const mongoose = require('mongoose')
const { ObjectId } = mongoose.Types;
const cloudinary = require('cloudinary').v2;


const getSalesReport = async (req, res) => {
    try {

        const totalOrders = await Order.find()
        console.log(totalOrders,'totalOrders');
        
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const startIndex = (page - 1) * limit;
        console.log(page, limit, startIndex);

        const reportType = req.query.reportType;
        // console.log(reportType, 'reportType');

        let filter = {};
        const currentDate = new Date();
        let startDate;

        switch (reportType) {
            case 'daily':
                startDate = new Date(currentDate.setHours(0, 0, 0, 0));
                break;
            case 'weekly':
                const weekStart = currentDate.getDate() - currentDate.getDay();
                startDate = new Date(currentDate.setDate(weekStart));
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'monthly':
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                break;
            case 'yearly':
                startDate = new Date(currentDate.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0);
                break;
        }

        filter = {
            'orderedItems.deliveredDate': { $gte: startDate }
        };

        const deliveredOrders = await Order.aggregate([
            { $unwind: "$orderedItems" }, 
            
            { $sort: { "orderedItems.deliveredDate": -1}},
            { $match: {
                "orderedItems.orderStatus": "Delivered",
                "orderedItems.deliveredDate": { $gte: startDate }
            }},
           
        ]).exec();      
       
        for (let order of deliveredOrders) {
           
            let variant = await Variant.findOne({ _id: order.orderedItems.variantId }).lean();   

            order.orderedItems.variantDetails = variant;

         
            if (variant && variant.productId) {
                let product = await Product.findOne({ _id: variant.productId }).lean();
           
                order.orderedItems.productDetails = product;
            }
        }
       
        // Get total count of filtered orders
        const totalCount = await Order.countDocuments({
            "orderedItems.orderStatus": "Delivered",
            ...filter
        });
        const totalPages = Math.ceil(totalCount / limit);
        // console.log(totalCount, deliveredOrders, 'deliveredOrders');


        res.render('admin/sales-report', {
            orders: deliveredOrders,
            currentPage: page,
            limit,
            totalCount,
            totalPages,
            reportType ,
            totalOrders
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("Error retrieving sales report");
    }
};





module.exports ={
    getSalesReport
}