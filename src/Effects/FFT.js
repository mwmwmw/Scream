import Effect from "./Effect";
import { FFT_TYPES } from "../Constants";

export default class FFT extends Effect{
	constructor (context) {
		super(context);
		this.name = "fft";
		this.mode = FFT_TYPES.FREQUENCY;
	}

	setup () {
		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("id","fft");
		this.ctx = this.canvas.getContext("2d");
		this.ctx.canvas.width = 512;
		this.ctx.canvas.height = 512;
		this.effect = this.context.createAnalyser();
		this.effect.fftSize = 2048;
		this.effect.maxDecibels = -50;
		this.effect.minDecibels = -120;
		this.effect.smoothingTimeConstant = 0.9;
		this.effect.connect(this.output);
	}


	data () {
		
		switch (this.mode) {
			case FFT_TYPES.FREQUENCY:
			var myDataArray = new Float32Array(this.effect.frequencyBinCount);
			this.effect.getFloatFrequencyData(myDataArray);
			break;
			case FFT_TYPES.TIME:
			var myDataArray = new Float32Array(this.effect.frequencyBinCount);
			this.effect.getFloatTimeDomainData(myDataArray)
			break;
			case FFT_TYPES.FREQUENCY8:
			var myDataArray = new Uint8Array(this.effect.frequencyBinCount);
			this.effect.getByteTimeDomainData(myDataArray)
			break;
			case FFT_TYPES.TIME8:
			var myDataArray = new Uint8Array(this.effect.frequencyBinCount);
			this.effect.getByteTimeDomainData(myDataArray)
			break;
		}
		return myDataArray;
	}


	draw () {

		const myDataArray = this.data();

		var ctx = this.ctx;
		ctx.save();
		//ctx.globalAlpha = 0.5;
		ctx.fillStyle = "rgb(33,33,99)";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
		var i = 0;
		var width = (ctx.canvas.width / myDataArray.length);
		var height = ctx.canvas.height*0.5;

		ctx.beginPath();
		ctx.moveTo(0, height);
		ctx.strokeStyle = "rgb(100,255,255)";
		ctx.lineWidth=5;

		for (var point in myDataArray) {
			ctx.lineTo(((width) * i), height + (myDataArray[point] * height*10));
			i++;
		}
		ctx.moveTo(width, height)
		ctx.stroke();

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
