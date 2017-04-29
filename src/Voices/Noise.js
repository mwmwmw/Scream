import Voice from "./Voice";


export default class Noise extends Voice{
	constructor(context, gain = 1) {
		super(context, "none");
		this._length = 2;
		this.voicePartials();
	}

	get length () {
		return this._length || 2;
	}
	set length (value) {
		this._length = value;
	}

	voicePartials() {
		var lBuffer = new Float32Array(this.length * this.context.sampleRate);
		var rBuffer = new Float32Array(this.length * this.context.sampleRate);
		for(let i = 0; i < this.length * this.context.sampleRate; i++) {
			lBuffer[i] = Math.random();
			rBuffer[i] = Math.random();
		}
		let buffer = this.context.createBuffer(2, this.length * this.context.sampleRate, this.context.sampleRate);
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