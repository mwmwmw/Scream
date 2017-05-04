import {FilterEnvelope, AmpEnvelope, Sample} from "./Components/Components";
import {Chorus, Delay, Filter, Reverb, FFT} from "./Effects/Effects";
import {ComplexVoice, Noise, SamplePlayer, Voice} from "./Voices/Voices";
import {default as VSS30} from "./VSS30";
import {default as Vincent} from "./Vincent";

export const Components = {FilterEnvelope, AmpEnvelope, Sample};
export const Effects = {Chorus, Delay, Filter, Reverb, FFT};
export const Voices =   {ComplexVoice, Noise, SamplePlayer, Voice};
export const Synths = {VSS30, Vincent};