import Voice from "./Voice";
import {BASE_SAMPLE_TUNING} from "../Constants";

export default class SamplePlayer extends Voice {

	constructor(context, buffer, loop = true, sampleTuneFrequency = BASE_SAMPLE_TUNING) {
		super(context);
		this.buffer = this.context.createBufferSource(buffer);
		this.buffer.buffer = buffer;
		this.length = this.buffer.buffer.duration;
		this._loopLength = this.length;
		this.loop = loop;
		// this.buffer.loopStart = 0;
		// this.buffer.loopEnd = 0;
		this.sampleTuneFrequency = sampleTuneFrequency;
	}

	init() {
		this.buffer.connect(this.ampEnvelope.output);
		this.buffer.loop = this.loop;
		this.partials.push(this.buffer);

	}

	on(MidiEvent) {
		let frequency = MidiEvent.frequency;
		this.value = MidiEvent.value;
		this.partials.forEach((osc) => {
			osc.start(this.context.currentTime);
			osc.playbackRate.value = frequency / this.sampleTuneFrequency;
		});
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

	set loopStart(value) {
		this.buffer.loopStart = this.buffer.buffer.duration * value;
		this.buffer.loopEnd = this.buffer.loopStart + this.loopLength;
	}

	set loopLength(value) {
		this._loopLength = value;
		this.buffer.loopEnd = this.buffer.loopStart + this._loopLength;
	}

	get loopLength () {
		return this._loopLength;
	}

}