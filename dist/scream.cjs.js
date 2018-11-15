'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var AmpEnvelope = function () {
	function AmpEnvelope(context) {
		var gain = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
		classCallCheck(this, AmpEnvelope);

		this.context = context;
		this.output = this.context.createGain();
		this.output.gain.value = gain;
		this.partials = [];
		this.velocity = 0;
		this.gain = gain;
		this._attack = 0;
		this._decay = 0.001;
		this._sustain = this.output.gain.value;
		this._release = 0.001;
	}

	createClass(AmpEnvelope, [{
		key: "on",
		value: function on(velocity) {
			this.velocity = velocity / 127;
			this.start(this.context.currentTime);
		}
	}, {
		key: "off",
		value: function off(MidiEvent) {
			return this.stop(this.context.currentTime);
		}
	}, {
		key: "start",
		value: function start(time) {
			this.output.gain.value = 0;
			this.output.gain.setValueAtTime(0, time);
			this.output.gain.setTargetAtTime(1, time, this.attack + 0.00001);
			this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay);
		}
	}, {
		key: "stop",
		value: function stop(time) {
			this.sustain = this.output.gain.value;
			this.output.gain.cancelScheduledValues(time);
			this.output.gain.setValueAtTime(this.sustain, time);
			this.output.gain.setTargetAtTime(0, time, this.release + 0.00001);
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
		}
	}, {
		key: "attack",
		set: function set$$1(value) {
			this._attack = value;
		},
		get: function get$$1() {
			return this._attack;
		}
	}, {
		key: "decay",
		set: function set$$1(value) {
			this._decay = value;
		},
		get: function get$$1() {
			return this._decay;
		}
	}, {
		key: "sustain",
		set: function set$$1(value) {
			this.gain = value;
			this._sustain;
		},
		get: function get$$1() {
			return this.gain;
		}
	}, {
		key: "release",
		set: function set$$1(value) {
			this._release = value;
		},
		get: function get$$1() {
			return this._release;
		}
	}]);
	return AmpEnvelope;
}();

var FILTER_TYPES = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"];
var FFT_TYPES = {
  FREQUENCY: 0,
  TIME: 1,
  FREQUENCY8: 2,
  TIME8: 3
};
var BASE_SAMPLE_TUNING = 261.625565; // Middle C.

var Filter = function () {
	function Filter(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : FILTER_TYPES[0];
		var cutoff = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1000;
		var resonance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.1;
		classCallCheck(this, Filter);

		this.context = context;
		this.destination = this.context.createBiquadFilter();
		this.type = type;
		this.cutoff = cutoff;
		this.resonance = 0.5;
		this.envelopeAmount = 1;
		this.envelope = {
			a: 0,
			d: 0.5,
			s: this.cutoff,
			r: 0.5
		};
	}

	createClass(Filter, [{
		key: "on",
		value: function on(MidiEvent) {
			this.start(this.context.currentTime, MidiEvent.frequency);
		}
	}, {
		key: "off",
		value: function off() {
			return this.stop(this.context.currentTime);
		}
	}, {
		key: "start",
		value: function start(time) {
			return this.destination.frequency.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);
		}
	}, {
		key: "stop",
		value: function stop(time) {
			return this.destination.frequency.setTargetAtTime(this.cutoff, time, this.release);
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.destination.connect(destination);
		}
	}, {
		key: "type",
		set: function set$$1(value) {
			this.destination.type = value;
		},
		get: function get$$1() {
			return this.destination.type;
		}
	}, {
		key: "cutoff",
		set: function set$$1(value) {
			this.destination.frequency.value = value;
		},
		get: function get$$1() {
			return this.destination.frequency.value;
		}
	}, {
		key: "Q",
		set: function set$$1(value) {
			this.destination.Q.value = value;
		},
		get: function get$$1() {
			return this.destination.Q.value;
		}
	}, {
		key: "attack",
		set: function set$$1(value) {
			this.envelope.a = value;
		},
		get: function get$$1() {
			return this.envelope.a;
		}
	}, {
		key: "decay",
		set: function set$$1(value) {
			this.envelope.d = value;
		},
		get: function get$$1() {
			return this.envelope.d;
		}
	}, {
		key: "sustain",
		set: function set$$1(value) {
			this.cutoff = value;
		},
		get: function get$$1() {
			return this.cutoff;
		}
	}, {
		key: "release",
		set: function set$$1(value) {
			this.envelope.r = value;
		},
		get: function get$$1() {
			return this.envelope.r;
		}
	}]);
	return Filter;
}();

var SAMPLE_BUFFER_SIZE = 1024;

var RECORD_MODE = {
	USER_MEDIA: "USER_MEDIA",
	STREAM: "STREAM"
};

