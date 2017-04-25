import Noise from "../Voices/Noise";

export default class Reverb {
	constructor (context) {
		this.context = context;
		this.destination = this.context.createConvolver();
		this.reverbTime = 1;
		this.tailContext = new OfflineAudioContext(2, 48000 * this.reverbTime, 48000);
		this.buffer = this.tailContext.createBufferSource();
		this.tail = new Noise(this.tailContext);
		this.tail.connect(this.tailContext.destination);
		this.tail.trigger(100);
		this.tail.off();
		this.tailContext.startRendering().then((buffer) => {

			this.destination.buffer = buffer;
			// var source = new AudioBufferSourceNode(this.context, {
			// 	buffer: buffer
			// });
			//source.start();
			//source.connect(this.context.destination);
			//console.log(source, buffer.getChannelData(0), buffer.getChannelData(1));

		});
	}

	connect (destination) {
		this.destination.connect(destination);
	}
}