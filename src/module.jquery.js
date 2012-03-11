(function ($, pub) {
	pub.when = $.when;
	pub.Deferred = $.Deferred;
	$[pub.name] = pub;
})(jQuery, WebSQL);