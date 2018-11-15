class AmpEnvelope {
	constructor (context, gain = 1) {
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

	on (velocity) {
		this.velocity = velocity / 127;
		this.start(this.context.currentTime);
	}

	off (MidiEvent) {
		return this.stop(this.context.currentTime);
	}

	start (time) {
		this.output.gain.value = 0;
		this.output.gain.setValueAtTime(0, time);
		this.output.gain.setTargetAtTime(1, time, this.attack+0.00001);
		this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay);
	}

	stop (time) {
		this.sustain = this.output.gain.value;
		this.output.gain.cancelScheduledValues(time);
		this.output.gain.setValueAtTime(this.sustain, time);
		this.output.gain.setTargetAtTime(0, time, this.release+0.00001);
	}

	set attack (value) {
		this._attack = value;
	}

	get attack () {
		return this._attack
	}

	set decay (value) {
		this._decay = value;
	}

	get decay () {
		return this._decay;
	}

	set sustain (value) {
		this.gain = value;
		this._sustain;
	}

	get sustain () {
		return this.gain;
	}

	set release (value) {
		this._release = value;
	}

	get release () {
		return this._release;
	}

	connect (destination) {
		this.output.connect(destination);
	}
}

const FILTER_TYPES = [
  "lowpass",
  "highpass",
  "bandpass",
  "lowshelf",
  "highshelf",
  "peaking",
  "notch",
  "allpass"
];
const FFT_TYPES = {
  FREQUENCY: 0,
  TIME: 1,
  FREQUENCY8: 2,
  TIME8: 3
};
const BASE_SAMPLE_TUNING = 261.625565; // Middle C.

class Filter {
	constructor (context, type = FILTER_TYPES[0], cutoff = 1000, resonance = 0.1) {
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

	on (MidiEvent) {
		this.start(this.context.currentTime, MidiEvent.frequency);
	}

	off () {
		return this.stop(this.context.currentTime);
	}

	set type (value) {
		this.destination.type = value;
	}

	get type () {
		return this.destination.type;
	}

	set cutoff (value) {
		this.destination.frequency.value = value;
	}

	get cutoff () {
		return this.destination.frequency.value;
	}

	set Q (value) {
		this.destination.Q.value = value;
	}

	get Q () {
		return this.destination.Q.value;
	}

	start (time) {
		return this.destination.frequency.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);
	}

	stop (time) {
		return this.destination.frequency.setTargetAtTime(this.cutoff, time, this.release);
	}

	set attack (value) {
		this.envelope.a = value;
	}

	get attack () {
		return this.envelope.a;
	}

	set decay (value) {
		this.envelope.d = value;
	}

	get decay () {
		return this.envelope.d;
	}

	set sustain (value) {
		this.cutoff = value;
	}

	get sustain () {
		return this.cutoff;
	}

	set release (value) {
		this.envelope.r = value;
	}

	get release () {
		return this.envelope.r;
	}

	connect (destination) {
		this.destination.connect(destination);
	}
}

const SAMPLE_BUFFER_SIZE = 1024;

const RECORD_MODE = {
	USER_MEDIA: "USER_MEDIA",
	STREAM: "STREAM"
};

class Sample {
	constructor (context, recordMode = RECORD_MODE.USER_MEDIA) {
		this.recordMode = recordMode;
		this._recordStream = null;
		if(this.recordMode === RECORD_MODE.USER_MEDIA) {
			this.recordInput = context.createGain();
		} else {
			this.recordInput = context.createMediaStreamDestination();
		}
		this.context = context;
		this.buffer = this.context.createBuffer(2, 1, this.context.sampleRate);
		this.rawBuffer = new Float32Array(this.buffer.length);
		this.buffer.copyFromChannel(this.rawBuffer, 1,0);
		this.stream = null;
		this._recordProcessor = null;
		this.overdub = false;
	}

	load (path) {
		return fetch(path)
			.then((response) => response.arrayBuffer())
			.then((myBlob) => {
				return this.context.decodeAudioData(myBlob);
			})
			.then((buffer) => {
				this.rawBuffer = new Float32Array(this.buffer.length);
				this.rawBuffer = buffer.getChannelData(0);
				this.buffer = this.context.createBuffer(2, this.rawBuffer.length, this.context.sampleRate);
				this.buffer.copyToChannel(this.rawBuffer, 0);
				this.buffer.copyToChannel(this.rawBuffer, 1);
				return this;
			})
	}

