# Emerald Room Texas Hold'em

A mobile-first React/Vite no-limit Texas Hold'em table: one human player against three AI opponents, full street flow, blinds, betting, raising, folding, all-in runouts, showdown, local stats, bankroll tracking, and hand history.

## Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Notes

- Uses plain React and CSS only.
- No Tailwind, shadcn, or external UI component libraries.
- Stats are stored in `localStorage`.
- AI decision logic is commented in `src/main.jsx`.
