/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* A Datasource provides base functionality for queryable access to a source of quads. */

var fs = require('fs'),
    _ = require('lodash'),
    BufferedIterator = require('asynciterator').BufferedIterator,
    EventEmitter = require('events');

// Creates a new Datasource
function Datasource(options) {
  if (!(this instanceof Datasource))
    return new Datasource();
  EventEmitter.call(this);

  // Set the options
  options = options || {};
  this._request = options.request || require('request');
  this._blankNodePrefix = options.blankNodePrefix || 'genid:';
  this._blankNodePrefixLength = this._blankNodePrefix.length;
  if (options.graph) {
    this._graph = options.graph;
    this._queryGraphReplacements = Object.create(null);
    this._queryGraphReplacements[''] = 'urn:ldf:emptyGraph';
    this._queryGraphReplacements[options.graph] = '';
  }

  // Initialize the datasource asynchronously
  setImmediate(function (self) {
    var done = _.once(function (error) {
      if (error)
        self.emit('error', error);
      else {
        self.initialized = true;
        self.emit('initialized');
      }
    });
    try { self._initialize(done); }
    catch (error) { done(error); }
  }, this);
}
Datasource.prototype = new EventEmitter();

// Makes Datasource the prototype of the given class
Datasource.extend = function extend(child, supportedFeatureList) {
  child.prototype = Object.create(this.prototype);
  child.prototype.constructor = child;
  child.extend = extend;

  // Expose the supported query features
  if (supportedFeatureList && supportedFeatureList.length) {
    var supportedFeatures = {};
    for (var i = 0; i < supportedFeatureList.length; i++)
      supportedFeatures[supportedFeatureList[i]] = true;
    Object.defineProperty(child.prototype, 'supportedFeatures', {
      enumerable: true,
      value: Object.freeze(supportedFeatures),
    });
  }
};

// Whether the datasource can be queried
Datasource.prototype.initialized = false;

// Prepares the datasource for querying
Datasource.prototype._initialize = function (done) {
  done();
};

// The query features supported by this data source
Object.defineProperty(Datasource.prototype, 'supportedFeatures', {
  enumerable: true,
  value: Object.freeze({}),
});

// Checks whether the data source can evaluate the given query
Datasource.prototype.supportsQuery = function (query) {
  // An uninitialized datasource does not support any query
  if (!this.initialized)
    return false;

  // A query is supported if the data source supports all of its features
  var features = query.features, supportedFeatures = this.supportedFeatures, feature;
  if (features) {
    for (feature in features) {
      if (features[feature] && !supportedFeatures[feature])
        return false;
    }
    return true;
  }
  // A query without features is supported if this data source has at least one feature
  else {
    for (feature in supportedFeatures) {
      if (supportedFeatures[feature])
        return true;
    }
    return false;
  }
};

// Selects the quads that match the given query, returning a quad stream
Datasource.prototype.select = function (query, onError) {
  if (!this.initialized)
    return onError && onError(new Error('The datasource is not initialized yet'));
  if (!this.supportsQuery(query))
    return onError && onError(new Error('The datasource does not support the given query'));

  // Translate blank nodes IRIs in the query to blank nodes
  var blankNodePrefix = this._blankNodePrefix, blankNodePrefixLength = this._blankNodePrefixLength;
  if (query.subject && query.subject.indexOf(blankNodePrefix) === 0)
    (query = _.clone(query)).subject = '_:' + query.subject.substr(blankNodePrefixLength);
  if (query.object  && query.object.indexOf(blankNodePrefix) === 0)
    (query = _.clone(query)).object  = '_:' + query.object.substr(blankNodePrefixLength);
  if (query.graph   && query.graph.indexOf(blankNodePrefix) === 0)
    (query = _.clone(query)).graph   = '_:' + query.graph.substr(blankNodePrefixLength);

  // If a custom default graph was set, query it as the default graph
  if (this._graph && (query.graph in this._queryGraphReplacements))
    query.graph = this._queryGraphReplacements[query.graph];

  // Transform the received quads
  var destination = new BufferedIterator(), outputQuads, graph = this._graph;
  outputQuads = destination.map(function (quad) {
    // Translate blank nodes in the result to blank node IRIs
    if (quad.subject[0] === '_')
      quad.subject = blankNodePrefix + quad.subject.substr(2);
    if (quad.object[0]  === '_')
      quad.object  = blankNodePrefix + quad.object.substr(2);
    if (quad.graph) {
      if (quad.graph[0] === '_')
        quad.graph = blankNodePrefix + quad.graph.substr(2);
    }
    // If a custom default graph was set, move default graph triples there
    else if (graph)
      quad.graph = graph;
    return quad;
  });
  outputQuads.copyProperties(destination, ['metadata']);
  onError && outputQuads.on('error', onError);

  // Execute the query
  try { this._executeQuery(query, destination); }
  catch (error) { outputQuads.emit('error', error); }
  return outputQuads;
};

// Writes the results of the query to the given destination
Datasource.prototype._executeQuery = function (query, destination) {
  throw new Error('_executeQuery has not been implemented');
};

// Retrieves a stream through HTTP or the local file system
Datasource.prototype._fetch = function (options) {
  var self = this, stream,
      url = options.url, protocolMatch = /^(?:([a-z]+):)?/.exec(url);
  switch (protocolMatch[1] || 'file') {
  // Fetch a representation through HTTP(S)
  case 'http':
  case 'https':
    stream = this._request(options);
    stream.on('response', function (response) {
      if (response.statusCode >= 300) {
        setImmediate(function () {
          stream.emit('error', new Error(url + ' returned ' + response.statusCode));
        });
      }
    });
    break;
  // Read a file from the local filesystem
  case 'file':
    stream = fs.createReadStream(url.substr(protocolMatch[0].length), { encoding: 'utf8' });
    break;
  default:
    stream = new EventEmitter();
    setImmediate(function () {
      stream.emit('error', new Error('Unknown protocol: ' + protocolMatch[1]));
    });
  }

  // If the stream has no other error handlers attached (besides this one),
  // emit the stream error as a datasource error
  stream.on('error', function (error) {
    if (stream.listenerCount('error') === 1)
      self.emit('error', error);
  });
  return stream;
};

// Closes the data source, freeing possible resources used
Datasource.prototype.close = function (callback) {
  callback && callback();
};

module.exports = Datasource;
