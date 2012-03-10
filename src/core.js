(function (context) {



	// Public object
	var pub = function WebSQL(name, ver, desc, size, cb) {

		// Open database
		var
		db = context.openDatabase && context.openDatabase(name, ver || '1.0', desc || name, size || 5e6, cb),

		// Returned object
		ret = db && {
			// Query the database in a transaction
			query: function (sqls) {

				// Query deferred
				var df = pub.Deferred(),
					queries = pub.isArray(sqls) ? sqls : arguments;

				// Create transaction for all queries
				ret.rawTx(function (tx) {
					var dfSql = pub.Deferred(),
						sql, args,
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

						// If query has args
						if(pub.isArray(args)) {
							i += 1;

							// If args is actually array of args
							if(pub.isArray(args[0])) {
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
							tx.executeSql(sql, args, succ, error);
						}
					}

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
							else if(res.insertId) {
								ret = res.insertId;
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
			}
		};

		return ret;

	};


	// Public object is public
	context[pub.name] = pub;


})(this);

