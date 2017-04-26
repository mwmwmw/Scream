export default class Filter {
	constructor (context, type = "lowpass", cutoff = 1000, resonance = 0.1) {
		this.context = context;
		this.destination = this.context.createBiquadFilter();
		this.type = type;
		this.cutoff = cutoff;
		this.resonance = 0.1;
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