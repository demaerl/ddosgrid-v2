const AbstractPcapAnalyser = require('./AbstractPCAPAnalyser')
const UAParser = require('ua-parser-js')
const analysisName = `most-used-browser-and-os-combinations`
const N = 10

class BrowserAndOSAnalyzer extends AbstractPcapAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = []
  }

  // Setup phase, load additional databases, setup subscriptions and signal completion
  async setUp () {
    this.pcapParser.on('httpUserAgent', this.countBrowserAndOSCombination.bind(this))
  }

  countBrowserAndOSCombination (userAgent) {
    try {
      var parsedUA = UAParser(userAgent)

      if (typeof parsedUA.os.name !== 'undefined' && typeof parsedUA.os.version === 'undefined') {
        parsedUA.os.version = '(No Version)'
      }
      if (typeof parsedUA.browser.name === 'undefined') {
        parsedUA.browser.name = 'Undefined Browser'
      }
      if (typeof parsedUA.browser.version === 'undefined') {
        parsedUA.browser.version = ''
      }
      if (typeof parsedUA.os.name === 'undefined') {
        parsedUA.os.name = 'Undefined OS'
      }
      if (typeof parsedUA.os.version === 'undefined') {
        parsedUA.os.version = ''
      }
      var browserAndOSCombination = `${parsedUA.browser.name} on ${parsedUA.os.name} ${parsedUA.os.version}`.trim()
      var exists = this.results.find(item => item.browserOS === browserAndOSCombination)
      if (exists) {
        exists.count++
      } else {
        this.results.push({ browserOS: browserAndOSCombination, count: 1 })
      }
    } catch (e) {
    }
  }

  getName () {
    return `Top ${N} most used Browser and OS Combinations`
  }

  // Actual mining function
  // Post-analysis phase, do additional computation with the collected data and write it out
  static postParsingAnalysis (results, baseOutPath) {
    var mapped = Object.keys(results).map(browserOS => {return { browserOS: browserOS, count: results[browserOS] }})
    var sortedByCount = sortEntriesByCount(mapped)
    var topNentries = getTopN(sortedByCount, N)

    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = {
      // Signal and format to visualize as barchart
      piechart: {
        datasets: [{
          backgroundColor: ['#D33F49', '#77BA99', '#23FFD9', '#27B299', '#831A49'],
          data: pickCounts(topNentries)
        }],
        labels: pickBrowserOS(topNentries)
      },
      hint: ''
    }
    var summary = {
      fileName: fileName,
      attackCategory: 'Application Layer',
      analysisName: 'Most used Browser and OS Combinations',
      supportedDiagrams: ['PieChart']
    }
    return super.storeAndReturnResult(fileName, fileContent, summary)
  }

  getInterimResults () {
    var result = {}
    for (const dict of this.results) {
      result[dict['browserOS']] = dict['count']
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

function pickBrowserOS (elements) {
  return elements.map(entry => entry.browserOS)
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

module.exports = BrowserAndOSAnalyzer
