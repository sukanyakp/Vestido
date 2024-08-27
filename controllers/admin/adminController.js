const jwt = require("jsonwebtoken")
const User = require("../../models/userSchema")
const bcrypt = require("bcrypt")
const Category = require("../../models/categoryShema")
const Order = require('../../models/user/order')
const Variant = require('../../models/variantSchema')
const Product = require('../../models/productSchema')



//generate Token
function generateToken(payload) {
    return jwt.sign(payload, process.env.SECRET_KEY);
}

const getUser = async (req, res) => {
    try {
// pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;

        let user = await User.find({ isListed: false}).skip(startIndex).limit(limit)

        const matchCriteria = {isListed: false}
        const totalCount = await User.countDocuments(matchCriteria).exec();
        const totalPages = Math.ceil(totalCount / limit);
        res.render('admin/listusers', { users: user,currentPage: page, limit,totalCount,totalPages  });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
};




//get Blocked users

const getBlockedUser = async (req, res) => {
    try {
        let user = await User.find({ isListed: true });

        res.render('admin/blockedusers', { users: user });
    } catch (error) {
        console.error('Error fetching blocked users:', error);
        res.status(500).send('Internal Server Error');
    }
};





//validate admin login 

const validateLogin = async (req,res)=>{
    try{
        const {email,password} = req.body

        const user = await User.findOne({email:email})

        if(user){
            const isPassword = await bcrypt.compare(password,user.password)
            if(isPassword ){
                if(user.isAdmin== true){
                    const payload = {
                        name:user.name,
                        userId: user._id
                    }
                    const token = generateToken(payload)
                    res.cookie("admintoken", token, {
                        maxAge: 24 * 60 * 60 * 1000,
                        httpOnly: true
                    });
                    res.redirect('/admin')

                }else{
                    throw new Error("invalid password")
                
            }
        }else{
            throw new Error("invalid email")
    }
}
    }catch (err) {
        console.log(err)
        res.render('admin/adminlogin', { err: "invalid email and password" })
    }
}



//  function to generate OTP
const generateOTP = ()=>{
    return(crypto.randomBytes(3).readUIntBE(0,3) % 1000000).toString().padStart(6,"0")
}




// Function to send OTP via email
const sendOTP = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for Registration',
            text: `Your OTP is ${otp}`
        };
        console.log("otp", otp);

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.response);
    } catch (error) {
        console.error("Error occurred:", error);
        throw new Error("Failed to send email");
    }
};



const checkOTPEmail = async (req, res) => {
    try {
        let email = req.body.email;

        let user = await User.findOne({ email: email });
        if (user) {
            if (user.OTPVerification == true) {
                let registeredEmail = user.email;
                let OTP = generateOTP();
                sendOTP(registeredEmail, OTP);
                res.redirect("/");
            } else {
                res.render('user/otpEmail', { err: "Invalid Email address" });
            }
        } else {
            res.render('user/otpEmail', { err: "Invalid Email address" });
        }
    } catch (error) {
        console.error('Error during OTP email check:', error);
        res.status(500).send('Internal Server Error');
    }
};



//block user
const blockuser = async (req, res) => {
    try {
        let userId = req.query.userId;
        console.log(`id is ${userId}`);

        let user = await User.updateOne(
            { _id: userId },
            {
                $set: {
                    isListed: true
                }
            }
        );      

        if (user.nModified > 0) {  

            res.status(200).send("User blocked successfully");
        } else {
            res.status(404).send("User not found or already blocked");
        }
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).send('Internal Server Error');
    }
};



// unblock user
const unBlockUser = async (req, res) => {
    try {
        let userId = req.query.userId;
        console.log(`id is ${userId}`);

        let user = await User.updateOne(
            { _id: userId },
            {
                $set: {
                    isListed: false
                }
            }
        );

        if (user) {
            res.status(200).send("user unblocked successfully");
        } else {
            res.status(404).send("user not found");
        }
    } catch (error) {
        console.error(`Error unblocking user: ${error.message}`);
        res.status(500).send("An error occurred while unblocking the user");
    }
}



