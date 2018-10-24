/**
 * Created by Airam on 2017-10-03.
 */
var mongoose = require('mongoose');

var schema = new mongoose.Schema({
	userId: 		{ type: String, required: true },
	createdAt:		{ type: Date, required: true, default: Date.now },
	expiresAt:		{ type: Date },
	lastAccess:		{ type: Date },
	client:			{ type: String },
	type:			{ type: String }, //session o cookie
});

module.exports = mongoose.model('session', schema);