var Sample = function () {
	function Sample(context) {
		var recordMode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : RECORD_MODE.USER_MEDIA;
		classCallCheck(this, Sample);

		this.recordMode = recordMode;
		this._recordStream = null;
		if (this.recordMode === RECORD_MODE.USER_MEDIA) {
			this.recordInput = context.createGain();
		} else {
			this.recordInput = context.createMediaStreamDestination();
		}
		this.context = context;
		this.buffer = this.context.createBuffer(2, 1, this.context.sampleRate);
		this.rawBuffer = new Float32Array(this.buffer.length);
		this.buffer.copyFromChannel(this.rawBuffer, 1, 0);
		this.stream = null;
		this._recordProcessor = null;
		this.overdub = false;
	}

	createClass(Sample, [{
		key: "load",
		value: function load(path) {
			var _this = this;

			return fetch(path).then(function (response) {
				return response.arrayBuffer();
			}).then(function (myBlob) {
				return _this.context.decodeAudioData(myBlob);
			}).then(function (buffer) {
				_this.rawBuffer = new Float32Array(_this.buffer.length);
				_this.rawBuffer = buffer.getChannelData(0);
				_this.buffer = _this.context.createBuffer(2, _this.rawBuffer.length, _this.context.sampleRate);
				_this.buffer.copyToChannel(_this.rawBuffer, 0);
				_this.buffer.copyToChannel(_this.rawBuffer, 1);
				return _this;
			});
		}
	}, {
		key: "reverse",
		value: function reverse() {
			var reverse = new Float32Array(this.rawBuffer);
			reverse.reverse();
			this.buffer = this.context.createBuffer(2, reverse.length, this.context.sampleRate);
			this.buffer.copyToChannel(reverse, 0);
			this.buffer.copyToChannel(reverse, 1);
		}
	}, {
		key: "pingpong",
		value: function pingpong() {
			var offset = this.rawBuffer.length;
			var newArray = new Float32Array(offset * 2);
			var reverse = new Float32Array(this.rawBuffer);
			reverse.reverse();
			newArray.set(this.rawBuffer, 0);
			newArray.set(reverse, offset - 1);
			this.buffer = this.context.createBuffer(2, newArray.length, this.context.sampleRate);
			this.buffer.copyToChannel(newArray, 0);
			this.buffer.copyToChannel(newArray, 1);
		}
	}, {
		key: "normal",
		value: function normal() {
			this.buffer = this.context.createBuffer(2, this.rawBuffer.length, this.context.sampleRate);
			this.buffer.copyToChannel(this.rawBuffer, 0);
			this.buffer.copyToChannel(this.rawBuffer, 1);
		}
	}, {
		key: "record",
		value: function record() {
			var _this2 = this;

			switch (this.recordMode) {
				case RECORD_MODE.STREAM:
					this.recordStream(this.recordInput.stream);
					break;
				case RECORD_MODE.USER_MEDIA:
					navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (stream) {
						return _this2.recordStream(stream);
					});
					break;
			}
		}
	}, {
		key: "recordStream",
		value: function recordStream(stream) {
			var _this3 = this;

			this.buffered = 0;
			this.stream = new Float32Array(0);

			this._recordStream = this.context.createMediaStreamSource(stream);
			this._recordProcessor = this.context.createScriptProcessor(SAMPLE_BUFFER_SIZE, 1, 2);

			this._recordStream.connect(this._recordProcessor);
			this._recordProcessor.connect(this.context.destination);
			this._recordProcessor.onaudioprocess = function (e) {
				var chunk = e.inputBuffer.getChannelData(0);
				var newStream = new Float32Array(_this3.stream.length + chunk.length);
				newStream.set(_this3.stream);
				newStream.set(chunk, chunk.length * _this3.buffered);
				_this3.stream = newStream;
				_this3.buffered++;
			};
		}
	}, {
		key: "stopRecording",
		value: function stopRecording() {

			this._recordStream.disconnect(this._recordProcessor);
			this._recordProcessor.disconnect(this.context.destination);
			this._recordProcessor.onaudioprocess = null;
			this.rawBuffer = new Float32Array(this.stream.length);
			this.rawBuffer = this.ramp(this.stream);
			this.buffer = this.context.createBuffer(2, this.stream.length, this.context.sampleRate);
			this.buffer.copyToChannel(this.rawBuffer, 0);
			this.buffer.copyToChannel(this.rawBuffer, 1);
		}
	}, {
		key: "ramp",
		value: function ramp(buffer) {
			var newBuffer = buffer;
			var BUFFER_SIZE = 512;
			if (newBuffer.length > BUFFER_SIZE) {
				for (var i = 0; i < BUFFER_SIZE; i++) {
					newBuffer[i] = newBuffer[i] * i / BUFFER_SIZE;
				}
				var j = BUFFER_SIZE;
				for (var i = newBuffer.length - BUFFER_SIZE; i < newBuffer.length; i++) {
					j--;
					newBuffer[i] = newBuffer[i] * j / BUFFER_SIZE;
				}
			}
			return newBuffer;
		}
	}, {
		key: "overwrite",
		value: function overwrite() {
			this._recordProcessor.disconnect();
			var bufferlength = 0;
			if (this.stream.length > this.buffer.length) {
				bufferlength = this.stream.length;
			} else {
				bufferlength = this.buffer.length;
			}
			var mixedBuffer = new Float32Array(bufferlength);
			var bufferA = this.stream;
			var bufferB = new Float32Array(this.buffer.length);
			this.buffer.copyFromChannel(bufferB, 1, 0);
			for (var i = 0; i < bufferlength; i++) {
				var aValue = 0;
				var bValue = 0;
				if (bufferA[i] != undefined) {
					aValue = bufferA[i];
				}
				if (bufferB[i] != undefined) {
					bValue = bufferB[i];
				}
				mixedBuffer[i] = aValue + bValue;
			}
			this.rawBuffer = this.ramp(mixedBuffer);
			this.buffer = this.context.createBuffer(2, bufferlength, this.context.sampleRate);
			this.buffer.copyToChannel(this.rawBuffer, 0);
			this.buffer.copyToChannel(this.rawBuffer, 1);
			this.overdub = false;
		}
	}]);
	return Sample;
}();

