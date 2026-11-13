# `<resonator />`

Provides a stable frequency reference for circuits, often used in clock or timing applications.

## Example

```tsx
export default () => (
  <board width="10mm" height="10mm">
    <resonator
      name="X1"
      frequency="16MHz"
      loadCapacitance="5pF"
      footprint="hc49"
    />
  </board>
)
```

## Props

Commonly used: `frequency`, `loadCapacitance`, `pinVariant`, `name`, `footprint`, `connections`

## References

- Props: [ResonatorProps](https://github.com/tscircuit/props#resonatorprops-resonator)
- Source: [lib/components/resonator.ts](https://github.com/tscircuit/props/blob/main/lib/components/resonator.ts)
- Local docs: [docs/docs/elements/resonator.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/elements/resonator.mdx)
