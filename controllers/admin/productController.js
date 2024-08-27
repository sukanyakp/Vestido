const Category = require('../../models/categoryShema');
const Brand = require("../../models/brandSchema")
const subcategory = require("../../models/subCategorySchema")
const Colors = require("../../models/colors")
const Sizes = require('../../models/sizes')
const Products = require("../../models/productSchema")
const Variant = require("../../models/variantSchema");
const sizes = require('../../models/sizes');
const mongoose = require('mongoose')
const { ObjectId } = mongoose.Types;
const cloudinary = require('cloudinary').v2;

//get shop
const getShop = (req, res) => {
    try {
        res.render('user/shop');
    } catch (error) {
        console.error(`Error rendering shop page: ${error.message}`);
        res.status(500).send("An error occurred while rendering shop page");
    }
}


//add new category

const addnewcategory = async (req, res) => {
    try {
        let category = req.body.category;
        let isExist = await Category.findOne({ categoryName: category });

        if (isExist) {
            res.render('admin/addcategory', { err: "Entered category already exists" });
        } else {
            let newCategory = await Category.create({
                categoryName: category,
                isDeleted: false
            });
            res.redirect('/admin/category');
        }
    } catch (error) {
        console.error(`Error adding new category: ${error.message}`);
        res.status(500).send("An error occurred while adding new category");
    }
}





//delete category
const deletecategory = async (req, res) => {
    try {
        let catId = req.query.catId;

        if (catId) {
            let deletecat = await Category.findOneAndUpdate(
                { _id: catId },
                {
                    $set: {
                        isDeleted: true
                        
                    }
                }
            );

            const category = deletecat.categoryName

            if (deletecat) {

                let deletePro = await Products.updateMany(
                    { category:category},
                    {$set:{
                        isDeleted:true
                    }}
                )
                res.status(200).send("Category deleted successfully");
            } else {
                res.status(404).send("Category not found");
            }
        } else {
            res.status(400).send("Invalid category ID");
        }
    } catch (error) {
        console.error(`Error deleting category: ${error.message}`);
        res.status(500).send("An error occurred while deleting category");
    }
}


//restore category

const restoreCat = async (req, res) => {
    try {
        let catId = req.query.catId;

        if (catId) {
            let restorecat = await Category.findOneAndUpdate(
                { _id: catId },
                {
                    $set: {
                        isDeleted: false
                    }
                }
            );
            let restore = restorecat.categoryName


            if (restore) {

                let restorePro = await Products.updateMany (
                    { category : restore},
                    {
                        $set:{isDeleted:false}
                    }
                )
                res.status(200).send("Category restored successfully");
            } else {
                res.status(404).send("Category not found");
            }
        } else {
            res.status(400).send("Invalid category ID");
        }
    } catch (error) {
        console.error(`Error restoring category: ${error.message}`);
        res.status(500).send("An error occurred while restoring category");
    }
}




//get edit category
const getEditcat = async (req, res) => {
    try {
        let catId = req.params.categoryId;
        let category = await Category.findOne({ _id: catId });

      
        if (category) {
            res.render('admin/editcategory', { category: category });
        } else {
            res.status(404).send("Category not found");
        }
    } catch (error) {
        console.error(`Error fetching category for edit: ${error.message}`);
        res.status(500).send("An error occurred while fetching category for edit");
    }
}





//get Products
const getProducts = async (req, res) => {
    try {
        
        let pipeline = [
            {$match:{isDeleted:false}},
              {  $lookup: {
                    from: 'variants',     
                    localField: 'variants',
                    foreignField: '_id',
                    as: 'variants'
                }
            }        
        ]

    // pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2;
    const startIndex = (page - 1) * limit;

    pipeline.push({ $skip: startIndex });
    pipeline.push({ $limit: limit });

        const vImages = await Products.aggregate(pipeline);

        const matchCriteria = {isDeleted:false}
        const totalCount = await Products.countDocuments(matchCriteria).exec();
        const totalPages = Math.ceil(totalCount / limit);
        res.render('admin/listproducts',{products:vImages , currentPage: page, limit,totalCount,totalPages});

    } catch (err) {
        console.log(err)
    }
} 



