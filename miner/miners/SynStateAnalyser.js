const AbstractPCAPAnalyser = require('./AbstractPCAPAnalyser')
const analysisName = 'synfloodanalysis'

class SynStateAnalyser extends AbstractPCAPAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = {
      nrOfPacketsInSynState: 0,
      nrOfPacketsInSynAckState: 0,
      nrOfPacketsInFinState: 0,
      nrOfPacketsInFinAckState: 0,
      nrOfPacketsInAckState: 0,
      nrOfPacketsInRemainingStates: 0,
      nrOfTransportPackets: 0
    }
  }

  // Setup phase, load additional databases, setup subscriptions and signal completion
  async setUp () {
    this.pcapParser.on('tcpPacket', this.checkState.bind(this))
  }

  getName () {
    return 'Connection states of TCP segments'
  }

  // Actual mining function
  checkState (transportPacket) {
    this.results.nrOfTransportPackets++
    if (!transportPacket) {
      return
    }
    try {
      var syn = transportPacket.flags.syn
      var ack = transportPacket.flags.ack
      var fin = transportPacket.flags.fin
      if (syn && !ack) {
        this.results.nrOfPacketsInSynState++
      } else if (syn && ack) {
        this.results.nrOfPacketsInSynAckState++
      } else if (fin && !ack) {
        this.results.nrOfPacketsInFinState++
      } else if (fin && ack) {
        this.results.nrOfPacketsInFinAckState++
      } else if (ack && !(fin || syn)) {
        this.results.nrOfPacketsInAckState++
      } else {
        this.results.nrOfPacketsInRemainingStates++
      }
    } catch (e) {
      console.error('Unable to analyse packet', transportPacket)
    }
  }

  // Post-analysis phase, do additional computation with the collected data and write it out
  static postParsingAnalysis (results, baseOutPath) {
    var fileName = `${baseOutPath}-${analysisName}.json`
    var fileContent = {
      piechart: {
        datasets: [{
          backgroundColor: ['#DB0071', '#005FD0', '#b967ff', '#fffb96', '#8daa91', '#05ffa1'],
          data: [
            results.nrOfPacketsInSynState,
            results.nrOfPacketsInSynAckState,
            results.nrOfPacketsInFinState,
            results.nrOfPacketsInFinAckState,
            results.nrOfPacketsInAckState,
            results.nrOfPacketsInRemainingStates
          ]
        }],
        labels: ['SYN', 'SYN/ACK', 'FIN', 'FIN/ACK', 'ACK', 'Other']
      }
    }
    var summary = {
      fileName: fileName,
      attackCategory: 'Transport Layer',
      analysisName: 'State of TCP packets',
      supportedDiagrams: ['PieChart']
    }
    return super.storeAndReturnResult(fileName, fileContent, summary)
  }

  getInterimResults() {
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

module.exports = SynStateAnalyser
