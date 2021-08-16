const mongoose = require('mongoose');

const customerSchema = mongoose.Schema({
	customer_id: String,
	orders: Array,
	name: String,
	phone: String,
	address: String,
	city: String,
	state: String,
	zip_code: String
})

const Customer = mongoose.model("Customer", customerSchema);

module.exports = Customer;
