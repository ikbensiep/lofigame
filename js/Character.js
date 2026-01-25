// @ts-check
/**
 * Character class for pedestrian/walking movement
 * Handles player movement when not in the car
 * Uses the same Emitter sprite system as NPCs
 */
import Emitter from './Emitter.js';

export default class Character {
  constructor(game, position = { x: 0, y: 0 }) {
    this.game = game;
    
    // Position and movement
    this.position = { ...position };
    this.cameraPosition = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.facingAngle = 0;
    
    // Dimensions (much smaller than a car)
    this.width = 64;
    this.height = 64;
    this.radius = 32;
    
    // Movement properties
    this.maxSpeed = 5; // Much slower than car
    this.acceleration = 0.3;
    this.friction = 0.85;
    this.turnSpeed = 0.15;
    
    // Visual representation using Emitter sprite system
    // Get the NPC sprite element to clone its properties
    
    this.sprite = new Emitter(game, window.marshalSprite, this.radius * 2, this.radius * 2, 7, false, this.game.playerLayer, true);
    this.sprite.domElement.classList.add('player-character');

    this.sprite.start(this.position.x, this.position.y, this.facingAngle);
    
    // Collision
    this.colliders = [];
    
    if (this.game.player) this.colliders.push(this.game.player.position.x, this.game.player.position.y, this.game.player.radius);
    if (this.game.player && Array.isArray(this.game.player.colliders)) {
      this.colliders.push(...this.game.player.colliders);
      console.log(this.colliders)
    }
  }

  /**
   * Update character movement based on input
   * @param {Object} input - Input from InputHandler
   * @param {number} deltaTime - Time elapsed since last frame
   */
  update(input, deltaTime) {
    const { keys, gamepad } = input;
    let moveX = 0;
    let moveY = 0;

    // Keyboard input - 8-directional movement
    if (keys && keys.length) {
      if (keys.includes('ArrowUp') || keys.includes('w')) moveY -= 1;
      if (keys.includes('ArrowDown') || keys.includes('s')) moveY += 1;
      if (keys.includes('ArrowLeft') || keys.includes('a')) moveX -= 1;
      if (keys.includes('ArrowRight') || keys.includes('d')) moveX += 1;
    }

    // Gamepad input - use analog stick direction directly (only if no keyboard input)
    if (!keys || !keys.length) {
      if (gamepad && gamepad.axes) {
        moveX = gamepad.axes[0]; // Left stick X
        moveY = gamepad.axes[1]; // Left stick Y
        
        // Apply deadzone
        if (Math.abs(moveX) < 0.1) moveX = 0;
        if (Math.abs(moveY) < 0.1) moveY = 0;
      }
    }

    // Calculate movement direction and update facing angle
    if (moveX !== 0 || moveY !== 0) {
      // Calculate angle from movement vector
      const movementAngle = Math.atan2(moveY, moveX) * 180 / Math.PI;
      this.facingAngle = movementAngle;
      
      // Calculate movement magnitude
      const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
      const moveForward = Math.min(magnitude, 1); // Clamp to 0-1
      
      // Convert facing angle to radians for velocity calculation
      const angleRad = this.facingAngle * Math.PI / 180;
      
      // Accelerate in facing direction
      const accelAmount = 0.3;
      this.velocity.x += Math.cos(angleRad) * moveForward * accelAmount;
      this.velocity.y += Math.sin(angleRad) * moveForward * accelAmount;
    }

    // Apply friction
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

    // Clamp velocity to max speed
    let speed = Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
    );
    speed = Math.round((speed+Number.EPSILON)*1000)/1000;

    if (speed > this.maxSpeed) {
      this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
      this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
    }

    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Keep in bounds (optional, adjust as needed)
    // this.constrainToBounds();

    // Check collisions with obstacles
    this.checkObstacles();

    // Update sprite animation
    if(speed > 0.1) {
      
      this.sprite.update(deltaTime);
    }
  }

  render() {
    if (!this.sprite || !this.sprite.domElement) return;

    // Update the Emitter sprite's internal position
    this.sprite.position.x = Math.floor(this.position.x);
    this.sprite.position.y = Math.floor(this.position.y);
    this.sprite.rotation = Math.floor(this.facingAngle + 90);
    
    // Set speed for animation
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    this.sprite.speed = Math.abs(speed);
    
    // Draw the sprite
    this.sprite.draw();
  }

  /**
   * Check for collisions with obstacles (simplified version)
   */
  checkObstacles() {
    // Build list of targets: first the player's vehicle, then static colliders
    const targets = this.colliders;

    if (!targets.length) return;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];

      // If the target is the Player object and the player is in walking mode,
      // `player.position` may be identical to the character's position (we sync
      // player -> character while walking). Skip resolving against the player
      // itself to avoid immediate zero-distance pushes.
      if (target === this.game.player && this.game.player.mode === 'walking') {
        continue;
      }

      const [collision, distance, sumOfRadii, dx, dy] = this.game.checkCollision(this, target);
      if (!collision) continue;

      // Debug: log collision details to help trace unexpected behavior
      try {
        const targetType = target === this.game.player ? 'player' : (target.type || 'obstacle');
        const tx = target.position ? target.position.x : target.x;
        const ty = target.position ? target.position.y : target.y;
        console.log('CHAR COLLIDE', { targetType, distance, sumOfRadii, dx, dy, charPos: { x: this.position.x, y: this.position.y }, targetPos: { x: tx, y: ty } });
      } catch (e) {
        // swallow logging errors
      }

      // guard against zero distance
      const safeDistance = distance || 0.0001;
      const unitX = dx / safeDistance;
      const unitY = dy / safeDistance;

      // Resolve: push the character out of the collider
      const tx = target.position ? target.position.x : target.x;
      const ty = target.position ? target.position.y : target.y;

      this.position.x = tx + (sumOfRadii + 2) * unitX;
      this.position.y = ty + (sumOfRadii + 2) * unitY;

      // Damp character velocity on impact
      this.velocity.x *= 0.25;
      this.velocity.y *= 0.25;

      // Stop after resolving the first collision this frame to avoid
      // compounded pushes from multiple overlapping colliders.
      break;
    }
  }

  /**
   * Check if character is close enough to enter a vehicle
   * @param {number} proximityRadius - How close the car needs to be
   * @returns {boolean}
   */
  isNearVehicle(proximityRadius = 100) {
    // This will be called from Player to check if we can enter the car
    // For now, assumes car is at player's car position
    const distance = this.game.getDistance(this.position, this.game.player.carPosition);
    return distance < proximityRadius;
  }

  /**
   * Check if gamepad button for entering is pressed
   * Button 3 = Triangle (PS3) / Y (Xbox)
   * @param {Object} gamepad - Gamepad object from input
   * @returns {boolean}
   */
  static isEnterButtonPressed(gamepad) {
    return gamepad && gamepad.buttons && gamepad.buttons[3] && gamepad.buttons[3].pressed;
  }

  /**
   * Clean up the character sprite when exiting
   */
  remove() {
    if (this.sprite && this.sprite.domElement && this.sprite.domElement.parentNode) {
      this.sprite.domElement.parentNode.removeChild(this.sprite.domElement);
    }
    // Mark sprite as free to be reused by the pool if applicable
    if (this.sprite) {
      this.sprite.free = true;
    }
  }
}
