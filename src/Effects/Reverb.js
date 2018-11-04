import Effect from "./Effect";
import Noise from "../Voices/Noise";

export default class Reverb extends Effect {
	constructor (context) {
		super(context);
		this.name = "reverb";
		this.attack = 0;
		this.decay = 0.2;
		this.release = 0.8;
	}

	setup () {
		this.effect = this.context.createConvolver();

		this.reverbTime = 2;

		this.attack = 0;
		this.decay = 0.2;
		this.release = 0.8;

		this.wet = this.context.createGain();
		this.wet.gain.value = 1;
		this.dry = this.context.createGain();
		this.dry.gain.value = 1;

		this.buffer = this.renderTail();
		this.wireUp();
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
		let tail = new Noise(tailContext, 1);
		tail.init();
		tail.connect(tailContext.destination);
		tail.attack = this.attack;
		tail.decay = this.decay;
		tail.release = this.release;
		
		let rt = tailContext.startRendering().then((buffer) => {
			this.effect.buffer = buffer;
		});

		tail.on(100);
		tail.off();

		return rt;
	}

	set decayTime(value) {
		let dc = value/3;
		this.reverbTime = value;
		this.attack = 0;
		this.decay = dc;
		this.release = dc;
		this.buffer = this.renderTail();
	}

}