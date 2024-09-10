const bcrypt = require('bcrypt');
const User = require('../../models/userSchema')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const crypto = require('crypto');
const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const Products = require("../../models/productSchema")
const Variant = require("../../models/variantSchema");
const Category = require('../../models/categoryShema');
const Sizes = require('../../models/sizes')
const Colors = require('../../models/colors')
const Cart = require('../../models/user/cart')
const Wishlist = require("../../models/user/wishlist")
const Product = require('../../models/productSchema')
const Offer = require('../../models/admin//offer')
const mongoose = require('mongoose')
const { ObjectId } = mongoose.Types;

const axios = require('axios');
const categoryShema = require('../../models/categoryShema');

const serverDomain = process.env.SERVER_DOMAIIN || 'http://localhost:8000'

let OTP
let registerdEmail


// Function to generate a random OTP
const generateOTP = () => {
    return (crypto.randomBytes(3).readUIntBE(0, 3) % 1000000).toString().padStart(6, '0');
}

//function for generate token

function generateToken(payload) {
    return jwt.sign(payload, process.env.SECRET_KEY,{ expiresIn: '100h' });
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





// register
const register = async (req, res) => {
    console.log(req.body);
    const { name, email, phone, password } = req.body;

    // check if email already exists
    let user = await User.findOne({ email: email });
    if (user) {
        console.log("email already exists");
        return res.render('user/register', { errE: "Entered Email already exists" });
    }

    registerdEmail = email

    // Check if phone number already exists
    let checkPhone = await User.findOne({ phone: phone });
    if (checkPhone) {
        console.log("phone already exists");
        return res.render('user/register', { errP: "Entered phone number already exists" });
    }

    // Store user details temporarily (e.g., in session or a temp collection)
    req.session.tempUser = {
        name: name,
        email: email,
        phone: phone,
        password: password // hashed in the verify function
    };

    OTP = generateOTP(); // Assuming generateOTP generates a code
    sendOTP(email, OTP);

    res.redirect('/otp'); // Redirect to OTP verification page
};



const verifyOTP = async (req, res) => {
    try {
        console.log(req.query.data);

        if (OTP == req.query.data) {
            // Hash the password here
            let hashedPassword = await bcrypt.hash(req.session.tempUser.password, 10);
            let date = new Date();
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            let localDate = date.toLocaleDateString('en-GB', options);

            // Create the user after OTP verification
            const newUser = await User.create({
                name: req.session.tempUser.name,
                email: req.session.tempUser.email,
                phone: req.session.tempUser.phone,
                password: hashedPassword,
                jointDate: localDate,
                OTPVerification: true
            });

            console.log(`Registered user: ${newUser}`);

            const payload = {
                name: newUser.name,
                userId: newUser._id
            };

            const token = generateToken(payload);

            res.cookie("token", token, {
                maxAge: 100 * 60 * 60 * 1000,
                httpOnly: true
            });

            // Clear session data after successful registration
            req.session.tempUser = null;

            res.status(200).json({ msg: 'Registered successfully', type: 'success' });
        } else {
            res.status(404).json({ msg: "Invalid OTP", type: 'error' });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ msg: "Internal Server Error", type: 'error' });
    }
};



//resend otp
const resendOtp = (req, res, next) => {
    OTP = generateOTP();
    sendOTP(registerdEmail, OTP);
    console.log("rsend otp", OTP);
    next();
}

// user login
const userLogin = async (req, res) => {
    const { email, password } = req.body;

    let user = await User.findOne({ email: email });

    // Check if the user exists
    if (!user) {
        return res.render('user/login', { errE: "Check entered Email address is correct" });
    }

    // Check if the user is blocked
    if (user.isListed) {
        return res.render('user/login', { err: 'User is blocked' });
    }

    if(!user.OTPVerification){
        return res.redirect('/otp')
    }

    // Check if the password is correct
    let checkPassword = await bcrypt.compare(password, user.password);

    if (checkPassword) {
        const payload = {
            userId: user._id,
            name: user.name
        };
        const token = generateToken(payload);
        console.log(token);
        res.cookie("token", token, {
            maxAge: 100 * 60 * 60 * 1000,
            httpOnly: true
        });

        res.redirect('/');
    } else {
        res.render('user/login', { errP: "Check entered Password is correct" });
    }
};


