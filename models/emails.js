const mongoose = require('mongoose')
const Schema = mongoose.Schema

//deprecation warning
mongoose.set('useCreateIndex', true)

const emailsSchema = new Schema({
	list: [{
		num: Number,
		emails: Array,
		queue: Number,
		lastEmail: String
	}]
})

const Emails = mongoose.model('Emails', emailsSchema, 'emails')
module.exports = Emails