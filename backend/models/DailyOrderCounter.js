const mongoose = require('mongoose');

const dailyOrderCounterSchema = new mongoose.Schema({
  _id: { type: String },
  sequence: { type: Number, required: true, min: 0, default: 0 },
});

module.exports = mongoose.model('DailyOrderCounter', dailyOrderCounterSchema);
