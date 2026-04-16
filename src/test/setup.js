import '@testing-library/jest-dom'

// Node 22+ ships an experimental built-in Web Storage API that can be
// enabled via NODE_OPTIONS or user-shell config. When it's on without a
// valid --localstorage-file path, Node installs `localStorage` and
// `sessionStorage` on globalThis as a getter/setter pair backed by a
// stub that is missing methods (notably `.clear()`) and may even throw
// on access. Plain `globalThis.localStorage = ...` routes through that
// setter and doesn't always replace the broken descriptor, so every
// test that does `beforeEach(() => localStorage.clear())` fails with
// `TypeError: localStorage.clear is not a function` depending on the
// user's shell / NODE_OPTIONS (see src/utils/{constants,storage,
// storage.resilience}.test.js).
//
// We force-install a Map-backed polyfill via defineProperty on both
// globalThis and window. That wipes Node's getter/setter descriptor
// entirely and gives us a stable, spec-shaped Storage regardless of
// how the host Node was invoked.
class MemoryStorage {
  constructor() {
    // configurable so ownKeys proxy invariants don't require us to list it
    Object.defineProperty(this, '_m', { value: new Map(), enumerable: false, writable: false, configurable: true })
  }
  get length() { return this._m.size }
  key(i) { return Array.from(this._m.keys())[i] ?? null }
  getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null }
  setItem(k, v) { this._m.set(String(k), String(v)) }
  removeItem(k) { this._m.delete(String(k)) }
  clear() { this._m.clear() }
}

// Wrap in a Proxy so Object.keys(storage) and property-style access reflect
// stored items (per the Web Storage spec). The get/set traps fall through
// to the prototype chain for API methods so tests can monkey-patch
// Storage.prototype (see storage.resilience.test.js 'quota exhaustion').
const isApiKey = (p) => typeof p === 'symbol' || p === '_m' || p in MemoryStorage.prototype
const makeStorage = () => {
  const inst = new MemoryStorage()
  return new Proxy(inst, {
    get(t, p) {
      if (isApiKey(p)) return Reflect.get(t, p, t)
      return t._m.has(String(p)) ? t._m.get(String(p)) : undefined
    },
    set(t, p, v) {
      if (isApiKey(p)) return Reflect.set(t, p, v, t)
      t._m.set(String(p), String(v))
      return true
    },
    has(t, p) { return isApiKey(p) || t._m.has(String(p)) },
    deleteProperty(t, p) { if (isApiKey(p)) return false; t._m.delete(String(p)); return true },
    ownKeys(t) {
      // Must include any non-configurable own property of target (proxy
      // invariant). _m is configurable (see ctor), so listing only the
      // stored item keys here is safe.
      return Array.from(t._m.keys())
    },
    getOwnPropertyDescriptor(t, p) {
      if (isApiKey(p)) return undefined
      if (t._m.has(String(p))) {
        return { value: t._m.get(String(p)), writable: true, enumerable: true, configurable: true }
      }
      return undefined
    },
  })
}

const installStorage = (target, name) => {
  Object.defineProperty(target, name, {
    value: makeStorage(),
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

for (const name of ['localStorage', 'sessionStorage']) {
  installStorage(globalThis, name)
  if (typeof window !== 'undefined') installStorage(window, name)
}
