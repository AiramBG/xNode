/**
 * Created by Airam on 26/04/16.
 */

var multer = require('multer');
//var ffprobe = require('ffprobe'), ffprobeStatic = require('ffprobe-static');
var Users = require('../controller/users');
var File = require('../model/file');
var User = require('../model/user');




//Establece la forma en la que multer guarda los archivos.
exports.multerSimpleOptions = multer.diskStorage({
	destination: './uploads',
	filename: function(req, file, cb) {
		var h = (typeof req.user === 'object' && req.user && req.user._id) ? req.user._id.toString() : utils.uid(24);
		var hostedName = h+'_'+new Date().getTime()+file.originalname.substring(file.originalname.lastIndexOf("."));
		cb(null, hostedName);
	}
});



//Elimina un archivo a partir de la ruta.
exports.deleteFromFilename = deleteFromFilename;
function deleteFromFilename(filename, debug, callback) {
	if (typeof callback !== 'function') callback = function() {};
	debug = (typeof debug !== 'undefined' && debug);

	if (!filename) {
		console.log('[deleteFromFilename ERROR] Filename missing');
		return callback(true);
	}

	if (typeof filename === 'string') {
		let path = utils.path(appdir, setup.file.uploadsPath, filename);
		if (path.indexOf(setup.file.defaultAvatar) == -1 && fs.existsSync(path)) {
			fs.unlink(path, function(err) {
				if (err) console.log('[deleteFromFilename ERROR]', err);
				else if (debug) console.log(i18n.__('DELETE_OK'), path);
				return callback(false);
			});
		}
		else return callback(false);
    }
    else if (typeof filename === 'object') {
        if (Array.isArray(filename)) {
            if (debug) console.log('[deleteFromFilename ERROR] Filename Array not supported.');
            return callback(true);
        }
        else {
            for (key in filename) {
					if (typeof filename[key] !== 'object' || !Array.isArray(filename[key])) {
						if (debug) console.log('[deleteFromFilename ERROR] Wrong filename');
						return callback(true);
					}
					for (let i=0; i<filename[key].length; i++) {
						var p = utils.path('/', setup.file.uploadsPath, filename[key][i].name);
						if (p.indexOf(setup.file.defaultAvatar) == -1 && fs.existsSync(p)) {
							fs.unlink(p, function(err) {
								if (err) console.log('[deleteFromFilename ERROR]', err);
								else if (debug) console.log(i18n.__('DELETE_OK'), path);
								return callback(false);
							});
						}
						else return callback(false);
					}

            }
        }
    }
}

//Elimina un archivo a partir de un id de File.
exports.deleteFromId = deleteFromId;
function deleteFromId(id, callback) {
	if (typeof callback !== 'function') callback = function() {};
	if (!utils.isObjectId(id)) {
		console.log('[deleteFromId ERROR] id must be mongo id');
		return callback(true);
	}

	File.findOne({_id: id}, function(err, doc) {
		if (err) console.log('[deleteFromId ERROR] 500 err:', err.message);
		if (!doc) return callback(true);
		deleteFromFilename(doc.name);
		doc.remove(function(err) {
			if (err) {
				console.log('[deleteFromId ERROR] 500 err:', err.message);
				return callback(true);
			}
			else return callback(false);
		});
	});
}

exports.deleteFromOwner = deleteFromOwner;
function deleteFromOwner(owner, callback) {
	if (typeof callback !== 'function') callback = function() {};
	File.find({owner: owner}, function(err, docs) {
		if (err) {
			console.log('[deleteFromOwner ERROR] 500 err:', err.message);
			return callback(true);
		}
		docs.forEach(function(doc) {
			deleteFromFilename(doc.name);
			doc.remove(function(err) {
				if (err) {
					console.log('[deleteFromOwner ERROR] 500 err:', err.message);
					return callback(true);
				}
			});
		});
		callback(false);
	});
}

/*
 Crea un registro file y lo asocia al archivo en disco a partir de los datos req.files de multer.
 extras debe ser un objeto o null, que añadirá cada key: value directamente al registro file.

 Debe asegurarse de que los campos proporcionados en extras existen en el modelo files
 o no se guardarán.

 Los objetos file creados en mongo se añadirán a cada elemento de req.files en un campo saved.
 */
