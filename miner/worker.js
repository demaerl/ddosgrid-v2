const { parseAndCheckArguments } = require('./cli/CLI')
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
  BGPMessages
} = require('./exports')
const io = require('socket.io-client')

try {
  console.log('Checking input values...')
  var settings = parseAndCheckArguments(process.argv)
  setupAnalysis(settings.pcapPath)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

async function setupAnalysis (pcapFilePath) {
  var emitter = new PacketEmitter()
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
  var activeMiners = miners.map(Miner => new Miner(emitter, pcapFilePath))
  await setUpMiners(activeMiners)
  var client = await createSocketClient(emitter, activeMiners, pcapFilePath)
  await runMiners(emitter, activeMiners, pcapFilePath, client)
  await runPostParsingAnalysis(activeMiners, client)
  console.log('Analysis is complete. Client will disconnect...')
  client.disconnect()
}

async function setUpMiners (activeMiners) {
  // The NodeJS version used (10) does not support Promise.map
  var setupTimer = new Date()
  for (var miner of activeMiners) {
    await miner.setUp()
  }
  var setupDuration = (new Date() - setupTimer) / 1000
  console.log(`✓ Setup of the following miners has completed (${setupDuration}s):`)
  activeMiners.forEach(miner => {
    console.log(`\t- ${miner.getName()}`)
  })
}

async function createSocketClient (emitter, miners, pcapFilePath) {
  return new Promise(function (resolve) {

    var client = io.connect('http://localhost:3000')

    client.on('startAnalysis', () => {
      resolve(client)
    })
  })
}

async function runMiners (emitter, activeMiners, target, client) {
  console.log('✓ Analysis started')
  try {
    var decodingTimer = new Date()
    console.log(`✓ Decoding has started...`)
    emitter.startPcapSession(target)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  emitter.on('complete', async () => {
    var decodingDuration = (new Date() - decodingTimer) / 1000 + 's'
    console.log(`\n✓ Decoding has finished (${decodingDuration.green}), sending interim results to server...`)
    var interim_results = []
    for (var miner of activeMiners) {
      var interim_result = miner.getInterimResults()
      interim_results.push(interim_result)
    }
    client.emit('interimResults', interim_results)
  })
}

async function runPostParsingAnalysis (activeMiners, client) {
  console.log('✓ Post-parsing analysis of the following miners has completed:')
  var results = []
  var summaries = []
  for (var miner of activeMiners) {
    let startTimer = new Date()
    var analysis_results = await miner.postParsingAnalysis()
    summaries.push(analysis_results[0])
    results.push(analysis_results[1])
    let duration = (new Date() - startTimer) / 10000
    console.log(`\t- (${duration}s) \t${miner.getName()}`)
  }
  console.log('✓ Post-parsing analysis: sending results to server...')
  client.emit('finalResults', summaries, results)
}
