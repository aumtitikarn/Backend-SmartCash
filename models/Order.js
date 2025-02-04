const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  barcode: {
    type: String,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  }
});

module.exports = mongoose.model('Order', orderSchema);