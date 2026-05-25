# tensile

Interactive React Three Fiber prototype for a motorized tensile strip installation.

## Setup

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Controls

- `Demo` / `Manual`: switch between the animated sequence and direct motor control. Switching to Manual pauses playback.
- `Play` / `Pause`: controls timeline playback.
- `Restart`: resets the frame counter.
- Strip sliders: each strip has independent top and bottom motor controls.
- `f`: reset the camera view.
- `F1`: toggle developer lighting/post-processing controls.

## Look Settings

Open the `Look` panel to adjust:

- scene lighting preset: `Dark` or `Bright`
- strip color
- material finish: `Matte`, `Satin`, or `Gloss`
- translucency