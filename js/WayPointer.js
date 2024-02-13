export default class WayPointer {
  constructor(game) {
    this.game = game;
    this.player = game.player; 
    this.position = {x: 0, y: 0};
    this.element = this.game.worldMap.querySelector('.waypointer');
    
  }

  init () {
    this.position = {...this.player.position};
    console.log('🧭 waypointer init');
  }

  update () {
    if(this.player.currentPath == 'undefined') { 
      console.warn('no path?', this.player)
      return false;
    }
    this.position = {...this.player.position};
    this.element.style.setProperty('--x', Math.round(this.position.x))
    this.element.style.setProperty('--y', Math.round(this.position.y))

    let currentWaypoint = this.player.paths[this.player.currentPath].points[this.player.currentWaypoint || 0];
    
    // only point to next-next waypoint if current waypoint is close / on screen
    let dist = this.game.getDistance(this.player, currentWaypoint);
    let isOnScreen = dist < window.innerHeight / 2;
    if (isOnScreen) {
     currentWaypoint = this.player.paths[this.player.currentPath].points[this.player.currentWaypoint + 1] || this.player.paths[this.player.currentPath].points[this.player.currentWaypoint];
    }

    let cx = parseInt(this.position.x);
    let cy = parseInt(this.position.y);
    let dx = parseInt(currentWaypoint.x - cx);
    let dy = parseInt(currentWaypoint.y - cy);

    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;
    this.facingAngle = angleDegs;

    this.element.dataset['path'] = `${this.player.paths[this.player.currentPath].name}.points[${this.player.currentWaypoint}]`;
    this.element.style.setProperty('--rot', this.facingAngle.toFixed(2));

    if(this.player.currentPath == 3 && this.player.currentWaypoint === 0) {
      this.element.classList.add('all-complete');
    }
  }
}