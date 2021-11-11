const http = require('http')
const { Server } = require('socket.io')
const clients = new Set()

try {
  setUp()
} catch (e) {
  console.error(e.message)
  process.exit(1)
}

async function setUp() {
  var socket = await createSocketServer()
  console.log('Setup of server complete.')
}

async function createSocketServer() {
  return new Promise(function (resolve, reject) {
    var server = http.createServer()
    var io = new Server(server)

    io.on('connection', (socket) => {
      console.log(`A client connected. ID: ${socket.id}`)
      clients.add(socket)

      socket.emit('startAnalysis')
      resolve(socket)

      socket.on('results', (results) => {
        console.log(`Received result from client (ID: ${socket.id}):`)
        console.log(results)
      })

      socket.on('disconnect', () => {
        console.log(`A client disconnected. ID: ${socket.id}`)
      })
    })

    server.listen(3000, () => {
      console.log('Server listening on *:3000. Waiting for client to connect...')
    })
  })
}