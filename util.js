'use strict'
const Promise = require('bluebird')
const getIP = Promise.promisify(require('external-ip')())

module.exports = {getIP}
