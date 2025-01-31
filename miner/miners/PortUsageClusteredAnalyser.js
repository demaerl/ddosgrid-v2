const AbstractPCAPAnalyser = require('./AbstractPCAPAnalyser')
const analysisName = 'portscan-clustered'

class PortUsageClusteredAnalyser extends AbstractPCAPAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = {
    }
    this.output = {}
  }

  async setUp () {
    this.output.clusters = new Array(1024).fill(0)
    this.pcapParser.on('tcpPacket', this.countPort.bind(this))
    this.pcapParser.on('udpPacket', this.countPort.bind(this))
  }

  countPort (transportPacket) {
    if (!transportPacket) {
      return
    }
    var port = transportPacket.dport
    try {
      var index = Math.floor((port - 1) / 64)
      this.output.clusters[index] += 1
    } catch (e) {
      console.error('Unable to analyse packet', transportPacket)
    }
  }

  getName () {
    return 'Number of segments received over all TCP/UDP ports'
  }

  static postParsingAnalysis (output, baseOutPath) {
    output.scatterplot = formatForScatterplot(output.clusters)

    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = output
    var summary = {
      fileName: fileName,
      attackCategory: 'Transport Layer',
      analysisName: 'Traffic by ports (clustered)',
      supportedDiagrams: ['Scatterplot']
    }
    return super.storeAndReturnResult(fileName, fileContent, summary)
  }

  getInterimResults() {
    return this.output
  }

  static aggregateResults (resultA, resultB) {
    throw new NotImplemented('aggregateResults')
  }

  static getAnalysisName () {
    return analysisName
  }
}

function formatForScatterplot (buckets) {
  var scatterplotPoints = buckets.map((count, index) => {
    return { x: index * 64, y: count }
  })

  return scatterplotPoints.filter((bucket) => {
    return bucket.y > 0
  })
}

module.exports = PortUsageClusteredAnalyser
