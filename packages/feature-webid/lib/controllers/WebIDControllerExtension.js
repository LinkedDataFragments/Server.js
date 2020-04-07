/*! @license MIT ©2016 Miel Vander Sande, Ghent University - imec */
/* A WebIDControllerExtension extends Triple Pattern Fragments responses with WebID authentication. */

let http = require('http'),
    lru = require('lru-cache'),
    parseCacheControl = require('parse-cache-control'),
    N3 = require('n3'),
    n3parser = N3.Parser,
    Util = require('@ldf/core').Util,
    Controller = require('@ldf/core').controllers.Controller;

let CERT_NS = 'http://www.w3.org/ns/auth/cert#';

// Creates a new WebIDControllerExtensionsl
class WebIDControllerExtension extends Controller {
  constructor(settings) {
    super(settings);
    this._cache = lru(50);
    this._protocol = settings.urlData.protocol;
  }

  // Add WebID Link headers
  _handleRequest(request, response, next, settings) {
    // Get WebID from certificate
    if (this._protocol !== 'https') // This WebID implementation requires HTTPS
      return next();

    let self = this,
        certificate = request.connection.getPeerCertificate();

    if (!(certificate.subject && certificate.subject.subjectAltName)) {
      return this._handleForbidden(request, response, {
        reason: 'No WebID found in client certificate.',
      });
    }

    let webID = certificate.subject.subjectAltName.replace('uniformResourceIdentifier:', '');
    this._verifyWebID(webID, certificate.modulus, parseInt(certificate.exponent, 16),
      (error, verified, reason) => {
        if (!verified) {
          return self._handleForbidden(request, response, {
            webID: webID,
            reason: reason,
          });
        }
        next();
      });
  }

  // Verify webID
  _verifyWebID(webID, modulus, exponent, callback) {
    // request & parse
    let parser = n3parser(),
        id = {};

    // parse webID
    function parseTriple(error, triple, prefixes) {
      if (error)
        callback('Cannot parse WebID: ' + error);
      else if (triple) {
        switch (triple.predicate) {
        case CERT_NS + 'modulus':
          // Add modulus
          const literalValue = triple.object.value;
          // Apply parsing method by nodejs
          id.modulus = literalValue.slice(literalValue.indexOf('00:') === 0 ? 3 : 0).replace(/:/g, '').toUpperCase();
          break;
        case CERT_NS + 'exponent':
          // Add exponent
          id.exponent = parseInt(triple.object.value, 10);
          break;
        }
      }
    }

    function verify(m, e) {
      if (m && m === modulus && e && e === exponent)
        callback(null, true);
      else
        callback(null, false, 'WebID does not match certificate: ' + m + ' - ' + e + ' (webid) <> ' + modulus + ' - ' + exponent + ' (cert)');
    }

    // Try to get WebID from cache
    let cachedId = this._cache.get(webID);

    if (cachedId)
      verify(cachedId.modulus, cachedId.exponent);
    else {
      let req = http.request(webID, (res) => {
        res.setEncoding('utf8');

        parser.parse(res, parseTriple);

        res.on('end', () => {
          let cacheControl = parseCacheControl(res.headers['Cache-Control'] || '');
          this._cache.set(webID, id, cacheControl['max-age'] || 0);
          verify(id.modulus, id.exponent);
        });
      });

      req.on('error', (e) => {
        callback(null, false, 'Unabled to download ' + webID + ' (' + e.message + ').');
      });

      req.end();
    }
  }

  _handleForbidden(request, response, options) {
    // Render the 404 message using the appropriate view
    let view = this._negotiateView('Forbidden', request, response),
        metadata = {
          url: request.url,
          prefixes: this._prefixes,
          datasources: this._datasources,
          reason: options.reason,
        };
    response.writeHead(401);
    view.render(metadata, request, response);
  }

  _handleNotAcceptable(request, response, options) {
    response.writeHead(401, {
      'Content-Type': Util.MIME_PLAINTEXT,
    });
    response.end('Access to ' + request.url + ' is not allowed, verification for WebID ' + (options.webID || '') + ' failed. Reason: ' + (options.reason || ''));
  }
}

module.exports = WebIDControllerExtension;
