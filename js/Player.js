import Emitter from './Emitter.js';
import Sound from './Sound.js'
import WayPointer from './WayPointer.js';
import HeadsupDisplay from './Hud.js';
export default class Player {
  
  constructor(game, options = { name: '', drivernumber: 0}) {

    this.game = game;
    this.drivername = options.name;
    this.drivernumber = options.drivernumber;
    this.carBody = document.querySelector('.car-body.player').cloneNode(true);
    this.engineSound = new Sound({url: 'assets/sound/porsche-onboard-acc-full.ogg', loop: true, fadein: true});
    this.width = 230;
    this.height = 150;
    this.radius = this.width;

    this.position = {}
    this.cameraPosition = {}

    this.tireTrackPool = [];
    this.maxTireTracks = 200;
    this.createTireTracks();

    this.currentPath = 0;
    this.waypointsCompleted = false;
    this.paths = [
      {name:'garagebox', speedLimit: 10,completed: false, points: []},
      {name:'pitbox', speedLimit: 10, completed: false, points: []},
      {name:'pitlane', speedLimit: 30, completed: false, points: []},
      {name:'racetrack',  speedLimit: 999 ,completed: false, points: []}
    ];

    this.speedLimit = 999;

    // Car Physics
    // move to config system (/ api?)
    this.velocity = 0
    this.displayVelocity= 0
    this.forceForward = 2
    this.forceBackward = 0
    this.facingAngle = 0 // move to this.position?
    
    this.baseForce = .50
    this.baseTurningSpeed = 1.5
    this.baseRoadAttrition = 0.99
    this.baseDirtAttrition = 0.8

    this.maxSpeedFront = 200
    this.maxSpeedBack = -3
    this.maxTurnSpeed = 3

    this.isOnRoad = true
    this.isReversing = false
    this.isBraking = false
    
    this.hud = new HeadsupDisplay(this.game);
    this.waypointer = new WayPointer(this.game);

    // emitter
    // (Explosion is a general purpose Emitter instance in the main game object)
    this.pop = this.game.getExplosion();
    this.colliding = false;


    this.init()
  }

  createTireTracks () {
  
    for(let i=0; i<this.maxTireTracks; i++) {
      this.tireTrackPool.push(new Emitter(this.game, window.rubberTrackSprite, 128, 93, 1));
    }
  }

  getTireTrack () {
    for(let i=0; i< this.tireTrackPool.length; i++) {
      if (this.tireTrackPool[i].free) {
        return this.tireTrackPool[i];
      }
    }
  }

  init () {

    if(!this.game.scene || this.game.scene == '') {
      console.log('no game scene selected!')
      return false;
    }

    this.carBody.querySelector('.driver-id').textContent = this.drivernumber || 0;

    let driverCard = document.createElement('li');
    driverCard.textContent = this.drivername;
    driverCard.dataset['driverNumber'] = this.drivernumber;
    driverCard.dataset['shortname'] = this.drivername.slice(0, 3);

    this.hud.element.querySelector('.competitors').appendChild(driverCard)

    waypointsOverlay.innerHTML = '';
    this.allPathsCompleted = false;

    // finding waypoints for all types of paths
    this.paths.map ( path => {
      path.completed = false;
      this.findPathWaypoints( path.name )
    });

    // choose first path, find set of waypoints
    
    this.currentPath = 0;
    this.findNextWayPoint(this.currentPath);

    this.game.playerLayer.appendChild(this.carBody);

    //pointer must be init'd after paths & currentWaypoint have been set.
    this.waypointer.init()

    /* Mobile input (experimental LMAO)
    window.addEventListener("devicemotion", (event) => {
      window.debug.textContent = event.rotationRate.alpha.toFixed(2) || '0.00';
      
      // if(this.velocity != 0){
        if(this.velocity < this.maxSpeedFront){
          this.forceForward += this.baseForce / 20;
        }
        this.facingAngle += (event.rotationRate.alpha.toFixed(2) * .05) * this.baseTurningSpeed;
        
      // }
    });
    */

  }

