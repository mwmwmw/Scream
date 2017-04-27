import Voice from "./Voice";

export default class ComplexVoice extends Voice {

	constructor (context, type, amount = 3) {
		super(context, "none");
		this.type = type;
		this.widen = 50;
		this.analog = 5;
		this.voicePartials(amount);
	}

	voicePartials (amount) {
		for (let i = 0; i < amount ;i++) {
			let osc = this.context.createOscillator();
			osc.type = this.type;
			if(i>0) {
				var detune = (i / amount * this.widen);
				if (i % 1 == 0) {
					detune = -detune;
				}
				osc.detune.value = detune + (this.analog * Math.random());
			}
			osc.connect(this.ampEnvelope.output);
			osc.start(this.context.currentTime);
			this.partials.push(osc);
		}
	}
}