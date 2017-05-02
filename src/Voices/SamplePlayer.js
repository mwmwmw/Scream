import Voice from "./Voice";
import {BASE_SAMPLE_TUNING} from "../Constants";

export default class SamplePlayer extends Voice {

	constructor (context, buffer, loop = true, sampleTuneFrequency = BASE_SAMPLE_TUNING) {
		super(context);
		this.buffer = this.context.createBufferSource(buffer);
		this.buffer.buffer = buffer;
		this.loop = loop;
		this.sampleTuneFrequency = sampleTuneFrequency;
	}

	init () {
		let osc = this.buffer;
		osc.connect(this.ampEnvelope.output);
		osc.loop = this.loop;
		this.partials.push(osc);

	}

	on (MidiEvent) {
		let frequency = MidiEvent.frequency;
		this.value = MidiEvent.value;
		this.partials.forEach((osc) => {
			osc.start(this.context.currentTime);
			osc.playbackRate.value = frequency / this.sampleTuneFrequency;
		});
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

}