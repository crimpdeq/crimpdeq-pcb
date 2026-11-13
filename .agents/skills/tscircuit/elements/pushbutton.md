# `<pushbutton />`

Pushbuttons a common type of switch normally open momentary switch. They are commonly used as a reset or pairing button.

## Example

```tsx
export default () => (
  <board width="10mm" height="10mm">
    <pushbutton
      name="SW1"
      footprint="pushbutton"
    />
  </board>
)
```

## Props

Commonly used: `name`, `footprint`, `connections`

## References

- Props: [PushButtonProps](https://github.com/tscircuit/props#pushbuttonprops-pushbutton)
- Source: [lib/components/push-button.ts](https://github.com/tscircuit/props/blob/main/lib/components/push-button.ts)
- Local docs: [docs/docs/elements/pushbutton.mdx](https://github.com/tscircuit/docs/blob/66254f9aa31eedf4df5557a98ee7025be60ff738/docs/elements/pushbutton.mdx)
