/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An LevelGraphDatasource fetches triples from a LevelGraph store */

var Datasource = require('./Datasource'),
    levelgraph = require('levelgraph');

// Creates a new LevelGraphDatasource for the given database
function LevelGraphDatasource(path) {
  this._database = levelgraph(path);
}

LevelGraphDatasource.prototype = {
  // Queries the database for the given triple pattern
  _query: function (pattern, addTriple, setCount, done) {
    // Prepare the pattern
    if (!pattern.subject)   delete pattern.subject;
    if (!pattern.predicate) delete pattern.predicate;
    if (!pattern.object)    delete pattern.object;

    // Execute the query
    var database = this._database, count = 0, stream = database.getStream(pattern);
    stream.on('data', function (triple) { count++; addTriple && addTriple(triple); });
    stream.on('end', function () { setCount(count); done(); });
    stream.on('error', done);
  },
};
Datasource.extend(LevelGraphDatasource);

module.exports = LevelGraphDatasource;
