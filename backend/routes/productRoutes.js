const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { requireAdmin } = require('../middleware/adminAuth');
const { getProducts, createProduct } = require('../controllers/productController');
const productCategories = new Set(['Hot Coffee', 'Cold Coffee', 'Bakery', 'Tea & Drinks']);

const validateProductFields = (body) => {
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return 'Product name is required.';
  }
  if (body.price !== undefined && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
    return 'Price must be a non-negative number.';
  }
  if (body.category !== undefined && !productCategories.has(body.category)) {
    return 'Choose a valid product category.';
  }
  if (body.stockCount !== undefined &&
      (!Number.isInteger(Number(body.stockCount)) || Number(body.stockCount) < 0)) {
    return 'Stock must be a non-negative whole number.';
  }
  if (body.image !== undefined &&
      (typeof body.image !== 'string' || body.image.length > 700 * 1024 ||
       (body.image && !body.image.startsWith('data:image/jpeg;base64,')))) {
    return 'Product photos must be optimized JPEG images smaller than 700 KB.';
  }
  return null;
};

// 1. GET ALL PRODUCTS
router.get('/', getProducts);

// 2. CREATE A NEW PRODUCT
router.post('/', requireAdmin, createProduct);

// 3. EDIT & RESTOCK PRODUCT (PUT /api/products/:id)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const allowedFields = ['name', 'price', 'category', 'stockCount', 'description', 'image'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([field]) => allowedFields.includes(field))
    );
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'Provide at least one valid product field to update.' });
    }
    const validationError = validateProductFields(updates);
    if (validationError) return res.status(400).json({ message: validationError });
    if (updates.name !== undefined) updates.name = updates.name.trim();
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(updatedProduct);
  } catch (err) {
    console.error('Update error:', err);
    res.status(400).json({ message: err.message });
  }
});

// 4. DELETE PRODUCT (DELETE /api/products/:id)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;