const mongoose = require('mongoose');

const costsSchema = mongoose.Schema({
	costs_id: String,
	from: Date,
	to: Date,
	costs: Array,
	submission_date: Date,
	total: String
})

const Costs = mongoose.model("Costs", costsSchema);

module.exports = Costs;
