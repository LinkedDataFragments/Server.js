/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A Datasource is a prototype for objects that basic Linked Data Fragments. */

var stream = require('stream'),
    request = require('request'),
    fs = require('fs'),
    _ = require('lodash');

// Estimate count given when the actual number cannot be obtained
var LARGECOUNTESTIMATE = 500000000;

// Creates a new Datasource
function Datasource() {}

Datasource.prototype = {
  // Queries the datasource for the given triple pattern,
  // returning individual triples through addTriple(triple),
  // count metadata trough setCount(count),
  // and signaling the end of the triple stream through done(error)
  query: function (pattern, addTriple, setCount, done) {
    this._query(pattern || {},
                _.isFunction(addTriple) ? addTriple : null,
                _.isFunction(setCount) ? _.once(setCount) : _.noop,
                _.isFunction(done) ? _.once(done) : _.noop);
  },

  // Internal `query`, guarantees callbacks (except addTriple) are single-call functions.
  // Returns filtered output from `_getAllTriples` by default.
  _query: function (pattern, addTriple, setCount, done) {
    var filter = this.tripleFilter(pattern), count = 0;
    this._getAllTriples(function (triple) {
      if (filter(triple))
        count++, addTriple && addTriple(triple);
    },
    function (error) {
      error || setCount(count);
      done(error);
    });
  },

  // Gets all the triples in the dataset,
  // returning individual triples through addTriple
  // and signaling the end of the triple stream through done.
  _getAllTriples: function (addTriple, done) {
    done();
  },

  // Retrieves the (approximate) number of triples that match the pattern,
  // returning through callback(error, count)
  count: function (pattern, callback) {
    _.isFunction(callback) && this._count(pattern || {}, _.once(callback));
  },

  // Internal `_count`, guarantees the callback is a single-call function
  _count: function (pattern, callback) {
    this._query(pattern, null, callback.bind(null, null), callback);
  },

  // Retrieves the (approximate) number of triples that match the pattern,
  // returning through callback(count) with an estimate if the count cannot be obtained
  _countOrEstimate: function (pattern, callback) {
    _.isFunction(callback) && this._count(pattern || {}, _.once(function (error, count) {
      callback(error ? LARGECOUNTESTIMATE : count);
    }));
  },

  // Closes the data source
  close: function () {},

  // Creates a filter for triples that match the given triple pattern
  tripleFilter: function (pattern) {
    return function (triple) {
      return ((!pattern.subject   || pattern.subject   === triple.subject) &&
              (!pattern.predicate || pattern.predicate === triple.predicate) &&
              (!pattern.object    || pattern.object    === triple.object));
    };
  },

  // Filters those elements of the array that match the given triple pattern
  filterTriples: function (array, pattern) {
    return array.filter(this.tripleFilter(pattern));
  },

  // Performs the specified HTTP or file request
  request: function (options, errorCallback) {
    var stream;
    // Fetch a representation through HTTP
    if (/^https?:\/\//.test(options.url)) {
      stream = request(options);
      stream.on('response', function (response) {
        if (response.statusCode >= 300)
          setImmediate(stream.emit.bind(stream, 'error',
                       new Error(response.request.href + ' returned ' + response.statusCode)));
      });
    }
    // Read a file from the local filesystem
    else {
      stream = fs.createReadStream(options.url.replace(/^file:\/\//, ''), { encoding: 'utf8' });
    }
    // Always attach _some_ error handler (errorCallback might be detached later)
    stream.once('error', _.noop);
    errorCallback && stream.once('error', errorCallback);
    return stream;
  },
};

// Makes Datasource the base class of the given class
Datasource.extend = function (ChildClass) {
  var origPrototype = ChildClass.prototype;
  ChildClass.prototype = new Datasource();
  _.extend(ChildClass.prototype, origPrototype);
};

module.exports = Datasource;
