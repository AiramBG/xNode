/**
 * Created by Airam on 2017-09-15.
 *
 * Este archivo es una caja de herramientas que contiene diferentes funciones de utilidad.
 */


exports.getPortFromURL = function(url) {
	let regex = /^(http|https):\/\/[^:\/]+(?::(\d+))?/;
	let match = url.match(regex);
   if (match === null) return;
	return match[2] ? match[2] : {http: "80", https: "443"}[match[1]];
 }

/**
 * Implementación de un forEach que vuelve sincrónicas las tareas asíncronas de su interior.
 * Lo que hacemos realmente es prescindir de un bucle y hacerlo como llamada recursiva.
 * Solo llegaremos a la siguiente tarea cuando la anterior haya finalizado.
 * @param arr				arr debe ser un array, cursor, etc que tenga valor length.
 * @param callbackForEach(arrItem, index, next)
 * 							arrItem es el item actual de la colección o array.
 * 							index devuelve un entero con el índice de la iteración actual.
 * 							next() se utiliza para finalizar esa iteración.
 * @param callbackAtEnd
 *
 * Signatura vacía:
 * 		utils.forEachSync(arr, function(item, index, next) { }, function(err) { });
 */

exports.forEachSync = function(arr, callbackForEach, callbackAtEnd) {
	var tasksLeft;
	if (typeof arr === 'number') tasksLeft = arr;
	else if (typeof arr === 'object') {
		if (Array.isArray(arr)) tasksLeft = arr.length;
		else tasksLeft = Object.keys(arr).length;
	}
	else tasksLeft = 0;

	if (tasksLeft > 0) forEachLoopSync(arr, tasksLeft);
	else callbackAtEnd("length indefinido o cero");

	function forEachLoopSync(arrEach, turn) {
		var arrItem;
		if (typeof arrEach === 'number') arrItem = null;
		else if (typeof arrEach === 'object') {
			if (Array.isArray(arrEach)) arrItem = arrEach[arrEach.length-tasksLeft];
			else arrItem = arrEach[Object.keys(arr)[Object.keys(arrEach).length-tasksLeft]];
		}
		tasksLeft--;

		var index;
		if (typeof arrEach === 'number') index = arr-tasksLeft-1;
		else if (typeof arrEach === 'object') {
			if (Array.isArray(arrEach)) index = arr.length-tasksLeft-1;
			else index = Object.keys(arr).length-tasksLeft-1;
		}
		if (tasksLeft < 0) callbackAtEnd(false);
		else callbackForEach(arrItem, index, function() { forEachLoopSync(arrEach, tasksLeft); });
	}


};


//Esta función devuelve una respuesta genérica json formada por un success y unos extras.
//si extras es un json lo devuelve tal cual, si es una String devuelve message: string
exports.response = function(res, httpnum, extra) {
	var suc = false;
	if (httpnum >= 200 && httpnum <= 299) suc = true;
	var response = {success: suc};
	switch(typeof extra) {
		case 'undefined': case 'null': break;
		case 'object':
			response = concatObject(response, extra);
			break;
		default: response.message = extra;
	}
	if (setup.debug.httpResponse) console.log("Enviando: "+httpnum);
	res.setHeader('Content-Type', 'application/json');
	res.status(httpnum).send(response);
};

//Renderiza una vista HTML como respuesta a la petición del usuario. Page es un valor formado por un
//layout y un contenido separados por una barra (ej: "panel/index")
//El layout puede ser omitido para cargar únicamente el contenido ---> '/login' o 'login'
exports.render = function(req, res, page, extra) {
	var base = 'pages';
	var div = page.indexOf('/');
	var response = {setup: setup, title: setup.app.name, req: req}
	if (typeof extra == 'object') response = concatObject(response, extra);
	res.setHeader('Content-Type', 'text/html');
	var status = 200;
	if (response.status) {
		console.log(response.status);
		status = response.status;
		res.status(response.status);
		if (status > 299) {
			res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
			res.setHeader('Pragma', 'no-cache');
			res.setHeader('Expires', '0');
		}
	}
	var status = 200;

	if (div == -1) res.render(base+'/'+page, response);
	else if (div > 0) {
		//Sistema de layouts
		base = 'layout/';
		var spl = page.split('/');
		page = spl[0];
		if (spl.length > 1) {
			res.render('pages/'+spl[1], response, function(err, html) {
				if (err) return console.log(err);
				response.body = html;
				res.render(base+page, response);
			});
		}
	}
	else res.render(base+page, response);

}

//Analiza el tipo de respuesta que espera el cliente en la conexión con el servidor.
//Devuelve una string con el resultado para que las rutas puedan adaptar su respuesta a dicho tipo.
exports.responseType = function(req, defaultType) {
	if (req.headers && req.headers.accept) {
		var headers = req.headers.accept.split(',');
		if (headers.indexOf('text/html')) return 'html';
		else if (headers.indexOf('text/plain')) return 'text';
		else if (headers.indexOf('application/json')) return 'json';
		else defaultType;
	}
}