//get add products
const getAddProducts = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false })
        const brands = await Brand.find({ isDeleted: false })
        const colors = await Colors.find({ isDeleted: false })
        const sizes = await Sizes.find({ isDeleted: false })

        // console.log(categories);
        res.render('admin/addproducts', { categories: categories, brands: brands, colors, sizes });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}








//get brands
const getBrands = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;
        const startIndex = (page - 1) * limit;
    
        let brands = await Brand.find({ isDeleted: false }).skip(startIndex).limit(limit)

        const totalCount = await Brand.countDocuments({ isDeleted: false }).exec();
        const totalPages = Math.ceil(totalCount / limit);
        console.log(limit,totalCount,'limit');
        
        res.render('admin/brands', { brands: brands ,currentPage: page, limit,totalCount,totalPages});
    } catch (error) {
        console.error(`Error fetching brands: ${error.message}`);
        res.status(500).send("An error occurred while fetching brands");
    }
}


//get add new brands
const getAddBrands = async (req, res) => {
    try {
        let brandName = req.body.brand;
        let brands = await Brand.find();

        res.render('admin/addnewbrands', { brands: brands });
    } catch (error) {
        console.error(`Error fetching brands or rendering add new brands page: ${error.message}`);
        res.status(500).send("An error occurred while fetching brands or rendering add new brands page");
    }
}


//get deleted brands
const getdeletedBrands = async (req, res) => {
    try {
        let deletedBrands = await Brand.find({ isDeleted: true });
        res.render('admin/deletedbrands', { brands: deletedBrands });
    } catch (error) {
        console.error(`Error fetching deleted brands: ${error.message}`);
        res.status(500).send("An error occurred while fetching deleted brands");
    }
}





const getEditBrand = async (req, res) => {
    try {
        let brandId = req.params.brandId;
        let brandName = req.body.brand;

        if (brandId) {
            let brand = await Brand.findOne({ _id: brandId });
            if (brand) {
                res.render('admin/editbrands', { brand: brand });
            } else {
                res.status(404).send("Brand not found");
            }
        } else {
            res.status(400).send("Invalid brand ID");
        }
    } catch (error) {
        console.error(`Error fetching brand for edit: ${error.message}`);
        res.status(500).send("An error occurred while fetching brand for edit");
    }
}





//edit brand
const editBrand = async (req, res) => {
    try {
        let brandId = req.params.brandId;
        let newBrand = req.body.brand;
        if( newBrand.trim() ==''){
            res.render('admin/editbrands', { err: "Please enter a brand name" });
        }

        let alreadyExist = await Brand.findOne({ brandname: newBrand });
        if (alreadyExist) {
            res.render('admin/editbrands', { err: "The brand already exists" });
        } else {
            let editedbrand = await Brand.findOneAndUpdate(
                { _id: brandId },
                {
                    $set: {
                        brandname: newBrand
                    }
                },
                { new: true } // To return the updated document
            );
            if (editedbrand) {
                res.redirect('/admin/products/brands');
            } else {
                res.status(404).send("Brand not found");
            }
        }
    } catch (error) {
        console.error(`Error editing brand: ${error.message}`);
        res.status(500).send("An error occurred while editing brand");
    }
}


//edit category
const editCat = async (req, res) => {
    try {
        let catId = req.params.catId;
        let catName = req.body.category;

        if( catName.trim() === ''){
            res.render('admin/editcategory',{err:'please enter a category name'})            
        }


        let alreadyExist = await Category.findOne({ categoryName: catName });

        if (alreadyExist) {
            res.render('admin/editcategory', { err: "Entered category already exists" });
        } else {
            let category = await Category.findOneAndUpdate(
                { _id: catId },
                {
                    $set: {
                        categoryName: catName
                    }
                },
                { new: true } // To return the updated document
            );
            if (category) {
                res.redirect('/admin/category');
            } else {
                res.status(404).send("Category not found");
            }
        }
    } catch (error) {
        console.error(`Error editing category: ${error.message}`);
        res.status(500).send("An error occurred while editing category");
    }
}


