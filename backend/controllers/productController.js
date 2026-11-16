const Product = require('../models/Product');
const productCategories = new Set(['Hot Coffee', 'Cold Coffee', 'Bakery', 'Tea & Drinks']);

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Unable to load products.' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, price, category, description, stockCount, image } = req.body;
    if (typeof name !== 'string' || !name.trim() ||
        !Number.isFinite(Number(price)) || Number(price) < 0 ||
        !productCategories.has(category)) {
      return res.status(400).json({ message: 'Provide a product name, valid price, and category.' });
    }
    if (stockCount !== undefined &&
        (!Number.isInteger(Number(stockCount)) || Number(stockCount) < 0)) {
      return res.status(400).json({ message: 'Stock must be a non-negative whole number.' });
    }
    if (image !== undefined &&
        (typeof image !== 'string' || image.length > 700 * 1024 ||
         (image && !image.startsWith('data:image/jpeg;base64,')))) {
      return res.status(400).json({ message: 'Product photos must be optimized JPEG images smaller than 700 KB.' });
    }

    const product = new Product({
      name: name.trim(),
      price: Number(price),
      category,
      description: description || '',
      stockCount: stockCount === undefined ? 20 : Number(stockCount),
      image: image || '',
    });
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getProducts, createProduct };