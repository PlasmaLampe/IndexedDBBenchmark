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
    //let index = store.index("NameIndex");

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

function clearDB_promise() {
	let tx = db.transaction("Benchmark", "readwrite");
	let objectStore = tx.objectStore("Benchmark");
	let objectStoreRequest = objectStore.clear();

	return new Promise((resolve, reject) => {
		objectStoreRequest.onsuccess = function(event) {
			console.log("db cleared");
			resolve();
	  	};
	}); 
}

// ------------------------------------------------------
// App bootstrap
// ------------------------------------------------------

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
			console.log("Test case %d took %d ms", idNumber, (Date.now() - startDate));
			
			resolve();
		}).catch((error) => {
			console.error('Could not run test case %d (%s)... Reason: $O', idNumber, nameStr, error)
			
			reject();
		});

	});
}

function benchmark(db) {

	benchmarkTestRunner(db, 1, 'TCInsert100000', 'Inserting 100.000 entries with 25 attributes in indexedDB', (db) => {
		// preparation phase: do not measure time here
		let tx = db.transaction("Benchmark", "readwrite");
		const items = createJSONStructureArr(25,100000,0);

		console.log('preparation ended ... starting measurement...');

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
		return clearDB_promise();
	}).then(() => {

		return benchmarkTestRunner(db, 2, 'TCInsert100000', 'Inserting 100.000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");
			const items = createJSONStructureArr(100,100000,0);

			console.log('preparation ended ... starting measurement...');

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

		return benchmarkTestRunner(db, 3, 'TCInsert1000000', 'Inserting 1.000.000 entries with 100 attributes in indexedDB', (db) => {
			// preparation phase: do not measure time here
			let tx = db.transaction("Benchmark", "readwrite");
			const items = createJSONStructureArr(100,1000000,0);

			console.log('preparation ended ... starting measurement...');

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
	});

	/*
	returnPromise.then(() => {
		// TC2: load items


		loadItemViaId_promise(1).then((item) => {
			console.log(item);
		});
	});*/

	// TODO:
	// add bootstrap

	// append output to DOM

	// add GETALL TC for every sized DB

	// Include test case without primary key!!!! I want the timing there




}