(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Scream"] = factory();
	else
		root["Scream"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/Main.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("var g;\n\n// This works in non-strict mode\ng = (function() {\n\treturn this;\n})();\n\ntry {\n\t// This works if eval is allowed (see CSP)\n\tg = g || new Function(\"return this\")();\n} catch (e) {\n\t// This works if the window reference is available\n\tif (typeof window === \"object\") g = window;\n}\n\n// g can still be undefined, but nothing to do about it...\n// We return undefined, instead of nothing here, so it's\n// easier to handle this case. if(!global) { ...}\n\nmodule.exports = g;\n\n\n//# sourceURL=webpack://Scream/(webpack)/buildin/global.js?");

/***/ }),

/***/ "./src/Components/AmpEnvelope.js":
/*!***************************************!*\
  !*** ./src/Components/AmpEnvelope.js ***!
  \***************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return AmpEnvelope; });\nclass AmpEnvelope {\n\tconstructor (context, gain = 1) {\n\t\tthis.context = context;\n\t\tthis.output = this.context.createGain();\n\t\tthis.output.gain.value = gain;\n\t\tthis.partials = [];\n\t\tthis.velocity = 0;\n\t\tthis.gain = gain;\n\t\tthis._attack = 0;\n\t\tthis._decay = 0.001;\n\t\tthis._sustain = this.output.gain.value;\n\t\tthis._release = 0.001;\n\t}\n\n\ton (velocity) {\n\t\tthis.velocity = velocity / 127;\n\t\tthis.start(this.context.currentTime);\n\t}\n\n\toff (MidiEvent) {\n\t\treturn this.stop(this.context.currentTime);\n\t}\n\n\tstart (time) {\n\t\tthis.output.gain.value = 0;\n\t\tthis.output.gain.setValueAtTime(0, time);\n\t\tthis.output.gain.setTargetAtTime(1, time, this.attack+0.00001);\n\t\tthis.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay);\n\t}\n\n\tstop (time) {\n\t\tthis.sustain = this.output.gain.value;\n\t\tthis.output.gain.cancelScheduledValues(time);\n\t\tthis.output.gain.setValueAtTime(this.sustain, time);\n\t\tthis.output.gain.setTargetAtTime(0, time, this.release+0.00001);\n\t}\n\n\tset attack (value) {\n\t\tthis._attack = value;\n\t}\n\n\tget attack () {\n\t\treturn this._attack\n\t}\n\n\tset decay (value) {\n\t\tthis._decay = value;\n\t}\n\n\tget decay () {\n\t\treturn this._decay;\n\t}\n\n\tset sustain (value) {\n\t\tthis.gain = value;\n\t\tthis._sustain;\n\t}\n\n\tget sustain () {\n\t\treturn this.gain;\n\t}\n\n\tset release (value) {\n\t\tthis._release = value;\n\t}\n\n\tget release () {\n\t\treturn this._release;\n\t}\n\n\tconnect (destination) {\n\t\tthis.output.connect(destination);\n\t}\n}\n\n//# sourceURL=webpack://Scream/./src/Components/AmpEnvelope.js?");

/***/ }),

/***/ "./src/Components/Components.js":
/*!**************************************!*\
  !*** ./src/Components/Components.js ***!
  \**************************************/
/*! exports provided: AmpEnvelope, FilterEnvelope, Sample, SampleMap */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _AmpEnvelope__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AmpEnvelope */ \"./src/Components/AmpEnvelope.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"AmpEnvelope\", function() { return _AmpEnvelope__WEBPACK_IMPORTED_MODULE_0__[\"default\"]; });\n\n/* harmony import */ var _FilterEnvelope__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./FilterEnvelope */ \"./src/Components/FilterEnvelope.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"FilterEnvelope\", function() { return _FilterEnvelope__WEBPACK_IMPORTED_MODULE_1__[\"default\"]; });\n\n/* harmony import */ var _Sample__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Sample */ \"./src/Components/Sample.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Sample\", function() { return _Sample__WEBPACK_IMPORTED_MODULE_2__[\"default\"]; });\n\n/* harmony import */ var _SampleMap__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./SampleMap */ \"./src/Components/SampleMap.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"SampleMap\", function() { return _SampleMap__WEBPACK_IMPORTED_MODULE_3__[\"default\"]; });\n\n\n\n\n\n\n\n//# sourceURL=webpack://Scream/./src/Components/Components.js?");

/***/ }),

/***/ "./src/Components/FilterEnvelope.js":
/*!******************************************!*\
  !*** ./src/Components/FilterEnvelope.js ***!
  \******************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Filter; });\n/* harmony import */ var _Constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Constants */ \"./src/Constants.js\");\n\n\nclass Filter {\n\tconstructor (context, type = _Constants__WEBPACK_IMPORTED_MODULE_0__[\"FILTER_TYPES\"][0], cutoff = 1000, resonance = 0.1) {\n\t\tthis.context = context;\n\t\tthis.destination = this.context.createBiquadFilter();\n\t\tthis.type = type;\n\t\tthis.cutoff = cutoff;\n\t\tthis.resonance = 0.5;\n\t\tthis.envelopeAmount = 1;\n\t\tthis.envelope = {\n\t\t\ta: 0,\n\t\t\td: 0.5,\n\t\t\ts: this.cutoff,\n\t\t\tr: 0.5\n\t\t};\n\t}\n\n\ton (MidiEvent) {\n\t\tthis.start(this.context.currentTime, MidiEvent.frequency);\n\t}\n\n\toff () {\n\t\treturn this.stop(this.context.currentTime);\n\t}\n\n\tset type (value) {\n\t\tthis.destination.type = value;\n\t}\n\n\tget type () {\n\t\treturn this.destination.type;\n\t}\n\n\tset cutoff (value) {\n\t\tthis.destination.frequency.value = value;\n\t}\n\n\tget cutoff () {\n\t\treturn this.destination.frequency.value;\n\t}\n\n\tset Q (value) {\n\t\tthis.destination.Q.value = value;\n\t}\n\n\tget Q () {\n\t\treturn this.destination.Q.value;\n\t}\n\n\tstart (time) {\n\t\treturn this.destination.frequency.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);\n\t}\n\n\tstop (time) {\n\t\treturn this.destination.frequency.setTargetAtTime(this.cutoff, time, this.release);\n\t}\n\n\tset attack (value) {\n\t\tthis.envelope.a = value;\n\t}\n\n\tget attack () {\n\t\treturn this.envelope.a;\n\t}\n\n\tset decay (value) {\n\t\tthis.envelope.d = value;\n\t}\n\n\tget decay () {\n\t\treturn this.envelope.d;\n\t}\n\n\tset sustain (value) {\n\t\tthis.cutoff = value;\n\t}\n\n\tget sustain () {\n\t\treturn this.cutoff;\n\t}\n\n\tset release (value) {\n\t\tthis.envelope.r = value;\n\t}\n\n\tget release () {\n\t\treturn this.envelope.r;\n\t}\n\n\tconnect (destination) {\n\t\tthis.destination.connect(destination);\n\t}\n}\n\n//# sourceURL=webpack://Scream/./src/Components/FilterEnvelope.js?");

/***/ }),

/***/ "./src/Components/Sample.js":
/*!**********************************!*\
  !*** ./src/Components/Sample.js ***!
  \**********************************/