var SampleMap = function () {
	function SampleMap(context, sample_map) {
		classCallCheck(this, SampleMap);

		this.context = context;
		this.input_map = sample_map;
		this.samples = {};
		this.loaded = false;
	}

	createClass(SampleMap, [{
		key: "load",
		value: function load() {
			var _this = this;

			var sampleLoad = [];
			this.input_map.forEach(function (sample) {
				var newsample = new Sample(_this.context);
				newsample.load(sample.src).then(function () {
					_this.samples[sample.value] = Object.assign(sample, { sample: newsample });
				});
				sampleLoad.push(newsample);
			});
			return Promise.all(sampleLoad);
		}
	}]);
	return SampleMap;
}();

var Effect = function () {
	function Effect(context) {
		classCallCheck(this, Effect);

		this.name = "effect";
		this.context = context;
		this.input = this.context.createGain();
		this.effect = null;
		this.bypassed = false;
		this.output = this.context.createGain();
		this.setup();
		this.wireUp();
	}

	createClass(Effect, [{
		key: "bypass",
		value: function bypass(bool) {
			if (bool != this.bypassed) {
				this.bypassed = bool;
				if (bool) {
					this.input.connect(this.output);
					this.input.disconnect(this.effect);
				} else {
					this.input.connect(this.effect);
					this.input.disconnect(this.output);
				}
			}
		}
	}, {
		key: "setup",
		value: function setup() {
			this.effect = this.context.createGain();
		}
	}, {
		key: "wireUp",
		value: function wireUp() {
			this.input.connect(this.effect);
			this.effect.connect(this.output);
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
		}
	}]);
	return Effect;
}();

var Chorus = function (_Effect) {
	inherits(Chorus, _Effect);

	function Chorus() {
		classCallCheck(this, Chorus);

		var _this = possibleConstructorReturn(this, (Chorus.__proto__ || Object.getPrototypeOf(Chorus)).call(this));

		_this.name = "chorus";
		return _this;
	}

	return Chorus;
}(Effect);

var Filter$1 = function (_Effect) {
	inherits(Filter, _Effect);

	function Filter(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : FILTER_TYPES[0];
		var cutoff = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1000;
		var resonance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.9;
		classCallCheck(this, Filter);

		var _this = possibleConstructorReturn(this, (Filter.__proto__ || Object.getPrototypeOf(Filter)).call(this, context));

		_this.name = "filter";
		_this.effect.frequency.value = cutoff;
		_this.effect.Q.value = resonance;
		_this.effect.type = type;
		return _this;
	}

	createClass(Filter, [{
		key: "setup",
		value: function setup() {
			this.effect = this.context.createBiquadFilter();
			this.effect.connect(this.output);
		}
	}]);
	return Filter;
}(Effect);

var Delay = function (_Effect) {
	inherits(Delay, _Effect);

	function Delay(context) {
		classCallCheck(this, Delay);

		var _this = possibleConstructorReturn(this, (Delay.__proto__ || Object.getPrototypeOf(Delay)).call(this, context));

		_this.name = "delay";
		return _this;
	}

	createClass(Delay, [{
		key: "setup",
		value: function setup() {
			this.effect = this.context.createDelay();
			this.effect.delayTime.value = 0.5;
			this.dry = this.context.createGain();
			this.wet = this.context.createGain();
			this.feedback = this.context.createGain();
			this.feedback.gain.value = 0.75;
			this.filter = new Filter$1(this.context, "bandpass", 1000, 0.3);
		}
	}, {
		key: "wireUp",
		value: function wireUp() {

			this.input.connect(this.dry);
			this.dry.connect(this.output);
			this.wet.connect(this.output);

			this.input.connect(this.effect);
			this.effect.connect(this.wet);

			this.effect.connect(this.filter.input);
			this.filter.connect(this.feedback);
			this.feedback.connect(this.effect);
		}
	}, {
		key: "feedbackAmount",
		set: function set$$1(value) {
			var normalizedValue = value;
			if (normalizedValue > 0.98) {
				normalizedValue = 0.98;
			}
			this.feedback.gain.value = normalizedValue;
		},
		get: function get$$1() {
			return this.feedback.gain.value;
		}
	}, {
		key: "filterFrequency",
		set: function set$$1(value) {
			this.filter.effect.frequency.value = value;
		},
		get: function get$$1() {
			return this.filter.effect.frequency.value;
		}
	}, {
		key: "filterQ",
		set: function set$$1(value) {
			this.filter.effect.Q.value = value;
		},
		get: function get$$1() {
			return this.filter.effect.Q.value;
		}
	}]);
	return Delay;
}(Effect);