//otp login
const otpLogin = (req, res) => {
    res.render('user/otpemail')
}


const checkOTPEmail = async (req, res) => {
    let email = req.body.email

    let user = await User.findOne({ email: email })
    if (user) {
        if (user.OTPVerification == true) {
            registerdEmail = user.email
            OTP = generateOTP()
            sendOTP(registerdEmail, OTP);
            res.redirect("/otp")
        } else {
            res.render('user/otpemail', { err: "invalid Email address" })

        }
    } else {
        res.render('user/otpemail', { err: "invalid Email address" })

    }
}




// google authentication


passport.use(new GoogleStrategy({

    clientID:process.env.Google_clientID,
    clientSecret:process.env.Google_clientSecret,
    callbackURL: `${serverDomain}/auth/google/callback`,
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });


        if (!user) {
            user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                image: profile.photos[0].value
            });
            await user.save();
        }
        req.user = profile.displayName

        done(null, user);
    } catch (err) {
        console.error('Error in Google OAuth:', err);
        done(err);
    }
}));



passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

const googleSuccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.redirect('/login');
        }

        // Generate JWT token using the existing generateToken function
        const token = generateToken({ userId : req.user._id }); // userId = id

        console.log(token)
        res.cookie("token", token, {
            maxAge: 48 * 60 * 60 * 1000,
            httpOnly: true
        });
        res.redirect("/")
    } catch (error) {
        res.redirect("/login");
    }
};

// Middleware to authenticate JWT token
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
        return res.status(401).send('Access Denied');
    }

    try {
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                res.status("401")
                res.redirect("/login")

            } else {
                // req.user = decode.id

                // console.log("rq.user ",req.user);
                next();
            }
        });
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
};


//get home page
const getHome = async (req, res) => {
    let userId = null;

    let token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            userId = decoded.userId;
        } catch (err) {
            console.error('Invalid token:', err);
        }
    }

    let result = [{ itemCount: 0 }];
    let result2 = [{ cartCount: 0 }];

    if (userId) {
        console.log('User ID:', userId);

        const wishlistResult = await Wishlist.aggregate([
            { $match: { userId: new ObjectId(userId) } },
            { $project: { itemCount: { $size: "$items" } } }
        ]);

        const cartResult = await Cart.aggregate([
            { $match: { userId: new ObjectId(userId) } },
            { $project: { cartCount: { $size: '$items' } } }
        ]);

        console.log('Wishlist Result:', wishlistResult);
        console.log('Cart Result:', cartResult);

        if (wishlistResult.length > 0) {
            result = wishlistResult;
        }

        if (cartResult.length > 0) {
            result2 = cartResult;
        }
    }
    console.log(result, 'Final Wishlist Result');
    console.log(result2, 'Final Cart Result');

    let pipeline = [
        { $match: { isDeleted: false } },
        {
            $lookup: {
                from: 'products',
                localField: 'productId',
                foreignField: '_id',
                as: 'products'
            }
        },
        {$limit: 5}
        // { $unwind: '$products' } 
    ];

    let variant = await Variant.aggregate(pipeline);
    console.log(variant, "variant");

    let sortCriteria = { createdAt: -1 };

    // Uncomment and customize the following switch case if needed
    // switch (sortby) {
    //     case 'date':
    //         sortCriteria = { createdAt: -1 };
    //         break;
    //     default:
    //         break;
    // }

    pipeline.push({ $sort: sortCriteria });
    const sort = await Variant.aggregate(pipeline);
    console.log(sort, 'sort');

    res.render("user/home", { user: req.user, result, cart: result2, variant, sort ,userId});
};