  findPathWaypoints (pathType) {

    // Default waypoint distance: 5 car lengths
    let stepSize = this.width * 5;

    switch(pathType) {
      case 'garagebox':
        stepSize = 1000;
        break;
      case 'pitbox':
        stepSize = 100;
        break;
      case 'pitlane':
        break;
      case 'racetrack':
        stepSize = 3000;
        break;
    }

    let pathWaypoints = [];
    
    const path = iframe.contentDocument.documentElement.querySelector(`#${pathType}`);
    
    if (!path) { console.warn(pathType, "not found"); return false;}

    if (path.nodeName == 'circle' || path.nodeName == 'ellipse') {
      
      pathWaypoints.push({x: +path.getAttribute('cx'), y: +path.getAttribute('cy'), radius: 32})
      
    } else if (path.nodeName == 'rect') {
      
      pathWaypoints.push({x: +path.getAttribute('x'), y: +path.getAttribute('y'), radius: 32})

    } else {
    
      const points = Math.floor(path.getTotalLength());

      for(let i=0; i<Math.floor(points / stepSize); i++) {

        // Collision detection calculates circles. 
        // 
        // Instead of supplying a `radius` to collidable entities
        // I'm using the `height` property which -probably-
        // will exist on most game entities.

        let pathWaypoint = {
          x: path.getPointAtLength(i * stepSize).x,
          y: path.getPointAtLength(i * stepSize).y,
          radius: pathType == 'racetrack' ? 256 : 64
        }
        pathWaypoints.push(pathWaypoint);
      }
    }

    // render pathWaypoints to screen
    const b = document.createElement('b');
    pathWaypoints.map( (waypoint, index) => {
      
      let el = b.cloneNode();
      el.innerHTML = '&times;';
      el.className = `waypoint ${pathType}`;
      
      el.style.translate = `calc(${Math.round(waypoint.x )}px - 50%) calc(${Math.round(waypoint.y )}px - 50%) 0`;
      el.style.setProperty('--size', waypoint.radius); //css uses --size variable to set width & height on waypoints
      
      // jaa lache
      waypointsOverlay.appendChild(el);
      pathWaypoints[index].element = el;
    });

    let currentPath = this.paths.filter( waypoint => waypoint.name === pathType)[0];
    
    currentPath.points = pathWaypoints;

  }

  findNextWayPoint() {

    if(!this.paths[this.currentPath].completed && this.paths[this.currentPath].points.length) {
      
      this.position = {
        x: this.paths[this.currentPath].points[0].x, 
        y: this.paths[this.currentPath].points[0].y
      }

      this.cameraPosition = {...this.position};

    } else {
      this.currentPath++;
    }

  }

  // FIXME: bad function name
  checkCurrentPathWaypoint () {
    
    if(this.currentPath == undefined) {
      console.warn('no path', this.currentPath)
      return;
    }

    // check paths
    let wphits = 0;
    this.paths[this.currentPath].points.forEach( (element, index) => {

      if(element.element.classList.contains('hit')) {
        wphits++;
      }

      let bang = this.game.checkCollision(element, this);

      // making sure a player completes waypoints in order
      if (bang[0] && index == wphits) {
        element.element.classList.add('colliding')

        if(!element.element.classList.contains('hit')) {
          element.element.classList.add('hit')
          if (this.pop && this.pop.free && !this.colliding) { 
            this.pop.start(this.position.x, this.position.y, this.facingAngle );
          }
        }
        this.colliding = true;
      } else {
        element.element.classList.remove('colliding')
        this.colliding = false;
      }

    });

    this.currentWaypoint = wphits;

    // this.hud.postMessage('team', 'radio', `Go to ${this.paths[this.currentPath].name} (${wphits} / ${this.paths[this.currentPath].points.length})`)

    // all waypoints in current path are hit
    if(wphits === this.paths[this.currentPath].points.length) {

      this.paths[this.currentPath].completed = true;

      if(this.currentPath == this.paths.length - 1) {
        // ??
        this.currentPath = this.paths.length - 1;

      } else {
        this.currentPath++;
      }
    }
  }