/*! exports provided: RECORD_MODE, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"RECORD_MODE\", function() { return RECORD_MODE; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Sample; });\nconst SAMPLE_BUFFER_SIZE = 2048;\n\nconst PLAYBACK_MODE = {\n\tNORMAL: \"NORMAL\",\n\tPING_PONG: \"PING_PONG\",\n\tREVERSE: \"REVERSE\",\n}\n\nconst RECORD_MODE = {\n\tUSER_MEDIA: \"USER_MEDIA\",\n\tSTREAM: \"STREAM\"\n}\n\nclass Sample {\n\tconstructor (context, recordMode = RECORD_MODE.USER_MEDIA, rawBuffer = new Float32Array(1)) {\n\t\tthis.recordMode = recordMode;\n\t\tthis._recordStream = null;\n\t\tif(this.recordMode === RECORD_MODE.USER_MEDIA) {\n\t\t\tthis.recordInput = context.createGain();\n\t\t} else {\n\t\t\tthis.recordInput = context.createMediaStreamDestination();\n\t\t}\n\t\tthis.context = context;\n\t\tthis.buffer = this.context.createBuffer(2, rawBuffer.length, this.context.sampleRate);\n\t\tthis.rawBuffer = rawBuffer.slice();\n\t\t\n\t\tthis.stream = null;\n\t\tthis._recordProcessor = null;\n\t\tthis.overdub = false;\n\t\tthis.normalize = false;\n\t\tthis.playbackMode = PLAYBACK_MODE.NORMAL;\n\t\tthis.copyRawToBuffer(this.rawBuffer);\n\t}\n\n\tload (path) {\n\t\treturn fetch(path)\n\t\t.then((response) => response.arrayBuffer())\n\t\t.then((myBlob) => {\n\t\t\treturn new Promise((resolve, reject)=>{\n\t\t\t\tthis.context.decodeAudioData(myBlob, resolve, reject);\t\n\t\t\t})\n\t\t})\n\t\t.then((buffer) => {\n\t\t\tthis.rawBuffer = new Float32Array(this.buffer.length);\n\t\t\tthis.rawBuffer = buffer.getChannelData(0);\n\t\t\tthis.setBuffer();\n\t\t\treturn this;\n\t\t})\n\t}\n\n\treverse () {\n\t\tthis.playbackMode = PLAYBACK_MODE.REVERSE;\n\t\tthis.copyRawToBuffer(this.rawBuffer.slice().reverse());\n\t}\n\n\tpingpong () {\n\t\tthis.playbackMode = PLAYBACK_MODE.PING_PONG;\n\t\tlet newArray = new Float32Array(this.rawBuffer.length * 2);\n\t\tnewArray.set(this.rawBuffer, 0);\n\t\tnewArray.set(this.rawBuffer.slice().reverse(), this.rawBuffer.length-1);\n\t\tthis.copyRawToBuffer(newArray);\n\t}\n\n\tnormal () {\n\t\tthis.playbackMode = PLAYBACK_MODE.NORMAL;\n\t\tthis.copyRawToBuffer(this.rawBuffer);\n\t}\n\n\trecord(cb = () => {}) {\n\t\tswitch(this.recordMode) {\n\t\t\tcase RECORD_MODE.STREAM:\n\t\t\t\tthis.recordStream(this.recordInput.stream, cb);\n\t\t\tbreak;\n\t\t\tcase RECORD_MODE.USER_MEDIA:\n\t\t\t\tnavigator.mediaDevices.getUserMedia({audio: true, video: false})\n\t\t\t\t.then((stream) =>this.recordStream(stream, cb))\n\t\t\tbreak;\n\t\t}\n\t}\n\n\trecordStream(stream, cb = ()=>{}) {\n\t\t\tthis.buffered = 0;\n\t\t\tthis.stream = new Float32Array(0);\n\t\t\tthis._recordStream = this.context.createMediaStreamSource(stream);\n\t\t\tthis._recordProcessor = this.context.createScriptProcessor(SAMPLE_BUFFER_SIZE, 1, 2);\n\t\t\tthis._recordStream.connect(this._recordProcessor);\n\t\t\tthis._recordProcessor.connect(this.context.destination);\n\t\t\tthis._recordProcessor.onaudioprocess = (e) => {\n\t\t\t\tlet chunk = e.inputBuffer.getChannelData(0);\n\t\t\t\tvar newStream = new Float32Array(this.stream.length + chunk.length);\n\t\t\t\t\tnewStream.set(this.stream);\n\t\t\t\t\tnewStream.set(chunk,chunk.length * this.buffered);\n\t\t\t\t\tthis.stream = newStream;\n\t\t\t\tthis.buffered++;\n\t\t\t\tcb(this.stream.length, this.buffered);\n\t\t\t};\n\t}\n\n\tstopRecording() {\n\t\tthis._recordStream.disconnect(this._recordProcessor);\n\t\tthis._recordProcessor.disconnect(this.context.destination);\n\t\tthis._recordProcessor.onaudioprocess = null;\n\t\tthis._recordProcessor.disconnect();\n\n\t\tlet recordedBuffer = this.ramp(this.stream);\n\n\t\tif(this.overdub) {\n\t\t\tlet mixedBuffer = this.mixRawBuffers(recordedBuffer, this.rawBuffer);\n\t\t\tthis.rawBuffer = mixedBuffer;\n\t\t} else {\n\t\t\tthis.rawBuffer = recordedBuffer;\n\t\t}\n\n\t\tthis.setBuffer();\n\t\t\n\t}\n\n\tsetBuffer() {\n\t\tswitch(this.playbackMode) {\n\t\t\tcase PLAYBACK_MODE.NORMAL:\n\t\t\t\tthis.normal();\n\t\t\t\tbreak;\n\t\t\tcase PLAYBACK_MODE.PING_PONG:\n\t\t\t\tthis.pingpong(); \n\t\t\t\tbreak;\n\t\t\tcase PLAYBACK_MODE.REVERSE:\n\t\t\t\tthis.reverse(); \n\t\t\t\tbreak;\n\t\t\tdefault:\n\t\t\t\tthis.normal();\n\t\t\t\tbreak;\n\t\t}\n\t}\n\n\tcopyRawToBuffer(rawBuffer) {\n\t\tlet copyBuffer = rawBuffer;\n\t\tif(this.normalize) {\n\t\t\tcopyBuffer = this.normalize(copyBuffer);\n\t\t}\n\t\tthis.buffer = this.context.createBuffer(2, copyBuffer.length, this.context.sampleRate);\n\t\tthis.buffer.copyToChannel(copyBuffer, 0);\n\t\tthis.buffer.copyToChannel(copyBuffer, 1);\n\t}\n\n\ttrim(buffer) {\n\t\tlet startIndex = 0;\n\t\tfor(let i = 0; i<buffer.length; i++) {\n\t\t\tif(buffer[i] > 0) {\n\t\t\t\tstartIndex = i;\n\t\t\t\tbreak;\n\t\t\t}\n\t\t}\n\t\treturn buffer.slice(startIndex);\n\t}\n\n\tramp(buffer) {\n\t\tlet newBuffer = this.trim(buffer); \n\t\tconst BUFFER_SIZE = 512;\n\t\tif(newBuffer.length > BUFFER_SIZE) {\n\t\t\tfor(let i = 0; i < BUFFER_SIZE; i++) {\n\t\t\t\tnewBuffer[i] = newBuffer[i] * i / BUFFER_SIZE; \n\t\t\t}\n\t\t\tvar j = BUFFER_SIZE;\n\t\t\tfor(let i = newBuffer.length-BUFFER_SIZE; i < newBuffer.length; i++) {\n\t\t\t\tj--;\n\t\t\t\tnewBuffer[i] = newBuffer[i] * j / BUFFER_SIZE; \n\t\t\t}\n\t\t}\n\t\treturn newBuffer;\n\t}\n\n\tnormalize(buffer) {\n\t\tconst b = buffer.slice();\n\t\n\t\tconst va = -0.98; // a\n\t\tconst vb = 0.98;  // b\n\t\n\t\tlet vmin = -(1-0.98); // A\n\t\tlet vmax = (1-0.98); // B\n\t\n\t\tb.forEach(v=>{\n\t\t\tif(v>vmax) {vmax = v};\n\t\t\tif(v<vmin) {vmin = v};\n\t\t});\n\t\n\t\treturn b.map(v=>{\n\t\t\treturn va + (v - vmin) * (vb - va) / (vmax - vmin);\n\t\t})\n\t}\n\n\tmixRawBuffers(bufferA, bufferB) {\n\t\tlet bufferLength = this.getLongestBuffer(bufferA, bufferB);\n\t\tlet mixedBuffer = new Float32Array(bufferLength);\n\t\t\n\t\tfor(let i = 0; i < bufferLength; i++) {\n\t\t\tlet aValue = 0;\n\t\t\tlet bValue = 0;\n\t\t\tif(bufferA[i] != undefined) {\n\t\t\t\taValue = bufferA[i];\n\t\t\t}\n\t\t\tif(bufferB[i] != undefined) {\n\t\t\t\tbValue = bufferB[i];\n\t\t\t}\n\t\t\tmixedBuffer[i] = aValue + bValue;\n\t\t}\n\n\t\treturn mixedBuffer;\n\t}\n\n\tgetLongestBuffer(bufferA, bufferB) {\n\t\treturn bufferA.length > bufferB.length ? bufferA.length : bufferB.length;\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Components/Sample.js?");

/***/ }),