//get user login
const getLogin = (req, res) => {
    res.render("user/login")
}



//get register
const getRegister = (req, res) => {
    res.render("user/register")
}

const getOTP = (req, res) => {
    res.render("user/verifyOtp")
}


const getEmail = (req, res) => {
    res.render("user/otpEmail")
}


// getShops

const getShops = async (req, res) => {
    console.log('hey');
    
    const { sortby, categories, sizes, color, q, page = 1 , limit = 4 } = req.query;

    let userId = null;
    let token = req.cookies.token;

    // Verify JWT token if it exists
    if (token) {
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (!err) {
                userId = decode.userId;
            }
        });
    }

    // Find the user if logged in
    let user = null;
    if (userId) {
        user = await User.findById(userId);
    }

    const categoryFilter = categories ? categories.split(',') : [];
    const sizeFilter = sizes ? sizes.split(',') : [];
    const colorFilter = color ? color.split(',') : [];

    // Default match criteria
    let matchCriteria = { isDeleted: false };

    // Build the aggregation pipeline
    let pipeline = [
        { $match: matchCriteria },
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
                from: 'categories',
                localField: 'products.category',
                foreignField: 'categoryName',
                as: 'categories'
            }
        }
    ];

    // Apply category filter
    if (categoryFilter.length > 0) {
        pipeline.push({
            $match: { 'products.category': { $in: categoryFilter } }
        });
    }

    // Apply size filter
    if (sizeFilter.length > 0) {
        pipeline.push({
            $match: { 'products.size': { $in: sizeFilter } }
        });
    }

    // Apply color filter
    if (colorFilter.length > 0) {
        pipeline.push({
            $match: { colors: { $in: colorFilter } }
        });
    }

    // Apply search filter
    if (q) {
        pipeline.push({
            $match: { 'products.productName': { $regex: q, $options: 'i' } }
        });
    }

    // Sorting criteria
    let sortCriteria = {};
    switch (sortby) {
        case 'date':
            sortCriteria = { createdAt: -1 };
            break;
        case 'a-to-z':
            sortCriteria = { 'products.productName': 1 };
            break;
        case 'z-to-a':
            sortCriteria = { 'products.productName': -1 };
            break;
        case 'lowPrice-to-highPrice':
            sortCriteria = { price: 1 };
            break;
        case 'highPrice-to-lowPrice':
            sortCriteria = { price: -1 };
            break;
        default:
            break;
    }

    // Apply sorting
    if (Object.keys(sortCriteria).length > 0) {
        pipeline.push({ $sort: sortCriteria });
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: startIndex });
    pipeline.push({ $limit: parseInt(limit) });

    try {
        // Count total documents considering the same filtering criteria
        const countPipeline = [...pipeline];
        countPipeline.pop(); // Remove the last stage $limit for counting total documents
        countPipeline.pop(); // Remove the second last stage $skip for counting total documents
        countPipeline.push({ $count: "totalCount" });

        const countResult = await Variant.aggregate(countPipeline);
        const totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
        const totalPages = Math.ceil(totalCount / limit);

        // Aggregate the results
        let variants = await Variant.aggregate(pipeline);

        // Apply offers to variants
        const offers = await Offer.find();
        variants = variants.map(v => {
            let bestOfferPrice = v.price;
            let bestOffer = 0;
            let offerApplied = false;

            if (v.products[0].offerApplied && v.products[0].offerPrice < bestOfferPrice) {
                bestOfferPrice = v.products[0].offerPrice;
                bestOffer = v.products[0].offer;
                offerApplied = true;
            }

            v.bestOfferPrice = bestOfferPrice;
            v.offerApplied = offerApplied;
            v.offer = bestOffer;

            return v;
        });

        // If the user is logged in, check their cart and apply the best offer prices
        if (user) {
            const cart = await Cart.findOne({ userId });

            if (cart && cart.items.length > 0) {
                cart.items.forEach(item => {
                    const variant = variants.find(v => v._id.equals(item.variantId));
                    if (variant) {
                        item.offer = variant.bestOfferPrice;
                    }
                });

                // Save the updated cart
                await cart.save();
            }
        }

        // Fetch related data
        let category = await Category.find({ isDeleted: false });
        let sizes2 = await Sizes.find({ isDeleted: false });
        let colors = await Colors.find({ isDeleted: false });

        // Render the response
        res.render("user/shops", {
            variants,
            currentPage: page,
            limit,
            totalPages,
            totalCount,
            category,
            sizes: sizes2,
            user,
            offers,
            colors,
            sortby,
            selectedCategories: categories,
            selectedColors: color,
            selectedSizes: sizes,
            q,q
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ msg: 'Error in pagination or filtering' });
    }
};





