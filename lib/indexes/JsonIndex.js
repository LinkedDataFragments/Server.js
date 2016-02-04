/*! @license ©2016 Ruben Taelman - Data Science Lab / iMinds / Ghent University */

/** An JsonIndex stores the index in-memory based on a static JSON config file. */

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    MemoryIndex = require('./MemoryIndex'),
    LeafIndexNode = require('./LeafIndexNode'),
    InnerIndexNode = require('./InnerIndexNode');

// Creates a new JsonIndex
function JsonIndex(options) {
  if (!(this instanceof JsonIndex))
    return new JsonIndex();
  MemoryIndex.call(this, options);
}
MemoryIndex.extend(JsonIndex);

JsonIndex.prototype._constructNode = function (subTree) {
  var node;
  if(subTree.dimension) {
    var childNodes = [];
    for(var elementId in subTree.dimension) {
      var element = subTree.dimension[elementId];
      childNodes.push(this._constructNode(element));
    }
    node = new InnerIndexNode(childNodes, subTree, subTree.lowerBound, subTree.upperBound, this.reduced);
  } else {
    node = new LeafIndexNode(subTree, subTree.lowerBound, subTree.upperBound, this.reduced);
  }
  return node;
};

JsonIndex.prototype._initialize = function (done) {
  var fileName = this.settings.file;
  var jsonTree = JSON.parse(fs.readFileSync(path.join(__dirname, "../../" + fileName)));
  this._rootNode = this._constructNode(jsonTree);
  done();
};

JsonIndex.prototype._getIndexNode = function (navigation) {
  var node = this._rootNode;
  for(var navigationId in navigation) {
    var i = navigation[navigationId];
    if(node.isLeaf()) {
      throw new Error('Invalid navigation: Tried to get a child from a leaf.');
    } else {
      if(!node.hasChild(i)) {
        throw new Error('Invalid navigation: Tried to get a non-existing child from node.');
      }
      node = node.getChild(i);
    }
  }
  return node;
};

module.exports = JsonIndex;