var FFT = function (_Effect) {
	inherits(FFT, _Effect);

	function FFT(context) {
		classCallCheck(this, FFT);

		var _this = possibleConstructorReturn(this, (FFT.__proto__ || Object.getPrototypeOf(FFT)).call(this, context));

		_this.name = "fft";
		_this.mode = FFT_TYPES.FREQUENCY;
		return _this;
	}

	createClass(FFT, [{
		key: "setup",
		value: function setup() {
			this.canvas = document.createElement("canvas");
			this.canvas.setAttribute("id", "fft");
			this.ctx = this.canvas.getContext("2d");
			this.ctx.canvas.width = 512;
			this.ctx.canvas.height = 512;
			this.effect = this.context.createAnalyser();
			this.effect.fftSize = 2048;
			this.effect.maxDecibels = -50;
			this.effect.minDecibels = -120;
			this.effect.smoothingTimeConstant = 0.9;
			this.effect.connect(this.output);
		}
	}, {
		key: "data",
		value: function data() {

			switch (this.mode) {
				case FFT_TYPES.FREQUENCY:
					var myDataArray = new Float32Array(this.effect.frequencyBinCount);
					this.effect.getFloatFrequencyData(myDataArray);
					break;
				case FFT_TYPES.TIME:
					var myDataArray = new Float32Array(this.effect.frequencyBinCount);
					this.effect.getFloatTimeDomainData(myDataArray);
					break;
				case FFT_TYPES.FREQUENCY8:
					var myDataArray = new Uint8Array(this.effect.frequencyBinCount);
					this.effect.getByteTimeDomainData(myDataArray);
					break;
				case FFT_TYPES.TIME8:
					var myDataArray = new Uint8Array(this.effect.frequencyBinCount);
					this.effect.getByteTimeDomainData(myDataArray);
					break;
			}
			return myDataArray;
		}
	}, {
		key: "draw",
		value: function draw() {
			var _this2 = this;

			var myDataArray = this.data();

			var ctx = this.ctx;
			ctx.save();
			//ctx.globalAlpha = 0.5;
			ctx.fillStyle = "rgb(33,33,99)";
			ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.restore();
			var i = 0;
			var width = ctx.canvas.width / myDataArray.length;
			var height = ctx.canvas.height * 0.5;

			ctx.beginPath();
			ctx.moveTo(0, height);
			ctx.strokeStyle = "rgb(100,255,255)";
			ctx.lineWidth = 5;

			for (var point in myDataArray) {
				ctx.lineTo(width * i, height + myDataArray[point] * height * 10);
				i++;
			}
			ctx.moveTo(width, height);
			ctx.stroke();

			window.requestAnimationFrame(function () {
				_this2.draw();
			});
		}
	}, {
		key: "addToElement",
		value: function addToElement(element) {
			element.appendChild(this.element);
		}
	}, {
		key: "element",
		get: function get$$1() {
			return this.canvas;
		}
	}]);
	return FFT;
}(Effect);

var Voice = function () {
	function Voice(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "sawtooth";
		var gain = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0.1;
		classCallCheck(this, Voice);

		this.context = context;
		this.type = type;
		this.value = -1;
		this.gain = gain;
		this.output = this.context.createGain();
		this.partials = [];
		this.output.gain.value = this.gain;
		this.ampEnvelope = new AmpEnvelope(this.context);
		this.ampEnvelope.connect(this.output);
	}

	createClass(Voice, [{
		key: "init",
		value: function init() {
			var osc = this.context.createOscillator();
			osc.type = this.type;
			osc.connect(this.ampEnvelope.output);
			osc.start(this.context.currentTime);
			this.partials.push(osc);
		}
	}, {
		key: "on",
		value: function on(MidiEvent) {
			this.value = MidiEvent.value;
			this.partials.forEach(function (osc) {
				osc.frequency.value = MidiEvent.frequency;
			});
			this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
		}
	}, {
		key: "off",
		value: function off(MidiEvent) {
			var _this = this;

			this.ampEnvelope.off(MidiEvent);
			this.partials.forEach(function (osc) {
				osc.stop(_this.context.currentTime + _this.ampEnvelope.release * 4);
			});
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
		}
	}, {
		key: "attack",
		set: function set$$1(value) {
			this.ampEnvelope.attack = value;
		},
		get: function get$$1() {
			return this.ampEnvelope.attack;
		}
	}, {
		key: "decay",
		set: function set$$1(value) {
			this.ampEnvelope.decay = value;
		},
		get: function get$$1() {
			return this.ampEnvelope.decay;
		}
	}, {
		key: "sustain",
		set: function set$$1(value) {
			this.ampEnvelope.sustain = value;
		},
		get: function get$$1() {
			return this.ampEnvelope.sustain;
		}
	}, {
		key: "release",
		set: function set$$1(value) {
			this.ampEnvelope.release = value;
		},
		get: function get$$1() {
			return this.ampEnvelope.release;
		}
	}]);
	return Voice;
}();

