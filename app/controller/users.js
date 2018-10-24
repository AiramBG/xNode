var bcrypt = require('bcrypt');
var crypto = require('crypto');

var Tokens = require('../controller/tokens');
var User = require('../model/user');
var Session = require('../model/session');

var km = 0.00899928;





/***
 * Estrategias de login y autentificación para el sistema Auth
 * ver Auth.js para más información
 */
exports.loginStrategy = function(req, res, callback) {
	if (setup.debug.auth) {
		console.log('[Users.login]');
		console.log('body:',req.body);
		console.log();
	}

	if (typeof callback !== 'function') callback = function() {};

	if (!req.body[setup.auth.validation.field] || !req.body.password)
		return callback({status: 400, data: __('NEED_PARAMS_ERR')});

	var query = {}; query[setup.auth.validation.field] = req.body[setup.auth.validation.field];

	if (setup.loginFieldToLowercase) query[setup.auth.validation.field] = query[setup.auth.validation.field].toLowerCase();

	User.findOne(query, function(err, user) {
		if (err) return callback({status: 500, data: __('HTTP_500b')});
		if (!user) {
			if (!setup.auth.autocreateUsers) {
				return callback({
					status: 401,
					data: {
						message: __('LOGIN_ERR'),
						field: setup.auth.validation.field
					}
				});
			}

			//Si setup.auth.autocreateUsers está true creamos el usuario
			bcrypt.hash(req.body.password, 11, function (err, hash) {
				query.password = hash;
				query.name = (req.body.name)? req.body.name : req.body.email.split('@')[0];
				var user = new User(query);
				user.save(function (err, savedUser) {
					if (err) return callback({status: 500, data: err}, null);
					if (!savedUser) return callback({status: 500, data: __('HTTP_500b')}, null);
					return callback(null, savedUser);
				});
			});
		}
		else {
			if (user.status && setup.auth.blackListStatus.indexOf(user.status) > -1) {
				return callback({
					status: 401,
					data: {
						message: __('LOGIN_ERR'),
						status: user.status
					}
				});
			}
			bcrypt.compare(req.body.password, user.password, function (err, result) {
				if (err) return callback({status: 500, data: err}, null);
				if (!result) {
					return (callback)? callback({
						status:	401,
						data: {
							message: __('PASSWORD_ERR'),
							field: 'password'
						}
					}, null):false;
				}
				return callback(null, user);
			});
		}
	});
}

exports.authStrategy = function(req, res, callback) {
	if (typeof callback !== 'function') callback = function() {};
	if (typeof req.session === 'undefined' || !req.session)
		return callback({status: 401, data: __('HTTP_401')}, null);

	User.findOne({_id: req.session.userId, status: {$nin: ['SUSPEND']}}, function (err, user) {
		if (err) return callback({status: 500, data: __('HTTP_500b')}, null);
		if (!user) return callback({status: 401, data: __('HTTP_401')}, null);

		return callback(null, user);
	});
}





/***
 * Lógica endpoint para la gestión de usuarios
 */
exports.login = function(req, res) {
	if (req.user) return res.redirect(__('routes.'+setup.auth.route.logged));
	utils.render(req, res, 'login');
}

