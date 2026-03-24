# Contributing

Thanks for your interest in improving Warframe Companion App.

## Before you start

- Open an issue first for large changes so the direction is clear.
- Keep pull requests focused. One feature or fix per PR is ideal.
- Test the app locally before opening a PR.

## Local setup

```bash
npm install
npm run dev
```

## Build check

Run these before submitting:

```bash
node --check main.js
node --check preload.js
node --check renderer.js
node --check market.js
```

If your change affects packaging, also run:

```bash
npm run build
```

## Coding guidelines

- Follow the existing vanilla JavaScript and CommonJS style.
- Prefer small, readable functions over clever shortcuts.
- Keep UI text clear and consistent.
- Do not commit generated folders like `dist/`, `.protected-app/`, or `node_modules/`.

## Reporting bugs

Please include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your Windows version
- App version
- Screenshots if relevant

## Pull requests

- Describe the change clearly
- Mention any UI or behavior changes
- Include screenshots for visible UI updates when possible

By participating in this project, you agree to follow the code of conduct in `CODE_OF_CONDUCT.md`.