//add new brand
const addNewBrand = async (req, res) => {
    try {
        let brand = req.body.brand;
        let alreadyExist = await Brand.findOne({ brandname: brand });

        if (alreadyExist) {
            res.render('admin/brands', { err: "Brand already exists" });
        } else {
            let newBrand = await Brand.create({
                brandname: brand,
                isDeleted: false
            });
            // console.log(newBrand);
            res.redirect('/admin/products/brands');
        }
    } catch (error) {
        console.error(`Error adding new brand: ${error.message}`);
        res.status(500).send("An error occurred while adding new brand");
    }
}


//delete Brand
const deleteBrand = async (req, res) => {
    try {
        let brandId = req.query.brandId;

        if (brandId) {
            let deleteBrand = await Brand.findOneAndUpdate(
                { _id: brandId },
                {
                    $set: {
                        isDeleted: true
                    }
                },
                { new: true } // To return the updated document
            );

            let deletePro = deleteBrand.brandname
            console.log(deletePro);
            
            if (deleteBrand) {

                let products = await Products.findMany(
                    {brand : deletePro},
                    {
                        $set:{ isDeleted : true}
                    }
                )
                res.status(200).send("Brand deleted successfully");
            } else {
                res.status(404).send("Brand not found");
            }
        } else {
            res.status(400).send("Invalid brand ID");
        }
    } catch (error) {
        console.error(`Error deleting brand: ${error.message}`);
        res.status(500).send("An error occurred while deleting brand");
    }
}



//restore brand 
const restoreBrand = async (req, res) => {
    try {
        let brandId = req.query.brandId;
        
        if (brandId) {
            let restoredBrand = await Brand.findOneAndUpdate(
                { _id: brandId },
                {
                    $set: {
                        isDeleted: false
                    }
                },
                { new: true } // To return the updated document
            );

            if (restoredBrand) {
                res.status(200).send("Successfully restored brand");
            } else {
                res.status(404).send("Brand not found");
            }
        } else {
            res.status(400).send("Invalid brand ID");
        }
    } catch (error) {
        console.error(`Error restoring brand: ${error.message}`);
        res.status(500).send("An error occurred while restoring brand");
    }
}










const colors = async (req, res) => {
    try {
         // pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;

    // pipeline.push({ $skip: startIndex });
    // pipeline.push({ $limit: limit });
        const colors = await Colors.find({ isDeleted: false }).skip(startIndex).limit(limit)
        

  const matchCriteria = {isDeleted:false}
        const totalCount = await Colors.countDocuments({isDeleted:false}).exec();
        const totalPages = Math.ceil(totalCount / limit);
        
        // console.log(colors);
        res.render("admin/colors", { colors,currentPage: page, limit,totalCount,totalPages });
    } catch (error) {
        console.error(`Error fetching colors: ${error.message}`);
        res.status(500).send("An error occurred while fetching colors");
    }
}



//get add new colors
const getAddColors = async (req, res) => {
    try {
        let color = req.body.color;
        let hexacode = req.body.hexacode;
        let colors = await Colors.find();
        // console.log(colors);
        // console.log(color);

        res.render('admin/addcolors', { colors, hexacode });
    } catch (error) {
        console.error(`Error fetching colors or rendering add colors page: ${error.message}`);
        res.status(500).send("An error occurred while fetching colors or rendering add colors page");
    }
}




// addnewcolor
const addNewColor = async (req, res) => {
    try {
        let color = req.body.color;
        let hexacode = req.body.hexacode;

        let isExists = await Colors.findOne({ color_name: color });
        if (isExists) {
            return res.render('admin/addcolors', { err: "Entered color already exists" });
        } else {
            let newColor = await Colors.create({
                color_name: color,
                color_code: hexacode,
                isDeleted: false
            });
            // console.log(newColor);
            return res.redirect("/admin/products/colors");
        }
    } catch (error) {
        console.error(`Error adding new color: ${error.message}`);
        return res.status(500).send("An error occurred while adding new color");
    }
}




