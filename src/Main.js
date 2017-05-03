import Mizzy from "mizzy";
import FFT from "./Effects/FFT";
import Filter from "./Effects/Filter";
import Reverb from "./Effects/Reverb";

import Vincent from "./Vincent";
import VSS30 from "./VSS30";

var Audio = new (window.AudioContext || window.webkitAudioContext)();

var vssConnected = false;
var vss30 = new VSS30(Audio);
//vss30.connect(Audio.destination);

var vincentConnected = false;
var vincent = new Vincent(Audio, 16, "sawtooth", 60);
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
		//vincent.effects[0].effect.Q.value = e.ratio * 50;

		vincent.wideness = e.ratio * 100;
	});
});

window.addEventListener("keyup", (e) => {
	switch (e.keyCode) {
		case 192:
			vss30.stopRecording();
			break;
	}
});

window.addEventListener("keydown", (e) => {
	console.log(e.keyCode);
	switch (e.keyCode) {
		case 192:
			if (vssConnected) {
				vss30.record();
			}
			break;
		case 49:
			if (!vssConnected) {
				console.log("VSS Connected");
				vss30.connect(Audio.destination);
			} else {
				console.log("VSS Disconnected");
				vss30.disconnect(Audio.destination);
			}
			vssConnected = !vssConnected;
			break;
		case 50:
			if (!vincentConnected) {
				console.log("Vincent Connected");
				vincent.connect(Audio.destination);
			} else {
				console.log("Vincent Disconnected");
				vincent.disconnect(Audio.destination);
			}
			vincentConnected = !vincentConnected;
			break;
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
