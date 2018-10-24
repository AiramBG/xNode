/**
 * Created by Airam on 2017-10-02
 */

exports.home = function(req, res) {
	utils.render(req, res, 'home', {title: setup.app.name})
}

exports.dashboard = function(req, res) {
	var sendToView = {
		sectionId: 'dashboard',
		title: __('DASHBOARD'),
		menu: [],
		savedReports: [],
		users: [],
		user: null
	}

	let promises = [];

	promises.push(new Promise(function(resolve, reject) {
		getMenuSections(function(menu) {
			sendToView.menu = menu;
			return resolve();
		});
	}));

	promises.push(new Promise(function(resolve, reject) {
		sendToView.savedReports = [
			{name: 'Current month', href: '#'},
			{name: 'Another month', href: '#'},
			{name: 'Last year', href: '#'},
		];
		return resolve();
	}));

	promises.push(new Promise(function(resolve, reject) {
		let User = require('../model/user');
		User.find(function(err, objs) {
			if (objs) sendToView.users = objs;
			return resolve();
		});
	}));

	promises.push(new Promise(function(resolve, reject) {
		Users.public(req.user, req, function(err, pubData) {
			if (!err && pubData) sendToView.user = pubData;
			return resolve();
		});
	}));

	Promise.all(promises).then(function(values) {
		utils.render(req, res, 'panel/dashboard', sendToView);
	});
}


exports.getMenuSections = getMenuSections;
function getMenuSections(callback) {
	callback([
		{name: __('DASHBOARD'), id: 'dashboard', href: __('routes./dashboard'), icon: 'home' },
		{name: 'Orders', id: 'orders', href: '#', icon: 'file-o' },
		{name: 'Products', id: 'products', href: '#', icon: 'shopping-cart' },
		{name: 'Customers', id: 'customers', href: '#', icon: 'users' },
		{name: 'Reports', id: 'reports', href: '#', icon: 'bar-chart' }
	]);
}
