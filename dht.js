'use strict'
// Dependencies
const DHT = require('bittorrent-dht')
const ed = require('ed25519-supercop')
const _ = require('lodash')

// DHT organizes peers by infohashes
// We just hardcode to the same hash for all nodes
// to find other newschain peer nodes in the DHT
// `echo "newschain" | shasum`
const HASH = '17dde8f2a853f1653a1b6ff948fc5e30e877ebf1'

// Creates a DHT node on dhtPort
// Announces this server as available on the hyperlogPort
// Returns promise that resolves with the dht node
function createDHTNode (dhtPort, hyperlogPort) {
  return new Promise((resolve, reject) => {
    console.log('Creating DHT node')
    const dht = new DHT({ verify: ed.verify })

    dht.on('error', (error) => {
      console.error(error)
      reject(error)
    })

    // Start listening to the DHT
    dht.listen(dhtPort)
    dht.once('listening', () => {
      console.log('DHT listening on port', dhtPort)

      // Anounce ourselves as a peer
      const announce = () => dht.announce(HASH, hyperlogPort, (err) => {
        if (err) {
          console.log('Failed to announce')
          console.log(err)
          return
        }
        console.log('Announced to DHT')
      })

      // Announce immediately and every 5 minutes
      announce()
      setInterval(announce, 5 * 60 * 1000)
      // Return DHT node now that it's ready
      resolve(dht)
    })
  })
}

// Returns a promise resolving with all hyperlog peers

var getPeersPromise = null

function getPeers (dht) {
  if (getPeersPromise) return getPeersPromise

  getPeersPromise = new Promise((resolve, reject) => {
    console.log('Looking up peers')
    const peers = []

    dht.lookup(HASH, (err, num) => {
      if (err) {
        getPeersPromise = null
        return reject(err)
      }
      getPeersPromise = null
      resolve(_.uniqBy(peers, (p) => p.host + p.port))
    })

    // When we find a new peer
    dht.on('peer', (peer, hash, from) => {
      if (hash.toString('hex') !== HASH) {
        console.log('wrong hash', hash.toString('hex'))
        return
      }
      peers.push(peer)
    })
  })

  return getPeersPromise
}

module.exports = {createDHTNode, getPeers}