exports.forgotView = function(req, res) {
	var type = utils.responseType(req);

	if (typeof req.query.email === 'undefined' || !req.query.email ||
		typeof req.query.code === 'undefined' || !req.query.code
	) {
		if (type == 'json') return utils.response(res, 200);
		else utils.render(req, res, 'forgot');
	}

	else {
		User.findOne({email: req.query.email.toLowerCase()}, function(err, user) {
			if (err) {
				if (type == 'json') return utils.response(res, 500, __('HTTP_500b'));
				else return utils.render(req, res, 'redirector', {
					status: 500,
					icon: '<i class="fa fa-exclamation-triangle fa-5x text-danger" aria-hidden="true"></i>',
					background_style: '',
					message: __('HTTP_500b'),
					buttonText: __('LOGIN'),
					buttonCss: 'btn-outline-danger',
					href: __('routes.'+setup.auth.route.login),
				});
			}
			if (!user) {
				if (type == 'json') return utils.response(res, 404, __('HTTP_404'));
				else return utils.render(req, res, 'redirector', {
					status: 404,
					icon: '<i class="fa fa-user-times fa-5x text-warning" aria-hidden="true"></i>',
					background_style: '',
					message: __('HTTP_404'),
					buttonText: __('LOGIN'),
					buttonCss: 'btn-warning',
					href: __('routes.'+setup.auth.route.login),
				});

			}


			Tokens.get({user: user._id.toString(), tag: 'PWD_RECOVERY'}, function(err, token) {
				if (err) {
					if (type == 'json') return utils.response(res, 500, __('HTTP_500b'));
					else return utils.render(req, res, 'redirector', {
						status: 500,
						icon: '<i class="fa fa-exclamation-triangle fa-5x text-danger" aria-hidden="true"></i>',
						background_style: '',
						message: __('HTTP_500b'),
						buttonText: __('LOGIN'),
						buttonCss: 'btn-outline-danger',
						href: __('routes.'+setup.auth.route.login),
					});
				}

				if (!token || token.code != req.query.code) {
					if (type == 'json') return utils.response(res, 404, __('INVALIDCODE_ERR'));
					else return utils.render(req, res, 'redirector', {
						status: 404,
						icon: '<i class="fa fa-key fa-5x text-warning" aria-hidden="true"></i>',
						background_style: '',
						message: __('INVALIDCODE_ERR'),
						buttonText: __('LOGIN'),
						buttonCss: 'btn-outline-warning',
						href: __('routes.'+setup.auth.route.login),
					});
				}

				var renewPassword = utils.uid(8);
				if (typeof req.query.password === 'string' && validatePassword(req.query.password))
					renewPassword = req.query.password;

				bcrypt.hash(renewPassword, 11, function (err, hash) {
					if (err) {
						if (type == 'json') return utils.response(res, 500, __('HTTP_500b'));
						else return utils.render(req, res, 'redirector', {
							status: 500,
							icon: '<i class="fa fa-exclamation-triangle fa-5x text-danger" aria-hidden="true"></i>',
							background_style: '',
							message: __('HTTP_500b'),
							buttonText: __('LOGIN'),
							buttonCss: 'btn-outline-danger',
							href: __('routes.'+setup.auth.route.login),
						});
					}

					user.password = hash;
					user.save(function (err, savedUser) {
						if (err) {
							if (type == 'json') return utils.response(res, 500, __('HTTP_500b'));
							else return utils.render(req, res, 'redirector', {
								status: 404,
								icon: '<i class="fa fa-exclamation-triangle fa-5x text-danger" aria-hidden="true"></i>',
								background_style: '',
								message: __('HTTP_500b'),
								buttonText: __('LOGIN'),
								buttonCss: 'btn-outline-danger',
								href: __('routes.'+setup.auth.route.login),
							});
						}

						var bodymsg = "<p>Se ha confirmado un cambio de contraseña para su cuenta. Si no ha solicitado "+
							" ningún cambio de contraseña, por favor, <a href=mailto://"+setup.adminEmail+
							">póngase en contacto con nosotros</a>.</p>"+
							"\n" +
							"<p>Su nueva contraseña es: <span style='font-size:2em'><b>"+renewPassword+"</b></span></p>"+
							"<br/>";

						app.sendMail(
							'no-reply@'+setup.app.email.split('@')[1],
							user.email,
							'Nueva contraseña para '+user.name,
							bodymsg+setup.appEmailFooter,
							function(err) {
								if (err) return console.error(err);
							});

						token.remove(function(err) { if (err) console.log("Error borrando token: "+token._id); });

						if (type == 'json') return utils.response(res, 200, __('FORGOT_STEP2'));
						else return utils.render(req, res, 'redirector', {
							icon: '<i class="fa fa-envelope-o fa-5x text-sucess" aria-hidden="true"></i>',
							background_style: '',
							message: __('FORGOT_STEP2'),
							buttonText: __('LOGIN'),
							buttonCss: 'btn-success',
							href: __('routes.'+setup.auth.route.login),
						});
					});
				});
			});
		});
	}
}

