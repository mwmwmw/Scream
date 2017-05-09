import {FilterEnvelope, AmpEnvelope, Sample} from "./Components/Components";
import {Chorus, Delay, Filter, Reverb, FFT, Saturate} from "./Effects/Effects";
import {ComplexVoice, Noise, SamplePlayer, Voice} from "./Voices/Voices";
import {VSS30, Vincent} from "./Synths/Synths";

export const Components = {FilterEnvelope, AmpEnvelope, Sample};
export const Effects = {Chorus, Delay, Filter, Reverb, FFT, Saturate};
export const Voices =   {ComplexVoice, Noise, SamplePlayer, Voice};
export const Synths = {VSS30, Vincent};