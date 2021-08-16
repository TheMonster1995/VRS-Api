const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = mongoose.Schema({
	user_id: String,
	password: String,
	name: String,
	email: String,
	role: String,
	status: String,
	username: String,
	signup_date: Date
})

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

module.exports = User;
