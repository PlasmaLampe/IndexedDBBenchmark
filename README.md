# IndexedDBBenchmark
The small project is used to check the performance of the indexedDB in various situations

## To use the benchmark
* Just clone the repo and run the index.html file
* The UI output will freeze during the benchmark a couple of times
* This happens because the code is single threaded and, thus, calls with heavy resource demand (e.g., the db calls) block the UI while they are executed

## If you want to add your own benchmarking tests
* Open the benchmark.js file and scroll down to the bottom
* The benchmark tests are included in a promise chain
* You can write your own test and add it to the chain

## Please be aware that the code is "quick and dirty" with the only purpose of benchmarking. 
So, do not use the db access code as a reference for anything ;-) 

