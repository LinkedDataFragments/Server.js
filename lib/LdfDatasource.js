/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An LdfDatasource fetches fragments from a basic Linked Data Fragments server. */

var Datasource = require('./Datasource'),
    N3 = require('n3'),
    UriTemplate = require('uritemplate');

var hydra = 'http://www.w3.org/ns/hydra/core#',
    VoID = 'http://rdfs.org/ns/void#';
var countPredicate = VoID + 'triples';

// Creates a new LdfDatasource for the given endpoint
function LdfDatasource(fragmentTemplate) {
  this._fragmentTemplate = UriTemplate.parse(fragmentTemplate);
}

LdfDatasource.prototype = {
  // Queries the fragment for the given triple pattern
  _query: function (pattern, offset, limit, addTriple, setCount, done) {
    // Fetch the fragment
    // TODO: respect offset and limit
    var fragmentUrl = this._fragmentTemplate.expand(pattern),
        fragment = this.request({ url: fragmentUrl, headers: { accept: 'text/turtle' }}, done),
        filter = this.tripleFilter(pattern), metadataFilter = metadataTriplesFilter(fragmentUrl);
    fragment.on('response', function (response) {
      // If not found, there are no triples matching the pattern
      if (response.statusCode === 404)
        return setCount(0), done();
      // If successful, parse the fragment body
      if (response.statusCode < 300)
        new N3.Parser().parse(fragment, function (error, triple) {
          if (!triple)
            return done(error);
          // If the count triple is found, emit the count value
          if (triple.subject === fragmentUrl && triple.predicate === countPredicate)
            setCount(parseInt(N3.Util.getLiteralValue(triple.object), 10));
          // Emit those triples that match the pattern
          if (addTriple && filter(triple) && !metadataFilter(triple))
            addTriple(triple);
        });
    });
  },
};
Datasource.extend(LdfDatasource);

// Tries to filter fragment metadata for clarity.
// With some triple pattern selectors, such as { ?s ?p ?o },
// the pattern does not allow to separate a fragment's data from its metadata.
// Therefore, the filter below tries to separate the metadata through known properties
// (even though technically, the data can be considered part of the fragment).
function metadataTriplesFilter(fragmentUrl) {
  return function (triple) {
    return triple.subject === fragmentUrl ||
           triple.predicate.indexOf(hydra) === 0 || triple.object.indexOf(hydra) === 0 ||
           triple.predicate.indexOf(VoID)  === 0 || triple.object.indexOf(VoID)  === 0;
  };
}

module.exports = LdfDatasource;
