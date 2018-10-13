export default class AmpEnvelope {
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
		this.output.gain.setTargetAtTime(1, time, this.attack);
		this.output.gain.setTargetAtTime(this.sustain * this.velocity, time + this.attack, this.decay);
	}

	stop (time) {
		this.sustain = this.output.gain.value;
		this.output.gain.cancelScheduledValues(time);
		this.output.gain.setValueAtTime(this.sustain, time);
		this.output.gain.setTargetAtTime(0, time, this.release);
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