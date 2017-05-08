import Effect from "./Effect";
import Noise from "../Voices/Noise";

export default class Reverb extends Effect {
	constructor (context) {
		super(context);
		this.attack = 0;
		this.decay = 0.2;
		this.release = 0.2;
	}

	setup () {
		this.effect = this.context.createConvolver();

		this.reverbTime = 1;

		this.wet = this.context.createGain();
		this.wet.gain.value = 1;
		this.dry = this.context.createGain();
		this.dry.gain.value = 1;

		this.buffer = this.renderTail();

	}

	wireUp() {
		this.input.connect(this.dry);
		this.input.connect(this.effect);

		this.dry.connect(this.output);
		this.effect.connect(this.wet);
		this.wet.connect(this.output);
	}

	renderTail () {
		let tailContext = new OfflineAudioContext(2, this.context.sampleRate * this.reverbTime, this.context.sampleRate);
		let buffer = tailContext.createBufferSource();
		let tail = new Noise(tailContext, 1);
		tail.init();
		tail.connect(tailContext.destination);
		tail.attack = this.attack;
		tail.decay = this.decay;
		tail.release = this.release;
		tail.on(100);
		tail.off();
		return tailContext.startRendering().then((buffer) => {
			this.effect.buffer = buffer;
		});
	}

	set decayTime(value) {
		let dc = value/3;
		this.reverbTime = value;
		this.attack = 0;
		this.decay = dc;
		this.release = dc;
		this.buffer = this.renderTail();
	}

	set dry (value) {
		this.dry.gain.value = value;
	}

	get dry () {
		this.dry.gain.value;
	}

	set wet (value) {
		this.wet.gain.value = value;
	}

	get wet () {
		this.wet.gain.value;
	}

}