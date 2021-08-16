const mongoose = require('mongoose');

const shopOrderSchema = mongoose.Schema({
	order_id: String,
	order_num: Number,
	parts: Array,
	labore: Array,
	gas_oil_grease: String,
	misc_merch: String,
	sublet_repairs: String,
	storage_fee: String,
	labore_only: String,
	parts_fee: String,
	total_fee: String
})

const ShopOrder = mongoose.model("ShopOrder", shopOrderSchema);

module.exports = ShopOrder;
