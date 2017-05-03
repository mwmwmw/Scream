import MizzyDevice from "./MizzyDevice";
import Sample from "./Components/Sample";
import SamplePlayer from "./Voices/SamplePlayer";

export default class VSS30 extends MizzyDevice {

	constructor (context) {
		super(context);
		this.sample = new Sample(this.context);
	}

	record() {
		this.sample.record(2000);
	}

	NoteOn (MidiEvent) {
		let voice = new SamplePlayer(this.context, this.sample.buffer, true);
		voice.init();
		voice.connect(this.effectInput);
		voice.on(MidiEvent);
		this.voices[MidiEvent.value] = voice;
	}

}