	reverse () {
		let reverse = new Float32Array(this.rawBuffer);
			reverse.reverse();
		this.buffer = this.context.createBuffer(2, reverse.length, this.context.sampleRate);
		this.buffer.copyToChannel(reverse, 0);
		this.buffer.copyToChannel(reverse, 1);
	}

	pingpong () {
		let offset = this.rawBuffer.length;
		let newArray = new Float32Array(offset * 2);
		let reverse = new Float32Array(this.rawBuffer);
		reverse.reverse();
		newArray.set(this.rawBuffer, 0);
		newArray.set(reverse, offset-1);
		this.buffer = this.context.createBuffer(2, newArray.length, this.context.sampleRate);
		this.buffer.copyToChannel(newArray, 0);
		this.buffer.copyToChannel(newArray, 1);
	}

	normal () {
		this.buffer = this.context.createBuffer(2, this.rawBuffer.length, this.context.sampleRate);
		this.buffer.copyToChannel(this.rawBuffer, 0);
		this.buffer.copyToChannel(this.rawBuffer, 1);
	}

	record() {
		switch(this.recordMode) {
			case RECORD_MODE.STREAM:
				this.recordStream(this.recordInput.stream);
			break;
			case RECORD_MODE.USER_MEDIA:
				navigator.mediaDevices.getUserMedia({audio: true, video: false})
				.then((stream) =>this.recordStream(stream));
			break;
		}
	}

	recordStream(stream) {

			this.buffered = 0;
			this.stream = new Float32Array(0);

			this._recordStream = this.context.createMediaStreamSource(stream);
			this._recordProcessor = this.context.createScriptProcessor(SAMPLE_BUFFER_SIZE, 1, 2);

			this._recordStream.connect(this._recordProcessor);
			this._recordProcessor.connect(this.context.destination);
			this._recordProcessor.onaudioprocess = (e) => {
				let chunk = e.inputBuffer.getChannelData(0);
				var newStream = new Float32Array(this.stream.length + chunk.length);
					newStream.set(this.stream);
					newStream.set(chunk,chunk.length * this.buffered);
					this.stream = newStream;
				this.buffered++;
			};
	}

	stopRecording() {

		this._recordStream.disconnect(this._recordProcessor);
		this._recordProcessor.disconnect(this.context.destination);
		this._recordProcessor.onaudioprocess = null;
		this.rawBuffer = new Float32Array(this.stream.length);
		this.rawBuffer = this.ramp(this.stream);
		this.buffer = this.context.createBuffer(2, this.stream.length, this.context.sampleRate);
		this.buffer.copyToChannel(this.rawBuffer, 0);
		this.buffer.copyToChannel(this.rawBuffer, 1);
	}

	ramp(buffer) {
		let newBuffer = buffer; 
		const BUFFER_SIZE = 512;
		if(newBuffer.length > BUFFER_SIZE) {
			for(var i = 0; i < BUFFER_SIZE; i++) {
				newBuffer[i] = newBuffer[i] * i / BUFFER_SIZE; 
			}
			var j = BUFFER_SIZE;
			for(var i = newBuffer.length-BUFFER_SIZE; i < newBuffer.length; i++) {
				j--;
				newBuffer[i] = newBuffer[i] * j / BUFFER_SIZE; 
			}
		}
		return newBuffer;
	}

