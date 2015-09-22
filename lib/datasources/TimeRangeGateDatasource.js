/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An TimeRangeGateDatasource contains data for all time ranges for a certain datasource. */

var MemoryDatasource = require('./MemoryDatasource'),
  N3Parser = require('n3').Parser;

var ACCEPT = 'text/turtle;q=1.0,application/n-triples;q=0.7,text/n3;q=0.6';

// Creates a new TimeRangeGateDatasource
function TimeRangeGateDatasource(options) {
  if (!(this instanceof TimeRangeGateDatasource))
    return new TimeRangeGateDatasource(options);
  MemoryDatasource.call(this, options);
  this._timeRangeConfigs = options.timeRangeConfigs;
}
MemoryDatasource.extend(TimeRangeGateDatasource);

// Retrieves all triples from the document
TimeRangeGateDatasource.prototype._getAllTriples = function (addTriple, done) {
  this._timeRangeConfigs.forEach((timeRangeConfig) => {
    // TODO: expand and improve a bit.
    // TODO: make specific view so that time ranges can be browsed by the user.
    var timeRangeDatasource = timeRangeConfig.datasourceUrl;
    addTriple(timeRangeDatasource, "a", "timerange");
  });
  done();
};

module.exports = TimeRangeGateDatasource;