//get deleted colors
const getdeletedColors = async (req, res) => {
    try {
        let deletedColors = await Colors.find({ isDeleted: true });
        res.render('admin/deletedcolors', { colors: deletedColors });
    } catch (error) {
        console.error(`Error fetching deleted colors: ${error.message}`);
        res.status(500).send("An error occurred while fetching deleted colors");
    }
}







//delete Brand
const deleteColor = async (req, res) => {
    try {
        let colorId = req.query.colId;

        if (colorId) {
            let deleteColor = await Colors.findOneAndUpdate(
                { _id: colorId },
                {
                    $set: {
                        isDeleted: true
                    }
                },
                { new: true } // To return the updated document
            );
            
            if (deleteColor) {
                res.status(200).send("Color deleted successfully");
            } else {
                res.status(404).send("Color not found");
            }
        } else {
            res.status(400).send("Invalid color ID");
        }
    } catch (error) {
        console.error(`Error deleting color: ${error.message}`);
        res.status(500).send("An error occurred while deleting color");
    }
}


const getSizes = async (req, res) => {
    try {
            // pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const startIndex = (page - 1) * limit;
        const sizes = await Sizes.find({ isDeleted: false }).skip(startIndex).limit(limit)

        const matchCriteria = {isDeleted:false}
        const totalCount = await Sizes.countDocuments(matchCriteria).exec();
        const totalPages = Math.ceil(totalCount / limit);
        res.render("admin/sizes", { sizes,currentPage: page, limit,totalCount,totalPages });
    } catch (error) {
        console.error(`Error fetching sizes: ${error.message}`);
        res.status(500).send("An error occurred while fetching sizes");
    }
}



//get add new sizes
const getAddSizes = async (req, res) => {
    try {
        let size = req.body.size;
        let sizes = await Sizes.find();
        console.log(sizes);
        console.log(size);

        res.render('admin/addsizes', { sizes });
    } catch (error) {
        console.error(`Error fetching sizes or rendering add sizes page: ${error.message}`);
        res.status(500).send("An error occurred while fetching sizes or rendering add sizes page");
    }
}



// addnewsize
const addNewsize = async (req, res) => {
    try {
        let size = req.body.size;

        let isExists = await Sizes.findOne({ sizeName: size });
        if (isExists) {
            return res.render('admin/addsizes', { err: "Entered size already exists" });
        } else {
            let newsize = await Sizes.create({
                sizeName: size,
                isDeleted: false
            });
            console.log(newsize);
            return res.redirect("/admin/products/sizes");
        }
    } catch (error) {
        console.error(`Error adding new size: ${error.message}`);
        return res.status(500).send("An error occurred while adding new size");
    }
}



//get deleted colors
const getdeletedSizes = async (req, res) => {
    try {
        let deletedSizes = await Sizes.find({ isDeleted: true });
        res.render('admin/deletedsizes', { sizes: deletedSizes });
    } catch (error) {
        console.error(`Error fetching deleted sizes: ${error.message}`);
        res.status(500).send("An error occurred while fetching deleted sizes");
    }
}




//get edit color
const getEditColor = async (req, res) => {
    try {
        let clrId = req.params.clrId;
        let color = await Colors.findOne({ _id: clrId });
        res.render('admin/editcolor', { color});
    } catch (error) {
        console.error(`Error fetching color or rendering edit colors page: ${error.message}`);
        res.status(500).send("An error occurred while fetching color or rendering edit colors page");
    }
}



//edit color
const editCol = async (req, res) => {
    try {
        let clrId = req.params.clrId;
        let colorName = req.body.color;
        // console.log(colorName)

        let alreadyExist = await Colors.findOne({ color_name: colorName });

        if (alreadyExist) {
            return res.render('admin/editcolor', { err: "Entered color already exists" });
        } else {
            let updatedColor = await Colors.findOneAndUpdate(
                { _id: clrId },
                {
                    $set: {
                        color_name: colorName
                    }
                },
                { new: true } // To return the updated document
            );

            // console.log(updatedColor);
            return res.redirect('/admin/products/colors');
        }
    } catch (error) {
        console.error(`Error editing color: ${error.message}`);
        res.status(500).send("An error occurred while editing color");
    }
}



