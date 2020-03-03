/*! @license MIT ©2015-2016 Miel Vander Sande, Ghent University - imec */
/* An SummaryController responds to requests for summaries */

var Controller = require('@ldf/core').controllers.Controller,
    fs = require('fs'),
    path = require('path'),
    StreamParser = require('n3').StreamParser,
    Util = require('@ldf/core').Util;

// Creates a new SummaryController
class SummaryController extends Controller {
  constructor(options) {
    options = options || {};
    super(options);
    // Settings for data summaries
    var summaries = options.summaries || {};
    this._enabled = summaries.dir || summaries.path;
    this._summariesFolder = summaries.dir || path.join(__dirname, '../../summaries');
    // Set up path matching
    this._summariesPath = summaries.path  || '/summaries/',
    this._matcher = new RegExp('^' + Util.toRegExp(this._summariesPath) + '(.+)$');
  }

  _handleRequest(request, response, next) {
    if (!this._enabled)
      return next();

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
      view.render({ prefixes: this._prefixes, results: streamParser }, request, response);
    }
    else
      next();
  }
}

module.exports = SummaryController;
