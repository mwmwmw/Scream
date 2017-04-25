export default class Noise {
	constructor(context, type ="sawtooth") {
		this.context = context;
		this.type = type;
		this.output = this.context.createGain();
		this.output.gain.value = 0;
		this.partials = [];
		this.value = -1;
		this.channelGain = 0.1;
		this.length = 2;
		this.ampEnvelope = {
			a: 0,
			d: 0.1,
			s: this.channelGain,
			r: 0.4
		};


		this.voicePartials();
	}

	voicePartials() {

		var lBuffer = new Float32Array(this.length * 48000);
		var rBuffer = new Float32Array(this.length * 48000);
		for(let i = 0; i < this.length * 48000; i++) {
			lBuffer[i] = Math.random();
			rBuffer[i] = Math.random();
		}
		let bufferctx = new AudioContext();
		let buffer = this.context.createBuffer(2, this.length * 48000, 48000);
		buffer.copyToChannel(lBuffer,0);
		buffer.copyToChannel(rBuffer,1);

		let osc = new AudioBufferSourceNode(this.context, {
			buffer: buffer,
			loop: true,
			loopStart: 0,
			loopEnd: 2
		});

			osc.connect(this.output);
		this.partials.push(osc);
	}

	trigger(velocity) {
		this.partials.forEach((osc) => osc.start(this.context.currentTime));
		this.start(this.context.currentTime);
		console.log("Trigger", this);
	}

	off() {
		return this.stop(this.context.currentTime);
	}

	start(time) {
		this.output.gain.value = 1;
		this.output.gain.setValueAtTime(0, time);
		return this.output.gain.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);
	}

	stop(time) {
		this.value = -1;
		this.output.gain.cancelScheduledValues(time);
		this.output.gain.setValueAtTime(this.output.gain.value, time);
		this.output.gain.setTargetAtTime(0, time, this.release);
		this.partials.forEach((osc) => {
			osc.stop(time + this.release * 4);
		});
	}

	set attack(value) {
		this.ampEnvelope.a = value;
	}

	get attack() {
		return this.ampEnvelope.a;
	}

	set decay(value) {
		this.ampEnvelope.d = value;
	}

	get decay() {
		return this.ampEnvelope.d;
	}

	set sustain(value) {
		this.ampEnvelope.s = value;
	}

	get sustain() {
		return this.ampEnvelope.s;
	}

	set release(value) {
		this.ampEnvelope.r = value;
	}

	get release() {
		return this.ampEnvelope.r;
	}

	connect(destination) {
		this.output.connect(destination);
	}
}