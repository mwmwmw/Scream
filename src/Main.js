import MizzyDevice from "./MizzyDevice";
import Mizzy from "mizzy";
import Voice from "./Voices/Voice";
import PercussionVoice from "./Voices/PercussionVoice";
import FFT from "./Effects/FFT";
import ComplexVoice from "./Voices/ComplexVoice";
import Noise from "./Voices/Noise";
import Filter from "./Effects/Filter";
import Reverb from "./Effects/Reverb";

export default class Vincent extends MizzyDevice {

		constructor() {
			super();

			this.context = new (window.AudioContext || window.webkitAudioContext)();

			this.destination =  this.context.createGain();
			this.destination.connect(this.context.destination);
			this.componentsConnected = false;
			this.componentInput = this.destination;
			this.oscillatorType = "sawtooth";
			this.voices = [];

			this.components = [];

		}

		NoteOn(MidiEvent) {
			let voice = new ComplexVoice(this.context, this.oscillatorType, 32);
			voice.connect(this.componentInput);
			voice.on(MidiEvent);
			this.voices[MidiEvent.value] = voice;
		}

		NoteOff(MidiEvent) {
			this.voices[MidiEvent.value].off(MidiEvent);
		}

		addComponent(component, options) {
			this.components.push(new component(this.context));
		}

		connectComponents() {
			this.componentInput = this.components[0].destination;
			for(let i = this.components.length-1; i >= 0; i--) {
				console.log(this.components[i]);
				if(i == this.components.length-1) {
					this.components[i].connect(this.destination);
				} else {
					this.components[i].connect(this.components[i+1].destination);
				}
			}
		}
}

var vincent = new Vincent();
	vincent.addComponent(Filter);
	vincent.addComponent(Reverb);
	vincent.addComponent(FFT);
	vincent.connectComponents();


var m = new Mizzy();
m.initialize().then(()=> {
	m.bindToAllInputs();
	m.bindKeyboard();
	m.keyToggle((e)=>{
		vincent.NoteOn(e);
	}, (e)=>{
		vincent.NoteOff(e);
	});

	m.onCC(1, (e) => {
		vincent.components[0].cutoff = 100 + (e.ratio * 8000)
	});
	m.onCC(2, (e) => {});
});


window.addEventListener("mousemove", (e)=> {
	var x = Math.round((e.pageX / window.innerWidth) * 127);
	var y = Math.round((e.pageY / window.innerHeight) * 127);
	var xmessage = Mizzy.Generate.CCEvent(1, x);
	m.sendMidiMessage(xmessage);
	var ymessage = Mizzy.Generate.CCEvent(2, y);
	m.sendMidiMessage(ymessage);
});

