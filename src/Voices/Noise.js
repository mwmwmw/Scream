import Voice from "./Voice";

export default class Noise extends Voice{
	constructor(context, gain = 1) {
		super(context, "none");
		this.length = 2;
		this.partials = [];
		this.voicePartials();
	}

	voicePartials() {

		var lBuffer = new Float32Array(this.length * 48000);
		var rBuffer = new Float32Array(this.length * 48000);
		for(let i = 0; i < this.length * 48000; i++) {
			lBuffer[i] = Math.random();
			rBuffer[i] = Math.random();
		}
		let buffer = this.context.createBuffer(2, this.length * 48000, 48000);
		buffer.copyToChannel(lBuffer,0);
		buffer.copyToChannel(rBuffer,1);

		let osc = new AudioBufferSourceNode(this.context, {
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