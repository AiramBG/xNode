/**
 * Created by Airam on 2018-09-17
 * Este módulo ayuda a convertir los datos de mongo en un objeto más adecuado
 * para enviar al usuario (ocultar campos, renombrarlos, añadir campos referenciados, etc)
 * Para utilizarlo, llamar a core.modelizer.public()
 */

module.exports = {
	/**
		data puede ser un objeto de mongo, un id o un array.
		req es la variable req de Express
		cbModel es una función que construirá el objeto y lo retornará
		cbFinish es el callback que será llamado al finalizar el proceso.

		Ej: core.modelizer.public(
				usermongo,
				req,
				'User',
				'_id',
				function(data, req, next) {
					//data es el objeto de mongo
					let item = {name: data.name};
					next(item);
				},
				function(err, result) {
					//haz algo con el resultado final
				}
			);
		Puedes verlo funcionar en el controller users.js.
	*/
	public: function(data, req, model, primaryKey, cbModel, cbFinish) {
		if (typeof cbModel !== 'function') {
			cbModel = function() { console.log(i18n.__('CALLBACK_ERR', model+' public', 'cbModel')); };
		}

		if (typeof cbFinish !== 'function') {
			cbFinish = function() { console.log(i18n.__('CALLBACK_ERR', model+' public', 'cbFinish')); };
		}

		if (typeof data === 'undefined' || data == null) return cbFinish(null, undefined);

		else if (Array.isArray(data)) {
			var arr = [];
			utils.forEachSync(data, function(item, i, next) {
				module.exports.public(item, req, model, primaryKey, function(err, pdata) {
					arr.push(pdata);
					next();
				}, (err, r) => cbFinish(null, arr));
			});
		}

		else if (
			(primaryKey == '_id' && utils.isObjectId(data))
			|| (primaryKey != '_id' && (typeof data === 'string' || typeof data === 'number'))
		) {
			let q = {};
			q[primaryKey] = data;
			require('../model/'+model.toLowerCase()).findOne(q, function(err, obj) {
				module.exports.public(obj, req, model, primaryKey, cbModel, cbFinish);
			});
		}

		else if (typeof data === 'object') {
			if (typeof data[primaryKey] === 'undefined') return cbFinish(null, undefined);
			cbModel(data, req, function(err, pdata) {
				cbFinish(err, pdata);
			});
		}
	}
}
