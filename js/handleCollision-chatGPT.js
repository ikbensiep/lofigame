handleCollision(player, opponent) {
  const dx = player.position.x - opponent.position.x;
  const dy = player.position.y - opponent.position.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);

  if (distance <= player.radius + opponent.radius) {
      // Calculate collision normal angle
      const collisionAngle = Math.atan2(dy, dx);

      // Calculate relative velocity along the collision normal
      const relativeVelocity = Math.cos(player.angle - collisionAngle) * player.velocity - 
                              Math.cos(opponent.angle - collisionAngle) * opponent.velocity;

      // Coefficient of restitution
      const restitutionCoefficient = 0.8; // Adjust this value for desired bounciness

      // Calculate impulse (change in momentum) for both objects
      const impulse = 2 * relativeVelocity * restitutionCoefficient / (player.radius + opponent.radius);

      // Apply impulse to update velocities after collision
      // player.velocity -= impulse * opponent.radius;
      opponent.velocity += impulse * player.radius;

      // Move objects outside collision radius
      const overlap = (player.radius + opponent.radius - distance) / 2;
      player.position.x += overlap * Math.cos(collisionAngle);
      player.position.y += overlap * Math.sin(collisionAngle);
      opponent.position.x -= overlap * Math.cos(collisionAngle);
      opponent.position.y -= overlap * Math.sin(collisionAngle);
  }
}