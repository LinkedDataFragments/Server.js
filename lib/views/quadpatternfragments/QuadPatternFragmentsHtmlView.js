/*! @license ©2015 Ruben Taelman - Multimedia Lab / iMinds / Ghent University */

/** A TriplePatternFragmentsHtmlView represents a Quad Pattern Fragment in HTML. */

var TriplePatternFragmentsHtmlView = require('../triplepatternfragments/TriplePatternFragmentsHtmlView');

// Creates a new QuadPatternFragmentsHtmlView
function QuadPatternFragmentsHtmlView(settings) {
  if (!(this instanceof QuadPatternFragmentsHtmlView))
    return new QuadPatternFragmentsHtmlView(settings);
  settings = settings || {};
  settings.viewNameOverride = 'QuadPatternFragments';
  TriplePatternFragmentsHtmlView.call(this, settings);
}
TriplePatternFragmentsHtmlView.extend(QuadPatternFragmentsHtmlView);

QuadPatternFragmentsHtmlView.prototype.viewDirectory = 'quadpatternfragments/';

module.exports = QuadPatternFragmentsHtmlView;
