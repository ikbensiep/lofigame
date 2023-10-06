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
    this.loading = true;
    this.camera = window.gamecamera; // this mayyy be considered bad practive but I love that any #id in an html doc can be called this way.
    this.mouse = {x:0, y:0, height: 5};
    
    this.hud = document.querySelector('#gamecamera header');
    this.animationTimer = 0;
    this.animationInterval = 1000/30;

    this.worldMap = window.map; // ya this is probably _super_ bad.
    this.mapLayers = [{type:'world'},{type:'track'},{type:'elevated'}];
    this.playerLayer = document.querySelector('.players');
    this.scene = '';

    this.explosionPool = [];
    this.maxExplosions = 20;
    this.opponents = [];
    this.maxOpponents = 0;

    this.input = new InputHandler(this);
    
  }

  init (scene, player) {
    this.player = new Player(this, player);
    this.scene = scene;
    this.opponents = [];
    this.explosionPool = [];
    this.createExplosionPool();
    this.loadScene(this.scene);
  }

  loadScene(worldname) {

    this.loading = true;
    this.player.paths.map (path => path.points.length = 0);

    iframe.src = `./assets/track/${worldname}.svg`;
    
    this.mapLayers.map (layer => layer.loaded = false);

    let worldlayers = this.mapLayers;
    
    iframe.onload = () => {

      let h = iframe.contentDocument.documentElement.getAttribute('height');
      let w = iframe.contentDocument.documentElement.getAttribute('width');

      this.worldMap.style.height = h + 'px';
      this.worldMap.style.width = w + 'px';

      try {

        worldlayers.map ( (worldlayer, index) => {
          let layerElem = this.worldMap.querySelector(`.${worldlayer.type} img`);
          
          layerElem.src = `./assets/track/${worldname}.svg#${worldlayer.type}`;
          
          layerElem.onload = () => { 
            worldlayer.loaded = true;
            if(index === this.mapLayers.length -1 ) {
              this.scene = worldname;
              console.log('world map loaded');
              this.player.currentPath = 0;
              this.player.init();
              this.opponents.map( opponent => opponent.init());
              this.loading = false;
            }
          };
        });

        let helipad = iframe.contentDocument.querySelector('#helipad');
        // fixme
        window.helicopter.style.left = '3500px';
        window.helicopter.style.top = '18700px';
        
        this.addOpponents();

      } catch (e) {
        console.log(e)
      }
    }
  }

  render(deltaTime) {
    
    this.player.update(this.input.keys, deltaTime);
    
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

    speed = parseFloat(speed).toFixed(3);

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