exports.concat = concatObject();
function concatObject() {
	var o = {};
	for (var i=0; i<arguments.length; i++) {
		var arg = arguments[i];
		if (typeof arg !== 'object') continue;
		for (var p in arg) {
			if (arg.hasOwnProperty(p)) o[p] = arg[p];
		}
	}
	return o;
};


//Devuelve la distancia en kilómetros entre dos puntos, dadas sus coordenadas.
exports.distance = function(lat1, lon1, lat2, lon2) {
	rad = function(x) {return x*Math.PI/180;}

	var R     = 6378.137; //Radio de la tierra en km
	var dLat  = rad(lat2 - lat1);
	var dLong = rad(lon2 - lon1);

	var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong/2) * Math.sin(dLong/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = R * c;

	return parseFloat(d.toFixed(3)); //3 decimales para devolver la distancia en km
};


//Devuelve un número aleatorio entre min y max
exports.getRandomInt = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

//Genera una string aleatoria con una longitud dada.
exports.uid = function(len) {
	var buf = []
		, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		, charlen = chars.length;

	for (var i = 0; i < len; ++i) {
		buf.push(chars[Math.floor(Math.random()*((charlen - 1) - 0 + 1))+0]);
	}
	return buf.join('');
};


/**
 * Devuelve una opción de un array dado a partir de una coincidencia de string o un int de índice.
 * Ej: var myVar = utils.getOption(1, ['coche','mesa','silla']);				//Devuelve mesa
 * Ej: var myVar = utils.getOption(5, ['coche','mesa','silla']);				//Devuelve null
 * Ej: var myVar = utils.getOption('undefined', ['coche','mesa','silla']);	//Devuelve undefined
 * Ej: var myVar = utils.getOption('Coche', ['coche','mesa','silla']);		//Devuelve coche
 * Ej: var myVar = utils.getOption('Caballo', ['coche','mesa','silla']);		//Devuelve null
 */
function getOption(value, constantArr) {
	if (typeof value !== 'undefined') {
		if (typeof value === 'string') return (constantArr.indexOf(value.toLowerCase()) >= 0) ? value.toLowerCase() : null;
		if (typeof value === 'number') return (value >= 0 && value < constantArr.length) ? constantArr[value] : null;
	}
	else if (value == 'undefined') return undefined;
	return null;
}

function validateFromArray(value, constantArr) {
	if (typeof value === 'string') return (constantArr.indexOf(value.toLowerCase()) >= 0);
	if (typeof value === 'number') return (value >= 0 && value < constantArr.length);
}
//Ejemplo de validateFromArray
// const GENDERS = ['male', 'female'];
// exports.genders = GENDERS;

//Validación del correo electrónico.
exports.validateEmail = function(value) {
	return /[\w._-]*[\w._-]+@[\w._-]+.\w+/gi.test(value);
};


//Validación para una url.
exports.validateUrl = function(value, type) {
	if (typeof value === 'undefined') return false;
	if (typeof type === 'undefined') type = false;
	if (type == 'facebook') return /^(http\:\/\/|https\:\/\/)?(?:www\.)?(facebook\.com|fb\.me)\/(?:(?:\w\.)*#!\/)?(?:pages\/)?(?:[\w\-\.]*\/)*([\w\-\.]*)/gi.test(value);
	else if (type == 'twitter') return /^(http\:\/\/|https\:\/\/)?(?:www\.)?twitter\.com\/(?:(?:\w\.)*)/gi.test(value);
	else if (type == 'instagram') return /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am)\/([A-Za-z0-9-_]+)/igm.test(value);
	else if (type == 'gplus') return /^((http|https):\/\/)?(www\.|plus\.)?google.com\/[A-Za-z0-9-_]+/igm.test(value);
	else return /^(http:\/\/|https:\/\/)(www.)?([\w]+).([\w]*.)*[\w]+((\/)?[\w]*)*/gi.test(value);
};

exports.format = function() {
	var args = arguments,
		str = args[0],
		i = 1;
	return str.replace(/%((%)|s|d)/g, function (m) {
		var val = null;
		if (m[2]) val = m[2];
		else {
			val = args[i];
			switch (m) { //de momento solo soporte para %s y %d
				case '%d':
					val = parseFloat(val);
					if (isNaN(val)) val = 0;
					break;
			}
			i++;
		}
		return val;
	});
};

exports.validateString = function(value, canBeEmpty) {
	if (typeof canBeEmpty !== 'boolean') canBeEmpty = false;
	if (typeof value !== 'string') return false;
	return ((!canBeEmpty && value.trim().length > 0) || canBeEmpty);
};
CAN_BE_EMPTY = true;

exports.validateBool = function(value) {
	var accepted = [true, false, '0', '1', 'true', 'false'];
	return (accepted.indexOf(value) >= 0);
};

