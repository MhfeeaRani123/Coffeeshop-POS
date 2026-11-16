const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: ['Hot Coffee', 'Cold Coffee', 'Bakery', 'Tea & Drinks'],
    },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    stockCount: {
      type: Number,
      default: 20,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Stock must be a whole number.' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);