/***/ "./src/Components/SampleMap.js":
/*!*************************************!*\
  !*** ./src/Components/SampleMap.js ***!
  \*************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return SampleMap; });\n/* harmony import */ var _Sample__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Sample */ \"./src/Components/Sample.js\");\n\n\nclass SampleMap {\n\tconstructor (context, sample_map) {\n\t\tthis.context = context;\n\t\tthis.input_map = sample_map;\n\t\tthis.samples = {};\n\t\tthis.loaded = false;\n\t}\n\n\tload () {\n\t\tlet sampleLoad = [];\n\t\tthis.input_map.forEach((sample)=>{\n\t\t\tlet newsample = new _Sample__WEBPACK_IMPORTED_MODULE_0__[\"default\"](this.context);\n\t\t\tnewsample.load(sample.src).then(() => {\n\t\t\t\tthis.samples[sample.value] = Object.assign(sample, {sample:newsample});\n\t\t\t});\n\t\t\tsampleLoad.push(newsample);\n\t\t});\n\t\treturn Promise.all(sampleLoad);\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Components/SampleMap.js?");

/***/ }),

/***/ "./src/Constants.js":
/*!**************************!*\
  !*** ./src/Constants.js ***!
  \**************************/
/*! exports provided: OSCILLATOR_TYPES, FILTER_TYPES, FFT_TYPES, BASE_SAMPLE_TUNING */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"OSCILLATOR_TYPES\", function() { return OSCILLATOR_TYPES; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"FILTER_TYPES\", function() { return FILTER_TYPES; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"FFT_TYPES\", function() { return FFT_TYPES; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"BASE_SAMPLE_TUNING\", function() { return BASE_SAMPLE_TUNING; });\nconst OSCILLATOR_TYPES = [\n  \"sine\",\n  \"square\",\n  \"sawtooth\",\n  \"triangle\",\n  \"custom\"\n];\nconst FILTER_TYPES = [\n  \"lowpass\",\n  \"highpass\",\n  \"bandpass\",\n  \"lowshelf\",\n  \"highshelf\",\n  \"peaking\",\n  \"notch\",\n  \"allpass\"\n];\nconst FFT_TYPES = {\n  FREQUENCY: 0,\n  TIME: 1,\n  FREQUENCY8: 2,\n  TIME8: 3\n};\nconst BASE_SAMPLE_TUNING = 261.625565; // Middle C.\n\n\n//# sourceURL=webpack://Scream/./src/Constants.js?");

/***/ }),

/***/ "./src/Effects/Chorus.js":
/*!*******************************!*\
  !*** ./src/Effects/Chorus.js ***!
  \*******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Chorus; });\n/* harmony import */ var _Effect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Effect */ \"./src/Effects/Effect.js\");\n\n\nclass Chorus extends _Effect__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\tconstructor () {\n\t\tsuper();\n\t\tthis.name = \"chorus\";\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Effects/Chorus.js?");

/***/ }),

/***/ "./src/Effects/Delay.js":
/*!******************************!*\
  !*** ./src/Effects/Delay.js ***!
  \******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Delay; });\n/* harmony import */ var _Effect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Effect */ \"./src/Effects/Effect.js\");\n/* harmony import */ var _Filter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Filter */ \"./src/Effects/Filter.js\");\n\n\n\nclass Delay extends _Effect__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\tconstructor (context) {\n\t\tsuper(context);\n\t\tthis.name = \"delay\";\n\t}\n\n\tsetup () {\n\t\tthis.effect = this.context.createDelay();\n\t\tthis.effect.delayTime.value = 0.5;\n\t\tthis.dry = this.context.createGain();\n\t\tthis.wet = this.context.createGain();\n\t\tthis.feedback = this.context.createGain();\n\t\tthis.feedback.gain.value = 0.75;\n\t\tthis.filter = new _Filter__WEBPACK_IMPORTED_MODULE_1__[\"default\"](this.context, \"bandpass\", 1000, 0.3);\n\t}\n\n\twireUp () {\n\n\t\tthis.input.connect(this.dry);\n\t\tthis.dry.connect(this.output);\n\t\tthis.wet.connect(this.output);\n\n\t\tthis.input.connect(this.effect);\n\t\tthis.effect.connect(this.wet);\n\n\t\tthis.effect.connect(this.filter.input);\n\t\tthis.filter.connect(this.feedback);\n\t\tthis.feedback.connect(this.effect);\n\n\t}\n\n\tset feedbackAmount (value) {\n\t\tlet normalizedValue = value;\n\t\tif (normalizedValue > 0.98) {\n\t\t\tnormalizedValue = 0.98;\n\t\t}\n\t\tthis.feedback.gain.value = normalizedValue;\n\t}\n\n\tget feedbackAmount () {\n\t\treturn this.feedback.gain.value;\n\t}\n\n\tset filterFrequency (value) {\n\t\tthis.filter.effect.frequency.value = value;\n\t}\n\n\tget filterFrequency () {\n\t\treturn this.filter.effect.frequency.value;\n\t}\n\n\tset filterQ (value) {\n\t\tthis.filter.effect.Q.value = value;\n\t}\n\n\tget filterQ () {\n\t\treturn this.filter.effect.Q.value;\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Effects/Delay.js?");

/***/ }),

/***/ "./src/Effects/Effect.js":
/*!*******************************!*\
  !*** ./src/Effects/Effect.js ***!
  \*******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Effect; });\nclass Effect {\n\n\tconstructor (context) {\n\t\tthis.name = \"effect\";\n\t\tthis.context = context;\n\t\tthis.input = this.context.createGain();\n\t\tthis.effect = null;\n\t\tthis.bypassed = false;\n\t\tthis.output = this.context.createGain();\n\t\tthis.setup();\n\t\tthis.wireUp();\n\t}\n\n\tbypass(bool) {\n\t\tif(bool != this.bypassed) {\n\t\t\tthis.bypassed = bool;\n\t\t\tif(bool) {\n\t\t\t\tthis.input.connect(this.output);\n\t\t\t\tthis.input.disconnect(this.effect);\n\t\t\t} else {\n\t\t\t\tthis.input.connect(this.effect);\n\t\t\t\tthis.input.disconnect(this.output);\n\t\t\t}\n\t\t}\n\t}\n\n\tsetup() {\n\t\tthis.effect = this.context.createGain();\n\t}\n\n\twireUp() {\n\t\tthis.input.connect(this.effect);\n\t\tthis.effect.connect(this.output);\n\t}\n\n\tconnect(destination) {\n\t\tthis.output.connect(destination);\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Effects/Effect.js?");

/***/ }),

