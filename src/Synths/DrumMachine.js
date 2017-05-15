import MizzyDevice from "../MizzyDevice";
import SamplePlayer from "../Voices/SamplePlayer";

export default class DrumMachine extends MizzyDevice {

	constructor(context, sample_map) {
		super(context);
		this.map = sample_map;
	}

	NoteOn(MidiEvent) {
		if(this.map.samples[MidiEvent.value] != null) {
			let voice =
				new SamplePlayer(this.context, this.map.samples[MidiEvent.value].sample.buffer, false, false);
			voice.init();
			this.setVoiceValues();
			voice.connect(this.effectInput);
			voice.on(MidiEvent);
			this.voices[MidiEvent.value] = voice;
		}
	}
}