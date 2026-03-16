const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const fs = require("fs");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { seedProducts } = require("./seedProducts");
// const { type } = require("os");

const mongoUri = process.env.MONGODB_URI;
const backendUrl = process.env.BACKEND_URL || "https://backend-ovfj.onrender.com";
const uploadDir = path.join(__dirname, "upload", "images");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.json());
app.use(cors());

const ensureDatabaseConnection = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      error: "Database is not connected",
    });
    return false;
  }

  return true;
};

const connectToDatabase = async () => {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

// API creation

app.get("/", (req, res) => {
  res.send("Express App is running");
});

// Image Storage Engine

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}_${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

// upload Endpoint for images
app.use("/images", express.static("upload/images"));
app.post("/upload", (req, res) => {
  upload.single("product")(req, res, (error) => {
    if (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        success: 0,
        error: "Image upload failed",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: 0,
        error: "No image file received",
      });
    }

    res.json({
      success: 1,
      image_url: `${backendUrl}/images/${req.file.filename}`,
    });
  });
});

// Schema for Creating Products
const Product =
  mongoose.models.Product ||
  mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

// API for adding products to the database
app.post("/addproduct", async (req, res) => {
  if (!ensureDatabaseConnection(res)) {
    return;
  }

  try {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
      let last_product_array = products.slice(-1);
      let last_product = last_product_array[0];
      id = last_product.id + 1;
    } else {
      id = 1;
    }
    const product = new Product({
      id: id,
      name: req.body.name,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
    });
    await product.save();
    console.log("saved");
    res.json({
      success: true,
      name: req.body.name,
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add product",
    });
  }
});

// Creating API for deleting products

app.post("/removeproduct", async (req, res) => {
  if (!ensureDatabaseConnection(res)) {
    return;
  }

  try {
    await Product.findOneAndDelete({ id: req.body.id });

    res.json({
      success: true,
      name: req.body.name,
    });
  } catch (error) {
    console.error("Remove product error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove product",
    });
  }
});

// Creating API for getting All products

app.get("/allproducts", async (req, res) => {
  if (!ensureDatabaseConnection(res)) {
    return;
  }

  try {
    let products = await Product.find({});
    res.send(products);
  } catch (error) {
    console.error("All products error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch products",
    });
  }
});

// Schema for User Model

const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Creating EndPoint for user Registration

app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    res
      .status(400)
      .json({
        success: false,
        errors: "existing user found with the same email address",
      });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });
  await user.save();
  const data = {
    user: {
      id: user.id,
    },
  };
  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});

// creating endpoint for the user login

app.post('/login', async (req, res)=>{
  let user = await Users.findOne({email:req.body.email});
  if (user){
    const passCompare = req.body.password===user.password;
    if (passCompare){
      const data = {
        user:{
          id:user.id
        }
      }
      const token = jwt.sign(data, 'secret_ecom');
      res.json({success:true, token})
    }else{
      res.json({success:false, errors:'Wrong Password'})
    }
  }else{
    res.json({success:false, errors:"wrong email-id"})
  }
})

// api for newCollections
app.get('/newcollections', async(req, res)=>{
  if (!ensureDatabaseConnection(res)) {
    return;
  }

  try {
    let products = await Product.find({})
    let newcollection = products.slice(1).slice(-8)
    res.send(newcollection)
  } catch (error) {
    console.error("New collections error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch new collections",
    });
  }
})

//popular in women category
app.get('/popularinwomen', async(req, res)=>{
  if (!ensureDatabaseConnection(res)) {
    return;
  }

  try {
    let products = await Product.find({category:'women'})
    let popular_in_women = products.slice(0, 4);
    res.send(popular_in_women)
  } catch (error) {
    console.error("Popular in women error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch popular products",
    });
  }
})

app.post("/seedproducts", async (req, res) => {
  if (!ensureDatabaseConnection(res)) {
    return;
  }

  try {
    const seededCount = await seedProducts();
    res.json({
      success: true,
      seededCount,
    });
  } catch (error) {
    console.error("Seed products error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to seed products",
    });
  }
});

//creating middleware to fetch user

const fetchUser = async (req, res, next)=>{
  const token = req.header('auth-token');
  if (!token){
    res.status(401).send({errors:'Plase authenticate using valid token'})
  }else{
    try {
      const data = jwt.verify(token, 'secret_ecom');
      req.user = data.user
      next();
    } catch (error) {
      res.status(401).send({errors:'Please authenticate using a valid token'})
    }
  }
}

//endpoint for adding to cart
app.post('/addtocart',fetchUser, async(req, res)=>{
  let userData = await Users.findOne({_id:req.user.id});
  userData.cartData[req.body.ItemId]+=1
  await Users.findOneAndUpdate({_id:req.user.id}, {cartData:userData.cartData})
  res.send('Added')
})

//creating endpoint to remove product from cart data

app.post('/removefromcart', fetchUser, async(req, res)=>{
  let userData = await Users.findOne({_id:req.user.id});
  
  if (userData.cartData[req.body.itemId]>0)
  userData.cartData[req.body.ItemId]-=1
  await Users.findOneAndUpdate({_id:req.user.id}, {cartData:userData.cartData})
  res.send('Deleted')
})

//creating endpoint for getting  cart data
app.post('/getcart', fetchUser, async(req, res)=>{
  let userData = await Users.findOne({_id:req.user.id})
  res.json(userData.cartData)
})

const startServer = async () => {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log("Server running on port " + port);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
