var http = require('http');
var fs = require('fs');

var uglify = require('uglify-js');
var winston = require('winston');
var connect = require('connect');
var route = require('connect-route');
var connect_st = require('st');
var connect_rate_limit = require('./connect-ratelimit');

var DocumentHandler = require('./lib/document_handler');

// Load the configuration and set some defaults
const configPath = process.argv.length <= 2 ? 'config.js' : process.argv[2];
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.port = process.env.PORT || config.port || 7777;
config.host = process.env.HOST || config.host || 'localhost';

// Set up the logger
if (config.logging) {
  try {
    winston.remove(winston.transports.Console);
  } catch(e) {
    /* was not present */
  }

  var detail, type;
  for (var i = 0; i < config.logging.length; i++) {
    detail = config.logging[i];
    type = detail.type;
    delete detail.type;
    winston.add(winston.transports[type], detail);
  }
}

// build the store from the config on-demand - so that we don't load it
// for statics
if (!config.storage) {
  config.storage = { type: 'file' };
}
if (!config.storage.type) {
  config.storage.type = 'file';
}

var Store, preferredStore;

if (process.env.REDISTOGO_URL && config.storage.type === 'redis') {
  var redisClient = require('redis-url').connect(process.env.REDISTOGO_URL);
  Store = require('./lib/document_stores/redis');
  preferredStore = new Store(config.storage, redisClient);
}
else {
  Store = require('./lib/document_stores/' + config.storage.type);
  preferredStore = new Store(config.storage);
}

// Compress the static javascript assets
if (config.recompressStaticAssets) {
  var list = fs.readdirSync('./static');
  for (var j = 0; j < list.length; j++) {
    var item = list[j];
    if ((item.indexOf('.js') === item.length - 3) && (item.indexOf('.min.js') === -1)) {
      var dest = item.substring(0, item.length - 3) + '.min' + item.substring(item.length - 3);
      var orig_code = fs.readFileSync('./static/' + item, 'utf8');

      fs.writeFileSync('./static/' + dest, uglify.minify(orig_code).code, 'utf8');
      winston.info('compressed ' + item + ' into ' + dest);
    }
  }
}

// Send the static documents into the preferred store, skipping expirations
var path, data;
for (var name in config.documents) {
  path = config.documents[name];
  data = fs.readFileSync(path, 'utf8');
  winston.info('loading static document', { name: name, path: path });
  if (data) {
    preferredStore.set(name, data, function(cb) {
      winston.debug('loaded static document', { success: cb });
    }, true);
  }
  else {
    winston.warn('failed to load static document', { name: name, path: path });
  }
}

// Pick up a key generator
var pwOptions = config.keyGenerator || {};
pwOptions.type = pwOptions.type || 'random';
var gen = require('./lib/key_generators/' + pwOptions.type);
var keyGenerator = new gen(pwOptions);

// Configure the document handler
var docHandlerOptions = config.documentHandler || {};
docHandlerOptions.keyLength = docHandlerOptions.keyLength || 10;
docHandlerOptions.keyGenerator = keyGenerator;
docHandlerOptions.preferredStore = preferredStore;
docHandlerOptions.restrictOwners = config.restrictOwners;
var documentHandler = new DocumentHandler(docHandlerOptions);

// Set up rate limiting middleware for POST requests
if (config.rateLimitsPost) {
  var postRateLimit = connect_rate_limit(config.rateLimitsPost);
  config.rateLimitsPost.end = true;

  app.use(route.post('/documents', postRateLimit));
}

// Configure the connect app
var app = connect()
  .use(connect.query())
  .use(connect_st({ path: './static', url: '/static' }))
  .use(route(function (app) {
    app.get('/', documentHandler.handleIndex.bind(documentHandler));
    app.post('/documents', documentHandler.handleDocumentCreate.bind(documentHandler));
    app.get('/:id([a-zA-Z0-9]{8})', documentHandler.handleDocumentGet.bind(documentHandler));
    app.get('/:id([a-zA-Z0-9]{8}).:ext([a-zA-Z]{1,5})', documentHandler.handleDocumentGet.bind(documentHandler));
    app.delete('/:id([a-zA-Z0-9]{8})', documentHandler.handleDocumentDelete.bind(documentHandler));
  }));

  
http.createServer(app).listen(config.port, config.host, function(){
  winston.info('listening on ' + config.host + ':' + config.port);
});