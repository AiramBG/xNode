/**
 * Created by Airam on 2018-09-17
 * Este módulo inicia el sistema de internacionalización
 * Para utilizarlo, llamar a core.loc.init() al iniciar el servicio.
 * Una vez cargado estarán disponibles las funciones de i18n.
 */

 module.exports = {
	init: function() {
		app.use(function(req, res, next) {
			req.path = req.url = decodeURI(req.path);
			next();
		});
		if (setup.internationalization.enabled) {
			i18n = require("i18n");
			i18n.configure({
				directory: utils.path(appdir, setup.internationalization.path),
				defaultLocale: setup.internationalization.default,
				cookie: setup.internationalization.cookie,
				queryParameter: (setup.internationalization.type == 'query')? setup.internationalization.queryKey : null,
				objectNotation: true,
				preserveLegacyCase: true,
				register: global,
				updateFiles: false,
			});
			i18n.__t = __t = function(key, locale) { return __({phrase: key, locale: locale}); };
			i18n.__r = __r = function(routepath) {
				routepath = routepath.toLowerCase();
				if (setup.internationalization.type == 'query') { return routepath; }
				else if (setup.internationalization.type == 'param') {
					return i18n.getLocales().map(function(locale) {
						return utils.path('/',locale, __('routes.'+routepath));
					});
				}
			}

			app.use(i18n.init);
			app.use(function(req, res, next) {
				let url = req.url.split('?')[0];
				if (setup.internationalization.type == 'query') {
					if (req.query[setup.internationalization.queryKey]) {
						let locale = req.query[setup.internationalization.queryKey];
						if (i18n.getLocales().indexOf(locale) >= 0) req.setLocale(locale);
						else {
							req.query[setup.internationalization.queryKey] = setup.internationalization.default;
							let query = '';
							if (Object.keys(req.query).length > 0) {
								query = '?';
								for (q in req.query) query += q+'='+req.query[q];
							}
							return res.redirect(302, url+query);
						}
					}
			   }
				else if (setup.internationalization.type == 'param') {
					let rxLocale = /^\/(\w+)\/?/i;
					if (rxLocale.test(url)) {
						let locale = rxLocale.exec(url)[1];
						if (i18n.getLocales().indexOf(locale) >= 0) {
							req.setLocale(locale);
							req.canonical = url.replace('/'+locale+'/', '/');
						}
						else {
							let urlLocale = utils.path('/',setup.internationalization.default,url).toLowerCase();
							for(let i=0; i<app.routes.length; i++) {
								let r = app.routes[i];
								if (req.method == r.method && (
										(typeof r.path === 'object' && r.path.indexOf(urlLocale) >= 0)
										|| (typeof r.path === 'string' && r.path == urlLocale)
									)
								) return res.redirect(302, urlLocale);
							}
						}
					}
					else return res.redirect(302, '/'+setup.internationalization.default+'/');
			   }
				app.currentLocale = req.getLocale();
				next();
			});
		}
		else {
			i18n = {
				getCatalog: JSON.parse(fs.readFileSync(utils.path(appdir, setup.internationalization.path, setup.internationalization.default+'.json'), 'utf8')),
				getLocale: function() { return setup.internationalization.default },
			}
			i18n.__ = __ = function() {
				let key = arguments[0]; let params = [];
				for(let i=1; i<arguments.length; i++) params[i-1] = arguments[i];
				return utils.objGet(i18n.getCatalog, key).format(params);
			}
			i18n.__t = __t = __;
			i18n.__r = __r = function(routepath) { return routepath }
			i18n.__l = __l = function(str) { return [] }
			app.use(function(req, res, next) {
				req.canonical = req.url.split('?')[0];
				next();
			});
		}
		return i18n;
	}
 }
