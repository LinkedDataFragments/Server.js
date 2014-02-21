/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TtsDatasource fetches triples from a Triple File System */

var Datasource = require('./Datasource'),
    tfs = require('triple-file-system');

var LIMIT = 100;
var LARGECOUNTESTIMATE = 500000000;

// Creates a new TfsDatasource
function TfsDatasource(path, options) {
  this._tfs = new tfs.TripleFileSystem(path, options);
  this._metadataReader = new tfs.TripleFileSystemMetadataReader(this._tfs);
}

TfsDatasource.prototype = {
  // Gets triples that match the given pattern
  query: function (pattern, addTriple, setCount, done) {
    var reader = new tfs.TripleFileSystemReader(this._tfs, pattern, LIMIT);
    reader.on('data', addTriple);
    reader.on('end',  done.bind(null, null));
    this.count(pattern, function (error, count) { setCount(error ? LARGECOUNTESTIMATE : count); });
  },

  // Retrieves the (approximate) number of triples that match the triple pattern
  count: function (pattern, callback) {
    callback && this._metadataReader.count(pattern).then(callback.bind(null, null), callback);
  },

  // Closes the data source
  close: function () {
    this._tfs.close();
  },
};
Datasource.extend(TfsDatasource);

module.exports = TfsDatasource;
