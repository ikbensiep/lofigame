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
    // simply set  .camera to overflow: hidden and no one will ever know

    this.loading = true;
    this.camera = window.camera; // this mayyy be considered bad practive but I love that any #id in an html doc can be called this way.
    this.mouse = {x:0, y:0, height: 5};
    
    this.hud = document.querySelector('header');
    this.animationTimer = 0;
    this.animationInterval = 1000/70;
    this.fpsCounter = window.fpsCounter;

    this.worldMap = window.map; // ya this is probably _super_ bad.
    this.mapLayers = [{type:'world'},{type:'track'},{type:'elevated'}];
    this.playerLayer = document.querySelector('.players');
    this.scene = 'home';
    this.sceneSelector = this.hud.querySelector('select');

    this.explosionPool = [];
    this.maxExplosions = 20;
    this.createExplosionPool();

    this.loadScene(this.scene);

    this.player = new Player(this);
    this.opponents = [];
    this.maxOpponents = 0;

    this.input = new InputHandler(this);
    
    // in lieu of a decent scene switching system, this works for now.
    this.sceneSelector.addEventListener('change', e => {

      this.loadScene(e.target.value);
       // emptying the player's current paths
       // paths are found by the Player object when loadScene calls Player.init()
       this.player.paths.map (path => path.points.length = 0);
       
       e.target.blur(); //super annoying when you're about to drive but you switch dimensions to another world instead
    });
  }

  
  loadScene(worldname) {

    this.loading = true;
    iframe.src = `./assets/track/${worldname}.svg`;
    
    this.mapLayers.map (layer => layer.loaded = false);

    let worldlayers = this.mapLayers;
    
    iframe.onload = () => {

      console.log('track file loaded');
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
    if(this.animationTimer > this.animationInterval) {

      const fps = parseInt(1000/deltaTime);
      this.fpsCounter.value = fps || 0;
      this.fpsCounter.textContent = `${fps} fps`;
      this.fpsCounter.nextSibling.textContent = `${fps} fps`

      this.player.update(this.input.keys, deltaTime);
      
      this.opponents.map( opponent => {
        opponent.update(deltaTime)
      });

      this.explosionPool.forEach(explosion => {
        explosion.update(deltaTime);
      });


    } else {
      this.animationTimer += deltaTime;
    }

    if(this.loading) {
      document.body.classList.add('loading') // body.loading changes the mouse cursor to `wait`; at this stage we're not building fancy UIs just yet
    } else {
      document.body.classList.remove('loading')
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

    var f = speed < 0.01 ? 0.30 :
      speed < 8 ? 0.30 + speed / 10 :
      speed < 15 ? 0.30 + speed / 20 :
      speed < 27.5 ? 0.20 + speed / 40 : 
      speed < 40 ? 0.20 + speed / 45 : 
      0.20 + speed / 50;

    sound.gainNode.gain.value = 0.05 + speed / 50 //(maxspeed = 50)
    sound.sourceBuffer.connect(sound.gainNode);
    sound.sourceBuffer.playbackRate.value = speed / 50
    // var C = 15;
    // this.sourceBuffer.playbackRate.value = 0.35 + (speed/C - Math.floor(speed / C));
  }

}

let renderChecboxes = document.querySelectorAll('.weather input');
renderChecboxes.forEach( checkbox => {
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.querySelector(`.layer.${e.target.name}`).classList.add(e.target.value)
    } else {
      document.querySelector(`.layer.${e.target.name}`).classList.remove(e.target.value)
    }
  })
})

window.addEventListener('load', () => {
  
  window.game = new Game();
  let lastTime = 0;

  const animate = (timeStamp) => {
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;
    window.game.render(deltaTime);
    requestAnimationFrame(animate);
  }

  animate(0);
  console.log(window.game);
});