exports.forgotApi = function(req, res) {
	console.log('body', req.body);
	if (typeof req.body.email === 'undefined' || !utils.validateEmail(req.body.email)) return utils.response(res, 400, __('HTTP_400'));

	User.findOne({email: req.body.email.toLowerCase()}, function(err, user) {
		if (err || !user) return utils.response(res, 404, __('HTTP_404'));

		Tokens.create({user: user._id, tag: 'PWD_RECOVERY', length: 5}, function(err, token) {
			if (err || !token) return utils.response(res, 500, __('HTTP_500b'));

			var link = setup.url+'/'+app.currentLocale+__('routes./forgot')+'?email='+user.email+'&code='+token.code;
			var bodymsg = '<p>Le hemos enviado este correo porque hemos recibido una petición de recuperación de ' +
				'contraseña. Si no ha pedido ningún cambio de contraseña, por favor, ignore este mensaje.</p>' +
				'\n' +
				'<p>Su enlace de recuperación es: <a href="'+link+'"><b>'+link+'</b></a></p>'+
				'<br/>';

			app.sendMail(
				'no-reply@'+setup.app.email.split('@')[1],
				user.email,
				'Recuperación de contraseña para '+user.name,
				bodymsg+setup.appEmailFooter,
				function(err) {
					if (err) return console.error(err);
				}
			);

			utils.response(res, 200, __('GENERIC_EMAIL_SENT'));
		});

	});
};

exports.logout = function(req, res) {
	var type = utils.responseType(req);
	if (type == 'json') return utils.response(res, 200, {redirect: __('routes.'+setup.auth.route.logout)});
	else return utils.render(req, res, 'redirector', {
		status: 200,
		icon: '<i class="fa fa-power-off fa-5x text-success" aria-hidden="true"></i>',
		background_style: '',
		message: __('ACCESS_SIGNOUT'),
		buttonText: __('LOGIN'),
		buttonCss: 'btn-success',
		href: __('routes.'+setup.auth.route.logout),
	});
},

//Recuperar los datos de perfil del propio usuario
exports.getMyAccount = function(req, res) {
	var type = utils.responseType(req);
	var locales = req.getLocales();

	public(req.user, req, function(err, pdata) {
		if (type == 'json') return utils.response(res, 200, {profile: pdata, locales: locales});
		else return utils.render(req, res, 'profileEdit', {user: pdata, locales: locales});
	});
};

//Editar el perfil del usuario
exports.editMyAccount = function(req, res, callback) {
	req.params._id = req.user._id.toString();
	delete(req.body.status); //no queremos que los usuarios editen su nivel de acceso

	update(req, res, function(err, user) {
		if (err) return utils.response(res, err.status, err.data);
		public(user, req, function(err, pdata) {
			return utils.response(res, 200, {user: pdata});
		});
	})
};

//Dar de baja el usuario (sin borrarlo)
exports.disableMyAccount = function(req, res, next) {
	req.params._id = req.user._id.toString();

	disable(req, res, function(err, user) {
		if (err) return utils.response(res, err.status, err.data);
		next();
	})
};

//Eliminar la cuenta del usuario
exports.deleteMyAccount = function(req, res, next) {
	req.params._id = req.user._id.toString();
	remove(req, res, function(err, user) {
		if (err) return utils.response(res, err.status, err.data);
		next();
	});
};

//Ver el perfil de otro usuario
exports.getAnotherAccount = function(req, res) {
	var type = utils.responseType(req);

	User.findOne({_id: req.params._id}, function(err, user) {
		if (err) {
			if (type == 'json') return utils.response(res, 500, __('HTTP_500b', err.message));
			else return utils.render(req, res, 'redirector', {
				status: 500,
				icon: '<i class="fa fa-exclamation-triangle fa-5x text-danger" aria-hidden="true"></i>',
				background_style: '',
				message: __('HTTP_500b', err.message),
				buttonText: __((req.user)? 'DASHBOARD' : 'HOME'),
				buttonCss: 'btn-outline-danger',
				href: __('routes.'+((req.user)? '/dashboard' : '/')),
			});
		}
		if (!user) {
			if (type == 'json') return utils.response(res, 404, __('HTTP_404'));
			else return utils.render(req, res, 'redirector', {
				status: 404,
				icon: '<i class="fa fa-user-times fa-5x text-warning" aria-hidden="true"></i>',
				background_style: '',
				message: __('HTTP_404'),
				buttonText: __((req.user)? 'DASHBOARD' : 'HOME'),
				buttonCss: 'btn-warning',
				href: __('routes.'+((req.user)? '/dashboard' : '/')),
			});

		}

		public(user, req, function(err, pdata) {
			if (type == 'json') return utils.response(res, 200, {item: pdata});
			else return utils.render(req, res, 'profileRead', {item: pdata});
		});
	});
};

