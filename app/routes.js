/**
 * Created by Airam on 2017-09-15.
 *
 * Archivo de rutas HTTP.
 */

var Webs = require('./controller/webs');


module.exports = function() {

	//Para registrar el primer usuario ir a setup.js y cambiar autocreateUsers a true (SOLO DESARROLLO!!!)

	//VISTAS HTML
	app.get(__r('/'), Webs.home);

	app.get(__r('/login'), Users.login);
	app.get(__r('/logout'), Auth.close, Users.logout);
	app.get(__r('/forgot'), Users.forgotView);

	app.get(__r('/dashboard'), Auth.required, Webs.dashboard);

	app.get(__r('/profile'), Auth.required, Users.getMyAccount);
	app.get(__r('/profile/disable'), Auth.required, Users.disableMyAccount, Auth.close, Users.logout);
	app.get(__r('/profile/delete'), Auth.required, Users.deleteMyAccount, Auth.close, Users.logout);
	app.get(__r('/user/:_id'), Auth.required, Users.getAnotherAccount);




	//IMPLEMENTACIÓN API (recibe parámetros y responde con json)
	app.post('/api/login', Auth.login);
	app.post('/api/logout', Auth.close, Users.logout);
	app.post('/api/forgot', Users.forgotApi);
	app.put('/api/profile', upload.single('avatar'), Users.editMyAccount);
	app.put('/api/profile/password', Users.editMyAccount);
	app.get('/api/user/:_id', Users.testApiGetAccount);
};
