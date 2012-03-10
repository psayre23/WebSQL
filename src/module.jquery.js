(function ($, pub) {

	pub.isArray = $.isArray;
	pub.when = $.when;
	pub.Deferred = $.Deferred;
	pub.Callbacks = $.Callbacks();

	$[pub.name] = pub;
})(jQuery, WebSQL);