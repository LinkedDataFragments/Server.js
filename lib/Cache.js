/*! @license ©2014 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** Cache is a hash with a limited number of elements. */

// Creates a new hash with the given maximum number of elements
function Cache(maxSize) {
  var cache = Object.create(null);
  maxSize = isFinite(maxSize) & maxSize > 0 ? maxSize : 1000;

  // Trim the cache at regular intervals
  var trimInterval = setInterval(function () {
    var keys = Object.keys(cache);
    // If too large, drop the oldest items until the size is half the allowed size
    if (keys.length > maxSize)
      for (var l = keys.length - (maxSize >> 1) - 1; l >= 0; l--)
        delete cache[keys[l]];
  }, 60 * 1000);

  // Closing the cache stops the interval timer
  Object.defineProperty(cache, 'close', {
    value: function close() { clearInterval(trimInterval); },
  });

  return cache;
}

module.exports = Cache;