exports.save = save;
function save(multerFile, extras, callback) {
	if (typeof callback !== 'function') callback = function() {};
	if (!multerFile || typeof multerFile !== 'object') return callback('multerFile err', null);
	if (!File) return callback('model File err', null);


	if (Array.isArray(multerFile)) {
		utils.forEachSync(multerFile, function(item, i, next) {
			save(item, extras, function(err, saved) {
				next();
			});
		}, function(err) {
			return callback(err, multerFile);
		});
	}
	else if (multerFile.filename && multerFile.mimetype && multerFile.size) {
		let promises = [];
		//Para obtener la duración de un video/audio es necesario instalar ffprobe
		//Más info en https://www.npmjs.com/package/ffprobe
		if (typeof ffprobe !== 'undefined' && (validateVid(multerFile) || validateSnd(multerFile))) {
			promises.push(new Promise(function(resolve, reject) {
				ffprobe(multerFile.path, { path: ffprobeStatic.path }, function(err, probeData) {
					try { multerFile.duration = probeData.duration }
					catch(e) { multerFile.duration = 0 }
					return resolve();
				});
			}));
		}

		Promise.all(promises).then(function(values) {
			let f = {
				name:			multerFile.filename,
				type:			validate(multerFile),
				mime:			multerFile.mimetype,
				size:			multerFile.size, //bytes
				duration:	(multerFile.duration)? multerFile.duration : 0, //seconds
			};

			if (extras && typeof extras === 'object') {
				for (key in extras) f[key] = extras[key];
			}

			let file = new File(f);
			file.save(function(err, saved) {
				multerFile.saved = saved;
				callback(err, saved);
			});
		});
	}
	else {
		utils.forEachSync(Object.keys(multerFile), function(key, i, next) {
			save(multerFile[key], extras, function(err, saved) {
				next();
			});
		}, function(err) {
			callback(err);
		});
	}
}




/*
Retorna el tipo de archivo subido al servidor. Esta función sirve tanto para
validar un campo como campos múltiples.

	Ejemplo para validar un campo:
		if (Files.validate(req.file) != 'img') {
			if (req.file) Files.deleteFromFilename(req.file.filename);
			return utils.response(res, 400, 'Solo se aceptan imágenes');
		}

	Ejemplo para validar varios campos (acepta array)
		let val = Files.validate(req.files, {cover: 'vid', avatar: 'img'});
		for (type in val) {
			if (!val[type]) {
				if (req.files) Files.deleteFromFilename(req.files);
				return utils.response(res, 400, 'Tipo incorrecto en '+type);
			}
		}

	Ejemplo para validar tú mismo los tipos
 		let val = Files.validate(req.files);
		for (type in val) {
			if (Array.isArray(val[type])) {
				for (let i=0; i<val[type].length; i++) {
					if (val[type][i] != 'img') {
						if (req.files) Files.deleteFromFilename(req.files);
						return utils.response(res, 400, 'Solo se aceptan imágenes');
					}
				}
			}
			else if (val[type] != 'img') {
				if (req.files) Files.deleteFromFilename(req.files);
				return utils.response(res, 400, 'Solo se aceptan imágenes');
			}
		}

*/
exports.validate = validate;
function validate(multerFile, validType) {
	if (!multerFile || typeof multerFile !== 'object') return null;
	if (Array.isArray(multerFile)) {
		var r = [];
		for (var i=0; i<multerFile.length; i++) {
			r.push(validate(multerFile[i], validType));
		}
		return r;
	}
	else if (multerFile.filename && multerFile.mimetype && multerFile.path) {
		if (validateImg(multerFile)) return 'img';
		if (validateVid(multerFile)) return 'vid';
		if (validateSnd(multerFile)) return 'snd';
		if (validateTxt(multerFile)) return 'txt';
		if (validateDoc(multerFile)) return 'doc';
		if (validatePdf(multerFile)) return 'pdf';
		if (validateEbook(multerFile)) return 'ebk';
		return 'application/octet-stream';
	}
	else {
		var r = {};
		for (key in multerFile) {
			if (typeof multerFile[key] !== 'object' || !Array.isArray(multerFile[key])) r[key] = null;
			r[key] = validate(multerFile[key], validType);
			if (Array.isArray(r[key])) {
				for (var i=0; i<r[key].length; i++) {
					if (validType) {
						if (typeof validType === 'string' && r[key][i] != validType.toLowerCase())
							r[key] = false;
						else if (typeof validType === 'object' && r[key][i] != validType[key].toLowerCase()) {
							r[key] = false;
							break;
						}
					}
				}
				if (validType && r[key]) r[key] = true;

			}
			else if (validType) {
				if (typeof validType === 'string' && r[key] != validType.toLowerCase()) r[key] = false;
				else if (typeof validType === 'object'
					&& validType[key] && r[key] != validType[key].toLowerCase()) r[key] = false;
				else r[key] = true;
			}
		}
		return r;
	}

}

