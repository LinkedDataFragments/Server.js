/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A TtsDatasource fetches triples from a Triple File System */

var tfs = require('triple-file-system'),
    q = require('q');

var LIMIT = 100;
var LARGECOUNTESTIMATE = 500000000;

// Creates a new TfsDatasource
function TfsDatasource(path) {
  this._tfs = new tfs.TripleFileSystem(path);
  this._metadataReader = new tfs.TripleFileSystemMetadataReader(this._tfs);
}

TfsDatasource.prototype = {
  // Get triples that match the given pattern
  query: function (pattern) {
    // Read the triples
    var triples = [], triplesDeferred = q.defer(),
        reader = new tfs.TripleFileSystemReader(this._tfs, pattern, LIMIT);
    reader.on('data', function (triple) { triples.push(triple); });
    reader.on('end',  function () { triplesDeferred.resolve(triples); });

    // Get the total count, returning an estimate if counting takes too long
    var count = q.timeout(this._metadataReader.count(pattern, 10000), 500)
                 .then(null, function () { return LARGECOUNTESTIMATE; });

    // Return the triples and the count
    return q.spread([triplesDeferred.promise, count],
                    function (triples, count) { return { triples: triples, total: count }; });
  },
};

module.exports = TfsDatasource;
