/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** An IndexNode is a node in the MemoryIndex tree. */

// Creates a new IndexNode
function IndexNode(lowerBound, upperBound) {
  if (!(this instanceof IndexNode))
    return new IndexNode();
  this._bounds = [lowerBound, upperBound];
}

// If this node is a leaf node or not.
IndexNode.prototype.isLeaf = function () {
  throw new Error('isLeaf has not been implemented');
};

// An array of lower and upper bound representing this node.
IndexNode.prototype.getBounds = function () {
  return this._bounds;
};

// Query the children matching the given bounds
// This should not be implemented in leaf nodes.
IndexNode.prototype.queryRangeGates = function (lowerBound, upperBound, indexNodeStream, metadataCallback) {
  throw new Error('queryRangeGates has not been implemented');
};

// Query the range fragment in this node.
// This should not be implemented on reduced indexes in non-leaf nodes.
IndexNode.prototype.queryDimensionalResources = function (query, navigation, tripleStream, metadataCallback) {
  throw new Error('queryDimensionalResources has not been implemented');
};

module.exports = IndexNode;
