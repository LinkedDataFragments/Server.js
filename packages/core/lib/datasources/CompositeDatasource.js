/*! @license MIT ©2016 Ruben Taelman, Ghent University - imec */
/* A CompositeDatasource delegates queries to an consecutive list of datasources. */

var Datasource = require('./Datasource'),
    LRU        = require('lru-cache');

// Creates a new CompositeDatasource
function CompositeDatasource(options) {
  if (!(this instanceof CompositeDatasource))
    return new CompositeDatasource(options);
  Datasource.call(this, options);

  if (!options.references)
    throw new Error("A CompositeDatasource requires a `references` array of datasource id's in its settings.");

  var allDatasources = options.datasources;
  this._datasources = {};
  this._datasourceNames = [];
  for (var i = 0; i < options.references.length; i++) {
    var datasourceName = options.references[i];
    var datasource = allDatasources[datasourceName];
    if (!datasource)
      throw new Error('No datasource ' + datasourceName + ' could be found!');
    if (datasource.enabled !== false) {
      this._datasources[datasourceName] = datasource;
      this._datasourceNames.push(datasourceName);
    }
  }
  this._countCache = new LRU({ max: 1000, maxAge: 1000 * 60 * 60 * 3 });
}
Datasource.extend(CompositeDatasource, ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount']);

// Checks whether the data source can evaluate the given query
CompositeDatasource.prototype.supportsQuery = function (query) {
  for (var datasourceName in this._datasources) {
    if (this._getDatasourceByName(datasourceName).supportsQuery(query))
      return true;
  }
  return false;
};

// Find a datasource by datasource name
CompositeDatasource.prototype._getDatasourceByName = function (datasourceName) {
  return this._datasources[datasourceName].datasource;
};

// Find a datasource by datasource id inside this composition
CompositeDatasource.prototype._getDatasourceById = function (datasourceIndex) {
  return this._datasources[this._datasourceNames[datasourceIndex]].datasource;
};

CompositeDatasource.prototype._hasDatasourceMatchingGraph = function (datasource, datasourceIndex, query) {
  return !query.graph || datasource.supportedFeatures.quadPattern || query.graph === datasource._graph;
};

// Count the quads in the query result to get an exact count.
CompositeDatasource.prototype._getExactCount = function (datasource, query, callback) {
  // Try to find a cache match
  var cacheKey = query.subject + '|' + query.predicate + '|' + query.object + '|' + query.graph;
  var cache = this._countCache, count = cache.get(cacheKey);
  if (count) return setImmediate(callback, count);

  // Otherwise, count all quads manually
  var emptyQuery = { offset: 0, subject: query.subject, predicate: query.predicate, object: query.object, graph: query.graph };
  var exactCount = 0;
  var outputQuads = datasource.select(emptyQuery);
  outputQuads.on('data', function () {
    exactCount++;
  });
  outputQuads.on('end', function () {
    if (exactCount > 1000)
      cache.set(cacheKey, exactCount);
    callback(exactCount);
  });
};

// Recursively find all required datasource composition info to perform a query.
// The callback will provide the parameters:
//   Datasource id to start querying from
//   The offset to use to start querying from the given datasource id
//   The total count for all datasources
CompositeDatasource.prototype._getDatasourceInfo = function (query, absoluteOffset, callback) {
  var self = this;
  return findRecursive(0, absoluteOffset, -1, -1, 0, callback, true);

  function findRecursive(datasourceIndex, offset, chosenDatasource, chosenOffset, totalCount, hasExactCount) {
    if (datasourceIndex >= self._datasourceNames.length)
      // We checked all datasources, return our accumulated information
      callback(chosenDatasource, chosenOffset, totalCount, hasExactCount);
    else {
      var datasource = self._getDatasourceById(datasourceIndex);
      var emptyQuery = {
        offset: 0, limit: 1,
        subject: query.subject, predicate: query.predicate, object: query.object, graph: query.graph,
      };

      // If we have a graph in our query, and this is a triple datasource, make sure it is in the requested graph
      if (!self._hasDatasourceMatchingGraph(datasource, datasourceIndex, emptyQuery))
        return findRecursive(datasourceIndex + 1, offset, chosenDatasource, chosenOffset, totalCount, hasExactCount);

      var outputQuads = datasource.select(emptyQuery);
      outputQuads.getProperty('metadata', function (metadata) {
        // If we are still looking for an appropriate datasource, we need exact counts
        var count = metadata.totalCount, exact = metadata.hasExactCount;
        if (offset > 0 && !exact) {
          self._getExactCount(datasource, query, function (exactCount) {
            count = exactCount;
            exact = true;
            continueRecursion();
          });
        }
        else
          continueRecursion();

        function continueRecursion() {
          if (chosenDatasource < 0 && offset < count) {
            // We can start querying from this datasource
            setImmediate(function () {
              findRecursive(datasourceIndex + 1, offset - count, datasourceIndex, offset,
                totalCount + count, hasExactCount && exact);
            });
          }
          else {
            // We forward our accumulated information and go check the next datasource
            setImmediate(function () {
              findRecursive(datasourceIndex + 1, offset - count, chosenDatasource, chosenOffset,
                totalCount + count, hasExactCount && exact);
            });
          }
        }
      });
    }
  }
};

// Writes the results of the query to the given quad stream
CompositeDatasource.prototype._executeQuery = function (query, destination) {
  var offset =  query.offset || 0, limit = query.limit || Infinity;
  var self = this;
  this._getDatasourceInfo(query, offset, function (datasourceIndex, relativeOffset, totalCount, hasExactCount) {
    if (datasourceIndex < 0) {
      // No valid datasource has been found
      destination.setProperty('metadata', { totalCount: totalCount, hasExactCount: hasExactCount });
      destination.close();
    }
    else {
      // Send query to first applicable datasource and optionally emit quads from consecutive datasources
      destination.setProperty('metadata', { totalCount: totalCount, hasExactCount: hasExactCount });

      // Modify our quad stream so that if all results from one datasource have arrived,
      // check if we haven't reached the limit and if so, trigger a new query for the next datasource.
      var emitted = 0;
      countItems(destination, function (localEmittedCount) {
        // This is called after the last element has been pushed

        // If we haven't reached our limit, try to fill it with other datasource query results.
        emitted = localEmittedCount;
        datasourceIndex++;
        if (emitted < limit && datasourceIndex < self._datasourceNames.length) {
          var localLimit = limit - emitted;
          var subQuery = { offset: 0, limit: localLimit,
            subject: query.subject, predicate: query.predicate, object: query.object, graph: query.graph };
          var datasource = self._getDatasourceById(datasourceIndex);
          // If we are have a graph in our query, and this is a triple datasource, make sure it is in the requested graph,
          // otherwise we skip this datasource
          if (self._hasDatasourceMatchingGraph(datasource, datasourceIndex, subQuery)) {
            var outputQuads = datasource.select(subQuery);
            outputQuads.on('data', pushToDestination);
            outputQuads.on('end', closeDestination);
          }
          else
            destination.close();
          return false;
        }
        else
          return true;
      });

      // Initiate query to the first datasource.
      var subQuery = { offset: relativeOffset, limit: limit,
        subject: query.subject, predicate: query.predicate, object: query.object, graph: query.graph };
      var outputQuads = self._getDatasourceById(datasourceIndex).select(subQuery);
      outputQuads.on('data', pushToDestination);
      outputQuads.on('end', closeDestination);
    }
  });

  // Counts the number of quads and sends them through the callback,
  // only closing the iterator when the callback returns true.
  function countItems(destination, closeCallback) {
    var count = 0, originalPush = destination._push, originalClose = destination.close;
    destination._push = function (element) {
      if (element) count++;
      originalPush.call(destination, element);
    };
    destination.close = function () {
      if (closeCallback(count))
        originalClose.call(destination);
    };
  }

  function pushToDestination(quad) {
    destination._push(quad);
  }
  function closeDestination() {
    destination.close();
  }
};

module.exports = CompositeDatasource;
