var fs = require('fs'),
	path = require('path'),
	http = require('http'),
	querystring = require('querystring');

var root = path.dirname(__dirname);


var code;
var intro = fs.readFileSync(root+'/src/intro.js');
var core = fs.readFileSync(root+'/src/core.js');
var none = fs.readFileSync(root+'/src/module.none.js');
var jq = fs.readFileSync(root+'/src/module.jquery.js');


code = intro+core+none;
fs.writeFileSync(root+'/WebSQL.js', code);
closureCompiler(code, function (comp) {
	fs.writeFileSync(root+'/WebSQL.min.js', intro+comp);
});


code = intro+core+jq;
fs.writeFileSync(root+'/jquery.websql.js', code);
closureCompiler(code, function (comp) {
	fs.writeFileSync(root+'/jquery.websql.min.js', intro+comp);
});


function closureCompiler(code, fn) {
	// Build the post string from an object
	var post = querystring.stringify({
		'compilation_level': 'SIMPLE_OPTIMIZATIONS',
		'output_format': 'text',
		'output_info': 'compiled_code',
		'warning_level': 'QUIET',
		'js_code': code
	});

	// An object of options to indicate where to post to
	var opts = {
		host: 'closure-compiler.appspot.com',
		port: '80',
		path: '/compile',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': post.length
		}
	};

	// Set up the request
	var req = http.request(opts, function(res) {
		var chunks = [];
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			chunks.push(chunk);
		});
		res.on('end', function () {
			fn(chunks.join(''));
		});
	});

	// post the data
	req.write(post);
	req.end();
}