  draw () {

    this.velocity = (this.forceForward - this.forceBackward).toFixed(3)
    this.position.x += this.velocity * Math.cos(this.facingAngle * Math.PI / 180);
    this.position.y += this.velocity * Math.sin(this.facingAngle * Math.PI / 180);
    
    this.displayVelocity = Math.abs(Math.round(this.velocity*3) )
    
    window.map.style.setProperty('--trans-origin', `${Math.floor(this.position.x)}px ${Math.floor(this.position.y)}px`);
    
    // FIXME! only apply from a minimum speed, 
    // also: maxSpeedFront is capped in the paddock/pit 
    // which makes for undesired zooming out
    window.map.style.setProperty('--speed', (this.velocity / this.maxSpeedFront).toFixed(3));

    // in this case the container element #camera simply scrolls.
    // as in literal browser scrollbars.
    //
    // IDEA: experiment swapping this out and moving the .map child element
    // using translate3d()
    
    const cameraLerpSpeed = 0.3;
    const cameraTargetX = this.position.x;
    const cameraTargetY = this.position.y;
    
    this.cameraPosition.x = this.game.lerp (this.cameraPosition.x, cameraTargetX, cameraLerpSpeed);
    this.cameraPosition.y = this.game.lerp (this.cameraPosition.y, cameraTargetY, cameraLerpSpeed);

    // this.game.camera.scrollTo(
    //   parseInt((this.cameraPosition.x) - window.innerWidth / 2), 
    //   parseInt((this.cameraPosition.y) - window.innerHeight / 2)
    // )
    
      this.game.worldMap.style.translate = `${(parseInt((this.cameraPosition.x) - window.innerWidth / 2) * -1)}px ${(parseInt((this.cameraPosition.y) - window.innerHeight / 2) *-1 )}px`

    this.carBody.style.setProperty('--x', parseInt(this.position.x));
    this.carBody.style.setProperty('--y', parseInt(this.position.y));
    this.carBody.style.setProperty('--angle', `${this.facingAngle}deg`)
    
    this.isBraking ? this.carBody.classList.add('braking') : this.carBody.classList.remove('braking');

    this.game.updateEngineSound(this.velocity, this.engineSound);



    // TODO: move to NPC class
    /*
    let heli = window.helicopter;
    let cx = parseInt(heli.style.left);
    let cy = parseInt(heli.style.top);
    let dx = parseInt(this.position.x - cx) * .5;
    let dy = parseInt(this.position.y - cy) * .5;

    const distance = parseInt(Math.hypot(dx, dy));
    // const angleRads = Math.atan2(dy, dx);
    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;

    const chopperVolume = (100 - ( Math.abs(distance) / 100)) / 100 ;
    
    if( chopperVolume < 1 && chopperVolume > 0) {
      heli.querySelector('audio').chopperVolume = chopperVolume.toFixed(1);
    } else {
      // instead of play/pausing and potentially hear a little clipping everytime an audo
      // stream is started, just play at very low chopperVolume.
      heli.querySelector('audio').chopperVolume = 0.01;
    }
    
    heli.style.setProperty('--x', (cx + dx));
    heli.style.setProperty('--y', (cy + dy));
    heli.style.setProperty('--rot', angleDegs.toFixed(2));
    */
  }

  honk () {
    this.carBody.querySelector('audio.horn').play()
    this.carBody.classList.add('flashing');

    // alternatively, add an 'animationEnd' event listener
    // to .carBody > .lights.brakes 
    // but that should probably happen inside init()
    setTimeout( () => {
      this.carBody.classList.remove('flashing');
    }, 1000)
  }

