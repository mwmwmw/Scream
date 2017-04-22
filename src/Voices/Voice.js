export default class Voice {
	constructor(context) {
		this.context = context;
		this.osc = this.context.createOscillator();
		this.output = this.context.createGain();
		this.output.gain.value = 0;
		this.osc.connect(this.output);
		this.value = -1;
		this.channelGain = 0.2;
		this.envelope = {
			a: 0.001,
			d: 0.5,
			s: this.channelGain,
			r: 0.5
		}

	}
	on (MidiEvent) {

		this.value = MidiEvent.value;
		this.osc.frequency.value = MidiEvent.frequency;
		this.start(this.context.currentTime);
		console.log("NoteOn", this);
	}

	off (MidiEvent) {
		this.stop(this.context.currentTime);
	}

	start (time) {
		this.osc.start();
		this.output.gain.value = 0;
		this.output.gain.setValueAtTime(0, time);
		return this.output.gain.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);
	}

	stop(time) {
		this.value = -1;
		this.output.gain.cancelScheduledValues(time);
		this.output.gain.setValueAtTime(this.output.gain.value, time);
		this.output.gain.setTargetAtTime(0, time, this.release);
		return this.osc.stop(time + this.release*3);
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
		this.envelope.s = value;
	}
	get sustain () {
		return this.envelope.s;
	}
	set release (value) {
		this.envelope.r = value;
	}
	get release () {
		return this.envelope.r;
	}
	connect(destination) {
		this.output.connect(destination);
	}
}