var Noise = function (_Voice) {
	inherits(Noise, _Voice);

	function Noise(context, gain) {
		classCallCheck(this, Noise);

		var _this = possibleConstructorReturn(this, (Noise.__proto__ || Object.getPrototypeOf(Noise)).call(this, context, gain));

		_this._length = 2;
		return _this;
	}

	createClass(Noise, [{
		key: "init",
		value: function init() {
			var lBuffer = new Float32Array(this.length * this.context.sampleRate);
			var rBuffer = new Float32Array(this.length * this.context.sampleRate);
			for (var i = 0; i < this.length * this.context.sampleRate; i++) {
				lBuffer[i] = Math.random();
				rBuffer[i] = Math.random();
			}
			var buffer = this.context.createBuffer(2, this.length * this.context.sampleRate, this.context.sampleRate);
			buffer.copyToChannel(lBuffer, 0);
			buffer.copyToChannel(rBuffer, 1);

			var osc = this.context.createBufferSource();
			osc.buffer = buffer;
			osc.loop = true;
			osc.loopStart = 0;
			osc.loopEnd = 2;

			osc.start(this.context.currentTime);
			osc.connect(this.ampEnvelope.output);
			this.partials.push(osc);
		}
	}, {
		key: "on",
		value: function on(MidiEvent) {
			this.value = MidiEvent.value;
			this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
		}
	}, {
		key: "length",
		get: function get$$1() {
			return this._length || 2;
		},
		set: function set$$1(value) {
			this._length = value;
		}
	}]);
	return Noise;
}(Voice);

var Reverb = function (_Effect) {
	inherits(Reverb, _Effect);

	function Reverb(context) {
		classCallCheck(this, Reverb);

		var _this = possibleConstructorReturn(this, (Reverb.__proto__ || Object.getPrototypeOf(Reverb)).call(this, context));

		_this.name = "reverb";
		_this.attack = 0;
		_this.decay = 0.2;
		_this.release = 0.8;
		return _this;
	}

	createClass(Reverb, [{
		key: "setup",
		value: function setup() {
			this.effect = this.context.createConvolver();

			this.reverbTime = 2;

			this.attack = 0;
			this.decay = 0.2;
			this.release = 0.8;

			this.wet = this.context.createGain();
			this.wet.gain.value = 1;
			this.dry = this.context.createGain();
			this.dry.gain.value = 1;

			this.buffer = this.renderTail();
			this.wireUp();
		}
	}, {
		key: "wireUp",
		value: function wireUp() {
			this.input.connect(this.dry);
			this.input.connect(this.effect);

			this.dry.connect(this.output);
			this.effect.connect(this.wet);
			this.wet.connect(this.output);
		}
	}, {
		key: "renderTail",
		value: function renderTail() {
			var _this2 = this;

			var tailContext = new OfflineAudioContext(2, this.context.sampleRate * this.reverbTime, this.context.sampleRate);
			var tail = new Noise(tailContext, 1);
			tail.init();
			tail.connect(tailContext.destination);
			tail.attack = this.attack;
			tail.decay = this.decay;
			tail.release = this.release;

			var rt = tailContext.startRendering().then(function (buffer) {
				_this2.effect.buffer = buffer;
			});

			tail.on(100);
			tail.off();

			return rt;
		}
	}, {
		key: "decayTime",
		set: function set$$1(value) {
			var dc = value / 3;
			this.reverbTime = value;
			this.attack = 0;
			this.decay = dc;
			this.release = dc;
			this.buffer = this.renderTail();
		}
	}]);
	return Reverb;
}(Effect);

var MAX = 1;
var MIN = 0;
var DEFAULT = 1;
var WINDOW_SIZE = 512;

