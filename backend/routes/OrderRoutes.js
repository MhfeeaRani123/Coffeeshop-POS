const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const DailyOrderCounter = require('../models/DailyOrderCounter');

const allowedTables = new Set(['Takeaway', 'Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5']);
const allowedPayments = new Set(['Cash', 'Card', 'Mobile Pay']);
const discountRates = {
  None: 0,
  'Student (10%)': 10,
  'Happy Hour (15%)': 15,
  'COFFEE10 (10% OFF)': 10,
  'VIP20 (20% OFF)': 20,
};
const drinkCategories = new Set(['Hot Coffee', 'Cold Coffee', 'Tea & Drinks']);
const allowedMilks = new Set(['Standard', 'Whole', 'Oat', 'Almond']);
const fail = (status, message) => Object.assign(new Error(message), { status });
const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Unable to load order history.' });
  }
});

router.post('/', async (req, res) => {
  const { items, tableNumber = 'Takeaway', discountType = 'None', paymentMethod = 'Cash' } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Add at least one item before checkout.' });
  }
  if (items.length > 100) {
    return res.status(400).json({ message: 'An order cannot contain more than 100 item options.' });
  }
  if (!allowedTables.has(tableNumber)) {
    return res.status(400).json({ message: 'Choose a valid service option or table.' });
  }
  if (!allowedPayments.has(paymentMethod)) {
    return res.status(400).json({ message: 'Choose a valid payment method.' });
  }
  if (!Object.prototype.hasOwnProperty.call(discountRates, discountType)) {
    return res.status(400).json({ message: 'Choose a valid discount.' });
  }

  const session = await mongoose.startSession();
  try {
    let createdOrder;
    await session.withTransaction(async () => {
      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          throw fail(400, 'An order item is invalid.');
        }
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
          throw fail(400, 'Item quantity must be a whole number between 1 and 100.');
        }

        if (!mongoose.isValidObjectId(item.product)) {
          throw fail(400, 'An item in this order is no longer available.');
        }
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          throw fail(409, 'An item in this order is no longer available.');
        }

        const isDrink = drinkCategories.has(product.category);
        const size = isDrink ? (item.size || 'Regular') : 'Regular';
        const milk = isDrink ? (item.milk || 'Standard') : 'Standard';
        if (!['Regular', 'Large'].includes(size) || !allowedMilks.has(milk)) {
          throw fail(400, 'Choose valid size and milk options for each drink.');
        }
        const price = roundCurrency(Number(product.price) + (isDrink && size === 'Large' ? 1 : 0));
        const updatedProduct = await Product.findOneAndUpdate(
          { _id: product._id, stockCount: { $gte: quantity } },
          { $inc: { stockCount: -quantity } },
          { new: true, session }
        );
        if (!updatedProduct) {
          throw fail(409, `${product.name} does not have enough stock for this order.`);
        }

        subtotal += price * quantity;
        orderItems.push({
          product: product._id,
          name: product.name,
          size,
          milk,
          quantity,
          price,
        });
      }

      subtotal = roundCurrency(subtotal);
      const discountAmount = roundCurrency(subtotal * discountRates[discountType] / 100);
      const totalAmount = roundCurrency(subtotal - discountAmount);
      const now = new Date();
      const dailyOrderDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);
      const existingOrderCount = await Order.countDocuments({
        createdAt: { $gte: dayStart, $lt: nextDay },
      }).session(session);

      await DailyOrderCounter.findByIdAndUpdate(
        dailyOrderDate,
        { $max: { sequence: existingOrderCount } },
        { upsert: true, setDefaultsOnInsert: true, session }
      );
      const counter = await DailyOrderCounter.findByIdAndUpdate(
        dailyOrderDate,
        { $inc: { sequence: 1 } },
        { new: true, session }
      );

      [createdOrder] = await Order.create([{
        items: orderItems,
        tableNumber,
        subtotal,
        discountAmount,
        discountType,
        totalAmount,
        paymentMethod,
        dailyOrderDate,
        dailyOrderNumber: counter.sequence,
        createdAt: now,
      }], { session });
    });
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Order checkout failed:', error.message);
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({
      message: error.status || error.name === 'ValidationError'
        ? error.message
        : 'Checkout failed. Please try again.',
    });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