// addProduct
const addProducts = async (req, res) => {
    try {
        let date = new Date();
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        let localdate = date.toLocaleDateString('en-GB', options);

        let obj = req.body;
        

        const existingProduct  = await Products.findOne({ productName :obj.pname })
        if(existingProduct){
            return res.status(400).json({ success:false ,message:'Product already exists'})
        }
        
        let product = await Products.create({
            productName: obj.pname,
            gender: obj.gender,
            category: obj.category,
            brand: obj.brand,
            size: obj.size,
            description: obj.desc,
            isDeleted: false,
            addedDate: localdate,
        });

        // console.log(product._id);
        // console.log(product.category);
        if (product) {
            res.status(200).json({ success: true, productId: product._id });
        } else {
            res.status(400).json({ success: false, message: "Failed to create product" });
        }
    } catch (error) {
        console.error(`Error adding product: ${error.message}`);
        res.status(500).json({ success: false, message: "An error occurred while adding the product" });
    }
}




const addProductVariants = async (req, res) => {
    try {
        console.log("Received request to add product variants");

        const { pId,cName, color, price, stock, images } = req.body;
        // console.log(cName,'cName');
        const parsedStock = stock;
        // console.log("Parsed stock:", parsedStock);

        if (images.length < 3) {
            return res.status(400).json({ msg: "Missing required images", type: "error" });
        }
        const imageUrls = [];

        for(const image of images) {
            const uploadResponse = await cloudinary.uploader.upload(image, {
                resource_type: 'auto'
            });
            imageUrls.push(uploadResponse.secure_url);
        }

        const newVariant = await Variant.create({
            productId: pId,
            categoryName:cName,
            colors: color,
            price: price,
            stock: parsedStock,
            images: imageUrls
        });

        console.log("New variant created:", newVariant);

        const updatedProduct = await Products.findById(pId);
        if (!updatedProduct) {
            return res.status(404).json({ msg: "Product not found", type: "error" });
        }

        updatedProduct.variants.push(newVariant._id);
        await updatedProduct.save();

        // console.log("Updated product with new variant:", updatedProduct);

        res.status(200).json({ msg: "Variant added successfully", type: "success" });

    } catch (err) {
        console.error("Error adding product variant:", err);
        res.status(500).json({ msg: "Server error", type: "error" });
    }
};






const deleteproductdata = async (req, res) => {
    try {
        const pId = req.query.data;
        console.log(pId);

        let deletedPro = await Products.findByIdAndDelete(pId);
        console.log(deletedPro);

        if (deletedPro) {
            res.status(200).send("Data deleted successfully");
        } else {
            res.status(404).send("Product not found");
        }
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).send("Internal Server Error");
    }
};



const getDetailedView = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });
        const brands = await Brand.find({ isDeleted: false });
        const colors = await Colors.find({ isDeleted: false });
        const sizes = await Sizes.find({ isDeleted: false });

        const id = req.params.id;

        let variant = await Variant.aggregate([
            { $match: { productId: new ObjectId(id) ,isDeleted:false} },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'products'
                }
            }
        ]);

        // Check if variant is null, undefined, or empty
        if (!variant || variant.length === 0) {
            
            return res.status(404).send('Variant not found');
        }

        console.log(variant);

        res.render('admin/productdetailedview3', { variant: variant, categories, brands, colors, sizes });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}


//get unlisted products
const getUnlistedProducts =async (req,res)=>{
    let products = await Products.aggregate([
        {$match:{isDeleted:true}},
        {
            $lookup: {
                from: 'variants', // Ensure this matches the actual collection name
                localField: 'variants',
                foreignField: '_id',
                as: 'variants'
            }
        }
    ]);
        
         products.forEach((x)=>{
            console.log(x.variants) 
         })


   
    res.render('admin/unlistedproducts',{products:products})
}






