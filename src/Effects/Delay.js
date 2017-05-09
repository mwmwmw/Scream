import Effect from "./Effect";
import Filter from "./Filter";

export default class Delay extends Effect {
	constructor (context) {
		super(context);
	}

	setup () {
		this.effect = this.context.createDelay();
		this.effect.delayTime.value = 0.5;
		this.dry = this.context.createGain();
		this.wet = this.context.createGain();
		this.feedback = this.context.createGain();
		this.feedback.gain.value = 0.75;
		this.filter = new Filter(this.context, "bandpass", 1000, 0.3);
	}

	wireUp () {

		this.input.connect(this.dry);
		this.dry.connect(this.output);
		this.wet.connect(this.output);

		this.input.connect(this.effect);
		this.effect.connect(this.wet);

		this.effect.connect(this.filter.input);
		this.filter.connect(this.feedback);
		this.feedback.connect(this.effect);

	}

	set feedbackAmount (value) {
		let normalizedValue = value;
		if (normalizedValue > 0.98) {
			normalizedValue = 0.98;
		}
		this.feedback.gain.value = normalizedValue;
	}

	get feedbackAmount () {
		return this.feedback.gain.value;
	}

	set filterFrequency (value) {
		this.filter.effect.frequency.value = value;
	}

	get filterFrequency () {
		return this.filter.effect.frequency.value;
	}

	set filterQ (value) {
		this.filter.effect.Q.value = value;
	}

	get filterQ () {
		return this.filter.effect.Q.value;
	}

}