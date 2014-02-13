/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An LdfDatasource fetches fragments from another LDF server. */

var request = require('request'),
    q = require('q'),
    _ = require('./Utility'),
    N3 = require('n3'),
    UriTemplate = require('uritemplate');

var countPredicate = 'http://rdfs.org/ns/void#triples';

// Creates a new LdfDatasource for the given endpoint
function LdfDatasource(fragmentTemplate) {
  this._fragmentTemplate = UriTemplate.parse(fragmentTemplate);
}

LdfDatasource.prototype = {
  // Queries the N3 document for the given triple pattern
  query: function (pattern) {
    var deferred = q.defer(), triples = [], count = 0, filter = _.tripleFilter(pattern),
        fragmentUrl = this._fragmentTemplate.expand(pattern),
        fragment = request({ url: fragmentUrl, headers: { accept: 'text/turtle' }});
    new N3.Parser().parse(fragment, function (error, triple) {
      if (error)
        deferred.reject(new Error(error));
      else if (!triple)
        deferred.resolve({ triples: triples, total: count || triples.length });
      else {
        // Store the value of the count triple
        if (triple.subject === fragmentUrl && triple.predicate === countPredicate)
          count = parseInt(N3.Util.getLiteralValue(triple.object), 10);
        // Retain those triples that match the pattern
        if (filter(triple))
          triples.push(triple);
      }
    });
    return deferred.promise;
  },
};

module.exports = LdfDatasource;
