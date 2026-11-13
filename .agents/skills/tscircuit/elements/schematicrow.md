# `<schematicrow />`

A row inside `<schematictable />`.

## Example

```tsx
export default () => (
  <schematictable schX={0} schY={0}>
    <schematicrow height={0.6}>
      <schematiccell text="R1" />
      <schematiccell text="10k" />
    </schematicrow>
  </schematictable>
)
```

## Props

Commonly used: `children`, `height`, `schX`, `schY`

## References

- Props: [SchematicRowProps](https://github.com/tscircuit/props#schematicrowprops-schematicrow)
- Source: [lib/components/schematic-row.ts](https://github.com/tscircuit/props/blob/main/lib/components/schematic-row.ts)
- Local docs: [docs/docs/elements/schematictable.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/elements/schematictable.mdx)
