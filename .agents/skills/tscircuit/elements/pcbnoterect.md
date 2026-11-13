# `<pcbnoterect />`

Draw rectangles on your PCB to highlight areas, create visual boundaries, and organize board sections.

## Example

```tsx
export default () => (
  <board width="20mm" height="20mm">
    <pcbnoterect
      pcbX={0}
      pcbY={0}
      width={10}
      height={6}
      strokeWidth={0.3}
      color="#ff0000"
    />
  </board>
)
```

## Props

Commonly used: `width`, `height`, `strokeWidth`, `isFilled`, `hasStroke`, `isStrokeDashed`, `color`, `cornerRadius`

## References

- Props: [PcbNoteRectProps](https://github.com/tscircuit/props#pcbnoterectprops-pcbnoterect)
- Source: [lib/components/pcb-note-rect.ts](https://github.com/tscircuit/props/blob/main/lib/components/pcb-note-rect.ts)
- Local docs: [docs/docs/elements/pcbnoterect.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/elements/pcbnoterect.mdx)