//unlist product
const unlistProduct = async (req, res) => {
    let id = req.query.pId;
    console.log(id);

    try {
        // Find the product
        let unlistedProduct = await Products.findOne({ _id: id });
        console.log(unlistedProduct);

        if (!unlistedProduct) {
            return res.status(404).send("Product not found");
        }

        // Unlist the product
        unlistedProduct.isDeleted = true;
        await unlistedProduct.save();

        // Lookup variants associated with the product using aggregation
        let productWithVariants = await Products.aggregate([
            { $match: { _id:new ObjectId(id) } },
            {
                $lookup: {
                    from: 'variants',
                    localField: 'variants',
                    foreignField: '_id',
                    as: 'variants'
                }
            }
        ]);

        if (productWithVariants.length > 0) {
            let variants = productWithVariants[0].variants;
            console.log(variants);

            // Unlist each variant
            for (let variant of variants) {
                await Variant.updateOne(
                    { _id: variant._id },
                    { $set: { isDeleted: true, isVariantAvailable: false } }
                );
            }
        }

        res.status(200).send("Product and its variants unlisted successfully");
    } catch (err) {
        console.error(err);
        res.status(500).send("An error occurred while unlisting the product");
    }
};




//restore product

const restoreProduct = async(req,res)=>{
    let id = req.query.pId

    try{
        let unlistedProduct = await Products.findOneAndUpdate(
            {_id:id},
            {
                $set:{
                    isDeleted:false
                }
            }
        )


           // Lookup variants associated with the product using aggregation
           let productWithVariants = await Products.aggregate([
            { $match: { _id:new ObjectId(id) } },
            {
                $lookup: {
                    from: 'variants',
                    localField: 'variants',
                    foreignField: '_id',
                    as: 'variants'
                }
            }
        ]);

        if (productWithVariants.length > 0) {
            let variants = productWithVariants[0].variants;
            console.log(variants);

            // Unlist each variant
            for (let variant of variants) {
                await Variant.updateOne(
                    { _id: variant._id },
                    { $set: { isDeleted: false, isVariantAvailable: true } }
                );
            }
        }
        if(unlistedProduct){
            res.status(200).send("product restored sucessfully");
        }
    }catch(err){
        throw new Error('error on product restore ')
    }
}

const getEditProducts = async (req, res) => {
    try {
        let pId = req.query.pId 
      console.log(pId)
        if (pId) {
            let products = await Products.findOne({ _id: pId });
            
        console.log(products);
            if (products) {
            return res.render('admin/editproduct', { product: products });
            } else {
              return  res.status(404).send("product not found");
            }
        } else {
           return res.status(400).send("Invalid product ID");
        }

    } catch (error) {
        console.error(`Error fetching product for edit: ${error.message}`);
        res.status(500).send("An error occurred while fetching product for edit");
    }
}



const editProducts = async (req, res) => {
    try {
        let pId = req.query.pId;
        let { product: newproduct, category: newCategory, brand: newBrand , desc:newDesc } = req.body;
        let alreadyExist = await Products.findOne({ productName: newproduct });
        if (alreadyExist) {
            console.log('Rendering view: admin/products - Product already exists');
            return res.render('admin/editproduct', { err: "The product already exists" });
        }
        if (!newCategory) {
            return res.render('admin/editproduct', { err: "Category is required" });
        }
        if (!newBrand) {
            return res.render('admin/editproduct', { err: "Brand is required" });
        }
        let editedproduct = await Products.findOneAndUpdate(
            { _id: pId },
            {
                $set: {
                    productName: newproduct,
                    category: newCategory,
                    brand: newBrand,
                    description:newDesc
                }
            },
            { new: true } 
        );

        if (editedproduct) {
            res.redirect('/admin/products');
        } else {
            res.status(404).send("Product not found");
        }
    } catch (error) {
        console.error(`Error editing product: ${error.message}`);
        res.status(500).send("An error occurred while editing product");
    }
};





