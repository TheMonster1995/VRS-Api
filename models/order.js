const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
	order_id: String,
	order_num: Number,
	parts: Array,
	labore: Array,
	customer_info: Object,
	car_info: Object,
	received_date_time: Date,
	promised_date_time: Date,
	gas_oil_grease: String,
	misc_merch: String,
	sublet_repairs: String,
	storage_fee: String,
	labore_only: String,
	parts_fee: String,
	tax: String,
	total_fee: String,
	cancel_fee: String,
	written_estimate_choice: String,
	written_estimate_limit: String,
	cost_profit_representation: Boolean,
	law_charge_fee: String,
	law_charge: Boolean,
	state: String,
	submission_date: Date,
	authorized_by: String
})

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
