import encodedTile from '../assets/blue-noise/thresholds.hex?raw'

export const BLUE_NOISE_SIZE = 64
const hex = encodedTile.replace(/\s/g, '')
if (!/^[0-9a-f]{8192}$/.test(hex)) throw new Error('The bundled blue-noise tile is invalid.')
export const BLUE_NOISE_BYTES: readonly number[] = Object.freeze(Array.from({ length: 4096 }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16)))

export function blueNoiseThreshold(x: number, y: number, scale: number): number {
  const column = Math.floor(x / scale) % BLUE_NOISE_SIZE
  const row = Math.floor(y / scale) % BLUE_NOISE_SIZE
  return (BLUE_NOISE_BYTES[row * BLUE_NOISE_SIZE + column] + 0.5) / 256
}
