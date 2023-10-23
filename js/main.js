// @ts-check
import InputHandler from './InputHandler.js';
import Emitter from './Emitter.js';
import Player from './Player.js';
import Opponent from './Opponent.js'

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
    this.camera = document.querySelector('#gamecamera'); // this mayyy be considered bad practive but I love that any #id in an html doc can be called this way.
    this.mouse = {x:0, y:0, height: 5};
    
    this.animationTimer = 0;
    this.animationInterval = 1000/30;

    this.worldMap = document.querySelector('#map'); 
    this.mapLayers = [{type:'world'}, {type:'track'}, {type:'lights'}, {type:'elevated'}];
    this.playerLayer = document.querySelector('.players');
    this.scene = '';

    this.explosionPool = [];
    this.maxExplosions = 20;
    this.opponents = [];
    this.maxOpponents = 0;

    this.input = undefined;
    this.initialized = false;
    
  }

  init (scene, player) {
    this.scene = scene;
    this.player = new Player(this, player);
    this.input = new InputHandler(this);
    this.opponents = [];
    this.explosionPool = [];
    this.createExplosionPool();
    this.loadScene(this.scene);
  }

  handleSocketConnect(event) {
    console.warn(event)
    this.player.hud.postMessage('racecontrol','notice', `Welcome, ${this.player.displayname}!` );
  }

  handleSocketMessage (event) {
    const data = JSON.parse(event.data)

    switch(data.type) {
      case 'player-hello' :
        // add opponent
        console.warn(data);
        
        case 'player-update':

          // update opponents in my local game
      if(!this.opponents[data.sender]) {
        this.maxOpponents = data.sender + 1;
        this.opponents[data.sender] = new Opponent(this, data.sender);
        this.player?.hud.postMessage('racecontrol','notice', data.message);
        this.player?.hud.addCompetitor(data.sender, `Player ${data.sender}`);
      }

      this.opponents[data.sender].position.x = data.body[0];
      this.opponents[data.sender].position.y = data.body[1];
      this.opponents[data.sender].facingAngle = data.body[2];
      this.opponents[data.sender].velocity = data.body[3];
      this.opponents[data.sender].isBraking = data.body[4];
    }
  }

  /**
   * @param {string} worldName
   */
  loadScene(worldName) {
    console.log(`🗺️ loadScene: ${worldName}`);
    this.loading = true;

    this.player?.paths.map (path => path.points = []);

    iframe.src = `./assets/track/${worldName}.svg?r=${Math.random()}#track`;
    
    this.socket = new WebSocket(`ws://localhost:9201/room/${worldName}`);
    if(this.socket) {
      this.socket.addEventListener('message', (event) => {
        this.handleSocketMessage(event)
      })
      this.socket.addEventListener('open', (event) => {
        this.handleSocketConnect(event);
      })
    }

    this.mapLayers.map (layer => layer.loaded = false);

    iframe.addEventListener ('load', (event) => {
      console.log('🏁 iframe svg loaded')
      this.initSceneLayers(iframe, worldName);
    });
  }

  initSceneLayers (iframe, worldName) {
    let svg = iframe.contentDocument.documentElement;
    let h = svg.getAttribute('height');
    let w = svg.getAttribute('width');
    this.worldMap.width = w + 'px';
    this.worldMap.height = h + 'px';
    this.worldMap.style.height = h + 'px';
    this.worldMap.style.width = w + 'px';

    console.info('world size: ', {w,h});

    let sceneLayers = this.mapLayers;
    
    if(!w || !h) {
      console.error('no scene width or height?', iframe);
    } else {
    
      sceneLayers.map ( (worldLayer, index) => {
        let layer = this.worldMap.querySelector(`.layer.${worldLayer.type}`);
        let layerImg = layer.querySelector('img[data-layer]');
        let src = `./assets/track/${worldName}.svg#${worldLayer.type}`
        // layer.style.backgroundImage = `url(${src})`;

        layerImg.src = src;
        layerImg.onload = () => { 
          worldLayer.loaded = true;

          console.log(`🗺️ loaded world layer: ${worldLayer.type}`);
          if(index === sceneLayers.length - 1 ) {
            this.scene = worldName;
            console.log('✅ world map loaded');
            console.log('⏳ init player..')
            this.progressBar.style.setProperty('--progress', 50)
            this.player.currentPath = 0;

            this.player.init();
            this.opponents.map( opponent => opponent.init());
            
          }
        };
      });

      this.addOpponents();
    }
    
    let treeline = svg.querySelector('#trees');
    if(treeline) {

      treeline.querySelectorAll('path').forEach( (path, index) => {  
        let length = path.getTotalLength();
        for(var i=0; i<length; i+=500) {
          let loc = {x: path.getPointAtLength(i).x, y: path.getPointAtLength(i).y,};
          let tree = document.querySelector('#ahornTreeSprite').cloneNode(true);
          tree.id = 'tree-' + index
          tree.style.left = `${loc.x - tree.querySelector('img').width / 2}px`;
          tree.style.top = `${loc.y - tree.querySelector('img').height / 2}px`;
          tree.style.rotate = `${Math.floor(Math.random() * 360)}deg`;
          tree.style.position = 'absolute';
          document.querySelector('.elevated').append(tree); //FIXME: add layer '.objects' between .track  and .elevated
        }
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

  toggleMenu() {
    document.body.classList.toggle('menu');
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

  getAngle (a, b) {
    let cx = (a.x ? a.x : a.position.x);
    let cy = (a.y ? a.y : a.position.y);
    let dx = (b.x ? b.x : b.position.x) - cx;
    let dy = (b.y ? b.y : b.position.y) - cy;
      
    const angleDegs = Math.atan2(dy, dx) * 180 / Math.PI;
    return angleDegs;
  }

  getDistance(a, b) {
    let cx = (a.x ? a.x : a.position.x);
    let cy = (a.y ? a.y : a.position.y);
    let dx = (b.x ? b.x : b.position.x) - cx;
    let dy = (b.y ? b.y : b.position.y) - cy;

    let mag = Math.sqrt(dx * dx + dy * dy);
    return mag;
  }

  addOpponents () {
    this.opponents = [];
    for(let i=0; i<this.maxOpponents; i++) {
      this.opponents.push(new Opponent(this, i));
    }
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

  updateEngineSound (speed, sound) {

    // var f = speed < 0.01 ? 0.30 :
    //   speed < 8 ? 0.30 + speed / 10 :
    //   speed < 15 ? 0.30 + speed / 20 :
    //   speed < 27.5 ? 0.20 + speed / 40 : 
    //   speed < 40 ? 0.20 + speed / 45 : 
    //   0.20 + speed / 50;

    // var C = 15;
    // this.sourceBuffer.playbackRate.value = 0.35 + (speed/C - Math.floor(speed / C));

    speed = Math.abs(parseFloat(speed)).toFixed(3);

    sound.gainNode.gain.value = 0.05 + speed / 50 //(maxspeed = 50)
    sound.sourceBuffer.connect(sound.gainNode);
    sound.sourceBuffer.playbackRate.value = speed / 50

    if (speed < 0.2 && speed > -0.2) {
      sound.sourceBuffer.context.suspend()
    } else {
      if (sound.sourceBuffer.context.state === 'suspended') {
        sound.sourceBuffer.context.resume()
      }
    }
  }
}