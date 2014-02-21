/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An N3Datasource fetches triples from an N3 document */

var Datasource = require('./Datasource'),
    N3Parser = require('n3').Parser;

// Creates a new SparqlDatasource for the given endpoint
function N3Datasource(url) {
  this._url = url;
}

N3Datasource.prototype = {
  // Gets all the triples in the document
  _getAllTriples: function (addTriple, done) {
    var document = this.request({ url: this._url, headers: { accept: 'text/turtle' }}, done);
    new N3Parser().parse(document, function (error, triple) {
      triple ? addTriple(triple) : done(error);
    });
  },
};
Datasource.extend(N3Datasource);

module.exports = N3Datasource;
