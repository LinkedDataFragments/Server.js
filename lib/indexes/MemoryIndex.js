/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** An MemoryIndex stores the index in-memory. */

var fs = require('fs'),
    _ = require('lodash'),
    Readable = require('stream').Readable,
    EventEmitter = require('events'),
    Index = require('Index');

// Creates a new MemoryIndex
function MemoryIndex(options) {
  if (!(this instanceof MemoryIndex))
    return new MemoryIndex();
}
Index.extend(MemoryIndex);

MemoryIndex.prototype._initialize = function (done) {
  // TODO: build IndexNode's tree
};

MemoryIndex.prototype._getIndexNode = function (navigation) {
  // TODO
};

// Writes the results of the range gate query to the given triple stream
MemoryIndex.prototype._queryRangeGates = function (lowerBound, upperBound, navigation, tripleStream, metadataCallback) {
  var indexNode = this._getIndexNode(navigation);
  var indexNodeStream = null; // TODO: to capture index nodes and emit to triple stream
  indexNode.queryRangeGates(lowerBound, upperBound, indexNodeStream, metadataCallback);
};

// Writes the results of the range fragment query to the given triple stream
MemoryIndex.prototype._queryDimensionalResources = function (query, navigation, tripleStream, metadataCallback) {
  var indexNode = this._getIndexNode(navigation);
  indexNode.queryDimensionalResources(query, tripleStream, metadataCallback);
};

module.exports = MemoryIndex;
