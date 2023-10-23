// @ts-check
import Emitter from './Emitter.js';
import Sound from './Sound.js'
import WayPointer from './WayPointer.js';
import HeadsupDisplay from './Hud.js';
import LapTimer from './LapTimer.js';
export default class Player {
  
  constructor(game, options = { displayname: 'Will Power', carnumber: 0, team: 'porsche'}) {

    this.game = game;
    this.displayname = options.displayname;
    this.carnumber = options.carnumber;
    this.team = options.team;
    this.carBody = document.querySelector('.car-body.player').cloneNode(true);
    this.carLights = document.querySelector('.car-lights');
    this.carBody.querySelector('img.livery').src = `assets/car/${this.team}.png`;
    this.engineSound = new Sound({url: 'assets/sound/porsche-onboard-acc-full.ogg', loop: true, fadein: true});
    this.width = this.carBody.querySelector('img.livery').width * .8;
    this.height = this.carBody.querySelector('img.livery').height * .8;
    this.carBody.style.scale = 0.8;
    this.radius = this.height;

    this.position = {x:1000, y:1000}
    this.cameraPosition = {x:1000, y:1000}

    // sprite fx
    this.tireTrackPool = [];
    this.maxTireTracks = 200;
    this.createTireTracks();

    this.smokePool = [];
    this.maxSmoke = 20;
    this.createSmoke();
    
    this.exhaustPopPool = [];
    this.maxExhaustPops = 2;
    this.createExhaustPops();

    // world orientation
    this.currentPath = 0;
    this.allPathsCompleted = false;
    this.paths = [
      {name:'garagebox', speedLimit: 10,completed: false, points: []},
      {name:'pitbox', speedLimit: 30, completed: false, points: []},
      {name:'pitlane', speedLimit: 30, completed: false, points: []},
      {name:'racetrack',  speedLimit: 250 ,completed: false, points: []}
    ];
    this.colliders = [];

    this.speedLimit = 250;

    // Car Physics
    // move to config system (/ api?)
    this.velocity = 0
    this.displayVelocity= 0
    this.forceForward = 0
    this.forceBackward = 0
    this.facingAngle = 0 // move to this.position?
    
    this.baseForce = .50
    this.baseTurningSpeed = 1.5
    this.baseRoadAttrition = 0.992
    this.baseDirtAttrition = 0.972

    this.maxSpeedFront = 201
    this.maxSpeedBack = -10
    this.maxTurnSpeed = 3

    this.isOnRoad = true
    this.isReversing = false
    this.isBraking = false
    
    this.hud = new HeadsupDisplay(this.game);
    this.waypointer = undefined;

    // emitter
    // (Explosion is a general purpose Emitter instance in the main game object)
    this.pop = this.game.getExplosion();
    this.colliding = false;

    this.lapTimer = new LapTimer(this);
    this.currentSector = 0;
    this.updateTime = 0;

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

  createSmoke () {
    for(let i=0; i<this.maxSmoke; i++) {
      this.smokePool.push(new Emitter(this.game, window.smokeSprite, 200, 200, 6));
    }
  }

  getSmoke () {
    for(let i=0; i< this.smokePool.length; i++) {
      if (this.smokePool[i].free) {
        return this.smokePool[i];
      }
    }
  }

  createExhaustPops () {
    for(let i=0; i<this.maxExhaustPops; i++) {
      this.exhaustPopPool.push(new Emitter(this.game, window.exhaustPopSprite, 64, 64, 10, true));
    }
    
  }

  getExhaustPop () {
    for(let i=0; i< this.exhaustPopPool.length; i++) {
      if (this.exhaustPopPool[i].free) {
        return this.exhaustPopPool[i];
      }
    }
  }

  init () {

    if(!this.game.scene || this.game.scene == '') {
      console.warn('😬 no game scene selected!')
      return false;
    }

    this.carBody.querySelector('.driver-id').textContent = this.carnumber || 0;

    let driverCard = document.createElement('li');
    driverCard.textContent = this.displayname;
    driverCard.classList.add(this.team);
    driverCard.dataset['carnumber'] = this.carnumber.toString();
    driverCard.dataset['shortname'] = this.displayname.slice(0, 3);

    this.hud.element.querySelector('.competitors').appendChild(driverCard)

    window.waypointsOverlay.innerHTML = '';
    this.allPathsCompleted = false;

    // finding waypoints for all types of paths
    this.paths.map ( path => {
      path.completed = false;
      this.findPathWaypoints( path.name )
    });
    this.game.progressBar.style.setProperty('--progress', 75)
    
    // choose first path, find set of waypoints
    this.currentPath = 0;
    this.spawnOnFirstAvailablePath();
    this.renderWaypointsForCurrentPath();
    this.findObstacles();

    this.carBody.classList.add(this.team);
    this.game.playerLayer.appendChild(this.carBody);

    
    this.width = this.carBody.querySelector('img.livery').width * .8;
    this.height = this.carBody.querySelector('img.livery').height * .8;
    
    //pointer must be init'd after paths & currentWaypoint have been set.
    this.waypointer = new WayPointer(this.game);
    this.waypointer.init();
    
    this.game.loading = false;
    this.initialized = true;
    
    console.log('🧑‍🦼 player loaded')
    console.log('🎥 set gamecamera')
    setTimeout(()=> {
      this.game.progressBar.style.setProperty('--progress', 100)
      this.game.progressBar.classList.add('loaded');
      document.body.dataset.state = 'gamecamera';
    }, 500)

  }

  // finds immovable objects the player can collide with

  // TODO: add objects the player can kick around 
  // (ie, separate svg elements with their own collision *handling* routine)
  findObstacles () {
    console.info('💢 finding obstacles...')
    let svg = iframe.contentDocument.documentElement;
    
    let colliders = [];
    let obstacles = svg.querySelectorAll('#obstacles > *');

    if (!obstacles) { 
      console.warn('no obstacels')
      return;
    }
    
    obstacles.forEach (path => {
      switch(path.nodeName) {
        
        case 'ellipse':
        case 'circle':
        case 'rect':
          // dear reader. Remember that getting DOM attribute values will leave you with STRING values
          // and not NUMBERs like, say, performing getPointAtLength() will return.
          // Let's hope writing this comment out wil help me remember next time
          // and save me from debugging ridiculous values for 30 mins straight.
          let collidible = {
            x: parseInt(path.getAttribute('cx') || path.getAttribute('x')),
            // maybe grow tf up and measure radius by taking element's width & height in to account
            // instead of inserting magic numbers here
            radius: 32
          }
          colliders.push(collidible);
          break;

        case 'path':
          let length = path.getTotalLength();

          // lets draw a world in inkscape with lots of obstacle paths 
          // and see if we run into any limits at some point, obstacle total count-wise
          // ie, how dense can we populate the obstacles at this point and how far do we
          // space each obstacle sphere apart. 

          // For now, each apth is evaluated and at every half car width we place an obstacle with radius 32
          // Also: maybe it's worthwhile to simply check pointIsInStroke() instead of placing invisible 
          // obstacles every 50 or so pixels
          for (var i=0; i<length; i+= this.radius / 2) {
            let collidible = {
              x: path.getPointAtLength(i).x,
              y: path.getPointAtLength(i).y,
              radius: 32 // perhaps use path's stroke-width?
            }
            colliders.push(collidible);
          }
          break;
      }
    })

    this.colliders = colliders;
  }

  checkObstacles() {
    this.colliders.forEach (collider => {
      let botsing = this.game.checkCollision(this,collider);
      if(botsing[0]) {
        this.handleStaticCollision(botsing, collider);
      }
    })
  }

  handleStaticCollision(botsing, collider) {
    let [collision, distance, sumOfRadii, dx, dy] = botsing;

      const unitX = dx / distance;
      const unitY = dy / distance;

      this.position.x = collider.x + (sumOfRadii + 2 ) * unitX;
      this.position.y = collider.y + (sumOfRadii + 2 ) * unitY;
      
  }

  findPathWaypoints (pathType) {
    console.log(`📍 finding ${pathType} waypoints`)
    // Default waypoint distance: ~5 car lengths
    let stepSize = 250 * 5;

    switch(pathType) {
      case 'garagebox':
        stepSize = 500;
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


    const path = iframe.contentDocument.documentElement.querySelector(`#${pathType}`);

    let pathWaypoints = [];

    if (!path) { console.warn(pathType, "not found"); return false;}

    if (path.nodeName == 'circle' || path.nodeName == 'ellipse') {
      pathWaypoints.push({x: +path.getAttribute('cx'), y: +path.getAttribute('cy'), radius: 32})
    } else if (path.nodeName == 'rect') {
     
      pathWaypoints.push({x: +path.getAttribute('x'), y: +path.getAttribute('y'), radius: 32})
    } else {
    
      const points = Math.floor(path.getTotalLength());

      for(let i=0; i<Math.floor(points / stepSize); i++) {

        let pathWaypoint = {
          x: path.getPointAtLength(i * stepSize).x,
          y: path.getPointAtLength(i * stepSize).y,
          radius: pathType == 'racetrack' ? 320 : 128
        }
        pathWaypoints.push(pathWaypoint);
      }
    }


    // place the found waypoints into the points array of the currentPath
    let currentPath = this.paths.filter( path => path.name === pathType)[0];
    currentPath.points = pathWaypoints;

  }

  renderWaypointsForCurrentPath() {
    if(window.waypointsOverlay.childElementCount == 0) {
      console.info('🗺️ render path waypoints')
      waypointsOverlay.innerHTML = '';
      let pathWaypoints = this.paths[this.currentPath].points;
      
      
      const b = document.createElement('b');
      pathWaypoints.map( (waypoint, index) => {
        waypoint.completed = false;
        let el = b.cloneNode();
        el.innerHTML = '&times;';
        el.className = `waypoint ${this.paths[this.currentPath].name}`;
        
        el.style.translate = `calc(${Math.round(waypoint.x )}px - 50%) calc(${Math.round(waypoint.y )}px - 50%) 0`;
        el.style.setProperty('--size', waypoint.radius); //css uses --size variable to set width & height on waypoints
        
        // jaa lache
        if(!pathWaypoints[index].completed) {
          waypointsOverlay.appendChild(el);
          pathWaypoints[index].element = el;
        }
      });
    } else {
      console.log('path already drawn')
    }
  }

  spawnOnFirstAvailablePath() {

    // see if current path has not yet been completed and if it has any waypoints
    if(!this.paths[this.currentPath].completed && this.paths[this.currentPath].points.length) {
      
      this.position = {
        x: this.paths[this.currentPath].points[0].x, 
        y: this.paths[this.currentPath].points[0].y
      }

      this.cameraPosition = {...this.position};
      
      // point car to next waypoint, either in the current path or if unavilable, the first waypoint of the next path
      let initialRotation = 0;
      if( this.paths[this.currentPath].points[1]) {
        initialRotation = this.game.getAngle(this.paths[this.currentPath].points[0], this.paths[this.currentPath].points[1])
      } else {
        initialRotation = this.game.getAngle(this.paths[this.currentPath].points[0], this.paths[this.currentPath + 1].points[0])
      }
      this.facingAngle = initialRotation;
    } else {
      
      // if no waypoint was found on this path, try the next path
      this.currentPath++;
      this.spawnOnFirstAvailablePath();
    }

  }

  // FIXME: bad function name
  checkCurrentPathWaypoint () {
    
    if(this.currentPath == undefined) {
      console.warn('no path', this.currentPath)
      return;
    }

    if(this.paths[this.currentPath].completed) {
      return;
    }

    // check paths
    let wphits = 0;

    this.paths[this.currentPath].points.forEach( (item, index, points) => {

      if(item.element?.classList.contains('hit')) {
        wphits++;
      }

      let bang = this.game.checkCollision(item, this);
      if ( bang[0]) {
        if(!item.completed) {
          item.completed = true;
        }

        if(this.currentPath == 3) {
          if(index % Math.ceil(points.length/3) === 0) {
            this.lapTimer.setSectorTime();
            if(index == 0) {
              this.lapTimer.startLap();
            } 
          }
        }
      }

      // making sure a player completes waypoints in order
      if (bang[0] && index == wphits) {
        item.element?.classList.add('colliding')

        item.element?.classList.add('hit');

        if (this.pop && this.pop.free ) { 
          this.pop.start(this.position.x, this.position.y, this.facingAngle );
        }

        this.colliding = true;
      } else {
        item.element?.classList.remove('colliding')
        this.colliding = false;
      }

    });

    this.currentWaypoint = wphits;
    
    
    let radioUpdate = `Go to ${this.paths[this.currentPath].name} ${wphits}/${this.paths[this.currentPath].points.length}`;
    this.hud.postMessage('team', 'radio', radioUpdate);


    // all waypoints in current path are hit
    if(this.paths[this.currentPath].points.every(point => point.completed)) {

      this.paths[this.currentPath].completed = true;

      let cleanWaypoints = document.querySelectorAll(`b.${this.paths[this.currentPath].name}`)
      cleanWaypoints.forEach( point => point.remove());

      if(this.currentPath == this.paths.length - 1) {
        
        // FIXME: whenever currentPath is 'racetrack' always stay on that path
        this.currentPath = this.paths.length - 1;

      } else if(this.hud.sessionTime) {
        this.currentPath++;
        this.renderWaypointsForCurrentPath();
      }

    }
  }

  checkSurfaceType () {
    if(this.paths[this.currentPath].name == 'racetrack') {
      try {
        // FIXME: move querySelectors to constructor
        let iframe = document.querySelector('#iframe');
        const path = iframe.contentDocument.documentElement.querySelector('#racetrack');
        const point = iframe.contentDocument.documentElement.createSVGPoint();

        point.x = this.position.x;
        point.y = this.position.y;

        let onTrack = path?.isPointInStroke(point);
        this.isOnRoad = onTrack;
      } catch (e) {
        console.log(e)
      }
    }
  }

  draw (deltaTime) {
    
    // display velocity on car element
    if(this.game.debug) {
      this.displayVelocity = Math.abs(Math.round(this.velocity*3) )
      this.carBody.dataset.velocity = `${this.displayVelocity} (${Math.round(this.velocity)}) ${Math.round(this.maxSpeedFront)}`;
    }

    // calculate camera movement
    // make a line from the car, 1200 units long, at the car angle
    const cameraOffset = this.game.sidesFromHypotenhuse(1200, this.facingAngle);
    
    // target the camera to the end of the line (ie, 1200 units in front of the car)
    const cameraTargetX = this.position.x + (cameraOffset.width * (this.velocity / 200));
    const cameraTargetY = this.position.y + (cameraOffset.height * (this.velocity / 200));
    
    // ease camera movement a bit
    const cameraLerpSpeed = 0.3;
    this.cameraPosition.x = this.game.lerp (this.cameraPosition.x, cameraTargetX, cameraLerpSpeed);
    this.cameraPosition.y = this.game.lerp (this.cameraPosition.y, cameraTargetY, cameraLerpSpeed);

    // update transformations
    // --trans-origin is player position, and is inherited by all layers in css
    // --translate is camera position
    // --speed is used to zoom (scale) the map container element
    // FIXME! only apply from a minimum speed, 
    // also: maxSpeedFront is capped in the paddock/pit 
    // which makes for undesired zooming out

    let zoomfactor = (this.velocity / this.maxSpeedFront)
    if(isNaN(zoomfactor) || Math.abs(zoomfactor) === Infinity) zoomfactor  = 0.25;

    let zoom = `--zoom: ${zoomfactor.toFixed(3)}`;
    let transorigin = `--trans-origin: ${Math.floor(this.position.x)}px ${Math.floor(this.position.y)}px`;
    let translate = `--translate: ${((this.cameraPosition.x - this.game.camera.offsetWidth / 2) * -1)}px ${((this.cameraPosition.y - this.game.camera.offsetHeight / 2) *-1 )}px`
    
    let style =`width: ${this.game.worldMap.width}; height: ${this.game.worldMap.height}; ${zoom}; ${translate}; ${transorigin}; `;
    this.game.worldMap.style = style;

    this.carBody.style = `--x: ${parseInt(this.position.x)}; --y: ${parseInt(this.position.y)}; --angle: ${this.facingAngle}deg;`
    this.carLights.style = `--x: ${parseInt(this.position.x)}; --y: ${parseInt(this.position.y)}; --angle: ${this.facingAngle}deg;`
    this.isBraking ? this.carBody.classList.add('braking') : this.carBody.classList.remove('braking');

    if (this.isBraking && this.velocity > this.maxSpeedFront * .15 ) {
          // use deltaTime to periodically drop / clear up old tire tracks?
          // current limit is 2000 (which will not suffice and eventually 
          // `tiretrack` will become undefined because this code will 
          // exceed tireTrackPool size.
          if(this.updateTime > 60) {
            let tiretrack = this.getTireTrack();
            if(tiretrack) {
              tiretrack.start(this.position.x, this.position.y, this.facingAngle );
              setTimeout(() => tiretrack.fadeOut(), 2000)
            }
          }
        }

    let smoke = this.getSmoke();
      if(smoke && !this.isOnRoad && this.currentPath == 3 || smoke && this.isBraking && this.velocity > 45) {
        if(this.updateTime > 90) {
          smoke.start(this.position.x, this.position.y, this.facingAngle );
          console.log('smoke', smoke)
        }
      }
    
    if (this.isBraking) {
      let pop = this.getExhaustPop();
      let offset = this.game.sidesFromHypotenhuse(this.width / 2, this.facingAngle)
      
      pop?.start(this.position.x - offset.width , this.position.y - offset.height , this.facingAngle);
      console.log('braking', pop);
    }
    try {
      this.game.updateEngineSound(this.velocity, this.engineSound);
    } catch (e) { 
      // console.error(e)
      // shhh
    }

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

  sendLocation (deltaTime) {
    if(this.updateTime > 100 && this.game.socket.readyState <= 3) {
      this.game.socket.send(JSON.stringify({
        'type': 'player-update', 
        'body': [this.position.x, this.position.y, this.facingAngle, this.velocity, this.isBraking]
        }
      ));
      this.updateTime = 0;
    } else {
      this.updateTime += deltaTime;
    }
  }

  update (input, deltaTime) {
    if (!this.initialized || !input) return;
    let {keys, gamepad} = input;
    // stopping the car from moving infinitely small distances
    if(Math.abs(this.velocity) < 0.05) {
      this.forceBackward = 0;
      this.forceForward = 0;
    }

    // handle gamepad input 
    if (gamepad) {

      const {axes, buttons} = gamepad;

      // right trigger (accelerator)
      let rate = 0;
      if (axes[5]) {
        rate = ((1 + axes[5]) / 2);
      } else if (buttons[7].touched) {
        rate = buttons[7].value;
      }

      if (rate && this.velocity < this.maxSpeedFront && this.velocity < this.paths[this.currentPath].speedLimit){
        this.forceForward += this.baseForce * rate;
        this.isReversing = false;
      }


      // left trigger (braking)
      if (buttons[6].touched && buttons[6].value > 0.001) {

        if(this.velocity > 0) {
          this.isBraking = true;
          this.isReversing = false;
        } else {
          this.isBraking = false;
          this.isReversing = true;
        }

        if(this.isBraking && this.velocity > this.maxSpeedBack){
          this.forceBackward += this.baseForce;
        }

      } else if(((1 + axes[2]) / 2) > 0.4) { 
        if(this.velocity > 0) {
          this.isBraking = true;
          this.isReversing = false;
        } else {
          this.isBraking = false;
        }
      } else {
        this.isBraking = false;
      }


      // left stick (steering)
      if (Math.abs(axes[0]) > 0.05) {
        if(this.velocity != 0){
          this.facingAngle += this.baseTurningSpeed * axes[0]
        }
      }

    } else {
      // this.game.input.gamepad = navigator.getGamepads()[0];
    }

    // handle button input
    if(keys) {
      
      let mod = this.isReversing ? -1 : 1; 
      
      if(keys.includes("Escape")){
        this.game.toggleMenu();
      }

      // player keys handling
      if(keys.includes("ArrowRight")){
        if(this.velocity != 0){
            this.facingAngle += this.baseTurningSpeed * mod
          }
      }
          
      if(keys.includes("ArrowLeft")){
          if(this.velocity != 0){
              this.facingAngle -= this.baseTurningSpeed * mod
          }
      }

      if(keys.includes("ArrowUp") || keys.includes('a') ) {
        if(this.velocity < this.maxSpeedFront && this.velocity < this.paths[this.currentPath].speedLimit){
            this.forceForward += this.baseForce;
            this.isReversing = false;
        }
        
        if (!this.engineSound.sourceBuffer.playbackRate) {
          this.engineSound.sourceBuffer.start(this.engineSound.audioCtx.currentTime)
        }
      }

      if(keys.includes("ArrowDown") || keys.includes("z") ){
        
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
        
        if (this.isBraking && this.velocity > this.maxSpeedFront * .15 ) {
          // use deltaTime to periodically drop / clear up old tire tracks?
          // current limit is 2000 (which will not suffice and eventually 
          // `tiretrack` will become undefined because this code will 
          // exceed tireTrackPool size.
          if(this.updateTime > 60) {
            let tiretrack = this.getTireTrack();
            if(tiretrack) {
              tiretrack.start(this.position.x, this.position.y, this.facingAngle );
              setTimeout(() => tiretrack.fadeOut(), 2000)
            }
          }
        }

      } else {
        this.isBraking = false;
      }

      // player honking
      if(keys.includes("Shift") || keys.includes("CapsLock") ){
        this.honk();
      }

      if(keys.includes("d") || keys.includes("`")) {
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

    this.velocity = this.forceForward - this.forceBackward;
    this.position.x += this.velocity * Math.cos(this.facingAngle * Math.PI / 180) * .65;
    this.position.y += this.velocity * Math.sin(this.facingAngle * Math.PI / 180) * .65;

    // check for collisions with opponents
    this.game.opponents.forEach( opponent => {
      let [collision, distance, sumOfRadii, dx, dy] = this.game.checkCollision(this, opponent);
      
      if (collision) {
        if(this.pop) {
          this.pop.frameX = 8;
          this.pop.start(this.position.x, this.position.y, this.facingAngle );
        }
        // these values will always be 0-1 as the distance = hypotenuse
        // ie a fraction of the total length. May be negative, so a 
        // value between -1 and and +1
        const unitX = dx / distance;
        const unitY = dy / distance;
        this.position.x = opponent.position.x + (sumOfRadii + 2 ) * unitX;
        this.position.y = opponent.position.y + (sumOfRadii + 2 ) * unitY;
      }
    })



    if (!this.allPathsCompleted) { 
      
      if(this.paths[this.paths.length - 1].completed) {
        
        this.allPathsCompleted = true;

        if(this.allPathsCompleted) {
          this.hud.postMessage('team', 'radio', 'Have fun :)', true);
          console.log("ALL PATHS DONE");
          // needs to happen outside the update loop
          
          this.waypointer.element.classList.add('all-complete');
          this.honk()
        }
      } else {
        this.waypointer.element.classList.remove('all-complete');
      }
    }

    let sessionTime = this.hud.update(deltaTime);

    if (!sessionTime) {
      
      if(this.currentPath == 0 && this.currentWaypoint == 0 && this.paths[this.currentPath].points[this.currentWaypoint].completed) {
        console.warn(this.paths[this.currentPath].points[this.currentWaypoint]);
        
        this.maxSpeedFront = 0;
        this.maxTurnSpeed = 0;
        this.allPathsCompleted = true;
        
        if(this.velocity < 5) {
          document.body.className = 'session-menu';
          this.engineSound.stopSound();
          this.game.input = undefined;
        }
      } else {
        this.currentPath = 0;
        this.currentWaypoint = 0;
        this.paths[this.currentPath].completed = false;
        this.paths[this.currentPath].points[this.currentWaypoint].completed = false;
        this.renderWaypointsForCurrentPath()
        this.checkCurrentPathWaypoint();
      }
    }
    
    if(sessionTime) {
      this.checkCurrentPathWaypoint();
    }

    if( !this.isOnRoad && sessionTime) {
      console.log('🏳️ yellow flag')
      this.hud.postMessage('session','status','🏳️ yellow flag', true);
    } else {
      this.hud.postMessage('session','status','free practice');
    }
    
    try {
      
      this.waypointer.update();
      
    } catch(e) {
      // console.warn(e)
    }

    if(this.forceForward || this.forceBackward) {      
      this.checkSurfaceType();
      this.checkObstacles();
      if(this.game.socket) {
        // this.sendLocation(deltaTime);
      }
    }

    this.smokePool.forEach(smoke => {
      smoke.update(deltaTime);
    });
    this.exhaustPopPool.forEach(pop => {
      pop.update(deltaTime);
    });


    this.draw(deltaTime)

  }

}