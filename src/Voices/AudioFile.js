import Voice from "./Voice";

export default class AudioFile extends Voice {

	constructor (context, buffer, loop = false) {
		super(context);
		this.buffer = this.context.createBufferSource(buffer);
		this.buffer.buffer = buffer;
		this.loop = loop;
	}

	init() {
		let osc = this.buffer;
		osc.connect(this.ampEnvelope.output);
		osc.buffer.loop = this.loop;
		this.partials.push(osc);

	}

	on(MidiEvent) {
		let frequency = MidiEvent.frequency;
		this.value = MidiEvent.value;
		this.partials.forEach((osc) => {
			osc.start(this.context.currentTime);
			osc.playbackRate.value =  frequency/261.625565;
		});
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

}