/***/ "./src/Effects/Effects.js":
/*!********************************!*\
  !*** ./src/Effects/Effects.js ***!
  \********************************/
/*! exports provided: Chorus, Delay, FFT, Filter, Reverb, Saturate */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _Chorus__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Chorus */ \"./src/Effects/Chorus.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Chorus\", function() { return _Chorus__WEBPACK_IMPORTED_MODULE_0__[\"default\"]; });\n\n/* harmony import */ var _Delay__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Delay */ \"./src/Effects/Delay.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Delay\", function() { return _Delay__WEBPACK_IMPORTED_MODULE_1__[\"default\"]; });\n\n/* harmony import */ var _FFT__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./FFT */ \"./src/Effects/FFT.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"FFT\", function() { return _FFT__WEBPACK_IMPORTED_MODULE_2__[\"default\"]; });\n\n/* harmony import */ var _Filter__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Filter */ \"./src/Effects/Filter.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Filter\", function() { return _Filter__WEBPACK_IMPORTED_MODULE_3__[\"default\"]; });\n\n/* harmony import */ var _Reverb__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./Reverb */ \"./src/Effects/Reverb.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Reverb\", function() { return _Reverb__WEBPACK_IMPORTED_MODULE_4__[\"default\"]; });\n\n/* harmony import */ var _Saturate__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./Saturate */ \"./src/Effects/Saturate.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Saturate\", function() { return _Saturate__WEBPACK_IMPORTED_MODULE_5__[\"default\"]; });\n\n\n\n\n\n\n\n\n\n//# sourceURL=webpack://Scream/./src/Effects/Effects.js?");

/***/ }),

/***/ "./src/Effects/FFT.js":
/*!****************************!*\
  !*** ./src/Effects/FFT.js ***!
  \****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* WEBPACK VAR INJECTION */(function(global) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return FFT; });\n/* harmony import */ var _Effect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Effect */ \"./src/Effects/Effect.js\");\n/* harmony import */ var _Constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Constants */ \"./src/Constants.js\");\n\n\n\nif (global.AnalyserNode && !global.AnalyserNode.prototype.getFloatTimeDomainData) {\n    var uint8 = new Uint8Array(2048);\n    global.AnalyserNode.prototype.getFloatTimeDomainData = function(array) {\n      this.getByteTimeDomainData(uint8);\n      for (var i = 0, imax = array.length; i < imax; i++) {\n        array[i] = (uint8[i] - 128) * 0.0078125;\n      }\n    };\n  }\n\nclass FFT extends _Effect__WEBPACK_IMPORTED_MODULE_0__[\"default\"]{\n\tconstructor (context) {\n\t\tsuper(context);\n\t\tthis.name = \"fft\";\n\t\tthis.mode = _Constants__WEBPACK_IMPORTED_MODULE_1__[\"FFT_TYPES\"].FREQUENCY;\n\t}\n\n\tstatic get FFT_TYPES () {\n\t\treturn _Constants__WEBPACK_IMPORTED_MODULE_1__[\"FFT_TYPES\"];\n\t}\n\n\tsetup () {\n\t\tthis.canvas = document.createElement(\"canvas\");\n\t\tthis.canvas.setAttribute(\"id\",\"fft\");\n\t\tthis.ctx = this.canvas.getContext(\"2d\");\n\t\tthis.ctx.canvas.width = 512;\n\t\tthis.ctx.canvas.height = 512;\n\t\tthis.effect = this.context.createAnalyser();\n\t\tthis.effect.fftSize = 2048;\n\t\tthis.effect.maxDecibels = -50;\n\t\tthis.effect.minDecibels = -120;\n\t\tthis.effect.smoothingTimeConstant = 0.9;\n\t\tthis.effect.connect(this.output);\n\t}\n\n\n\tdata () {\n\t\t\n\t\tswitch (this.mode) {\n\t\t\tcase _Constants__WEBPACK_IMPORTED_MODULE_1__[\"FFT_TYPES\"].FREQUENCY:\n\t\t\tvar myDataArray = new Float32Array(this.effect.frequencyBinCount);\n\t\t\tthis.effect.getFloatFrequencyData(myDataArray);\n\t\t\tbreak;\n\t\t\tcase _Constants__WEBPACK_IMPORTED_MODULE_1__[\"FFT_TYPES\"].TIME:\n\t\t\tvar myDataArray = new Float32Array(this.effect.frequencyBinCount);\n\t\t\tthis.effect.getFloatTimeDomainData(myDataArray)\n\t\t\tbreak;\n\t\t\tcase _Constants__WEBPACK_IMPORTED_MODULE_1__[\"FFT_TYPES\"].FREQUENCY8:\n\t\t\tvar myDataArray = new Uint8Array(this.effect.frequencyBinCount);\n\t\t\tthis.effect.getByteFrequencyDomainData(myDataArray)\n\t\t\tbreak;\n\t\t\tcase _Constants__WEBPACK_IMPORTED_MODULE_1__[\"FFT_TYPES\"].TIME8:\n\t\t\tvar myDataArray = new Uint8Array(this.effect.frequencyBinCount);\n\t\t\tthis.effect.getByteTimeDomainData(myDataArray)\n\t\t\tbreak;\n\t\t}\n\t\treturn myDataArray;\n\t}\n\n\n\tdraw () {\n\n\t\tconst myDataArray = this.data();\n\n\t\tvar ctx = this.ctx;\n\t\tctx.save();\n\t\t//ctx.globalAlpha = 0.5;\n\t\tctx.fillStyle = \"rgb(33,33,99)\";\n\t\tctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);\n\t\tctx.restore();\n\t\tvar i = 0;\n\t\tvar width = (ctx.canvas.width / myDataArray.length);\n\t\tvar height = ctx.canvas.height*0.5;\n\n\t\tctx.beginPath();\n\t\tctx.moveTo(0, height);\n\t\tctx.strokeStyle = \"rgb(100,255,255)\";\n\t\tctx.lineWidth=5;\n\n\t\tfor (var point in myDataArray) {\n\t\t\tctx.lineTo(((width) * i), height + (myDataArray[point] * height*10));\n\t\t\ti++;\n\t\t}\n\t\tctx.moveTo(width, height)\n\t\tctx.stroke();\n\n\t\twindow.requestAnimationFrame(() => {\n\t\t\tthis.draw();\n\t\t})\n\t}\n\tget element () {\n\t\treturn this.canvas;\n\t}\n\n\taddToElement(element) {\n\t\telement.appendChild(this.element);\n\t}\n}\n\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../node_modules/webpack/buildin/global.js */ \"./node_modules/webpack/buildin/global.js\")))\n\n//# sourceURL=webpack://Scream/./src/Effects/FFT.js?");

/***/ }),

/***/ "./src/Effects/Filter.js":
/*!*******************************!*\
  !*** ./src/Effects/Filter.js ***!
  \*******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Filter; });\n/* harmony import */ var _Effect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Effect */ \"./src/Effects/Effect.js\");\n/* harmony import */ var _Constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Constants */ \"./src/Constants.js\");\n\n\n\n\nclass Filter extends _Effect__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\tconstructor (context, type = _Constants__WEBPACK_IMPORTED_MODULE_1__[\"FILTER_TYPES\"][0], cutoff = 1000, resonance = 0.9) {\n\t\tsuper(context);\n\t\tthis.name = \"filter\";\n\t\tthis.effect.frequency.value = cutoff;\n\t\tthis.effect.Q.value = resonance;\n\t\tthis.effect.type = type;\n\t}\n\n\tsetup() {\n\t\tthis.effect = this.context.createBiquadFilter();\n\t\tthis.effect.connect(this.output);\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Effects/Filter.js?");

/***/ }),

