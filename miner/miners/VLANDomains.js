const AbstractPcapAnalyser = require('./AbstractPCAPAnalyser')
const N = 5
const analysisName = `top-${N}-vlan-domains-by-eth-traffic`

class VLANDomains extends AbstractPcapAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = {
      // store interim results here
      // { vlanid: '1.2.3.4', count: 1 }
    }
  }

  // Setup phase, load additional databases, setup subscriptions and signal completion
  async setUp () {
    this.pcapParser.on('ethernetPacket', this.checkEth.bind(this))
  }

  checkEth (ethPacket) {
    try {
      var vlanID = ethPacket.vlan.id
      var existingEntry = this.results.hasOwnProperty(vlanID)

      if (existingEntry) {
        this.results[vlanID]++
      } else {
        this.results[vlanID] = 1
      }
    } catch (e) {}
  }

  getName () {
    return `Top ${N} VLANs by Ethernet traffic`
  }

  // Actual mining function
  // Post-analysis phase, do additional computation with the collected data and write it out
  static postParsingAnalysis (results, baseOutPath) {
    var mapped = Object.keys(results).map((key) => {
      return {id: key, count: results[key]}
    })
    var sortedByCount = sortEntriesByCount(mapped)
    var topNentries = getTopN(sortedByCount, N)

    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = {
      // Signal and format to visualize as piechart
      piechart: {
        datasets: [{
          backgroundColor: ['#D33F49', '#77BA99', '#23FFD9', '#27B299', '#831A49'],
          data: formatData(topNentries)
        }],
        labels: formatLabels(topNentries)
      },
      hint: 'The labels of this chart have been computed using temporally sensitive data'
    }
    var summary = {
      fileName: fileName,
      attackCategory: 'Link Layer',
      analysisName: `Top ${N} VLANs`,
      supportedDiagrams: ['PieChart']
    }
    return super.storeAndReturnResult(fileName, fileContent, summary)
  }

  getInterimResults () {
    var mapped = Object.keys(this.results).map((key) => {
      return {id: key, count: this.results[key]}
    })
    return sortEntriesByCount(mapped)
  }

  static aggregateResults(resultA, resultB) {
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

function sortEntriesByCount (elements) {
  return elements.sort((a, b) => {
    if (a.count > b.count) { return -1 }
    if (a.count < b.count) { return 1 }
    return 0
  })
}

function getTopN (elements, num) {
  return elements.slice(0, num)
}

function formatData (elements) {
  return elements.map(entry => entry.count)
}

function formatLabels (elements) {
  return elements.map(entry => entry.id)
}

module.exports = VLANDomains
