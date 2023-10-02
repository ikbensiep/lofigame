export default class Competitor {
  constructor(game) {
    this.game = game;
    this.element = document.querySelector('.offscreen img.car-body[alt=ferrari]').cloneNode();

    this.fps = 100;
    this.frameInterval = 1000/this.fps;
    this.frameTimer = 0;

    this.position = {x: 0, y: 0}
    this.velocity = 0;
    this.facingAngle; //move to this.position?

    this.currentPath = 0;
    this.waypointsCompleted = false;
    this.paths = [];

  }

  init () {
    this.paths = [...this.game.player.paths];
    
    // finding paths in world
    this.paths.map ( path => {
      path.completed = false;
      // this.findPathWaypoints( path.name )
    });

    // choose first path, find set of waypoints

    this.currentPath = 1;
    this.findNextWayPoint(this.currentPath);
    
    this.game.player.element.appendChild(this.element);
  }

  update (deltaTime) {
    if(this.frameTimer > this.frameInterval) {
      this.frameTimer = 0;
      
      this.move();
    } else {
      this.frameTimer += deltaTime;
    }
  }

  move () {

    let player = this.game.player;
    let cx = parseInt(this.position.x);
    let cy = parseInt(this.position.y);
    let dx = parseInt(player.position.x - cx);
    let dy = parseInt(player.position.y - cy);


    this.position.x = this.position.x + (dx / 2);
    this.position.y = this.position.y + (dy / 2);

    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;

        // update sprite position + rotation
    this.element.style.setProperty('--x', Math.floor(this.position.x - this.element.width/2));
    this.element.style.setProperty('--y', Math.floor(this.position.y - this.element.height/2));
    this.element.style.setProperty('--angle', angleDegs.toFixed(2) + 'deg');
  }

  findNextWayPoint() {
  
    console.log(`path[${this.currentPath}]`, this.paths[this.currentPath].points);

    let currentPath = this.paths[this.currentPath];
    console.log (currentPath)

    if(!currentPath.completed && currentPath.points.length) {
      

      this.position = {
        x: this.paths[this.currentPath].points[0].x, 
        y: this.paths[this.currentPath].points[0].y
      }
    } else {
      this.currentPath++;
    }

    console.log(this)
  }
}