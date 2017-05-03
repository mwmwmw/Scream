import Voice from "./Voice";

export default class ComplexVoice extends Voice {

	constructor (context, type, amount = 3, wideness = 50, analog = 5) {
		super(context, "none");
		this.type = type;
		this.widen = wideness;
		this.analog = analog;
		this.amount = amount;
		this.output.gain.value = 1/amount;
	}

	init () {
		var amount = this.amount;

		for (let i = 0; i < amount; i++) {
			let osc = this.context.createOscillator();
			osc.type = this.type;
			if (i > 0) {
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

	set wideness (value) {
		this.widen = value;
		var amount = this.amount;

		this.partials.forEach((osc, i) => {
			if (i > 0) {
				var detune = (i / amount * this.widen);
				if (i % 1 == 0) {
					detune = -detune;
				}
				osc.detune.value = detune + (this.analog * Math.random());
			}
		});
	}

	get wideness () {
		return this.widen;
	}
}