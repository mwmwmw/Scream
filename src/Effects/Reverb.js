import Effect from "./Effect";
import Noise from "../Voices/Noise";

export default class Reverb extends Effect {
	constructor (context) {
		super(context);
	}

	setup () {
		this.effect = this.context.createConvolver();

		this.reverbTime = 1;
		this.tailContext = new OfflineAudioContext(2, this.context.sampleRate * this.reverbTime, this.context.sampleRate);


		this.buffer = this.tailContext.createBufferSource();
		this.tail = new Noise(this.tailContext, 1);
		this.tail.connect(this.tailContext.destination);
		this.tail.attack = 0;
		this.tail.decay = 0.2;
		this.tail.release = 0.2;
		this.tail.on(100);
		this.tail.off();
		this.tailContext.startRendering().then((buffer) => {

			this.effect.buffer = buffer;
			// var source = new AudioBufferSourceNode(this.context, {
			// 	buffer: buffer
			// });
			//source.start();
			//source.connect(this.context.destination);
			//console.log(source, buffer.getChannelData(0), buffer.getChannelData(1));

		});
		this.effect.connect(this.output);
	}
}