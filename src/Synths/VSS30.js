import MizzyDevice from "../MizzyDevice";
import Sample from "../Components/Sample";
import SamplePlayer from "../Voices/SamplePlayer";

export default class VSS30 extends MizzyDevice {

	constructor (context) {
		super(context);
		this.sample = new Sample(this.context);
		this.recording = false;
		this._loopStart = 0;
		this._loopEnd = 0;
		this._loopLength = 1;
	}

	record(timeout = null) {
		if(!this.recording) {
			console.log("recording...");
			this.recording = true;
			this.sample.record();
			if(timeout!=null) {
				setTimeout(() => this.stopRecording(), timeout)
			}
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
		this.setVoiceValues();
		voice.connect(this.effectInput);
		voice.on(MidiEvent);
		this.voices[MidiEvent.value] = voice;
	}

	set loopStart(value) {
		this._loopStart = value;
		this.setVoiceValues();
	}

	get loopStart () {
		return this._loopStart;
	}

	set loopEnd(value) {
		this._loopEnd = value;
		this.setVoiceValues();
	}

	get loopEnd () {
		return this._loopEnd;
	}

	set loopLength(value) {
		this._loopLength = value;
		this.setVoiceValues();
	}

	get loopLength () {
		return this._loopLength;
	}


	set attack (value) {
		this._attack = value;
		this.setVoiceValues();
	}

	get attack () {
		return this._attack;
	}

	set decay (value) {
		this._decay  = value;
		this.setVoiceValues();
	}

	get decay () {
		return this._decay;
	}

	set sustain (value) {
		this._sustain = value;
		this.setVoiceValues();
	}

	get sustain () {
		return this._sustain;
	}

	set release (value) {
		this._release = value;
		this.setVoiceValues();
	}

	get release () {
		return this._release;
	}

	setVoiceValues() {
		this.voices.forEach((voice)=>{
			voice.attack = this._attack;
			voice.decay = this._decay;
			voice.sustain = this._sustain;
			voice.release = this._release;
			voice.loopStart = this._loopStart;
			//voice.loopEnd = this._loopEnd;
			voice.loopLength = this._loopLength;
		});
	}

}