const getProductDetail = async (req, res) => {

    let userId = null;
    let token = req.cookies.token;

    // Check if the token exists and is valid
    if (token) {
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (!err) {
                userId = decode.userId;
            }
        });
    }

    // Find the user if logged in
    let user = null;
    if (userId) {
        user = await User.findById(userId);
    }

    const pId = req.query.pId
    const vId = req.query.vId
    console.log(pId);
    console.log(vId)

    let variant = await Variant.aggregate([
        { $match: { productId: new ObjectId(pId), _id: new ObjectId(vId) } },                    
        {
            $lookup: {
                from: 'products',
                localField: 'productId',
                foreignField: '_id',
                as: 'products'
            }
        },  // To simplify accessing the product data
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
        }
        , { $unwind: '$products' },

      
    ])
    console.log("productdetails", variant[0])

    if (!variant.length) {
        return res.status(404).json({ msg: 'Product or variant not found' });
    } 
    // Check if any size of the variant is out of stock
    // const outOfStockSizes = variant[0].stock.filter(stockItem => stockItem.quantity <= 0);
    // if (outOfStockSizes.length > 0) {
    //     return res.status(200).json({ msg: 'Product is out of stock', outOfStockSizes });
    // }


    
    // Determine the best offer price
    variant = variant.map(v => {
    
        let bestOfferPrice = v.price;
        let bestOffer = 0
        let offerApplied = false;
   
        console.log(v.products.offerApplied,'v.products.offerApplied');
        console.log(v.products.offerPrice,'v.products.offerPrice');
        console.log(v.products.offer,'offer');
              
        
        if (v.products.offerApplied && v.products.offerPrice < bestOfferPrice) {

            bestOfferPrice = v.products.offerPrice;
            bestOffer = v.products.offer
            console.log(v.products.offerPrice,'v.products.offerPrice');
 
            
            offerApplied = true;
        }
        v.categories.forEach(category => {
            if (category.offerApplied && category.offerPrice < bestOfferPrice) {
                bestOfferPrice = category.offerPrice;
                bestOffer = category.offer
                console.log(category.offerPrice,'category.offerPrice');
                console.log(category.offer,'category.offer');
                
         
                
                offerApplied = true;
            }
        });
        v.bestOfferPrice = bestOfferPrice;
        v.products.offer = bestOffer
        v.offerApplied = offerApplied;


        // console.log( v.bestOfferPrice,' v.bestOfferPrice');       
        // console.log(v.offerApplied,'v.offerApplied');
        // console.log(v,'vOfferApplied');
        
        return v;
    });


    

    res.render("user/productdetails", { variant , user})

}


const userLogout = (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });
    res.redirect('/login');
};




module.exports = {
    getHome,
    getLogin,
    getRegister,
    getOTP,
    getEmail,
    register,
    verifyOTP,
    resendOtp,
    userLogin,
    sendOTP,
    otpLogin,
    checkOTPEmail,
    googleSuccess,
    authenticateJWT,
    getShops,
    getProductDetail,
    userLogout,
    // changePassword



}