# For You / Failed Family Archive

A fast Three.js prototype for a bilingual interactive artwork about a family event that cannot be cleanly classified.

The original script functions as a memory database. The website is not a scene-by-scene adaptation of that script; it is a failed archive and classification machine. It begins as an over-organized family document interface, then breaks down through interaction as records conflict, labels fail, and categories refuse to stay stable.

## Run

```bash
npm install
npm run dev
```

## Concept

The system attempts to sort one family event into categories such as child / parent / grandparent, care / control, home / registration, memory / evidence, help / disconnection, and labor / mourning.

Every interaction produces another record, but not a final truth. Fragments overlap, redactions accumulate, fields are crossed out, and silence is recorded as data.

## Asset Replacement

All image and audio paths live in `src/config.js`. Missing image assets automatically fall back to colored placeholder planes. Missing audio files fall back to small Web Audio tones.
