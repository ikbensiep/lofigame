import Sound from './Sound.js'

export default class Competitor {
  constructor(game, opponentIndex, displayName = 'Multiplayer') {
    this.game = game;
    this.opponentIndex = opponentIndex;
    // Clone car body from template
    let raceTeams = ['ferrari', 'ford', 'lamborghini', 'porsche'];
    let randomTeam = raceTeams[Math.floor(Math.random() * raceTeams.length)];
    this.carBody = document.querySelector('#car-template').content.cloneNode(true).querySelector('.car-body');
    this.carBody.classList.add('opponent', randomTeam);
    this.carLights = document.querySelector('.car-lights').cloneNode(true);
    this.carLights.classList.add('opponent');
    this.carLights.classList.remove('player');
    this.carLights.id = `opponent-${opponentIndex}`;
    this.engineSound = new Sound(
      {url: '../assets/sound/porsche-onboard-acc-full.ogg', 
      loop: true, fadein: true,
      gain: 0.1
    });
    this.displayName = displayName;
    this.height = 120;
    this.width = 230;
    this.radius = this.height;
    this.fps = 60;
    this.frameInterval = 1000/this.fps;
    this.frameTimer = 0;

    this.isAttacking = false;

    this.position = {
      // FIXME: currently spawning on a player path,
      // add spawn points for ai drivers to level files
      x: this.game.player.paths[1].points[0].x,
      y: this.game.player.paths[1].points[0].y,
      // x: Math.floor(Math.random() * this.game.worldMap.offsetWidth) || 16360, 
      // y: Math.floor(Math.random() * this.game.worldMap.offsetHeight) ||16360
    }
    
    this.velocity = 10;
    this.maxVelocity = 50;
    this.facingAngle = 0; 
    this.forceForward = 5;
    this.forceBackward = 0;
    this.isBraking = false;
    this.currentPath = 0;
    this.waypointsCompleted = false;

    this.paths = [...this.game.player.paths];
    setTimeout(() => {
      this.init()
    }, 1000)
  }

  
  attack () {
    
    /* AI:
     * find player and move toward it 
     */
    
    let player = this.game.player;
    let cx = parseInt(this.position.x);
    let cy = parseInt(this.position.y);
    let dx = parseInt(player.position.x - cx);
    let dy = parseInt(player.position.y - cy);
  
    this.position.x += ( dx * .05 );
    this.position.y += ( dy * .05 );

    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;
    this.facingAngle = angleDegs;

    this.game.opponents.forEach( (AIopponent, i) => {

      if(i === this.opponentIndex) return false;
      
      let [AIcollision, distance, sumOfRadii, dx, dy] = this.game.checkCollision(this, AIopponent);
      
      if (AIcollision) {
        
        // these values will always be 0-1 as the distance = hypotenuse
        // ie a fraction of the total length. May be netgative, so a 
        // value between -1 and and +1
        const unitX = dx / distance;
        const unitY = dy / distance;
        console.warn('bots')
        
        this.position.x = AIopponent.position.x + (sumOfRadii + 1) * unitX;
        this.position.y = AIopponent.position.y + (sumOfRadii + 1) * unitY;
      }
    });
    
  }

  init () {
    try {
    console.log(`🤖 init AI ${this.opponentIndex + 1}`, this);
    
    // finding paths in world, resetting
    this.paths.map ( path => {
      path.completed = false;
    });

    
    // choose first path, find set of waypoints
    
    this.currentPath = Math.floor(Math.random() * this.paths.length);
    console.log(this.paths[this.currentPath])
    this.findNextWayPoint(this.currentPath);
    
    this.game.playerLayer.appendChild(this.carBody);
    this.game.worldMap.querySelector('.layer.lights').appendChild(this.carLights);
    
    const carImage = this.carBody.querySelector('img');
    if (carImage) {
      this.height = carImage.offsetHeight;
      this.width = carImage.offsetWidth;
    }
    this.radius = this.width;

    setTimeout(() => {
      this.position.x = this.paths[this.currentPath].points[0]?.x ? this.paths[this.currentPath].points[0].x : this.game.worldMap.offsetWidth / 2;
      this.position.y = this.paths[this.currentPath].points[0]?.y ? this.paths[this.currentPath].points[0].y : this.game.worldMap.offsetHeight / 2;
    }, 500)
  } catch (e) {
    console.error(e, this)
  }
    console.log('Opponent init:', this)
  }

  update (deltaTime) {


    if(this.frameTimer > this.frameInterval) {

      this.frameTimer = 0;
    } else {
      this.frameTimer += deltaTime;
      
    }

    if(this.isAttacking) {
      this.attack()
    }

    this.draw();

  }
  

  draw () {
    
    this.game.updateEngineSound(this.velocity, this.engineSound);
    this.isBraking ? this.carBody.classList.add('braking') : this.carBody.classList.remove('braking');
    this.carBody.dataset['velocity'] = `AI ${this.opponentIndex + 1} - ${this.velocity.toFixed(2)}`;

    // update sprite position + rotation
    // Use numeric CSS custom properties (no unit suffix) so
    // CSS calc() can apply the unit consistently (eg. "* 1deg").
    this.carBody.style.setProperty('--x', String(Math.floor(this.position.x)));
    this.carBody.style.setProperty('--y', String(Math.floor(this.position.y)));
    this.carBody.style.setProperty('--angle', String(this.facingAngle.toFixed(2)));

    // Set lights variables individually to avoid clobbering other styles
    this.carLights.style.setProperty('--x', String(Math.floor(this.position.x)));
    this.carLights.style.setProperty('--y', String(Math.floor(this.position.y)));
    this.carLights.style.setProperty('--angle', String(this.facingAngle.toFixed(2)));
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

    console.info(this)
  }
}