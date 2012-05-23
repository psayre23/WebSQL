/* WebSQL (v0.2) Paul Sayre */
(function (context) {
	var VERSION = '0.2';

	// Public object
	var pub = context.WebSQL = function (name, ver, desc, size, cb) {

		// Open database
		var
		db = context.openDatabase && context.openDatabase(name, ver || '1.0', desc || name, size || 5e6, cb),

		// Returned object
		ret = db && {
			// Query the database in a transaction
			query: function (sqls) {

				// Query deferred
				var df = pub.Deferred(),
					queries = isArray(sqls) ? sqls : arguments;

				// Create transaction for all queries
				ret.rawTx(function (tx) {
					var dfSql = pub.Deferred(),
						sql, args, parts,
						i, iLen, j, jLen,
						succ, error = dfSql.reject;

					// Loop through queries
					for(i = 0, iLen = queries.length; i < iLen; i++) {
						sql = queries[i];
						args = queries[i+1];

						// Convert function into SQL
						if(typeof sql === 'function') {
							sql = sql.toString();
							sql = sql.substr(sql.indexOf('/*!')+3);
							sql = sql.substr(0, sql.lastIndexOf('*/'));
						}

						// Add ? for fields in insert
						parts = /^\s*(?:INSERT|REPLACE)\s+INTO\s+\w+\s*\(([^\)]+)\)\s*$/i.exec(sql);
						if(parts && parts[1]) {
							sql += ' VALUES ('+(new Array(parts[1].split(',').length)).join('?,')+'?)';
						}

						// If query has args
						if(isArray(args)) {
							i += 1;

							// If args is actually array of args
							if(isArray(args[0])) {
								for(j = 0, jLen = args.length; j < jLen; j++) {
									if(i + 1 === iLen && j + 1 === jLen) {
										succ = dfSql.resolve;
									}
									tx.executeSql(sql, args[j], succ, error);
								}
							}

							// Run query with args
							else {
								if(i + 1 === iLen) {
									succ = dfSql.resolve;
								}
								tx.executeSql(sql, args, succ, error);
							}
						}

						// Just run the query
						else {
							if(i + 1 === iLen) {
								succ = dfSql.resolve;
							}
							tx.executeSql(sql, [], succ, error);
						}
					}

					// Resolve the last set of results
					dfSql.fail(df.reject).done(function (tx, res) {
						var ret = null, i, rows;
						if(res) {
							rows = res.rows;
							if(rows) {
								ret = [];
								for(i = 0; i < rows.length; i++) {
									ret[i] = rows.item(i);
								}
							}
							if(ret && ret.length === 0) {
								try {
									ret.insertId = res.insertId;
								} catch(e) {
									ret.insertId = null;
								}
							}
							else {
								ret.insertId = null;
							}
						}
						df.resolve(ret);
					});
				});

				// Return a promise for queries
				return df.promise();
			},


			// Runs a transaction manually on database
			rawTx: function (fn) {
				db.transaction(fn);
			},


			// Returns the names of the tables in the database
			getTableNames: function () {
				var df = $.Deferred();

				ret.query('SELECT tbl_name FROM sqlite_master WHERE type = "table" AND tbl_name NOT REGEXP "^(__|sqlite_).*"')
					.fail(df.reject)
					.done(function (tables) {
						var i, names = [];
						for(i = 0; i < tables.length; i++) {
							names[i] = tables[i].tbl_name;
						}
						df.resolve(names);
					});

				return df.promise();
			},


			// Dump the database in various formats
			dump: function (type, getData) {
				var dfDump = pub.Deferred();

				getData = getData !== false; // Defaults to true

				switch(type) {
					case 'json':
					default:

						ret.query('SELECT * FROM sqlite_master WHERE tbl_name NOT REGEXP "^(__|sqlite_).*" ORDER BY CASE type WHEN "table" THEN 1 WHEN "index" THEN 2 ELSE 3 END')
							.fail(dfDump.reject)
							.done(function (rows) {
								var tables = {}, dfs = [], row, i;

								for(i = 0; row = rows[i]; i++) {
									if(!row.sql) continue;
									switch(row.type) {

										// Create table sql
										case 'table':
											tables[row.tbl_name] = {
												schema: {
													table: row.sql,
													indexes: []
												}
											};

											// Pull data from table
											if(getData) {
												(function (name) {
													var df = pub.Deferred();
													ret.query('SELECT * FROM '+name)
														.fail(df.reject)
														.done(function (data) {
															delete data.insertId;
															tables[name].data = data;
															df.resolve();
														});
													dfs.push(df);
												})(row.tbl_name);
											}
											break;

										// Create index sql
										case 'index':
											tables[row.tbl_name].schema.indexes.push(row.sql);
											break;
									}
								}

								// Wait for all data queries to come back before
								pub.when.apply(pub, dfs)
									.fail(dfDump.reject)
									.done(function () {
										dfDump.resolve(tables);
									});
							});
						break;

					case 'sql':
						ret.dump('json', getData)
							.fail(dfDump.reject)
							.done(function (json) {
								var sqls = [], table, row, i, field, fields, data, val;

								for(var name in json) {
									if(!hasOwn(name, json)) continue;
									table = json[name];
									sqls.push(table.schema.table);
									sqls = sqls.concat(table.schema.indexes);
									if(table.data && table.data.length > 0) {

										// Get table fields
										fields = [];
										row = table.data[0];
										for(field in row) {
											if(!hasOwn(field, row)) continue;
											fields.push(/\s/.test(field) ? '`'+field+'`' : field);
										}
										fields = fields.join(', ');

										// Get data values
										data = [];
										for(i = 0; row = table.data[i]; i++) {
											data[i] = [];
											for(field in row) {
												if(!hasOwn(field, row)) continue;
												if(typeof row[field] === 'number') {
													val = row[field];
												}
												else if(row[field] === null || row[field] === void null) {
													val = 'NULL';
												}
												else {
													val = '"'+row[field]+'"';
												}
												data[i].push(val);
											}
											data[i] = '('+data[i].join(', ')+')';
										}

										// Add query
										data = data.join(',\n\t');
										sqls.push('INSERT INTO '+name+' ('+fields+') VALUES\n\t'+data);
									}
								}

								sqls = sqls.join(';\n')+';';
								dfDump.resolve(sqls);
							});
				}

				return dfDump.promise();
			}
		};

		return ret;

	};

	pub.VERSION = VERSION;


	// Test if an argument is an array
	var isArray = Array.isArray || function (arg) {
		return !!(arg && arg.constructor === Array);
	};


	var hasOwn = function (key, obj) {
		return Object.prototype.hasOwnProperty.call(obj, key);
	};


})(this);

(function ($, pub) {
	pub.when = $.when;
	pub.Deferred = $.Deferred;
	$.WebSQL = pub;
})(jQuery, WebSQL);