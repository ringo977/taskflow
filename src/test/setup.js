import '@testing-library/jest-dom'

// Node 22+ ships an experimental built-in Web Storage API that can be
// enabled via NODE_OPTIONS or user-shell config. When it's on without a
// valid --localstorage-file path, Node prints
//   Warning: `--localstorage-file` was provided without a valid path
// and exposes a stub `localStorage` global that shadows jsdom's full
// implementation and is missing methods like `.clear()`. That breaks
// every test file that does `beforeEach(() => localStorage.clear())`
// (see src/utils/{constants,storage,storage.resilience}.test.js).
//
// jsdom always attaches a working Storage to window. Rebinding the
// bare globals to that Storage makes tests behave identically across
// Node/OS/shell configs. No-op when the shadow isn't present.
if (typeof window !== 'undefined') {
  if (window.localStorage)   globalThis.localStorage   = window.localStorage
  if (window.sessionStorage) globalThis.sessionStorage = window.sessionStorage
}
