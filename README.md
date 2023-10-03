# Game Concepts

## Garage (player homebase / Team HQ)
The overview screen of the game, aka main menu. 
This is a dashboard of sorts, designed to look like a garage.
Players can customize their game character here as well (name, driver no, etc.)
The starting point to entering an event, as well as the point to return to after attending an event.

## Event
An event takes place inside a world. Events may consist of one or more sessions (testing/free practice, qualifying/hotlaps, race).
In v1 of the game, there will simply be a selection of unconnected events. 
Later, the concept of Competitions and Seasons (container objects) will be introduced.

## World
A world is represented by a racetrack venue. 
This venue is an svg file which will contain several elements, at the very least:

- `#trailer` path. This is the level spawn point object (path, circle, rect or ellipse)
- `#pitbox` path/object - the session HQ
- `#pitlane` path - the centerline of the pitlane
- `#racetrack` path - the centerline of the circuit
  
![image](https://github.com/ikbensiep/lofigame/assets/5741190/112e15cf-31a0-45b3-ac68-8da709c279eb)

(Basically, an svg element with one or more points. Since a path with 1 point is extremely anti-fun to work with, for single point paths use a `<circle>`,`<ellipse`> or `<rect>`. In such cases, the element's cx and cy values will be used to place the single waypoint.)

A world file is separated into layers which the game engine will stack on top of each other -with the player cars, NPCs etc sandwiched in between-, allowing for some more immersion and depth perception.

> **_Eddy's note_**: The specifics of world design (below) should be moved into its own category 

A world should consist of **at least** these 2 layers (or, <g> elements):
- `<g id="ground">` (containing all base artwork) and
- `<g id="elevated">` containing stuff the player can drive underneath

Optionally, a dedicated <g id="track"> may be separated for the design of the racetrack itself, the game wil place this layer between `#world` and `#elevated`.
Of course, the racetrack design may be placed right inside 

These path elements are used to guide the player through the session's phases. (see below)

<small> **_Eddy's note_**: Optionally, additional objects could be added, such as technical inspection / weighbridge / what have you.</small>


### Trailer
The player enters a race circuit (world) event in their trailer on the paddock. This trailer simply obscures the car by sitting on top of it.
From there, the player can choose a _session_ in the event to partake in (overlay screen). 

This is also the place where the player exits the world to return to the Home screen.

### Session
- timed event: testing / practice (set laptimes)
- timed event: qualifying (hotlaps)
- race event: race for the win (over a set amount of laps)

Upon entering a session, the player 's waypoint is set to their pitbox. The player can now drive across the paddock (keeping within a speed limit) to their pitbox.

## Pitbox
In the pitbox, the player can tweak car settings for the session.

Inside their pitbox, the user may 
- tweak car settings 
- return to the track (if there is still time left in the session to do so) or 
- end the session (return to the trailer).

A player may enter the racetrack through exiting the pitlane.

A player can enter the track by following waypoints along #pitlane path until the final waypoint on this path is hit.

The pitlane path always connects to the #racetrack path, through it's beginning and endpoints.

## Racetrack
Once out on the racetrack, after `#racetrack.waypoint[waypoints.length-1]` has been hit or as soon as `racetrack.waypoints[0]` has been hit, the clock starts counting until the next time this happens and when it does, record the laptime.


From here on out the player is free to drive laps on the racetrack or go back to their pitbox. 

