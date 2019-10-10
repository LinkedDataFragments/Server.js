var Datasource = require('./Datasource'),
    N3 = require('n3'),
    path = require('path'),
    fs = require('fs'),
    Bloem  = require('bloem').Bloem,
    chokidar = require('chokidar');

var ACCEPT = 'text/turtle;q=1.0,application/n-triples;q=0.7,text/n3;q=0.6';

var RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    DCT = 'http://purl.org/dc/terms/',
    AMF = 'http://semweb.mmlab.be/ns/membership#',
    DS = 'http://semweb.mmlab.be/ns/summaries#';

// Creates a new SummaryDatasource
function SummaryDatasource(options) {
  if (!(this instanceof SummaryDatasource))
    return new SummaryDatasource(options);
  Datasource.call(this, options);

  // Settings for data summaries
  this._summariesFolder = (options.dir && path.isAbsolute(options.dir)) ? options.dir : path.join(__dirname, options.dir || '../../summaries');
}
Datasource.extend(SummaryDatasource, ['triplePattern', 'limit', 'offset']);

// Prepares the datasource for querying
SummaryDatasource.prototype._initialize = function (done) {
  this._tripleStore = new N3.Store();
  // var parser = new N3.Parser();
  // var self = this;
  
  // If summaryDir does not exist, create it
  if (!fs.existsSync(this._summariesFolder)) {
    fs.mkdirSync(this._summariesFolder, { recursive: true });
  }

  // Initialize watcher.
  var watcher = chokidar.watch(this._summariesFolder, {
    ignored: /(^|[\/\\])\../,
    persistent: true
  });

  console.log(`Watching  ${this._summariesFolder}`)
  watcher.on('add', (summaryFile) => this._storeFile(summaryFile, err => console.log(err)));
  done();
};

SummaryDatasource.prototype._storeFile = function (summaryFile, callback) {
  console.log(`Adding  ${summaryFile} to store`)
  var parser = new N3.Parser();
  
  var document = this._fetch({ url: summaryFile, headers: { accept: ACCEPT } }, callback);
  var tripleStore = this._tripleStore;
  var self = this;
  // N3Parser._resetBlankNodeIds();

  var graph = decodeURIComponent(summaryFile);
  parser.parse(document, function (error, triple) {
    if (error) {
      callback && callback(error);
      return;
    }
    
    if (triple)
      tripleStore.addTriple(triple.subject, triple.predicate, triple.object, graph);
    else {
      tripleStore.addTriple(graph, RDF + 'type' , DS + 'Summary', graph);
      // Create AMFs
      console.log(`Storing filters of ${graph}`)
      self._storeFilter(graph);
      callback && callback(null);
    }
  });
}

SummaryDatasource.prototype._storeFilter = function (graph) {
  var filters = this._filters = {};
  var tripleStore = this._tripleStore;

  var filterQuads = tripleStore.find(null, DS + 'objFilter', null, graph);
  console.log(`Found ${filterQuads.length} filters for ${graph}`)
  filterQuads.forEach(function (quad) {
    try {
      var bitsMatches = tripleStore.find(quad.object, AMF + 'bits', null, graph);
      
      if (bitsMatches.length === 0) return;

      var bitsString = bitsMatches[0].object;
      var bits = parseInt(N3.Util.getLiteralValue(bitsString), 10);

      var hashesMatches = tripleStore.find(quad.object, AMF + 'hashes', null, graph);

      if (hashesMatches.length === 0) return;

      var hashesString = hashesMatches[0].object;
      var hashes = parseInt(N3.Util.getLiteralValue(hashesString), 10);

      // Decode filter
      var filterMatches = tripleStore.find(quad.object, AMF + 'filter', null, graph);

      if (filterMatches.length === 0) return;

      var filterString = filterMatches[0].object;
      var filter = Buffer.from(N3.Util.getLiteralValue(filterString), 'base64');

      // Find predicate
      var predicateMatches = tripleStore.find(quad.subject, DS + 'predicate', null, quad.graph);

      if (predicateMatches.length === 0) return;

      var predicate = predicateMatches[0].object;

      filters[predicate] = filters[predicate] || {}; // create entry for predicate if not exists
      filters[predicate][quad.graph] = new Bloem(bits, hashes, filter); // add filter for the summary
    } catch (er) {
      console.log(er)
      console.log(filterMatches)
    }
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
