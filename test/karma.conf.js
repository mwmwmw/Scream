module.exports = function (config) {
  config.set({
    browsers: [ "PhantomJS" ],
    frameworks: [ "mocha", "chai" ],
    basePath: "../",
    files: [
      "dist/scream.js",
      "test/**/*.js"
    ],
    reporters: [ "mocha" ]
  });
};
