export default class MizzyDevice {
	constructor(context) {
		this.context = context;
		this.output = this.context.createGain();
		this.effectInput = this.output;
		this.voices = [];
		this.effects = [];
		this._attack = 0;
		this._decay = 0.001;
		this._sustain = this.output.gain.value;
		this._release = 0.001;
	}

	NoteOn(MidiEvent) {

	}

	NoteOff (MidiEvent) {
		if(this.voices[MidiEvent.value] != undefined) {
			this.voices[MidiEvent.value].off(MidiEvent);
		}
	}

	onCC (MidiEvent) {

	}

	addEffect (effect, options) {
		this.effects.push(new effect(this.context));
	}

	connectEffects () {
		this.effectInput = this.effects[0].input;
		for (let i = this.effects.length - 1; i >= 0; i--) {
			console.log(this.effects[i]);
			if (i == this.effects.length - 1) {
				this.effects[i].connect(this.output);
			} else {
				this.effects[i].connect(this.effects[i + 1].input)
			}
		}
	}
	connect (destination) {
		this.output.connect(destination);
	}
	disconnect (destination) {
		this.output.disconnect(destination);
	}

	setVoiceValues() {
		this.voices.forEach((voice)=>{
			voice.attack = this._attack;
			voice.decay = this._decay;
			voice.sustain = this._sustain;
			voice.release = this._release;
		});
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

}