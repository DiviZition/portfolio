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
  "framesX": 8,
  "fps": 8,
  "messageBGColor": "#4ade80",
  "speed": 2,
  "size": 32,
  "messages": ["Hello!"],
  "replyTo": { "any": ["Hi there!"] }
}
```

Omit `spriteSheet` fields to use emoji fallback instead.