//Solo para api, una versión más simple de getAnotherAccount()
exports.testApiGetAccount = function(req, res) {
	User.findOne({_id: req.params._id}, function(err, user) {
		if (err) return utils.response(res, 500, err);
		if (!user) return utils.response(res, 404, __('HTTP_404'));

		public(user, req, function(err, pdata) {
			if (err) return utils.response(res, 500, err);
			return utils.response(res, 200, {item: pdata});
		});
	});
}



/***
 * Lógica Middleware CRUD
 * Llamarlos desde endpoints o cualquier otra función.
 */

//Middleware de registro de usuarios
//Los datos del usuario deben estar en req.body
exports.create = create;
function create(req, res, callback) {
	if (setup.debug.user.create) {
		console.log('[Users.create]');
		console.log('body:',req.body);
		console.log();
	}

	if (typeof callback !== 'function') callback = null;

	//Validación de parámetros obligatorios
	if (typeof req.body.email === 'undefined' || !utils.validateEmail(req.body.email))
		return (callback)? callback({
			status:	400,
			data: {
				message: __('EMAIL_ERR'),
				field: 'email'
			}
		}, null):false;

	if (typeof req.body.password === 'undefined' || !validatePassword(req.body.password)) {
		return (callback)? callback({
			status:	400,
			data: {
				message: __('PWD_ERR', setup.passwordMinLength, setup.passwordMaxLength),
				field: 'password'
			}
		}, null):false;
	}

	//Validación de parámetros opcionales
	if (typeof req.body.name !== 'undefined' && !validateName(req.body.name)) {
		return (callback)? callback({
			status:	400,
			data: {
				message: __('NAME_ERR', setup.usernameMinLength, setup.usernameMaxLength),
				field: 'name'
			}
		}, null):false;
	}

	//Búsqueda del usuario a través de un campo único aportado por el usuario (email, tlfno, dni, etc)
	var query = {email:	req.body.email.toLowerCase()};

	User.findOne(query, function (err, user) {
		if (err) return (callback)? callback({status: 500, data: err}, null) : false;
		if (user) return (callback)? callback({status: 304, data: __('HTTP_304')}, user) : false;

		bcrypt.hash(req.body.password, 11, function (err, hash) {
			if (err || !hash) return (callback)? callback({status: 500, data: err}, null) : false;

			//Creación del usuario
			query.password	= hash;
			query.name		= (req.body.name)? req.body.name : req.body.email.split('@')[0];
			var user = new User(query);

			user.save(function (err, savedUser) {
				return (callback)? callback({status: 500, data: err}, savedUser):(!err);
			});
		});
	});
};

