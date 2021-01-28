# Angular Grid Layout
Minimalistic port of the library 'React Grid Layout (https://github.com/STRML/react-grid-layout)' to Angular

## Usage Example
TODO: link to live demo

## Troubleshooting
- Mutating the layout would cause an error like: 'ERROR TypeError: Cannot read property 'id' of undefined'.
- Always use trackBy for the ngFor that renders the ktd-grid-items. If not, Angular would always re-render all items when layout changes.

## TODO List

- [x] Playground, add delete feature.
- [x] Add example with custom drag handles.
- [x] Add Real life example with charts and grid items with some kind of controls.
- [x] Grid items add dragStartThreshold option.
- [ ] Bug when dragging grid item if there is some inner grid item text selected.
- [ ] Add grid gap feature.
- [ ] Deep customizable drag placeholder.
- [ ] Grid support for static grid items.
- [ ] Check grid compact horizontal algorithm, estrange behaviour when overflowing, also in react-grid-layout.
- [ ] Add all other resize options (now is only available 'se-resize').
- [ ] Auto Scroll down if container is scrollable when dragging a grid item.
