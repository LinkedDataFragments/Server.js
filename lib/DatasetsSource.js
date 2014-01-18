/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A DatasetsSource represents a list of data sources as triples. */

var q = require('q'),
    N3Parser = require('n3').Parser;

var rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    voID = 'http://rdfs.org/ns/void#';

/** Creates a new DatasetsSource. */
function DatasetsSource(baseURL, datasets) {
  this._triples = this._createDatasetsTriples(baseURL || '/', datasets);
}

DatasetsSource.prototype = {
  // Creates triples that represent the specified datasets
  _createDatasetsTriples: function (baseURL, datasets) {
    var triples = [];
    for (var datasetName in datasets) {
      var dataset = datasets[datasetName];
      if (dataset.enabled !== false) {
        triples.push({ subject: baseURL + datasetName,
                       predicate: rdf + 'type',
                       object: voID + 'Dataset' });
      }
    }
    return triples;
  },

  // Returns the dataset triples that match the pattern
  query: function (pattern) {
    var triples = this._triples.filter(function (triple) {
      return ((!pattern.subject   || pattern.subject   === triple.subject) &&
              (!pattern.predicate || pattern.predicate === triple.predicate) &&
              (!pattern.object    || pattern.object    === triple.object));
    });
    return { triples: triples, total: triples.length };
  },
};

module.exports = DatasetsSource;
