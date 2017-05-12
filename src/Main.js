import { AmpEnvelope, FilterEnvelope, Sample } from "./Components/Components";
import { Chorus, Delay, FFT, Filter, Reverb, Saturate } from "./Effects/Effects";
import { ComplexVoice, Noise, SamplePlayer, Voice } from "./Voices/Voices";
import { DrumMachine, Vincent, VSS30 } from "./Synths/Synths";

export const Components = {FilterEnvelope, AmpEnvelope, Sample};
export const Effects = {Chorus, Delay, Filter, Reverb, FFT, Saturate};
export const Voices = {ComplexVoice, Noise, SamplePlayer, Voice};
export const Synths = {VSS30, Vincent, DrumMachine};