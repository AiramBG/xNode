/**
 * Created by Airam on 2017-09-15.
 * Este archivo guarda las variables de configuración del servidor
 */

module.exports = {
	url: 'http://localhost:5555',
	mongoDB: 'mongodb://localhost:27017/my-app',
	adminEmail: 'info@test.es',

	app: {
		name: 'My App',
		codeName: 'my-app', //sin acentos, espacios o mayúsculas. solo letras a-z, números y guión medio -
		email: 'info@my-app.com'
	},


	internationalization: {
		path: '/app/locales',
		default: 'es',		//elegir uno de la carpeta app/locales
		enabled: true,

		type: 'param', //'param': /en/users , /es/usuarios  'query': /users?hl=en , /users?hl=es
		queryKey: 'hl',
		cookie: null,
	},


	format: {
		dateTime: 'DD-MM-YYYY HH:mm:ss',
		date: 'DD-MM-YYYY',
		time: 'HH:mm:ss'
	},

	auth: {
		validation: {
			field: 'email',
			toLowerCase: true
		},
		route: {
			login: '/login',
			logged: '/dashboard',
			logout: '/login'
		},
		expirationTime: { //en segundos
			cookie: 3600*24*7,
			session: 300
		},
		tokenLength: 64,
		autocreateUsers: true, //atención!! true solo para desarrollo de la app
		blackListStatus: ['DISABLED'], //lista de estados de usuario que no permitirán iniciar sesión.
	},

	file: {
		defaultAvatar: 'unknown.jpg',
		uploadsPath: '/uploads',
	},

	key: { //inserta las API Keys aquí
		sendgrid: '',
	},

	usernameMinLength: 1,
	usernameMaxLength: 10,
	passwordMinLength: 3,
	passwordMaxLength: 128,

	appEmailFooter: `<br/><p style="font-size: 80%;">
	Copyright `+(new Date()).getFullYear()+` © Todos los derechos reservados.
	Por favor, no responda a este correo; ha sido generado automáticamente por nuestro sistema.
	</p>`,

	debug: {
		httpResponse: true,
		auth: false,
		user: {
			login: false,
			create: false,
			update: false,
			delete: false,
		},
	}
};
