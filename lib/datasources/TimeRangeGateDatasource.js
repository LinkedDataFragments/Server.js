/*! @license ©2014 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** An TimeRangeGateDatasource contains data for all time ranges for a certain datasource. */

var MemoryDatasource = require('./MemoryDatasource');

var tmp = 'http://example.org/temporal#',
    a   = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

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
  for(var timeRangeConfigId in this._timeRangeConfigs) {
    var timeRangeConfig = this._timeRangeConfigs[timeRangeConfigId];
    var timeRangeDatasource = timeRangeConfig.datasourceUrl;
    addTriple(timeRangeDatasource, a, tmp + "Timerange");
  }
  done();
};

module.exports = TimeRangeGateDatasource;
