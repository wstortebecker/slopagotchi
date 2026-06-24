import PixelSprite from './PixelSprite.jsx'

/**
 * Curated pixel-icon set for Slopagotchi — the brand's "system glyphs", the
 * LCD-era heart / poop / skull vocabulary drawn as 7px pixel art so they sit
 * natively beside the creatures. Use these instead of any vector icon font on
 * screen surfaces. Never emoji.
 */
export const PIXEL_ICONS = {
  heart: `
.##.##.
#######
#######
#######
.#####.
..###..
...#...
`,
  // the "poop" equivalent — a steaming pile of slop
  slop: `
..#.#..
.#...#.
..###..
.#####.
#######
#######
.#####.
`,
  skull: `
.#####.
#######
#.#.#.#
#######
.#####.
.#.#.#.
.#.#.#.
`,
  zzz: `
.#####.
....##.
...##..
..##...
.##....
.#####.
.......
`,
  bolt: `
...##..
..##...
.####..
...##..
..##...
.##....
#......
`,
  bell: `
...#...
..###..
.#####.
.#####.
#######
.......
...#...
`,
  // a sprout — shown when a pet is thriving
  sprout: `
...#...
.#.#.#.
..###..
#..#..#
...#...
...#...
..###..
`,
  // a tiny flag / streak marker
  star: `
...#...
...#...
#######
.#####.
.#.#.#.
##...##
.......
`,
  cross: `
#.....#
##...##
.##.##.
..###..
.##.##.
##...##
#.....#
`,
  check: `
......#
.....##
#...##.
##.##..
.###...
..#....
.......
`,
}

/**
 * PixelIcon — render a named glyph from PIXEL_ICONS.
 */
export default function PixelIcon({
  name = 'heart',
  scale = 4,
  color = 'var(--lcd-ink)',
  title,
  ...rest
}) {
  const grid = PIXEL_ICONS[name] || PIXEL_ICONS.heart
  return <PixelSprite grid={grid} scale={scale} color={color} aria-label={title || name} {...rest} />
}
