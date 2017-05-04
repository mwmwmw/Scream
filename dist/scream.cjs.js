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
		this.envelope = {
			a: 0,
			d: 0.1,
			s: this.gain,
			r: 0.5
		};
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
			return this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay + 0.001);
		}
	}, {
		key: "stop",
		value: function stop(time) {
			this.output.gain.cancelScheduledValues(time);
			this.output.gain.setValueAtTime(this.sustain, time);
			this.output.gain.setTargetAtTime(0, time, this.release);
		}
	}, {
		key: "connect",
		value: function connect(destination) {
			this.output.connect(destination);
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
			this.gain = value;
			this.envelope.s = value;
		},
		get: function get$$1() {
			return this.gain;
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
	return AmpEnvelope;
}();

var FILTER_TYPES = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"];

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

var Sample = function () {
	function Sample(context) {
		classCallCheck(this, Sample);


		this.context = context;
		this.buffer = this.context.createBuffer(2, 1, this.context.sampleRate);
		this.stream = null;
		this._recordProcessor = null;
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
				_this.buffer = buffer;
			});
		}
	}, {
		key: "record",
		value: function record() {
			var _this2 = this;

			this.buffered = 0;
			this.stream = new Float32Array(0);
			navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (stream) {
				var input = _this2.context.createMediaStreamSource(stream);
				_this2._recordProcessor = _this2.context.createScriptProcessor(SAMPLE_BUFFER_SIZE, 1, 2);

				input.connect(_this2._recordProcessor);
				_this2._recordProcessor.connect(_this2.context.destination);
				_this2._recordProcessor.onaudioprocess = function (e) {
					var chunk = e.inputBuffer.getChannelData(0);
					var newStream = new Float32Array(_this2.stream.length + chunk.length);
					newStream.set(_this2.stream);
					newStream.set(chunk, chunk.length * _this2.buffered);
					_this2.stream = newStream;
					_this2.buffered++;
				};
			});
		}
	}, {
		key: "stopRecording",
		value: function stopRecording() {
			this._recordProcessor.disconnect();
			this.buffer = this.context.createBuffer(2, this.stream.length, this.context.sampleRate);
			this.buffer.copyToChannel(this.stream, 0);
			this.buffer.copyToChannel(this.stream, 1);
		}
	}, {
		key: "recordInput",
		value: function recordInput(input) {}
	}]);
	return Sample;
}();

