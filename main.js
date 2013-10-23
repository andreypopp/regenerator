/**
 * Copyright (c) 2013, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

var assert = require("assert");
var path = require("path");
var transform = require("./lib/visit").transform;
var guessTabWidth = require("./lib/util").guessTabWidth;
var recast = require("recast");
var esprimaHarmony = require("esprima");
var escodegen = require("escodegen");
var genFunExp = /\bfunction\s*\*/;

assert.ok(
  /harmony/.test(esprimaHarmony.version),
  "Bad esprima version: " + esprimaHarmony.version
);

function regenerate(source, opts) {
  opts = opts || {};

  if (!genFunExp.test(source)) {
    return source; // Shortcut: no generators to transform.
  }

  var options = {
    tabWidth: guessTabWidth(source),
    // Use the harmony branch of Esprima that installs with regenerator
    // instead of the master branch that recast provides.
    esprima: esprimaHarmony
  };

  var ast = transform(recast.parse(source, options)).program;

  if (opts.sourceMap) {
    options.sourceMap = opts.sourceMap;
    options.sourceMapWithCode = true;
    var result = escodegen.generate(ast, options);
    result.map = fixSourceMap(result.map);
    return result;
  } else {
    return escodegen.generate(ast, options);
  }

}

/**
 * escodegen generates source mapping which maps to originalLine: false, we
 * filter them out cause it doesn't work properly with a toolset down the road
 */
function fixSourceMap(sourcemap) {
  sourcemap._mappings = sourcemap._mappings.filter(function(mapping) {
    return !!mapping.originalLine;
  });
  return sourcemap;
}

// To modify an AST directly, call require("regenerator").transform(ast).
regenerate.transform = transform;

regenerate.runtime = {
  dev: path.join(__dirname, "runtime", "dev.js"),
  min: path.join(__dirname, "runtime", "min.js")
};

// To transform a string of ES6 code, call require("regenerator")(source);
module.exports = regenerate;
