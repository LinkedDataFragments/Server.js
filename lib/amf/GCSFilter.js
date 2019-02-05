var GCSBuilder = require('golombcodedsets').GCSBuilder,
    murmurhash = require('murmurhash'),
    _ = require('lodash'),
    base64 = require('base64-arraybuffer').encode;

function GCSFilter(tripleStream, query, errorP, callback) {
  // Reestimate power of 2
  var pow2 = nearestPow2(1 / errorP);

  tripleStream.getProperty('metadata', function (metadata) {
    var totalCount = metadata.totalCount;

    // create gcs
    var filters = _.pick(_.assign({
      subject: '?s',
      predicate: '?s',
      object: '?o',
    }, query), function (v) {
      return typeof v === 'string' && v.indexOf('?') === 0;
    });

    for (var variable in filters)
      filters[variable] = new GCSBuilder(totalCount, pow2, murmurhash.v3);

    tripleStream.on('data', function (triple) {
      for (var variable in filters)
        filters[variable].add(triple[variable]);
    });

    tripleStream.on('end', function () {
      for (var variable in filters) {
        filters[variable] = {
          type: 'http://semweb.mmlab.be/ns/membership#GCSFilter',
          filter: base64(filters[variable].finalize()),
          p: 1 / pow2,
        };
      }
      callback(null, filters);
    });
  });
}

function nearestPow2(aSize) {
  return Math.pow(2, Math.round(Math.log(aSize) / Math.log(2)));
}

module.exports = GCSFilter;
