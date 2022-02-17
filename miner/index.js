const http = require('http')
const { Server } = require('socket.io')
const {
  PacketEmitter,
  MetricAnalyser,
  PortUsageClusteredAnalyser,
  TopTwentyPortsByTrafficAnalyser,
  SynStateAnalyser,
  IPVersionAnalyser,
  Top5SourceHostsAnalyser,
  Top100SourceHostsAnalyser,
  HTTPVerbs,
  HTTPEndpoints,
  BrowserAndOSAnalyzer,
  DeviceAnalyzer,
  UDPvsTCPRatio,
  ICMPMessages,
  VLANDomains,
  BGPMessages,
  PortAnalyser
} = require('./exports')

const miners = [
  VLANDomains,
  MetricAnalyser,
  TopTwentyPortsByTrafficAnalyser,
  PortUsageClusteredAnalyser,
  SynStateAnalyser,
  UDPvsTCPRatio,
  IPVersionAnalyser,
  ICMPMessages,
  Top5SourceHostsAnalyser,
  Top100SourceHostsAnalyser,
  // Uncomment to run the experimental BGP miner
  // BGPMessages,
  HTTPVerbs,
  HTTPEndpoints,
  BrowserAndOSAnalyzer,
  DeviceAnalyzer
]

try {
  setUp()
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

async function setUp () {
  await createSocketServer()
}

async function createSocketServer () {
  var server = http.createServer()
  var io = new Server(server, {
    pingInterval: 160000,
    pingTimeout: 160000,
    maxHttpBufferSize: 1e12
  });
  var analyses = []
  var baseOutPath = undefined
  var currentPcapFilePath = ''
  var aggregatedResults = []

  io.on('connection', (socket) => {
    console.log(`A client connected. ID: ${socket.id}`)

    socket.on('pcapFilePath', (pcapFilePath) => {
      if (baseOutPath == null) {
        baseOutPath = pcapFilePath.substring(0, pcapFilePath.lastIndexOf('/') + 1)
      }
      currentPcapFilePath = pcapFilePath
      analyses.push(pcapFilePath.split('/').pop())
    })

    socket.on('interimResult', async (interimResult) => {
      console.log(`Received interim result from client (ID: ${socket.id}).\nStarting post-parsing analysis of interim result...`)
      await runPostParsingAnalysis(interimResult, currentPcapFilePath)
      console.log()

      if (aggregatedResults.length > 0) {
        console.log('Starting metadata aggregation...')
        aggregatedResults = await aggregateResults(interimResult, aggregatedResults)
        console.log(`Starting post-parsing analysis of aggregated results...`)
        var baseOutPathAggregated = createAggregatedOutPath(baseOutPath, analyses)
        await runPostParsingAnalysis(aggregatedResults, baseOutPathAggregated)
      }
      else {
        aggregatedResults = interimResult
      }
      socket.disconnect()
    })

    socket.on('disconnect', (reason) => {
      console.log(`A client disconnected. Reason: ${reason}. ID: ${socket.id}\n`)
    })

    socket.emit('ack')
  })

  server.listen(3000, () => {
    console.log('Server listening on *:3000. Waiting for client to connect...')
  })
}

async function runPostParsingAnalysis(interimResults, baseOutPath) {
  var pairs = miners.map(function(activeMiner, i) {
    return [activeMiner, interimResults[i]]
  })
  for (var [miner, result] of pairs) {
    if (result != null) {
      await miner.postParsingAnalysis(result, baseOutPath)
    }
  }
  console.log(`✓ Post-parsing analysis has completed. The results are available at ${baseOutPath.substring(0, baseOutPath.lastIndexOf('/') + 1).green}`)
}

async function aggregateResults(interimResults, aggregatedResults) {
  var aggregatedList = []
  var pairs = miners.map(function(activeMiner, i) {
    return [activeMiner, interimResults[i], aggregatedResults[i]]
  })
  for (var [miner, interimResult, aggregatedResult] of pairs) {
    try {
      var aggregated = miner.aggregateResults(interimResult, aggregatedResult)
      aggregatedList.push(aggregated)
    } catch (e) {
      aggregatedList.push(undefined)
    }
  } 
  
  console.log('✓ Metadata aggregation has completed.')
  return aggregatedList
}

function createAggregatedOutPath(dir, analyses) {
  var fs = require('fs');
  var baseOutPathAggregated = dir + 'aggregated/'

  if (!fs.existsSync(baseOutPathAggregated)){
    fs.mkdirSync(baseOutPathAggregated);
  }

  return baseOutPathAggregated + analyses.join('-')
}