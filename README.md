# DDoSGrid (V2)
> A tool for analysis and visualization of DDoS attacks from PCAP files

## Table of Contents

   * [DDoSGrid](#ddosgrid)
      * [Introduction](#introduction)
   * [Development](#development)
      * [miner (distributed)](#miner-distributed)
      * [miner](#miner)
      * [api](#api)
      * [frontend](#frontend)
   * [Production deployment](#production-deployment)
      * [frontend](#frontend-1)
      * [API](#api-1)

## Introduction

This tool consist of three parts:
* The `miner` subproject is a packet decoder and feature extractor that produces output as JSON files and communicates over stdout or an IPC channel if available.
* `api` is a RESTful api based on Express.js which orchestrates the `miner` package if required.
* The `frontend` is a Vue.js based SPA that renders visualizations obtained from the api.

There are three ways to use this project:
* Running the miner with its distributed architecture through the shell, as described under `Development > miner (distributed)`
* Just running the miner through the shell as described under `Development > miner`.
* Running the api (locally or on a server) and serving the frontend through a webserver

# Development

Clone the project from github:
```
git clone git@github.com:ddosgrid/ddosgrid-v2.git
```

## miner (distributed)

Prerequisites:
- Make sure you are running Node.JS version 16 (LTS).
- Depending on your distribution, to compile native addons from npm, additional packages (e.g. `build-essential` on Ubuntu) might be required.
- Install `libpcap`. Make sure which package is appropriate for your distribution (e.g. `libpcap-dev` on Ubuntu).

Enter the `miner` subproject and install the necessary dependencies.
```bash
cd miner
npm i
```
After that, the central instance can be run through a shell, and it will wait for nodes to connect:
```bash
node index.js
```

```bash
Server listening on *:3000. Waiting for client to connect...
```

To connect a worker node, provide the path to the pcap file you wish to analyse. This will run the miners and transmit the results to the central instance:
```bash
node worker.js pcap_path='/path/to/pcap_file_A'
```

The output of the central and worker node will look as follows:

<table>
<tr>
<th>Central instance (server)</th>
<th>Worker instance (client)</th>
</tr>
<tr>
<td>

```bash
A client connected. ID: 9ULJO3Vc-C6J2uKUAAAB
Received interim result from client (ID: 9ULJO3Vc-C6J2uKUAAAB).
Starting post-parsing analysis of interim result...
✓ Post-parsing analysis has completed. The results are available at '/path/to/pcap_file_directory/'

A client disconnected. Reason: server namespace disconnect. ID: 9ULJO3Vc-C6J2uKUAAAB







```
</td>
<td>

```bash
Checking input values...
✓ Setup of the following miners has completed (0.001s):
        - Miscellaneous Metrics
        - Top 20 UDP/TCP ports by number of segments
        - Ratio between UDP and TCP segments
        - Analysis of IPv4 vs IPv6 traffic (based on packets)
        - Top 5 source hosts (IPv4)
        - Most used HTTP verbs
        - Top 10 most used Browser and OS Combinations
✓ Analysis has started...
✓ Decoding has started...
        ◴  0.001 × 10⁶ PCAP packets analysed. Current Heap Memory usage: 20MB
✓ Decoding has finished (0.768s), sending interim results to server... 
```

</td>
</tr>
</table>

To connect additional worker nodes, use the same command as above. After the central node has received two (or more) results from worker nodes, it starts aggregating these results. The output of the central node will then look as follows:
```bash
A client connected. ID: 5yJNF-dKNy0i5jDBAAAD
Received interim result from client (ID: 5yJNF-dKNy0i5jDBAAAD).
Starting post-parsing analysis of interim result...
✓ Post-parsing analysis has completed. The results are available at '/path/to/pcap_file_directory/'

Starting metadata aggregation...
✓ Metadata aggregation has completed.
Starting post-parsing analysis of aggregated results...
✓ Post-parsing analysis has completed. The results are available at '/path/to/pcap_file_directory/aggregated/'
A client disconnected. Reason: server namespace disconnect. ID: 5yJNF-dKNy0i5jDBAAAD
```
## miner
Enter the `miner` subproject and install the necessary dependencies. Make sure you are running Node.JS version 10 and that you lave libpcap installed. Make sure which package is appropriate for your distribution (e.g. libpcap-dev on Ubuntu).
```bash
cd miner
npm i
```
After that the miner package can be imported as an NPM module or it can be run manually through the shell. Alternatively one can use the miner as a subprocess where it will communicate over an IPC channel.
For example to run it through a shell:
```bash
node index.js pcap_path=/path/to/your/pcap-file
```
This will run the miner which will render its result to stdout:
```bash
node index.js pcap_path=/path/to/your/capture.pcap

✓ Input check completed
✓ Analysis started
✓ Setup of the following miners has completed:
	- Miscellaneous Metrics
	- Top 20 UPD/TCP ports by number of segments
	- Number of segments received over all TCP/UDP ports
	- Connection states of TCP segments
	- Analysis of IPv4 vs IPv6 traffic (based on packets)
	- Top 5 source hosts (IPv4)
	- Top 100 source hosts (IPv4)
✓ Decoding has finished, starting post-parsing analysis
✓ All miners have finished.

```

Run it as a subprocess:
```javascript
const child_process = require('child_process')
const fork = child_process.fork
const path = require('path')

// Options to run the miner as subprocess
var program = path.resolve('../miner/index.js')
var args = [ `pcap_path=${pcapPath}` ]
var options = { stdio: [ 'ipc' ] }

var childProcess = fork(program, args, options)

// Once the miner finishes he will send a 'message' with file paths
// pointing to the analysis results
childProcess.on('message', function (minerResults) {
  var parsedResults = JSON.parse(minerResults)
  // Do something with the JSON files
})
childProcess.on('exit', (code) => {
  if(code !== 0) {
    // Something went wrong
  }
})
```

## api
Setting up the api is straightforward simply fetch the dependencies and start the main javascript file. Make sure that you have previously installed the dependencies of the miner!
```bash
cd miner; npm i; cd ..;
cd api; npm i
```
Now simply run it and optionally pass the port where it should listen:
```bash
node index.js
```
or
```bash
export PORT=1234; node index.js
```
:warning: To use the OAuth2 authentication system, one would need to start the API using the development script in the `scripts` folder. This script will provide additional parameters.

:warning: If you want to invoke the DDoSDB export you will also need to clone the `converters` and `ddos_dissector` scripts into the root of the repository. Please follow the documentation of these repositories to set up the required dependencies.

## frontend
Enter the `frontend` subproject and run it after fetching its dependencies
```bash
npm i; npm run serve
```
This will automatically rebuild the project if a file changes. 
To use the application you will need to let it connect to an api instance.
In development mode (`npm run serve`) it will always connect to `localhost:3000`.

# Production deployment
There is no written documentation on how to deploy DDoSGrid/DDoSDB productively. A working documentation of such a configuration can be found in [ddosgrid/configuration-management](https://github.com/ddosgrid/configuration-management). That repository can be used as a 'working' documentation since all the steps required to setup all components will be shown. Alternatively, one may use the Ansible / Vagrant workflow to deploy the platform in an automated manner.
