const palettes = [
  'sunny citrus: tangerine, lemon, cream, ink',
  'berry pop: raspberry, blueberry, vanilla, charcoal',
  'tropical soda: teal, coral, mint, midnight',
  'candy pastel: bubblegum, sky, lilac, graphite',
  'coffee shop: mocha, oat milk, cocoa, black',
  'garden picnic: leaf, strawberry, butter, navy',
]

const vibes = [
  'lighthearted, witty copy with gentle motion',
  'short, punchy headlines and playful asides',
  'whimsical tone, cozy and cheerful',
  'minimal layout with a friendly voice',
  'calm, optimistic, slightly quirky',
]

const motifs = [
  'soft marquee header line',
  'gentle float animation on icons',
  'subtle color pulse on buttons',
  'sliding underline hover on links',
  'simple gradient header band',
]

function pseudoRandom(seed: string): number {
  // simple xorshift-ish from string
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // Map to [0, 1)
  return (h >>> 0) / 0xffffffff
}

function pick<T>(arr: T[], p: number) {
  return arr[Math.floor(p * arr.length) % arr.length]
}

export function randomBrief(seed: string) {
  const p1 = pseudoRandom(seed + 'a')
  const p2 = pseudoRandom(seed + 'b')
  const p3 = pseudoRandom(seed + 'c')
  const palette = pick(palettes, p1)
  const vibe = pick(vibes, p2)
  const motif = pick(motifs, p3)

  return `Palette: ${palette}.\nTone: ${vibe}.\nFeature: ${motif}.\nKeep it simple and sturdy. One big headline, a short list (3 items), and a friendly CTA. Lean on fun language and gentle animation.`
}
