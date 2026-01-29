# Helicopter NPC System Implementation

## Overview
Replaced the old prototype helicopter code with a proper NPC-based Helicopter class that integrates with the game's existing architecture.

## Files Created

### `/js/Helicopter.js`
A new class that manages helicopter behavior and rendering.

**Key Features:**
- **Spawning**: Helicopters spawn at random helipad locations (from `#helipads` SVG group) or fallback to random positions
- **Behaviors**: 
  - `stationary`: Stay in one place
  - `idle`: Slowly fly in circles around spawn point
  - `follow`: Follow/orbit around the player
- **Rendering**: Clones the helicopter DOM element from index.html and manages position and rotation
- **Rotor Animation**: Continuously rotates helicopter rotor for visual feedback

**Methods:**
- `selectSpawnPoint()`: Finds random helipad from SVG or returns null
- `setStationaryBehavior()`, `setIdleBehavior()`, `setFollowBehavior()`: Behavior control
- `update(deltaTime)`: Main update loop
- `moveTowardTarget()`: Smooth movement toward target position
- `lookAtTarget()`: Smooth rotation toward target

## Files Modified

### `/js/main.js`
- Added `import Helicopter from './Helicopter.js'`
- Added `this.helicopters = []` and `this.maxHelicopters = 2` to constructor
- Added `spawnHelicopters()` method to instantiate helicopters from helipads
- Integrated helicopter spawning into `addMarshals()` method

### `/js/Player.js`
- Removed old prototype helicopter code (lines 867-892)
- Added helicopter update loop in `update()` method to call `helicopter.update(deltaTime)` for each helicopter

## Configuration

**Max Helicopters**: Default is 2 (configurable via `game.maxHelicopters`)

**Initial Behaviors**: 
- First helicopter: idle (circles around spawn point)
- Second helicopter: stationary (stays at spawn point)
- Can be changed dynamically by calling behavior setter methods

## Usage Examples

```javascript
// Change helicopter behavior during gameplay
game.helicopters[0].setFollowBehavior();  // Make first heli follow player
game.helicopters[1].setIdleBehavior();     // Make second heli idle

// Spawn helicopters happen automatically in addMarshals()
// But can be manually triggered with: game.spawnHelicopters()
```

## Track Support
Helicopters will spawn from helipads if the track has a `#helipads` SVG group with circle or rect elements:
- ✅ austin.svg
- ✅ home.svg
- ✅ assen.svg

For tracks without helipads, helicopters spawn at random positions on the map.
