const express = require('express')
const router = express.Router();
const userMiddleware = require('../../middlewares/userMiddleware')
const productController = require('../../controllers/admin/productController')
const adminMiddlewares = require("../../middlewares/adminAuth")
const multer = require("multer")
const path = require("path")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const publicDir = path.join(__dirname,'../../','public');
        const destinationPath = path.join(publicDir,'uploadedImages');
        cb(null, destinationPath);
      } catch (error) {
        console.log(error, 'destination errr');
      }
    },
    filename: (req, file, cb) => {
      try {
        const extenction = file.originalname.substring(file.originalname.lastIndexOf('.'));
        console.log('here in filename');
        cb(null, `${file.fieldname}-${Date.now()}${extenction}`);
      } catch (error) {
        console.log(error, 'filename djfkdljsf');
      }
    },
  });
  
  const upload = multer({ storage });

router.get('/',adminMiddlewares.isToken,productController.getProducts)
router.get('/brands',adminMiddlewares.isToken,productController.getBrands)
router.get('/colors',adminMiddlewares.isToken,productController.colors)
router.get('/sizes',adminMiddlewares.isToken,productController.getSizes)


router.post('/addnewcategory',productController.addnewcategory)
router.get('/editcategory/:categoryId',adminMiddlewares.isToken,productController.getEditcat)
router.post('/restorecategory',productController.restoreCat)
router.post('/editcategory/:catId',productController.editCat)
router.post('/deletecategory',productController.deletecategory);



router.get('/addproducts',adminMiddlewares.isToken,productController.getAddProducts)
router.post('/addproducts',productController.addProducts)



router.get('/addnewbrand',adminMiddlewares.isToken,productController.getAddBrands)
router.get('/deletedbrands',adminMiddlewares.isToken,productController.getdeletedBrands)
router.get('/editbrand/:brandId',adminMiddlewares.isToken,productController.getEditBrand)
router.post('/restorebrand',productController.restoreBrand)
router.post('/addnewbrand',productController.addNewBrand)
router.post('/editbrand/:brandId',productController.editBrand)
router.post('/deletebrand',productController.deleteBrand)

router.get('/editproducts',adminMiddlewares.isToken,productController.getEditProducts)
router.post('/editproducts',productController.editProducts)


router.get('/editvariants',adminMiddlewares.isToken,productController.getEditVariants)
router.post('/editvariants',productController.editVariants)


router.get('/addcolors',adminMiddlewares.isToken,productController.getAddColors)
router.post('/addcolors',productController.addNewColor)
router.post('/deletecolor',productController.deleteColor)
router.get("/editcolors/:clrId",adminMiddlewares.isToken,productController.getEditColor)
router.post("/editcolors/:clrId",productController.editCol)
router.get('/deletedcolors',adminMiddlewares.isToken,productController.getdeletedColors)




router.get('/addsizes',adminMiddlewares.isToken,productController.getAddSizes)
router.post('/addsizes',productController.addNewsize)
router.get('/deletedsizes',adminMiddlewares.isToken,productController.getdeletedSizes)



router.post('/addproductvariant', productController.addProductVariants)
router.post('/deleteproductdata',productController.deleteproductdata)

router.get('/productdetailedview/:id',adminMiddlewares.isToken,productController.getDetailedView)  
                                              
router.post('/unlistproduct',productController.unlistProduct)
router.get('/unlistedproducts',adminMiddlewares.isToken,productController.getUnlistedProducts)
router.post('/restoreproduct',productController.restoreProduct)
router.post('/restorevariant',productController.restoreVariant)


router.get('/unlistvariant',adminMiddlewares.isToken,productController.getUnlistedVariants)    //variant
router.post('/unlistvariant',productController.unlistVariant)


module.exports = router