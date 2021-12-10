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
  var io = new Server(server)
  const interimResults = []
  const summaries = []
  const results = []

  io.on('connection', (socket) => {
    console.log(`A client connected. ID: ${socket.id}`)

    socket.on('interimResult', (interimResult) => {
      console.log(`Received interim result from client (ID: ${socket.id})`)
      runPostParsingAnalysis(interimResult)
      if (interimResults.length > 0) {
        interimResults.push(interimResult)
        console.log('Starting metadata aggregation...')
      }
      else {
        interimResults.push(interimResult)
      }
    })

    // Collect final results
    socket.on('finalResults', (summaries, results) => {
      console.log(`Received post-parsing analysis result from client (ID: ${socket.id})`)
      summaries.push(summaries)
      results.push(results)
    })

    // TODO:
    // Aggregate results with miners (static method)

    // socket.on('disconnect', () => {
    //   console.log(`A client disconnected. ID: ${socket.id}`)
    // })

    socket.emit('startAnalysis')
  })

  server.listen(3000, () => {
    console.log('Server listening on *:3000. Waiting for client to connect...')
  })
}

async function runPostParsingAnalysis(interimResults) {
  var miners = [
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