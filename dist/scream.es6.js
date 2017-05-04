class AmpEnvelope {
	constructor (context, gain = 1) {
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
		return this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay + 0.001);
	}

	stop (time) {
		this.output.gain.cancelScheduledValues(time);
		this.output.gain.setValueAtTime(this.sustain, time);
		this.output.gain.setTargetAtTime(0, time, this.release);
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
		this.gain = value;
		this.envelope.s = value;
	}

	get sustain () {
		return this.gain;
	}

	set release (value) {
		this.envelope.r = value;
	}

	get release () {
		return this.envelope.r;
	}

	connect (destination) {
		this.output.connect(destination);
	}
}

const FILTER_TYPES = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"];

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

class Sample {
	constructor (context) {

		this.context = context;
		this.buffer = this.context.createBuffer(2, 1, this.context.sampleRate);
		this.stream = null;
		this._recordProcessor = null;
	}

	load (path) {
		return fetch(path)
			.then((response) => response.arrayBuffer())
			.then((myBlob) => {
				return this.context.decodeAudioData(myBlob);
			})
			.then((buffer) => {
				this.buffer = buffer;
			})
	}

	record () {
		this.buffered = 0;
		this.stream = new Float32Array(0);
		navigator.mediaDevices.getUserMedia({audio: true, video: false})
			.then((stream) => {
				let input = this.context.createMediaStreamSource(stream);
				this._recordProcessor = this.context.createScriptProcessor(SAMPLE_BUFFER_SIZE, 1, 2);

				input.connect(this._recordProcessor);
				this._recordProcessor.connect(this.context.destination);
				this._recordProcessor.onaudioprocess = (e) => {
					let chunk = e.inputBuffer.getChannelData(0);
					var newStream = new Float32Array(this.stream.length + chunk.length);
						newStream.set(this.stream);
						newStream.set(chunk,chunk.length * this.buffered);
						this.stream = newStream;
					this.buffered++;
				};
			});
	}
	stopRecording() {
		this._recordProcessor.disconnect();
		this.buffer = this.context.createBuffer(2, this.stream.length, this.context.sampleRate);
		this.buffer.copyToChannel(this.stream, 0);
		this.buffer.copyToChannel(this.stream, 1);
	}

	recordInput (input) {

	}

}

class Effect {

	constructor (context) {
		this.context = context;
		this.input = this.context.createGain();
		this.effect = null;
		this.output = this.context.createGain();
		this.setup();
		this.wireUp();
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
	}

}

class Delay extends Effect {
	constructor () {
		super();
	}

}

class FFT extends Effect{
	constructor (context) {
		super(context);
	}

	setup () {
		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("id","fft");
		this.ctx = this.canvas.getContext("2d");
		this.ctx.canvas.width = 1024;
		this.ctx.canvas.height = 400;
		this.effect = this.context.createAnalyser();
		this.effect.fftSize = 1024;
		this.effect.maxDecibels = -50;
		this.effect.minDecibels = -120;
		this.effect.smoothingTimeConstant = 0.9;
		this.effect.connect(this.output);
		window.requestAnimationFrame(() => {
			this.draw();
		});
	}

	draw () {
		var myDataArray = new Uint8Array(this.effect.frequencyBinCount);
		this.effect.getByteFrequencyData(myDataArray);

		var ctx = this.ctx;
		ctx.save();
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = "rgb(33,33,99)";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
		var i = 0;
		var width = (ctx.canvas.width / myDataArray.length);

		for (var point in myDataArray) {
			ctx.fillStyle = "rgb(100,255,255)";
			ctx.fillRect(
				((width) * i),
				ctx.canvas.height,
				width,
				-(myDataArray[point]/255)*ctx.canvas.height);
			i++;
		}

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

class Filter$1 extends Effect {
	constructor (context, type = FILTER_TYPES[0], cutoff = 1000, resonance = 0.9) {
		super(context);
		this.effect.frequency.value = cutoff;
		this.effect.Q.value = resonance;
		this.effect.type = type;
	}

	setup() {
		this.effect = this.context.createBiquadFilter();
		this.effect.connect(this.output);
	}

}

class Voice {
	constructor(context, type ="sawtooth") {
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
			osc.frequency.value = MidiEvent.frequency/4;
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
}

class Noise extends Voice{
	constructor(context, gain = 1) {
		super(context, "none");
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

		let osc = this.context.createBufferSource({
			buffer: buffer,
			loop: true,
			loopStart: 0,
			loopEnd: 2
		});

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
		this.attack = 0;
		this.decay = 0.2;
		this.release = 0.2;
	}

	setup () {
		this.effect = this.context.createConvolver();

		this.reverbTime = 1;

		this.wet = this.context.createGain();
		this.wet.gain.value = 0.4;
		this.dry = this.context.createGain();
		this.dry.gain.value = 0.8;

		this.buffer = this.renderTail();

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
		let buffer = tailContext.createBufferSource();
		let tail = new Noise(tailContext, 1);
		tail.init();
		tail.connect(tailContext.destination);
		tail.attack = this.attack;
		tail.decay = this.decay;
		tail.release = this.release;
		tail.on(100);
		tail.off();
		return tailContext.startRendering().then((buffer) => {
			this.effect.buffer = buffer;
		});
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

	constructor (context, buffer, loop = true, sampleTuneFrequency = BASE_SAMPLE_TUNING) {
		super(context);
		this.buffer = this.context.createBufferSource(buffer);
		this.buffer.buffer = buffer;
		this.loop = loop;
		this.sampleTuneFrequency = sampleTuneFrequency;
	}

	init () {
		let osc = this.buffer;
		osc.connect(this.ampEnvelope.output);
		osc.loop = this.loop;
		this.partials.push(osc);

	}

	on (MidiEvent) {
		let frequency = MidiEvent.frequency;
		this.value = MidiEvent.value;
		this.partials.forEach((osc) => {
			osc.start(this.context.currentTime);
			osc.playbackRate.value = frequency / this.sampleTuneFrequency;
		});
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

}

class MizzyDevice {
	constructor(context) {
		this.context = context;
		this.output = this.context.createGain();
		this.effectInput = this.output;
		this.voices = [];
		this.effects = [];
		this.effectInput = this.output;
	}

	NoteOn(MidiEvent) {

	}

	NoteOff (MidiEvent) {
		this.voices[MidiEvent.value].off(MidiEvent);
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
}

class VSS30 extends MizzyDevice {

	constructor (context) {
		super(context);
		this.sample = new Sample(this.context);
		this.recording = false;
	}

	record(timeout = null) {
		if(!this.recording) {
			console.log("recording...");
			this.recording = true;
			this.sample.record();
			if(timeout!=null) {
				setTimeout(() => this.stopRecording(), timeout);
			}
		}
	}

	stopRecording() {
		if(this.recording) {
			this.recording = false;
			this.sample.stopRecording();
			console.log("stop recording.", this.sample.buffer.length);
		}
	}

	NoteOn (MidiEvent) {
		let voice = new SamplePlayer(this.context, this.sample.buffer, true);
		voice.init();
		voice.connect(this.effectInput);
		voice.on(MidiEvent);
		this.voices[MidiEvent.value] = voice;
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

const Components = {FilterEnvelope: Filter, AmpEnvelope, Sample};
const Effects = {Chorus, Delay, Filter: Filter$1, Reverb, FFT};
const Voices =   {ComplexVoice, Noise, SamplePlayer, Voice};
const Synths = {VSS30, Vincent};

export { Components, Effects, Voices, Synths };

//# sourceMappingURL=scream.es6.map
