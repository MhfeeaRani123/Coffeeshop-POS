const Order = require('../models/Order');
const DailyOrderCounter = require('../models/DailyOrderCounter');

const nextDailyOrderNumber = async (date, existingOrderCount) => {
  try {
    await DailyOrderCounter.findByIdAndUpdate(
      date,
      { $max: { sequence: existingOrderCount } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  try {
    const counter = await DailyOrderCounter.findByIdAndUpdate(
      date,
      { $inc: { sequence: 1 } },
      { new: true }
    );
    return counter.sequence;
  } catch (error) {
    if (error.code !== 11000) throw error;
    const counter = await DailyOrderCounter.findByIdAndUpdate(
      date,
      { $inc: { sequence: 1 } },
      { new: true }
    );
    return counter.sequence;
  }
};

// @desc    Create new checkout order
// @route   POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No order items provided' });
    }

    const createdAt = new Date();
    const dailyOrderDate = [
      createdAt.getFullYear(),
      String(createdAt.getMonth() + 1).padStart(2, '0'),
      String(createdAt.getDate()).padStart(2, '0'),
    ].join('-');
    const dayStart = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    const existingOrderCount = await Order.countDocuments({
      createdAt: { $gte: dayStart, $lt: nextDay },
    });
    const dailyOrderNumber = await nextDailyOrderNumber(dailyOrderDate, existingOrderCount);

    const order = new Order({
      items,
      totalAmount,
      paymentMethod,
      dailyOrderDate,
      dailyOrderNumber,
      createdAt,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (sales history)
// @route   GET /api/orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrder, getOrders };