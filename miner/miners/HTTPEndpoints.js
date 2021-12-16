const AbstractPcapAnalyser = require('./AbstractPCAPAnalyser')
const analysisName = `most-used-http-endpoints`
const N = 5

class HTTPEndpoints extends AbstractPcapAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = []
  }

  // Setup phase, load additional databases, setup subscriptions and signal completion
  async setUp () {
    this.pcapParser.on('httpEndpoint', this.countEndpoint.bind(this))
  }

  countEndpoint (endpoint) {
    try {
      var exists = this.results.find(item => item.endpoint === endpoint)
      if (exists) {
        exists.count++
      } else {
        this.results.push({ endpoint: endpoint, count: 1 })
      }
    } catch (e) {
    }
  }

  getName () {
    return `Top ${N} most used HTTP endpoints`
  }

  // Actual mining function
  // Post-analysis phase, do additional computation with the collected data and write it out
  static postParsingAnalysis (results) {
    var mapped = Object.keys(results).map(endpoint => {return { endpoint: endpoint, count: results[endpoint] }})
    var sortedByCount = sortEntriesByCount(mapped)
    var topNentries = getTopN(sortedByCount, N)

    var fileName = `${this.baseOutPath}-${analysisName}.json`
    var fileContent = {
      // Signal and format to visualize as piechart
      piechart: {
        datasets: [{
          backgroundColor: ['#D33F49', '#77BA99', '#23FFD9', '#27B299', '#831A49'],
          data: pickCounts(topNentries)
        }],
        labels: pickEndpoints(topNentries)
      },
      hint: ''
    }
    var summary = {
      fileName: fileName,
      attackCategory: 'Application Layer',
      analysisName: 'Most used HTTP endpoints',
      supportedDiagrams: ['PieChart']
    }
    return [summary, fileContent]
  }

  getInterimResults () {
    var result = {}
    for (const dict of this.results) {
      result[dict['endpoint']] = dict['count']
    }
    return result
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

function pickCounts (elements) {
  return elements.map(entry => entry.count)
}

function pickEndpoints (elements) {
  return elements.map(entry => entry.endpoint)
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

module.exports = HTTPEndpoints
