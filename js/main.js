// @ts-check
import InputHandler from './InputHandler.js';
import Emitter from './Emitter.js';
import Player from './Player.js';
import Opponent from './Opponent.js'
import NPC from './NPC.js';

export default class Game {
  constructor() {
    // whut.. no context?
    // where we're going, we don't need no stinkin' canvas
    // rendering on screen is handled by placing (img) elements,
    // camera transformations by a good ol' .scrollTo()...
    // simply set `.camera` to overflow: hidden and no one will ever know

    this.debug = false;
    this.menu = false;
    this.loading = true;
    this.progressBar = document.querySelector('.progress-bar');
        
    this.animationTimer = 0;
    this.animationInterval = 1000/30;

    this.worldMap = document.querySelector('#map'); 
    this.gameCamera = { 
      element: document.querySelector('#gamecamera'),
      position: {x: 0, y:0},
      lerpSpeed: 0.9,
      lookAhead: 150
    }
    
    this.mapLayers = {}; 
    ['track', 'lights', 'elevated'].every(layer => this.mapLayers[layer] = {loaded: false});

    this.playerLayer = document.querySelector('.players');
    this.scene = '';
    this.sessionTime = 600000;

    this.explosionPool = [];
    this.maxExplosions = 20;
    this.opponents = [];
    this.maxOpponents = 0;

    this.marshals = [];
    this.marshalPosts = [];
    this.maxMarshals = 100;

    this.input = undefined;
    this.initialized = false;
    this.windowSize = {innerWidth: window.innerWidth, innerHeight: window.innerHeight}
    this.layerLoadInterval = undefined;
  }

  init (scene, player) {
    this.scene = scene;
    this.player = new Player(this, player);
    this.input = new InputHandler(this);
    this.opponents = [];
    this.explosionPool = [];
    this.createExplosionPool();
    this.loadScene(this.scene);
    document.addEventListener('keyup', (e) => {
      this.handleKeyUp(e)
    });
  }

  // for certain (toggle) buttons, adding a simple key event listener 
  // instead of reading the input.keys array every frame
  handleKeyUp(e) {
    
    switch (e.key) {
      case 'Escape':
        this.menu = !this.menu;
        this.debug = false;
        break;
      case '`':
        this.debug = !this.debug;
        break;
    }

    if(this.menu) {
      document.body.classList.add('menu');
    } else {
      document.body.classList.remove('menu');
      document.body.classList.remove('debug');
    }

    if(this.debug) {
      document.body.classList.add('debug');
    } else {
      document.body.classList.remove('debug');
    }
  }

  handleSocketConnect(event) {
    console.info({event})
    this.player?.hud.postMessage('racecontrol','notice', `Welcome, ${this.player.displayname}!` );
  }

  handleSocketMessage (event) {
    const data = JSON.parse(event.data)

    switch(data.type) {
      case 'player-hello' :
        // add opponent
        console.warn('player-hello', data);

      case 'player-update':
        
        // update opponents in my local game
        if(!this.opponents[data.sender]) {
          // this.maxOpponents = data.sender + 1;
          this.opponents[data.sender] = new Opponent(this, data.sender);
          this.player?.hud.postMessage('racecontrol','notice', data.message);
          this.player?.hud.addCompetitor(data.sender, `Player ${data.sender}`);
        }
        this.opponents[data.sender].position.x = data.body[0];
        this.opponents[data.sender].position.y = data.body[1];
        this.opponents[data.sender].facingAngle = data.body[2];
        this.opponents[data.sender].velocity = data.body[3];
        this.opponents[data.sender].isBraking = data.body[4];
        break;

      default: 
        console.info(event);
    }
  }

