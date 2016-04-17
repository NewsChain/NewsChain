var ed = require('../')
var path = require('path')
var concat = require('concat-stream')
var kp = require(path.resolve(process.argv[2]))

process.stdin.pipe(concat(function (body) {
  var sig = ed.sign(body, kp.publicKey, kp.secretKey)
  console.log(sig.toString('hex'))
}))
