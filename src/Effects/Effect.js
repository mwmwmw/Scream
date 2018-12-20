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
				this.input.connect(this.output);
				this.input.disconnect(this.effect);
			} else {
				this.input.connect(this.effect);
				this.input.disconnect(this.output);
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