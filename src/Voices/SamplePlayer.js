import Voice from "./Voice";
import {BASE_SAMPLE_TUNING} from "../Constants";

export default class SamplePlayer extends Voice {

	constructor(context, buffer, loop = true, tune = true, sampleTuneFrequency = BASE_SAMPLE_TUNING) {
		super(context);
		this.buffer = this.context.createBufferSource();
		this.buffer.buffer = buffer;
		this.tune = tune;
		this.loop = loop;
		this.sampleTuneFrequency = sampleTuneFrequency;
		this._loopstart = 0;
		this._loopend = 0;
		this.loopStart = 0;
		this.loopEnd = 1;
	}

	init() {
		this.buffer.connect(this.ampEnvelope.output);
		this.buffer.loop = this.loop;
		this.buffer.loopStart = this._loopstart;
		this.buffer.loopEnd = this._loopend;
		this.partials.push(this.buffer);
	}

	on(MidiEvent) {
		let frequency = MidiEvent.frequency;
		this.value = MidiEvent.value;
		this.partials.forEach((osc) => {
			osc.start(this.context.currentTime);
			if(this.tune) {
				osc.playbackRate.value = frequency / this.sampleTuneFrequency;
			}
		});
		this.ampEnvelope.on(MidiEvent.velocity || MidiEvent);
	}

	set loopStart (value) {
		this._loopstart = value * this.loopLength;
		this.buffer.loopStart = this._loopstart;
	}

	set loopEnd(value) {
		this._loopend = value * this.loopLength;
		this.buffer.loopEnd = this._loopend;
	}

	get loopLength () {
		return this.buffer.buffer.duration;
	}

}