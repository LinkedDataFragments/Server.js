/*! @license MIT ©2015-2016 Miel Vander Sande - Ghent University / iMinds */
/* An SummaryController responds to requests for summaries */

var Controller = require('./Controller'),
    fs = require('fs'),
    path = require('path'),
    StreamParser = require('n3').StreamParser,
    Util = require('../Util');

// Creates a new SummaryController
function SummaryController(options) {
  if (!(this instanceof SummaryController))
    return new SummaryController(options);
  options = options || {};
  Controller.call(this, options);

  // Settings for data summaries
  var summaries = options.summaries || {};
  this._summariesFolder = path.join(__dirname, summaries.dir || '../../summaries');

  // Set up path matching
  this._summariesPath = summaries.path  || '/summaries/',
  this._matcher = new RegExp('^' + Util.toRegExp(this._summariesPath) + '(.+)$');
}
Controller.extend(SummaryController);

// Tries to serve the requested summary
SummaryController.prototype._handleRequest = function (request, response, next) {
  var summaryMatch = this._matcher && this._matcher.exec(request.url), datasource;
  if (datasource = summaryMatch && summaryMatch[1]) {
    var summaryFile = path.join(this._summariesFolder, datasource + '.ttl');

    // Read summary triples from file
    var streamParser = new StreamParser({ blankNodePrefix: '' }),
        inputStream = fs.createReadStream(summaryFile);
    // If the summary cannot be read, invoke the next controller without error
    inputStream.on('error', function (error) { next(); });
    inputStream.pipe(streamParser);

    // Set caching
    response.setHeader('Cache-Control', 'public,max-age=604800'); // 14 days

    // Render the summary
    var view = this._negotiateView('Summary', request, response);
    view.render({ prefixes: this._prefixes, resultStream: streamParser }, request, response);
  }
  else
    next();
};

module.exports = SummaryController;
