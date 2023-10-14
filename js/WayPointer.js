export default class WayPointer {
  constructor(game) {
    this.game = game; 
    this.position = {x: 0, y: 0};
    this.element = this.game.worldMap.querySelector('.waypointer');
    
  }

  init () {
    this.position = {...this.game.player.position};
    console.info(this.game.player)
  }

  update () {
    if(this.game.player.currentPath == 'undefined') { 
      console.warn('no path?', this.game.player)
      return false;
    }
    this.position = {...this.game.player.position};
    this.element.style.setProperty('--x', Math.round(this.position.x))
    this.element.style.setProperty('--y', Math.round(this.position.y))
    

    let nextWaypoint = this.game.player.paths[this.game.player.currentPath].points[this.game.player.currentWaypoint];
    

    /* find player and move toward it */
    
    let cx = parseInt(this.position.x);
    let cy = parseInt(this.position.y);
    let dx = parseInt(nextWaypoint.x - cx);
    let dy = parseInt(nextWaypoint.y - cy);
      
    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;
    this.facingAngle = angleDegs;

    this.element.className = `waypointer ${this.game.player.paths[this.game.player.currentPath].name}`;
    this.element.style.setProperty('--rot', this.facingAngle.toFixed(2));

  }
}