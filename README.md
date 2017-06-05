# IndexedDBBenchmark
The small project is used to check the performance of the indexedDB in various situations

## To use the benchmark
* Just clone the repo and run npm install (and open the index.html)
* Run webpack --watch to recompile the bundle.js after changing something at the code
* The UI output will freeze during the benchmark a couple of times
* This happens because the code is single threaded and, thus, calls with heavy resource demand (e.g., the db calls) block the UI while they are executed
* The output is also written to the web console. This is up-to-date the whole time during the benchmarking process.

## To add your own benchmarking tests
* Open the benchmark.js file and change the function "runBenchmarkTestSequence"

## Please be aware that the code is "quick and dirty" with the only purpose of benchmarking
So, do not use the db access code as a reference for anything ;-) 

