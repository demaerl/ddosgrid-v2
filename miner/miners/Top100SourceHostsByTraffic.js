const IPToASN = require('ip-to-asn')
const AbstractPcapAnalyser = require('./AbstractPCAPAnalyser')
const N = 100
const analysisName = `top-${N}-source-hosts-by-traffic`
const whois = new IPToASN()

class Top100SourceHostsAnalyser extends AbstractPcapAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = {
      // store interim results here
      // { addr: '1.2.3.4', count: 1 }
    }
  }

  // Setup phase, load additional databases, setup subscriptions and signal completion
  async setUp () {
    this.pcapParser.on('ipv4Packet', this.countIPv4Address.bind(this))
  }

  countIPv4Address (ipv4Packet) {
    var srcAddress = ipv4Packet.saddr.addr.join('.')
    var existingEntry = this.results.hasOwnProperty(srcAddress)

    if (existingEntry) {
      this.results[srcAddress]++
    } else {
      this.results[srcAddress] = 1
    }
  }

  getName () {
    return `Top ${N} source hosts (IPv4)`
  }

  // Actual mining function
  // Post-analysis phase, do additional computation with the collected data and write it out
  static async postParsingAnalysis (results, baseOutPath) {
    var mapped = Object.keys(results).map(addr => {return { addr: addr, count: results[addr] }})
    var sortedByCount = sortEntriesByCount(mapped)
    var topNentries = getTopN(sortedByCount, N)

    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = {
      // Signal and format to visualize as worldmap
      worldmap: await formatLabelsForWorldMap(topNentries),
      hint: 'The labels of this chart have been computed using temporally sensitive data'
    }
    var summary = {
      fileName: fileName,
      attackCategory: 'Network Layer',
      analysisName: `Top ${N} sources by traffic`,
      supportedDiagrams: ['WorldMap']
    }
    return super.storeAndReturnResult(fileName, fileContent, summary)
  }

  getInterimResults () {
    return this.results
  }

  formatData (elements) {
    return elements.map(entry => entry.count)
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

async function formatLabelsForWorldMap (addressesCounted) {
  var countedCountries = { }
  var addresses = addressesCounted.map(resultItem => resultItem.addr)
  return new  Promise((resolve, reject) => {
    whois.query(addresses, function (err, results) {
      if (err) { reject(err) }
      for (var address in results) {
        var resultItem = addressesCounted.find(resultItem => resultItem.addr === address)
        var ipresult = results[address]
        var countryCode = ipresult.countryCode
        if(countryCode && resultItem) {
          if (hasProp(countedCountries, countryCode)) {
            countedCountries[countryCode] += resultItem.count
          } else {
            countedCountries[countryCode] = resultItem.count
          }
        }
      }
      resolve(countedCountries)
    })
  })
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

function tryFormatCountry (countryString) {
  try {
    // This just removes the whitespace and duplicates if exist
    var containsWhiteSpace = countryString.substring(' ') === -1
    if(containsWhiteSpace) {
      return countryString
    } else {
      return countryString.split(' ')[0]
    }
  } catch (e) {
    return countryString
  }
}

function hasProp (target, prop) {
  return Object.prototype.hasOwnProperty.call(target, prop)
}

module.exports = Top100SourceHostsAnalyser