//Middleware de actualización de usuarios
//Se debe aportar el id del usuario en req.params._id y los datos en req.body
exports.update = update;
function update(req, res, callback) {
	if (setup.debug.user.update) {
		console.log('[Users.editMyAccount]');
		console.log('body:',req.body);
		console.log('file:', req.file);
		console.log();
	}

	if (typeof callback !== 'function') callback = function() {};

	if (!utils.isObjectId(req.params._id)) {
		if (req.file) Files.deleteFromFilename(req.file.filename);
		return callback({
			status: 400,
			data: {
				param: 'id',
				message: 'ID REQUIRED'
			}
		}, null);
	}

	if (Object.keys(req.body).length < 1) {
		if (req.file) Files.deleteFromFilename(req.file.filename);
		return callback({
			status: 400,
			data: {
				message: __('HTTP_400')
			}
		}, null);
	}

	//Validando parámetros
	let promisesValidation = [];

	if (typeof req.body.name !== 'undefined' && !validateName(req.body.name)) {
		if (req.file) Files.deleteFromFilename(req.file.filename);
		return callback({
			status: 400,
			data: {
				field: 'name',
				message: __('HTTP_400'),
				minLength: setup.usernameMinLength,
				maxLength: setup.usernameMaxLength
			}
		}, null);
	}

	if (typeof req.body.locale !== 'undefined' && !utils.validateLocale(req.body.locale)) {
		if (req.file) Files.deleteFromFilename(req.file.filename);
		return callback({
			status: 400,
			data: {
				field: 'locale',
				message: __('LANG_ERR'),
				options: i18n.getLocales(),
			}
		}, null);
	}

	if (typeof req.body.email !== 'undefined') {
		promisesValidation.push(new Promise(function(resolve, reject) {
			if (!utils.validateEmail(req.body.email)) {
				if (req.file) Files.deleteFromFilename(req.file.filename);
				return callback({
					status: 400,
					data: {
						field: 'email',
						message: __('EMAIL_ERR')
					}
				}, null);
			}
			User.findOne({email: req.body.email.toLowerCase(), _id: {$ne: req.params._id}}, function(err, foundUser) {
				if (req.file && (err || foundUser)) Files.deleteFromFilename(req.file.filename);
				if (err) return callback({status: 500, data: __('HTTP_500b', err.message)}, null);
				if (foundUser) {
					return callback({
						status: 400,
						data: {
							field: 'email',
							message: __('EMAIL_TAKEN')
						}
					}, null);
				}
				return resolve();
			});
		}));
	}

	if (typeof req.body.password !== 'undefined') {
		promisesValidation.push(new Promise(function(resolve, reject) {
			if (typeof req.body.password !== 'string' || req.body.password !== req.body.password_r) {
				if (req.file) Files.deleteFromFilename(req.file.filename);
				return callback({
					status: 400,
					data: {
						field: ['password', 'password_r'],
						message: __('PWD_MISSMATCH_ERR')
					}
				}, null);
			}

			if (req.body.password.length < setup.passwordMinLength || req.body.password.length > setup.passwordMaxLength) {
				if (req.file) Files.deleteFromFilename(req.file.filename);
				return callback({
					status: 400,
					data: {
						field: 'password',
						message: __('PWD_ERR', setup.passwordMinLength, setup.passwordMaxLength),
						minLength: setup.passwordMinLength,
						maxLength: setup.passwordMaxLength
					}
				}, null);
			}
			bcrypt.hash(req.body.password, 11, function (err, hash) {
				if (err) {
					if (req.file) Files.deleteFromFilename(req.file.filename);
					return callback({
						status: 500,
						data: {
							field: 'password',
							message: __('HTTP_500b', err.message)
						}
					}, null);
				}
				req.body.password = hash;
				return resolve();
			});

		}));
	}

	if (req.file && req.file.fieldname == 'avatar') {
		promisesValidation.push(new Promise(function(resolve, reject) {
			if (Files.validate(req.file) != 'img') {
				Files.deleteFromFilename(req.file.filename);
				return callback({
					status: 400,
					data: {
						field: 'avatar',
						message: __('HTTP_400')
					}
				}, null);
			}
			else return resolve();
		}));
	}


	//Validados todos los parámetros, los añadimos al modelo
	Promise.all(promisesValidation).then(function(values) {
		User.findOne({_id: req.params._id}, function(err, user) {
			if (req.file && (err || !user)) Files.deleteFromFilename(req.file.filename);
			if (err) return callback({status: 500, data: __('HTTP_500b', err.message)}, null);
			if (!user) return callback({status: 404, data: __('HTTP_404')}, null);

			user.updatedAt = Date.now();
			if (req.body.name) user.name = req.body.name;
			if (req.body.locale) user.locale = req.body.locale;
			if (req.body.password) user.password = req.body.password;
			if (req.body.email) user.email = req.body.email;
			if (typeof req.body.status !== 'undefined') user.status = req.body.status;
			if (req.file && req.file.saved) user[req.file.fieldname] = req.file.saved._id.toString();

			let promisesPreSave = [];

			if (req.file && req.file.fieldname == 'avatar') {
				promisesPreSave.push(new Promise(function(resolve, reject) {
					Files.save(req.file, {tag: 'AVATAR', owner: req.params._id}, function(err, savedFile) {
						if (err || !savedFile) {
							Files.deleteFromFilename(req.file.filename);
							return callback({status: 500, data: __('HTTP_500')}, null);
						}
						if (user.avatar) {
							Files.deleteFromId(user.avatar, function(err) {
								user.avatar = savedFile._id.toString();
								return resolve();
							});
						}
						else {
							user.avatar = savedFile._id.toString();
							return resolve();
						}
					});
				}));
			}

			Promise.all(promisesPreSave).then(function(values) {
				user.save(function(err, saved) {
					if (err || !saved) {
						if (req.file) Files.deleteFromFilename(req.file.filename);
						return callback({
							status: 500,
							data: __('HTTP_500b', err.message)
						}, null);
					}

					callback(null, saved);


					//Envío de email de seguridad
					if (req.body.password) {
						var bodymsg = '<p>Le enviamos este correo desde <a href="'+setup.url+'">'+setup.app.name+'</a> '+
							'porque se ha producido un cambio de contraseña en su cuenta asociada a este correo.</p>'+
							'<p>Si no ha realizado dicho cambio póngase en contacto con la administración a traves de nuestro '+
							'correo electrónico: <a href="mailto:'+setup.adminEmail+'">'+setup.adminEmail+'</a></p>'+
							'<p><strong>Recomendaciones de seguridad:</strong></p>'+
							'<ol>'+
							'<li>Cierre la sesión siempre que conecte desde un lugar público o no seguro.</li>'+
							'<li>Utilice contraseñas de más de 10 caracteres, que tengan al menos una letra '+
							'mayúscula, una letra minúscula y un número.</li>'+
							'<li>No utilice fechas ni nombres como contraseñas. Se pueden averiguar con facilidad.</li>'+
							'<li>Cambie sus contraseñas con regularidad y no utilice la misma contraseña para más de un sitio.</li>'+
							'</ol>';

						app.sendMail(
							setup.app.email,
							user.email,
							'Cambio de contraseña',
							bodymsg+setup.appEmailFooter,
							function(err) {
								if (err) return console.log("[SET PASSWORD] Error enviando el email ("+err.message+")");
								console.log("Email de SETPASS enviado a "+user.email);
							}
						);
					}
				});
			});
		});
	});
}