/***/ "./src/Effects/Reverb.js":
/*!*******************************!*\
  !*** ./src/Effects/Reverb.js ***!
  \*******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Reverb; });\n/* harmony import */ var _Effect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Effect */ \"./src/Effects/Effect.js\");\n/* harmony import */ var _Voices_Noise__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Voices/Noise */ \"./src/Voices/Noise.js\");\n\n\n\n// SAFARI Fix\nconst OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext; \n\nclass Reverb extends _Effect__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\tconstructor (context) {\n\t\tsuper(context);\n\t\tthis.name = \"reverb\";\n\t\tthis.attack = 0;\n\t\tthis.decay = 0.2;\n\t\tthis.release = 0.8;\n\t}\n\n\tsetup () {\n\t\tthis.effect = this.context.createConvolver();\n\n\t\tthis.reverbTime = 2;\n\n\t\tthis.attack = 0.001;\n\t\tthis.decay = 0.2;\n\t\tthis.release = 0.8;\n\n\t\tthis.wet = this.context.createGain();\n\t\tthis.wet.gain.value = 1;\n\t\tthis.dry = this.context.createGain();\n\t\tthis.dry.gain.value = 1;\n\n\t\tthis.renderTail();\n\t\tthis.wireUp();\n\t}\n\n\twireUp() {\n\t\tthis.input.connect(this.dry);\n\t\tthis.input.connect(this.effect);\n\n\t\tthis.dry.connect(this.output);\n\t\tthis.effect.connect(this.wet);\n\t\tthis.wet.connect(this.output);\n\t}\n\n\trenderTail () {\n\t\tconst tailContext = new OfflineAudioContext( 2, this.context.sampleRate * this.reverbTime, this.context.sampleRate );\n\t\t\ttailContext.oncomplete = (buffer) => {\n\t\t\t\tthis.effect.buffer = buffer.renderedBuffer;\n\t\t\t}\n\t\t\n    const tailOsc = new _Voices_Noise__WEBPACK_IMPORTED_MODULE_1__[\"default\"](tailContext, 1);\n          tailOsc.init();\n          tailOsc.connect(tailContext.destination);\n          tailOsc.attack = this.attack;\n          tailOsc.decay = this.decay;\n          tailOsc.release = this.release;\n\t\t\n      \n      tailOsc.on({frequency: 500, velocity: 1});\n\t\t\ttailContext.startRendering();\n\t\tsetTimeout(()=>{\n\t\t\ttailOsc.off(); \n\t\t},1);\n\t}\n\n\tset decayTime(value) {\n\t\tlet dc = value/3;\n\t\tthis.reverbTime = value;\n\t\tthis.attack = 0;\n\t\tthis.decay = dc;\n\t\tthis.release = dc;\n\t\tthis.renderTail();\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Effects/Reverb.js?");

/***/ }),

/***/ "./src/Effects/Saturate.js":
/*!*********************************!*\
  !*** ./src/Effects/Saturate.js ***!
  \*********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Saturate; });\n/* harmony import */ var _Effect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Effect */ \"./src/Effects/Effect.js\");\n\n\nconst MAX = 1;\nconst MIN = 0;\nconst DEFAULT = 100;\nconst WINDOW_SIZE = 512;\n\nclass Saturate extends _Effect__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\tconstructor(context) {\n\t\tsuper(context);\n\t\tthis.name = \"saturate\";\n\t\tthis._amount = DEFAULT;\n\t}\n\n\tsetup() {\n\t\tthis.effect = this.context.createWaveShaper();\n\t\tthis.effect.curve = this.createCurve(400);\n\t\tthis.effect.oversample = '4x';\n\t}\n\n\tcreateCurve(k = DEFAULT) {\n\t\tvar curve = new Float32Array(this.context.sampleRate);\n\t\tvar deg = Math.PI / 180;\n\t\tvar x = 0;\n\t\tfor (var i = 0 ; i < this.context.sampleRate; i++ ) {\n\t\t\tx = i * 2 / this.context.sampleRate - 1;\n\t\t\tcurve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );\n\t\t}\n\t  \treturn curve;\n\t}\n\n\tf(x, range = DEFAULT) {\n\n\t\treturn x * range;\n\t\t//return Math.sin(Math.pow(Math.cos(Math.PI * (x) / 4.0), 1) * range) * ((range / 0.5) * 1.18) *10;\n\t}\n\n\tset amount(value) {\n\t\tthis._amount = 1 + (MIN + (value * MAX));\n\t\tthis.effect.curve = this.createCurve(this._amount);\n\t}\n\n\tget amount() {\n\t\treturn this._amount;\n\t}\n\n\tget element() {\n\t\treturn this.canvas;\n\t}\n\n\taddToElement(element) {\n\t\telement.appendChild(this.element);\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Effects/Saturate.js?");

/***/ }),

/***/ "./src/Main.js":
/*!*********************!*\
  !*** ./src/Main.js ***!
  \*********************/
/*! exports provided: Components, Effects, Voices, Synths */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Components\", function() { return Components; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Effects\", function() { return Effects; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Voices\", function() { return Voices; });\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"Synths\", function() { return Synths; });\n/* harmony import */ var _Components_Components__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Components/Components */ \"./src/Components/Components.js\");\n/* harmony import */ var _Effects_Effects__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Effects/Effects */ \"./src/Effects/Effects.js\");\n/* harmony import */ var _Voices_Voices__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Voices/Voices */ \"./src/Voices/Voices.js\");\n/* harmony import */ var _Synths_Synths__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Synths/Synths */ \"./src/Synths/Synths.js\");\n\n\n\n\n\n// SAFARI Polyfills\nif(!window.AudioBuffer.prototype.copyToChannel) {\n\twindow.AudioBuffer.prototype.copyToChannel = function copyToChannel (buffer,channel) {\n\t\tthis.getChannelData(channel).set(buffer);\n\t}\n}\nif(!window.AudioBuffer.prototype.copyFromChannel) {\n\twindow.AudioBuffer.prototype.copyFromChannel = function copyFromChannel (buffer,channel) {\n\t\tbuffer.set(this.getChannelData(channel));\n\t}\n}\n\nconst Components = {FilterEnvelope: _Components_Components__WEBPACK_IMPORTED_MODULE_0__[\"FilterEnvelope\"], AmpEnvelope: _Components_Components__WEBPACK_IMPORTED_MODULE_0__[\"AmpEnvelope\"], Sample: _Components_Components__WEBPACK_IMPORTED_MODULE_0__[\"Sample\"], SampleMap: _Components_Components__WEBPACK_IMPORTED_MODULE_0__[\"SampleMap\"]};\nconst Effects = {Chorus: _Effects_Effects__WEBPACK_IMPORTED_MODULE_1__[\"Chorus\"], Delay: _Effects_Effects__WEBPACK_IMPORTED_MODULE_1__[\"Delay\"], Filter: _Effects_Effects__WEBPACK_IMPORTED_MODULE_1__[\"Filter\"], Reverb: _Effects_Effects__WEBPACK_IMPORTED_MODULE_1__[\"Reverb\"], FFT: _Effects_Effects__WEBPACK_IMPORTED_MODULE_1__[\"FFT\"], Saturate: _Effects_Effects__WEBPACK_IMPORTED_MODULE_1__[\"Saturate\"]};\nconst Voices = {ComplexVoice: _Voices_Voices__WEBPACK_IMPORTED_MODULE_2__[\"ComplexVoice\"], Noise: _Voices_Voices__WEBPACK_IMPORTED_MODULE_2__[\"Noise\"], SamplePlayer: _Voices_Voices__WEBPACK_IMPORTED_MODULE_2__[\"SamplePlayer\"], Voice: _Voices_Voices__WEBPACK_IMPORTED_MODULE_2__[\"Voice\"]};\nconst Synths = {VSS30: _Synths_Synths__WEBPACK_IMPORTED_MODULE_3__[\"VSS30\"], Vincent: _Synths_Synths__WEBPACK_IMPORTED_MODULE_3__[\"Vincent\"], DrumMachine: _Synths_Synths__WEBPACK_IMPORTED_MODULE_3__[\"DrumMachine\"]};\n\n//# sourceURL=webpack://Scream/./src/Main.js?");

