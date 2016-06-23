/*! @license ©2016 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A CompositeDatasource delegates queries to an consecutive list of datasources. */

var Datasource = require('./Datasource');

// Creates a new CompositeDatasource
function CompositeDatasource(options) {
  if (!(this instanceof CompositeDatasource))
    return new CompositeDatasource(options);
  Datasource.call(this, options);

  if (!options.references) {
    throw new Error("A CompositeDatasource requires a `references` array of datasource id's in its settings.");
  }

  var allDatasources = options.datasources;
  this._datasources = {};
  this._datasourceNames = [];
  for (var i = 0; i < options.references.length; i++) {
    var datasourceName = options.references[i];
    var datasource = allDatasources[datasourceName];
    if (!datasource) {
      throw new Error("No datasource " + datasourceName + " could be found!");
    }
    if (datasource.enabled === false) {
      throw new Error("Datasource " + datasourceName + " must be enabled!");
    }
    this._datasources[datasourceName] = datasource;
    this._datasourceNames.push(datasourceName);
  }
}
Datasource.extend(CompositeDatasource);

// Checks whether the data source can evaluate the given query
CompositeDatasource.prototype.supportsQuery = function (query) {
  for (var datasourceName in this._datasources) {
    if (this._getDatasourceByName(datasourceName).supportsQuery(query)) {
      return true;
    }
  }
  return false;
};

// Find a datasource by datasource name
CompositeDatasource.prototype._getDatasourceByName = function(datasourceName) {
  return this._datasources[datasourceName].datasource;
};

// Find a datasource by datasource id inside this composition
CompositeDatasource.prototype._getDatasourceById = function(datasourceIndex) {
  return this._datasources[this._datasourceNames[datasourceIndex]].datasource;
};

// Recursively find all required datasource composition info to perform a query.
// The callback will provide the parameters:
//   Datasource id to start querying from
//   The offset to use to start querying from the given datasource id
//   The total count for all datasources
CompositeDatasource.prototype._getDatasourceInfo = function(query, absoluteOffset, cb) {
  var self = this;
  var emptyQuery = {
    offset: 0, limit: 1,
    subject: query.subject, predicate: query.predicate, object: query.object
  };
  return findRecursive(0, absoluteOffset, -1, -1, 0, cb);

  function findRecursive(datasourceIndex, offset, chosenDatasource, chosenOffset, totalCount) {
    if (datasourceIndex >= self._datasourceNames.length) {
      // We checked all datasources, return our accumulated information
      cb(chosenDatasource, chosenOffset, totalCount);
    } else {
      var emptyTripleStream = { push: noop };
      self._getDatasourceById(datasourceIndex)._executeQuery(emptyQuery, emptyTripleStream, function (metadata) {
        var count = metadata.totalCount;
        if (chosenDatasource < 0 && offset < count) {
          // We can start querying from this datasource
          setImmediate(function () {
            findRecursive(datasourceIndex + 1, offset - count, datasourceIndex, offset, totalCount + count);
          });
        } else {
          // We forward our accumulated information and go check the next datasource
          setImmediate(function () {
            findRecursive(datasourceIndex + 1, offset - count, chosenDatasource, chosenOffset, totalCount + count);
          });
        }
      });
    }
  }
};

function noop() {}

// Writes the results of the query to the given triple stream
CompositeDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity;
  var self = this;
  this._getDatasourceInfo(query, offset, function(datasourceIndex, relativeOffset, totalCount) {
    if (datasourceIndex < 0) {
      // No valid datasource has been found
      metadataCallback({ totalCount: totalCount });
      tripleStream.push(null);
    } else {
      // Send query to first applicable datasource and optionally emit triples from consecutive datasources
      metadataCallback({ totalCount: totalCount });
      var emitted = 0;

      // Modify our triple stream so that if all results from one datasource have arrived,
      // check if we haven't reached the limit and if so, trigger a new query for the next datasource.
      tripleStream.push = makeSmartPush(tripleStream, function(localEmittedCount) {
        // This is called after the last element has been pushed

        // If we haven't reached our limit, try to fill it with other datasource query results.
        emitted += localEmittedCount;
        datasourceIndex++;
        if (emitted < limit && datasourceIndex < self._datasourceNames.length) {
          var localLimit = limit - emitted;
          var subQuery = { offset: 0, limit: localLimit,
            subject: query.subject, predicate: query.predicate, object: query.object };
          self._getDatasourceById(datasourceIndex)._executeQuery(subQuery, tripleStream, function(){});
          return true;
        } else {
          return false;
        }
      });

      // Initiate query to the first datasource.
      var subQuery = { offset: relativeOffset, limit: limit,
        subject: query.subject, predicate: query.predicate, object: query.object };
      self._getDatasourceById(datasourceIndex)._executeQuery(subQuery, tripleStream, function(){});
    }
  });

  // Replaces a tripleStream.push
  // It takes the tripleStream as first argument and a callback as second argument.
  // The callback will be called when the push function is called with a falsy value.
  // Returning a falsy value inside the callback will delegate the falsy value to the original
  // push function anyways.
  function makeSmartPush(self, nullCb) {
    var count = 0;
    var originalPush = self.push;
    return function(element) {
      if (!element) {
        if(!nullCb(count)) {
          originalPush.call(self, element);
        }
      } else {
        count++;
        originalPush.call(self, element);
      }
    };
  }
};

module.exports = CompositeDatasource;
