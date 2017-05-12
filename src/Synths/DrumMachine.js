import MizzyDevice from "../MizzyDevice";
import Sample from "../Components/Sample";
import SamplePlayer from "../Voices/SamplePlayer";

export default class DrumMachine extends MizzyDevice {

	constructor (context) {
		super(context);

		this.CLAP = new Sample(this.context);
		this.CLAP.load("./assets/CLAP.mp3");

		this.HAT01 = new Sample(this.context);
		this.HAT01.load("./assets/HAT01.mp3");

		this.HIT01 = new Sample(this.context);
		this.HIT01.load("./assets/HIT01.mp3");

		this.HIT02 = new Sample(this.context);
		this.HIT02.load("./assets/HIT01.mp3");

		this.KICK01 = new Sample(this.context);
		this.KICK01.load("./assets/KICK01.mp3");

		this.KICK02 = new Sample(this.context);
		this.KICK02.load("./assets/KICK02.mp3");

	}

	NoteOn (MidiEvent) {
		let voice = null;
		switch (MidiEvent.value) {
			case 1:
				voice = new SamplePlayer(this.context, this.KICK01.buffer, false, 8.17);
				break;
			case 2:
				voice = new SamplePlayer(this.context, this.KICK02.buffer, false, 8.66);
				break;
			case 3:
				voice = new SamplePlayer(this.context, this.CLAP.buffer, false, 9.177);
				break;
			case 4:
				voice = new SamplePlayer(this.context, this.HIT01.buffer, false, 9.72);
				break;
			case 5:
				voice = new SamplePlayer(this.context, this.HIT02.buffer, false, 10.3);
				break;
			case 6:
				voice = new SamplePlayer(this.context, this.HAT01.buffer, false, 10.9);
				break;
		}
		if (voice != null) {
			voice.init();
			this.setVoiceValues();
			voice.connect(this.effectInput);
			voice.on(MidiEvent);
			this.voices[MidiEvent.value] = voice;
		}
	}
}