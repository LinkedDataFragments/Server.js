var Datasource = require('./Datasource'),
    N3 = require('n3'),
    path = require('path'),
    fs = require('fs'),
    Bloem  = require('bloem').Bloem;

var ACCEPT = 'text/turtle;q=1.0,application/n-triples;q=0.7,text/n3;q=0.6';

var DCT = 'http://purl.org/dc/terms/',
    AMF = 'http://semweb.mmlab.be/ns/membership#',
    DS = 'http://semweb.mmlab.be/ns/summaries#';

// Creates a new SummaryDatasource
function SummaryDatasource(options) {
  if (!(this instanceof SummaryDatasource))
    return new SummaryDatasource(options);
  Datasource.call(this, options);

  // Settings for data summaries
  this._summariesFolder = options.dir || '../../summaries';
}
Datasource.extend(SummaryDatasource, ['triplePattern', 'limit', 'offset']);

// Prepares the datasource for querying
SummaryDatasource.prototype._initialize = function (done) {
  var tripleStore = this._tripleStore = new N3.Store();
  var parser = new N3.Parser();
  var filters = this._filters = {};
  var self = this;

  fs.readdir(this._summariesFolder, function (err, items) {
    if (err) {
      done(err);
      return;
    }

    // Store every summary in the store
    items.forEach(function (summaryFile) {
      var document = self._fetch({ url: path.join(self._summariesFolder, summaryFile), headers: { accept: ACCEPT } }, done);
      // N3Parser._resetBlankNodeIds();
      parser.parse(document, function (error, triple) {
        if (error) {
          done(error);
          return;
        }
        
        if (triple)
          tripleStore.addTriple(triple.subject, triple.predicate, triple.object, summaryFile);
        else {
          // Create AMFs
          self._storeFilters();
          done();
        }
      });
    });
  });
};

SummaryDatasource.prototype._storeFilters = function () {
  var filterQuads = this._tripleStore.find(null, DS + 'objFilter', null);

  filterQuads.forEach(function (quad) {
    var bitsString = this._tripleStore.find(quad.object, AMF + 'bits', null)[0].object;
    var bits = parseInt(N3.Util.getLiteralValue(bitsString), 10);

    var hashesString = this._tripleStore.find(quad.object, AMF + 'hashes', null)[0].object;
    var hashes = parseInt(N3.Util.getLiteralValue(hashesString), 10);

    // Decode filter
    var filterString = this._tripleStore.find(quad.object, AMF + 'filter', null)[0].object;
    var filter = Buffer.from(N3.Util.getLiteralValue(filterString), 'base64');

    // Find predicate
    var predicate = this._tripleStore.find(quad.subject, DS + 'predicate', null, quad.graph)[0].object;

    this._filters[predicate] = this._filters[predicate] || {}; // create entry for predicate if not exists
    this._filters[predicate][quad.graph] = new Bloem(bits, hashes, filter); // add filter for the summary
  });
};

SummaryDatasource.prototype._findSources = function (term, predicate) {
  var filters = predicate ? [predicate] : Object.keys(this._filters);
  var sources = [];
  for (var i = 0; i < filters.length; i++) {
    var filter = this._filters[filters[i]];
    for (var source in filter) {
      if (filter[source].has(Buffer.from(term)) && sources.indexOf(source) < 0)
        sources.push(source);
    }
  }
  return sources;
};

// Writes the results of the query to the given triple stream
SummaryDatasource.prototype._executeQuery = function (query, destination) {
  var offset = query.offset || 0, limit = query.limit || Infinity,
      triples = this._tripleStore.findByIRI(query.subject, query.predicate, query.object);

  if (query.subject && query.predicate === DCT + 'isPartOf') {
    triples = this._findSources(query.subject).map(function (source) {
      return {
        subject: query.subject,
        predicate: query.predicate,
        object: source,
      };
    });
  }

  // Send the metadata
  destination.setProperty('metadata', { totalCount: triples.length, hasExactCount: true });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, triples.length); i < l; i++)
    destination._push(triples[i]);
  destination.close();
};



module.exports = SummaryDatasource;