/***/ }),

/***/ "./src/MizzyDevice.js":
/*!****************************!*\
  !*** ./src/MizzyDevice.js ***!
  \****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return MizzyDevice; });\nclass MizzyDevice {\n\tconstructor(context) {\n\t\tthis.context = context;\n\t\tthis.output = this.context.createGain();\n\t\tthis.effectInput = this.output;\n\t\tthis.voices = [];\n\t\tthis.effects = [];\n\t\tthis._attack = 0;\n\t\tthis._decay = 0.001;\n\t\tthis._sustain = this.output.gain.value;\n\t\tthis._release = 0.001;\n\t}\n\n\tNoteOn(MidiEvent) {\n\n\t}\n\n\tNoteOff (MidiEvent) {\n\t\tif(this.voices[MidiEvent.value] != undefined) {\n\t\t\tthis.voices[MidiEvent.value].off(MidiEvent);\n\t\t}\n\t}\n\n\tonCC (MidiEvent) {\n\n\t}\n\n\taddEffect (effect, options) {\n\t\tthis.effects.push(new effect(this.context));\n\t}\n\n\tconnectEffects () {\n\t\tthis.effectInput = this.effects[0].input;\n\t\tfor (let i = this.effects.length - 1; i >= 0; i--) {\n\t\t\tif (i == this.effects.length - 1) {\n\t\t\t\tthis.effects[i].connect(this.output);\n\t\t\t} else {\n\t\t\t\tthis.effects[i].connect(this.effects[i + 1].input)\n\t\t\t}\n\t\t}\n\t}\n\tconnect (destination) {\n\t\tthis.output.connect(destination);\n\t}\n\tdisconnect (destination) {\n\t\tthis.output.disconnect(destination);\n\t}\n\n\tsetVoiceValues() {\n\t\tthis.voices.forEach((voice)=>{\n\t\t\tvoice.attack = this._attack;\n\t\t\tvoice.decay = this._decay;\n\t\t\tvoice.sustain = this._sustain;\n\t\t\tvoice.release = this._release;\n\t\t});\n\t}\n\n\tset attack (value) {\n\t\tthis._attack = value;\n\t\tthis.setVoiceValues();\n\t}\n\n\tget attack () {\n\t\treturn this._attack;\n\t}\n\n\tset decay (value) {\n\t\tthis._decay  = value;\n\t\tthis.setVoiceValues();\n\t}\n\n\tget decay () {\n\t\treturn this._decay;\n\t}\n\n\tset sustain (value) {\n\t\tthis._sustain = value;\n\t\tthis.setVoiceValues();\n\t}\n\n\tget sustain () {\n\t\treturn this._sustain;\n\t}\n\n\tset release (value) {\n\t\tthis._release = value;\n\t\tthis.setVoiceValues();\n\t}\n\n\tget release () {\n\t\treturn this._release;\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/MizzyDevice.js?");

/***/ }),

/***/ "./src/Synths/DrumMachine.js":
/*!***********************************!*\
  !*** ./src/Synths/DrumMachine.js ***!
  \***********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return DrumMachine; });\n/* harmony import */ var _MizzyDevice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../MizzyDevice */ \"./src/MizzyDevice.js\");\n/* harmony import */ var _Voices_SamplePlayer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Voices/SamplePlayer */ \"./src/Voices/SamplePlayer.js\");\n\n\n\nclass DrumMachine extends _MizzyDevice__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\n\tconstructor(context, sample_map) {\n\t\tsuper(context);\n\t\tthis.map = sample_map;\n\t}\n\n\tNoteOn(MidiEvent) {\n\t\tif(this.map.samples[MidiEvent.value] != null) {\n\t\t\tlet voice =\n\t\t\t\tnew _Voices_SamplePlayer__WEBPACK_IMPORTED_MODULE_1__[\"default\"](this.context, this.map.samples[MidiEvent.value].sample.buffer, false, false);\n\t\t\tvoice.init();\n\t\t\tthis.setVoiceValues();\n\t\t\tvoice.connect(this.effectInput);\n\t\t\tvoice.on(MidiEvent);\n\t\t\tthis.voices[MidiEvent.value] = voice;\n\t\t}\n\t}\n}\n\n//# sourceURL=webpack://Scream/./src/Synths/DrumMachine.js?");

/***/ }),

/***/ "./src/Synths/Synths.js":
/*!******************************!*\
  !*** ./src/Synths/Synths.js ***!
  \******************************/
/*! exports provided: Vincent, VSS30, DrumMachine */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _Vincent__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Vincent */ \"./src/Synths/Vincent.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Vincent\", function() { return _Vincent__WEBPACK_IMPORTED_MODULE_0__[\"default\"]; });\n\n/* harmony import */ var _VSS30__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./VSS30 */ \"./src/Synths/VSS30.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"VSS30\", function() { return _VSS30__WEBPACK_IMPORTED_MODULE_1__[\"default\"]; });\n\n/* harmony import */ var _DrumMachine__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./DrumMachine */ \"./src/Synths/DrumMachine.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"DrumMachine\", function() { return _DrumMachine__WEBPACK_IMPORTED_MODULE_2__[\"default\"]; });\n\n\n\n\n\n//# sourceURL=webpack://Scream/./src/Synths/Synths.js?");

/***/ }),

