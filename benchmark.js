'use strict';


// ------------------------------------------------------
// Helper and utility functions
// ------------------------------------------------------
function createJSONStructureArr(propertyAmount, amountItems, idOffset) {
    let createdItems = [];
    
    if(typeof idOffset === 'undefined'){
    	idOffset = 0;
    }
    
    for(let itemNr = 0 + idOffset; itemNr < amountItems + idOffset; itemNr++){
    	let o = {};

	    for (let i = 0; i < propertyAmount; i++) {
	        o['prop' + i] = 'someText';
	    }

	   	// set id of item
	    o['id'] = itemNr;

	    createdItems.push(o);
    }

    return createdItems;
}

function storeInThisTransaction(tx, dataItem) {
    let store = tx.objectStore("Benchmark");

    store.put(dataItem);
}

function loadItemViaId_promise(id) {
	let tx = db.transaction("Benchmark", "readwrite");
    let store = tx.objectStore("Benchmark");

	const getItem = store.get(id);

	return new Promise((resolve, reject) => {
		getItem.onsuccess = () => {
			resolve(getItem.result);
		}
	});
}

function getAllItems_promise(tx) {
    let store = tx.objectStore("Benchmark");
    let items = [];

    let cursorRequest = store.openCursor();

	return new Promise((resolve, reject) => {
		cursorRequest.onerror = function(error) {
			console.log(error);
			reject(error);
		};
	
		cursorRequest.onsuccess = function(evt) {                    
			var cursor = evt.target.result;
			if (cursor) {
				items.push(cursor.value);
				cursor.continue();
			} else {
				// no cursor means => we have read all data
				resolve(items)
			}
		};
	});
}

function outputToDom(str) {
	const t = document.createTextNode(str);

	// append str message in UI
	document.getElementById('output').appendChild(t);

	// append line break
	document.getElementById('output').appendChild(document.createElement('br'))
}

function clearDB_promise() {
	let tx = db.transaction("Benchmark", "readwrite");
	let objectStore = tx.objectStore("Benchmark");
	let objectStoreRequest = objectStore.clear();

	return new Promise((resolve, reject) => {
		objectStoreRequest.onsuccess = function(event) {
			console.log("The benchmark db has been cleared...");
			resolve();
	  	};
	}); 
}

function stringifyLogMessage(msg, paramArr) {
	const logToken = msg.split(' ');

	let stringifiedMessage = "";
	let addingArgumentNr = 1;

	for(let pos = 0; pos < logToken.length; pos++){
		if(logToken[pos].indexOf('%d') !== -1 || logToken[pos].indexOf('%s') !== -1){
			logToken[pos] = logToken[pos].replace('%d', paramArr[addingArgumentNr])
											.replace('%s', paramArr[addingArgumentNr]);

			addingArgumentNr++;
		}

		stringifiedMessage += " " + logToken[pos]; 
	}

	return stringifiedMessage;
}

// ------------------------------------------------------
// App bootstrap
// ------------------------------------------------------

// Hijack log
(function(){
    var oldLog = console.log;
    console.log = function (message) {
        
		outputToDom(stringifyLogMessage(message, arguments));

        oldLog.apply(console, arguments);
    };
})();

// Open (or create) the database
var open = indexedDB.open("MyDatabase", 2);
var db = null;

// Create the schema
open.onupgradeneeded = function() {
    var db = open.result;
    var store = db.createObjectStore("Benchmark", {keyPath: "id"});
    var index = store.createIndex("prop1", "prop1");
};

open.onsuccess = function() {
    // open database
    db = open.result;

	console.log('DB connection open...');

    clearDB_promise().then(() => {
    	benchmark(db);
    });

    // Close the db when the transaction is done
    //tx.oncomplete = function() {
     //   db.close();
    //};
}

// ------------------------------------------------------
// Main Benchmark Application
// ------------------------------------------------------
function benchmarkTestRunner(db, idNumber, nameStr, descStr, testFunc) {
	console.log("");
	console.log("## Running Test Case %d (%s): %s", idNumber, nameStr, descStr);

	return new Promise((resolve, reject) => {
	
		testFunc(db).then((startDate) => {
			console.log("Test case %d took %d ms. Ended %s", idNumber, (Date.now() - startDate), Date());
			
			resolve();
		}).catch((error) => {
			console.error('Could not run test case %d (%s)... Reason: $O', idNumber, nameStr, error)
			
			reject();
		});

	});
}

