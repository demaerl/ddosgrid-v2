const AbstractPcapAnalyser = require('./AbstractPCAPAnalyser')
const analysisName = 'IP-version'

class IPVersionAnalyser extends AbstractPcapAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = {
      nrOfIPv4: 0,
      nrOfIPv6: 0
    }
  }

  // Setup phase, load additional databases, setup subscriptions and signal completion
  async setUp () {
    this.pcapParser.on('ipv4Packet', this.countIPV4.bind(this))
    this.pcapParser.on('ipv6Packet', this.countIPV6.bind(this))
  }

  // Actual mining function
  // Post-analysis phase, do additional computation with the collected data and write it out
  countIPV4 () {
    this.results.nrOfIPv4++
  }

  countIPV6 () {
    this.results.nrOfIPv6++
  }

  getName () {
    return 'Analysis of IPv4 vs IPv6 traffic (based on packets)'
  }

  static postParsingAnalysis (results, baseOutPath) {
    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = {
      piechart: {
        datasets: [{
          backgroundColor: ['#D33F49', '#77BA99'],
          data: Object.values(results)
        }],
        labels: ['IPv4', 'IPv6']
      }
    }
    var summary = {
      fileName: fileName,
      attackCategory: 'Network Layer',
      analysisName: 'IPv4 and IPv6 usage',
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

module.exports = IPVersionAnalyser