	overwrite () {
		this._recordProcessor.disconnect();
		var bufferlength = 0;
		if (this.stream.length > this.buffer.length) {
			bufferlength = this.stream.length;
		} else {
			bufferlength = this.buffer.length;
		}
		let mixedBuffer = new Float32Array(bufferlength);
		let bufferA = this.stream;
		let bufferB = new Float32Array( this.buffer.length);
		this.buffer.copyFromChannel(bufferB, 1, 0);
		for(let i = 0; i < bufferlength; i++) {
			let aValue = 0;
			let bValue = 0;
			if(bufferA[i] != undefined) {
				aValue = bufferA[i];
			}
			if(bufferB[i] != undefined) {
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
}

class SampleMap {
	constructor (context, sample_map) {
		this.context = context;
		this.input_map = sample_map;
		this.samples = {};
		this.loaded = false;
	}

	load () {
		let sampleLoad = [];
		this.input_map.forEach((sample)=>{
			let newsample = new Sample(this.context);
			newsample.load(sample.src).then(() => {
				this.samples[sample.value] = Object.assign(sample, {sample:newsample});
			});
			sampleLoad.push(newsample);
		});
		return Promise.all(sampleLoad);
	}

}

class Effect {

	constructor (context) {
		this.name = "effect";
		this.context = context;
		this.input = this.context.createGain();
		this.effect = null;
		this.bypassed = false;
		this.output = this.context.createGain();
		this.setup();
		this.wireUp();
	}

	bypass(bool) {
		if(bool != this.bypassed) {
			this.bypassed = bool;
			if(bool) {
				this.input.connect(this.output);
				this.input.disconnect(this.effect);
			} else {
				this.input.connect(this.effect);
				this.input.disconnect(this.output);
			}
		}
	}

	setup() {
		this.effect = this.context.createGain();
	}

	wireUp() {
		this.input.connect(this.effect);
		this.effect.connect(this.output);
	}

	connect(destination) {
		this.output.connect(destination);
	}

}

class Chorus extends Effect {
	constructor () {
		super();
		this.name = "chorus";
	}

}

class Filter$1 extends Effect {
	constructor (context, type = FILTER_TYPES[0], cutoff = 1000, resonance = 0.9) {
		super(context);
		this.name = "filter";
		this.effect.frequency.value = cutoff;
		this.effect.Q.value = resonance;
		this.effect.type = type;
	}

	setup() {
		this.effect = this.context.createBiquadFilter();
		this.effect.connect(this.output);
	}

}

class Delay extends Effect {
	constructor (context) {
		super(context);
		this.name = "delay";
	}

	setup () {
		this.effect = this.context.createDelay();
		this.effect.delayTime.value = 0.5;
		this.dry = this.context.createGain();
		this.wet = this.context.createGain();
		this.feedback = this.context.createGain();
		this.feedback.gain.value = 0.75;
		this.filter = new Filter$1(this.context, "bandpass", 1000, 0.3);
	}

	wireUp () {

		this.input.connect(this.dry);
		this.dry.connect(this.output);
		this.wet.connect(this.output);

		this.input.connect(this.effect);
		this.effect.connect(this.wet);

		this.effect.connect(this.filter.input);
		this.filter.connect(this.feedback);
		this.feedback.connect(this.effect);

	}

	set feedbackAmount (value) {
		let normalizedValue = value;
		if (normalizedValue > 0.98) {
			normalizedValue = 0.98;
		}
		this.feedback.gain.value = normalizedValue;
	}

	get feedbackAmount () {
		return this.feedback.gain.value;
	}

	set filterFrequency (value) {
		this.filter.effect.frequency.value = value;
	}

	get filterFrequency () {
		return this.filter.effect.frequency.value;
	}

	set filterQ (value) {
		this.filter.effect.Q.value = value;
	}

	get filterQ () {
		return this.filter.effect.Q.value;
	}

}

class FFT extends Effect{
	constructor (context) {
		super(context);
		this.name = "fft";
		this.mode = FFT_TYPES.FREQUENCY;
	}

	setup () {
		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("id","fft");
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


	data () {
		
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


	draw () {

		const myDataArray = this.data();

		var ctx = this.ctx;
		ctx.save();
		//ctx.globalAlpha = 0.5;
		ctx.fillStyle = "rgb(33,33,99)";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
		var i = 0;
		var width = (ctx.canvas.width / myDataArray.length);
		var height = ctx.canvas.height*0.5;

		ctx.beginPath();
		ctx.moveTo(0, height);
		ctx.strokeStyle = "rgb(100,255,255)";
		ctx.lineWidth=5;

		for (var point in myDataArray) {
			ctx.lineTo(((width) * i), height + (myDataArray[point] * height*10));
			i++;
		}
		ctx.moveTo(width, height);
		ctx.stroke();

		window.requestAnimationFrame(() => {
			this.draw();
		});
	}
	get element () {
		return this.canvas;
	}

	addToElement(element) {
		element.appendChild(this.element);
	}
}

class Voice {
	constructor(context, type ="sawtooth", gain = 0.1) {
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

	init() {
		let osc = this.context.createOscillator();
			osc.type = this.type;
			osc.connect(this.ampEnvelope.output);
			osc.start(this.context.currentTime);
		this.partials.push(osc);
	}

	on(MidiEvent) {
		this.value = MidiEvent.value;
		this.partials.forEach((osc) => {
			osc.frequency.value = MidiEvent.frequency;
		});
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

	off(MidiEvent) {
		this.ampEnvelope.off(MidiEvent);
		this.partials.forEach((osc) => {
			osc.stop(this.context.currentTime + this.ampEnvelope.release * 4);
		});
	}

	connect(destination) {
		this.output.connect(destination);
	}

	set attack (value) {
		this.ampEnvelope.attack  = value;
	}

	get attack () {
		return this.ampEnvelope.attack;
	}

	set decay (value) {
		this.ampEnvelope.decay  = value;
	}

	get decay () {
		return this.ampEnvelope.decay;
	}

	set sustain (value) {
		this.ampEnvelope.sustain = value;
	}

	get sustain () {
		return this.ampEnvelope.sustain;
	}

	set release (value) {
		this.ampEnvelope.release = value;
	}

	get release () {
		return this.ampEnvelope.release;
	}

}

class Noise extends Voice{
	constructor(context, gain) {
		super(context, gain);
		this._length = 2;
	}

	get length () {
		return this._length || 2;
	}
	set length (value) {
		this._length = value;
	}

	init() {
		var lBuffer = new Float32Array(this.length * this.context.sampleRate);
		var rBuffer = new Float32Array(this.length * this.context.sampleRate);
		for(let i = 0; i < this.length * this.context.sampleRate; i++) {
			lBuffer[i] = Math.random();
			rBuffer[i] = Math.random();
		}
		let buffer = this.context.createBuffer(2, this.length * this.context.sampleRate, this.context.sampleRate);
		buffer.copyToChannel(lBuffer,0);
		buffer.copyToChannel(rBuffer,1);

		let osc = this.context.createBufferSource();
			osc.buffer = buffer;
			osc.loop = true;
			osc.loopStart = 0;
			osc.loopEnd = 2;



			osc.start(this.context.currentTime);
			osc.connect(this.ampEnvelope.output);
		this.partials.push(osc);
	}

	on(MidiEvent) {
		this.value = MidiEvent.value;
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

}

class Reverb extends Effect {
	constructor (context) {
		super(context);
		this.name = "reverb";
		this.attack = 0;
		this.decay = 0.2;
		this.release = 0.8;
	}

	setup () {
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

	wireUp() {
		this.input.connect(this.dry);
		this.input.connect(this.effect);

		this.dry.connect(this.output);
		this.effect.connect(this.wet);
		this.wet.connect(this.output);
	}

	renderTail () {
		let tailContext = new OfflineAudioContext(2, this.context.sampleRate * this.reverbTime, this.context.sampleRate);
		let tail = new Noise(tailContext, 1);
		tail.init();
		tail.connect(tailContext.destination);
		tail.attack = this.attack;
		tail.decay = this.decay;
		tail.release = this.release;
		
		let rt = tailContext.startRendering().then((buffer) => {
			this.effect.buffer = buffer;
		});

		tail.on(100);
		tail.off();

		return rt;
	}

	set decayTime(value) {
		let dc = value/3;
		this.reverbTime = value;
		this.attack = 0;
		this.decay = dc;
		this.release = dc;
		this.buffer = this.renderTail();
	}

}

const MAX = 1;
const MIN = 0;
const DEFAULT = 1;
const WINDOW_SIZE = 512;

class Saturate extends Effect {
	constructor(context) {
		super(context);
		this.name = "saturate";
		this._amount = DEFAULT;

		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("id", "saturate");
		this.ctx = this.canvas.getContext("2d");
		this.ctx.canvas.width = 512;
		this.ctx.canvas.height = 512;
		window.requestAnimationFrame(() => {
			this.draw();
		});
	}

	setup() {
		this.effect = this.context.createWaveShaper();
		this.effect.curve = this.createCurve();
		console.log(this.effect.curve);
		this.effect.oversample = '4x';
	}

	createCurve(amount = DEFAULT) {
			var curve = new Float32Array(WINDOW_SIZE);
		var x = 0;
		for (let i = 0; i < WINDOW_SIZE; i++) {
			var x = 1 - (i/WINDOW_SIZE) * 2;
			curve[i] = this.f(x, amount);
		}

		return curve;
	}

	f(x, range = DEFAULT) {

		return x * range;
		//return Math.sin(Math.pow(Math.cos(Math.PI * (x) / 4.0), 1) * range) * ((range / 0.5) * 1.18) *10;
	}

	draw() {
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
			ctx.fillRect(
				i,
				(WINDOW_SIZE*.5) + (point*WINDOW_SIZE),
				width,
				1);
		}

		window.requestAnimationFrame(() => {
			this.draw();
		});
	}

	set amount(value) {
		this._amount = 1 + (MIN + (value * MAX));
		this.effect.curve = this.createCurve(this._amount);
	}

	get amount() {
		return this._amount;
	}

	get element() {
		return this.canvas;
	}

	addToElement(element) {
		element.appendChild(this.element);
	}

}

class ComplexVoice extends Voice {

	constructor (context, type, amount = 3, wideness = 50, analog = 5) {
		super(context, "none");
		this.type = type;
		this.widen = wideness;
		this.analog = analog;
		this.amount = amount;
		this.output.gain.value = 1/amount;
	}

	init () {
		var amount = this.amount;

		for (let i = 0; i < amount; i++) {
			let osc = this.context.createOscillator();
			osc.type = this.type;
			if (i > 0) {
				var detune = (i / amount * this.widen);
				if (i % 1 == 0) {
					detune = -detune;
				}
				osc.detune.value = detune + (this.analog * Math.random());
			}
			osc.connect(this.ampEnvelope.output);
			osc.start(this.context.currentTime);
			this.partials.push(osc);
		}
	}

	set wideness (value) {
		this.widen = value;
		var amount = this.amount;

		this.partials.forEach((osc, i) => {
			if (i > 0) {
				var detune = (i / amount * this.widen);
				if (i % 1 == 0) {
					detune = -detune;
				}
				osc.detune.value = detune + (this.analog * Math.random());
			}
		});
	}

	get wideness () {
		return this.widen;
	}
}

class SamplePlayer extends Voice {

	constructor(context, buffer, loop = true, tune = true, sampleTuneFrequency = BASE_SAMPLE_TUNING) {
		super(context);
		this.buffer = this.context.createBufferSource();
		this.buffer.buffer = buffer;
		this.tune = tune;
		this.loop = loop;
		this.sampleTuneFrequency = sampleTuneFrequency;
		this._loopstart = 0;
		this._loopend = 0;
		this.loopStart = 0;
		this.loopEnd = 1;
	}

	init() {
		this.buffer.connect(this.ampEnvelope.output);
		this.buffer.loop = this.loop;
		this.buffer.loopStart = this._loopstart;
		this.buffer.loopEnd = this._loopend;
		this.partials.push(this.buffer);
	}

	on(MidiEvent) {
		let frequency = MidiEvent.frequency;
		this.value = MidiEvent.value;
		this.partials.forEach((osc) => {
			osc.start(this.context.currentTime);
			if(this.tune) {
				osc.playbackRate.value = frequency / this.sampleTuneFrequency;
			}
		});
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

	set loopStart (value) {
		this._loopstart = value * this.loopLength;
		this.buffer.loopStart = this._loopstart;
	}

	set loopEnd(value) {
		this._loopend = value * this.loopLength;
		this.buffer.loopEnd = this._loopend;
	}

	get loopLength () {
		return this.buffer.buffer.duration;
	}

}

class MizzyDevice {
	constructor(context) {
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

	NoteOn(MidiEvent) {

	}

	NoteOff (MidiEvent) {
		if(this.voices[MidiEvent.value] != undefined) {
			this.voices[MidiEvent.value].off(MidiEvent);
		}
	}

	onCC (MidiEvent) {

	}

	addEffect (effect, options) {
		this.effects.push(new effect(this.context));
	}

	connectEffects () {
		this.effectInput = this.effects[0].input;
		for (let i = this.effects.length - 1; i >= 0; i--) {
			console.log(this.effects[i]);
			if (i == this.effects.length - 1) {
				this.effects[i].connect(this.output);
			} else {
				this.effects[i].connect(this.effects[i + 1].input);
			}
		}
	}
	connect (destination) {
		this.output.connect(destination);
	}
	disconnect (destination) {
		this.output.disconnect(destination);
	}

	setVoiceValues() {
		this.voices.forEach((voice)=>{
			voice.attack = this._attack;
			voice.decay = this._decay;
			voice.sustain = this._sustain;
			voice.release = this._release;
		});
	}

	set attack (value) {
		this._attack = value;
		this.setVoiceValues();
	}

	get attack () {
		return this._attack;
	}

	set decay (value) {
		this._decay  = value;
		this.setVoiceValues();
	}

	get decay () {
		return this._decay;
	}

	set sustain (value) {
		this._sustain = value;
		this.setVoiceValues();
	}

	get sustain () {
		return this._sustain;
	}

	set release (value) {
		this._release = value;
		this.setVoiceValues();
	}

	get release () {
		return this._release;
	}

}

class Vincent extends MizzyDevice {

	constructor (context, count, type = "sawtooth", wideness = 50) {
		super(context);
		this.oscillatorType = type;
		this.numberOfOscillators = count;
		this._wideness = wideness;
	}

	NoteOn (MidiEvent) {
		let voice = new ComplexVoice(this.context, this.oscillatorType, this.numberOfOscillators);
		voice.init();
		voice.attack = this.attack;
		voice.decay = this.decay;
		voice.sustain = this.sustain;
		voice.release = this.release;
		voice.connect(this.effectInput);
		voice.on(MidiEvent);
		this.voices[MidiEvent.value] = voice;
	}

	set wideness (value) {
		this._wideness = value;
		this.voices.forEach((voice) => voice.wideness = this._wideness);
	}

	get wideness () {
		return this._wideness;
	}

	set type (value) {

	}

}

class VSS30 extends MizzyDevice {

	static get LOOP_MODES () {
		return {
			NORMAL: "NORMAL",
			PINGPONG: "PINGPONG"
		}
	}

	constructor (context) {
		super(context);
		this.sample = new Sample(this.context);
		this.recording = false;
		this._loop = true;
		this._loopMode = VSS30.LOOP_MODES.NORMAL;
		this._reverse = false;
		this._loopStart = 0;
		this._loopEnd = 1;
	}

	record(timeout = null, overdub = false) {
		if(!this.recording) {
			console.log("recording...");
			this.recording = true;
			this.sample.overdub = overdub;
			this.sample.record();
			if(timeout!=null) {
				setTimeout(() => this.stopRecording(), timeout);
			}
		}
	}

	stopRecording() {
		if(this.recording) {
			this.recording = false;
			if(!this.sample.overdub) {
				this.sample.stopRecording();
			} else {
				this.sample.overwrite();
			}
		}
	}

	NoteOn (MidiEvent) {
		let voice = new SamplePlayer(this.context, this.sample.buffer, this._loop);
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

	set loop (value) {
		this._loop = value;
	}

	get loop () {
		return this._loop;
	}

	set loopMode (value) {
		this._loopMode = value;
	}

	set loopStart(value) {
		this._loopStart = value;
		this.setVoiceValues();
	}

	set loopMode (value) {
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
	}

	get loopMode () {
		return this._loopMode;
	}

	toggleReverse() {
		this.sample.reverse();
	}

	get loopStart () {
		return this._loopStart;
	}

	set loopEnd(value) {
		this._loopEnd = value;
		this.setVoiceValues();
	}

	get loopEnd () {
		return this._loopEnd;
	}

	get loopLength () {
		return this.sample.buffer.duration;
	}

	setSample( sample ) {
		this.sample = sample;
		this.setVoiceValues();
	}

	setVoiceValues() {
		this.voices.forEach((voice)=>{
			voice.attack = this._attack;
			voice.decay = this._decay;
			voice.sustain = this._sustain;
			voice.release = this._release;
			voice.loopStart = this._loopStart;
			voice.loopEnd = this._loopEnd;
		});
	}

}

class DrumMachine extends MizzyDevice {

	constructor(context, sample_map) {
		super(context);
		this.map = sample_map;
	}

	NoteOn(MidiEvent) {
		if(this.map.samples[MidiEvent.value] != null) {
			let voice =
				new SamplePlayer(this.context, this.map.samples[MidiEvent.value].sample.buffer, false, false);
			voice.init();
			this.setVoiceValues();
			voice.connect(this.effectInput);
			voice.on(MidiEvent);
			this.voices[MidiEvent.value] = voice;
		}
	}
}

const Components = {FilterEnvelope: Filter, AmpEnvelope, Sample, SampleMap};
const Effects = {Chorus, Delay, Filter: Filter$1, Reverb, FFT, Saturate};
const Voices = {ComplexVoice, Noise, SamplePlayer, Voice};
const Synths = {VSS30, Vincent, DrumMachine};

export { Components, Effects, Voices, Synths };

//# sourceMappingURL=scream.es6.map
