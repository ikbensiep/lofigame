// @ts-check
import Emitter from './Emitter.js';
import Sound from './Sound.js'
import WayPointer from './WayPointer.js';
import HeadsupDisplay from './Hud.js';
import LapTimer from './LapTimer.js';
export default class Player {
  
  constructor(game, options = { displayname: 'Will Power', carnumber: 0, team: 'porsche'}) {
    console.log('init player', {...options});
    this.game = game;
    this.displayname = options.displayname;
    this.carnumber = options.carnumber;
    this.team = options.team;
    this.ambientSfxLevel = options['ambient-volume'];

    this.carBody = document.querySelector('.car-body.player').cloneNode(true);
    this.carLights = document.querySelector('.car-lights');
    this.carBody.querySelector('img.livery').src = `assets/car/${this.team}.png`;
    this.ruler = document.querySelector('.ruler');

    this.engineSound = new Sound({
      url: 'assets/sound/porsche-onboard-acc-full.ogg', 
      loop: true, 
      gain: Number(options['engine-volume']) || 0
    });
    
    this.width = this.carBody.querySelector('img.livery').width * .8;
    this.height = this.carBody.querySelector('img.livery').height * .8;
    this.carBody.style.scale = 0.8;
    this.radius = this.height;

    this.position = {x:1000, y:1000}
    this.cameraPosition = {x:1000, y:1000}

    // sprite fx
    this.tireTrackPool = [];
    this.maxTireTracks = 200;
    this.tireTrackInterval = 0;
    this.createTireTracks();

    this.smokePool = [];
    this.maxSmoke = 30;
    this.smokeInterval = 0;
    this.createSmoke();
    
    this.exhaustPopPool = [];
    this.maxExhaustPops = 3;
    this.exhaustPopInterval = 0;
    this.createExhaustPops();

    // world orientation
    this.paths = [
      {name:'garagebox', speedLimit: 10,completed: false, points: []},
      {name:'pitbox', speedLimit: 20, completed: false, points: []},
      {name:'pitlane', speedLimit: 30, completed: false, points: []},
      {name:'racetrack',  speedLimit: 80, completed: false, points: []}
    ];

    this.currentPath = 1;
    this.allPathsCompleted = false;

    this.colliders = [];

    // Car Physics
    // move to config system (/ api?)
    this.velocity = 0;
    this.displayVelocity= 0;
    this.forceForward = 0;
    this.forceBackward = 0;
    this.facingAngle = 0;
    
    this.baseForce = .50;
    this.baseTurningSpeed = 1.5;
    this.baseRoadAttrition = 0.992;
    this.baseDirtAttrition = 0.972;

    this.maxSpeedFront = 201;
    this.maxSpeedBack = -10;
    this.maxTurnSpeed = 3;

    this.isOnRoad = true;
    this.isReversing = false;
    this.isBraking = false;
    
    this.hud = new HeadsupDisplay(this.game);
    this.waypointer = undefined;

    // emitter
    // (Explosion is a general purpose Emitter instance in the main game object)
    this.pop = this.game.getExplosion();
    this.colliding = false;

    this.lapTimer = new LapTimer(this);
    this.updateTime = 0;

  }