var Effect = function () {
	function Effect(context) {
		classCallCheck(this, Effect);

		this.context = context;
		this.input = this.context.createGain();
		this.effect = null;
		this.output = this.context.createGain();
		this.setup();
		this.wireUp();
	}

	createClass(Effect, [{
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
		return possibleConstructorReturn(this, (Chorus.__proto__ || Object.getPrototypeOf(Chorus)).call(this));
	}

	return Chorus;
}(Effect);

var Delay = function (_Effect) {
	inherits(Delay, _Effect);

	function Delay() {
		classCallCheck(this, Delay);
		return possibleConstructorReturn(this, (Delay.__proto__ || Object.getPrototypeOf(Delay)).call(this));
	}

	return Delay;
}(Effect);

var FFT = function (_Effect) {
	inherits(FFT, _Effect);

	function FFT(context) {
		classCallCheck(this, FFT);
		return possibleConstructorReturn(this, (FFT.__proto__ || Object.getPrototypeOf(FFT)).call(this, context));
	}

	createClass(FFT, [{
		key: "setup",
		value: function setup() {
			var _this2 = this;

			this.canvas = document.createElement("canvas");
			this.canvas.setAttribute("id", "fft");
			this.ctx = this.canvas.getContext("2d");
			this.ctx.canvas.width = 1024;
			this.ctx.canvas.height = 400;
			this.effect = this.context.createAnalyser();
			this.effect.fftSize = 1024;
			this.effect.maxDecibels = -50;
			this.effect.minDecibels = -120;
			this.effect.smoothingTimeConstant = 0.9;
			this.effect.connect(this.output);
			window.requestAnimationFrame(function () {
				_this2.draw();
			});
		}
	}, {
		key: "draw",
		value: function draw() {
			var _this3 = this;

			var myDataArray = new Uint8Array(this.effect.frequencyBinCount);
			this.effect.getByteFrequencyData(myDataArray);

			var ctx = this.ctx;
			ctx.save();
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = "rgb(33,33,99)";
			ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.restore();
			var i = 0;
			var width = ctx.canvas.width / myDataArray.length;

			for (var point in myDataArray) {
				ctx.fillStyle = "rgb(100,255,255)";
				ctx.fillRect(width * i, ctx.canvas.height, width, -(myDataArray[point] / 255) * ctx.canvas.height);
				i++;
			}

			window.requestAnimationFrame(function () {
				_this3.draw();
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

var Filter$1 = function (_Effect) {
	inherits(Filter, _Effect);

	function Filter(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : FILTER_TYPES[0];
		var cutoff = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1000;
		var resonance = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.9;
		classCallCheck(this, Filter);

		var _this = possibleConstructorReturn(this, (Filter.__proto__ || Object.getPrototypeOf(Filter)).call(this, context));

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

var Voice = function () {
	function Voice(context) {
		var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "sawtooth";
		classCallCheck(this, Voice);

		this.context = context;
		this.type = type;
		this.value = -1;
		this.gain = 0.1;
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
				osc.frequency.value = MidiEvent.frequency / 4;
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
	}]);
	return Voice;
}();

var Noise = function (_Voice) {
	inherits(Noise, _Voice);

	function Noise(context) {
		var gain = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
		classCallCheck(this, Noise);

		var _this = possibleConstructorReturn(this, (Noise.__proto__ || Object.getPrototypeOf(Noise)).call(this, context, "none"));

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

			var osc = this.context.createBufferSource({
				buffer: buffer,
				loop: true,
				loopStart: 0,
				loopEnd: 2
			});

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

		_this.attack = 0;
		_this.decay = 0.2;
		_this.release = 0.2;
		return _this;
	}

	createClass(Reverb, [{
		key: "setup",
		value: function setup() {
			this.effect = this.context.createConvolver();

			this.reverbTime = 1;

			this.wet = this.context.createGain();
			this.wet.gain.value = 0.4;
			this.dry = this.context.createGain();
			this.dry.gain.value = 0.8;

			this.buffer = this.renderTail();
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
			var buffer = tailContext.createBufferSource();
			var tail = new Noise(tailContext, 1);
			tail.init();
			tail.connect(tailContext.destination);
			tail.attack = this.attack;
			tail.decay = this.decay;
			tail.release = this.release;
			tail.on(100);
			tail.off();
			return tailContext.startRendering().then(function (buffer) {
				_this2.effect.buffer = buffer;
			});
		}
	}]);
	return Reverb;
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
		var sampleTuneFrequency = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : BASE_SAMPLE_TUNING;
		classCallCheck(this, SamplePlayer);

		var _this = possibleConstructorReturn(this, (SamplePlayer.__proto__ || Object.getPrototypeOf(SamplePlayer)).call(this, context));

		_this.buffer = _this.context.createBufferSource(buffer);
		_this.buffer.buffer = buffer;
		_this.loop = loop;
		_this.sampleTuneFrequency = sampleTuneFrequency;
		return _this;
	}

	createClass(SamplePlayer, [{
		key: "init",
		value: function init() {
			var osc = this.buffer;
			osc.connect(this.ampEnvelope.output);
			osc.loop = this.loop;
			this.partials.push(osc);
		}
	}, {
		key: "on",
		value: function on(MidiEvent) {
			var _this2 = this;

			var frequency = MidiEvent.frequency;
			this.value = MidiEvent.value;
			this.partials.forEach(function (osc) {
				osc.start(_this2.context.currentTime);
				osc.playbackRate.value = frequency / _this2.sampleTuneFrequency;
			});
			this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
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
		this.effectInput = this.output;
	}

	createClass(MizzyDevice, [{
		key: "NoteOn",
		value: function NoteOn(MidiEvent) {}
	}, {
		key: "NoteOff",
		value: function NoteOff(MidiEvent) {
			this.voices[MidiEvent.value].off(MidiEvent);
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
	}]);
	return MizzyDevice;
}();

var VSS30 = function (_MizzyDevice) {
	inherits(VSS30, _MizzyDevice);

	function VSS30(context) {
		classCallCheck(this, VSS30);

		var _this = possibleConstructorReturn(this, (VSS30.__proto__ || Object.getPrototypeOf(VSS30)).call(this, context));

		_this.sample = new Sample(_this.context);
		_this.recording = false;
		return _this;
	}

	createClass(VSS30, [{
		key: "record",
		value: function record() {
			var _this2 = this;

			var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

			if (!this.recording) {
				console.log("recording...");
				this.recording = true;
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
				this.sample.stopRecording();
				console.log("stop recording.", this.sample.buffer.length);
			}
		}
	}, {
		key: "NoteOn",
		value: function NoteOn(MidiEvent) {
			var voice = new SamplePlayer(this.context, this.sample.buffer, true);
			voice.init();
			voice.connect(this.effectInput);
			voice.on(MidiEvent);
			this.voices[MidiEvent.value] = voice;
		}
	}]);
	return VSS30;
}(MizzyDevice);

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

var Components = { FilterEnvelope: Filter, AmpEnvelope: AmpEnvelope, Sample: Sample };
var Effects = { Chorus: Chorus, Delay: Delay, Filter: Filter$1, Reverb: Reverb, FFT: FFT };
var Voices = { ComplexVoice: ComplexVoice, Noise: Noise, SamplePlayer: SamplePlayer, Voice: Voice };
var Synths = { VSS30: VSS30, Vincent: Vincent };

exports.Components = Components;
exports.Effects = Effects;
exports.Voices = Voices;
exports.Synths = Synths;

//# sourceMappingURL=scream.cjs.map
