/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An N3Datasource fetches triples from an N3 document */

var request = require('request'),
    q = require('q'),
    _ = require('./Utility'),
    N3Parser = require('n3').Parser;

// Creates a new SparqlDatasource for the given endpoint
function N3Datasource(url) {
  this._url = url;
}

N3Datasource.prototype = {
  // Queries the N3 document for the given triple pattern
  query: function (pattern) {
    var deferred = q.defer(), triples = [], filter = _.tripleFilter(pattern),
        document = request({ url: this._url, headers: { accept: 'text/turtle' }});
    new N3Parser().parse(document, function (error, triple) {
      if (error)
        deferred.reject(new Error(error));
      else if (triple)
        filter(triple) && triples.push(triple);
      else
        deferred.resolve({ triples: triples, total: triples.length });
    });
    return deferred.promise;
  },
};

module.exports = N3Datasource;
