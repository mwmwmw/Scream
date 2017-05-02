import MizzyDevice from "./MizzyDevice";
import Mizzy from "mizzy";
import FFT from "./Effects/FFT";
import Filter from "./Effects/Filter";
import Reverb from "./Effects/Reverb";
import Sample from "./Components/Sample";

import SamplePlayer from "./Voices/SamplePlayer";

export default class Vincent extends MizzyDevice {

	constructor () {
		super();

		this.context = new (window.AudioContext || window.webkitAudioContext)();

		this.destination = this.context.createGain();
		this.destination.connect(this.context.destination);
		this.effectsConnected = false;
		this.effectInput = this.destination;
		this.oscillatorType = "sawtooth";
		this.voices = [];

		this.effects = [];

		this.sample = new Sample(this.context);
		this.sample.load("./Assets/moog7.mp3");
		//this.sample.record();


	}

	NoteOn (MidiEvent) {
		let voice = new SamplePlayer(this.context, this.sample.buffer, true);
		voice.init();
		voice.connect(this.effectInput);
		voice.on(MidiEvent);
		this.voices[MidiEvent.value] = voice;
	}

	NoteOff (MidiEvent) {
		this.voices[MidiEvent.value].off(MidiEvent);
	}

	addEffect (effect, options) {
		this.effects.push(new effect(this.context));
	}

	connectEffects () {
		this.effectInput = this.effects[0].input;
		for (let i = this.effects.length - 1; i >= 0; i--) {
			console.log(this.effects[i]);
			if (i == this.effects.length - 1) {
				this.effects[i].connect(this.destination);
			} else {
				this.effects[i].connect(this.effects[i + 1].input)
			}
		}
	}
}


var vincent = new Vincent();
vincent.addEffect(Filter);
vincent.addEffect(Reverb);
vincent.addEffect(FFT);
vincent.connectEffects();


var m = new Mizzy();
m.initialize().then(() => {
	m.bindToAllInputs();
	m.bindKeyboard();
	m.keyToggle((e) => {
		vincent.NoteOn(e);
		console.log(e);
	}, (e) => {
		vincent.NoteOff(e);
		console.log(e);
	});

	m.onCC(1, (e) => {
		vincent.effects[0].effect.frequency.value = 50 + (e.ratio * 6000)
	});
	m.onCC(2, (e) => {
		vincent.effects[0].effect.Q.value = e.ratio * 50;
	});
});


window.addEventListener("mousemove", (e) => {
	var x = Math.round((e.pageX / window.innerWidth) * 127);
	var y = Math.round((e.pageY / window.innerHeight) * 127);
	var xmessage = Mizzy.Generate.CCEvent(1, x);
	m.sendMidiMessage(xmessage);
	var ymessage = Mizzy.Generate.CCEvent(2, y);
	m.sendMidiMessage(ymessage);
});

var CanvasContainer = document.createElement("div");
document.getElementsByTagName("body")[0].appendChild(CanvasContainer);

vincent.effects[2].addToElement(CanvasContainer);
