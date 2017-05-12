import Effect from "./Effect";
import { FILTER_TYPES } from "../Constants";


export default class Filter extends Effect {
	constructor (context, type = FILTER_TYPES[0], cutoff = 1000, resonance = 0.9) {
		super(context);
		this.name = "filter";
		this.effect.frequency.value = cutoff;
		this.effect.Q.value = resonance;
		this.effect.type = type;
	}

	setup() {
		this.effect = this.context.createBiquadFilter();
		this.effect.connect(this.output);
	}

}