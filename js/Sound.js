export default class Sound {
  constructor(options) {
		this.url = options.url;
    this.loop = true;
    this.fadein = options.fadein;
		this.playing = false;

    this.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = null;
    this.sourceBuffer = null;
    this.gainNode = null;
    this.gain = options.gain;
    this.interval = undefined;

    this.init();
  }

  init () {
		this.audioCtx = new this.AudioContext();
		this.sourceBuffer = this.audioCtx.createBufferSource();
		this.gainNode = this.audioCtx.createGain();
		this.panNode = this.audioCtx.createStereoPanner();

		this.sourceBuffer.connect(this.panNode);
		this.panNode.connect(this.gainNode)
		
		this.gainNode.connect(this.audioCtx.destination);
		this.gainNode.gain.value = this.gain ? this.gain : this.fadein ? 0.0 : 0.05;
		this.getSound();
		console.log(`🔊 audioCtx: `, this.audioCtx);
	}

	getSound () {
		var url = this.url;
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = 'arraybuffer';

		request.onload = () => {
			var undecodedAudio = request.response;
			this.audioCtx.decodeAudioData(undecodedAudio, (buffer) => {

				// Tell the AudioBufferSourceNode to use this AudioBuffer.
				this.sourceBuffer.connect(this.panNode);
				this.panNode.connect(this.gainNode);
				this.sourceBuffer.buffer = buffer;
				this.sourceBuffer.loop = this.loop;
				this.sourceBuffer.playbackRate.value = 1;

				if( this.fadein) {
					this.interval = setInterval(() => { this.fadeIn()}, 100);
				}
			});
		};
		request.send();
	}

	updateGain (level) {
		// todo: refactor to maxGain
		if(level < this.gain && level.toFixed(3) !== this.gainNode.gain.value.toFixed(3)) {
			this.gainNode.gain.setValueAtTime(level.toFixed(3), this.audioCtx.currentTime);
		}
	}

	fadeIn () {
		
		if(this.gain < 0.25) {
			this.gain += 0.002;
			this.updateGain(this.gain);
			console.log(this.gain)
		} else {
			this.interval = clearInterval(this.interval);
		}
	}


	toggleLoop() {
		this.sourceBuffer.loop = !this.sourceBuffer.loop;
	}

	startSound () {
		if(!this.playing) {
			this.sourceBuffer.start(0);
			this.playing = true;
		}
	}

	stopSound () {
		this.sourceBuffer.stop();
		this.playing = false
	}

}