  update (input, deltaTime) {

    // handle button input
    if(input) {
      
      let mod = this.isReversing ? -1 : 1; 
      
      if(input.includes("Escape")){
        this.game.toggleMenu();
      }

      // player input handling
      if(input.includes("ArrowRight")){
        if(this.velocity != 0){
            this.facingAngle += this.baseTurningSpeed * mod
          }
      }
          
      if(input.includes("ArrowLeft")){
          if(this.velocity != 0){
              this.facingAngle -= this.baseTurningSpeed * mod
          }
      }

      if(input.includes("ArrowUp") || input.includes('a')){
        if(this.velocity < this.maxSpeedFront && this.velocity < this.paths[this.currentPath].speedLimit){
            this.forceForward += this.baseForce;
            this.isReversing = false;
        }
        
        if (!this.engineSound.sourceBuffer.playbackRate) {
          this.engineSound.sourceBuffer.start(this.engineSound.audioCtx.currentTime)
        }
      }

      if(input.includes("ArrowDown") || input.includes("z") ){
        
        if(this.velocity > 0) {
          this.isBraking = true;
          this.isReversing = false;
        } else {
          this.isBraking = false;
          this.isReversing = true;
        }

        if(this.velocity > this.maxSpeedBack){
          this.forceBackward += this.baseForce;
        }
        
        if (this.isBraking && this.velocity > this.maxSpeedFront * .75 ) {
          // use deltaTime to periodically drop / clear up old tire tracks?
          // current limit is 2000 (which will not suffice and eventually 
          // `tiretrack` will become undefined because this code will 
          // exceed tireTrackPool size.
          let tiretrack = this.getTireTrack();
          tiretrack.start(this.position.x, this.position.y, this.facingAngle );
        }

      } else {
        this.isBraking = false;
      }

      // player honking
      if(input.includes("Shift") || input.includes("CapsLock") ){
        this.honk();
      }

      if(input.includes("d") || input.includes("`")) {
        this.game.debug = !this.game.debug;
      }
    }
    
    // update engine forces
    if(this.velocity != 0){
      if(this.isOnRoad){
          this.forceForward *= this.baseRoadAttrition
          this.forceBackward *= this.baseRoadAttrition
      }
      else{
        this.forceForward *= this.baseDirtAttrition
        this.forceBackward *= this.baseDirtAttrition
      }
    }

    // check for collisions with opponents
    this.game.opponents.forEach( opponent => {
      let [collision, distance, sumOfRadii, dx, dy] = this.game.checkCollision(this, opponent);
      
      // these values will always be 0-1 as the distance = hypotenuse
      // ie a fraction of the total length. May be netgative, so a 
      // value between -1 and and +1
      if (collision) {
        
        this.pop.frameX = 8;
        this.pop.start(this.position.x, this.position.y, this.facingAngle );
        const unitX = dx / distance;
        const unitY = dy / distance;
        this.position.x = opponent.position.x + (sumOfRadii + 15 ) * unitX;
        this.position.y = opponent.position.y + (sumOfRadii + 15 ) * unitY;
      }
    })

    // display velocity on car element
    this.carBody.dataset.velocity = this.displayVelocity;

    if (!this.allPathsCompleted) { 
      if(this.paths[this.paths.length - 1].completed) {
        this.allPathsCompleted = true;

        if(this.allPathsCompleted) {
          
          // needs to happen outside the update loop
          // this.hud.postMessage('team', 'radio', 'Have fun :)');
          window.waypointsOverlay.innerHTML = '';
          this.waypointer.element.style.opacity = 0;
          this.honk()
        }
      } else {
        this.waypointer.element.style.opacity = '';
        
      }

      if(this.currentPath !== undefined ) {
          this.checkCurrentPathWaypoint();
      }
    }

    try {
      this.waypointer.update();
    } catch(e) {
      // console.warn(e)
    }

    this.draw()

  }

}