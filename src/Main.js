import MizzyDevice from "./MizzyDevice";
import Mizzy from "mizzy";
import Voice from "./Voices/Voice";


export default class Vincent extends MizzyDevice {

		constructor() {
			super();

			this.context = new (window.AudioContext || window.webkitAudioContext)();
			this.merge = this.context.createChannelMerger(8);
			//this.merge.connect();
			this.voices = [];

		}

		NoteOn(MidiEvent) {
			let voice = new Voice(this.context);
			voice.connect(this.context.destination);
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
m.initialize();
m.bindKeyboard();
m.keyToggle((e)=>{
	vincent.NoteOn(e);
}, (e)=>{
	vincent.NoteOff(e);
})