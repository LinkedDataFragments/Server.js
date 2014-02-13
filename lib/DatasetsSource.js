/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A DatasetsSource represents a list of data sources as triples. */

var q = require('q'),
    _ = require('./Utility'),
    N3Parser = require('n3').Parser;

var rdf  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs = 'http://www.w3.org/2000/01/rdf-schema#',
    dc   = 'http://purl.org/dc/terms/',
    voID = 'http://rdfs.org/ns/void#';

/** Creates a new DatasetsSource. */
function DatasetsSource(baseURL, datasets) {
  this._triples = this._createDatasetsTriples(baseURL || '/', datasets);
}

DatasetsSource.prototype = {
  // Finds dataset triples that match the pattern
  query: function (pattern) {
    var triples = _.filterTriples(this._triples, pattern);
    return { triples: triples, total: triples.length };
  },

  // Creates triples that represent the specified datasets
  _createDatasetsTriples: function (baseURL, datasets) {
    var triples = [];
    // Add metadata for all enabled datasets
    for (var datasetName in datasets) {
      var dataset = datasets[datasetName];
      if (dataset.enabled !== false) {
        var datasetUrl = baseURL + datasetName;
        addTriple(datasetUrl, rdf  + 'type', voID + 'Dataset');
        addTriple(datasetUrl, rdfs + 'label', datasetName, true);
        addTriple(datasetUrl, dc   + 'title', datasetName, true);
        addTriple(datasetUrl, dc + 'description', dataset.description, true);
      }
    }
    // Adds a single triple to the output
    function addTriple(subject, predicate, object, isLiteral) {
      if (subject && predicate && object)
        triples.push({ subject: subject, predicate: predicate,
                       object: isLiteral ? '"' + object + '"' : object });
    }
    return triples;
  },
};

module.exports = DatasetsSource;
