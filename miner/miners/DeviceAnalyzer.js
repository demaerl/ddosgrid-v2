const AbstractPcapAnalyser = require('./AbstractPCAPAnalyser')
const UAParser = require('ua-parser-js')
const analysisName = `most-used-vendor-and-type-combinations`
const N = 10

class DeviceAnalyzer extends AbstractPcapAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = []
  }

  // Setup phase, load additional databases, setup subscriptions and signal completion
  async setUp () {
    this.pcapParser.on('httpUserAgent', this.countVendorAndTypeCombination.bind(this))
  }

  countVendorAndTypeCombination (userAgent) {
    try {
      var parsedUA = UAParser(userAgent)
      var deviceString = `${parsedUA.device.model} ${parsedUA.device.type} ${parsedUA.device.vendor}`.trim()
      var exists = this.results.find(item => item.device === deviceString)
      if (exists) {
        exists.count++
      } else {
        this.results.push({ device: deviceString, count: 1 })
      }
    } catch (e) {
    }
  }

  getName () {
    return `Top ${N} most used Devices`
  }

  // Actual mining function
  // Post-analysis phase, do additional computation with the collected data and write it out
  static postParsingAnalysis (results, baseOutPath) {
    var sortedByCount = sortEntriesByCount(results)
    var topNentries = getTopN(sortedByCount, N)

    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = {
      // Signal and format to visualize as barchart
      piechart: {
        datasets: [{
          backgroundColor: ['#D33F49', '#77BA99', '#23FFD9', '#27B299', '#831A49'],
          data: pickCounts(topNentries)
        }],
        labels: pickDevice(topNentries)
      },
      hint: ''
    }
    var summary = {
      fileName: fileName,
      attackCategory: 'Application Layer',
      analysisName: 'Most used Devices',
      supportedDiagrams: ['PieChart']
    }

    return super.storeAndReturnResult(fileName, fileContent, summary)
  }

  getInterimResults () {
    return this.results
  }

  static aggregateResults (resultA, resultB) {
    throw new NotImplemented('aggregateResults')
  }

  static getAnalysisName () {
    return analysisName
  }
}

function pickCounts (elements) {
  return elements.map(entry => entry.count)
}

function pickDevice (elements) {
  return elements.map(entry => entry.device)
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

module.exports = DeviceAnalyzer
