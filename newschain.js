'use strict'

var hyperlog = require('hyperlog')
var levelup = require('levelup')
var net = require('net')
var DHT = require('./dht')
var util = require('./util')

function getAddress (socket) {
  return socket.remoteAddress + ':' + socket.remotePort
}

function shortenString (target) {
  if (!target) return null
  if (target.length < 50) return target
  return target.substring(0, 47) + '...'
}

/**
 * Initialize the Merkel DAG service.
 * @param  {Number} port The port to listen for updates at.
 */
var NewsChain = function (dhtPort, hyperlogPort) {
  this.port = hyperlogPort || 1234
  this.dhtPort = dhtPort

  // Initialize the database.
  this.db = levelup('newschain', {
    db: require('memdown')
  })

  // Initialize hyperlog logger.
  this.log = hyperlog(this.db)

  // Log every time a value is added to the NewsChain.
  this.log.on('add', (node) => console.log('Added node:', node.key, '->', shortenString(node.value.toString())))

  this.dht = null

  // Initialize the list of peers to update / retrieve updates from.
  this.peers = []

  this.connections = {}

  util.getIP()
    .then((ip) => {
      this.ip = ip

      // Listen for connections that will trigger updates to the Merkle DAG.
      net.createServer((socket) => {
        // Ignore connections to self
        if (socket.localAddress === socket.remoteAddress && this.port === socket.localPort) {
          socket.destroy()
          return
        }

        console.log('Received connection from ', getAddress(socket))
        this.connections[getAddress(socket)] = socket

        socket.on('close', () => {
          console.log('Disconnected from ', getAddress(socket))
          delete this.connections[getAddress(socket)]
        })

        socket.on('error', (err) => {
          console.error('Error from ', getAddress(socket))
          console.error(err)
          replicatedLogSocket.destroy()
          delete this.connections[getAddress(socket)]
        })

        var replicatedLogSocket = this.log.replicate({live: true})
        replicatedLogSocket.pipe(socket).pipe(replicatedLogSocket)
        replicatedLogSocket.on('error', (err) => {
          console.log('Log replication error')
          console.error(err)
          socket.destroy()
        })
      }).listen(this.port)

      console.log(`Hyperlog listening on port ${this.port}`)

      this.updatePeers()
        .catch((err) => {
          console.error(err)
        })
      setInterval(() => {
          this.updatePeers()
            .catch((err) => {
              console.error(err)
            })
      }, 5 * 60 * 1000)
    })
    .catch((err) => console.error('Failed to get external IP.', err))
}

/**
 * Adds an entry to the NewsChain.
 * @param {String}           value The value to add to the NewsChain.
 * @param {String|undefined} link  Optional link to a parent value.
 */
NewsChain.prototype.add = function (value, link) {
  if (!value) {
    return Promise.reject('Value is required')
  }

  // Add the value to the Merkle DAG.
  return new Promise((resolve, reject) => {
    this.log.add(link || null, value, (err, node) => {
      if (err) return reject(err)
      resolve(node.key)
    })
  })
}

/**
 * Gets a value by its key.
 * @param  {string}   key      The key for the value.
 */
NewsChain.prototype.get = function (key) {
  if (!key) {
    return Promise.reject('No key/hash provided')
  }

  return new Promise((resolve, reject) => {
    this.log.get(key, null, (err, node) => {
      if (err) return reject(err)
      resolve(node.value.toString())
    })
  })
}

/**
 * Gets a list of all head nodes.
 * @param  {Function} callback Callback function with the nodeList as the arg.
 */
NewsChain.prototype.getHeads = function () {
  return new Promise((resolve, reject) => {
    this.log.heads(null, (err, nodes) => {
      if (err) return reject(err)
      resolve(nodes)
    })
  })
}

/**
 * Returns a stream of all heads
 * @param  {Function} callback Callback function with the nodeList as the arg.
 */
NewsChain.prototype.getHeadsStream = function () {
  return this.log.heads()
}

NewsChain.prototype.updatePeers = function () {
  var promise = Promise.resolve(this.dht)
  if (!this.dht) {
    promise = DHT.createDHTNode(this.dhtPort, this.port)
  }

  return promise.then((dhtNode) => {
    this.dht = dhtNode
    return DHT.getPeers(this.dht)
  })
    .then((peerList) => {
      console.log('Connected to peers: ', peerList)
      this.peers = peerList

      this.peers
        .filter((peer) => !this.connections[peer.host + ':' + peer.port])
        .filter((peer) => peer.host !== this.ip)
        .forEach((peer) => {
          var socket = new net.Socket()
          socket.connect({
            host: peer.host,
            port: peer.port
          })
          var replicatedLogSocket = this.log.replicate({live: true})

          socket.on('connect', () => {
            console.log('Connected to ', getAddress(socket))
            this.connections[getAddress(socket)] = socket

            replicatedLogSocket.pipe(socket).pipe(replicatedLogSocket)
            replicatedLogSocket.on('error', (err) => {
              console.log('Log replication error')
              console.error(err)
              socket.destroy()
            })
          })
          socket.on('close', () => {
            console.log('Disconnected from', getAddress(socket))
            delete this.connections[getAddress(socket)]
          })
          socket.on('error', (err) => {
            console.error('Disconnected due to error from', getAddress(socket))
            console.error(err)
            delete this.connections[getAddress(socket)]
            replicatedLogSocket.destroy()
          })
        })
    })
}

module.exports = NewsChain
