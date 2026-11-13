# `<schematiccell />`

A single cell inside `<schematictable />`.

## Example

```tsx
export default () => (
  <schematictable schX={0} schY={0}>
    <schematicrow height={0.6}>
      <schematiccell text="R1" />
      <schematiccell text="10k" horizontalAlign="center" />
    </schematicrow>
  </schematictable>
)
```

## Props

Commonly used: `children`, `horizontalAlign`, `verticalAlign`, `fontSize`, `rowSpan`, `colSpan`, `width`, `text`

## References

- Props: [SchematicCellProps](https://github.com/tscircuit/props#schematiccellprops-schematiccell)
- Source: [lib/components/schematic-cell.ts](https://github.com/tscircuit/props/blob/main/lib/components/schematic-cell.ts)
- Local docs: [docs/docs/elements/schematictable.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/elements/schematictable.mdx)
