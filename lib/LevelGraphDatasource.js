// The LevelGraph-n3 to LDF written by Pieter Colpaert

var request = require('request'),
    q = require('q'),
    levelup = require('level'),
    levelgraph = require('levelgraph');
// Creates a new LevelGraphDataSource for a given dbname
function LevelGraphDatasource(dbname) {
  this._dbname = dbname;
  this._db = levelgraph(levelup(this._dbname));
}

LevelGraphDatasource.prototype = {

  // Queries the file for the given triple pattern
  // Returns a promise for a result object
  query: function (subject, predicate, object) {
    this._MAXTRIPLESPERPAGE = 1000; //this should be removed in new architecture where all triples are given through streams

    //TODO: expand prefixes
    this._triple = {};
    if (subject) {
      if (subject.substr(0, 1) === '<')
        subject = subject.substr(1, subject.length - 2);
      this._triple.subject = subject;
    }
    if (predicate) {
      if (predicate.substr(0, 1) === '<')
        predicate = predicate.substr(1, predicate.length - 2);
      this._triple.predicate = predicate;
    }
    if (object) {
      if (object.substr(0, 1) === '<' || object.substr(0, 1) === '"')
        object = object.substr(1, object.length - 2);
      this._triple.object = object;
    }

    var self = this;

    //a promise for triples
    var triples = this._getFromDB(this._triple);
    var count = this._countFromDB(this._triple);

    // return a promise to the combined triples/count object
    return q.all([triples, count]).spread(function (triples, count) {
      var pattern = (self._triple.subject || '?s') + ' ' + (self._triple.predicate || '?p') + ' ' + (self._triple.object || '?o') + ' ' + '.';
      return { triples: triples, count: count, pattern: pattern };
    });
  },
  _getFromDB: function (bgp) {
    var deferred = q.defer();
    var triples = [];
    var count = 0;
    var triplestream = this._db.getStream(bgp);
    var self = this;
    triplestream.on('data', function (triple) {
      triples.push(triple);
      if (count + 1 === self._MAXTRIPLESPERPAGE) {
        // cut the stream and resolve the promise
        deferred.resolve(triples);
        triplestream.end();
      }
      count ++;
    });
    triplestream.on('end', function () {
      deferred.resolve(triples);
    });

    return deferred.promise;
  },
  _countFromDB: function (bgp) {
    var deferred = q.defer();
    var count = 0;
    var triplestream = this._db.getStream(bgp);
    var self = this;
    triplestream.on('data', function (triple) {
      count++;
    });
    triplestream.on('end', function () {
      deferred.resolve(count);
    });

    return deferred.promise;
  }
};

module.exports = LevelGraphDatasource;
