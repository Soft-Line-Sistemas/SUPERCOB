import { describe, expect, it } from 'vitest'

import { unwrapCommonJsDefault } from '@/lib/module-interop'

describe('unwrapCommonJsDefault', () => {
  it('returns default export when module is wrapped', () => {
    const target = () => 'ok'

    expect(unwrapCommonJsDefault({ default: target })).toBe(target)
  })

  it('returns the module itself when there is no default wrapper', () => {
    const target = { registerFormat: () => null }

    expect(unwrapCommonJsDefault(target)).toBe(target)
  })

  it('keeps falsey primitives intact', () => {
    expect(unwrapCommonJsDefault(null)).toBeNull()
    expect(unwrapCommonJsDefault(undefined)).toBeUndefined()
  })
})
