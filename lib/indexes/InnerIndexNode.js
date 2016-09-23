/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** An InnerIndexNode is a non-leaf node in the MemoryIndex tree. */

var fs = require('fs'),
    _ = require('lodash'),
    IndexNode = require('./IndexNode');

// Creates a new InnerIndexNode
function InnerIndexNode(childNodes, options, lowerBound, upperBound, reduced) {
  if (!(this instanceof InnerIndexNode))
    return new InnerIndexNode(childNodes, options, lowerBound, upperBound, reduced);
  this._childNodes = childNodes; // TODO: check make sure these nodes are sorted?
  IndexNode.call(this, options, lowerBound, upperBound, reduced);
}
InnerIndexNode.prototype = Object.create(IndexNode.prototype);

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
InnerIndexNode.prototype.queryRangeGates = function (offset, limit, lowerBound, upperBound, indexNodeStream, metadataCallback) {
  var count = 0;
  for(var i = 0; i < this._childNodes.length; i++) {
    var bounds = this._childNodes[i].getBounds();
    if(isIntervalsOverlap(newInterval(lowerBound, upperBound), newInterval(bounds[0], bounds[1]))) {
      count++;
      if (i >= offset && i < offset + limit) {
        indexNodeStream.push({ index: i, bounds: bounds });
      }
    }
  }
  indexNodeStream.push(null);
  metadataCallback({ totalCount: count });
};

function newInterval(initial, final) {
  return { initial: initial, final: final };
}

function isPointInInterval(point, interval) {
  return (point !== 0 && !point) || (point >= interval.initial && point <= interval.final);
}

function isIntervalsOverlap(interval1, interval2) {
  return isPointInInterval(interval1.initial, interval2) ||
      isPointInInterval(interval1.final, interval2) ||
      isPointInInterval(interval2.initial, interval1) ||
      isPointInInterval(interval2.final, interval1);
}

module.exports = InnerIndexNode;
