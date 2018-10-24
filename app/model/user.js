/**
 * Created by Airam B. García on 2017-09-15
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	name:			{ type: String, required: true },
	email:			{ type: String, required: true },
	password:		{ type: String, required: true },
	createdAt:		{ type: Date, required: true, default: Date.now },
	updatedAt:		{ type: Date, default: null },
	status:			{ type: String, default: null },
	locale:			{ type: String, default: setup.internationalization.default },
	avatar:			{ type: String, default: null, ref: 'file' },
});

module.exports = mongoose.model('user', schema);
