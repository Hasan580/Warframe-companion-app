# Optional Overwolf Electron / GEP setup

The standard Electron application remains the default. The Overwolf Electron
runtime is an opt-in Windows build used only for the supported Game Events
Provider (GEP) integration.

This repository does not contain an Overwolf app key, developer token, API key,
certificate, or proof of production access. Do not commit any of those values.

## What is prepared

- `npm run dev` and the existing `build:*` scripts continue to use standard
  Electron and `electron-builder`.
- `npm run dev:ow` starts the app with `@overwolf/ow-electron`.
- `npm run dev:ow:qa` also selects Overwolf's QA gaming-package channel. Use it
  only when your DevRel has instructed you to test Warframe in that environment.
- `npm run build:ow` uses `@overwolf/ow-electron-builder` for a Windows build.
- The main-process adapter requests only Warframe's `match_info` GEP feature and
  emits only normalized `{ itemType, count }` entries through the preload
  facade. Raw inventory objects are not written to logs or exposed to the
  renderer.

The normal-Electron fallback reports `runtime: "electron"`,
`gepAvailable: false`, and returns no snapshot.

## Registration and GEP access

1. Submit the app idea through Overwolf's onboarding process and identify
   Warframe `match_info` inventory as the required GEP use case.
2. Work with the assigned Overwolf Developer Relations contact (DevRel) to
   register the Electron app. App approval/whitelisting and an assigned App UID
   are external prerequisites; this repository does not generate or assume
   them.
3. Ask DevRel which environment currently supports Warframe for Overwolf
   Electron. If Warframe is available only in DEV, use the QA package URL while
   testing. Before production, tell DevRel the app is ready so they can confirm
   or move support to PROD. Remove the QA URL for a production build.
4. Complete Overwolf QA/release review before claiming production access.

Overwolf derives an ow-electron UID from stable package name/product name and
author fields. Do not casually change those values after registration. Once
`app.whenReady()` has resolved in ow-electron, `OVERWOLF_APP_UID` can be used
for diagnostics; it is assigned by the runtime and is not a secret or a
substitute for registration.

## Local Windows development

Gaming packages require authenticated dev mode even when the app is unpackaged.
Use one of these credential paths in PowerShell:

```powershell
# Overwolf Console account (preferred)
$env:OW_CLI_EMAIL = 'developer@example.com'
$env:OW_CLI_API_KEY = '<console-profile-api-key>'
npm run dev:ow

# Or a temporary token supplied by Overwolf to an approved developer
$env:OW_DEV_KEY = '<dev-token-from-overwolf>'
npm run dev:ow
```

If DevRel confirms Warframe is on the DEV/QA channel:

```powershell
npm run dev:ow:qa
```

`OW_DEV_KEY` is not invented locally. It must be supplied by Overwolf. If none
of these credentials are available, the application itself can still start,
but GEP will be unavailable and the adapter will report that status.

## Production signing and packaging

Current Overwolf guidance requires two independent signing layers for gaming
packages in a distributed Windows build:

1. Overwolf package-integrity signing, authenticated by:
   `OW_CLI_EMAIL`, `OW_CLI_API_KEY`, and `OW_BUILD_KEY`.
2. Authenticode signing of the generated `.exe` with the developer's own
   trusted code-signing certificate, configured using the signing options and
   environment variables supported by electron-builder (for example
   `CSC_LINK` and `CSC_KEY_PASSWORD` for a compatible certificate file).

Obtain `OW_BUILD_KEY` from the registered app's Overwolf Console release
management page. Obtain the API key from the owning Console profile. Obtain the
code-signing certificate from a trusted certificate authority. None are
provided by this project.

Example PowerShell session:

```powershell
$env:OW_CLI_EMAIL = 'developer@example.com'
$env:OW_CLI_API_KEY = '<console-profile-api-key>'
$env:OW_BUILD_KEY = '<registered-app-build-key>'
$env:CSC_LINK = 'C:\secure\codesign-certificate.pfx'
$env:CSC_KEY_PASSWORD = '<certificate-password>'
npm run build:ow
```

Keep credentials in a secret manager or local process environment. Do not put
them in `package.json`, `.env` files committed to Git, build logs, issues, or
screenshots.

An unsigned ow-electron build may complete with a warning, but that does not
mean GEP will load in a distributed app. Verify the resulting executable's
Authenticode signature, install it on a clean Windows test machine, launch
Warframe, and confirm the facade reaches `state: "active"` and produces
normalized snapshots before submitting the build to DevRel/QA.

## Renderer facade

The context-isolated preload exposes:

```js
await window.electronAPI.overwolfInventory.getStatus();
await window.electronAPI.overwolfInventory.getSnapshot();

const removeStatusListener =
  window.electronAPI.overwolfInventory.onStatus((status) => {});
const removeSnapshotListener =
  window.electronAPI.overwolfInventory.onSnapshot((snapshot) => {});
```

Status payloads contain runtime/availability/state/error metadata. Snapshot
payloads contain only the source, game, numeric game ID, capture timestamp, and
normalized item type/count entries.

## Windows-only verification limit

Standard JavaScript tests and normal Electron packaging can run on macOS/Linux.
ow-electron runtime, GEP capture, Overwolf signing, Authenticode signing, and
installed-build validation require Windows plus approved Overwolf credentials.

## Official references

- [Overwolf Electron app idea and whitelisting](https://dev.overwolf.com/ow-electron/getting-started/project-roadmap/)
- [Overwolf Electron GEP overview](https://dev.overwolf.com/ow-electron/live-game-data-gep/live-game-data-gep-intro/)
- [Warframe GEP events](https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/warframe/)
- [Overwolf Electron dev mode](https://dev.overwolf.com/ow-electron/guides/dev-tools/dev-mode/)
- [Overwolf Electron app signing](https://dev.overwolf.com/ow-electron/guides/dev-tools/app-signing/)
- [Overwolf Electron release process](https://dev.overwolf.com/ow-electron/getting-started/release-your-app/)
- [electron-builder Windows code signing](https://www.electron.build/code-signing-win.html)
