
import Mizzy from "mizzy";
import FFT from "./Effects/FFT";
import Filter from "./Effects/Filter";
import Reverb from "./Effects/Reverb";

import Vincent from "./Vincent";
import VSS30 from "./VSS30";

var Audio = new (window.AudioContext || window.webkitAudioContext)();

var vss30 = new VSS30(Audio);
	vss30.connect(Audio.destination);

var vincent = new Vincent(Audio, 16, "sawtooth",60);
vincent.addEffect(Filter);
vincent.addEffect(Reverb);
vincent.addEffect(FFT);
vincent.connectEffects();
//vincent.connect(Audio.destination);

var m = new Mizzy();
m.initialize().then(() => {
	m.bindToAllInputs();
	m.bindKeyboard();
	m.keyToggle((e) => {
		vincent.NoteOn(e);
		vss30.NoteOn(e);
	}, (e) => {
		vincent.NoteOff(e);
		vss30.NoteOff(e);
	});

	m.onCC(1, (e) => {
		vincent.effects[0].effect.frequency.value = 50 + (e.ratio * 6000)
	});
	m.onCC(2, (e) => {
		vincent.effects[0].effect.Q.value = e.ratio * 50;
	});
});

window.addEventListener("keydown", (e) => {
	if(e.keyCode == 192) {
		setTimeout(() => {
			vss30.record();
		}, 1000);
	}
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

// navigator.permissions.query({name:'microphone'}).then(function(result) {
// 	if (result.state == 'granted') {
//
// 	} else if (result.state == 'prompt') {
//
// 	} else if (result.state == 'denied') {
//
// 	}
// 	result.onchange = function() {
//
// 	};
// });
