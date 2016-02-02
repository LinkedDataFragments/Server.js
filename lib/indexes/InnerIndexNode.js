/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** An InnerIndexNode is a non-leaf node in the MemoryIndex tree. */

var fs = require('fs'),
    _ = require('lodash'),
    Readable = require('stream').Readable,
    EventEmitter = require('events');

// Creates a new InnerIndexNode
function InnerIndexNode() {
  if (!(this instanceof InnerIndexNode))
    return new InnerIndexNode();
}

// If this node is a leaf node or not.
InnerIndexNode.prototype.isLeaf = function () {
  return false;
};

// Query the children matching the given bounds
// This should not be implemented in leaf nodes.
InnerIndexNode.prototype.queryRangeGates = function (lowerBound, upperBound, indexNodeStream, metadataCallback) {
  // TODO
};

// Query the range fragment in this node.
// This should not be implemented on reduced indexes in non-leaf nodes.
InnerIndexNode.prototype.queryDimensionalResources = function (query, navigation, tripleStream, metadataCallback) {
  // TODO
};

module.exports = InnerIndexNode;
