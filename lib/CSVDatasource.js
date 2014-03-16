/*! @license ©2013 Pieter Colpaert - Multimedia Lab / iMinds / Ghent University */

/** A CSV Datasource reads a CSV file and converts it to RDF. */

var Datasource = require('./Datasource'),
    csv = require('csv');

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
  // Gets all the triples in the document
  _getAllTriples: function (addTriple, done) {
    var self = this;
    csv().from(this.request({ url: this._url, headers: { accept: 'text/csv' }}, done),
               { delimiter: this._delimiter })
    .on('record', function (row, rowIndex) {
      // Read the header row, generating mappings if requested
      if (rowIndex === 0 && self._hasHeaderRow) {
        if (self._autoMapHeaders)
          self._mapping = row.map(function (rowName) {
            return autoMappings[rowName.toLowerCase()];
          });
      }
      else {
        // Transform the row into triples using the mapping
        self._mapping.forEach(function (columnMapping, columnIndex) {
          columnMapping && addTriple({
            subject: 'http://example.com/' + rowIndex,
            predicate: columnMapping,
            object: '"' + row[columnIndex] + '"'
          });
        });
      }
    })
    .on('end', done.bind(null, null))
    .on('error', done);
  },
};
Datasource.extend(CSVDatasource);

module.exports = CSVDatasource;
