import MizzyDevice from "../MizzyDevice";
import Sample from "../Components/Sample";
import SamplePlayer from "../Voices/SamplePlayer";

export default class VSS30 extends MizzyDevice {

	static get LOOP_MODES () {
		return {
			NORMAL: "NORMAL",
			PINGPONG: "PINGPONG"
		}
	}

	constructor (context) {
		super(context);
		this.sample = new Sample(this.context);
		this.recording = false;
		this._loop = true;
		this._loopMode = VSS30.LOOP_MODES.NORMAL;
		this._reverse = false;
		this._loopStart = 0;
		this._loopEnd = 0;
		this._loopLength = 1;
	}

	record(timeout = null, overdub = false) {
		if(!this.recording) {
			console.log("recording...");
			this.recording = true;
			this.sample.overdub = overdub;
			this.sample.record();
			if(timeout!=null) {
				setTimeout(() => this.stopRecording(), timeout)
			}
		}
	}

	stopRecording() {
		if(this.recording) {
			this.recording = false;
			if(!this.sample.overdub) {
				this.sample.stopRecording();
			} else {
				this.sample.overwrite();
			}
			console.log("stop recording.", this.sample.buffer.length);
		}
	}

	NoteOn (MidiEvent) {
		let voice = new SamplePlayer(this.context, this.sample.buffer, this._loop);
		voice.init();
		this.setVoiceValues();
		voice.connect(this.effectInput);
		voice.on(MidiEvent);
		this.voices[MidiEvent.value] = voice;
	}

	set loop (value) {
		this._loop = value;
	}

	get loop () {
		return this._loop;
	}

	set loopMode (value) {
		this._loopMode = value;
	}

	set loopStart(value) {
		this._loopStart = value;
		this.setVoiceValues();
	}

	set loopMode (value) {
		this._loopMode = value;
		switch (this._loopMode) {
			case VSS30.LOOP_MODES.PINGPONG:
				this.sample.pingpong();
				break;
			case VSS30.LOOP_MODES.NORMAL:
				this.sample.normal();
				break;
		}
	}

	get loopMode () {
		return this._loopMode;
	}

	toggleReverse() {
		this.sample.reverse();
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

	setSample( sample ) {
		this.sample = sample;
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