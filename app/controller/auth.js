/**
 * Created by Airam on 2017-10-02
 */

var Session = require('../model/session');

var _loginStrategy = function(req, res, callback) {
	var str = "[Auth] Estrategia 'login' no declarada.";
	console.log(str);
	callback({status: 500, data: str}, null);
};

var _authStrategy = function(req, res, callback) {
	var str = "[Auth] Estrategia 'auth' no declarada.";
	console.log(str);
	callback({status: 500, data: str}, null);
}

module.exports = {

	/***
	 * Para que el sistema Auth sea agnóstico a cualquier modelo de usuarios, es necesario aportar dos estrategias
	 * que Auth pueda reconocer. Estas estrategias son funciones que reciban los parámetros req, res y un callback
	 * que esperará dos parámetros: error y user.
	 *
	 *   function(req, res, callback) {
	 *     callback(error, user);
	 *   }
	 *
	 * La variable error del callback debe ser un objeto con los siguientes parámetros:
	 *     status: (número de respuesta http)
	 *     data: (string con el mensaje de error o un objeto que será devuelto como json al usuario)
	 *
	 * Las dos funciones que necesita Auth son una estrategia de login y una estrategia de identificación que funciona
	 * como middleware en las rutas.
	 *
	 * Ejemplo de función de estrategia para el login:
	 *    function(req, res, cb) {
	 *
	 *       //... lógica aquí ...
	 *
	 *       //ejemplo de error
	 *       error = {status: 401, data: 'Contraseña incorrecta'};
	 *       user = null;
	 *
	 *       //ejemplo de idenficación con éxito
	 *       error = null;
	 *       user = {... datos del usuario ...};
	 *
	 *       //Devolución callback
	 *       return cb(error, user)
	 *    }
	 *
	 * Esta función puede ser exportada desde otro módulo o escrita en una variable y finalmente integrada en Auth
	 * usando la función .use()
	 *
	 * //ejemplo en app.js
	 * Users = require('./app/controller/users'); //cargamos el módulo de usuarios
	 * Auth = require('./app/controller/auth'); //cargamos el módulo auth
	 * Auth.use('login', Users.loginStrategy); //añadimos la estrategia de login
	 * Auth.use('auth', Users.authStrategy); //añadimos la estrategia de identificación
	 *
	 */

	use: function(strategyType, fnLoginUserStrategy) {
		if (typeof fnLoginUserStrategy === 'function') {
			if (strategyType == 'login') _loginStrategy = fnLoginUserStrategy;
			else if (strategyType == 'auth') _authStrategy = fnLoginUserStrategy;
		}
	},

	login: function (req, res, callback) {
		_loginStrategy(req, res, function(err, user) {
			if (err || !user) return utils.response(res, err.status, err.data);
			req.user = user;
			createSession(req, res, function(err, session) {
				if (err) return utils.response(res, 500, __('HTTP_500b'));
				return utils.response(res, 200, {redirect: __('routes.'+setup.auth.route.logged)});
			});

		});
	},


	/***
	 * Middlewares para autentificar al usuario a través de sesiones/cookies
	 *
	 * El uso de los middlewares de autentificación puede hacerse de dos formas:
	 *
	 *   1) Crear una ruta .all() que llame al middleware 'Auth.public' y luego añadir a cada ruta privada
	 *      el middleware 'Auth.required'
	 *          app.all('*', Auth.public);
	 *          app.get('/profile', Auth.required, Users.getMyAccount);
	 *
	 *   2) En cada ruta añadir el middleware 'Auth.public' o 'Auth.restricted',
	 *	    según se necesite autentificación o no.
	 */

	//Devuelve al usuario un error si la autentificación falla (se usa en las rutas)
	restricted: function(req, res, next) {
		if (!req || !res) return console.log('Auth.restricted needs req, res');
		req.user = null;
		req.session = null;

		if (!req.cookies || !req.cookies.SESSID) {
			if (setup.debug.auth) console.log('[Auth.restricted] !req.cookies or !req.cookies.SESSID');
			return authPageErr(req, res);
		}

		var session = req.cookies['SESSID'].split('!');
		if (session.length < 2) {
			if (setup.debug.auth) console.log('[Auth.restricted] session.length < 2');
			return authPageErr(req, res);
		}

		Session.findOne({_id: session[0], userId: session[1]}, function(err, session) {
			if (err) {
				if (setup.debug.auth) console.log('[Auth.restricted] Session.findOne err', err);
				return authPageErr(req, res);
			}
			if (!session) {
				if (setup.debug.auth) console.log('[Auth.restricted] Session.findOne null');
				return authPageErr(req, res);
			}
			if (new Date() > session.expiresAt) {
				if (setup.debug.auth) console.log('[Auth.restricted] session expired', err);
				res.clearCookie('SESSID');
				session.remove(function (err, deletedSession) {})
				return authPageErr(req, res);
			}
			req.session = session;


			_authStrategy(req, res, function(err, user) {
				if (err) {
					if (setup.debug.auth) console.log('[Auth.restricted] ERR:', err);
					return authPageErr(req, res);
				}
				if (!user) {
					if (setup.debug.auth) console.log('[Auth.restricted] USER NULL', err);
					return authPageErr(req, res);
				}

				req.user = user;

				if (session.type == 'session') {
					updateSession(res, session, function(err, updatedSession) {
						if (err) return utils.response(res, 500, __('HTTP_500b'));
						req.session = updatedSession;
						next();
					});
				}
				else next();
			});
		});
	},

	//Permite pasar aunque la autentificación falle pero si no falla guarda
	//la información del usuario (se usa en rutas)
	public: function(req, res, next) {
		if (!req || !res) return console.log('Auth.public needs req, res');
		req.user = null;
		req.session = null;

		if (!req.cookies || !req.cookies.SESSID) {
			if (setup.debug.auth) console.log('[Auth.public] !req.cookies or !req.cookies.SESSID');
			return next();
		}

		var session = req.cookies['SESSID'].split('!');
		if (session.length < 2) {
			if (setup.debug.auth) console.log('[Auth.public] session.length < 2');
			return next();
		}

		Session.findOne({_id: session[0], userId: session[1]}, function(err, session) {
			if (err) {
				if (setup.debug.auth) console.log('[Auth.public] Session.findOne err', err);
				return next(err);
			}
			if (!session) {
				if (setup.debug.auth) console.log('[Auth.public] Session.findOne null');
				return next();
			}
			if (new Date() > session.expiresAt) {
				if (setup.debug.auth) console.log('[Auth.public] session expired');
				res.clearCookie('SESSID');
				session.remove(function (err, deletedSession) {})
				return next();
			}
			req.session = session;



			_authStrategy(req, res, function(err, user) {
				if (err) {
					if (setup.debug.auth) console.log('[Auth.public] ERR:', err);
					return next();
				}
				if (!user) {
					if (setup.debug.auth) console.log('[Auth.public] USER NULL', err);
					return next();
				}

				req.user = user;

				if (session.type == 'session') {
					updateSession(res, session, function(err, updatedSession) {
						if (err) return utils.response(res, 500, __('HTTP_500b'));
						req.session = updatedSession;
						next();
					});
				}
				else next();
			});
		});
	},

	//Se puede usar junto con public para enviar al usuario un error si public
	//no autentifica con éxito.
	required: function(req, res, next) {
		var authed = (typeof req.user !== 'undefined' && req.user !== null && typeof req.user._id !== 'undefined');
		if (authed) return next();
		if (setup.debug.auth) console.log('[Auth.required] user null');
		authPageErr(req, res);
	},


	/***
	 * Destruir la sesión actual se puede hacer de dos formas, a través de
	 * middleware (Auth.close) o endpoint (Auth.logout)
	 * El middleware elimina la sesión y llama al siguiente middleware/endpoint de la ruta.
	 * El endpoint envía una respuesta al usuario que puede ser un json o html, según proceda.
	 */

	//Middleware para destruir la sesión actual
	close: function(req, res, next) {
		if (typeof req.session === 'object' && req.session) {
			res.clearCookie('SESSID');
			if (typeof req.session.remove === 'function') req.session.remove();
			req.user = null;
			req.session = null;
		}
		next();
	},
}

