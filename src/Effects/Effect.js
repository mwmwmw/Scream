export default class Effect {

	constructor (context) {
		this.name = "effect";
		this.context = context;
		this.input = this.context.createGain();
		this.effect = null;
		this.output = this.context.createGain();
		this.setup();
		this.wireUp();
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