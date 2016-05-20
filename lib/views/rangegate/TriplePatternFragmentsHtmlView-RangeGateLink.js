/*! @license ©2016 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A RangeGateLinkHtmlViewExtension extends the Triple Pattern Fragments RDF view with a link to the datasource index. */

var HtmlView = require('../HtmlView');

// Creates a new SummaryHtmlViewExtension
function RangeGateLinkHtmlViewExtension(settings) {
  if (!(this instanceof RangeGateLinkHtmlViewExtension))
    return new RangeGateLinkHtmlViewExtension(settings);
  HtmlView.call(this, 'TriplePatternFragments:Info', settings);
}
HtmlView.extend(RangeGateLinkHtmlViewExtension);

RangeGateLinkHtmlViewExtension.prototype.loopIndexes = function (settings, renderer, done) {
  if (settings.datasource && settings.datasource.settings) {
    var indexes = settings.datasource.settings.indexes;
    var indexNames = Object.keys(indexes);
    var i = 0;
    var nextDone = function () {
      if (i < indexNames.length) {
        settings.index = indexes[indexNames[i++]];
        if (settings.index.index._isApplicable(settings.query)) {
          var baseUrl = settings.datasource.url;
          var posHash = baseUrl.indexOf("#");
          baseUrl = baseUrl.substring(0, posHash < 0 ? baseUrl.length : posHash);
          settings.indexurl = baseUrl + '/range-gate';
          renderer(nextDone);
        } else {
          nextDone();
        }
      } else {
        done();
      }
    };
    nextDone();
  } else {
    done();
  }
};

// Renders the view with the given settings to the response
RangeGateLinkHtmlViewExtension.prototype._render = function (settings, request, response, done) {
  var self = this;
  this.loopIndexes(settings, function(nextDone) {
    self._renderTemplate('rangegate/rangegate-link', settings, request, response, nextDone);
  }, done);
};

module.exports = RangeGateLinkHtmlViewExtension;
