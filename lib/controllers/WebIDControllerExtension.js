/*! @license MIT ©2016 Miel Vander Sande - Ghent University / iMinds */
/* A WebIDControllerExtension extends Triple Pattern Fragments responses with WebID authentication. */

var http = require('http'),
    lru = require('lru-cache'),
    parseCacheControl = require('parse-cache-control'),
    N3 = require('n3'),
    N3Util = N3.Util,
    Util = require('../Util');

var CERT_NS = 'http://www.w3.org/ns/auth/cert#';

// Creates a new WebIDControllerExtension
function WebIDControllerExtension(settings) {
  if (!(this instanceof WebIDControllerExtension))
    return new WebIDControllerExtension(settings);

  this._cache = lru(50);
  this._protocol = settings.protocol || 'http';
}

// Add WebID Link headers
WebIDControllerExtension.prototype._handleRequest = function (request, response, next, settings) {
  // Get WebID from certificate
  if (this._protocol !== 'https') // This WebID implementation requires HTTPS
    return next();

  var self = this,
      certificate = request.connection.getPeerCertificate();

  if (!(certificate.subject && certificate.subject.subjectAltName))
    return this._handleNotAcceptable(request, response, next);

  var webID = certificate.subject.subjectAltName.replace('uniformResourceIdentifier:', '');
  this._verifyWebID(webID, certificate.modulus, parseInt(certificate.exponent, 16),
  function (verified) {
    console.log("WebID verified: ", verified);

    if (!verified)
      return self._handleNotAcceptable(request, response, next);

    next();
  });
};

// Verify webID
WebIDControllerExtension.prototype._verifyWebID = function (webID, modulus, exponent, callback) {
  //request & parse
  var parser = N3.Parser(),
      candidates = {}, verified = false;

  parser.parse(processTriple);

  function processTriple(error, triple, prefixes) {
    if (error)
      console.error('Cannot parse WebID: ' + error);
    else if (triple) {
      switch (triple.predicate) {
        case CERT_NS + 'modulus':
          var webidModulus = N3Util.getLiteralValue(triple.object);
          // Apply parsing method by nodejs
          webidModulus = webidModulus.slice(webidModulus.indexOf('00:') === 0 ? 3 : 0).replace(/:/g, '').toUpperCase();

          if (modulus === webidModulus) {
            console.log('WebID modulus verified');
            if (candidates[triple.subject] && candidates[triple.subject] === exponent)
              verified = true;
            else
              candidates[triple.subject] = webidModulus;
          } else console.log('WebID modulus mismatch: %s (webid) <> %s (cert)', webidModulus, modulus);
          break;
        case CERT_NS + 'exponent':
          var webidExponent = parseInt(N3Util.getLiteralValue(triple.object));

          if (webidExponent === exponent) {
            console.log('WebID exponent verified');
            if (candidates[triple.subject] && candidates[triple.subject] === modulus)
              verified = true;
            else
              candidates[triple.subject] = webidExponent;
          } else console.log('WebID exponent mismatch: %s (webid) <> %s (cert)', webidExponent, exponent);
          break;
      }
    } else callback(verified);
  }

  // Try to get WebID from cache
  var webIDFile = this._cache.get(webID);

  if (webIDFile) {
     parser.addChunk(webIDFile);
     parser.end();
  } else {
    var req = http.request(webID, function(res) {
      res.setEncoding('utf8');
      var response = "";

      res.on('data', function (data) {
        parser.addChunk(data);
        response += data;
      });

      res.on('end', function () {
        parser.end();
        var cacheControl = parseCacheControl(res.getHeader("Cache-Control"));
        this._cache.set(webID, response, cacheControl['max-age']);
      });
    });

    req.on('error', function(e) {
      console.log('Problem with request: ' + e.message);
      callback(false);
    });

    req.end();
  }
};

WebIDControllerExtension.prototype._handleNotAcceptable = function (request, response, next) {
  response.writeHead(401, { 'Content-Type': Util.MIME_PLAINTEXT });
  response.end('Access to ' + request.url + ' is not allowed, WebID verification failed.');
};

module.exports = WebIDControllerExtension;
