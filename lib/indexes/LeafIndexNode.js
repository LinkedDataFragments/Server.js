/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** A LeafIndexNode is a leaf node in the MemoryIndex tree. */

var fs = require('fs'),
    _ = require('lodash'),
    Readable = require('stream').Readable,
    EventEmitter = require('events'),
    IndexNode = require('./IndexNode');

// Creates a new LeafIndexNode
function LeafIndexNode(lowerBound, upperBound) {
  if (!(this instanceof LeafIndexNode))
    return new LeafIndexNode(lowerBound, upperBound);
  IndexNode.call(this, lowerBound, upperBound);
}

// If this node is a leaf node or not.
LeafIndexNode.prototype.isLeaf = function () {
  return true;
};

// Query the range fragment in this node.
// This should not be implemented on reduced indexes in non-leaf nodes.
LeafIndexNode.prototype.queryDimensionalResources = function (query, navigation, tripleStream, metadataCallback) {
  // TODO
};

module.exports = LeafIndexNode;
