# `<hole />`

Used for mounting and does not have conductive properties.

## Example

```tsx
export default () => (
    <board width="30mm" height="20mm">
      <hole diameter="3mm" pcbX={0} pcbY={0} />
    </board>
  )
```

## Props

Commonly used: `name`, `shape`, `diameter`, `radius`, `solderMaskMargin`, `coveredWithSolderMask`, `footprint`, `connections`

## References

- Props: [CircleHoleProps](https://github.com/tscircuit/props#circleholeprops-hole)
- Source: [lib/components/hole.ts](https://github.com/tscircuit/props/blob/main/lib/components/hole.ts)
- Local docs: [docs/docs/elements/hole.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/elements/hole.mdx)