  createTireTracks () {
    for(let i=0; i<this.maxTireTracks; i++) {
      this.tireTrackPool.push(new Emitter(this.game, window.rubberTrackSprite, 128, 85, 1));
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
    let targetLayer = this.game.playerLayer;
    for(let i=0; i<this.maxSmoke; i++) {
      this.smokePool.push(new Emitter(this.game, window.smokeSprite, 200, 200, 11, false, targetLayer));
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
      let sticky = i % 2;
      let size = 64 + Math.floor(Math.random() * 64);
      let pop = new Emitter(this.game, window.exhaustPopSprite, size, size, 10, sticky);
      this.exhaustPopPool.push(pop);
    }
    
  }

  getExhaustPop () {
    for(let i=0; i< this.exhaustPopPool.length; i++) {
      if (this.exhaustPopPool[i].free) {
        this.exhaustPopPool[i].rotation = Math.floor(Math.random() * 36) * 10;
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

    this.hud.addCompetitor(this.carnumber, this.displayname, this.team)

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
    
    //pointer must be init'd after paths & currentWaypoint have been set.
    this.waypointer = new WayPointer(this.game);
    this.waypointer.init();
    
    this.lapTimer.init();
    
    this.findObstacles();

    this.game.progressBar.style.setProperty('--progress', 85)
    
    this.surfaces = this.findSurfaces();
    
    this.carBody.classList.add(this.team);
    this.game.playerLayer.appendChild(this.carBody);
    
    this.width = this.carBody.querySelector('img.livery').width * .8;
    this.height = this.carBody.querySelector('img.livery').height * .8;
    
    this.game.progressBar.style.setProperty('--progress', 100)
    
    console.log('🧑‍🦼 player loaded');
    console.log('🎥 set gamecamera');
    setTimeout(()=> {
      this.game.progressBar.classList.add('loaded');
      document.body.dataset.state = 'gamecamera';
      this.initialized = true;
      this.game.loading = false;
    }, 500)

  }

  findSurfaces () {
    let iframe = document.querySelector('#iframe');
    const racetrack = iframe.contentDocument.documentElement.querySelector('#racetrack');
    const pitlane = iframe.contentDocument.documentElement.querySelector('#pitlane-surface');
    const paddock = iframe.contentDocument.documentElement.querySelector('#paddock-surface');
    return {racetrack, pitlane, paddock};
  }

  // finds immovable objects the player can collide with

  // TODO: add objects the player can kick around 
  // (ie, separate svg elements with their own collision *handling* routine)
  findObstacles () {
    console.info('🚸 finding obstacles...')
    let svg = iframe.contentDocument.documentElement;
    
    let colliders = [];
    let obstacles = svg.querySelectorAll('#obstacles > circle, #obstacles > ellipse, #obstacles > path, #obstacles > rect');

    if (!obstacles) { 
      console.warn('no obstacles')
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
      console.log(`🚸 obstacle path: ${colliders.length}`);
    })

    this.colliders = colliders;
  }

  checkObstacles(entity) {
    if (!entity) entity = this;
    this.colliders.forEach (collider => {
      let botsing = this.game.checkCollision(entity,collider);
      if(botsing[0]) {
        this.handleStaticCollision(botsing, collider, entity);
      }
    })
  }

  handleStaticCollision(botsing, collider, entity) {
    let [colliding, distance, sumOfRadii, dx, dy] = botsing;

      const unitX = dx / distance;
      const unitY = dy / distance;

      entity.position.x = collider.x + (sumOfRadii + 2 ) * unitX;
      entity.position.y = collider.y + (sumOfRadii + 2 ) * unitY;
      
  }

  findPathWaypoints (pathType) {
    console.log(`📍 finding waypoints: ${pathType.toUpperCase()}`)
    // Default waypoint distance: ~5 car lengths
    let stepSize = 250 * 5;

    switch(pathType) {
      case 'garagebox':
        stepSize = 500;
        break;
      case 'pitbox':
        stepSize = 200;
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
          radius: pathType == 'racetrack' ? 320 : 128,
          completed: false
        }
        pathWaypoints.push(pathWaypoint);
      }
    }


    // place the found waypoints into the points array of the currentPath
    let currentPath = this.paths.filter( path => path.name === pathType)[0];
    currentPath.points = pathWaypoints;
  }

