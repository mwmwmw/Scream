const path = require('path');

var exportLibrary = {
    entry: './src/Main.js',
    output: {
      filename: 'scream.js',
      path: path.resolve(__dirname, 'dist'),
      library: "Scream",
      libraryExport: "default",
      libraryTarget: "window",
    }
}

var exportExample = {
    entry: './src/Main.js',
    mode:"development",
    output: {
      filename: 'scream.js',
      path: path.resolve(__dirname, 'examples/js'),
      library: "Scream",
      libraryTarget: "umd",
      globalObject: 'this',
    }
}

module.exports = [exportLibrary, exportExample];