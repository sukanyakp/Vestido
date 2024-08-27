const mongoose = require('mongoose');

let connection =async ()=>{
    try {

        await mongoose.connect("mongodb+srv://sukanyakp04:C3Udu7EsY9kl07iT@cluster0.nlfrqad.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/Majesty", { dbName: 'vestido' })
        console.log("mongodb connected successfully...");
        // console.log(process.env.data);
       
        
    } catch (error) {
        console.log(error);
        process.exit(-1);
    }
}

module.exports = {
    connection
}