/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A DatasetsSource represents a list of data sources as triples. */

var Datasource = require('./Datasource');

var rdf  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    dc   = 'http://purl.org/dc/terms/',
    voID = 'http://rdfs.org/ns/void#';

/** Creates a new DatasetsSource. */
function DatasetsSource(baseURL, datasets) {
  this._baseURL = baseURL || '/';
  this._datasets = datasets || {};
}

DatasetsSource.prototype = {
  // Creates triples that represent the specified datasets
  _getAllTriples: function (addTriple, done) {
    // Add metadata for all enabled datasets
    for (var datasetName in this._datasets) {
      var dataset = this._datasets[datasetName];
      if (dataset.enabled !== false) {
        var datasetUrl = this._baseURL + datasetName + '#dataset';
        emitTriple(datasetUrl, rdf  + 'type', voID + 'Dataset');
        emitTriple(datasetUrl, rdfs + 'label', datasetName, true);
        emitTriple(datasetUrl, dc   + 'title', datasetName, true);
        emitTriple(datasetUrl, dc + 'description', dataset.description, true);
      }
    }
    done();
    // Emits a single triple
    function emitTriple(subject, predicate, object, isLiteral) {
      if (subject && predicate && object)
        addTriple({ subject: subject, predicate: predicate,
                    object: isLiteral ? '"' + object + '"' : object });
    }
  },
};
Datasource.extend(DatasetsSource);

module.exports = DatasetsSource;