var Saturate = function (_Effect) {
	inherits(Saturate, _Effect);

	function Saturate(context) {
		classCallCheck(this, Saturate);

		var _this = possibleConstructorReturn(this, (Saturate.__proto__ || Object.getPrototypeOf(Saturate)).call(this, context));

		_this.name = "saturate";
		_this._amount = DEFAULT;

		_this.canvas = document.createElement("canvas");
		_this.canvas.setAttribute("id", "saturate");
		_this.ctx = _this.canvas.getContext("2d");
		_this.ctx.canvas.width = 512;
		_this.ctx.canvas.height = 512;
		window.requestAnimationFrame(function () {
			_this.draw();
		});
		return _this;
	}

	createClass(Saturate, [{
		key: "setup",
		value: function setup() {
			this.effect = this.context.createWaveShaper();
			this.effect.curve = this.createCurve();
			console.log(this.effect.curve);
			this.effect.oversample = '4x';
		}
	}, {
		key: "createCurve",
		value: function createCurve() {
			var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT;

			var curve = new Float32Array(WINDOW_SIZE);
			var x = 0;
			for (var i = 0; i < WINDOW_SIZE; i++) {
				var x = 1 - i / WINDOW_SIZE * 2;
				curve[i] = this.f(x, amount);
			}

			return curve;
		}
	}, {
		key: "f",
		value: function f(x) {
			var range = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT;


			return x * range;
			//return Math.sin(Math.pow(Math.cos(Math.PI * (x) / 4.0), 1) * range) * ((range / 0.5) * 1.18) *10;
		}
	}, {
		key: "draw",
		value: function draw() {
			var _this2 = this;

			var ctx = this.ctx;
			ctx.save();
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = "rgb(33,33,99)";
			ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.restore();
			var width = 1;

			for (var i = 0; i < this.effect.curve.length; i++) {
				var point = this.effect.curve[i];
				ctx.fillStyle = "rgb(100,255,255)";
				ctx.fillRect(i, WINDOW_SIZE * .5 + point * WINDOW_SIZE, width, 1);
			}

			window.requestAnimationFrame(function () {
				_this2.draw();
			});
		}
	}, {
		key: "addToElement",
		value: function addToElement(element) {
			element.appendChild(this.element);
		}
	}, {
		key: "amount",
		set: function set$$1(value) {
			this._amount = 1 + (MIN + value * MAX);
			this.effect.curve = this.createCurve(this._amount);
		},
		get: function get$$1() {
			return this._amount;
		}
	}, {
		key: "element",
		get: function get$$1() {
			return this.canvas;
		}
	}]);
	return Saturate;
}(Effect);

var ComplexVoice = function (_Voice) {
	inherits(ComplexVoice, _Voice);

	function ComplexVoice(context, type) {
		var amount = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3;
		var wideness = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 50;
		var analog = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 5;
		classCallCheck(this, ComplexVoice);

		var _this = possibleConstructorReturn(this, (ComplexVoice.__proto__ || Object.getPrototypeOf(ComplexVoice)).call(this, context, "none"));

		_this.type = type;
		_this.widen = wideness;
		_this.analog = analog;
		_this.amount = amount;
		_this.output.gain.value = 1 / amount;
		return _this;
	}

	createClass(ComplexVoice, [{
		key: "init",
		value: function init() {
			var amount = this.amount;

			for (var i = 0; i < amount; i++) {
				var osc = this.context.createOscillator();
				osc.type = this.type;
				if (i > 0) {
					var detune = i / amount * this.widen;
					if (i % 1 == 0) {
						detune = -detune;
					}
					osc.detune.value = detune + this.analog * Math.random();
				}
				osc.connect(this.ampEnvelope.output);
				osc.start(this.context.currentTime);
				this.partials.push(osc);
			}
		}
	}, {
		key: "wideness",
		set: function set$$1(value) {
			var _this2 = this;

			this.widen = value;
			var amount = this.amount;

			this.partials.forEach(function (osc, i) {
				if (i > 0) {
					var detune = i / amount * _this2.widen;
					if (i % 1 == 0) {
						detune = -detune;
					}
					osc.detune.value = detune + _this2.analog * Math.random();
				}
			});
		},
		get: function get$$1() {
			return this.widen;
		}
	}]);
	return ComplexVoice;
}(Voice);

var SamplePlayer = function (_Voice) {
	inherits(SamplePlayer, _Voice);

	function SamplePlayer(context, buffer) {
		var loop = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
		var tune = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
		var sampleTuneFrequency = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : BASE_SAMPLE_TUNING;
		classCallCheck(this, SamplePlayer);

		var _this = possibleConstructorReturn(this, (SamplePlayer.__proto__ || Object.getPrototypeOf(SamplePlayer)).call(this, context));

		_this.buffer = _this.context.createBufferSource();
		_this.buffer.buffer = buffer;
		_this.tune = tune;
		_this.loop = loop;
		_this.sampleTuneFrequency = sampleTuneFrequency;
		_this._loopstart = 0;
		_this._loopend = 0;
		_this.loopStart = 0;
		_this.loopEnd = 1;
		return _this;
	}

	createClass(SamplePlayer, [{
		key: "init",
		value: function init() {
			this.buffer.connect(this.ampEnvelope.output);
			this.buffer.loop = this.loop;
			this.buffer.loopStart = this._loopstart;
			this.buffer.loopEnd = this._loopend;
			this.partials.push(this.buffer);
		}
	}, {
		key: "on",
		value: function on(MidiEvent) {
			var _this2 = this;

			var frequency = MidiEvent.frequency;
			this.value = MidiEvent.value;
			this.partials.forEach(function (osc) {
				osc.start(_this2.context.currentTime);
				if (_this2.tune) {
					osc.playbackRate.value = frequency / _this2.sampleTuneFrequency;
				}
			});
			this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
		}
	}, {
		key: "loopStart",
		set: function set$$1(value) {
			this._loopstart = value * this.loopLength;
			this.buffer.loopStart = this._loopstart;
		}
	}, {
		key: "loopEnd",
		set: function set$$1(value) {
			this._loopend = value * this.loopLength;
			this.buffer.loopEnd = this._loopend;
		}
	}, {
		key: "loopLength",
		get: function get$$1() {
			return this.buffer.buffer.duration;
		}
	}]);
	return SamplePlayer;
}(Voice);

