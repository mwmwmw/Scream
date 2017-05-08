import MizzyDevice from "../MizzyDevice";
import ComplexVoice from "../Voices/ComplexVoice";

export default class Vincent extends MizzyDevice {

	constructor (context, count, type = "sawtooth", wideness = 50) {
		super(context);
		this.oscillatorType = type;
		this.numberOfOscillators = count;
		this._wideness = wideness;
	}

	NoteOn (MidiEvent) {
		let voice = new ComplexVoice(this.context, this.oscillatorType, this.numberOfOscillators);
		voice.init();
		voice.connect(this.effectInput);
		voice.on(MidiEvent);
		this.voices[MidiEvent.value] = voice;
	}

	set wideness (value) {
		this._wideness = value;
		this.voices.forEach((voice) => voice.wideness = this._wideness);
	}

	get wideness () {
		return this._wideness;
	}

	set type (value) {

	}

}