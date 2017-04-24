export default class PercussionVoice {
	constructor(context, type ="sawtooth") {
		this.context = context;
		this.type = type;
		this.output = this.context.createGain();
		this.output.gain.value = 0;
		this.partials = [];
		this.value = -1;
		this.channelGain = 0.1;
		this.ampEnvelope = {
			a: 0,
			d: 0.1,
			s: this.channelGain,
			r: 0.5
		};
		this.voicePartials();
	}

	voicePartials() {
		let osc = this.context.createOscillator();
		osc.type = this.type;
		osc.connect(this.output);
		osc.start(this.context.currentTime);
		this.partials.push(osc);
	}

	trigger(velocity) {
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