//Convierte una string 'true' o 'false' en su homónimo booleano. También para 0 y 1.
//Soporta multi-idioma 'yes', 'sí', etc.
exports.toBoolean = function(value) {
	if (typeof value === 'undefined') return false;
	var yes = [true, '1', 'true'];
	return (yes.indexOf(value) >= 0);
};

exports.validateNumber = function(value) { return isNaN(toNumber(value)) }
exports.toNumber = function(value) {
	if (typeof value === 'string') return value.toNumber();
	else if (typeof value === 'number') return value;
	return Number.NaN;
};

//Valida que las coordenadas de localización son reales.
exports.validateCoords = function(lat, long) {
	if (typeof lat === 'undefined' && typeof long === 'undefined') return false;
	try { var x = parseFloat(lat); var y = parseFloat(long); } catch(e) { return false; }
	return (x >= -90 && x <= 90 && y >= -90 && y <= 90);
};

exports.validateLocale = function(lng) {
	return (i18n.getLocales().indexOf(lng) >= 0);
}



Array.prototype.toLowerCase = function() {
	for (var i=0; i<this.length; i++) {
		if (typeof this[i] === 'string') this[i] = this[i].toLowerCase();
	}
	return this;
};
Array.prototype.toUpperCase = function() {
	for (var i=0; i<this.length; i++) {
		if (typeof this[i] === 'string') this[i] = this[i].toUpperCase();
	}
	return this;
};
Array.prototype.trim = function() {
	for (var i=0; i<this.length; i++) {
		if (typeof this[i] === 'string') this[i] = this[i].trim();
	}
	return this;
};
Number.prototype.formatMoney = function(c, d, t) {
	var n = this,
		c = isNaN(c = Math.abs(c)) ? 2 : c,
		d = (d == undefined) ? "," : d,
		t = (t == undefined) ? "." : t,
		s = (n < 0) ? "-" : "",
		i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
		j = (j = i.length) > 3 ? j % 3 : 0;
	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};
String.prototype.toNumber = function() {
	var s = this;
	var n = null;
	if (s.indexOf(',') > s.indexOf('.')) n = s.replace('.','').replace(',','.');
	else if (s.indexOf(',') <= s.indexOf('.')) n = s.replace(',','');
	var n = s.replace('.','').replace(',','.');
	try { return (n.indexOf(".") >= 0)? parseFloat(n) : parseInt(n); }
	catch(e) { return Number.NaN }
};
String.prototype.format = function() {
	var args = arguments, str = this, i = 0;
	return str.replace(/%((%)|s|d)/g, function(m) {
		var val = args[i];
		switch (m) { //de momento solo soporte para %s y %d
			case '%d':
				val = parseFloat(val);
				if (isNaN(val)) val = 0;
				break;
		}
		i++;
		return val;
	});
}

/**
 * Cambia un valor de un objeto a partir de una string:
 *
 * Dado el objeto:
 * var obj = {
 *   level1: {
 *     level2: {
 *       level3: { a: 'uno', b: 'otro' }
 *	   }
 *	 }
 * }
 * Podemos cambiar el valor de b con:
 * 	  objSet(obj, 'level1.level2.level3.b', 'nuevo valor');
 *
 * 	Si la ruta especificada no existe será creada.
 */
exports.objSet = function(obj, path, value) {
	var _path = path.split('.');
	var deep = 0;
	return (step(obj) !== false);

	function step(tmp) {
		if (deep == _path.length-1) {
			tmp[_path[deep]] = value;
			return tmp;
		}
		else {
			if (typeof tmp[_path[deep]] === 'undefined') tmp[_path[deep]] = {};
			deep++;
			tmp[_path[deep-1]] = step(tmp[_path[deep-1]]);
			return tmp;
		}
	}
};

/**
 * Devuelve el valor de un objeto o subobjeto.
 * EJ:
 * var obj = {
 *   level1: {
 *     level2: {
 *     	level3: { a: 'hello', b: 'bye' }
 *     }
 *   }
 * }
 *
 * var test = objGet(obj, 'level1.level2.level3.b'); //devuelve 'bye'
 */
exports.objGet = function(obj, path) {
	var _path = path.split('.');
	return step(obj, 0);

	function step(tmp, deep) {
		if (deep == _path.length-1) {
			var value = tmp[_path[deep]];
			return value;
		}
		else {
			var value = step(tmp[_path[deep]], deep+1);
			return value;
		}
	}
};

/**
 * Valida si una string u objeto tiene un formato válido para ser id de mongoDB
 */
exports.isObjectId = function(id) {
	return (
		(typeof id === 'object' && require('mongoose').Types.ObjectId.isValid(id))
		|| (typeof id === 'string' && id.length == 24)
	);
};


//Crea una ruta a partir de strings
exports.path = function() {
	let args = Object.keys(arguments).map((key) => arguments[key]);
	return args.join('/').replace(/\/\//g, '/');
}
