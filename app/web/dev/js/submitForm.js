/**
 * Created by Airam on 2017-09-19
 *
 * Este archivo escucha los formularios de las vistas web y los convierte
 * en peticiones ajax cuando se lanza un submit
 */
function ___genericAjaxCallbackSuccessFn(data) { console.log('generic success', data); }
function ___genericAjaxCallbackFailFn(data) { console.log('generic fail', data); }

$('form').submit(function(event) {
	event.preventDefault();

	var data = {};
	if (!event.currentTarget || !event.currentTarget.attributes || !event.currentTarget.attributes['action']) {
		return $(event.target).notify('<?- __("API_TARGET_ERR") ?>', {className: 'error', position: "bottom center"});
	}
	var method = (event.currentTarget.attributes['method'])? event.currentTarget.attributes['method'].value : 'POST';

	var baseUri = '<?= setup.url ?>';
	var formUri = baseUri+event.currentTarget.attributes['action'].value;

	var successCB = '___genericAjaxCallbackSuccessFn';
	var failCB = '___genericAjaxCallbackFailFn';

	if (event.currentTarget.attributes['success'])
		successCB = event.currentTarget.attributes['success'].value.split('(')[0];

	if (event.currentTarget.attributes['fail'])
		failCB = event.currentTarget.attributes['fail'].value.split('(')[0];


	var ajaxSend = {
		type: method,
		url: formUri,
		cache: false,
	}
	if (($(this).find('[type="file"]').length)) {
		ajaxSend.data = new FormData(this);
		//for(var pair of ajaxSend.data.entries()) { console.log(pair[0]+ ' = '+ pair[1]); }
		ajaxSend.contentType = false;
		ajaxSend.processData = false;
	}
	else {
		ajaxSend.data = $(this).serialize();
	}

	$.ajax(ajaxSend).done(eval(successCB)).fail(eval(failCB));
});
