/*! @license ©2013 Pieter Colpaert - Multimedia Lab / iMinds / Ghent University */

/** A LevelGraphDatasource fetches triples from a LevelGraph database */

var request = require('request'),
    q = require('q'),
    levelup = require('level'),
    levelgraph = require('levelgraph');

// Creates a new LevelGraphDataSource for a given dbname
function LevelGraphDatasource(dbname) {
  var levelDatabase = levelup(dbname);
  levelDatabase.on('error', function (error) { process.stderr.write(error + '\n'); });
  this._db = levelgraph(levelDatabase);
}

LevelGraphDatasource.prototype = {

  // Queries the file for the given triple pattern
  // Returns a promise for a result object
  query: function (pattern) {
    this._MAXTRIPLESPERPAGE = 1000; //this should be removed in new architecture where all triples are given through streams
    this._pattern = pattern;

    //a promise for triples
    var self = this;
    var triples = this._getFromDB(this._pattern);
    var count = this._countFromDB(this._pattern);

    // return a promise to the combined triples/count object
    return q.spread([triples, count], function (triples, count) {
      return { triples: triples, total: count };
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
