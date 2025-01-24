const mongoose = require('mongoose');

const ListProductSchema = new mongoose.Schema({
 name: { type: String, required: true },
 category: { type: String, required: true }, 
 price: { type: Number, required: true },
 image: { type: String },
 barcode: { type: String, required: true }
});

const ProductSchema = new mongoose.Schema({
 lotDate: { type: Date, required: true },
 cost: { type: Number, required: true },
 listProduct: [ListProductSchema]
});

module.exports = mongoose.model('Product', ProductSchema);