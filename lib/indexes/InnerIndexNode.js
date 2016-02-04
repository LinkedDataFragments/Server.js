/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** An InnerIndexNode is a non-leaf node in the MemoryIndex tree. */

var fs = require('fs'),
    _ = require('lodash'),
    Readable = require('stream').Readable,
    EventEmitter = require('events'),
    IndexNode = require('./IndexNode');

// Creates a new InnerIndexNode
function InnerIndexNode(childNodes, lowerBound, upperBound) {
  if (!(this instanceof InnerIndexNode))
    return new InnerIndexNode(childNodes, lowerBound, upperBound);
  this._childNodes = childNodes;
  IndexNode.call(this, lowerBound, upperBound);
}

// If this node is a leaf node or not.
InnerIndexNode.prototype.isLeaf = function () {
  return false;
};

// Check if this node has the given child by index
InnerIndexNode.prototype.hasChild = function (index) {
  return index >= 0 && index < this._childNodes.length;
};

// Get a child by index
InnerIndexNode.prototype.getChild = function (index) {
  return this._childNodes[index];
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
