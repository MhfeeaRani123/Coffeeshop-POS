const mongoose = require('mongoose');
const DailyOrderCounter = require('./DailyOrderCounter');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    size: { type: String, enum: ['Regular', 'Large'], default: 'Regular' },
    milk: { type: String, enum: ['Standard', 'Whole', 'Oat', 'Almond'], default: 'Standard' },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    items: { type: [orderItemSchema], required: true, validate: items => items.length > 0 },
    dailyOrderDate: { type: String, required: true },
    dailyOrderNumber: { type: Number, required: true, min: 1 },
    tableNumber: {
      type: String,
      enum: ['Takeaway', 'Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5'],
      default: 'Takeaway',
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, default: 'None' },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Mobile Pay'], default: 'Cash' },
  },
  { timestamps: true }
);

orderSchema.pre('validate', async function assignDailyOrderNumber() {
  if (this.dailyOrderDate && this.dailyOrderNumber) return;

  const orderDate = this.createdAt || new Date();
  const dailyOrderDate = [
    orderDate.getFullYear(),
    String(orderDate.getMonth() + 1).padStart(2, '0'),
    String(orderDate.getDate()).padStart(2, '0'),
  ].join('-');
  this.dailyOrderDate = dailyOrderDate;

  if (!this.dailyOrderNumber) {
    const dayStart = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    const query = { createdAt: { $gte: dayStart, $lt: nextDay } };
    const session = this.$session();
    const existingOrderCount = await this.constructor.countDocuments(query).session(session);

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
    this.dailyOrderNumber = counter.sequence;
  }
});

module.exports = mongoose.model('Order', orderSchema);