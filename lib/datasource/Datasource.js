/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A Datasource provides base functionality for queryable access to a source of triples. */

// Creates a new Datasource
function Datasource() {
  if (!(this instanceof Datasource))
    return new Datasource();
}

// The query features supported by this data source
Object.defineProperty(Datasource.prototype, 'supportedFeatures', {
  enumerable: true,
  value: {},
});

// Checks whether the data source can evaluate the given query
Datasource.prototype.supportsQuery = function (query) {
  // A query is supported if the data source supports all of its features
  var features = query.features, supportedFeatures = this.supportedFeatures, feature;
  if (features) {
    for (feature in features)
      if (features[feature] && !supportedFeatures[feature])
        return false;
    return true;
  }
  // A query without features is supported if this data source has at least one feature
  else {
    for (feature in supportedFeatures)
      if (supportedFeatures[feature])
        return true;
    return false;
  }
};

// Selects the triples that match the given query, returning a triple stream
Datasource.prototype.select = function (query) {
  if (!this.supportsQuery(query))
    throw new Error('The datasource does not support the given query.');
};

module.exports = Datasource;
