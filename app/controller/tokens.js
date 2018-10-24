/**
 * Created by Airam on 2017-09-15.
 *
 * Este archivo gestiona los tokens de seguridad del servidor.
 */

var Token = require('../model/token');

/**
 * Crea un nuevo token de seguridad para un usuario. El token se puede crear según el siguiente query:
 *
 * {
 * 	user:		Id de usuario, Obligatorio
 * 	tag:		keyword que identifica el motivo del token, por ejemplo: 'PWD_RECOVERY', 'PIN', etc. Obligatorio.
 * 	expires:	Fecha en la que el token dejará de tener utilidad. Opcional.
 * 	behavior:	Especifica cómo se comporta el token cuando se intente crear un duplicado que coincida en user y tag.
 * 					add			Se añade el nuevo token
 * 					unique		Solo se permite uno. El segundo token devolverá un error.
 * 					renew		Sustituye el token anterior por el nuevo.
 * 	length:		Tamaño del token. Por defecto usará el tamaño prefijado en la configuración del servidor. Opcional.
 * }
 *
 * Behavior por defecto siempre será renew
 * Expires por defecto será null.
 *
 * @param query
 * @param callback
 */
exports.create = function(query, callback) {
	if (!query || !query['user'] || !query['tag']) return callback("Faltan parámetros.", undefined);

	Token.findOne({user: query['user'], tag: query['tag'].toUpperCase()}, function(err, token) {
		if (err) return callback(err, token);
		if (token && token.behavior == 'unique') return callback("El token ya existe y no acepta duplicados.", token);

		var behavior = (validateBehavior(query['behavior']))? query['behavior'] : 'renew';
		var tokenLen = (typeof query['length'] === 'number' && query['length'] > 0)? query['length'] : setup.tokenLength;
		var code = utils.uid(tokenLen);
		var user = query['user'];
		var expires = query['expires'];

		if (!token || token.behavior == 'add') {
			var token = new Token({
				code: code,
				tag: query['tag'].toUpperCase(),
				user: user,
				expirationDate: expires
			});
		}
		else { //renew
			token.code = code;
			token.user = user;
			token.expirationDate = expires;
			token.behavior = behavior;
		}

		token.save(function(err, saved) { callback(err, saved); });
	});
};

//parámetros del query: {user: userId (obligatorio), tag: WORDTAG, code: tokenCode (para comparar)}
exports.get = function(query, callback) {
	if (typeof query['user'] === 'undefined' || query['user'] === null) callback({code: 1, msg: "Falta user"}, false);

	if (typeof query['tag'] === 'undefined' || query['tag'] === null) {
		Token.find({user: query['user']}, function(err, tokens) {
			var error = (err) ? {code: 2, msg: err} : false;
			callback(error, tokens);
		});
	}
	else {
		var q = {user: query['user'], tag: query['tag'].toUpperCase()};
		if (typeof query['code'] !== 'undefined' && query['code'] !== null) q.code = query['code'];
		Token.findOne(q, function(err, token) {
			var error = (err)? {code: 2, msg: err} : false;
			if (!token) return callback(error, false);
			if (token.expirationDate != null && new Date().getTime() >= token.expirationDate.getTime()) {
				Token.remove({_id: token._id}, function(delete_err) {
					if (delete_err) console.log("Error borrando token: "+token._id);
				});
				callback({code: 3, expired: true, expirationDate: token.expirationDate}, false);
			}
			else callback(false, token);

		});
	}
};


/**
 * Restringe los valores que puede tener el campo behavior
 * @param value
 * @returns {boolean}
 */
function validateBehavior(value) {
	if (typeof value !== 'string') return false;
	var accepted = ['add', 'unique', 'renew'];
	return (accepted.indexOf(value) >= 0);
}