const bcrypt = require('bcrypt');
const User = require('../../models/userSchema')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const Address = require('../../models/address')
const mongoose = require('mongoose');
const address = require('../../models/address');
const Wallet = require('../../models/user/wallet')
const { ObjectId } = mongoose.Types;
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
    key_id: process.env.YOUR_KEY_ID ,
    key_secret: process.env.YOUR_KEY_SECRET
    
});  


const getUserProfile = async (req, res) => {
    try {
        let userId

        let token = req.cookies.token
        console.log(token);
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error(' token not found')
            } else {
                userId = decode.userId
                console.log(decode);
            }
        })
        let user = await User.findOne({ _id:userId})
        console.log(user, 'fdf');
        
        let addressDetails = await Address.findOne({ userId:userId})
        console.log(addressDetails," addressDetails22");

        res.render("user/profile", { addressDetails ,user});
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("Internal Server Error");
    }
};




const getAddress = async (req, res) => {

    let userId
    console.log('hey address');

    let token = req.cookies.token
    console.log(token);
    jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
        if (err) {
            throw new Error(' token not found')
        } else {
            userId = decode.userId
            console.log(userId,"decoded");
        }
    })
    const user = await User.find({ _id : new ObjectId(userId)})


    res.render('user/addaddress',user)
}





const addAddress = async (req, res) => {
    try {
        let addressId
        let userId
        console.log('hey address');

        let token = req.cookies.token
        console.log(token);
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error(' token not found')
            } else {
                userId = decode.userId
                console.log(userId,"decoded");
            }
        })
      

        console.log(req.body, "addrss qry");   

        let addresses = await Address.findOne({ userId: userId })

        if (!addresses) {
            addresses = new Address({
                userId: userId,
                addresses: [{
                    name: req.body.name,
                    mobile: req.body.mobile,
                    pincode: req.body.pincode,
                    address: req.body.address,
                    district: req.body.district,
                    state: req.body.state,
                    landMark: req.body.landmark,
                    altMob: req.body.altMob,
                }]

            })
            await addresses.save()
        } else {
            addresses.addresses.push({
                name: req.body.name,
                mobile: req.body.mobile,
                pincode: req.body.pincode,
                address: req.body.address,
                district: req.body.district,
                state: req.body.state,
                landMark: req.body.landmark,
                altMob: req.body.altMob,
            })

            await addresses.save()

        }
        // console.log("updated",updatedUser);
        res.status(200).json({
            status: 200,
            message: "successful"
        })

    } catch (err) {
        console.log(err);
        res.status(500).json({
            status: 500,
            message: 'Address not added',
            error: err.message
        });

    }


}



const changePassword = async (req, res) => {
    let { cIp, nIp, coIp } = req.query;

    // Ensure all fields are provided
    if (!cIp || !nIp || !coIp) {
        return res.status(400).send("All fields are required");
    }

    if (nIp !== coIp) {
        return res.status(400).send("New password and confirm password do not match");
    }

    let token = req.cookies.token;

    jwt.verify(token, process.env.SECRET_KEY, async (err, decode) => {
        if (err) {
            return res.status(401).send("Invalid token");
        }

        try {
            let user = await User.findOne({ _id: decode.userId });

            if (!user) {
                return res.status(404).send("User not found");
            }

            let checkPassword = await bcrypt.compare(cIp, user.password);

            if (checkPassword) {
                // Hash the new password
                let hashedNewPassword = await bcrypt.hash(nIp, 10);

                // Update the user's password
                user.password = hashedNewPassword;
                await user.save();

                return res.status(200).send("Password changed successfully");
            } else {
                return res.status(401).send("Entered password is incorrect");
            }
        } catch (error) {
            console.error(error);
            return res.status(500).send("Internal server error");
        }
    });
};




const addMoneyToWallet = async(req,res)=>{
    console.log('adding money to wallet ?');

    const { amount } = req.body;
    console.log(amount,'amount');
    const options = {
        amount: amount * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "receipt_order_74394"
    };
    try {
        const order = await razorpayInstance.orders.create(options);
        console.log(order.id,'order.id');
        res.json({
            type:'success',
            // key:  process.env.YOUR_KEY_ID,
            amount: order.amount,
            order_id: order.id,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send('Server Error');
    }
}

const paymentSuccess = async (req, res) => {
    console.log('paymentSuccess');
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;
    console.log(razorpay_payment_id, razorpay_order_id, razorpay_signature, amount,'razor');

    let userId;

    let token = req.cookies.token;
    // console.log(token);
    jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
        if (err) {
            throw new Error('Token not found');
        } else {
            userId = decode.userId;
        }
    });

    // Verify the payment using Razorpay's signature verification (optional but recommended)
    const shasum = crypto.createHmac('sha256', process.env.YOUR_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');
    console.log(digest,'digest');

    if (digest !== razorpay_signature) {
        return res.status(400).json({ message: 'Invalid signature' });
    }

    try {
        // Update the user's wallet balance
        const userUpdate = await User.updateOne({ _id: userId }, { $inc: { walletBalance: (amount /100) } });
        // console.log(userUpdate, 'userUpdate');

        const wallet = await Wallet.findOneAndUpdate(
            { userId: userId },
            {
                $inc: { balance: (amount /100) },
                $push: {
                    transaction_history: {
                        amount: amount ,
                        type: 'credit',
                        description: 'Added money to wallet'
                    }
                }
            },
            { new: true, upsert: true } // Create if it doesn't exist
        );

        console.log(wallet, 'wallet updated');

        // Dummy response for successful payment
        res.json({ message: 'Payment verified and wallet updated successfully' ,wallet});
    } catch (error) {
        console.error('Error updating wallet:', error.message);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};




// transaction history 

const transactionHistory= async (req, res) => {
    console.log('transaction history..');
    let userId;
    let token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Token not found' });
    }

    try {
        jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
            if (err) {
                throw new Error('Token not found');
            } else {
                userId = decode.userId;
            }
        });
        const wallet = await Wallet.findOne({ userId: userId })
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        res.json({ transaction_history: wallet.transaction_history });
    } catch (error) {
        console.error('Error fetching transaction history:', error.message);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}


module.exports = {
    getUserProfile,
    getAddress,
    addAddress,
    changePassword,
    addMoneyToWallet,
    paymentSuccess,
    transactionHistory
   
}