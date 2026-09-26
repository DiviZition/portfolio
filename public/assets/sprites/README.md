# Sprite Sheets

Place character sprite sheets here. Each sheet should be a single horizontal row of frames.

## Format

- **Single row**: frames laid out left-to-right (e.g., walk cycle)
- **Equal width**: total image width / number of frames = frameWidth
- **Square frames** recommended (e.g., 32x32, 64x64)
- **PNG format** with transparency

## Example

If your sprite is 256x32 with 8 frames:
- frameWidth = 256 / 8 = 32
- framesX = 8
- fps = 8 (or whatever animation speed you want)

## Config

Add characters to `config/scene.json`:

```json
{
  "id": "mycharacter",
  "spriteSheet": "assets/sprites/mycharacter.png",
  "frameWidth": 32,
  "frameHeight": 32,
  "framesX": 8,
  "fps": 8,
  "moveSpeed": 2,
  "size": 32,
  "messageBGColor": "#4ade80",
  "messages": ["Hello!"],
  "replyTo": { "any": ["Hi there!"] }
}
```

- `frameWidth` / `frameHeight`: pixel dimensions of a single frame (e.g., 256px image with 8 frames → 32x32)
- `framesX`: number of frames in the horizontal row
- `fps`: animation speed (frames per second)
- `moveSpeed`: movement speed in pixels per frame at 60fps base
- `size`: rendered size on screen

Omit all sprite fields (`spriteSheet`, `frameWidth`, `frameHeight`, `framesX`, `fps`) to use emoji fallback instead.
