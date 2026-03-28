import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from './storage'

beforeEach(() => localStorage.clear())

describe('storage', () => {
  describe('get/set round-trip', () => {
    it('stores and retrieves a string', () => {
      storage.set('lang', 'it')
      expect(storage.get('lang')).toBe('it')
    })

    it('stores and retrieves an object', () => {
      const obj = { a: 1, b: [2, 3] }
      storage.set('data', obj)
      expect(storage.get('data')).toEqual(obj)
    })

    it('stores and retrieves an array', () => {
      storage.set('list', [1, 'two', null])
      expect(storage.get('list')).toEqual([1, 'two', null])
    })

    it('stores booleans and numbers correctly', () => {
      storage.set('bool', false)
      storage.set('num', 0)
      expect(storage.get('bool')).toBe(false)
      expect(storage.get('num')).toBe(0)
    })
  })

  describe('get fallback', () => {
    it('returns fallback for missing key', () => {
      expect(storage.get('missing', 'default')).toBe('default')
    })

    it('returns null when no fallback given', () => {
      expect(storage.get('missing')).toBeNull()
    })

    it('returns fallback for corrupted JSON', () => {
      localStorage.setItem('tf_bad', '{not json')
      expect(storage.get('bad', 'safe')).toBe('safe')
    })
  })

  describe('remove', () => {
    it('removes a key', () => {
      storage.set('tmp', 42)
      storage.remove('tmp')
      expect(storage.get('tmp')).toBeNull()
    })
  })

  describe('clear', () => {
    it('removes only tf_ prefixed keys', () => {
      storage.set('a', 1)
      storage.set('b', 2)
      localStorage.setItem('other', 'keep')
      storage.clear()
      expect(storage.get('a')).toBeNull()
      expect(storage.get('b')).toBeNull()
      expect(localStorage.getItem('other')).toBe('keep')
    })
  })

  describe('key isolation', () => {
    it('prefixes keys with tf_', () => {
      storage.set('test', 'value')
      expect(localStorage.getItem('tf_test')).toBe('"value"')
      expect(localStorage.getItem('test')).toBeNull()
    })
  })
})
