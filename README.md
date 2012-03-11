WebSQL is a simple wrapper for the now deprecated WebSQL Storage API from the W3C (http://www.w3.org/TR/webdatabase/).
This is particularly useful for building large webapps which store and process data locally. I built this abstraction out
of frustration with the API. A common method for quering a database is this:

	var db = openDatabase('mydb', '1.0', 'My Database', 5 * 1024 * 1024);
	db.transaction(function (tx) {
		tx.executeSql('SELECT * FROM products WHERE category_id = ?', [catID], function (tx, res) {

			var products = [];
			for(var i = 0; i < res.rows.length; i++) {
				products[i] = res.rows.item(i);
			}
			// Do something with product
			displayProducts(products);

		}, function (tx, err) {
			throw new Error(err.message);
		});
	});

This coding style is really painful. Moreover, if you have to use the results of one query for another, and one error's out
you are left with a _lot_ of bean counting. I _hate_ bean counting. And, to make matters worse, if you are inserting a
bunch of content you had to repeat the insert string over and over again.

WebSQL, But Better
------------------

Since the transaction API is still useful, you can make a request for a transaction in a similar way:

	var db = WebSQL('mydb');
	db.rawTx(function (tx) {
		tx.executeSql('SELECT * FROM products WHERE category_id = ?', [catID], function (tx, res) {

			var products = [];
			for(var i = 0; i < res.rows.length; i++) {
				products[i] = res.rows.item(i);
			}
			// Do something with product
			displayProducts(products);

		}, function (tx, err) {
			throw new Error(err.message);
		});
	});

There are a few use cases that I care about. The first is executing a bunch of SQL, in order, and getting back results.
This is what the WebSQL.query function is for:

	var db = WebSQL('mydb');
	db.query('SELECT * FROM products WHERE category_id = ?', [catID])
		.fail(function (ex, err) {
			throw new Error(err.message);
		})
		.done(function (products) {
			displayProducts(products);
		});

See how much simplier that is? This abstraction uses the Deferred/Promise system that a lot of non-blocking code is moving
towards on the web.

Second, I want to be able to insert a whole bunch of data, but without having to do separate transactions. Query can take
several SQL statements at once, and will return the last result set. On top of that, it will process each item in an array
data as if it was the last query. Here is all that combined:

	var db = WebSQL('mydb');
	db.query(
		'CREATE TABLE products (id, category_id, name, price)',
		'CREATE INDEX products__category_id ON products (category_id)',
		'INSERT INTO products (id, category_id, name, price) VALUES (?,?,?,?)',
		[
			[1, 5, 'Fancy Hat', '$200'],
			[2, 5, 'Less Fancy Hat', '$100'],
			[3, 5, 'Least Fancy Hat', '$5']
		],
		'SELECT * FROM products WHERE category_id = ?', [catID]
	).fail(function (tx, err) {
		throw new Error(err.message);
	}).done(function (products) {
		displayProducts(products);
	});

Notice how you can insert many rows at once, and how you can return results in the final query.

Lastly, JS is terrible with multiline string. So I've provided a hack that you can use to put multiline SQL into the query
function. It's a hack using Function.prototype.toString() which returns the contents of a function. It's about the same
speed as joining an array of strings together to make a multiline string: slow, but effective.

	var db = WebSQL('mydb');
	db.query(function(){/*!
		SELECT products.*
		FROM products
			INNER JOIN product_categories prod_cats
				ON prod_cats.id = products.category_id
		WHERE prod_cats.id = ?
	*/}, [catID])
		.fail(function (tx, err) {
			throw new Error(err.message);
		}).done(function (products) {
			displayProducts(products);
		});

What will happen is the query function will pull the content of the query from the commented section (from the first "/*!"
to the last "*/". The "!" in the comment is intended to be a marker for minifiers that the comment is to remain intact.
If this is a problem, you may need to just fall back to standard strings.

jQuery Module
-------------

I have added the option to use this as a jQuery module...if you are into that sort of thing. The biggest advantage of
using the jQuery module over the standard release is the use of jQuery's own Deferred object. You can also get access to
the WebSQL object through $.WebSQL()

	var db = $.WebSQL('mydb');
	db.query('SELECT "Wow, jQuery, cool!" AS msg')
		.done(function (rows) {
			alert(rows[0].msg);
		});

Browser Support
---------------

If WebSQL API is supported, so is WebSQL Library. But since this is a deprecated API, future browsers may pull support.
* Safari 3.1+
* Chrome 4.0+
* Opera 10.5 +
* iOS Safari 3.2+
* Opera Mobile 11.0+
* Android 2.1+ (unless pulled by handset maker D: )

jQuery module requires jQuery 1.5+.

Why Support a Deprecated API?
-----------------------------

Even though the API is deprecated it is the only database on most smart phones. As you can see from CanIUse.com stats,
Chrome, Safari, and Opera all support this API (http://caniuse.com/sql-storage). This API will be replaced with IndexedDB
which is a lot friendlier to developers, but is not as well supported (http://caniuse.com/indexeddb) at the moment. The
web community has come out against using LocalStorage for databases, and there is no clear alternitive for Safari and
on mobile.

Change Log
----------

* v0.1: 2012-03-10
** Start project