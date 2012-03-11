/* WebSQL (v0.1) Paul Sayre */
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
					queries = isArray(sqls) ? sqls : arguments;

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
			}
		};

		return ret;

	};


	// Public object is public
	context[pub.name] = pub;


	// Test if an argument is an array
	var isArray = Array.isArray || function (arg) {
		return !!(arg && arg.constructor === Array);
	};


})(window);

(function (pub) {



	// Deferred results object
	pub.Deferred = function () {
		var curState,
			doneCB = Callbacks(),
			failCB = Callbacks(),
			ret = {

				// Return a unique promise object with limited functionality
				promise: function () {
					var promise = {};
					var returnPromise = function (fn) {
						return function () {
							fn.apply(this, arguments);
							return promise;
						};
					};

					promise.always = returnPromise(ret.always);
					promise.done = returnPromise(ret.done);
					promise.fail = returnPromise(ret.fail);
					promise.then = returnPromise(ret.then);
					promise.state = ret.state;

					return promise;
				},


				// Returns the state of the deferred
				state: function () {
					return curState || 'pending';
				},


				// Complete the deferred successfully
				resolve: function () {
					if(!curState) {
						curState = 'resolved';
						doneCB.fire.apply(doneCB, arguments);
					}
					return ret;
				},


				// Complete the deferred unsuccessfully
				reject: function () {
					if(!curState) {
						curState = 'rejected';
						failCB.fire.apply(failCB, arguments);
					}
					return ret;
				},


				// Add a callback for both states
				always: function (cb) {
					return ret.then(cb, cb);
				},


				// Add callbacks for the successful state
				done: function (cb) {
					doneCB.add(cb);
					return ret;
				},


				// Add callbacks for the unsuccessful state
				fail: function (cb) {
					failCB.add(cb);
					return ret;
				},


				// Wrapper for the done/fail functions
				then: function (succ, err) {
					return ret.done(succ).fail(err);
				}
			};


		return ret;
	};


	// Take a collection of promises and return a new promise when the collection has finished
	pub.when = function (promise1) {
		var i, results = new Array(arguments.length), df = pub.Deferred();

		// Add fail cases, early out
		for(i = 0; i < arguments.length; i++) {
			arguments[i].fail(function () {
				df.reject.apply(this, arguments);
				results = null;
			});
		}

		// Add done cases, collect results
		for(i = 0; i < arguments.length; i++) {
			(function (i) {
				arguments[i].done(function () {
					results[i] = arguments;
					for(var j = 0; j < results.length; j++) {
						if(results[j] === void null) break;
					}
					if(j === results.length) {
						df.resolve.apply(df, results);
					}
				});
			})(i);
		}


		return df.promise();
	};


	// Collection of callbacks which can be triggered once
	var Callbacks = function () {
		var cbs = [],
			args,
			ret = {

				// Has the callbacks been fired
				hasFired: function () {
					return !!args;
				},


				// Add a callback to the collection, fire if already fired
				add: function (cb) {
					cbs.push(cb);
					if(ret.hasFired()) {
						ret.fire.apply(ret, args);
					}
				},


				// Run the callbacks, passing in arguments
				fire: function () {
					args = arguments;
					for(var i = 0; i < cbs.length; i++) {
						cbs[i].apply(ret, args);
					}
					cbs = [];
				}
			};
		return ret;
	};


})(WebSQL);