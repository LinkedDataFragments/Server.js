/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

var Datasource = require('./Datasource');

/** An ElasticSearchDatasource executes substring queries against an ElasticSearch interface. */

var MIME_JSON = 'application/json';

// Creates a new ElasticSearchDatasource
function ElasticSearchDatasource(options) {
  if (!(this instanceof ElasticSearchDatasource))
    return new ElasticSearchDatasource(options);
  options = options || {};
  this._request = options.request || require('request');
  this._endpoint = options.endpoint + '_search';
}
Datasource.extend(ElasticSearchDatasource, ['substring', 'limit', 'offset', 'totalCount']);

// Writes the results of the query to the given triple stream
ElasticSearchDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity, self = this;
  // Perform the HTTP request against the ElasticSearch endpoint
  this._request({
    url: this._endpoint,
    method: 'POST',
    headers: { 'content-type': MIME_JSON, accept: MIME_JSON },
    body: JSON.stringify({
      from: offset, size: limit,
      query: { match: { lookup: { query: query.substring } } },
    }),
  },
  // Parse the ElasticSearch response
  function (error, response, body) {
    if (error) return tripleStream.emit('error', error);
    var result = JSON.parse(body).hits || {}, matches = result.hits || [];
    metadataCallback({ totalCount: result.total || 0 });
    self._pushLiterals(tripleStream, matches.map(function (m) { return m._source.literal; }), offset);
  });
};

module.exports = ElasticSearchDatasource;
