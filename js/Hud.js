export default class HeadsupDisplay { 
  constructor (game) {
    this.game = game;
    this.player = game.player;
    this.element = this.game.camera.querySelector('.hud');
    
    this.messages = {};
    this.autohideTime = 10000;
    
    // 10 min.
    this.sessionTime = 600000 * 6;
  }

  postMessage (section, type, message, autohide = false) {
    let sections = Object.keys(this.messages);
    if(sections.includes(section)) {
      let types = Object.keys(this.messages[section]);
      if(types.includes(type)) {
        if(this.messages[section][type].message === message) {
          return;
        } else {
          // console.log({section, type});
        }
      }
    }

    // console.warn(section, type, message);

    if(!this.messages[section]) {
      this.messages[section] = {};
      this.messages[section][type] = message;
    }
    
    if(this.messages[section][type] !== message) {
      this.messages[section][type] = message;


      // render
      let container = this.element.querySelector(`.${section} .${type}`);
      container.innerHTML = message;

      if (type === 'status') container.dataset.status = message;
      
      if (autohide) {
        setTimeout(()=> {
          console.log('autohide: ', section, type, message);
          container.innerHTML = '';
        }, this.autohideTime)
      }
    }
  }

  addCompetitor (playerId, name, team) {
    const driverCard = document.createElement('li');
    driverCard.textContent = name;
    driverCard.classList.add(team);
    driverCard.dataset['carnumber'] = playerId;
    driverCard.dataset['shortname'] = name.slice(0, 3);

    this.element.querySelector('.competitors').appendChild(driverCard);
    this.postMessage('racecontrol','notice', `${name} (${playerId}) joined the session.`, true);
  }

  removeCompetitor (playerId) {
    this.element.querySelector(`.competitors li[data-carnumber=${playerId}]`).remove();
  }

  updateSessionTimeHUD () {
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
      this.postMessage('session','status','finished')
      this.postMessage('racecontrol','notice' ,'Session Finished', false);
    } else {
      this.updateSessionTimeHUD();
    }
    return this.sessionTime;
  }

}