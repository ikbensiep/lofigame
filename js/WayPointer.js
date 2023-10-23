export default class WayPointer {
  constructor(game) {
    this.game = game;
    this.player = game.player; 
    this.position = {x: 0, y: 0};
    this.element = this.game.worldMap.querySelector('.waypointer');
    
  }

  init () {
    this.position = {...this.player.position};
    console.info(this.player)
  }

  update () {
    if(this.player.currentPath == 'undefined') { 
      console.warn('no path?', this.player)
      return false;
    }
    this.position = {...this.player.position};
    this.element.style.setProperty('--x', Math.round(this.position.x))
    this.element.style.setProperty('--y', Math.round(this.position.y))

    let currentWaypoint = this.player.paths[this.player.currentPath].points[this.player.currentWaypoint];

    let cx = parseInt(this.position.x);
    let cy = parseInt(this.position.y);
    let dx = parseInt(currentWaypoint.x - cx);
    let dy = parseInt(currentWaypoint.y - cy);
      
    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;
    this.facingAngle = angleDegs;

    this.element.dataset['path'] = `${this.player.paths[this.player.currentPath].name}.points[${[this.player.currentWaypoint]}]`;
    this.element.style.setProperty('--rot', this.facingAngle.toFixed(2));

    let check = this.game.checkCollision(this.player, currentWaypoint)
    if(check[0]) {
      this.element.classList.add('current-complete');
    }
  }
}