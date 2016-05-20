/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** An Index provides base functionality for indexed access to a data (sub)set. */

var fs = require('fs'),
    _ = require('lodash'),
    Readable = require('stream').Readable,
    EventEmitter = require('events');

// Creates a new Index
function Index(options) {
  if (!(this instanceof Index))
    return new Index();
  EventEmitter.call(this);

  // Set the options
  options = options || {};
  this.reduced = options.reduced || true; // reduced: if dimensional resources can only be requested from the final index level
  this.settings = options || {};

  // Initialize the index asynchronously
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
Index.prototype = new EventEmitter();

// Makes Index the prototype of the given class
Index.extend = function extend(child, supportedFeatureList) {
  child.prototype = Object.create(this.prototype);
  child.prototype.constructor = child;
  child.extend = extend;
};

// Prepares the datasource for querying
Index.prototype._initialize = function (done) {
  done();
};

// Checks whether the data index can handle the given query
Index.prototype.supportsQuery = function (query) {
  return query.index == this.settings.id;
};

// Selects the triples that match the given query, returning a triple stream
Index.prototype.select = function (query, onError) {
  if (!this.initialized)
    return onError && onError(new Error('The index is not initialized yet'));

  // Create the triple stream
  var tripleStream = new Readable({ objectMode: true });
  tripleStream._read = noop;
  tripleStream._push = tripleStream.push;
  tripleStream.push = function (triple) {
    this._push(triple);
  };
  onError && tripleStream.on('error', onError);

  // Execute the query
  try {
    var settings = {};
    settings.navigation = this._deriveNavigation(query);
    settings.rangeUri = query.rangeUri;
    var isRangeGate = query.rangeGate;
    var metadataEmitter = function (metadata) {
      setImmediate(function () { tripleStream.emit('metadata', metadata); });
    };
    if(isRangeGate) {
      settings.bounds = this._deriveBounds(query);
      this._queryRangeGates(settings, tripleStream, metadataEmitter);
    } else {
      this._queryDimensionalResources(query, settings, tripleStream, metadataEmitter);
    }
  }
  catch (error) { tripleStream.emit('error', error); }
  return tripleStream;
};

// Derive the navigation array from the given query.
// This defines depends on the fragmentation strategy
Index.prototype._deriveNavigation = function (query) {
  return query.rangePath;
};

// Check if this index is applicable for the given query
Index.prototype._isApplicable = function (query) {
  throw new Error('_isApplicable has not been implemented');
};

// Derive the upper and lower bound from the given query.
Index.prototype._deriveBounds = function (query) {
  return query.rangeGateBounds;
};

// Writes the results (matching range fragments) of the range gate query to the given triple stream
Index.prototype._queryRangeGates = function (settings, tripleStream, metadataCallback) {
  throw new Error('_queryRangeGates has not been implemented');
};

// Writes the results (matching dimensional resources) of the range fragment query to the given triple stream
Index.prototype._queryDimensionalResources = function (query, settings, tripleStream, metadataCallback) {
  throw new Error('_queryDimensionalResources has not been implemented');
};

// Closes the data source, freeing possible resources used
Index.prototype.close = function (callback) {
  callback && callback();
};

// The empty function
function noop() {}

module.exports = Index;
