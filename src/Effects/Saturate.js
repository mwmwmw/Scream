import Effect from "./Effect";

const MAX = 1;
const MIN = 0;
const DEFAULT = 100;
const WINDOW_SIZE = 512;

export default class Saturate extends Effect {
	constructor(context) {
		super(context);
		this.name = "saturate";
		this._amount = DEFAULT;
	}

	setup() {
		this.effect = this.context.createWaveShaper();
		this.effect.curve = this.createCurve(400);
		this.effect.oversample = '4x';
	}

	createCurve(k = DEFAULT) {
		var curve = new Float32Array(this.context.sampleRate);
		var deg = Math.PI / 180;
		var x = 0;
		for (var i = 0 ; i < this.context.sampleRate; i++ ) {
			x = i * 2 / this.context.sampleRate - 1;
			curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
		}
	  	return curve;
	}

	f(x, range = DEFAULT) {

		return x * range;
		//return Math.sin(Math.pow(Math.cos(Math.PI * (x) / 4.0), 1) * range) * ((range / 0.5) * 1.18) *10;
	}

	set amount(value) {
		this._amount = 1 + (MIN + (value * MAX));
		this.effect.curve = this.createCurve(this._amount);
	}

	get amount() {
		return this._amount;
	}

	get element() {
		return this.canvas;
	}

	addToElement(element) {
		element.appendChild(this.element);
	}

}