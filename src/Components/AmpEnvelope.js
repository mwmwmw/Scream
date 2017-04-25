export default class AmpEnvelope {
	constructor (context, gain = 0.1) {
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