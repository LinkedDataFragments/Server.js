/*! @license ©2013 Pieter Colpaert - Multimedia Lab / iMinds / Ghent University */

/** A CSV Datasource reads a CSV file and converts it to RDF. */

var request = require('request'),
    csv = require('csv'),
    q = require('q'),
    _ = require('./Utility');

var autoMappings = {
  latitude:  'http://www.w3.org/2003/01/geo/wgs84_pos#latitude',
  lat:       'http://www.w3.org/2003/01/geo/wgs84_pos#latitude',
  longitude: 'http://www.w3.org/2003/01/geo/wgs84_pos#longitude',
  long:      'http://www.w3.org/2003/01/geo/wgs84_pos#longitude',
  name:      'http://xmlns.com/foaf/0.1/name',
};

// Creates a new CSVDatasource for a given URL
function CSVDatasource(url, config) {
  this._url = url;
  config = config || {};
  this._mapping = config.mapping || [];
  this._delimiter = config.delimiter || ',';
  this._hasHeaderRow = config.hasHeaderRow || true;
  this._autoMapHeaders = config.autoMapHeaders || this._mapping.length === 0;
  this._limit = this._limit || 1000;
}

CSVDatasource.prototype = {
  // Queries the file for the given triple pattern
  query: function (pattern) {
    var self = this, patternFilter = _.tripleFilter(pattern),
        deferred = q.defer(), results = [], count = 0;

    // Retrieve the CSV file and map it into triples
    csv().from(request(this._url), { delimiter: this._delimiter })
    .on('record', function (row, rowIndex) {
      // Read the header row, generating mappings if requested
      if (rowIndex === 0 && self._hasHeaderRow) {
        if (self._autoMapHeaders)
          self._mapping = row.map(function (rowName) {
            return autoMappings[rowName.toLowerCase()];
          });
      }
      // Read a data row, adding triples that match the filter
      else {
        var triples = self._rowToTriples(row, rowIndex).filter(patternFilter);
        results.push.apply(results, triples.slice(0, self._limit - results.length));
        count += triples.length;
      }
    })
    .on('end', function () { deferred.resolve({ triples: results, total: count }); })
    .on('error', function (error) { deferred.reject(error); });

    return deferred.promise;
  },

  // Transforms a CSV row into triples
  _rowToTriples: function (row, rowIndex) {
    return _.compact(this._mapping.map(function (columnMapping, columnIndex) {
      return columnMapping && {
        subject: 'http://example.com/' + rowIndex,
        predicate: columnMapping,
        object: '"' + row[columnIndex] + '"'
      };
    }));
  },
};

module.exports = CSVDatasource;
