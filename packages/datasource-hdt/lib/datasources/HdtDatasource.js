/*! @license MIT ©2014-2016 Ruben Verborgh, Ghent University - imec */
/* An HdtDatasource loads and queries an HDT document in-process. */

let Datasource = require('@ldf/core').datasources.Datasource,
    hdt = require('hdt'),
    ExternalHdtDatasource = require('./ExternalHdtDatasource'),
    RdfString = require('rdf-string');

// Creates a new HdtDatasource
class HdtDatasource extends Datasource {
  constructor(options) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);

    options = options || {};
    // Switch to external HDT datasource if the `external` flag is set
    if (options.external)
      return new ExternalHdtDatasource(options);
    this._hdtFile = (options.file || '').replace(/^file:\/\//, '');
  }

  // Loads the HDT datasource
  async _initialize() {
    this._hdtDocument = await hdt.fromFile(this._hdtFile);
  }

  // Writes the results of the query to the given quad stream
  _executeQuery(query, destination) {
    // Only the default graph has results
    if (query.graph && query.graph.termType !== 'DefaultGraph') {
      destination.setProperty('metadata', { totalCount: 0, hasExactCount: true });
      destination.close();
      return;
    }
    let dataFactory = this.dataFactory;
    this._hdtDocument.searchTriples(query.subject ? RdfString.termToString(query.subject) : null,
      query.predicate ? RdfString.termToString(query.predicate) : null,
      query.object ? RdfString.termToString(query.object) : null,
      { limit: query.limit, offset: query.offset })
      .then((result) => {
        let triples = result.triples,
            estimatedTotalCount = result.totalCount,
            hasExactCount = result.hasExactCount;
        // Ensure the estimated total count is as least as large as the number of triples
        let tripleCount = triples.length, offset = query.offset || 0;
        if (tripleCount && estimatedTotalCount < offset + tripleCount)
          estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
        destination.setProperty('metadata', { totalCount: estimatedTotalCount, hasExactCount: hasExactCount });
        // Add the triples to the output
        for (let i = 0; i < tripleCount; i++)
          destination._push(RdfString.stringQuadToQuad(triples[i], dataFactory));
        destination.close();
      },
      (error) => { destination.emit('error', error); });
  }

  // Closes the data source
  close(done) {
    // Close the HDT document if it is open
    if (this._hdtDocument) {
      this._hdtDocument.close().then(done, done);
      delete this._hdtDocument;
    }
    // If initialization was still pending, close immediately after initializing
    else if (!this.initialized)
      this.on('initialized', this.close.bind(this, done));
  }
}


module.exports = HdtDatasource;
