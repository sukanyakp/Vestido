require('dotenv').config()
const express = require('express');
const app = express();
const path = require('path');
const nocache = require('nocache');
const session = require('express-session');
const morganLogger = require('morgan');
const userRouter = require('./routes/userRouter.js');
const adminRouter = require("./routes/admin/adminRouter.js")
const productRouter = require("./routes/admin/productRouter.js")
const cartRouter = require ('./routes/user/cartRouter.js')
const orderRouter = require('./routes/user/orderRouter.js')
const wishlistRouter = require('./routes/user/wishlistRouter.js')
const profileRouter = require('./routes/user/profileRouter.js')
const couponRouter = require('./routes/admin/couponRouter.js')
const offerRouter = require('./routes/admin/offerRouter.js')
const adminOrderRouter = require('./routes/admin/orderRouter.js')
const salesReportRouter = require('./routes/admin/salesReport.js')
const connection = require('./connection/connection.js');
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser")
const passport = require('passport');
const wishlist = require('./models/user/wishlist.js');
require('./controllers/user/userController.js');
const fileUpload = require('express-fileupload');
    
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

app.use(fileUpload({
    useTempFiles: true,    
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
}));



connection.connection()

app.set("view engine","ejs")

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({limit: "100mb", extended:true, parameterLimit: 50000}))
app.use(express.static("public"));
app.use(nocache());

app.use(session({
    secret:process.env.sessionSecret,
    resave:false,
    saveUninitialized:true,
    cookie: { secure: false } 
}))
app.use(cookieParser())

app.use(morganLogger('dev'));

app.use("/",userRouter);
app.use("/admin",adminRouter);
app.use("/admin/products",productRouter);
app.use('/admin',couponRouter)
app.use('/admin',adminOrderRouter)
app.use('/admin',offerRouter)
app.use('/admin',salesReportRouter)
app.use('/',cartRouter)
app.use('/',orderRouter)
app.use('/',wishlistRouter)
app.use('/',profileRouter)



// Static files example
// app.use(express.static(path.join(__dirname, 'public')));   


// Error handling middleware
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});


// //admin logout
// app.post('/admin/logout', (req, res) => {
//     res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });
//     res.status(200).send({ message: 'Logout successful' });
// });

// app.use((req, res, next) => {
//     res.locals.user = req.user;
//     next();
// });


app.listen(8000,()=>{
    console.log("server is running on http://localhost:8000");
})