var MizzyDevice = function () {
	function MizzyDevice(context) {
		classCallCheck(this, MizzyDevice);

		this.context = context;
		this.output = this.context.createGain();
		this.effectInput = this.output;
		this.voices = [];
		this.effects = [];
		this._attack = 0;
		this._decay = 0.001;
		this._sustain = this.output.gain.value;
		this._release = 0.001;
	}

	createClass(MizzyDevice, [{
		key: "NoteOn",
		value: function NoteOn(MidiEvent) {}
	}, {
		key: "NoteOff",
		value: function NoteOff(MidiEvent) {
			if (this.voices[MidiEvent.value] != undefined) {
				this.voices[MidiEvent.value].off(MidiEvent);
			}
		}
	}, {
		key: "onCC",
		value: function onCC(MidiEvent) {}
	}, {
		key: "addEffect",
		value: function addEffect(effect, options) {
			this.effects.push(new effect(this.context));
		}
	}, {
		key: "connectEffects",
		value: function connectEffects() {
			this.effectInput = this.effects[0].input;
			for (var i = this.effects.length - 1; i >= 0; i--) {
				console.log(this.effects[i]);
				if (i == this.effects.length - 1) {
					this.effects[i].connect(this.output);
				} else {
					this.effects[i].connect(this.effects[i + 1].input);
				}
			}
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
		}
	}, {
		key: "disconnect",
		value: function disconnect(destination) {
			this.output.disconnect(destination);
		}
	}, {
		key: "setVoiceValues",
		value: function setVoiceValues() {
			var _this = this;

			this.voices.forEach(function (voice) {
				voice.attack = _this._attack;
				voice.decay = _this._decay;
				voice.sustain = _this._sustain;
				voice.release = _this._release;
			});
		}
	}, {
		key: "attack",
		set: function set$$1(value) {
			this._attack = value;
			this.setVoiceValues();
		},
		get: function get$$1() {
			return this._attack;
		}
	}, {
		key: "decay",
		set: function set$$1(value) {
			this._decay = value;
			this.setVoiceValues();
		},
		get: function get$$1() {
			return this._decay;
		}
	}, {
		key: "sustain",
		set: function set$$1(value) {
			this._sustain = value;
			this.setVoiceValues();
		},
		get: function get$$1() {
			return this._sustain;
		}
	}, {
		key: "release",
		set: function set$$1(value) {
			this._release = value;
			this.setVoiceValues();
		},
		get: function get$$1() {
			return this._release;
		}
	}]);
	return MizzyDevice;
}();

var Vincent = function (_MizzyDevice) {
	inherits(Vincent, _MizzyDevice);

	function Vincent(context, count) {
		var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "sawtooth";
		var wideness = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 50;
		classCallCheck(this, Vincent);

		var _this = possibleConstructorReturn(this, (Vincent.__proto__ || Object.getPrototypeOf(Vincent)).call(this, context));

		_this.oscillatorType = type;
		_this.numberOfOscillators = count;
		_this._wideness = wideness;
		return _this;
	}

	createClass(Vincent, [{
		key: "NoteOn",
		value: function NoteOn(MidiEvent) {
			var voice = new ComplexVoice(this.context, this.oscillatorType, this.numberOfOscillators);
			voice.init();
			voice.attack = this.attack;
			voice.decay = this.decay;
			voice.sustain = this.sustain;
			voice.release = this.release;
			voice.connect(this.effectInput);
			voice.on(MidiEvent);
			this.voices[MidiEvent.value] = voice;
		}
	}, {
		key: "wideness",
		set: function set$$1(value) {
			var _this2 = this;

			this._wideness = value;
			this.voices.forEach(function (voice) {
				return voice.wideness = _this2._wideness;
			});
		},
		get: function get$$1() {
			return this._wideness;
		}
	}, {
		key: "type",
		set: function set$$1(value) {}
	}]);
	return Vincent;
}(MizzyDevice);

