/*! @license ©2015 Miel Vander Sande - Multimedia Lab / iMinds / Ghent University */

/** An SummaryController responds to requests for summaries */

var Controller = require('./Controller'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime'),
    _ = require('lodash'),
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
  this._summariesFolder = summaries.dir || path.join(__dirname, '../summaries');

  // Set up path matching
  this._summariesPath = options.summaries.path  || '/summaries/',
  this._matcher = new RegExp('^' + Util.toRegExp(this._summariesPath) + '(.+)$');
}
Controller.extend(SummaryController);

// Try to serve the requested summary
SummaryController.prototype._handleRequest = function (request, response) {
  var summaryMatch = this._matcher && this._matcher.exec(request.url), datasource;
  if (datasource = summaryMatch && summaryMatch[1]) {
    var summaryFile = path.join(this._summariesFolder, datasource + '.ttl'),
        contents = fs.readFileSync(summaryFile);
        
    response.writeHead(200, {
      'Content-Type': 'text/turtle',
      'Cache-Control': 'public,max-age=604800', // 7 days
    });
    response.end(contents);

    /** TODO: Implement content negotiation for summaries (first decoupling Writers)
    // Read summary triples from file
    var streamParser = new StreamParser(),
        inputStream = fs.createReadStream(summaryFile);
    inputStream.on('error', function (error) {
        self && self._sendNotFound(request, response, writerSettings);
    });
    inputStream.pipe(streamParser);

    // Write the summary
    response.on('error', onError);
    response.setHeader('Content-Type', writerSettings.mimeType);
    response.setHeader('Cache-Control', 'public,max-age=604800');
    writerSettings.writer.writeFragment(response, streamParser);
    **/
  }
  return !!datasource;
};

module.exports = SummaryController;
