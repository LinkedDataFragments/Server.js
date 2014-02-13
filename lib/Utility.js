/*! @license ©2013 Ruben Verborgh - Multimedia Lab / iMinds / Ghent University */

/** Utility functions for working with collections and triples. */

var Utility = require('lodash');

// Creates a filter for triples that match the given triple pattern
Utility.tripleFilter = function (pattern) {
  return function (triple) {
    return ((!pattern.subject   || pattern.subject   === triple.subject) &&
            (!pattern.predicate || pattern.predicate === triple.predicate) &&
            (!pattern.object    || pattern.object    === triple.object));
  };
};

// Filters those elements of the array that match the given triple pattern
Utility.filterTriples = function (array, pattern) {
  return array.filter(Utility.tripleFilter(pattern));
};

module.exports = Utility;