var VSS30 = function (_MizzyDevice) {
	inherits(VSS30, _MizzyDevice);
	createClass(VSS30, null, [{
		key: "LOOP_MODES",
		get: function get$$1() {
			return {
				NORMAL: "NORMAL",
				PINGPONG: "PINGPONG"
			};
		}
	}]);

	function VSS30(context) {
		classCallCheck(this, VSS30);

		var _this = possibleConstructorReturn(this, (VSS30.__proto__ || Object.getPrototypeOf(VSS30)).call(this, context));

		_this.sample = new Sample(_this.context);
		_this.recording = false;
		_this._loop = true;
		_this._loopMode = VSS30.LOOP_MODES.NORMAL;
		_this._reverse = false;
		_this._loopStart = 0;
		_this._loopEnd = 1;
		return _this;
	}

	createClass(VSS30, [{
		key: "record",
		value: function record() {
			var _this2 = this;

			var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
			var overdub = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

			if (!this.recording) {
				console.log("recording...");
				this.recording = true;
				this.sample.overdub = overdub;
				this.sample.record();
				if (timeout != null) {
					setTimeout(function () {
						return _this2.stopRecording();
					}, timeout);
				}
			}
		}
	}, {
		key: "stopRecording",
		value: function stopRecording() {
			if (this.recording) {
				this.recording = false;
				if (!this.sample.overdub) {
					this.sample.stopRecording();
				} else {
					this.sample.overwrite();
				}
			}
		}
	}, {
		key: "NoteOn",
		value: function NoteOn(MidiEvent) {
			var voice = new SamplePlayer(this.context, this.sample.buffer, this._loop);
			voice.attack = this.attack;
			voice.decay = this.decay;
			voice.sustain = this.sustain;
			voice.release = this.release;
			voice.loopStart = this._loopStart;
			voice.loopEnd = this._loopEnd;
			voice.init();
			voice.connect(this.effectInput);
			voice.on(MidiEvent);
			this.voices[MidiEvent.value] = voice;
		}
	}, {
		key: "toggleReverse",
		value: function toggleReverse() {
			this.sample.reverse();
		}
	}, {
		key: "setSample",
		value: function setSample(sample) {
			this.sample = sample;
			this.setVoiceValues();
		}
	}, {
		key: "setVoiceValues",
		value: function setVoiceValues() {
			var _this3 = this;

			this.voices.forEach(function (voice) {
				voice.attack = _this3._attack;
				voice.decay = _this3._decay;
				voice.sustain = _this3._sustain;
				voice.release = _this3._release;
				voice.loopStart = _this3._loopStart;
				voice.loopEnd = _this3._loopEnd;
			});
		}
	}, {
		key: "loop",
		set: function set$$1(value) {
			this._loop = value;
		},
		get: function get$$1() {
			return this._loop;
		}
	}, {
		key: "loopMode",
		set: function set$$1(value) {
			this._loopMode = value;
			switch (this._loopMode) {
				case VSS30.LOOP_MODES.PINGPONG:
					this.sample.pingpong();
					break;
				case VSS30.LOOP_MODES.NORMAL:
					this.sample.normal();
					break;
			}
			this.setVoiceValues();
		},
		get: function get$$1() {
			return this._loopMode;
		}
	}, {
		key: "loopStart",
		set: function set$$1(value) {
			this._loopStart = value;
			this.setVoiceValues();
		},
		get: function get$$1() {
			return this._loopStart;
		}
	}, {
		key: "loopEnd",
		set: function set$$1(value) {
			this._loopEnd = value;
			this.setVoiceValues();
		},
		get: function get$$1() {
			return this._loopEnd;
		}
	}, {
		key: "loopLength",
		get: function get$$1() {
			return this.sample.buffer.duration;
		}
	}]);
	return VSS30;
}(MizzyDevice);

var DrumMachine = function (_MizzyDevice) {
	inherits(DrumMachine, _MizzyDevice);

	function DrumMachine(context, sample_map) {
		classCallCheck(this, DrumMachine);

		var _this = possibleConstructorReturn(this, (DrumMachine.__proto__ || Object.getPrototypeOf(DrumMachine)).call(this, context));

		_this.map = sample_map;
		return _this;
	}

	createClass(DrumMachine, [{
		key: "NoteOn",
		value: function NoteOn(MidiEvent) {
			if (this.map.samples[MidiEvent.value] != null) {
				var voice = new SamplePlayer(this.context, this.map.samples[MidiEvent.value].sample.buffer, false, false);
				voice.init();
				this.setVoiceValues();
				voice.connect(this.effectInput);
				voice.on(MidiEvent);
				this.voices[MidiEvent.value] = voice;
			}
		}
	}]);
	return DrumMachine;
}(MizzyDevice);

var Components = { FilterEnvelope: Filter, AmpEnvelope: AmpEnvelope, Sample: Sample, SampleMap: SampleMap };
var Effects = { Chorus: Chorus, Delay: Delay, Filter: Filter$1, Reverb: Reverb, FFT: FFT, Saturate: Saturate };
var Voices = { ComplexVoice: ComplexVoice, Noise: Noise, SamplePlayer: SamplePlayer, Voice: Voice };
var Synths = { VSS30: VSS30, Vincent: Vincent, DrumMachine: DrumMachine };

exports.Components = Components;
exports.Effects = Effects;
exports.Voices = Voices;
exports.Synths = Synths;

//# sourceMappingURL=scream.cjs.map
