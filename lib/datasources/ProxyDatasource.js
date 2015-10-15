/*! @license ©2015 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An ProxyDatasource is a proxy for one or more datasources. */

var Datasource = require('./Datasource'),
    Readable   = require('stream').Readable;

// Creates a new EmptyDatasource
function ProxyDatasource(options) {
  if (!(this instanceof ProxyDatasource))
    return new ProxyDatasource(options);
  Datasource.call(this, options);
  this._datasources = options.datasources || [];
}
Datasource.extend(ProxyDatasource);

ProxyDatasource.prototype.addDatasource = function(datasource) {
  this._datasources.push(datasource);
};

ProxyDatasource.prototype.addDatasources = function(datasources) {
  for(var datasourceId in datasources) {
    var datasource = datasources[datasourceId];
    this.addDatasource(datasource);
  }
};

// Checks whether the data source can evaluate the given query
ProxyDatasource.prototype.supportsQuery = function (query) {
  for(var datasourceId in this._datasources) {
    var datasource = this._datasources[datasourceId];
    if(datasource.supportsQuery(query)) {
      return true;
    }
  }
  return false;
};

// Selects the triples that match the given query, returning a triple stream
ProxyDatasource.prototype.select = function (query, onError) {
  // Create a wrapper triple stream
  var tripleStream = new Readable({ objectMode: true });
  tripleStream._read = noop;
  onError && tripleStream.on('error', onError);

  var barrier = 0;
  var totalCount = 0;
  var self = this;
  for(var datasourceId in this._datasources) {
    var datasource = this._datasources[datasourceId];
    var delegatedTripleStream = datasource.select(query, onError);

    delegatedTripleStream.on('data', function(d) {
      if(d || barrier == self._datasources.length) {
        tripleStream.emit('data', d);
      }
    });
    delegatedTripleStream.on('error', function(d) {
      tripleStream.emit('error', d);
    });
    delegatedTripleStream.on('end', function(d) {
      if(++barrier == self._datasources.length) {
        tripleStream.emit('metadata', { totalCount: totalCount });
        tripleStream.emit('end', d);
      }
    });
    delegatedTripleStream.on('metadata', function(metadata) {
      totalCount += metadata.totalCount;
      //
    });
  }

  return tripleStream;
};

// Closes the data source, freeing possible resources used
ProxyDatasource.prototype.close = function (callback) {
  for(var datasourceId in this._datasources) {
    var datasource = this._datasources[datasourceId];
    datasource.close();
  }
  callback();
};

// The empty function
function noop() {}

module.exports = ProxyDatasource;
