const mongoose = require('mongoose');

const generalSchema = mongoose.Schema({
	tax_label: String,
	tax_rate: String,
	state: String,
	shop_name: String,
	shop_address: String,
	shop_phones: Array
})

const General = mongoose.model("General", generalSchema);

module.exports = General;
