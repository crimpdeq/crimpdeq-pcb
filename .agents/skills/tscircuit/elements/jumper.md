# `<jumper />`

A simple connector that typically uses a pinrow footprint but can be used for custom layouts as well.

## Example

```tsx
export default () => (
  <board width="10mm" height="10mm">
    <jumper name="J1" footprint="pinrow4" />
  </board>
)
```

## Props

Commonly used: `manufacturerPartNumber`, `pinLabels`, `schPinStyle`, `schPinSpacing`, `schWidth`, `schHeight`, `schDirection`, `schPinArrangement`

## References

- Props: [JumperProps](https://github.com/tscircuit/props#jumperprops-jumper)
- Source: [lib/components/jumper.ts](https://github.com/tscircuit/props/blob/main/lib/components/jumper.ts)
- Local docs: [docs/docs/elements/jumper.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/elements/jumper.mdx)
