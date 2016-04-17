var express = require('express');
var router = express.Router();
var NewsChain = require('../newschain')

var newsChain = new NewsChain(process.argv[2] || 6881, process.argv[3] || 1234)
var jsonStringifyStream = require('streaming-json-stringify')
var map = require('through2-map')
var bluebird = require('bluebird')
var fs = require('fs')
var readFile = bluebird.promisify(fs.readFile)

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'NewsChain' });
});

/* GET editor page. */
router.get('/editor', function(req, res, next) {
  res.render('editor', { title: 'Post An Article' });
});
/* GET feed page. */
router.get('/feed', function(req, res, next) {
  res.render('feed', { title: 'Explore NewsChain' });
});
/* GET a single article page. */
router.get('/article', function(req, res, next) {
  res.render('article', { title: 'Archived NewsChain Article' });
});
/* GET download page. */
router.get('/setup', function(req, res, next) {
  res.render('download-newschain', { title: 'Host Your Own NewsChain Node' });
});
/* GET about page. */
router.get('/about', function(req, res, next) {
  res.render('about-developers', { title: 'About Us' });
});
/* GET product page. */
router.get('/product', function(req, res, next) {
  res.render('about-newschain', { title: 'About NewsChain' });
});

router.post('/api/add', (req, res) => {
  newsChain.add((typeof req.body === 'object') ? JSON.stringify(req.body) : req.body)
  .then((hash) => {
    res.end(hash)
  })
  .catch((err) => res.status(500).end(err.toString()))
})


router.get('/api/get/:id', (req, res) => {
  newsChain.get(req.params.id)
    .then((value) => {
      res.end(JSON.stringify(value))
    })
    .catch((err) => {
      res.status(500).end(err)
    })
})

router.get('/api/get', (req, res) => {
  var stream = newsChain.getHeadsStream()
  stream.on('error', (err) => console.log(err))
  stream
  .pipe(map.obj((node) => {
      return node.key
  }))
  .pipe(jsonStringifyStream())
  .pipe(res)
})

module.exports = router;


// Seed database with some example articles
var articles = [
    'example-articles/chicken-bullying.json',
    'example-articles/chicks-first-60-days.json',
    'example-articles/advice-first-time-chicken-owners.json',
    'example-articles/cleaning-eggs.json',
    'example-articles/protect-chickens-from-eagles.json'
]
Promise.all(articles.map((path) => readFile(path)))
.then((files) => files.map((file) => newsChain.add(file)))
.catch((err) => console.error(err.stack))
