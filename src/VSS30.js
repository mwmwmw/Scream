import MizzyDevice from "./MizzyDevice";
import Sample from "./Components/Sample";
import SamplePlayer from "./Voices/SamplePlayer";

export default class VSS30 extends MizzyDevice {

	constructor (context) {
		super(context);
		this.sample = new Sample(this.context);
		this.recording = false;
	}

	record() {
		if(!this.recording) {
			console.log("recording...");
			this.recording = true;
			this.sample.record();
		}
	}

	stopRecording() {
		if(this.recording) {
			this.recording = false;
			this.sample.stopRecording();
			console.log("stop recording.", this.sample.buffer.length);
		}
	}

	NoteOn (MidiEvent) {
		let voice = new SamplePlayer(this.context, this.sample.buffer, true);
		voice.init();
		voice.connect(this.effectInput);
		voice.on(MidiEvent);
		this.voices[MidiEvent.value] = voice;
	}

}