const getAdmin = async (req, res) => {
    const reportType = req.query.reportType || 'weekly'; // Default to weekly if no query provided
    console.log(reportType, 'reportType');

    let startDate;
    const currentDate = new Date();

    switch (reportType.toLowerCase()) {
        case 'weekly':
            const weekStart = currentDate.getDate() - currentDate.getDay();
            startDate = new Date(currentDate.setDate(weekStart));
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yearly':
            startDate = new Date(currentDate.getFullYear(), 0, 1);
            break;
        default:
            const defaultWeekStart = currentDate.getDate() - currentDate.getDay();
            startDate = new Date(currentDate.setDate(defaultWeekStart));
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    try {
        // Fetch top 10 products and categories simultaneously
        const [deliveredOrders, topProducts, topCategories,topBrands] = await Promise.all([
            Order.aggregate([
                { $unwind: "$orderedItems" },
                { $match: { 
                    "orderedItems.orderStatus": "Delivered",
                    "orderedItems.deliveredDate": { $gte: startDate }
                }},
                {
                    $group: {
                        _id: reportType.toLowerCase() === 'weekly' ? { $dayOfWeek: "$orderedItems.deliveredDate" } : { $month: "$orderedItems.deliveredDate" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),
            getTopProducts(),
            getTopCategory(),
            getTopBrands()
        ]);

        let labels = [];
        let dataPoints = [];

        if (reportType.toLowerCase() === 'weekly') {
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const ordersByDay = new Array(7).fill(0);
            deliveredOrders.forEach(order => {
                const dayIndex = order._id - 1;
                ordersByDay[dayIndex] = order.count;
            });
            dataPoints = ordersByDay;
        } else if (reportType.toLowerCase() === 'yearly') {
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const ordersByMonth = new Array(12).fill(0);
            deliveredOrders.forEach(order => {
                const monthIndex = order._id - 1;
                ordersByMonth[monthIndex] = order.count;
            });
            dataPoints = ordersByMonth;
        }

        console.log(reportType,dataPoints,labels);
        

        res.render("admin/adminDash", { 
            labels, 
            dataPoints, 
            reportType, 
            topProducts, // Pass top products to the view
            topCategories, // Pass top categories to the view
            topBrands
        });
    } catch (error) {
        console.error("Error in getAdmin function:", error);
        res.status(500).send("Internal Server Error");
    }
};

// get top 10 category
async function getTopCategory() {
    try {
        const topCategories = await Order.aggregate([
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: '$orderedItems.category',
                    count: { $sum: 1 },
                    image: { $first: '$orderedItems.images' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        return topCategories;
    } catch (err) {
        console.error("Error in getTopCategory:", err);
        throw err;
    }
}

// get top 10 products
async function getTopProducts() {
    try {
        const topProducts = await Order.aggregate([
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: '$orderedItems.productName',
                    count: { $sum: 1 },
                    image: { $first: '$orderedItems.images' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        return topProducts;
    } catch (err) {
        console.error("Error in getTopProducts:", err);
        throw err;
    }
}

async function getTopBrands() {
    try {
        const topBrands = await Order.aggregate([
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: '$orderedItems.brands',
                    count: { $sum: 1 },
                    image: { $first: '$orderedItems.images' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        return topBrands;
    } catch (err) {
        console.error("Error in getTopProducts:", err);
        throw err;
    }
}

const getAdminLogin = (req,res)=>{
    res.render("admin/adminLogin")
}

const getAdminOtp =(req,res)=>{
    res.render("admin/adminOtp")
}

const getAdminOtpEmail = (req,res) =>{
    res.render("admin/adminOtpEmail")
}


//get Category
const getCategory = async (req, res) => {
    try {
          // pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;

    // pipeline.push({ $skip: startIndex });
    // pipeline.push({ $limit: limit });
        let categories = await Category.find({ isDeleted: false }).skip(startIndex).limit(limit)

        const matchCriteria = {isDeleted:false}
        const totalCount = await Category.countDocuments(matchCriteria).exec();
        const totalPages = Math.ceil(totalCount / limit);
        res.render('admin/category', { categories: categories ,currentPage: page, limit,totalCount,totalPages});
    } catch (error) {
        console.error(`Error fetching categories: ${error.message}`);
        res.status(500).send("An error occurred while fetching categories");
    }
}


//get add new category
const getAddNewCategory = (req, res) => {
    try {
        res.render('admin/addcategory');
    } catch (error) {
        console.error(`Error rendering add category page: ${error.message}`);
        res.status(500).send("An error occurred while rendering add category page");
    }
}




//get deleted categries
const getDeletedCategories = async (req, res) => {
    try {
        let delCat = await Category.find({ isDeleted: true });
        res.render('admin/deletedcategories', { category: delCat });
    } catch (error) {
        console.error(`Error fetching deleted categories: ${error.message}`);
        res.status(500).send("An error occurred while fetching deleted categories");
    }
}





const adminLogOut = (req, res) => {
    res.clearCookie('admintoken', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });
    res.redirect('/admin/login'); 
};


module.exports ={
    getAdmin,
    getAdminLogin,
    getAdminOtp,
    getAdminOtpEmail,
    getCategory,
    getAddNewCategory,
    getDeletedCategories, 
    validateLogin,
    getUser,
    generateOTP,
    generateToken,
    sendOTP,
    getBlockedUser,
    blockuser,
    unBlockUser,
    checkOTPEmail,
    adminLogOut,
    getTopCategory,
    getTopProducts,
    getTopBrands
 
   
    
}