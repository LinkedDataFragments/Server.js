/*! @license MIT ©2016 Ruben Taelman, Ghent University - imec */
/* A CompositeDatasource delegates queries to an consecutive list of datasources. */

let Datasource = require('@ldf/core').datasources.Datasource,
    LRU        = require('lru-cache');

// Creates a new CompositeDatasource
class CompositeDatasource extends Datasource {
  constructor(options) {
    let supportedFeatureList = ['quadPattern', 'triplePattern', 'limit', 'offset', 'totalCount'];
    super(options, supportedFeatureList);

    if (!options.references)
      throw new Error("A CompositeDatasource requires a `references` array of datasource id's in its settings.");

    this._datasources = {};
    this._datasourceNames = [];
    for (let i = 0; i < Object.keys(options.references).length; i++) {
      let datasourceName = Object.keys(options.references)[i];
      let datasource = options.references[datasourceName];
      if (!datasource)
        throw new Error('No datasource ' + datasourceName + ' could be found!');
      if (datasource.enabled !== false) {
        this._datasources[datasourceName] = datasource;
        this._datasourceNames.push(datasourceName);
      }
    }
    this._countCache = new LRU({ max: 1000, maxAge: 1000 * 60 * 60 * 3 });
  }

  // Checks whether the data source can evaluate the given query
  supportsQuery(query) {
    for (let datasourceName in this._datasources) {
      if (this._getDatasourceByName(datasourceName).supportsQuery(query))
        return true;
    }
    return false;
  }

  // Find a datasource by datasource name
  _getDatasourceByName(datasourceName) {
    return this._datasources[datasourceName];
  }

  // Find a datasource by datasource id inside this composition
  _getDatasourceById(datasourceIndex) {
    return this._datasources[this._datasourceNames[datasourceIndex]];
  }

  _hasDatasourceMatchingGraph(datasource, datasourceIndex, query) {
    return !query.graph || datasource.supportedFeatures.quadPattern || query.graph === datasource._graph;
  }

  // Count the quads in the query result to get an exact count.
  _getExactCount(datasource, query, callback) {
    // Try to find a cache match
    let cacheKey = query.subject + '|' + query.predicate + '|' + query.object + '|' + query.graph;
    let cache = this._countCache, count = cache.get(cacheKey);
    if (count) return setImmediate(callback, count);

    // Otherwise, count all quads manually
    let emptyQuery = { offset: 0, subject: query.subject, predicate: query.predicate, object: query.object, graph: query.graph };
    let exactCount = 0;
    let outputQuads = datasource.select(emptyQuery);
    outputQuads.on('data', () => {
      exactCount++;
    });
    outputQuads.on('end', () => {
      if (exactCount > 1000)
        cache.set(cacheKey, exactCount);
      callback(exactCount);
    });
  }

  // Recursively find all required datasource composition info to perform a query.
  // The callback will provide the parameters:
  //   Datasource id to start querying from
  //   The offset to use to start querying from the given datasource id
  //   The total count for all datasources
  _getDatasourceInfo(query, absoluteOffset, callback) {
    let self = this;
    return findRecursive(0, absoluteOffset, -1, -1, 0, callback, true);

    function findRecursive(datasourceIndex, offset, chosenDatasource, chosenOffset, totalCount, hasExactCount) {
      if (datasourceIndex >= self._datasourceNames.length)
        // We checked all datasources, return our accumulated information
        callback(chosenDatasource, chosenOffset, totalCount, hasExactCount);
      else {
        let datasource = self._getDatasourceById(datasourceIndex);
        let emptyQuery = {
          offset: 0, limit: 1,
          subject: query.subject, predicate: query.predicate, object: query.object, graph: query.graph,
        };

        // If we have a graph in our query, and this is a triple datasource, make sure it is in the requested graph
        if (!self._hasDatasourceMatchingGraph(datasource, datasourceIndex, emptyQuery))
          return findRecursive(datasourceIndex + 1, offset, chosenDatasource, chosenOffset, totalCount, hasExactCount);

        let outputQuads = datasource.select(emptyQuery);
        outputQuads.getProperty('metadata', (metadata) => {
          // If we are still looking for an appropriate datasource, we need exact counts
          let count = metadata.totalCount, exact = metadata.hasExactCount;
          if (offset > 0 && !exact) {
            self._getExactCount(datasource, query, (exactCount) => {
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
              setImmediate(() => {
                findRecursive(datasourceIndex + 1, offset - count, datasourceIndex, offset,
                  totalCount + count, hasExactCount && exact);
              });
            }
            else {
              // We forward our accumulated information and go check the next datasource
              setImmediate(() => {
                findRecursive(datasourceIndex + 1, offset - count, chosenDatasource, chosenOffset,
                  totalCount + count, hasExactCount && exact);
              });
            }
          }
        });
      }
    }
  }

  // Writes the results of the query to the given quad stream
  _executeQuery(query, destination) {
    let offset =  query.offset || 0, limit = query.limit || Infinity;
    this._getDatasourceInfo(query, offset, (datasourceIndex, relativeOffset, totalCount, hasExactCount) => {
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
        let emitted = 0;
        countItems(destination, (localEmittedCount) => {
          // This is called after the last element has been pushed

          // If we haven't reached our limit, try to fill it with other datasource query results.
          emitted = localEmittedCount;
          datasourceIndex++;
          if (emitted < limit && datasourceIndex < this._datasourceNames.length) {
            let localLimit = limit - emitted;
            let subQuery = { offset: 0, limit: localLimit,
              subject: query.subject, predicate: query.predicate, object: query.object, graph: query.graph };
            let datasource = this._getDatasourceById(datasourceIndex);
            // If we are have a graph in our query, and this is a triple datasource, make sure it is in the requested graph,
            // otherwise we skip this datasource
            if (this._hasDatasourceMatchingGraph(datasource, datasourceIndex, subQuery)) {
              let outputQuads = datasource.select(subQuery);
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
        let subQuery = { offset: relativeOffset, limit: limit,
          subject: query.subject, predicate: query.predicate, object: query.object, graph: query.graph };
        let outputQuads = this._getDatasourceById(datasourceIndex).select(subQuery);
        outputQuads.on('data', pushToDestination);
        outputQuads.on('end', closeDestination);
      }
    });

    // Counts the number of quads and sends them through the callback,
    // only closing the iterator when the callback returns true.
    function countItems(destination, closeCallback) {
      let count = 0, originalPush = destination._push, originalClose = destination.close;
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
  }
}
module.exports = CompositeDatasource;
