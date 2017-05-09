import Effect from "./Effect";

const MAX = 1;
const MIN = 0;
const DEFAULT = 1;
const WINDOW_SIZE = 512;

export default class Saturate extends Effect {
	constructor(context) {
		super(context);
		this._amount = DEFAULT;

		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("id", "saturate");
		this.ctx = this.canvas.getContext("2d");
		this.ctx.canvas.width = 512;
		this.ctx.canvas.height = 512;
		window.requestAnimationFrame(() => {
			this.draw();
		});
	}

	setup() {
		this.effect = this.context.createWaveShaper();
		this.effect.curve = this.createCurve();
		console.log(this.effect.curve);
		this.effect.oversample = '4x';
	}

	createCurve(amount = DEFAULT) {
			var curve = new Float32Array(WINDOW_SIZE);
		var x = 0;
		for (let i = 0; i < WINDOW_SIZE; i++) {
			var x = 1 - (i/WINDOW_SIZE) * 2;
			curve[i] = this.f(x, amount);
		}

		return curve;
	}

	f(x, range = DEFAULT) {

		return x * range;
		//return Math.sin(Math.pow(Math.cos(Math.PI * (x) / 4.0), 1) * range) * ((range / 0.5) * 1.18) *10;
	}

	draw() {
		var ctx = this.ctx;
		ctx.save();
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = "rgb(33,33,99)";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
		var width = 1;

		for (var i = 0; i < this.effect.curve.length; i++) {
			var point = this.effect.curve[i];
			ctx.fillStyle = "rgb(100,255,255)";
			ctx.fillRect(
				i,
				(WINDOW_SIZE*.5) + (point*WINDOW_SIZE),
				width,
				1);
		}

		window.requestAnimationFrame(() => {
			this.draw();
		})
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