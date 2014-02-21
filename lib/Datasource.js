/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A Datasource is a prototype for objects that basic Linked Data Fragments. */

var stream = require('stream'),
    request = require('request'),
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
    var filter = this.tripleFilter(pattern), count = 0;
    this._getAllTriples(addTriple ? function (triple) {
      if (filter(triple))
        addTriple(triple), count++;
    } : _.noop,
    _.once(function (error) {
      if (setCount && !error)
        setCount(count);
      done && done(error);
    }));
  },

  // Retrieves the (approximate) number of triples that match the pattern,
  // returning through callback(error, count)
  count: function (pattern, callback) {
    callback && this.query(pattern, null, callback.bind(null, null), callback);
  },

  // Retrieves the (approximate) number of triples that match the pattern,
  // returning through callback(count) with an estimate if the count cannot be obtained
  _countOrEstimate: function (pattern, callback) {
    callback && this.count(pattern, function (error, count) {
      callback(error ? LARGECOUNTESTIMATE : count);
    });
  },

  // Closes the data source
  close: function () {},

  // Gets all the triples in the dataset,
  // returning individual triples through addTriple
  // and signaling the end of the triple stream through done.
  _getAllTriples: function (addTriple, done) {
    done();
  },

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

  // Performs the specified HTTP request
  request: function (options, errorCallback) {
    var requestStream = request(options);
    requestStream.on('response', function (response) {
      if (response.statusCode >= 300)
        requestStream.emit('error', new Error(response.request.href +
                                              ' returned ' + response.statusCode));
    });
    errorCallback && requestStream.on('error', errorCallback);
    return requestStream;
  },
};

// Makes Datasource the base class of the given class
Datasource.extend = function (ChildClass) {
  var origPrototype = ChildClass.prototype;
  ChildClass.prototype = new Datasource();
  _.extend(ChildClass.prototype, origPrototype);
};

module.exports = Datasource;
