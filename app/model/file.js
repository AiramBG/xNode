/**
 * Created by Airam on 19/04/16.
 */

var mongoose = require('mongoose');

var FilesSchema = new mongoose.Schema({
	owner:		{ type: String, required: true },
	tag:			{ type: String, required: true },
	name:			{ type: String, required: true },
	type:			{ type: String, default: null },
	mime:			{ type: String, required: true },
	size:			{ type: String, required: true },
	duration:	{ type: Number, default: null }, //solo audio/video
});

module.exports = mongoose.model('file', FilesSchema);
