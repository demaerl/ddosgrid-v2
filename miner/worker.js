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

async function setupAnalysis(pcapFilePath) {
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
  var client = await createSocketClient(pcapFilePath)
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

async function createSocketClient(pcapFilePath) {
  return new Promise(function(resolve, reject) {
    var client = io.connect('http://localhost:3000')
    console.log('client connected to server')

    client.on('startAnalysis', () => {
      console.log('client: ack connection')
      // emitter.startPcapSession('bla')
      // runMiners(emitter, miners, pcapFilePath)
    })

    resolve(client)
  })
}

async function runMiners (emitter, activeMiners, target) {
  console.log('✓ Analysis started')
  try {
    var decodingTimer = new Date()
    emitter.startPcapSession(target)
    console.log(`✓ Decoding has started...`)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  emitter.on('complete', async () => {
    var decodingDuration = (new Date() - decodingTimer) / 1000 + 's'
    console.log(`\n✓ Decoding has finished (${decodingDuration.green}), starting post-parsing analysis`)
    // var results = activeMiners.map(async (miner) => { return await miner.postParsingAnalysis() })
    console.log('✓ Post-parsing analysis of the following miners has completed:')
    var results = []
    for (var miner of activeMiners) {
      let startTimer = new Date()
      var result = await miner.postParsingAnalysis()
      results.push(result)
      let duration = (new Date() - startTimer) / 10000
      console.log(`\t- (${duration}s) \t${miner.getName()}`)
    }
    console.log('✓ All miners have finished.')
    var output = JSON.stringify(results)
    if (process && process.send) {
      // If this function exists in scope we know that we are in a forked ChildProcess
      // This will then send the output of the miners over IPC to the master process
      process.send(output)
    } else {
      console.log(output)
    }
  })
}
