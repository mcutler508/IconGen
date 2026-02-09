import { describe, it, expect } from 'vitest'
import { validateFileType, validateFileSize, formatFileSize } from './validation.ts'

function makeFile(name: string, type: string, sizeBytes: number): File {
  const buffer = new ArrayBuffer(sizeBytes)
  return new File([buffer], name, { type })
}

describe('validateFileType', () => {
  it('accepts PNG files', () => {
    const file = makeFile('test.png', 'image/png', 1024)
    expect(validateFileType(file)).toEqual({ valid: true })
  })

  it('accepts JPEG files', () => {
    const file = makeFile('test.jpg', 'image/jpeg', 1024)
    expect(validateFileType(file)).toEqual({ valid: true })
  })

  it('accepts WebP files', () => {
    const file = makeFile('test.webp', 'image/webp', 1024)
    expect(validateFileType(file)).toEqual({ valid: true })
  })

  it('rejects GIF files', () => {
    const file = makeFile('test.gif', 'image/gif', 1024)
    const result = validateFileType(file)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('Unsupported file type')
    }
  })

  it('rejects SVG files', () => {
    const file = makeFile('test.svg', 'image/svg+xml', 1024)
    const result = validateFileType(file)
    expect(result.valid).toBe(false)
  })

  it('rejects PDF files', () => {
    const file = makeFile('test.pdf', 'application/pdf', 1024)
    const result = validateFileType(file)
    expect(result.valid).toBe(false)
  })

  it('rejects files with empty type', () => {
    const file = makeFile('test.xyz', '', 1024)
    const result = validateFileType(file)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('unknown')
    }
  })
})

describe('validateFileSize', () => {
  it('accepts files under 20 MB', () => {
    const file = makeFile('small.png', 'image/png', 1024 * 1024) // 1 MB
    expect(validateFileSize(file)).toEqual({ valid: true })
  })

  it('accepts files exactly 20 MB', () => {
    const file = makeFile('exact.png', 'image/png', 20 * 1024 * 1024)
    expect(validateFileSize(file)).toEqual({ valid: true })
  })

  it('rejects files over 20 MB', () => {
    const file = makeFile('big.png', 'image/png', 20 * 1024 * 1024 + 1)
    const result = validateFileSize(file)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('20 MB')
    }
  })

  it('rejects very large files', () => {
    const file = makeFile('huge.png', 'image/png', 100 * 1024 * 1024)
    const result = validateFileSize(file)
    expect(result.valid).toBe(false)
  })
})

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
