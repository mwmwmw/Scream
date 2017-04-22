export default class Voice {
	constructor(context) {
		this.context = context;
		this.osc = this.context.createOscillator();
		this.gain = this.context.createGain();
		this.gain.gain.value = 0;
		this.osc.connect(this.gain);
		this.osc.start();

		this.inUse = false;
		this.lastOn = 0;
		this.value = -1;
	}
	on (MidiEvent) {
		this.osc.frequency.value = MidiEvent.frequency;
		this.value = MidiEvent.value;
		this.lastOn = performance.now();
		this.inUse = true;
		this.gain.gain.value = 1;
	}
	off(MidiEvent) {
		this.value = -1;
		this.inUse = false;
		this.gain.gain.value = 0;
	}
	connect(destination, index) {
		this.gain.connect(destination);
	}
}