var ed = require('../')
var kp = ed.createKeyPair(ed.createSeed())
console.log(JSON.stringify({
  secretKey: kp.secretKey.toString('hex'),
  publicKey: kp.publicKey.toString('hex')
}))