exports.validateImg = validateImg;
function validateImg(multerFile) {
	var acceptedMimetypes = [
		'image/jpg',	'image/jpeg',
		'image/gif',	'image/png',
		'image/bmp',	'image/x-windows-bmp',
		'image/tiff',	'image/x-tiff'
	];
	return (acceptedMimetypes.indexOf(multerFile.mimetype) >= 0);
}

exports.validateVid = validateVid;
function validateVid(multerFile) {
	var acceptedMimetypes = [
		'video/mp4',
		'video/mpeg',
		'video/webm',
		'video/MP2T',
		'video/3gpp',
		'video/ogg',
		'video/x-msvideo'
	];
	return (acceptedMimetypes.indexOf(multerFile.mimetype) >= 0);
}

exports.validateSnd = validateSnd;
function validateSnd(multerFile) {
	var acceptedMimetypes = [
		'audio/aac',		'audio/midi',
		'audio/ogg',		'audio/webm',
		'audio/x-wav',		'audio/3gpp',
		'audio/3gpp2',		'audio/flac',
		'audio/mpeg',		'audio/mp4',
		'audio/wav'
	];
	return (acceptedMimetypes.indexOf(multerFile.mimetype) >= 0);
}

exports.validateDoc = validateDoc;
function validateDoc(multerFile) {
	var acceptedMimetypes = [
		'application/msword', //doc
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document', //docx
		'application/vnd.ms-word.document.macroEnabled.12', //docm
		'application/vnd.oasis.opendocument.text', //odt
		'application/rtf', //rtf
	];
	return (acceptedMimetypes.indexOf(multerFile.mimetype) >= 0);
}

exports.validatePdf = validatePdf;
function validatePdf(multerFile) {
	var acceptedMimetypes = [
		'application/pdf'
	];
	return (acceptedMimetypes.indexOf(multerFile.mimetype) >= 0);
}

exports.validateSql = validateSql;
function validateSql(multerFile) {
	var acceptedMimetypes = [
		'application/x-sql'
	];
	return (acceptedMimetypes.indexOf(multerFile.mimetype) >= 0);
}


exports.validateEbook = validateEbook;
function validateEbook(multerFile) {
	var acceptedMimetypes = [
		'application/vnd.amazon.ebook',
		'application/epub+zip', //epub
	];
	return (acceptedMimetypes.indexOf(multerFile.mimetype) >= 0);
}

exports.validateTxt = validateTxt;
function validateTxt(multerFile) {
	var acceptedMimetypes = [
		'text/plain', //txt
	];
	return (acceptedMimetypes.indexOf(multerFile.mimetype) >= 0);
}

//Stackoverflow
exports.format = format;
function format(a,b){if(0==a)return"0 Bytes";var c=1024,d=b||2,e=["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"],f=Math.floor(Math.log(a)/Math.log(c));return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]}



/**
 * Esta función crea un objeto con los datos del archivo a partir del objeto de mongo.
 * Sirve para ocultar campos, darles formato, etc antes de enviarlos en una
 * respuesta al usuario (por ejemplo en una petición ajax).
 *
 * 'data' puede ser un objeto de mongo, ObjectId de mongo o un array.
 *
 * Files.public(data, req, (err, pubData) => {
 * 	if (err) { return algo ... }
 * 	... haz algo con pubData, como enviarlo a la vista ...
 * });
 */
exports.public = public;

function public(data, req, callback) {
	core.modelizer.public(
		data, req, 'File', '_id',
		function(data, req, next) {
			let item = {
				id: data._id.toString(),
				path: utils.path(setup.file.uploadsPath, data.name),
				mime: data.mime,
				size: {
					bytes: data.size,
					format: data.size
				},
				tag: data.tag,
				type: data.type,
				duration: data.duration
			};
			next(null, item);
		},
		function(err, result) {
			callback(err, result);
		}
	);
}
