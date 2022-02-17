const AbstractPCAPAnalyser = require('./AbstractPCAPAnalyser')
const analysisName = 'udp-tcp-ratio'

class UDPvsTCPRatio extends AbstractPCAPAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = {
      nrOfUDP: 0,
      nrOfTCP: 0
    }
  }

  // Setup phase, load additional databases, setup subscriptions and signal completion
  async setUp () {
    this.pcapParser.on('tcpPacket', this.incrementTCP.bind(this))
    this.pcapParser.on('udpPacket', this.incrementUDP.bind(this))
  }

  getName () {
    return 'Ratio between UDP and TCP segments'
  }

  // Actual mining function
  incrementUDP () {
    this.results.nrOfUDP++
  }

  incrementTCP () {
    this.results.nrOfTCP++
  }

  // Post-analysis phase, do additional computation with the collected data and write it out
  static postParsingAnalysis (results, baseOutPath) {
    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = {
      piechart: {
        datasets: [{
          backgroundColor: ['#DB0071', '#005FD0'],
          data: [
            results.nrOfUDP,
            results.nrOfTCP
          ]
        }],
        labels: ['UDP', 'TCP']
      }
    }
    var summary = {
      fileName: fileName,
      attackCategory: 'Transport Layer',
      analysisName: 'UDP and TCP Ratio',
      supportedDiagrams: ['PieChart']
    }
    return super.storeAndReturnResult(fileName, fileContent, summary)
  }

  getInterimResults () {
    return this.results
  }

  static aggregateResults (resultA, resultB) {
    for (var key in resultA) {
      if (resultB.hasOwnProperty(key)) {
        resultB[key] += resultA[key]
      }
      else {
        resultB[key] = resultA[key]
      }
    }
    return resultB
  }

  static getAnalysisName () {
    return analysisName
  }
}

module.exports = UDPvsTCPRatio
