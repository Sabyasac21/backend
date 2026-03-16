const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const backendUrl = process.env.BACKEND_URL || "https://backend-ovfj.onrender.com";
const uploadDir = path.join(__dirname, "upload", "images");

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

const categoryTemplates = {
  women: {
    names: [
      "Women's Casual Blouse",
      "Women's Summer Top",
      "Women's Everyday Shirt",
      "Women's Fashion Tunic",
      "Women's Soft Fit Blouse",
      "Women's Printed Top",
      "Women's Weekend Wear Top",
    ],
    prices: [
      [50, 80],
      [55, 90],
      [60, 95],
      [65, 100],
      [70, 110],
      [75, 120],
      [80, 130],
    ],
  },
  men: {
    names: [
      "Men's Solid Bomber Jacket",
      "Men's Casual Zip Jacket",
      "Men's Streetwear Jacket",
      "Men's Classic Layer Jacket",
      "Men's Everyday Jacket",
      "Men's Slim Fit Jacket",
      "Men's Outdoor Jacket",
    ],
    prices: [
      [85, 120],
      [90, 130],
      [95, 140],
      [100, 150],
      [105, 160],
      [110, 170],
      [115, 180],
    ],
  },
  kid: {
    names: [
      "Kids Hooded Sweatshirt",
      "Kids Casual Sweatshirt",
      "Kids Everyday Hoodie",
      "Kids Colorblock Sweatshirt",
      "Kids Playtime Hoodie",
      "Kids Winter Sweatshirt",
      "Kids Soft Cotton Hoodie",
    ],
    prices: [
      [45, 70],
      [50, 75],
      [55, 80],
      [60, 85],
      [65, 90],
      [70, 95],
      [75, 100],
    ],
  },
};

const assignCategory = (index) => {
  if (index < 7) {
    return "women";
  }
  if (index < 14) {
    return "men";
  }
  return "kid";
};

const buildSeedProducts = (filenames, startingId) => {
  return filenames.map((filename, index) => {
    const category = assignCategory(index);
    const categoryIndex = index % 7;
    const template = categoryTemplates[category];
    const [newPrice, oldPrice] = template.prices[categoryIndex];

    return {
      id: startingId + index,
      name: template.names[categoryIndex],
      image: `${backendUrl}/images/${filename}`,
      category,
      new_price: newPrice,
      old_price: oldPrice,
    };
  });
};

const seedProducts = async () => {
  const filenames = fs
    .readdirSync(uploadDir)
    .filter((file) => /\.(png|jpg|jpeg|svg)$/i.test(file))
    .sort();

  if (filenames.length === 0) {
    throw new Error("No uploaded images found in backend/upload/images");
  }

  const existingProducts = await Product.find({});
  const existingImages = new Set(existingProducts.map((product) => product.image));
  const nextId =
    existingProducts.length > 0
      ? Math.max(...existingProducts.map((product) => product.id)) + 1
      : 1;

  const missingFilenames = filenames.filter(
    (filename) => !existingImages.has(`${backendUrl}/images/${filename}`)
  );

  if (missingFilenames.length === 0) {
    console.log("No new uploaded images to seed.");
    return 0;
  }

  const newProducts = buildSeedProducts(missingFilenames, nextId);
  await Product.insertMany(newProducts);

  console.log(`Seeded ${newProducts.length} products into MongoDB.`);
  return newProducts.length;
};

module.exports = { seedProducts };

if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }

  mongoose
    .connect(mongoUri)
    .then(async () => {
      await seedProducts();
      await mongoose.disconnect();
    })
    .catch(async (error) => {
      console.error("Seed failed:", error);
      await mongoose.disconnect();
      process.exit(1);
    });
}
