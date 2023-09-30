import Player from './Player.js';
import InputHandler from './InputHandler.js';
import Emitter from './Emitter.js';


export default class Game {
  constructor() {
    // whut.. no context?
    // where we're going, we don't need no stinkin' canvas
    // rendering on screen is handled by placing (img) elements,
    // camera transformations by a good ol' .scrollTo()...
    // simply set  .camera to overflow: hidden and no one will ever know

    this.loading = true;
    this.camera = window.camera;
    this.hud = document.querySelector('header');
    this.animationTimer = 0;
    this.animationInterval = 1000/70;

    this.fpsCounter = window.fpsCounter;
    this.worldmap = window.map;
    this.mapLayers = [{type:'world'},{type:'track'},{type:'elevated'}];
    
    this.scene = 'home';
    this.sceneSelector = this.hud.querySelector('select');

    this.explosionPool = [];
    this.maxExplosions = 20;
    
    this.mouse = {x:0, y:0, height: 5};


    this.createExplosionPool();

    this.loadScene(this.scene);
    
    
    this.player = new Player(this);
    this.input = new InputHandler(this);
    
    
    this.sceneSelector.addEventListener('change', e => {
       this.loadScene(e.target.value);
       
       this.player.paths.map (path => path.points.length = 0);
       e.target.blur();
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

      this.worldmap.style.height = h + 'px';
      this.worldmap.style.width = w + 'px';

      try {

        worldlayers.map ( (worldlayer, index) => {
          let layerElem = this.worldmap.querySelector(`img.${worldlayer.type}`);
          
          layerElem.src = `./assets/track/${worldname}.svg#${worldlayer.type}`;
          
          layerElem.onload = () => { 
            worldlayer.loaded = true;
            if(index === this.mapLayers.length -1 ) {
              this.scene = worldname;
              console.log('world map loaded');
              this.player.currentPath = 0;
              this.player.init();
              this.loading = false;
            }
          };
        });

        let helipad = iframe.contentDocument.querySelector('#helipad');
        // fixme
          window.helicopter.style.left = '3500px';
          window.helicopter.style.top = '18700px';
        

      } catch (e) {
        console.log(e)
      }
    }
  }

  render(deltaTime) {
    if(this.animationTimer > this.animationInterval) {

      this.player.update(this.input.keys);

      this.explosionPool.forEach(explosion => {
        explosion.update(deltaTime);
        // update HUD
        const fps = parseInt(1000/deltaTime);
        this.fpsCounter.value = fps || 0;
        this.fpsCounter.textContent = `${fps} fps`;
        this.fpsCounter.nextSibling.textContent = `${fps} fps`
      })

    } else {
      this.animationTimer += deltaTime;
    }


    if(this.loading) {
      document.body.classList.add('loading')
    } else {
      document.body.classList.remove('loading')
    }
  }
  
  checkCollision (a, b) {

    let xPosA = a.position ?  a.position.x : a.x;
    let yPosA = a.position ?  a.position.y : a.y;
    let xPosB = b.position ? b.position.x : b.x;
    let yPosB = b.position ? b.position.y : b.y;

    const sumOfRadii = a.height / 2 + b.height/2;
    const dx = xPosA - xPosB;
    const dy = yPosA - yPosB;
    const distance = Math.hypot(dx, dy);
    return [(distance < sumOfRadii), distance, sumOfRadii, dx, dy];
  }

  createExplosionPool() {
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
}

let weatherChecks = document.querySelectorAll('.weather input');
weatherChecks.forEach( checkbox => {
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.querySelector('.layer.weather').classList.add(e.target.name)
    } else {
      document.querySelector('.layer.weather').classList.remove(e.target.name)
    }
  })
})

window.addEventListener('load', () => {
  
  window.game = new Game();
  let lastTime = 0;

  const animate = (timeStamp) => {
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;
    game.render(deltaTime);
    requestAnimationFrame(animate);
  }

  animate(0);
  console.log(window.game);
});

