import PercussionVoice from "../Voices/PercussionVoice";

export default class Reverb {
	constructor (context) {
		this.context = context;
		this.destination = this.context.createConvolver();
		this.reverbTime = 1;
		this.tailContext = new OfflineAudioContext(2,48000*this.reverbTime,48000);
		this.buffer = this.tailContext.createBufferSource();
		this.tail = new PercussionVoice(this.tailContext, "sawtooth");
		this.tail.trigger(100);
		this.tail.off();
		this.tailContext.startRendering().then((buffer) => {
				this.destination.buffer = buffer;
			});
	}
	connect(destination) {
		this.destination.connect(destination);
	}
}