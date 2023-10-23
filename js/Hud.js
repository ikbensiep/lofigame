export default class HeadsupDisplay { 
  constructor (game) {
    this.game = game;
    this.player = game.player;
    this.element = this.game.camera.querySelector('.hud');
    
    this.messages = {};
    this.autohideTime = 5000;

    this.sessionTime = 600000;
  }

  postMessage (section, type, message, autohide = false) {
    if(this.messages[section]?.message == message) return;

    if(!this.messages[section]) this.messages[section] = {};

    if(this.messages[section]['message'] !== message) {
      this.messages[section]['message'] = message;
      this.messages[section]['type'] = type;

      this.element.querySelector(`.${section} .${type}`).textContent = message;
      if (autohide) {
        setTimeout(()=> {
          this.element.querySelector(`.${section} .${type}`).textContent = '';
        }, this.autohideTime)
      }
    }
  }

  addCompetitor (playerId, name) {
    const li = document.createElement('li');
    li.textContent = name;
    li.dataset.carnumber = playerId;
    this.element.querySelector('.competitors').appendChild(li);
    this.postMessage('racecontrol','notice', `${name} (${playerId}) joined the session.`, true);
  }

  removeCompetitor (playerId) {
    this.element.querySelector(`.competitors li[data-carnumber=${playerId}]`).remove();
  }

  updateSessionTimer () {
    let clock = this.millisToMinutesAndSeconds(this.sessionTime);
    this.postMessage('session','time', clock)

  }

  millisToMinutesAndSeconds(millis) {
    let minutes = Math.floor(millis / 60000);
    let seconds = ((millis % 60000) / 1000).toFixed(0);
    return (
      seconds == 60 ?
      (minutes+1) + ":00" :
      minutes + ":" + (seconds < 10 ? "0" : "") + seconds
    );
  }

  update (deltaTime) {
    this.sessionTime -= deltaTime;
    if(this.sessionTime <= 0) {
      this.sessionTime = 0;
      this.postMessage('racecontrol','notice','session finished', true)
      this.postMessage('session','status','finished')
    } else {
      this.updateSessionTimer();
    }
    return this.sessionTime;
  }

}