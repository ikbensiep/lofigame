export default class Helicopter {
  constructor(game, helicopterIndex, targetLayer) {
    this.game = game;
    this.helicopterIndex = helicopterIndex;
    this.targetLayer = targetLayer;

    // DOM elements
    this.domElement = document.querySelector('.helicopter').cloneNode(true);
    
    this.position = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    
    this.radius = 0; // non-collidable by default unless stationary
    this.speed = 2; // nominal speed used to derive lerp factor
    this.rotationSpeed = 8; // degrees per frame
    this.facingAngle = Math.floor(Math.random() * 360);
    this.prevPosition = { x: 0, y: 0 }; // for predictive targeting

    // Helicopter behavior states
    this.behavior = 'idle'; // 'stationary', 'idle', 'follow'
    this.idleRadius = 200; // radius for idle circular flight
    this.idleCenter = { x: 0, y: 0 };
    this.idleAngle = 0;
    this.idleSpeed = 0.01; // radians per frame for circular motion

    // Spawn at a helipad if available
    this.spawnPoint = this.selectSpawnPoint();
    if (this.spawnPoint) {
      this.position.x = this.spawnPoint.cx.baseVal.value;
      this.position.y = this.spawnPoint.cy.baseVal.value;
    } else {
      // Fallback to center world position if no helipads
      this.position.x =  this.game.worldMap.width / 2 ;
      this.position.y =  this.game.worldMap.height / 2;
    }

    this.idleCenter = { ...this.position };
    this.target = { ...this.position };
    
    // Ensure behavior-specific properties are applied (sets radius etc)
    this.setIdleBehavior();

    this.init();
  }

  selectSpawnPoint() {
    console.log('select helicopter spawnpoint')
    // Try to get helipads from the SVG
    let svg = this.game.svgLoader.contentDocument.documentElement;
    
    const helipads = svg.querySelectorAll('#helicopter-spawners > ellipse');
    
    if (helipads.length === 0) {
      console.error('no helipads? does g#helicopter-spawners > ellipse > title exist?')
      return null;
    }

    // Select a random helipad
    const randomHelipad = helipads[Math.floor(Math.random() * helipads.length)];
    if (randomHelipad) console.log(`🚁 spawning at #${randomHelipad.parentNode.id} ${randomHelipad.tagName}#${randomHelipad.id}`);

    // Handle both circle and rect elements
    let cx = randomHelipad.cx?.baseVal?.value || 
             randomHelipad.getAttribute('cx') ||
             (randomHelipad.x?.baseVal?.value + randomHelipad.width?.baseVal?.value / 2) ||
             0;
    let cy = randomHelipad.cy?.baseVal?.value || 
             randomHelipad.getAttribute('cy') ||
             (randomHelipad.y?.baseVal?.value + randomHelipad.height?.baseVal?.value / 2) ||
             0;

    return {
      cx: { baseVal: { value: cx } },
      cy: { baseVal: { value: cy } }
    };
  }

  init() {
    // Add the helicopter element to the target layer
    this.targetLayer.appendChild(this.domElement);
    this.domElement.style.setProperty('--x', Math.floor(this.position.x));
    this.domElement.style.setProperty('--y', Math.floor(this.position.y));
    this.domElement.style.setProperty('--rot', this.facingAngle + 'deg');
  }

  /**
   * Set behavior to follow/orbit the player
   */
  setFollowBehavior() {
    this.behavior = 'follow';
    // not collidable while following
    this.radius = 0;
  }

  /**
   * Set behavior to idle (slow circular flight around spawn point)
   */
  setIdleBehavior() {
    this.behavior = 'idle';
    // idle helicopters should not collide with players
    this.radius = 0;
  }

  /**
   * Set behavior to stationary (stay in place)
   */
  setStationaryBehavior() {
    this.behavior = 'stationary';
    // stationary helicopters should be collidable (e.g., landing pad)
    this.radius = 160;
  }

  /**
   * Update helicopter position and behavior
   */
  update(deltaTime) {
    // Update based on behavior
    switch (this.behavior) {
      case 'stationary':
        this.updateStationary(deltaTime);
        break;
      case 'idle':
        this.updateIdle(deltaTime);
        break;
      case 'follow':
        this.updateFollow(deltaTime);
        break;
    }

    this.draw();
  }

  /**
   * Stationary behavior - stay in place
   */
  updateStationary() {
    // Do nothing - stay at current position
  }

  /**
   * Idle behavior - slowly fly in circles around spawn point
   */
  updateIdle(deltaTime) {
    this.idleAngle += this.idleSpeed;

    this.target.x = this.idleCenter.x + Math.cos(this.idleAngle) * this.idleRadius;
    this.target.y = this.idleCenter.y + Math.sin(this.idleAngle) * this.idleRadius;

    this.moveTowardTarget(deltaTime);
    this.lookAtTarget();
  }

  /**
   * Follow behavior - follow/orbit around the player
   */
  updateFollow(deltaTime) {
    const player = this.game.player;
    if (!player) return;

    // **OPTION 3: PREDICTIVE TARGETING** 
    // Calculate where the player will be based on their velocity
    const playerVelX = (player.position.x - (this.prevPlayerPos?.x || player.position.x)) * 0.5;
    const playerVelY = (player.position.y - (this.prevPlayerPos?.y || player.position.y)) * 0.5;
    this.prevPlayerPos = { ...player.position };

    const distanceToPlayer = this.game.getDistance(this.position, player.position);
    const orbitRadius = 8000;
    const minFollowDistance = 1200;

    if (distanceToPlayer > minFollowDistance) {
      // Predict player position ~8 frames ahead and orbit around that
      const predictedPlayerX = player.position.x + playerVelX * 8;
      const predictedPlayerY = player.position.y + playerVelY * 8;
      const angle = Math.atan2(predictedPlayerY - this.position.y, predictedPlayerX - this.position.x);
      
      this.target.x = predictedPlayerX + Math.cos(angle) * orbitRadius;
      this.target.y = predictedPlayerY + Math.sin(angle) * orbitRadius;
    } else {
      // Just look at player
      this.target.x = player.position.x;
      this.target.y = player.position.y;
    }

    this.moveTowardTargetAdaptive(deltaTime);
    this.lookAtTarget();
  }

  /**
   * Move helicopter toward target position (original - fixed lerp)
   */
  moveTowardTarget(deltaTime) {
    // Use a lerp towards the target to produce smooth motion that is independent of viewport
    // deltaTime is in ms; normalize to 60fps base (1000/60 ~= 16.67ms)
    const frameFactor = (deltaTime || 16.67) / (1000 / 60);
    const t = Math.min(1, 0.08 * frameFactor);

    this.position.x = this.game.lerp(this.position.x, this.target.x, t);
    this.position.y = this.game.lerp(this.position.y, this.target.y, t);
  }

  /**
   * Move helicopter toward target - OPTION 2: ADAPTIVE LERP
   * Higher lerp when far away, lower when close to prevent overshoot
   */
  moveTowardTargetAdaptive(deltaTime) {
    const dx = this.target.x - this.position.x;
    const dy = this.target.y - this.position.y;
    const distanceToTarget = Math.hypot(dx, dy);

    const frameFactor = (deltaTime || 16.67) / (1000 / 60);

    // Scale lerp based on distance: 
    // Far (>500px): 0.15, Medium (250-500px): 0.10, Close (<250px): 0.06
    let baseLerp = 0.08;
    if (distanceToTarget > 5000) {
      baseLerp = 0.25;
    } else if (distanceToTarget > 1250) {
      baseLerp = 0.5;
    } else if (distanceToTarget < 100) {
      baseLerp = 0.02;
    }

    const t = Math.min(1, baseLerp * frameFactor);
    this.position.x = this.game.lerp(this.position.x, this.target.x, t);
    this.position.y = this.game.lerp(this.position.y, this.target.y, t);
  }

  /**
   * Make helicopter face toward target
   */
  lookAtTarget() {
    const dx = this.target.x - this.position.x;
    const dy = this.target.y - this.position.y;
    const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);

    // Smoothly rotate toward target
    let angleDiff = angleToTarget - this.facingAngle;
    
    // Normalize angle difference to -180 to 180
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;

    // Rotate towards target at rotationSpeed
    if (Math.abs(angleDiff) > this.rotationSpeed) {
      this.facingAngle += Math.sign(angleDiff) * this.rotationSpeed;
    } else {
      this.facingAngle = angleToTarget;
    }
  }

  /**
   * Draw helicopter on screen
   */
  draw() {
    this.domElement.style.setProperty('--x', Math.floor(this.position.x));
    this.domElement.style.setProperty('--y', Math.floor(this.position.y));
    this.domElement.style.setProperty('--rot', Math.floor(this.facingAngle) + 'deg');
    this.domElement.className = `helicopter helicopter--${this.behavior}`;
  }
}
