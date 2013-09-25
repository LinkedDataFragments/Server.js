// A SparlDatasource fetches triples from a SPARQL endpoint

var request = require('request'),
    q = require('q'),
    N3Parser = require('n3').Parser;

// Creates a new SparqlDatasource for the given endpoint
function N3Datasource(url) {
    this._url = url;
}

N3Datasource.prototype = {

  // Performs the specified HTTP request, returning a promise
  _performRequest: function (options) {
    var deferred = q.defer();
    request(options, function (error, response, body) {
      if (error)
        deferred.reject(new Error(error));
      else if (response.statusCode !== 200)
        deferred.reject(new Error(body));
      else
        deferred.resolve(body);
    });
    return deferred.promise;
  },

  // Queries the file for the given triple pattern
  // Returns a promise for a result object
  query: function (subject, predicate, object) {
    //TODO: expand prefixes
    this._triple = {
        s : subject,
        p : predicate,
        o : object
    };
    // construct the (first few) triples that match the specified pattern
    var triples = this._performRequest({
      url: this._url,
      headers: { accept: 'text/turtle' },
    }).then(this._parseTurtle);

    // return a promise to the combined triples/count object
    return q.all([triples]).spread(function (triples) {
        return { triples: triples, count: triples.length, pattern: pattern };
    });
  },


  // Parses the given Turtle fragment, returning a promise for triples that match the pattern
  _parseTurtle: function(turtle) {
    var deferred = q.defer(),
    triples = [];
    //TODO: this is not the class we would think we are talking about since this function is called from the deferred promise machine. Need help...
    var self = this;
    new N3Parser().parse(turtle, function (error, triple) {
      if (error)
        deferred.reject(new Error(error));
      else if (triple){
        if( (self._triple.s === "" || self._triple.s === triple.subject) &&
          (self._triple.p === "" || self._triple.p === triple.predicate) &&
          (self._triple.o === "" || self._triple.o === triple.object) ){
          triples.push(triple);
        }
      }else
        // no triple means everything has been parsed
        deferred.resolve(triples);
    });
    return deferred.promise;
  },

};

module.exports = N3Datasource;
