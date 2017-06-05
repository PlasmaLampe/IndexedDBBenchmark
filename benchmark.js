'use strict';

import * as _ from 'lodash';
import * as tablify from 'html-tablify';

/**
 * Stores the gathered data results from the benchmark
 */
let benchmarkResults = {};

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

function updateUIResultTable(data) {
	const htmlContent = tablify.tablify({data:_.values(data), tableClass: 'table'});

	document.getElementById('resultTable').innerHTML = htmlContent;

	// workaround because "tableClass" attribute seems not to work
	document.getElementById('tablify').className = 'table';
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
	try{
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
	} catch(e) {
		if(typeof msg.toString !== 'undefined'){
			return msg.toString();
		} else {
			return 'error while calling stringify...';
		}
	}
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

	console.log('Benchmarking DB connection is open...');
	console.log('Starting benchmark...')
	benchmark(db);

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

	if(typeof benchmarkResults[idNumber] === 'undefined'){
		benchmarkResults[idNumber] = [];
	}

	benchmarkResults[idNumber].push({
		duration: null,
		items: null,
		itemProp: null,
		name: null,
		description: null
	});

	return new Promise((resolve, reject) => {
	
		testFunc(db).then((startDate) => {
			const duration = (Date.now() - startDate);
			console.log("Test case %d took %d ms. Ended %s", idNumber, duration , Date());

			getNewestBenchmarkResultObjectForId(idNumber).duration = duration;
			getNewestBenchmarkResultObjectForId(idNumber).description = descStr;
			getNewestBenchmarkResultObjectForId(idNumber).name = nameStr;
			
			resolve();
		}).catch((error) => {
			console.error('Could not run test case %d (%s)... Reason: $O', idNumber, nameStr, error)
			
			reject();
		});

	});
}

function getNewestBenchmarkResultObjectForId(id){
	return benchmarkResults[id][benchmarkResults[id].length - 1];
}

function writeAndReadBenchmarkRun(amountItems, amountProperties, testCaseIdStartNumber, db) {

	return new Promise((resolve, reject) => {
		clearDB_promise().then(() => {

			/**
			 * "Writing" benchmark test case
			 */
			benchmarkTestRunner(db, testCaseIdStartNumber, 'TCInsert'+amountItems+'_'+amountProperties, 
				'Inserting '+amountItems+' entries with ' + amountProperties + ' attributes in indexedDB', (db) => {
			
				getNewestBenchmarkResultObjectForId(testCaseIdStartNumber).items = amountItems;
				getNewestBenchmarkResultObjectForId(testCaseIdStartNumber).itemProp = amountProperties;

				// preparation phase: do not measure time here
				let tx = db.transaction("Benchmark", "readwrite");
				const items = createJSONStructureArr(amountProperties,amountItems,0);

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

			/**
			 * "Writing" benchmark test case
			 */
			benchmarkTestRunner(db, (testCaseIdStartNumber + 1), 'TCInsert'+amountItems+'_'+amountProperties, 
				'Reading '+amountItems+' entries with ' + amountProperties + ' attributes in indexedDB', (db) => {
	
				getNewestBenchmarkResultObjectForId(testCaseIdStartNumber + 1).items = amountItems;
				getNewestBenchmarkResultObjectForId(testCaseIdStartNumber + 1).itemProp = amountProperties;

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
			}).then(() => {
				
				clearDB_promise().then(() => {
					resolve();
				});
				
			});

			});
		});
	});
}

function runBenchmarkTestSequence() {
	return new Promise((resolve, reject) => {
		writeAndReadBenchmarkRun(2500,25,1,db).then(() => {
			writeAndReadBenchmarkRun(2500,100,3,db).then(() => {
				writeAndReadBenchmarkRun(5000,100,5,db).then(() => {
					writeAndReadBenchmarkRun(10000,100,7,db).then(() => {
						resolve();
					});	
				});
			});
		});
	});
}

function createStatisticObject(resultObj) {

	let stats = {};

	for(const testcaseID of Object.keys(benchmarkResults)){
		stats[testcaseID] = {
			name: null,
			description: null,
			min: 100000000,
			max: -1,
			average: null
		};
		
		const durationListForCurrentID = _.map(benchmarkResults[testcaseID], (resultItem) => {
			return resultItem.duration;
		});

		let sum = 0;

		for(const value of durationListForCurrentID){
			sum += value;

			if(value > stats[testcaseID].max) {
				stats[testcaseID].max = value;
			}

			if(value <= stats[testcaseID].min) {
				stats[testcaseID].min = value;
			}
		}

		stats[testcaseID].average = (sum/durationListForCurrentID.length);

		try{
			stats[testcaseID].name = benchmarkResults[testcaseID][0].name;
			stats[testcaseID].description = benchmarkResults[testcaseID][0].description;
		} catch(e) {
			console.log('Error while loading name and description of test case $d...', testcaseID);
		}
		
	}

	return stats;
}

function benchmark() {
	console.log('configuring benchmark application...');
	const amountOfBenchmarkRuns = 2;

	console.log('the benchmark will be run %d times to gather more precise data...', amountOfBenchmarkRuns);

	// create async function array
	let asyncFunctions = [];

	console.log('creating benchmark runs...');

	for(let i = 0; i < amountOfBenchmarkRuns; i++){
		asyncFunctions.push(runBenchmarkTestSequence);
	}

	// push finished function
	asyncFunctions.push(function() {
		return clearDB_promise().then(() => {
			console.log('#########################################');
			console.log('>> Benchmark has finished...');
			console.log('#########################################');

			updateUIResultTable(createStatisticObject(benchmarkResults));
		});
	});

	// -----------------
	// run benchmark
	// -----------------

	// We create the start of a promise chain
	let chain = Promise.resolve();

	// And append each function in the array to the promise chain
	for (const func of asyncFunctions) {
  		chain = chain.then(func);
	}
}