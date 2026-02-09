/**
 * Dynamic OpenCV.js loader via script tag injection.
 * Loads opencv.js from /opencv.js (public folder) on first use.
 *
 * CRITICAL: The Emscripten-built cv object has a .then() method,
 * making it "thenable". If any promise resolves or returns this
 * object, the Promise spec unwraps it recursively via cv.then(),
 * causing the promise to never settle with the cv object itself.
 *
 * Solution: We delete cv.then after initialization, store cv in
 * module scope, and resolve the load signal with void.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let cvInstance: any = null
let loadSignal: Promise<void> | null = null

export async function loadOpenCV(): Promise<any> {
  if (cvInstance) return cvInstance

  if (!loadSignal) {
    loadSignal = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        loadSignal = null
        reject(new Error('OpenCV.js load timed out after 60s'))
      }, 60000)

      let done = false
      const finish = (cv: any) => {
        if (done) return
        done = true
        clearTimeout(timeout)
        // Remove .then() so cv is no longer "thenable" — prevents
        // Promise.resolve(cv) from recursively unwrapping it.
        if (cv && typeof cv.then === 'function') {
          delete cv.then
        }
        cvInstance = cv
        resolve()
      }

      // Pre-configure the cv module with onRuntimeInitialized
      // Emscripten reads: var Module = typeof cv !== "undefined" ? cv : {}
      ;(window as any).cv = {
        onRuntimeInitialized() {
          finish((window as any).cv)
        },
      }

      const script = document.createElement('script')
      script.src = '/opencv.js'
      script.async = true

      script.onload = () => {
        const cv = (window as any).cv
        if (cv && typeof cv.Mat === 'function') {
          finish(cv)
          return
        }
        if (cv && typeof cv.then === 'function') {
          cv.then((readyCv: any) => finish(readyCv))
          return
        }
      }

      script.onerror = () => {
        clearTimeout(timeout)
        loadSignal = null
        ;(window as any).cv = undefined
        reject(new Error('Failed to load OpenCV.js script'))
      }

      document.head.appendChild(script)
    })
  }

  await loadSignal
  return cvInstance
}

export function isOpenCVLoaded(): boolean {
  return cvInstance !== null
}
