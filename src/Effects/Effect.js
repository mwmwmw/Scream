export default class Effect {

	constructor (context) {
		this.name = "effect";
		this.context = context;
		this.input = this.context.createGain();
		this.effect = null;
		this.bypassed = false;
		this.output = this.context.createGain();
		this.setup();
		this.wireUp();
	}

	bypass(bool) {
		if(bool != this.bypassed) {
			this.bypassed = bool;
			if(bool) {
				this.input.disconnect(this.effect);
				this.input.connect(this.output);
			} else {
				this.input.disconnect(this.output);
				this.input.connect(this.effect);
			}
		}
	}

	setup() {
		this.effect = this.context.createGain();
	}

	wireUp() {
		this.input.connect(this.effect);
		this.effect.connect(this.output);
	}

	connect(destination) {
		this.output.connect(destination);
	}

}