function benchmark(db) {

	benchmarkTestRunner(db, 1, 'TCInsert10000_25', 'Inserting 10.000 entries with 25 attributes in indexedDB', (db) => {
		// preparation phase: do not measure time here
		let tx = db.transaction("Benchmark", "readwrite");
		const items = createJSONStructureArr(25,10000,0);

		console.log('preparation ended ... starting measurement at %s... ', Date());

		// data items have been created => start measuring
		const startDate = Date.now();

		for(const item of items){
			storeInThisTransaction(tx, item);
		}

		return new Promise((resolve, reject) => {

			tx.oncomplete = function() {
				resolve(startDate);
			};

			tx.onerror = function () {
				reject();
			}

		});

	}).then(() => {

		return benchmarkTestRunner(db, 2, 'TCRead10000_25', 'Reading 10.000 entries with 25 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");

			console.log('preparation ended ... starting measurement at %s... ', Date());

			// transaction has been created => start measuring
			const startDate = Date.now();

			// data items have been created => start measuring
			getAllItems_promise(tx).then((itemArr) => {
				console.log('Read %d items', itemArr.length);
			});

			return new Promise((resolve, reject) => {

				tx.oncomplete = function() {
					resolve(startDate);
				};

				tx.onerror = function () {
					reject();
				}

			});
		});

	}).then(() => {
		return clearDB_promise();
	}).then(() => {

		return benchmarkTestRunner(db, 3, 'TCInsert10000_100', 'Inserting 10.000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");
			const items = createJSONStructureArr(100,10000,0);

			console.log('preparation ended ... starting measurement at %s... ', Date());

			// data items have been created => start measuring
			const startDate = Date.now();

			for(const item of items){
				storeInThisTransaction(tx, item);
			}

			return new Promise((resolve, reject) => {

				tx.oncomplete = function() {
					resolve(startDate);
				};

				tx.onerror = function () {
					reject();
				}

			});

		});
	}).then(() => {
		return clearDB_promise();
	}).then(() => {

		return benchmarkTestRunner(db, 4, 'TCInsert20000_100', 'Inserting 20.000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");
			const items = createJSONStructureArr(100,20000,0);

			console.log('preparation ended ... starting measurement at %s... ', Date());

			// data items have been created => start measuring
			const startDate = Date.now();

			for(const item of items){
				storeInThisTransaction(tx, item);
			}

			return new Promise((resolve, reject) => {

				tx.oncomplete = function() {
					resolve(startDate);
				};

				tx.onerror = function () {
					reject();
				}

			});

		});
	}).then(() => {

		return benchmarkTestRunner(db, 5, 'TCRead20000_100', 'Reading 20.0000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");

			console.log('preparation ended ... starting measurement at %s... ', Date());

			// transaction has been created => start measuring
			const startDate = Date.now();

			// data items have been created => start measuring
			getAllItems_promise(tx).then((itemArr) => {
				console.log('Read %d items', itemArr.length);
			});

			return new Promise((resolve, reject) => {

				tx.oncomplete = function() {
					resolve(startDate);
				};

				tx.onerror = function () {
					reject();
				}

			});
		});

	}).then(() => {
		return clearDB_promise();
	}).then(() => {

		return benchmarkTestRunner(db, 6, 'TCInsert50000_100', 'Inserting 50.000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");
			const items = createJSONStructureArr(100,50000,0);

			console.log('preparation ended ... starting measurement at %s... ', Date());

			// data items have been created => start measuring
			const startDate = Date.now();

			for(const item of items){
				storeInThisTransaction(tx, item);
			}

			return new Promise((resolve, reject) => {

				tx.oncomplete = function() {
					resolve(startDate);
				};

				tx.onerror = function () {
					reject();
				}

			});

		});
	}).then(() => {

		return benchmarkTestRunner(db, 7, 'TCRead50000_100', 'Reading 50.0000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");

			console.log('preparation ended ... starting measurement at %s... ', Date());

			// transaction has been created => start measuring
			const startDate = Date.now();

			// data items have been created => start measuring
			getAllItems_promise(tx).then((itemArr) => {
				console.log('Read %d items', itemArr.length);
			});

			return new Promise((resolve, reject) => {

				tx.oncomplete = function() {
					resolve(startDate);
				};

				tx.onerror = function () {
					reject();
				}

			});
		});

	}).then(() => {
		return clearDB_promise();
	}).then(() => {

		return benchmarkTestRunner(db, 8, 'TCInsert80000_100', 'Inserting 80.000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");
			const items = createJSONStructureArr(100,80000,0);

			console.log('preparation ended ... starting measurement at %s... ', Date());

			// data items have been created => start measuring
			const startDate = Date.now();

			for(const item of items){
				storeInThisTransaction(tx, item);
			}

			return new Promise((resolve, reject) => {

				tx.oncomplete = function() {
					resolve(startDate);
				};

				tx.onerror = function () {
					reject();
				}

			});

		});
	}).then(() => {

		return benchmarkTestRunner(db, 9, 'TCRead80000_100', 'Reading 80.0000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");

			console.log('preparation ended ... starting measurement at %s... ', Date());

			// transaction has been created => start measuring
			const startDate = Date.now();

			// data items have been created => start measuring
			getAllItems_promise(tx).then((itemArr) => {
				console.log('Read %d items', itemArr.length);
			});

			return new Promise((resolve, reject) => {

				tx.oncomplete = function() {
					resolve(startDate);
				};

				tx.onerror = function () {
					reject();
				}

			});
		});

	}).then(() => {
		return clearDB_promise();
	}).then(() => {
		console.log('#########################################');
		console.log('>> Benchmark has finished...');
		console.log('#########################################');
	});
}