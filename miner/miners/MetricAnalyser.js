const AbstractPCAPAnalyser = require('./AbstractPCAPAnalyser')
const analysisName = 'generic-metrics'

class MetricAnalyser extends AbstractPCAPAnalyser {
  constructor (parser, outPath) {
    super(parser, outPath)
    this.results = {
      srcIps: {},
      dstIps: {},
      srcPorts: {},
      dstPorts: {}
    }
    this.output = {
      start: null,
      end: null,
      duration: null,
      nrOfIPpackets: 0,
      attackSizeInBytes: 0,
      attackBandwidthInBps: 0,
      avgPacketSize: 0,
      nrOfIPv4Packets: 0,
      nrOfIPv6Packets: 0,
      nrOfSrcIps: 0,
      nrOfDstIps: 0,
      nrOfSrcPorts: 0,
      nrOfDstPorts: 0,
      nrOfUDPPackets: 0,
      nrOfTCPPackets: 0,
      udpToTcpRatio: 0,
      nrOfHTTP: 0,
      nrOfICMP: 0
    }
    this.progressPrintCounter = 0
  }

  async setUp () {
    this.pcapParser.on('pcapPacket', this.countPacketSize.bind(this))

    this.pcapParser.on('firstPcapPacket', this.noteStartTime.bind(this))
    this.pcapParser.on('lastPcapPacket', this.noteEndTime.bind(this))

    this.pcapParser.on('ipPacket', this.countIPPackets.bind(this))
    this.pcapParser.on('ipv4Packet', this.countipv4.bind(this))
    this.pcapParser.on('ipv6Packet', this.countipv6.bind(this))

    this.pcapParser.on('transportPacket', this.countPorts.bind(this))
    this.pcapParser.on('udpPacket', this.countUdpPackets.bind(this))
    this.pcapParser.on('tcpPacket', this.counttcpPackets.bind(this))

    this.pcapParser.on('httpPacket', this.countHTTP.bind(this))
    this.pcapParser.on('icmpPacket', this.countICMP.bind(this))
  }

  getName () {
    return 'Miscellaneous Metrics'
  }

  noteStartTime (pcapPacket) {
    this.output.start = pcapPacket.pcap_header.tv_sec
  }

  noteEndTime (pcapPacket) {
    try{

      this.output.end = pcapPacket.pcap_header.tv_sec
      this.output.duration = this.output.end - this.output.start
    } catch (e) {

    }
  }

  countPacketSize (pcapPacket) {
    this.output.attackSizeInBytes += pcapPacket.pcap_header.len
  }

  countHTTP () {
    this.output.nrOfHTTP++
  }

  countICMP () {
    this.output.nrOfICMP++
  }

  countUdpPackets () {
    this.output.nrOfUDPPackets++
  }

  counttcpPackets () {
    this.output.nrOfTCPPackets++
  }

  countPorts (transportPacket) {
    if (transportPacket) {
      try {
        var srcPort = transportPacket.sport
        var dstPort = transportPacket.dport
        var dstExists = this.results.dstPorts.hasOwnProperty(dstPort)
        if (!dstExists) {
          this.results.dstPorts[dstPort] = true
          this.output.nrOfDstPorts++
        }
        var srcExists = this.results.srcPorts.hasOwnProperty(srcPort)
        if (!srcExists) {
          this.results.srcPorts[srcPort] = true
          this.output.nrOfSrcPorts++
        }
      } catch (e) {
        console.log('Unable to process transport-level packet:', transportPacket)
      }
    }
  }

  countIPPackets (ipPacket) {
    var existingEntry
    this.output.nrOfIPpackets++
    try {
      var srcAddress = ipPacket.saddr.addr.join('.')
      existingEntry = this.results.srcIps.hasOwnProperty(srcAddress)

      if (!existingEntry) {
        this.results.srcIps[srcAddress] = true
        this.output.nrOfSrcIps++
      }

      var dstAddress = ipPacket.daddr.addr.join('.')
      existingEntry = this.results.dstIps.hasOwnProperty(dstAddress)

      if (!existingEntry) {
        this.results.dstIps[dstAddress] = true
        this.output.nrOfDstIps++
      }

    } catch (e) {
      console.log('Unable to process IP packet:', ipPacket)
    }
  }

  countipv4 () {
    this.output.nrOfIPv4Packets++
  }

  countipv6 () {
    this.output.nrOfIPv6Packets++
  }

  static postParsingAnalysis (output, baseOutPath) {
    output.attackBandwidthInBps = output.attackSizeInBytes / output.duration
    output.avgPacketSize = output.attackSizeInBytes / output.nrOfIPpackets
    output.udpToTcpRatio = output.nrOfUDPPackets / output.nrOfTCPPackets
    var fileName = `${baseOutPath}-${analysisName}.json`
    var outputToStore = output
    var resultSummary = {
      fileName: fileName,
      attackCategory: 'Network Layer',
      analysisName: 'Miscellaneous Metrics',
      supportedDiagrams: [],
      metrics: outputToStore
    }
    return super.storeAndReturnResult(fileName, outputToStore, resultSummary)
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

module.exports = MetricAnalyser
