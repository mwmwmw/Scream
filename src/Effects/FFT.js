export default class FFT {
	constructor (context) {
		this.context = context;
		this.destination = this.context.createAnalyser();
		this.destination.fftSize = 128;
		this.destination.maxDecibels = -30;
		this.destination.minDecibels = -144;
		this.destination.smoothingTimeConstant = 0.5;
		this.canvas = document.getElementById("fft");
		this.ctx = this.canvas.getContext("2d");
		window.requestAnimationFrame(() => {
			this.log();
		})
	}

	log () {
		var myDataArray = new Uint8Array(this.destination.frequencyBinCount);
		this.destination.getByteFrequencyData(myDataArray);

		var ctx = this.ctx;
		ctx.save();
		ctx.globalAlpha = 0.2;
		ctx.fillStyle = "rgb(33,33,99)";
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.restore();
		var i = 0;
		var width = (ctx.canvas.width / myDataArray.length);

		for (var point in myDataArray) {
			ctx.fillStyle = "rgb(100,255,255)";
			ctx.fillRect(
				((width + 2) * i),
				ctx.canvas.height,
				width,
				-myDataArray[point]);
			i++;
		}

		window.requestAnimationFrame(() => {
			this.log();
		})
	}

	on (MidiEvent) {
		this.start(this.context.currentTime, MidiEvent.frequency);
	}

	off () {
		return this.stop(this.context.currentTime);
	}

	start (time) {

	}

	stop (time) {

	}


	connect (destination) {
		this.destination.connect(destination);
	}
}
