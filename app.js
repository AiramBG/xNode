/**
 * Created by Airam on 2017-09-14.
 */

//Módulos
mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
moment = require('moment');
fs = require('fs');
utils = require("./app/utils");
util = require('util');
_ = require('lodash');
appdir = __dirname;

//Configuración
setup = require('./app/setup');
setup.port = utils.getPortFromURL(setup.url);

//Express
express = require('express');
app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "DELETE, POST, GET, PUT, PATCH");
	res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
	next();
});

//Renderizador de páginas web
ejs = require('ejs');
ejs.open = '<?';
ejs.close = '?>';
app.set('view engine', 'html');
app.engine('.html', ejs.renderFile);
app.set('views', appdir+'/app/web');
app.use(express.static(appdir+'/app/web/public'));
app.use(setup.file.uploadsPath, express.static(utils.path(appdir, setup.file.uploadsPath)));


//Módulos de ayuda para la web
core = {};
var corefiles = fs.readdirSync('./app/core');
for(let i=0; i<corefiles.length; i++) {
	let c = corefiles[i].substr(0, corefiles[i].lastIndexOf('.'));
	core[c] = require('./app/core/'+c);
}
delete corefiles;

//Internacionalización
i18n = core.loc.init();

//Sendgrid
var sendgrid  = require('sendgrid')(setup.key.sendgrid);
app.sendMail = function(from, to, title, body, callback) {
	var email = new sendgrid.Email();
	email.addTo(to);
	email.setFrom(from);
	email.setSubject(title);
	email.setHtml(body);
	sendgrid.send(email, callback);
};

//Sistema de autentificación de usuarios
Users = require('./app/controller/users');
Auth = require('./app/controller/auth');
Auth.use('login', Users.loginStrategy);
Auth.use('auth', Users.authStrategy);
Files = require('./app/controller/files');
multer = require('multer');
upload = multer({ storage: Files.multerSimpleOptions });

//Rutas
app.all('*', Auth.public, function(req, res, next) { next(); });
require('./app/routes')(Users);

//Iniciamos el servicio
mongoose.connect(setup.mongoDB, {useMongoClient: true}, function(err) {
	if (err) return console.log(__('CONN_DB_ERR', setup.mongoDB));
	console.log(__('CONN_DB_OK'));

	app.routes = _.map(_.filter(app._router.stack, function(item) {
		return (item.route != undefined)
	}), function(route) {
		return {path: route.route.path, method: Object.keys(route.route.methods)[0].toUpperCase()}
	});

	app.listen(setup.port, function(err) {
		if (err) return console.log(__('LPORT_ERR', setup.port));
		console.log(__('LPORT_OK', setup.port));
	});
});
