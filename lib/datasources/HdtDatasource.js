/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** A HdtDatasource provides queryable access to an HDT document. */

var Datasource = require('./Datasource'),
    fs = require('fs'),
    hdt = require('hdt');

var escapeSequence = /\\u|\\U/;
var escapeSequences = /\\u([a-zA-Z0-9]{4})|\\U([a-zA-Z0-9]{8})/g;
var needEscape = /[\u0000-\u0019\u00ff-\uffff]/;
var needEscapes = /[\ud800-\udbff][\udc00-\udfff]|[\u0000-\u0019\u00ff-\uffff]/g;

// Creates a new HdtDatasource
function HdtDatasource(options) {
  if (!(this instanceof HdtDatasource))
    return new HdtDatasource(options);
  Datasource.call(this, options);

  // Test whether the HDT file exists
  options = options || {};
  var hdtFile = (options.file || '').replace(/^file:\/\//, '');
  if (!fs.existsSync(hdtFile) || !/\.hdt$/.test(hdtFile))
    throw Error('Not an HDT file: ' + hdtFile);

  // Store requested operations until the HDT document is loaded
  var pendingCloses = [], pendingSearches = [];
  this._hdtDocument = { close:  function () { pendingCloses.push(arguments); },
                        search: function () { pendingSearches.push(arguments); } };

  // Load the HDT document
  hdt.fromFile(hdtFile, function (error, hdtDocument) {
    // Set up an error document if the HDT document could not be opened
    this._hdtDocument = !error ? hdtDocument : hdtDocument = {
      close:  function (callback) { callback && callback(); },
      search: function (s, p, o, op, callback) { callback(error); },
    };
    // Execute pending operations
    pendingSearches.forEach(function (args) { hdtDocument.search.apply(hdtDocument, args); });
    pendingCloses.forEach(function (args) { hdtDocument.close.apply(hdtDocument, args); });
  }, this);
}
Datasource.extend(HdtDatasource, ['triplePattern', 'limit', 'offset', 'totalCount']);

// Writes the results of the query to the given triple stream
HdtDatasource.prototype._executeQuery = function (query, tripleStream, metadataCallback) {
  var subject   = needEscape.test(query.subject)   ? query.subject.replace(needEscapes, charToCode)   : query.subject,
      predicate = needEscape.test(query.predicate) ? query.predicate.replace(needEscapes, charToCode) : query.predicate,
      object    = needEscape.test(query.object)    ? query.object.replace(needEscapes, charToCode)    : query.object;
  // Add unicode escapes to IRIs (TODO: fix this in generation code of HDT library)
  this._hdtDocument.search(subject, predicate, object, { limit: query.limit, offset: query.offset },
    function (error, triples, estimatedTotalCount) {
      if (error) return tripleStream.emit('error', error);
      // Ensure the estimated total count is as least as large as the number of triples
      var tripleCount = triples.length, offset = query.offset || 0;
      if (tripleCount && estimatedTotalCount < offset + tripleCount)
        estimatedTotalCount = offset + (tripleCount < query.limit ? tripleCount : 2 * tripleCount);
      metadataCallback({ totalCount: estimatedTotalCount });
      // Add the triples to the stream
      for (var i = 0; i < tripleCount; i++) {
        // Remove unicode escapes from IRIs (TODO: fix this in generation code of HDT library)
        var triple = triples[i];
        if (escapeSequence.test(triple.subject))
          triple.subject = triple.subject.replace(escapeSequences, codeToChar);
        if (escapeSequence.test(triple.predicate))
          triple.predicate = triple.predicate.replace(escapeSequences, codeToChar);
        if (escapeSequence.test(triple.object))
          triple.object = triple.object.replace(escapeSequences, codeToChar);
        tripleStream.push(triple);
      }
      tripleStream.push(null);
    });
};

// Converts a unicode escape sequence into a unicode character
function codeToChar(match, unicode4, unicode8) {
  if (unicode4)
    return String.fromCharCode(parseInt(unicode4, 16));
  else {
    var charCode = parseInt(unicode8, 16);
    return String.fromCharCode(charCode <= 0xFFFF ? charCode :
                               0xD800 + ((charCode -= 0x10000) / 0x400), 0xDC00 + (charCode & 0x3FF));
  }
}

// Converts a unicode character into its unicode escape sequence
function charToCode(character) {
  // Replace a single character with its 4-bit unicode escape sequence
  if (character.length === 1) {
    character = character.charCodeAt(0).toString(16).toUpperCase();
    return '\\u0000'.substr(0, 6 - character.length) + character;
  }
  // Replace a surrogate pair with its 8-bit unicode escape sequence
  else {
    character = ((character.charCodeAt(0) - 0xD800) * 0x400 +
                 character.charCodeAt(1) + 0x2400).toString(16).toUpperCase();
    return '\\U00000000'.substr(0, 10 - character.length) + character;
  }
}

// Closes the data source
HdtDatasource.prototype.close = function (done) {
  this._hdtDocument.close(done);
};

module.exports = HdtDatasource;
