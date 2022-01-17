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
  TopTwentyPortsByTrafficAnalyser,  // FIXME Does not work with large pcap files
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
  var interimResults = []
  var summaries = []
  var results = []
  var aggregatedResults = []

  io.on('connection', (socket) => {
    console.log(`A client connected. ID: ${socket.id}`)

    socket.on('interimResult', async (interimResult) => {
      console.log(`Received interim result from client (ID: ${socket.id})`)
      await runPostParsingAnalysis(interimResult)
      if (aggregatedResults.length > 0) {
        console.log('Starting metadata aggregation...')
        aggregatedResults = await aggregateResults(interimResult, aggregatedResults)
        await runPostParsingAnalysis(aggregatedResults)
      }
      else {
        aggregatedResults = interimResult
      }
      socket.disconnect()
    })

    socket.on('disconnect', (reason) => {
      console.log(`A client disconnected. Reason: ${reason}. ID: ${socket.id}`)
    })

    socket.emit('ack')
  })

  server.listen(3000, () => {
    console.log('Server listening on *:3000. Waiting for client to connect...')
  })
}

async function runPostParsingAnalysis(interimResults) {
  console.log('Starting post-parsing analysis...')
  var results = []
  var summaries = []
  var pairs = miners.map(function(miner, i) {
    return [miner, interimResults[i]]
  })
  for (var [miner, result] of pairs) {
    var [summary, finalResult] = await miner.postParsingAnalysis(result)
    summaries.push(summary)
    results.push(finalResult)
  }

  console.log('✓ Post-parsing analysis has completed.')
}

async function aggregateResults(interimResults, aggregatedResults) {
  aggregatedList = []
  var pairs = miners.map(function(miner, i) {
    return [miner, interimResults[i], aggregatedResults[i]]
  })
  for (var [miner, interimResult, aggregatedResult] of pairs) {
    var aggregated = miner.aggregateResults(interimResult, aggregatedResult)
    aggregatedList.push(aggregated)
  } 

  return aggregatedList
}