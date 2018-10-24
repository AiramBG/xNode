/**
 * Created by Airam on 2018-09-17
 * Este módulo genera etiquetas html orientadas a SEO y multi-idioma.
 * Para utilizarlo, llamar a core.html.<function>() en cualquier plantilla.
 */

module.exports = {
	canonical: function(req) {
		var c = '<link rel="canonical" href="'+setup.url+req.canonical+'" />';
		if (setup.internationalization.enabled) {
			i18n.getLocales().forEach(function(locale) {
				if (setup.internationalization.type == 'query')
					c += '<link rel="alternate" hreflang="'+locale+'" href="'+setup.url+req.canonical+'?'+setup.internationalization.queryKey+'='+locale+'">';
				else if (setup.internationalization.type == 'param')
					c += '<link rel="alternate" hreflang="'+locale+'" href="'+utils.path(setup.url, locale, req.canonical)+'">';
			});
			c += '<link rel="alternate" hreflang="x-default" href="'+setup.url+req.canonical+'">';
		}
		return c;
	},
	a: function(label, href, attrs) {
		if (typeof label !== 'string' && typeof label !== 'number') label = '';
		if (typeof href !== 'string' || href.length == 0) href = null;
		if (typeof attrs !== 'object') attrs = {};
		if (setup.internationalization.enabled) {
			if (typeof attrs.hreflang === 'undefined') attrs.hreflang = app.currentLocale;
			if (href !== null) {
				if (setup.internationalization.type == 'query') {
					var hf = (href == '.')? [href] : href.split('?');
					if (hf[0] == '.') hf[0] = '';
					attrs.href = hf[0]+'?'+setup.internationalization.queryKey+'='+attrs.hreflang;
					if (hf.length > 1) attrs.href += href.substr(href.indexOf('?')+1);
				}
				else if (setup.internationalization.type == 'param')
					attrs.href = (href.startsWith('#'))? href : utils.path('/', attrs.hreflang, href);
			}
		}
		else attrs.href = href;
		var t = '<a';
		for (var k in attrs) t += (attrs[k] !== null)? ' '+k+'="'+attrs[k]+'"' : ' '+k;
		return t+'>'+label+'</a>';
	},
	fa: function(icon, attrs) { //font-awesome 4.7
		if (typeof icon !== 'string') return '';
		if (!icon.startsWith('fa-')) icon = 'fa-'+icon;
		if (typeof attrs !== 'object') attrs = {};
		if (!utils.validateBool(attrs['aria-hidden'])) attrs['aria-hidden'] = 'true';
		else attrs['aria-hidden'] = (utils.toBoolean(attrs['aria-hidden']))? 'true' : 'false';
		if (typeof attrs.class !== 'string') attrs.class = 'fa '+icon;
		else attrs.class = 'fa '+icon+' '+attrs.class;
		var t = '<i';
		for (var k in attrs) t += (attrs[k] !== null)? ' '+k+'="'+attrs[k]+'"' : ' '+k;
		return t+'></i>';
	},
	fal: function(icon, attrs) { return this.fa(icon, attrs)+' '; },
	far: function(icon, attrs) { return ' '+this.fa(icon, attrs); }
};
