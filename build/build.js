var fs = require('fs'),
	path = require('path');

var root = path.dirname(__dirname);

var core = fs.readFileSync(root+'/src/core.js');
var none = fs.readFileSync(root+'/src/module.none.js');
var jq = fs.readFileSync(root+'/src/module.jquery.js');


fs.writeFileSync(root+'/WebSQL.js', core+none);
fs.writeFileSync(root+'/jquery.websql.js', core+jq);

console.log('Build Successful');