//Middleware de deshabilitación de usuarios
//Se debe aportar el id del usuario en req.params._id
exports.disable = disable;
function disable(req, res, callback) {
	if (typeof callback != 'function') callback = function() {};

	req.body = {status: 'DISABLED'};

	if (!utils.isObjectId(req.params._id)) {
		return callback({
			status: 400,
			data: {
				param: 'id',
				message: 'ID REQUIRED'
			}
		}, null);
	}
	update(req, res, callback);
	Session.deleteMany({userId: req.params._id}, (err) => {});
};

//Middleware para eliminar usuarios
//Se debe aportar el id del usuario en req.params._id
exports.remove = remove;
function remove(req, res, callback) {
	if (typeof callback !== 'function') callback = function() {};
	if (!utils.isObjectId(req.params._id)) {
		return callback({
			status: 400,
			data: {
				param: 'id',
				message: 'ID REQUIRED'
			}
		}, null);
	}

	User.findOne({_id: req.params._id}, function(err, user) {
		if (err) return callback({status: 500, data: __('HTTP_500b', err.message)}, null);
		if (!user) return callback({status: 404, data: __('HTTP_404')}, null);
		Files.deleteFromOwner(req.params._id);
		Session.deleteMany({userId: req.params._id}, (err) => {});
		user.remove(callback);
	});
}




/**
 * Esta función crea un objeto de usuario a partir del objeto user real.
 * Sirve para ocultar campos, darles formato, etc antes de enviarlos en una
 * respuesta al usuario (por ejemplo en una petición ajax).
 *
 * 'data' puede ser un objeto de mongo, ObjectId de mongo o un array.
 *
 * Users.public(data, req, (err, pubData) => {
 * 	if (err) { return algo ... }
 * 	... haz algo con pubData, como enviarlo a la vista ...
 * });
 */
exports.public = public;
function public(data, req, callback) {

	core.modelizer.public(
		data, req, 'User', '_id',
		function(data, req, next) {
			var item = {
				id: data._id.toString(),
				createdAt: data.createdAt,
				updatedAt: data.updatedAt,
				name: data.name,
				locale: data.locale,
				avatar: null,
				email: '*@*.*',
			};

			//Campos sensibles pueden ser mostrados solo al propio usuario y admins
			if (req && req.user ) {
				if (req.user._id && (req.user._id.toString() == data._id.toString() || req.user.status == 'ADMIN')) {
					item.email = data.email;
				}
			}



			let promises = [];

			//Añade promesas cada vez que necesites acceder a un dato referenciado
			//como por ejemplo los posts del usuario o sus imágenes
			if (data.avatar) {
				promises.push(new Promise(function(resolve, reject) {
					Files.public(data.avatar, req, function(err, pubDoc) {
						if (!err && pubDoc) item.avatar = pubDoc;
						return resolve();
					});
				}));
			}

			Promise.all(promises).then(function(values) { next(null, item); });
		},
		function(err, result) { callback(err, result); }
	);
}





/*********************************
 * VALIDACIONES Y OTRAS HISTORIAS (tienes más validaciones en utils.js)
 *********************************/
function validateName(value) {
	return (value.length >= setup.usernameMinLength && value.length <= setup.usernameMaxLength);
}

function validatePassword(value) {
	return (value.length >= setup.passwordMinLength && value.length <= setup.passwordMaxLength);
}
