export default class AmpEnvelope {
	constructor(context, gain = 0) {
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
		this.maxTime = 2;
	}

	on(velocity) {
		this.velocity = velocity / 127;
		this.start(this.context.currentTime);
	}

	off(MidiEvent) {
		return this.stop(this.context.currentTime);
	}

	start(time) {
		var attackTime = this.attack * this.maxTime;
		var decayTime = this.decay * this.maxTime;
		this.output.gain.setValueAtTime(0, 0);
		this.output.gain.linearRampToValueAtTime(this.velocity, this.context.currentTime + attackTime);

		this.output.gain.linearRampToValueAtTime(this.sustain * this.velocity, this.context.currentTime + attackTime + decayTime);
	}

	stop(time) {
		this.output.gain.cancelScheduledValues(0);
		this.output.gain.linearRampToValueAtTime(0, time + (this.release * this.maxTime));
	}

	set attack(value) {
		this._attack = value;
	}

	get attack() {
		return this._attack
	}

	set decay(value) {
		this._decay = value;
	}

	get decay() {
		return this._decay;
	}

	set sustain(value) {
		this.gain = value;
		this._sustain;
	}

	get sustain() {
		return this.gain;
	}

	set release(value) {
		this._release = value;
	}

	get release() {
		return this._release;
	}

	connect(destination) {
		this.output.connect(destination);
	}
}