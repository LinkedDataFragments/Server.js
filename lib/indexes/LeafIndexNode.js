/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** A LeafIndexNode is a leaf node in the MemoryIndex tree. */

var fs = require('fs'),
    _ = require('lodash'),
    IndexNode = require('./IndexNode');

// Creates a new LeafIndexNode
function LeafIndexNode(options, lowerBound, upperBound, reduced) {
  if (!(this instanceof LeafIndexNode))
    return new LeafIndexNode(options, lowerBound, upperBound, reduced);
  IndexNode.call(this, options, lowerBound, upperBound, reduced);
}
LeafIndexNode.prototype = Object.create(IndexNode.prototype);

// If this node is a leaf node or not.
LeafIndexNode.prototype.isLeaf = function () {
  return true;
};

module.exports = LeafIndexNode;
