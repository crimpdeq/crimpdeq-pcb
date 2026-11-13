# `<panel />`

Manufacturing panel that arranges one or more boards.

## Example

```tsx
export default () => (
  <panel width="100mm" height="80mm" layoutMode="grid" boardGap="3mm">
    <board width="20mm" height="10mm" />
    <board width="20mm" height="10mm" />
  </panel>
)
```

## Props

Commonly used: `width`, `height`, `children`, `anchorAlignment`, `noSolderMask`, `panelizationMethod`, `boardGap`, `layoutMode`

## References

- Props: [PanelProps](https://github.com/tscircuit/props#panelprops-panel)
- Source: [lib/components/panel.ts](https://github.com/tscircuit/props/blob/main/lib/components/panel.ts)
- Local docs: [docs/docs/guides/tscircuit-essentials/panelization.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/guides/tscircuit-essentials/panelization.mdx)
