# Angular Grid Layout
Grid with draggable and resizable items for Angular.

It is basically a port of the well known [React-Grid-Layout](https://github.com/STRML/react-grid-layout) library to Angular ecosystem.

## Features
- No dependencies
- Draggable items
- Resizable items
- REDUX friendly (akita, ngrx, ngxs...)
- Customizable Drag & Resize handles.
- 3 modes of grid compaction: vertical, horizontal and free (exact same algorithm as [React-Grid-Layout](https://github.com/STRML/react-grid-layout))
- Add/Remove items
- High performance

## Installation

To use @katoid/angular-grid-layout in your project install it via [npm](https://www.npmjs.com/package/@katoid/angular-grid-layout):

```
npm install @katoid/angular-grid-layout --save
```

## Usage
Import KtdGridModule to the module where you want to use the grid:

```ts
import { KtdGridModule } from '@katoid/angular-grid-layout';

@NgModule({
  imports: [KtdGridModule]
})
```

Use it in your template:
```angular2html
<ktd-grid [cols]="cols"
          [rowHeight]="rowHeight"
          [layout]="layout"
          (layoutUpdated)="onLayoutUpdated($event)">
    <ktd-grid-item *ngFor="let item of layout; trackBy:trackById" [id]="item.id">
        <!-- Your grid item content goes here -->
    </ktd-grid-item>
</ktd-grid>
```

## Demo
TODO: link to live demo

## API

Here is listed some of the basic API of both KtdGridComponent and KtdGridItemComponent. See source code for full knowledge of the API.

#### KtdGridComponent
```ts
@Component({
    selector: 'ktd-grid'
})
export class KtdGridComponent {
    /** Type of compaction that will be applied to the layout (vertical, horizontal or free). Defaults to 'vertical' */
    @Input() compactType(): KtdGridCompactType = 'vertical';

    /** Row height in css pixels */
    @Input() rowHeight(): number = 100;

    /** Number of columns  */
    @Input() cols(): number = 6;

    /** Layout of the grid. Array of all the grid items with its 'id' and position on the grid. */
    @Input() layout(): KtdGridLayout;

    /** Whether or not to update the internal layout when some dependent property change. */
    @Input() compactOnPropsChange = true;

    /** Emits when layout change */
    @Output() layoutUpdated: EventEmitter<KtdGridLayout> = new EventEmitter<KtdGridLayout>();

    /** Emits when drag starts */
    @Output() dragStarted: EventEmitter<KtdDragStart> = new EventEmitter<KtdDragStart>();

    /** Emits when resize starts */
    @Output() resizeStarted: EventEmitter<KtdResizeStart> = new EventEmitter<KtdResizeStart>();

    /** Emits when drag ends */
    @Output() dragEnded: EventEmitter<KtdDragEnd> = new EventEmitter<KtdDragEnd>();

    /** Emits when resize ends */
    @Output() resizeEnded: EventEmitter<KtdResizeEnd> = new EventEmitter<KtdResizeEnd>();
}
```

#### KtdGridItem
```ts
@Component({
    selector: 'ktd-grid-item'
})
export class KtdGridItemComponent {
    /** Id of the grid item. This property is strictly compulsory. */
    @Input() id: string;

    /** Whether the item is draggable or not. Defaults to true. */
    @Input() draggable: boolean = true;

    /** Whether the item is resizable or not. Defaults to true. */
    @Input() resizable: boolean = true;
    
    /** CSS transition that would be applied */
    @Input() transition: string = 'transform 500ms ease, width 500ms linear, height 500ms linear';

    /** Minimum amount of pixels that the user should move before it starts the drag sequence. */
    @Input() dragStartThreshold: number = 0;
```


## TODO List (issues)

- [x] Add delete feature to Playground page.
- [x] Add example with custom drag handles.
- [x] Add Real life example with charts and grid items with some kind of controls.
- [x] Add dragStartThreshold option to grid items.
- [ ] Add grid gap feature.
- [ ] Deep customizable drag placeholder.
- [ ] Grid support for static grid items.
- [ ] Check grid compact horizontal algorithm, estrange behaviour when overflowing, also in react-grid-layout.
- [ ] Add all other resize options (now is only available 'se-resize').
- [ ] Auto Scroll down if container is scrollable when dragging a grid item.

## Troubleshooting
- Mutating the layout would cause an error like: 'ERROR TypeError: Cannot read property 'id' of undefined'.
- Always use trackBy for the ngFor that renders the ktd-grid-items. If not, Angular would always re-render all items when layout changes.