  renderWaypointsForCurrentPath() {
    const path = this.paths[this.currentPath];
    if(waypointsOverlay.classList.contains(path.name)) {
      return false;
    }

    waypointsOverlay.innerHTML = '';

    waypointsOverlay.className = `layer waypoints ${path.name}`
    path.points.forEach(point => {
      point.completed = false;
    })

    console.info(`🗺️ render path waypoints: ${path.name.toUpperCase()}`)

    let pathWaypoints = path.points;
    const b = document.createElement('b');
    b.className = `waypoint ${path.name}`;

    pathWaypoints.map( (waypoint, index) => {
      waypoint.completed = false;
      let el = b.cloneNode();
      el.textContent = `${index + 1}`;
      el.style.translate = `calc(${Math.round(waypoint.x )}px - 50%) calc(${Math.round(waypoint.y )}px - 50%) 0`;
      el.style.setProperty('--size', waypoint.radius); //css uses --size variable to set width & height on waypoints
      
      // jaa lache
      if(!pathWaypoints[index].completed) {
        waypointsOverlay.appendChild(el);
        pathWaypoints[index].element = el;
      }
    });
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

      // making sure a player completes waypoints in order
      if (bang[0] && index == wphits) {
        item.element?.classList.add('colliding')

        item.element?.classList.add('hit');

        if(!points[index].completed) {
          points[index].completed = true;
        }

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
    
    let radioUpdate = '';
    let autoHide = false;
    switch(this.currentPath) {
      case 0:
      case 1:
      case 2:
        radioUpdate = `Go to ${this.paths[this.currentPath].name} (${wphits}/${this.paths[this.currentPath].points.length})`;
        break;
      case 3:

        if (!this.paths[this.currentPath].completed){
          radioUpdate = 'Prepare warmup lap'
          if(this.paths[this.currentPath].points[0].completed) {
            radioUpdate = `Hit all checkpoints! (${wphits}/${this.paths[this.currentPath].points.length})`
          }
        }
    }

    this.hud.postMessage('team', 'radio', radioUpdate, autoHide);

    // all waypoints in current path are hit
    if(this.paths[this.currentPath].points.every(point => point.completed)) {

      this.paths[this.currentPath].completed = true;

      // window.waypointsOverlay.innerHTML = '';
      
      if(this.currentPath == this.paths.length - 1) {
        
        // FIXME: whenever currentPath is 'racetrack' always stay on that path
        this.currentPath = this.paths.length - 1;

      } else if(this.hud.sessionTime) {
        this.currentPath++;
        let points = this.paths[this.currentPath].points;
        points.forEach( point => point.completed = false);
        this.renderWaypointsForCurrentPath();
      }

    }
  }

  checkSurfaceType () {
    if(this.paths[this.currentPath].name == 'racetrack') {
      const point = iframe.contentDocument.documentElement.createSVGPoint();
      point.x = this.position.x;
      point.y = this.position.y;

      try {
        let onTrack = this.surfaces.racetrack?.isPointInStroke(point) || this.surfaces.pitlane?.isPointInStroke(point);
        this.isOnRoad = onTrack;
      } catch (e) {
        console.log(e)
      }
    }
  }

  draw (deltaTime) {

    // display debug info
    if(this.game.debug) {
      this.displayVelocity = Math.abs(Math.round(this.velocity*3) )
      this.carBody.dataset.velocity = `${this.displayVelocity} (${Math.round(this.velocity)} / ${Math.round(this.maxSpeedFront)})`;

      // draw a line from the car to each opponent
      if (this.game.opponents.length) {
        
        let distance = this.game.getDistance(this, this.game.opponents[this.game.opponents.length - 1]);
        let angle = this.game.getAngle(this, this.game.opponents[this.game.opponents.length - 1]);

        this.ruler.style = `--x: ${this.position.x}; --y: ${this.position.y}; --angle: ${Math.floor(this.facingAngle).toFixed(2)}deg;`;
        this.ruler.style.width = distance + 'px';
        this.ruler.style.rotate = angle + 'deg';
      }
      
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

    let zoom = `${zoomfactor.toFixed(3)}`;
    let transorigin = `${Math.floor(this.position.x)}px ${Math.floor(this.position.y)}px`;
    let translate = `${Math.floor((this.cameraPosition.x - this.game.camera.offsetWidth / 2) * -1)}px ${Math.floor((this.cameraPosition.y - this.game.camera.offsetHeight / 2) *-1 )}px`;
    
    // Desperate attempt to reduce Re-Flow / Style calculation by omitting to 
    // update the width and height properties.. to no avail.

    // let style =`width: ${this.game.worldMap.width}; height: ${this.game.worldMap.height}; ${zoom}; ${translate}; ${transorigin}; `;
    // this.game.worldMap.style = style;

    this.game.worldMap.style.setProperty('--zoom', zoom)
    this.game.worldMap.style.setProperty('--translate', translate)
    this.game.worldMap.style.setProperty('--trans-origin', transorigin)

    this.carBody.style = `--x: ${parseInt(this.position.x)}; --y: ${parseInt(this.position.y)}; --angle: ${this.facingAngle}deg;`
    this.carLights.style = `--x: ${parseInt(this.position.x)}; --y: ${parseInt(this.position.y)}; --angle: ${this.facingAngle}deg;`
    
    this.isBraking ? this.carLights.classList.add('braking') : this.carLights.classList.remove('braking');
    
    if (this.isBraking && (this.velocity > this.maxSpeedFront * .15 ) ) {

      if(this.tireTrackInterval > 30) {
        let tiretrack = this.getTireTrack();
        if(tiretrack) {
          let offset = this.game.sidesFromHypotenhuse(this.width * .25, this.facingAngle)
          tiretrack.sprite.style.width = this.velocity * 4 + "px";
          tiretrack.opacity = 20 + this.velocity;
          tiretrack.start(this.position.x - offset.width, this.position.y - offset.height, this.facingAngle );
          setTimeout(() => tiretrack.fadeOut(), 2000)
        }
        this.tireTrackInterval = 0;
      } else {
        this.tireTrackInterval += deltaTime;
      }
    }

    if(this.smokeInterval > 30) {
      
      if(!this.isOnRoad && this.velocity > 10 || this.isBraking && (this.velocity > this.maxSpeedFront * .15 )) {
        let smoke = this.getSmoke();
        let startAngle = Math.floor(Math.random() * 720) - 360;
        if(smoke) { 
          if(!this.isOnRoad) {
            smoke.sprite.classList.add('dust');
            this.lapTimer.currentLap.penalty = 'track limits';
          } else {
            smoke.sprite.classList.remove('dust');
          }
          smoke.start(this.position.x, this.position.y, startAngle);
          smoke.frameX = Math.floor(Math.random() * smoke.maxFrame);
          smoke.draw();
          setTimeout(() => smoke.fadeOut(10), 500)
        } 
      }
      this.smokeInterval = 0;
    } else {
      this.smokeInterval += deltaTime;
    }
    
    if (this.velocity > 50 && this.game.input.gamepad == undefined && this.game.input.keys.length == 0) {
      let pop = this.getExhaustPop();
      
      let offset = this.game.sidesFromHypotenhuse(this.width * -1, this.facingAngle)
      
      pop?.start(this.position.x - offset.width , this.position.y - offset.height , this.facingAngle);

      this.exhaustPopInterval = 0;
    } else {
      this.exhaustPopInterval += deltaTime;
    }

    try {
      this.game.updateEngineSound(this.velocity, this.engineSound);
      let gain = ((this.velocity * 3) / this.maxSpeedFront) * this.engineSound.gain;
      this.engineSound.updateGain(gain);
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
    let horn = this.carBody.querySelector('audio.horn');
    horn.volume = this.ambientSfxLevel;
    horn.play();
    this.carBody.classList.add('flashing');

    // alternatively, add an 'animationEnd' event listener
    // to .carBody > .lights.brakes 
    // but that should probably happen inside init()
    setTimeout( () => {
      this.carBody.classList.remove('flashing');
    }, 1000)
  }

  sendLocation (deltaTime) {
    if(this.updateTime > 100 && this.game.socket.readyState == 1) {
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
    let mod = this.isReversing ? -1 : 1; 
    let {keys, gamepad} = input;

    // stopping the car from moving infinitely small distances
    if(Math.abs(this.velocity) < 0.001 && this.forceForward == 0 && this.forceBackward == 0) {
      this.forceBackward = 0;
      this.forceForward = 0;
    }

    // handle gamepad input 
    if (gamepad) {
      const {axes, buttons} = gamepad;

      // right trigger (accelerator)
      let accelRate = 0;
      if (axes[5]) {
        accelRate = ((1 + axes[5]) / 2);
      } else if (buttons[7].touched) {
        accelRate = buttons[7].value;
      }

      if (accelRate && this.velocity < this.maxSpeedFront && this.velocity < this.paths[this.currentPath].speedLimit){
        console.log('accelerate')
        this.forceForward += this.baseForce * accelRate;
        this.isReversing = false;
        this.isBraking = false;
      }


      // left trigger (braking)
      let brakeForce = 0;
      if(axes[2]) {
        brakeForce = ((1 + axes[2]) / 2);
      } else if (buttons[7].touched && buttons[7].value) {
        brakeForce = buttons[7].value;
      }
      
      if(brakeForce && this.velocity > 0) {
        console.warn('braking')
        this.isBraking = true;
        this.isReversing = false;
      }

      if (brakeForce && this.velocity < 0) {
        console.warn('reversing', brakeForce)
        this.isBraking = false;
        this.isReversing = true;
      }

      if(this.isBraking && this.velocity > this.maxSpeedBack || this.isReversing && this.velocity > this.maxSpeedBack){
        this.forceBackward += this.baseForce;
      }


      // left stick (steering)
      if (Math.abs(axes[0]) > 0.05) {
        if(this.velocity != 0){
          this.facingAngle += this.baseTurningSpeed * axes[0]
        }
      }

    } else if (navigator.getGamepads()[0]){
      this.game.input.gamepad = navigator.getGamepads()[0];
    }

    // handle keyboard input
    if(keys && keys.length) {
      
      if(keys.includes("Escape")){
        this.game.toggleMenu();
        this.game.debug = false;
      }

      // steering
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

      // accelerating
      if(keys.includes("ArrowUp") || keys.includes('a') ) {
        if(this.velocity < this.maxSpeedFront && this.velocity < this.paths[this.currentPath].speedLimit){
            this.forceForward += this.baseForce;
            this.isReversing = false;
        }
        
        if (!this.engineSound.sourceBuffer.playbackRate) {
          this.engineSound.sourceBuffer.start(this.engineSound.audioCtx.currentTime)
        }
      }
      
      // brake / reversing
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
    if(this.isOnRoad){
        this.forceForward *= this.baseRoadAttrition
        this.forceBackward *= this.baseRoadAttrition
    } else {
      this.forceForward *= this.baseDirtAttrition
      this.forceBackward *= this.baseDirtAttrition
    }

    this.velocity = this.forceForward - this.forceBackward;
    this.position.x += this.velocity * Math.cos(this.facingAngle * Math.PI / 180) * .65;
    this.position.y += this.velocity * Math.sin(this.facingAngle * Math.PI / 180) * .65;

    // update opponents
    let opponents = this.game.opponents;

    opponents.forEach( opponent => {
      if (!opponent) return;

      // check for car colisions
      let [collision, distance, sumOfRadii, dx, dy] = this.game.checkCollision(this, opponent);
      if (collision) {
        let smoke = this.getSmoke()
        if(smoke) {
          smoke.start(this.position.x, this.position.y, this.facingAngle );
        }

        // these values will always be 0-1 as the distance = hypotenuse
        // ie a fraction of the total length. May be negative, so a 
        // value between -1 and and +1
        const unitX = dx / distance;
        const unitY = dy / distance;
        this.position.x = opponent.position.x + (sumOfRadii + 2 ) * unitX;
        this.position.y = opponent.position.y + (sumOfRadii + 2 ) * unitY;

        // probably multiply by player.velocity / player.forceForward rather than .5 
        opponent.position.x = this.game.lerp(opponent.position.x, opponent.position.x + (sumOfRadii * .5 ) * (unitX * -1), 0.2);
        opponent.position.y = this.game.lerp(opponent.position.y, opponent.position.y + (sumOfRadii * .5 ) * (unitY * -1), 0.2);
      }
      
      // check for obstacle colisions
      // this.checkObstacles(opponent);

      // calculate opponent sound levels and panning
      let angle = this.game.getAngle(this, opponent);

      if(distance > this.game.worldMap.width) distance = this.game.worldMap.width;
      if(distance < 100) distance = 100;
      if(this.game.debug) console.log(distance);
      
      let gainTargetValue = (this.game.worldMap.width - distance) + 1 / this.game.worldMap.width;


      // using a lerp here because directly setting the gain seems to cause quite a bit
      // of harsh clipping. the lerp _should_ ensure a smoother transition between values
      // let gainUpdateValue = this.game.lerp(opponent.engineSound.gainNode.gain.value, gainTargetValue, 0.3) || opponent.engineSound.gainNode.gain.value;
      let gainUpdateValue = gainTargetValue.toFixed(3);
      
      try {
        // opponent.engineSound.gainNode.gain.setTargetAtTime(gainUpdateValue, opponent.engineSound.audioCtx.currentTime, 0.015);
        opponent.engineSound.updateGain(gainUpdateValue)
      } catch (e) {
        console.error(e)
      }
      opponent.engineSound.panNode.pan.setValueAtTime(Math.cos(this.game.degreesToRadians(angle) || 1), opponent.engineSound.audioCtx.currentTime);
    })

    let sessionTime = this.hud.update(deltaTime);

    if (sessionTime <= 0) {

      if(this.currentPath == 1 && this.paths[this.currentPath].points[this.paths[this.currentPath].points.length-1].completed) {

        if(this.forceForward > 0) this.forceForward--;
        this.maxSpeedFront = 0;
        this.maxTurnSpeed = 0;
        this.allPathsCompleted = true;

        document.body.className = 'session-menu';

      } else {
        this.currentPath = 1;
        this.currentWaypoint = 0;
        this.paths[this.currentPath].completed = false;
        this.paths[this.currentPath].speedLimit = 40;
        this.allPathsCompleted = false;
        // this.paths[this.currentPath].points[this.currentWaypoint].completed = false;
        this.renderWaypointsForCurrentPath();
        this.checkCurrentPathWaypoint();
        this.waypointer?.element.classList.remove('all-complete');
      }
    }
    
    if(sessionTime) {
      this.checkCurrentPathWaypoint();
      // start laptimer after warmup lap completed
      if(this.currentPath == 3 && this.paths[this.currentPath].completed) {
        this.lapTimer.update(deltaTime);
      }
    }

    if( !this.isOnRoad && sessionTime) {
      this.hud.postMessage('session','status','yellow flag');
    }

    if( this.isOnRoad && sessionTime) {
      this.hud.postMessage('session','status','free practice');
    }
    
    if (!this.allPathsCompleted && sessionTime) { 

      if(this.paths[this.paths.length - 1].points.every(point => point.completed == true)) {

        this.allPathsCompleted = true;
        this.waypointer.element.classList.add('all-complete');
        this.honk();
        let radioUpdate = `Alright, let's go. \nSet some laptimes`;
        this.hud.postMessage('team','radio', radioUpdate, true);

      } else {
        this.waypointer.element.classList.remove('all-complete');
      }
    }

    try {
      
      this.waypointer.update();
      
    } catch(e) {
      // console.warn(e)
    }

    if(this.forceForward || this.forceBackward) {
      this.checkSurfaceType();
      this.checkObstacles();
    }

    if(this.game.socket && this.game.socket.readyState == 1) {
      if(this.velocity) {
        this.sendLocation(deltaTime);
      }
    }

    // this.smokePool.forEach((smoke, index) => {
    //  smoke animation is handled custom, see update() :P
    //  smoke.update(deltaTime);
    // });

    this.exhaustPopPool.forEach(pop => {
      pop.update(deltaTime);
    });


    this.draw(deltaTime)

  }

}