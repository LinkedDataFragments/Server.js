/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** An LdfDatasource fetches fragments from another LDF server. */

var Datasource = require('./Datasource'),
    N3 = require('n3'),
    UriTemplate = require('uritemplate');

var countPredicate = 'http://rdfs.org/ns/void#triples';

// Creates a new LdfDatasource for the given endpoint
function LdfDatasource(fragmentTemplate) {
  this._fragmentTemplate = UriTemplate.parse(fragmentTemplate);
}

LdfDatasource.prototype = {
  // Queries the fragment for the given triple pattern
  query: function (pattern, addTriple, setCount, done) {
    // Fetch the fragment
    var fragmentUrl = this._fragmentTemplate.expand(pattern),
        fragment = this.request({ url: fragmentUrl, headers: { accept: 'text/turtle' }}, done),
        filter = this.tripleFilter(pattern);
    fragment.on('response', function (response) {
      // If not found, there are no triples matching the pattern
      if (response.statusCode === 404)
        return setCount(0), done(), fragment.removeListener('error', done);
      // If successful, parse the fragment body
      if (response.statusCode < 300)
        new N3.Parser().parse(fragment, function (error, triple) {
          if (!triple)
            return done && done(error);
          // If the count triple is found, emit the count value
          if (setCount && triple.subject === fragmentUrl && triple.predicate === countPredicate)
            setCount(parseInt(N3.Util.getLiteralValue(triple.object), 10));
          // Emit those triples that match the pattern
          if (addTriple && filter(triple))
            addTriple(triple);
        });
    });
  },
};
Datasource.extend(LdfDatasource);

module.exports = LdfDatasource;
