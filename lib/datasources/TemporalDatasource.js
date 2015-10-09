/*! @license ©2014 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A MemoryDatasource queries a set of in-memory triples. */

var fs         = require('fs'),
    Datasource = require('./Datasource'),
    path       = require('path'),
    util       = require('../Util'),
    Readable   = require('stream').Readable;

// Creates a new TemporalDatasource
function TemporalDatasource(options) {
  if (!(this instanceof TemporalDatasource))
    return new TemporalDatasource(options);
  Datasource.call(this, options);
  this._staticSource = util.instantiate(false, options.static, '../lib/datasources/');
  this._timeRangeDatasources = {};
  this._timeRangeBaseUrl = options.baseUrl + options.datasourceName;
  this._timeRangeGateUrl = this._timeRangeBaseUrl + "/timeRangeGate";
  this._loadTimeRanges("../../" + options.gates);
  this._gateDataource = this._constructGateDatasource();
}

Datasource.extend(TemporalDatasource, ['timeRangeGate', 'timeRange', 'triplePattern', 'limit', 'offset', 'totalCount']);

TemporalDatasource.prototype._loadTimeRanges = function(gatesFile) {
  // Destroy old gate datasources
  getValues(this._timeRangeDatasources).forEach((datasource) => datasource.close());
  this._timeRangeDatasources = {};
  var self = this;

  // Get new gate configs and instantiate new gates
  this._timeRangeConfigs = JSON.parse(fs.readFileSync(path.join(__dirname, gatesFile)));
  for(var timeRangeInterval in this._timeRangeConfigs.gates) {
    var timeRangeConfig = this._timeRangeConfigs.gates[timeRangeInterval];
    var interval = timeRangeInterval.split("\|");
    timeRangeConfig.initial = interval[0];
    timeRangeConfig.final = interval[1];
    timeRangeConfig.datasourceUrl = self._timeRangeBaseUrl + "/timeRange?initial=" + timeRangeConfig.initial + "&final=" + timeRangeConfig.final; // TODO: improve
    this._timeRangeDatasources[timeRangeInterval] = util.instantiate({}, timeRangeConfig, '../lib/datasources/');
  }
};

TemporalDatasource.prototype._constructGateDatasource = function() {
  return util.instantiate(false, {
    type: "TimeRangeGateDatasource",
    settings: {
      timeRangeConfigs: getValues(this._timeRangeConfigs.gates)
    }
  }, '../lib/datasources/');
};

function mapReduce(map, f, initial) {
  return Object.keys(map).reduce((previous, k) => f(previous, k, map[k]), initial);
}

function getValues(dict) {
  return mapReduce(dict, (previous, _, v) => {
    previous.push(v);
    return previous;
  }, []);
}

TemporalDatasource.prototype.select = function (query, onError) {
  var self = this,
      dataToMeta = false,
      timeRanges = [];

  // Create a wrapper triple stream
  var tripleStream = new Readable({ objectMode: true });
  tripleStream._read = noop;
  onError && tripleStream.on('error', onError);

  var delegatedTripleStream = attemptFeatures(query, {
    "timeRangeGate": function(q) {
      dataToMeta = true;
      return self._gateDataource.select(q, onError, true);
    },
    "timeRange": function(q) {
      var timeRangeId = q.initial + "|" + q.final;
      var datasource = self._timeRangeDatasources[timeRangeId];
      return datasource.select(q, onError, true);
    }}, function(q) {
    return self._staticSource.select(q, onError, true);
  });

  // TODO: more generic?
  delegatedTripleStream.on('data', function(d) {
    if(d && dataToMeta) {
      timeRanges.push(d);
    } else {
      tripleStream.emit('data', d);
    }
  });
  delegatedTripleStream.on('error', function(d) {
    tripleStream.emit('error', d);
  });
  delegatedTripleStream.on('end', function(d) {
    tripleStream.emit('end', d);
  });
  delegatedTripleStream.on('metadata', function(metadata) {
    metadata.timeRangeGate = self._timeRangeGateUrl;
    if(dataToMeta) {
      metadata.timeRanges = timeRanges;
    }
    tripleStream.emit('metadata', metadata);
  });

  return tripleStream;
};

// Writes the results of the query to the given triple stream
TemporalDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var offset =  query.offset || 0, limit = query.limit || Infinity,
    triples = this._tripleStore.findByIRI(query.subject, query.predicate, query.object);
  // Send the metadata
  metadataCallback({ totalCount: triples.length });
  // Send the requested subset of triples
  for (var i = offset, l = Math.min(offset + limit, triples.length); i < l; i++)
    tripleStream.push(triples[i]);
  tripleStream.push(null);
};

function attemptFeatures(query, featureMap, defaultFunction) {
  for(var feature in featureMap) {
    if (query.features[feature]) {
      delete query.features[feature];
      var ret = featureMap[feature](query);
      query.features[feature] = true;
      return ret;
    }
  }
  return defaultFunction(query);
}

// The empty function
function noop() {}

module.exports = TemporalDatasource;