  /**
   * @param {string} worldName
   */
  loadScene(worldName) {
    console.log(`🗺️ load scene: ${worldName}`);
    this.progressBar.style.setProperty('--progress', 50);

    this.loading = true;

    this.player?.paths.map (path => path.points = []);

    iframe.src = `./assets/track/${worldName}.svg#track`;

    iframe.addEventListener ('load', (event) => {
      console.info('🏁 iframe svg loaded')
      this.initSceneLayers(iframe, worldName);
    });

    let progress = 0;

    this.layerLoadInterval = setInterval(() => {
      let layers = Object.keys(this.mapLayers);
      let allLoaded = layers.every(layer => this.mapLayers[layer].loaded === true);

      progress += 2;
      this.progressBar.style.setProperty('--progress', progress);
      if(allLoaded) {
        this.progressBar.style.setProperty('--progress', 70);
        console.warn(`all layers loaded`);
        clearInterval(this.layerLoadInterval);
        
        setTimeout(()=>{
          console.log('player.init')
          this.player.init();
        }, 1000);
      } 
    }, 100);

    this.socket = new WebSocket(`ws://localhost:9201/room/${worldName}`);
    if(this.socket) {
      this.socket.addEventListener('message', (event) => {
        this.handleSocketMessage(event)
      })
      this.socket.addEventListener('open', (event) => {
        console.log(event)
        this.handleSocketConnect(event);
      })
      this.socket.addEventListener('close', (event) => {
        console.info(event);
        this.socket.send(JSON.stringify({type:'disconnect', message: 'bye'}))
      })
    }
  }

  initSceneLayers (iframe, worldName) {
    
    let svg = iframe.contentDocument.documentElement;
    let h = (svg.getAttribute('height') || svg.viewBox.baseVal.height) ;
    let w = (svg.getAttribute('width') || svg.viewBox.baseVal.width);
    this.worldMap.width = w;
    this.worldMap.height = h;
    this.worldMap.style.width = w + 'px';
    this.worldMap.style.height = h + 'px';

    this.gameCamera.position = {x: w / 2, y: h / 2}

    if(!w || !h) {
      console.error('no scene width or height?', iframe);
      return false;
    } else {

      console.group('layer img loading');

      const layers = Object.keys(this.mapLayers);

      layers.forEach ( (layer, index) => {
        
        let element = this.worldMap.querySelector(`.layer.${layer}`);
        this.mapLayers[layer].element = element;
        element.style.width = w + 'px';
        element.style.height = h + 'px';

        let layerImg = element.querySelector('img[data-layer]');
        layerImg?.setAttribute('width', w + 'px');
        layerImg?.setAttribute('height', h + 'px');

        let src = `./assets/track/${worldName}.svg#${layer}`

        layerImg.src = src;
        layerImg.onload = () => { 
          this.mapLayers[layer].loaded = true;
          
          console.log(`🗺️ loaded layer: ${layer}`);

          if(index === layers.length - 1 ) {
            this.scene = worldName;
            console.log('✅ world map layers loaded');
          }
        };
      });
      console.groupEnd();

      this.addOpponents();
      this.opponents.map( opponent => opponent.init());
  
      let finishLine = svg.querySelector('#finish-line');
      let portal = this.worldMap?.querySelector('.finish-portal');
      let rect = finishLine.getBoundingClientRect();
  
      portal.style.setProperty('--left', rect.x + "px");
      portal.style.setProperty('--top', rect.y + "px");
      portal.style.setProperty('--rot-y',finishLine.transform.baseVal[0]?.angle.toFixed(1) || 0 );

      window.addEventListener('resize', () => {
        console.log('resize')
        this.windowSize = {innerWidth: window.innerWidth, innerHeight: window.innerHeight};
      });
    }
    
  }


  render(deltaTime) {
    this.input?.updateGamePad();
    this.player.update(this.input, deltaTime);
    
    this.opponents.map( opponent => {
      opponent.update(deltaTime)
    });
    
    this.explosionPool.forEach(explosion => {
      explosion.update(deltaTime);
    });
    
    if(this.animationTimer > this.animationInterval) {
      const fps = parseInt(1000/deltaTime);
      document.body.dataset.fps = fps || 0;
      
      this.animationTimer = 0;

    } else {
      this.animationTimer += deltaTime;
    }

    if(this.loading) {
      document.body.classList.add('loading') // body.loading changes the mouse cursor to `wait`; at this stage we're not building fancy UIs just yet
    } else {
      document.body.classList.remove('loading')
    }

    if(this.debug) {
      document.body.classList.add('debug');
    } else {
      document.body.classList.remove('debug');
    }

  }

