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
  await createSocketServer()
}

async function createSocketServer () {
  var server = http.createServer()
  var io = new Server(server)
  const results_aggregated = []

  io.on('connection', (socket) => {
    console.log(`A client connected. ID: ${socket.id}`)

    socket.on('interimResults', (interim_results) => {
      console.log(`Received interim result from client (ID: ${socket.id}).`)
      if (results_aggregated.length > 0) {
        results_aggregated.push(interim_results)
        console.log(`Number of interim results received: ${results_aggregated.length}`)
      }
      else {
        console.log('First interim result received.')
        results_aggregated.push(interim_results)
      }
    })

    // TODO:
    // Collect final results
    // socket.on('finalResults', (summaries, results) => {
    //   console.log(`Received post-parsing analysis result from client (ID: ${socket.id}.`)
    // })

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