const AbstractPCAPAnalyser = require('./AbstractPCAPAnalyser')
const portNumbers = require('port-numbers')
const analysisName = 'top-20-services'

class TopTwentyPortsAnalyser extends AbstractPCAPAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = {
    }
    this.output = {}
  }

  async setUp () {
    this.pcapParser.on('tcpPacket', this.countPort.bind(this))
    this.pcapParser.on('udpPacket', this.countPort.bind(this))
  }

  countPort (transportPacket) {
    if (!transportPacket) {
      return
    }
    var port = transportPacket.dport
    try {
      if (hasProp(this.output[port], 'port')) {
        this.output[port].count++
      } else {
        this.output[port] = {
          count: 1,
          port: port,
          servicename: 'TBD'
        }
      }
    } catch (e) {
      console.error('Unable to analyse packet', transportPacket)
    }
  }

  getName () {
    return 'Top 20 UDP/TCP ports by number of segments'
  }

  static postParsingAnalysis (output, baseOutPath) {
    var ports = Object.values(output)
    ports.sort((a, b) => {
      if (a.count > b.count) { return -1 }
      if (a.count < b.count) { return 1 }
      return 0
    })

    var topTwentyServices = ports.slice(0, 20)
    topTwentyServices.map((port) => {
      var service = portNumbers.getService(port.port)
      try {
        port.servicename = service.name
      } catch (e) {
        port.servicename = port.port
      }
    })

    var totalNrOfDestinationPorts = ports.length
    output.topTwenty = topTwentyServices
    output.metrics = { total_dst_port: totalNrOfDestinationPorts }
    output.barchart = formatForBarchart(output)

    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = output
    var summary = {
      fileName: fileName,
      attackCategory: 'Transport Layer',
      analysisName: 'Traffic by ports (top 20)',
      supportedDiagrams: ['BarChart']
    }
    return super.storeAndReturnResult(fileName, fileContent, summary)
  }

  getInterimResults () {
    return this.output
  }

  static aggregateResults (resultA, resultB) {
    throw new NotImplemented('aggregateResults')
  }

  static getAnalysisName () {
    return analysisName
  }
}

function formatForBarchart (output) {
  return {
    labels: output.topTwenty.map(item => item.port),
    datasets: [{
      label: 'Count',
      backgroundColor: '#f87979',
      data: output.topTwenty.map(item => item.count)
    }]
  }
}

function hasProp (target, prop) {
  if(!target === null || target === undefined) { return false }
  return Object.prototype.hasOwnProperty.call(target, prop)
}

module.exports = TopTwentyPortsAnalyser
