import Voice from "./Voice";

export default class PercussionVoice extends Voice{
	constructor(context, type ="sine") {
		super(context, type);
	}


	start(time) {
		this.output.gain.value = 1;
		this.output.gain.setValueAtTime(0, time);
		return this.output.gain.setTargetAtTime(this.sustain, time + this.attack, this.decay + 0.001);
	}

	stop(time) {
		this.value = -1;
		this.output.gain.cancelScheduledValues(time);
		this.output.gain.setValueAtTime(this.output.gain.value, time);
		this.output.gain.setTargetAtTime(0, time, this.release);
		this.partials.forEach((osc) => {
			osc.stop(time + this.release * 4);
		});
	}

	connect(destination) {
		this.output.connect(destination);
	}
}