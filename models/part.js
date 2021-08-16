const mongoose = require('mongoose');

const partSchema = mongoose.Schema({
	part_id: String,
	part_num: String,
	name: String,
	price: String,
	warranty: Boolean
})

const Part = mongoose.model("Part", partSchema);

module.exports = Part;
