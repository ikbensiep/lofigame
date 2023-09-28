import Player from './Player.js';
import InputHandler from './InputHandler.js';
import Emitter from './Emitter.js';

let game;

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
    this.animationInterval = 1000/60;

    this.fpsCounter = window.fpsCounter;
    this.map = window.map;
    this.scene = '';
    this.sceneSelector = this.hud.querySelector('select');
    this.player = new Player(this);
    this.input = new InputHandler(this);
    this.explosionPool = [];
    this.maxExplosions = 20;
    
    this.mouse = {x:0, y:0, height: 5};

    this.loadWorld(this.scene);

    this.createExplosionPool();
    console.log(this.explosionPool);

    this.sceneSelector.addEventListener('input', e => {
       this.loadWorld(e.target.value);
       e.target.blur();
    });

    this.camera.addEventListener('click', e => {
      
      this.mouse.x = camera.scrollLeft + e.clientX;
      this.mouse.y = camera.scrollLeft + e.clientY;

      const pop = this.getExplosion();
      
      if (pop) { 
        pop.start(this.player.position.x, this.player.position.y, this.player.facingAngle );
      }
    });
    
  }

  
  loadWorld(worldname) {
    this.loading = true;
    iframe.src = `/assets/track/${worldname}.svg`;
    iframe.onload = () => {
      ['path','world','track','elevated'].map (layername => {
        let layerElem = this.map.querySelector(`.${layername}`);
        layerElem.src = iframe.src + `#${layername}`;
      })

      this.loading = false;
      this.scene = worldname;
      this.player.init();
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
    return distance < sumOfRadii;
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


window.addEventListener('load', () => {
  game = new Game();
  
  let lastTime = 0;
  const animate = (timeStamp) => {
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;
    game.render(deltaTime);
    requestAnimationFrame(animate);
  }

  animate(0);
  console.log(game);
});

