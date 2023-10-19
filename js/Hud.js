export default class HeadsupDisplay { 
  constructor (game) {
    this.game = game;
    this.player = game.player;
    this.element = this.game.camera.querySelector('.hud');
    
    this.messages = {}
  }

  postMessage (section, type, message) {
    if(this.messages[section]?.message == message) return;

    if(!this.messages[section]) this.messages[section] = {};

    if(this.messages[section]['message'] !== message) {
      this.messages[section]['message'] = message;
      this.messages[section]['type'] = type;

      this.element.querySelector(`.${section} .${type}`).textContent = message;
      setTimeout(()=> {
        this.element.querySelector(`.${section} .${type}`).textContent = '';
      }, 3000)
    }
  }

  addCompetitor (playerId, name) {
    const li = document.createElement('li');
    li.textContent = name;
    li.dataset.carnumber = playerId;
    this.element.querySelector('.competitors').appendChild(li);
    this.postMessage('racecontrol','notice', `${name} (${playerId}) joined the session.`)
  }

  removeCompetitor (playerId) {
    this.element.querySelector(`.competitors li[data-carnumber=${playerId}]`).remove();
  }



}