  /**
   * @param {object} a
   * @param {object} b
   */
  checkCollision (a, b) {

    let xPosA = a.position ? a.position.x : a.x;
    let yPosA = a.position ? a.position.y : a.y;
    let xPosB = b.position ? b.position.x : b.x;
    let yPosB = b.position ? b.position.y : b.y;

    const sumOfRadii = a.radius / 2 + b.radius/2;
    const dx = xPosA - xPosB;
    const dy = yPosA - yPosB;
    const distance = Math.hypot(dx, dy);
    return [(distance < sumOfRadii), distance, sumOfRadii, dx, dy];
  }

  lerp (currentValue, targetValue, time) {
    return currentValue * (1 - time) + targetValue * time;
  }

  /**
   * @param {number} hypot
   * @param {number} angle
   */
  sidesFromHypotenhuse (hypot, angle) {
    // Convert angle from degrees to radians
    const angleInRadians = (angle * Math.PI) / 180;

    // Calculate width (a) and height (b) using trigonometric functions
    const width = hypot * Math.cos(angleInRadians);
    const height = hypot * Math.sin(angleInRadians);

    return { width, height };
  }

    /**
   * @param {object} a
   * @param {object} b
   */
  getAngle (a, b) {
    let cx = (a.x ? a.x : a.position.x);
    let cy = (a.y ? a.y : a.position.y);
    let dx = (b.x ? b.x : b.position.x) - cx;
    let dy = (b.y ? b.y : b.position.y) - cy;
      
    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;
    return angleDegs;
  }

  /**
   * @param {object} a
   * @param {object} b
   */
  getDistance(a, b) {
    try {
      let cx = (a.x ? a.x : a.position.x);
      let cy = (a.y ? a.y : a.position.y);
      let dx = (b.x ? b.x : b.position.x) - cx;
      let dy = (b.y ? b.y : b.position.y) - cy;

      let mag = Math.sqrt(dx * dx + dy * dy);
      return mag;
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @param {number} degrees
   */
  degreesToRadians (degrees) {
    return degrees * (Math.PI / 180);
  }

  addOpponents () {
    this.opponents = [];
    for(let i=0; i<this.maxOpponents; i++) {
      this.opponents.push(new Opponent(this, i));
    }
  }

  addMarshals () {
    let svg = window.iframe.contentDocument.documentElement;
    let targetLayer = this.playerLayer?.querySelector('.marshals');
    let marshalId = 0;
    let lamp = document.createElement('span');
    lamp.className = 'lamp-post';

    this.marshalPosts = svg.querySelectorAll('#marshal-posts > *') || [];

    this.marshalPosts.forEach( (post) => {
      // add a light
      let cx = post.getAttribute('cx');
      let cy = post.getAttribute('cy');
      let postlamp = lamp.cloneNode();
      postlamp.style.left = cx + 'px';
      postlamp.style.top = cy + 'px';
      this.mapLayers.lights.element.appendChild(postlamp);
      
      // add a team of lil guys
      for(let i=0; i<4; i++) {
        let marshal = new NPC(this, window.marshalSprite, post, targetLayer, marshalId, 64, 7);
        this.marshals.push(marshal);
        marshal.init();
        marshalId++;
      }
    });
  }

  createExplosionPool () {
    for(let i=0; i<this.maxExplosions; i++) {
      this.explosionPool.push(new Emitter(this, window.explosionsSprite));
    }
  }

  getExplosion() {
    for(let i=0; i< this.explosionPool.length; i++) {
      if (this.explosionPool[i].free) {
        return this.explosionPool[i];
      }
    }
  }
  
  /**
   * @param {number} speed
   * @param {object} sound
   */
  updateEngineSound (speed, sound) {
    if(!sound.playing) sound.startSound();
    
    speed = parseFloat(Math.abs(speed).toFixed(3));
    sound.sourceBuffer.connect(sound.gainNode);
    sound.sourceBuffer.playbackRate.value = speed / 60

    if (speed < 0.1 && speed > -0.1) {
      sound.sourceBuffer.context.suspend();
    } else if (sound.sourceBuffer.context.state === 'suspended') {
      sound.sourceBuffer.context.resume()
    }
  }
}