/***/ "./src/Synths/VSS30.js":
/*!*****************************!*\
  !*** ./src/Synths/VSS30.js ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return VSS30; });\n/* harmony import */ var _MizzyDevice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../MizzyDevice */ \"./src/MizzyDevice.js\");\n/* harmony import */ var _Components_Sample__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Components/Sample */ \"./src/Components/Sample.js\");\n/* harmony import */ var _Voices_SamplePlayer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Voices/SamplePlayer */ \"./src/Voices/SamplePlayer.js\");\n\n\n\n\nclass VSS30 extends _MizzyDevice__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\n\tstatic get LOOP_MODES () {\n\t\treturn {\n\t\t\tNORMAL: \"NORMAL\",\n\t\t\tPINGPONG: \"PINGPONG\"\n\t\t}\n\t}\n\n\tconstructor (context) {\n\t\tsuper(context);\n\t\tthis.sample = new _Components_Sample__WEBPACK_IMPORTED_MODULE_1__[\"default\"](this.context);\n\t\tthis.recording = false;\n\t\tthis._loop = true;\n\t\tthis._loopMode = VSS30.LOOP_MODES.NORMAL;\n\t\tthis._reverse = false;\n\t\tthis._loopStart = 0;\n\t\tthis._loopEnd = 1;\n\t\tthis.samplingProgress = 0;\n\t}\n\n\trecord(timeout = 2000, overdub = false) {\n\t\tthis.samplingProgress = 0;\n\t\treturn new Promise((resolve, reject)=>{\n\t\t\tlet requiredSamples = this.context.sampleRate*(timeout/1000);\n\t\t\tif(!this.recording) {\n\t\t\t\tthis.recording = true;\n\t\t\t\tthis.sample.overdub = overdub;\n\t\t\t\tthis.sample.record((streamLength)=>{\n\t\t\t\t\tthis.samplingProgress = streamLength/requiredSamples;\n\t\t\t\t\tif(streamLength > requiredSamples) {\n\t\t\t\t\t\tthis.samplingProgress = 1;\n\t\t\t\t\t\tthis.stopRecording();\n\t\t\t\t\t\tresolve(this);\n\t\t\t\t\t}\n\t\t\t\t});\n\t\t\t}\n\t\t})\n\t}\n\n\tstopRecording() {\n\t\tif(this.recording) {\n\t\t\tthis.recording = false;\n\t\t\tthis.sample.stopRecording();\n\t\t}\n\t}\n\n\tNoteOn (MidiEvent) {\n\t\tlet voice = new _Voices_SamplePlayer__WEBPACK_IMPORTED_MODULE_2__[\"default\"](this.context, this.sample.buffer, this._loop);\n\t\t\tvoice.attack = this.attack;\n\t\t\tvoice.decay = this.decay;\n\t\t\tvoice.sustain = this.sustain;\n\t\t\tvoice.release = this.release;\n\t\t\tvoice.loopStart = this._loopStart;\n\t\t\tvoice.loopEnd = this._loopEnd;\n\t\tvoice.init();\n\t\tvoice.connect(this.effectInput);\n\t\tvoice.on(MidiEvent);\n\t\tthis.voices[MidiEvent.value] = voice;\n\t}\n\n\tset loop (value) {\n\t\tthis._loop = value;\n\t}\n\n\tget loop () {\n\t\treturn this._loop;\n\t}\n\n\tset loopMode (value) {\n\t\tthis._loopMode = value;\n\t}\n\n\tset loopStart(value) {\n\t\tthis._loopStart = value;\n\t\tthis.setVoiceValues();\n\t}\n\n\tset loopMode (value) {\n\t\tthis._loopMode = value;\n\t\tswitch (this._loopMode) {\n\t\t\tcase VSS30.LOOP_MODES.PINGPONG:\n\t\t\t\tthis.sample.pingpong();\n\t\t\t\tbreak;\n\t\t\tcase VSS30.LOOP_MODES.NORMAL:\n\t\t\t\tthis.sample.normal();\n\t\t\t\tbreak;\n\t\t}\n\t\tthis.setVoiceValues();\n\t}\n\n\tget loopMode () {\n\t\treturn this._loopMode;\n\t}\n\n\ttoggleReverse() {\n\t\tthis.sample.reverse();\n\t}\n\n\tget loopStart () {\n\t\treturn this._loopStart;\n\t}\n\n\tset loopEnd(value) {\n\t\tthis._loopEnd = value;\n\t\tthis.setVoiceValues();\n\t}\n\n\tget loopEnd () {\n\t\treturn this._loopEnd;\n\t}\n\n\tget loopLength () {\n\t\treturn this.sample.buffer.duration;\n\t}\n\n\tsetSample( sample ) {\n\t\tthis.sample = sample;\n\t\tthis.setVoiceValues();\n\t}\n\n\tsetVoiceValues() {\n\t\tthis.voices.forEach((voice)=>{\n\t\t\tvoice.attack = this._attack;\n\t\t\tvoice.decay = this._decay;\n\t\t\tvoice.sustain = this._sustain;\n\t\t\tvoice.release = this._release;\n\t\t\tvoice.loopStart = this._loopStart;\n\t\t\tvoice.loopEnd = this._loopEnd;\n\t\t});\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Synths/VSS30.js?");

/***/ }),

/***/ "./src/Synths/Vincent.js":
/*!*******************************!*\
  !*** ./src/Synths/Vincent.js ***!
  \*******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Vincent; });\n/* harmony import */ var _MizzyDevice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../MizzyDevice */ \"./src/MizzyDevice.js\");\n/* harmony import */ var _Voices_ComplexVoice__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Voices/ComplexVoice */ \"./src/Voices/ComplexVoice.js\");\n\n\n\nclass Vincent extends _MizzyDevice__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\n\tconstructor (context, count, type = \"sawtooth\", wideness = 50) {\n\t\tsuper(context);\n\t\tthis.oscillatorType = type;\n\t\tthis.numberOfOscillators = count;\n\t\tthis._wideness = wideness;\n\t}\n\n\tNoteOn (MidiEvent) {\n\t\tlet voice = new _Voices_ComplexVoice__WEBPACK_IMPORTED_MODULE_1__[\"default\"](this.context, this.oscillatorType, this.numberOfOscillators);\n\t\tvoice.init();\n\t\tvoice.attack = this.attack;\n\t\tvoice.decay = this.decay;\n\t\tvoice.sustain = this.sustain;\n\t\tvoice.release = this.release;\n\t\tvoice.connect(this.effectInput);\n\t\tvoice.on(MidiEvent);\n\t\tthis.voices[MidiEvent.value] = voice;\n\t}\n\n\tset wideness (value) {\n\t\tthis._wideness = value;\n\t\tthis.voices.forEach((voice) => voice.wideness = this._wideness);\n\t}\n\n\tget wideness () {\n\t\treturn this._wideness;\n\t}\n\n\tset type (value) {\n\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Synths/Vincent.js?");

/***/ }),

/***/ "./src/Voices/ComplexVoice.js":
/*!************************************!*\
  !*** ./src/Voices/ComplexVoice.js ***!
  \************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return ComplexVoice; });\n/* harmony import */ var _Voice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Voice */ \"./src/Voices/Voice.js\");\n\n\nclass ComplexVoice extends _Voice__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\n\tconstructor (context, type, amount = 3, wideness = 50, analog = 5) {\n\t\tsuper(context, \"none\");\n\t\tthis.type = type;\n\t\tthis.widen = wideness;\n\t\tthis.analog = analog;\n\t\tthis.amount = amount;\n\t\tthis.output.gain.value = 1/amount;\n\t}\n\n\tinit () {\n\t\tvar amount = this.amount;\n\n\t\tfor (let i = 0; i < amount; i++) {\n\t\t\tlet osc = this.context.createOscillator();\n\t\t\tosc.type = this.type;\n\t\t\tif (i > 0) {\n\t\t\t\tvar detune = (i / amount * this.widen);\n\t\t\t\tif (i % 1 == 0) {\n\t\t\t\t\tdetune = -detune;\n\t\t\t\t}\n\t\t\t\tosc.detune.value = detune + (this.analog * Math.random());\n\t\t\t}\n\t\t\tosc.connect(this.ampEnvelope.output);\n\t\t\tosc.start(this.context.currentTime);\n\t\t\tthis.partials.push(osc);\n\t\t}\n\t}\n\n\tset wideness (value) {\n\t\tthis.widen = value;\n\t\tvar amount = this.amount;\n\n\t\tthis.partials.forEach((osc, i) => {\n\t\t\tif (i > 0) {\n\t\t\t\tvar detune = (i / amount * this.widen);\n\t\t\t\tif (i % 1 == 0) {\n\t\t\t\t\tdetune = -detune;\n\t\t\t\t}\n\t\t\t\tosc.detune.value = detune + (this.analog * Math.random());\n\t\t\t}\n\t\t});\n\t}\n\n\tget wideness () {\n\t\treturn this.widen;\n\t}\n}\n\n//# sourceURL=webpack://Scream/./src/Voices/ComplexVoice.js?");

/***/ }),

