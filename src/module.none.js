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
		if(arguments.length > 0) {
			for(i = 0; i < arguments.length; i++) {
				(function (i, arg) {
					arg.done(function () {
						results[i] = arguments;
						for(var j = 0; j < results.length; j++) {
							if(results[j] === void null) break;
						}
						if(j === results.length) {
							df.resolve.apply(df, results);
						}
					});
				})(i, arguments[i]);
			}
		}
		else {
			df.resolve.apply(df, results);
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