function createSession(req, res, callback) {
	if (!req || !res) return console.log('createSession needs req, res');
	if (typeof callback !== 'function') callback = function() {};

	var agent = null;
	var browsers = ['Seamonkey/', 'Firefox/', 'Edge/', 'Chromium/', 'Chrome/', 'Safari/', 'OPR/', 'Opera/', '; MSIE '];
	for (var i=0; i<browsers.length; i++) {
		var offset = req.headers['user-agent'].indexOf(browsers[i]);
		if (offset >= 0) {
			agent = req.headers['user-agent'].substring(offset, req.headers['user-agent'].indexOf(' ', offset)).trim();
			if (browsers[i] == 'OPR/') agent = agent.replace('OPR', 'Opera');
			else if (browsers[i] == '; MSIE ') agent = agent.replace(browsers[i], 'MSIE/');
			break;
		}
	}

	var expTime = setup.auth.expirationTime.session;
	var type = 'session';
	if (typeof req.body.remember !== 'undefined' && req.body.remember) {
		expTime = setup.auth.expirationTime.cookie;
		type = 'cookie';
	}

	var session = new Session({
		userId: 	req.user._id.toString(),
		expiresAt:	new Date(new Date().getTime() + (expTime *1000)),
		client:		agent,
		type:		type,
	});

	session.save(function (err, savedSession) {
		if (err) return callback(err, null);
		res.cookie('SESSID', savedSession._id.toString()+'!'+req.user._id.toString(), {maxAge: expTime *1000});
		return callback(err, savedSession);
	});

}

function updateSession(res, session, callback) {
	if (typeof callback !== 'function') callback = null;
	if (typeof session === 'undefined' || !session || typeof session.type  === 'undefined' || session.type != 'session')
		return callback(false, session);

	session.expiresAt = new Date(new Date().getTime() + (setup.auth.expirationTime.session *1000));
	session.save(function(err, uSess) {
		if (err) return callback(err, session);
		res.cookie('SESSID', uSess._id.toString()+'!'+uSess.userId, {maxAge: uSess.expiresAt *1000});
		return callback(err, uSess);
	});

}

function authPageErr(req, res) {
	var type = utils.responseType(req);
	if (type == 'json') return utils.response(res, 401, __('HTTP_401'));
	else return utils.render(req, res, 'redirector', {
			status: 401,
			icon: '<i class="fa fa-ban fa-5x text-danger" aria-hidden="true"></i>',
			background_style: '',
			message: __('HTTP_401'),
			buttonText: __('LOGIN'),
			buttonCss: 'btn-outline-danger',
			href: __('routes.'+setup.auth.route.login),
		});

}
