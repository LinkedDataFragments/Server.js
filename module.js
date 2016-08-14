/*! @license MIT ©2015-2016 Ruben Verborgh - Ghent University / iMinds */
/* Exports of the ldf-server package for use as a submodule (as opposed to standalone) */

var fs = require('fs'),
    path = require('path');

// Export all modules in the `lib` folder
module.exports = readModules(path.join(__dirname, 'lib'));

// Reads modules in the given folder and subfolders
function readModules(folder) {
  var modules = {};
  fs.readdirSync(folder).forEach(function (name) {
    var location = path.join(folder, name), item = fs.statSync(location);
    // Add script files by including them
    if (item.isFile()) {
      var scriptMatch = name.match(/(\w+)\.js$/);
      if (scriptMatch) {
        try { modules[scriptMatch[1]] = require(location); }
        catch (error) { /* ignore modules that cannot be instantiated */ }
      }
    }
    // Add folders by recursing over them
    else if (item.isDirectory()) {
      modules[name] = readModules(location);
    }
  });
  return modules;
}
