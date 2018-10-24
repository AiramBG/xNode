/**
 * Created by Airam on 6/05/16.
 */
var mongoose = require('mongoose');

var TokenSchema = new mongoose.Schema({
	code: { type: String, required: true },
	tag: { type: String, required: true },
	user: { type: String, required: true, ref: 'user' },
	behavior: { type: String, required: true, default: 'renew' },
	createdAt: { type: Date, required: true, default: Date.now },
	expirationDate: { type: Date, default: null }
});

module.exports = mongoose.model('token', TokenSchema);