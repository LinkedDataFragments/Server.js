/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** An MemoryIndex stores the index in-memory. */

var fs = require('fs'),
    _ = require('lodash'),
    Readable   = require('stream').Readable,
    Index = require('./Index');

var multidimindex = "http://example.org/multidimensionalindex#" ; // TODO

// Creates a new MemoryIndex
function MemoryIndex(options) {
  if (!(this instanceof MemoryIndex))
    return new MemoryIndex();
  Index.call(this, options);
}
Index.extend(MemoryIndex);

// Writes the results of the range gate query to the given triple stream
MemoryIndex.prototype._queryRangeGates = function (lowerBound, upperBound, navigation, tripleStream, metadataCallback) {
  var indexNode = this._getIndexNode(navigation);
  if(indexNode.isLeaf()) {
    throw new Error('Invalid navigation: Tried to get range gates from a leaf index node.');
  }

  var indexNodeStream = new Readable({ objectMode: true });
  var bNodeIndex = 0;
  indexNodeStream.on('data', function(bounds) {
    if(bounds) {
      tripleStream({subject: bNodeIndex, predicate: multidimindex + "initial", object: "\"" + bounds[0] + "\""});
      tripleStream({subject: bNodeIndex++, predicate: multidimindex + "final", object: "\"" + bounds[1] + "\""});
    } else {
      tripleStream(false);
    }
  });

  indexNode.queryRangeGates(lowerBound, upperBound, indexNodeStream, metadataCallback);
};

// Writes the results of the range fragment query to the given triple stream
MemoryIndex.prototype._queryDimensionalResources = function (query, navigation, tripleStream, metadataCallback) {
  var indexNode = this._getIndexNode(navigation);
  if(!indexNode.isLeaf() && this.reduced) {
    throw new Error('Invalid navigation: Tried to get a range fragment from an inner node in a reduced index.');
  }
  indexNode.queryDimensionalResources(query, tripleStream, metadataCallback);
};

module.exports = MemoryIndex;
