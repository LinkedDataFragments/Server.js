/*! @license ©2013 Pieter Colpaert - Multimedia Lab / iMinds / Ghent University */

/**
 * A CSV Datasource will read a csv file and will convert the CSV file to RDF according to configuration given
 * State: it's a first Proof of Concept implementation
 *
 * It will be used in the rewrite of the LDF server which will make use of pipes
 *
 *
 * TODO: base URI for the identifier, use a column to generate the URI, provide a type for rows, allow multiple mappings per value
 */

var request = require('request'),
    q = require('q'),
    N3Parser = require('n3').Parser,
    csv = require('csv');

// Creates a new CSVDatasource for a given url
function CSVDatasource(url, config) {
  this._url = url;
  this._config = config;
  //defaults
  this._config.mapping = this._config.mapping || [];
  this._config.delimiter = this._config.delimiter || ',';
  this._config.hasHeaderRow = this._config.hasHeaderRow || true;
  this._config.magicMapping = this._config.magicMapping || this._config.mapping.length === 0; //if true, magicMapping will try to read the header and create an automatic mapping. Defaults to whether there's a mapping given or not
  this._config.upperBound = this._config.upperBound || 10000; // max triples in one page
}

CSVDatasource.prototype = {
  // Queries the file for the given triple pattern
  // Returns a promise for a result object
  query: function (subject, predicate, object) {
    var self = this;
    this._pattern = { subject: subject, predicate: predicate, object: object };

    var deferred = q.defer();
    var results = [];
    csv().from(request(this._url), {
      delimiter: this._config.delimiter || ','
    }).on('record', function (row, index) {
      var mappedtriples = self._map(row, index);
      for (var i = 0; i < mappedtriples.length && results.length < self._config.upperBound; i++) {
        if (self._isPartOfLDFragment(mappedtriples[i])) {
          results.push(mappedtriples[i]);
        }
      }
      if (results.length === self._config.upperBound) {
        console.log("We have paged this resource!");
        //todo: Provide link header to next page
      }
    }).on('end', function (count) {
      deferred.resolve(results);
    }).on('error', function (error) {
      deferred.reject(error);
    });

    //There promises are okay, but maybe a better implementation would be to use pipes so that partial results can be processed in the main application
    var triples = deferred.promise;

    // return a promise to the combined triples/count object
    return triples.then(function (triples) {
      return { triples: triples, total: triples.length };
    });
  },

  //map will turn a csv row into a couple of triples
  _map: function (row, index) {
    var triples = [];
    if (index === 0 && this._config.hasHeaderRow && this._config.magicMapping) {
      this._config.mapping = this._createMapArray(row);
    }
    else if (index !== 0 || !this._config.hasHeaderRow) {
      for (var i = 0 ; i < row.length; i++) {
        if (this._config.mapping[i] !== undefined) {
          var triple = {
            subject: "http://example.com/" + index, //create an identifier for this row
            predicate: this._config.mapping[i],
            object: '"' + row[i] + '"' // TODO: We've added "" as if everything are literals, yet CSVs can also contain URI links
          };
          triples.push(triple);
        }
      }
    }
    return triples;
  },

  //this function will guess ontology mappings from the headers - we could use LOV for this
  _createMapArray: function (header) {
    var mapping = [];
    for (var i = 0; i < header.length; i++) {
      if (header[i].toLowerCase() === "latitude" || header[i].toLowerCase() === "lat")
        mapping[i] = "http://www.w3.org/2003/01/geo/wgs84_pos#latitude";
      else if (header[i].toLowerCase() === "longitude" || header[i].toLowerCase() === "long" || header[i].toLowerCase() === "lon")
        mapping[i] = "http://www.w3.org/2003/01/geo/wgs84_pos#longitude";
      else if (header[i].toLowerCase() === "name")
        mapping[i] = "http://xmlns.com/foaf/0.1/name";
    }
    return mapping;
  },

  // isPartOfLDFragment will return whether the triple can be returned as part of the final response
  _isPartOfLDFragment: function (triple) {
    return (!this._pattern.subject   || this._pattern.subject   === triple.subject) &&
           (!this._pattern.predicate || this._pattern.predicate === triple.predicate) &&
           (!this._pattern.object    || this._pattern.object    === triple.object);
  },
};

module.exports = CSVDatasource;
