import { AmpEnvelope, FilterEnvelope, Sample, SampleMap } from "./Components/Components";
import { Chorus, Delay, FFT, Filter, Reverb, Saturate } from "./Effects/Effects";
import { ComplexVoice, Noise, SamplePlayer, Voice } from "./Voices/Voices";
import { DrumMachine, Vincent, VSS30 } from "./Synths/Synths";

// SAFARI Polyfills
if(!window.AudioBuffer.prototype.copyToChannel) {
	window.AudioBuffer.prototype.copyToChannel = function copyToChannel (buffer,channel) {
		this.getChannelData(channel).set(buffer);
	}
}
if(!window.AudioBuffer.prototype.copyFromChannel) {
	window.AudioBuffer.prototype.copyFromChannel = function copyFromChannel (buffer,channel) {
		buffer.set(this.getChannelData(channel));
	}
}

export const Components = {FilterEnvelope, AmpEnvelope, Sample, SampleMap};
export const Effects = {Chorus, Delay, Filter, Reverb, FFT, Saturate};
export const Voices = {ComplexVoice, Noise, SamplePlayer, Voice};
export const Synths = {VSS30, Vincent, DrumMachine};