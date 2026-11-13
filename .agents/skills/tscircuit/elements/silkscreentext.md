# `<silkscreentext />`

The `<silkscreentext />` element is used to add text to the silkscreen layer within a PCB footprint.

## Example

```tsx
export default () => (
  <board width="10mm" height="10mm">
    <silkscreentext text="Hello, World!" fontSize="1mm" />
  </board>
)
```

## Props

Commonly used: `text`, `anchorAlignment`, `font`, `fontSize`, `isKnockout`, `knockoutPadding`, `knockoutPaddingLeft`, `knockoutPaddingRight`

## References

- Props: [SilkscreenTextProps](https://github.com/tscircuit/props#silkscreentextprops-silkscreentext)
- Source: [lib/components/silkscreen-text.ts](https://github.com/tscircuit/props/blob/main/lib/components/silkscreen-text.ts)
- Local docs: [docs/docs/footprints/silkscreentext.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/footprints/silkscreentext.mdx)