/***/ "./src/Voices/Noise.js":
/*!*****************************!*\
  !*** ./src/Voices/Noise.js ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Noise; });\n/* harmony import */ var _Voice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Voice */ \"./src/Voices/Voice.js\");\n\n\n\nclass Noise extends _Voice__WEBPACK_IMPORTED_MODULE_0__[\"default\"]{\n\tconstructor(context, gain) {\n\t\tsuper(context, gain);\n\t\tthis._length = 2;\n\t}\n\n\tget length () {\n\t\treturn this._length || 2;\n\t}\n\tset length (value) {\n\t\tthis._length = value;\n\t}\n\n\tinit() {\n\t\tvar lBuffer = new Float32Array(this.length * this.context.sampleRate);\n\t\tvar rBuffer = new Float32Array(this.length * this.context.sampleRate);\n\t\tfor(let i = 0; i < this.length * this.context.sampleRate; i++) {\n\t\t\tlBuffer[i] = 1-(2*Math.random());\n\t\t\trBuffer[i] = 1-(2*Math.random());\n\t\t}\n\t\tlet buffer = this.context.createBuffer(2, this.length * this.context.sampleRate, this.context.sampleRate);\n\t\tbuffer.copyToChannel(lBuffer,0);\n\t\tbuffer.copyToChannel(rBuffer,1);\n\n\t\tlet osc = this.context.createBufferSource();\n\t\t\tosc.buffer = buffer;\n\t\t\tosc.loop = true;\n\t\t\tosc.loopStart = 0;\n\t\t\tosc.loopEnd = 2;\n\t\t\tosc.start(this.context.currentTime);\n\t\t\tosc.connect(this.ampEnvelope.output);\n\t\tthis.partials.push(osc);\n\t}\n\n\ton(MidiEvent) {\n\t\tthis.value = MidiEvent.value;\n\t\tthis.ampEnvelope.on(MidiEvent.velocity || MidiEvent);\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Voices/Noise.js?");

/***/ }),

/***/ "./src/Voices/SamplePlayer.js":
/*!************************************!*\
  !*** ./src/Voices/SamplePlayer.js ***!
  \************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return SamplePlayer; });\n/* harmony import */ var _Voice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Voice */ \"./src/Voices/Voice.js\");\n/* harmony import */ var _Constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Constants */ \"./src/Constants.js\");\n\n\n\nclass SamplePlayer extends _Voice__WEBPACK_IMPORTED_MODULE_0__[\"default\"] {\n\n\tconstructor(context, buffer, loop = true, tune = true, sampleTuneFrequency = _Constants__WEBPACK_IMPORTED_MODULE_1__[\"BASE_SAMPLE_TUNING\"]) {\n\t\tsuper(context);\n\t\tthis.buffer = this.context.createBufferSource();\n\t\tthis.buffer.buffer = buffer;\n\t\tthis.tune = tune;\n\t\tthis.loop = loop;\n\t\tthis.sampleTuneFrequency = sampleTuneFrequency;\n\t\tthis._loopstart = 0;\n\t\tthis._loopend = 0;\n\t\tthis.loopStart = 0;\n\t\tthis.loopEnd = 1;\n\t}\n\n\tinit() {\n\t\tthis.buffer.connect(this.ampEnvelope.output);\n\t\tthis.buffer.loop = this.loop;\n\t\tthis.buffer.loopStart = this._loopstart;\n\t\tthis.buffer.loopEnd = this._loopend;\n\t\tthis.partials.push(this.buffer);\n\t}\n\n\ton(MidiEvent) {\n\t\tlet frequency = MidiEvent.frequency;\n\t\tthis.value = MidiEvent.value;\n\t\tthis.partials.forEach((osc) => {\n\t\t\tosc.start(this.context.currentTime);\n\t\t\tif(this.tune) {\n\t\t\t\tosc.playbackRate.value = frequency / this.sampleTuneFrequency;\n\t\t\t}\n\t\t});\n\t\tthis.ampEnvelope.on(MidiEvent.velocity || MidiEvent);\n\t}\n\n\tset loopStart (value) {\n\t\tthis._loopstart = value * this.loopLength;\n\t\tthis.buffer.loopStart = this._loopstart;\n\t}\n\n\tset loopEnd(value) {\n\t\tthis._loopend = value * this.loopLength;\n\t\tthis.buffer.loopEnd = this._loopend;\n\t}\n\n\tget loopLength () {\n\t\treturn this.buffer.buffer.duration;\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Voices/SamplePlayer.js?");

/***/ }),

/***/ "./src/Voices/Voice.js":
/*!*****************************!*\
  !*** ./src/Voices/Voice.js ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, \"default\", function() { return Voice; });\n/* harmony import */ var _Components_AmpEnvelope__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Components/AmpEnvelope */ \"./src/Components/AmpEnvelope.js\");\n\n\nclass Voice {\n\tconstructor(context, type =\"sawtooth\", gain = 0.1) {\n\t\tthis.context = context;\n\t\tthis.type = type;\n\t\tthis.value = -1;\n\t\tthis.gain = gain;\n\t\tthis.output = this.context.createGain();\n\t\tthis.partials = [];\n\t\tthis.output.gain.value = this.gain;\n\t\tthis.ampEnvelope = new _Components_AmpEnvelope__WEBPACK_IMPORTED_MODULE_0__[\"default\"](this.context);\n\t\tthis.ampEnvelope.connect(this.output);\n\t}\n\n\tinit() {\n\t\tlet osc = this.context.createOscillator();\n\t\t\tosc.type = this.type;\n\t\t\tosc.connect(this.ampEnvelope.output);\n\t\t\tosc.start(this.context.currentTime);\n\t\tthis.partials.push(osc);\n\t}\n\n\ton(MidiEvent) {\n\t\tthis.value = MidiEvent.value;\n\t\tthis.partials.forEach((osc) => {\n\t\t\tosc.frequency.value = MidiEvent.frequency;\n\t\t});\n\t\tthis.ampEnvelope.on(MidiEvent.velocity || MidiEvent);\n\t}\n\n\toff(MidiEvent) {\n\t\tthis.ampEnvelope.off(MidiEvent);\n\t\tthis.partials.forEach((osc) => {\n\t\t\tosc.stop(this.context.currentTime + this.ampEnvelope.release * 4);\n\t\t});\n\t}\n\n\tconnect(destination) {\n\t\tthis.output.connect(destination);\n\t}\n\n\tset attack (value) {\n\t\tthis.ampEnvelope.attack  = value;\n\t}\n\n\tget attack () {\n\t\treturn this.ampEnvelope.attack;\n\t}\n\n\tset decay (value) {\n\t\tthis.ampEnvelope.decay  = value;\n\t}\n\n\tget decay () {\n\t\treturn this.ampEnvelope.decay;\n\t}\n\n\tset sustain (value) {\n\t\tthis.ampEnvelope.sustain = value;\n\t}\n\n\tget sustain () {\n\t\treturn this.ampEnvelope.sustain;\n\t}\n\n\tset release (value) {\n\t\tthis.ampEnvelope.release = value;\n\t}\n\n\tget release () {\n\t\treturn this.ampEnvelope.release;\n\t}\n\n}\n\n//# sourceURL=webpack://Scream/./src/Voices/Voice.js?");

/***/ }),

/***/ "./src/Voices/Voices.js":
/*!******************************!*\
  !*** ./src/Voices/Voices.js ***!
  \******************************/
/*! exports provided: ComplexVoice, Noise, SamplePlayer, Voice */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _ComplexVoice__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ComplexVoice */ \"./src/Voices/ComplexVoice.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"ComplexVoice\", function() { return _ComplexVoice__WEBPACK_IMPORTED_MODULE_0__[\"default\"]; });\n\n/* harmony import */ var _Noise__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Noise */ \"./src/Voices/Noise.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Noise\", function() { return _Noise__WEBPACK_IMPORTED_MODULE_1__[\"default\"]; });\n\n/* harmony import */ var _SamplePlayer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./SamplePlayer */ \"./src/Voices/SamplePlayer.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"SamplePlayer\", function() { return _SamplePlayer__WEBPACK_IMPORTED_MODULE_2__[\"default\"]; });\n\n/* harmony import */ var _Voice__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Voice */ \"./src/Voices/Voice.js\");\n/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, \"Voice\", function() { return _Voice__WEBPACK_IMPORTED_MODULE_3__[\"default\"]; });\n\n\n\n//export {default as PercussionVoice} from \"./Voice\";\n\n\n\n//# sourceURL=webpack://Scream/./src/Voices/Voices.js?");

/***/ })

/******/ });
});