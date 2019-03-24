import Effect from "./Effect";
import Noise from "../Voices/Noise";

// SAFARI Fix
const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext; 

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

		this.attack = 0.001;
		this.decay = 0.2;
		this.release = 0.8;

		this.wet = this.context.createGain();
		this.wet.gain.value = 1;
		this.dry = this.context.createGain();
		this.dry.gain.value = 1;

		this.renderTail();
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
		const tailContext = new OfflineAudioContext( 2, this.context.sampleRate * this.reverbTime, this.context.sampleRate );
			tailContext.oncomplete = (buffer) => {
				this.effect.buffer = buffer.renderedBuffer;
			}
		
    const tailOsc = new Noise(tailContext, 1);
          tailOsc.init();
          tailOsc.connect(tailContext.destination);
          tailOsc.attack = this.attack;
          tailOsc.decay = this.decay;
          tailOsc.release = this.release;
		
      
      tailOsc.on({frequency: 500, velocity: 1});
			tailContext.startRendering();
		setTimeout(()=>{
			tailOsc.off(); 
		},20);
	}

	set decayTime(value) {
		let dc = value/3;
		this.reverbTime = value;
		this.attack = 0;
		this.decay = dc;
		this.release = dc;
		this.renderTail();
	}

}