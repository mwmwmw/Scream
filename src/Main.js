import MizzyDevice from "./MizzyDevice";
import Mizzy from "mizzy";
import Voice from "./Voices/Voice";
import Filter from "./Filter/Filter";

export default class Vincent extends MizzyDevice {

		constructor() {
			super();

			this.context = new (window.AudioContext || window.webkitAudioContext)();
			this.filter = new Filter(this.context);
			this.filter.connect(this.context.destination);
			this.oscillatorType = "sawtooth";
			this.voices = [];

		}

		NoteOn(MidiEvent) {
			let voice = new Voice(this.context, this.oscillatorType);
			voice.connect(this.filter.destination);
			voice.on(MidiEvent);
			this.voices.push(voice);
		}

		NoteOff(MidiEvent) {
			this.voices.forEach((voice,i) => {
				if(voice.value = MidiEvent.value) {
					voice.off(MidiEvent);
					this.voices.splice(i, 1);
				}
			})
		}

}

var vincent = new Vincent();

var m = new Mizzy();
m.initialize().then(()=> {
	m.bindToAllInputs();
	m.bindKeyboard();
	m.keyToggle((e)=>{
		vincent.NoteOn(e);
	}, (e)=>{
		vincent.NoteOff(e);
	});

	m.onCC(1, (e) => updateCCValues(e));
});


window.addEventListener("mousemove", (e)=> {
	var x = Math.round((e.pageX / window.innerWidth) * 127);
	var y = Math.round((e.pageY / window.innerHeight) * 127);
	var xmessage = Mizzy.Generate.CCEvent(1, x);
	m.sendMidiMessage(xmessage);
	var ymessage = Mizzy.Generate.CCEvent(2, y);
	m.sendMidiMessage(ymessage);
});

function updateCCValues(e) {
	vincent.filter.cutoff = 100 + (e.ratio * 8000);
}