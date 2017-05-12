import Effect from "./Effect";

export default class FFT extends Effect{
	constructor (context) {
		super(context);
		this.name = "fft";
	}

	setup () {
		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("id","fft");
		this.ctx = this.canvas.getContext("2d");
		this.ctx.canvas.width = 1024;
		this.ctx.canvas.height = 400;
		this.effect = this.context.createAnalyser();
		this.effect.fftSize = 1024;
		this.effect.maxDecibels = -50;
		this.effect.minDecibels = -120;
		this.effect.smoothingTimeConstant = 0.9;
		this.effect.connect(this.output);
	}

	draw () {
		var myDataArray = new Uint8Array(this.effect.frequencyBinCount);
		this.effect.getByteFrequencyData(myDataArray);

		var ctx = this.ctx;
		ctx.save();
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = "rgb(33,33,99)";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
		var i = 0;
		var width = (ctx.canvas.width / myDataArray.length);

		for (var point in myDataArray) {
			ctx.fillStyle = "rgb(100,255,255)";
			ctx.fillRect(
				((width) * i),
				ctx.canvas.height,
				width,
				-(myDataArray[point]/255)*ctx.canvas.height);
			i++;
		}

		window.requestAnimationFrame(() => {
			this.draw();
		})
	}
	get element () {
		return this.canvas;
	}

	addToElement(element) {
		element.appendChild(this.element);
	}
}