//get unlisted products
const getUnlistedVariants =async (req,res)=>{
    let variants = await Variant.aggregate([
        {$match:{isDeleted:true}},
        {
            $lookup: {
                from: 'products',     
                localField: 'productId',
                foreignField: '_id',
                as: 'products'
            }
        }
    ]);
        
       console.log(variants);


   
    res.render('admin/unlistedvariants',{variant:variants})
}



//unlist variant
const unlistVariant= async(req,res)=>{
    let id = req.query.pId
    console.log( "vId",id)

    try{
        let unlistedVariant= await Variant.findOneAndUpdate(
            {_id:id},          
            { $set:{  isDeleted:true }})
        console.log(unlistedVariant);
        
      
        if(unlistedVariant){
            res.status(200).send("variant unlisted sucessfully");
        }
    }catch(err){
        throw new Error('error on product unlist ')
    }
}


const getEditVariants = async (req, res) => {
    try {
        let vId = req.query.vId 
      console.log(vId)
        if (vId) {
            let variants = await Variant.findOne({ _id: vId });
            const sizes = await Sizes.find({ isDeleted: false })
            console.log(sizes);
            
            
        console.log(variants);
            if (variants) {
            return res.render('admin/editvariant', { variants: variants,sizes });
            } else {
              return  res.status(404).send("variant not found");
            }
        } else {
           return res.status(400).send("Invalid variant ID");
        }

    } catch (error) {
        console.error(`Error fetching product for edit: ${error.message}`);
        res.status(500).send("An error occurred while fetching variant for edit");
    }
}



const editVariants = async (req, res) => {
    try {
        const { vId, color: newColor, price: newPrice, stock, images } = req.body;
        console.log(req.body);
        console.log("Editing variant with ID:", vId);

        if (!images || images.length < 3) {
            return res.status(400).json({ msg: "Missing required images", type: "error" });
        }

        const imageUrls = [];
        for (const image of images) {
            const uploadResponse = await cloudinary.uploader.upload(image, {
                resource_type: 'auto'
            });
            imageUrls.push(uploadResponse.secure_url);
        }

        let editedVariant = await Variant.findOneAndUpdate(
            { _id: vId },
            {
                $set: {
                    colors: newColor,
                    price: newPrice,
                    stock: stock ,  // Ensure stock is parsed to an array  // JSON.parse(stock)
                    images: imageUrls
                }
            },
            { new: true }
        );

        if (editedVariant) {
            res.status(200).json({ msg: "Variant updated successfully", type: "success" });
        } else {
            res.status(404).json({ msg: "Variant not found", type: "error" });
        }
    } catch (error) {
        console.error(`Error editing variant: ${error.message}`);
        res.status(500).json({ msg: "An error occurred while editing the variant", type: "error" });
    }
};



const restoreVariant = async(req,res)=>{
    let id = req.query.vId
    console.log(id,'id');
    

    try{
        let unlistedVariant = await Variant.findOneAndUpdate(
            {_id:id},
            {
                $set:{
                    isDeleted:false
                }
            }
        )

        if(unlistedVariant){
            res.status(200).send("product restored sucessfully");
        }
    }catch(err){
        throw new Error('error on product restore ')
    }
}


module.exports = {
    getShop,
    addnewcategory,
    deletecategory,
    restoreCat,
    getEditcat,
    editCat,
    getProducts,
    getAddProducts,
    getBrands,
    getAddBrands,
    addNewBrand,
    deleteBrand,
    getdeletedBrands,
    restoreBrand,
    getEditBrand,
    editBrand,
    colors,
    addNewColor,
    getAddColors,
    getdeletedColors,
    getSizes,
    getAddSizes,
    addNewsize,
    getdeletedSizes,
    deleteColor,
    getEditColor,
    editCol,
    addProducts,
    addProductVariants,
    deleteproductdata,
    // listProducts
   
    getDetailedView,
    getUnlistedProducts,
    getEditProducts,
    editProducts,
    unlistProduct,
    restoreProduct,
    getUnlistedVariants,
    unlistVariant,
    getEditVariants,
    editVariants,
    restoreVariant


}