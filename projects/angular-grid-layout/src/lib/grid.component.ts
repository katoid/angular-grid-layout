import {
    AfterContentChecked,
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ContentChildren,
    ElementRef,
    EmbeddedViewRef,
    EventEmitter,
    Input,
    NgZone,
    OnChanges,
    OnDestroy,
    Output,
    QueryList,
    Renderer2,
    SimpleChanges,
    ViewContainerRef,
    ViewEncapsulation
} from '@angular/core';
import { coerceNumberProperty, NumberInput } from './coercion/number-property';
import { KtdGridItemComponent} from './grid-item/grid-item.component';
import { combineLatest, merge, NEVER, Observable, of, Subscription} from 'rxjs';
import {exhaustMap, map, startWith, switchMap, takeUntil} from 'rxjs/operators';
import {
    ktdGetGridItemRowHeight,
    ktdGridItemDragging, ktdGridItemLayoutItemAreEqual,
    ktdGridItemResizing
} from './utils/grid.utils';
import {compact, Layout} from './utils/react-grid-layout.utils';
import {
    DragActionType,
    GRID_ITEM_GET_RENDER_DATA_TOKEN,
    KtdGridBackgroundCfg,
    KtdGridCfg,
    KtdGridCompactType,
    KtdGridItemRenderData,
    KtdGridLayout,
    KtdGridLayoutItem,
} from './grid.definitions';
import { ktdPointerClientX, ktdPointerClientY } from './utils/pointer.utils';
import { KtdDictionary } from '../types';
import {KtdGridService, PointerEventInfo} from './grid.service';
import { getMutableClientRect, KtdClientRect } from './utils/client-rect';
import { ktdGetScrollTotalRelativeDifference$, ktdScrollIfNearElementClientRect$ } from './utils/scroll';
import { BooleanInput, coerceBooleanProperty } from './coercion/boolean-property';
import { KtdGridItemPlaceholder} from './directives/placeholder';
import { getTransformTransitionDurationInMs } from './utils/transition-duration';
import {KtdRegistryService} from "./ktd-registry.service";
import {DragRef} from "./utils/drag-ref";
import {KtdDrag} from "./directives/ktd-drag";

// region Types

interface KtdGridDrag {
    dragSubscription: Subscription | null;
    scrollSubscription: Subscription | null;
    startEvent: MouseEvent | TouchEvent;
    newLayout: Layout | null;
}

interface KtdDragResizeEvent {
    layout: KtdGridLayout;
    layoutItem: KtdGridLayoutItem;
    gridItemRef: KtdGridItemComponent | KtdDrag<any>; //
}

export type KtdDragStart = KtdDragResizeEvent;
export type KtdDragEnter = KtdGridEnterLeaveEvent;
export type KtdDragLeave = KtdGridEnterLeaveEvent;
export type KtdDragEnd = KtdDragResizeEvent;
export type KtdDropped<T = any> = KtdDroppedEvent<T>;

export type KtdResizeStart = KtdDragResizeEvent;
export type KtdResizeEnd = KtdDragResizeEvent;

interface KtdDroppedEvent<T> {
    event: PointingDeviceEvent;
    currentLayout: KtdGridLayout;
    currentLayoutItem: KtdGridLayoutItem<T>;
}

export interface KtdGridItemResizeEvent {
    width: number;
    height: number;
    gridItemRef: KtdGridItemComponent;
}

export type PointingDeviceEvent = MouseEvent | TouchEvent | PointerEvent;

export interface KtdGridEnterLeaveEvent {
    grid: KtdGridComponent;
    event: PointingDeviceEvent;
    source: DragRef;
    dragInfo: PointerEventInfo;
}

export function getDragResizeEventData(dragRef: DragRef, layout: KtdGridLayout): KtdDragResizeEvent {
    return {
        layout,
        layoutItem: dragRef.itemRef instanceof KtdGridItemComponent ? layout.find((item) => item.id === dragRef.id)! : {
            id: dragRef.id,
            x: 0,
            y: 0,
            w: 1,
            h: 1,
        },
        gridItemRef: dragRef.itemRef,
    };
}

function getColumnWidth(config: KtdGridCfg, width: number): number {
    const {cols, gap} = config;
    const widthExcludingGap = width - Math.max((gap * (cols - 1)), 0);
    return (widthExcludingGap / cols);
}

function getRowHeightInPixels(config: KtdGridCfg, height: number): number {
    const {rowHeight, layout, gap} = config;
    return rowHeight === 'fit' ? ktdGetGridItemRowHeight(layout, height, gap) : rowHeight;
}

function layoutToRenderItems(
    config: KtdGridCfg,
    width: number,
    height: number,
    draggingLayoutItem: KtdGridLayoutItem | null = null
): { dict: KtdDictionary<KtdGridItemRenderData<number>>, draggingItem: KtdGridItemRenderData<number> | null } {
    const {layout, gap} = config;
    const rowHeightInPixels = getRowHeightInPixels(config, height);
    const itemWidthPerColumn = getColumnWidth(config, width);
    const renderItems: KtdDictionary<KtdGridItemRenderData<number>> = {};
    for (const item of layout) {
        renderItems[item.id] = {
            id: item.id,
            top: item.y * rowHeightInPixels + gap * item.y,
            left: item.x * itemWidthPerColumn + gap * item.x,
            width: item.w * itemWidthPerColumn + gap * Math.max(item.w - 1, 0),
            height: item.h * rowHeightInPixels + gap * Math.max(item.h - 1, 0),
        };
    }
    return {
        dict: renderItems,
        draggingItem: draggingLayoutItem !== null ? {
            id: draggingLayoutItem.id,
            top: draggingLayoutItem.y * rowHeightInPixels + gap * draggingLayoutItem.y,
            left: draggingLayoutItem.x * itemWidthPerColumn + gap * draggingLayoutItem.x,
            width: draggingLayoutItem.w * itemWidthPerColumn + gap * Math.max(draggingLayoutItem.w - 1, 0),
            height: draggingLayoutItem.h * rowHeightInPixels + gap * Math.max(draggingLayoutItem.h - 1, 0),
        } : null,
    };
}

function getGridHeight(layout: KtdGridLayout, rowHeight: number, gap: number): number {
    return layout.reduce((acc, cur) => Math.max(acc, (cur.y + cur.h) * rowHeight + Math.max(cur.y + cur.h - 1, 0) * gap), 0);
}

// eslint-disable-next-line @katoid/prefix-exported-code
export function __gridItemGetRenderDataFactoryFunc(gridCmp: KtdGridComponent) {
    return function(id: string) {
        return gridCmp.getItemRenderData(id);
    };
}

export function ktdGridItemGetRenderDataFactoryFunc(gridCmp: KtdGridComponent) {
    // Workaround explained: https://github.com/ng-packagr/ng-packagr/issues/696#issuecomment-387114613
    const resultFunc = __gridItemGetRenderDataFactoryFunc(gridCmp);
    return resultFunc;
}

const defaultBackgroundConfig: Required<Omit<KtdGridBackgroundCfg, 'show'>> = {
    borderColor: '#ffa72678',
    gapColor: 'transparent',
    rowColor: 'transparent',
    columnColor: 'transparent',
    borderWidth: 1,
};

// endregion

@Component({
    selector: 'ktd-grid',
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: GRID_ITEM_GET_RENDER_DATA_TOKEN,
            useFactory: ktdGridItemGetRenderDataFactoryFunc,
            deps: [KtdGridComponent]
        }
    ]
})
export class KtdGridComponent implements OnChanges, AfterContentInit, AfterContentChecked, OnDestroy {
    // region Parameters
    private static _nextUniqueId: number = 0;

    /** Query list of grid items that are being rendered. */
    @ContentChildren(KtdGridItemComponent, {descendants: true}) private _gridItems: QueryList<KtdGridItemComponent>;

    /** Emits when layout change */
    @Output() layoutUpdated: EventEmitter<KtdGridLayout> = new EventEmitter<KtdGridLayout>();

    /** Emits when drag starts */
    @Output() dragStarted: EventEmitter<KtdDragStart> = new EventEmitter<KtdDragStart>();

    /** Emits when user moves the item into the grid. Being emitted from grid.service. */
    @Output() dragEntered: EventEmitter<KtdDragEnter> = new EventEmitter<KtdDragEnter>();

    /** Emits when user moves the item out of the grid. Being emitted from grid.service. */
    @Output() dragExited: EventEmitter<KtdDragLeave> = new EventEmitter<KtdDragLeave>();

    /** Emits when drag ends */
    @Output() dragEnded: EventEmitter<KtdDragEnd> = new EventEmitter<KtdDragEnd>();

    /** Emits when user drops an item to this grid */
    @Output() dropped: EventEmitter<KtdDropped> = new EventEmitter<KtdDropped>();

    /** Emits when resize starts */
    @Output() resizeStarted: EventEmitter<KtdResizeStart> = new EventEmitter<KtdResizeStart>();

    /** Emits when resize ends */
    @Output() resizeEnded: EventEmitter<KtdResizeEnd> = new EventEmitter<KtdResizeEnd>();

    /** Emits when a grid item is being resized and its bounds have changed */
    @Output() gridItemResize: EventEmitter<KtdGridItemResizeEvent> = new EventEmitter<KtdGridItemResizeEvent>();

    /**
     * Parent element that contains the scroll. If an string is provided it would search that element by id on the dom.
     * If no data provided or null autoscroll is not performed.
     */
    @Input() scrollableParent: HTMLElement | Document | string | null = null;

    @Input()
    get id(): string { return this._id; }
    set id(val: string) {
        this._id = val;
    }
    private _id: string = `ktd-grid-${KtdGridComponent._nextUniqueId++}`;

    /** Whether or not to update the internal layout when some dependent property change. */
    @Input()
    get compactOnPropsChange(): boolean { return this._compactOnPropsChange; }
    set compactOnPropsChange(value: boolean) {
        this._compactOnPropsChange = coerceBooleanProperty(value);
    }
    private _compactOnPropsChange: boolean = true;

    /** If true, grid items won't change position when being dragged over. Handy when using no compaction */
    @Input()
    get preventCollision(): boolean { return this._preventCollision; }
    set preventCollision(value: boolean) {
        this._preventCollision = coerceBooleanProperty(value);
    }
    private _preventCollision: boolean = false;

    /** Number of CSS pixels that would be scrolled on each 'tick' when auto scroll is performed. */
    @Input()
    get scrollSpeed(): number { return this._scrollSpeed; }
    set scrollSpeed(value: number) {
        this._scrollSpeed = coerceNumberProperty(value, 2);
    }
    private _scrollSpeed: number = 2;

    /** Type of compaction that will be applied to the layout (vertical, horizontal or free). Defaults to 'vertical' */
    @Input()
    get compactType(): KtdGridCompactType { return this._compactType; }
    set compactType(val: KtdGridCompactType) {
        this._compactType = val;
    }
    private _compactType: KtdGridCompactType = 'vertical';

    /**
     * Row height as number or as 'fit'.
     * If rowHeight is a number value, it means that each row would have those css pixels in height.
     * if rowHeight is 'fit', it means that rows will fit in the height available. If 'fit' value is set, a 'height' should be also provided.
     */
    @Input()
    get rowHeight(): number | 'fit' { return this._rowHeight; }
    set rowHeight(val: number | 'fit') {
        this._rowHeight = val === 'fit' ? val : Math.max(1, Math.round(coerceNumberProperty(val)));
    }
    private _rowHeight: number | 'fit' = 100;

    /** Number of columns  */
    @Input()
    get cols(): number { return this._cols; }
    set cols(val: number) {
        this._cols = Math.max(1, Math.round(coerceNumberProperty(val)));
    }
    private _cols: number = 6;

    /** Layout of the grid. Array of all the grid items with its 'id' and position on the grid. */
    @Input()
    get layout(): KtdGridLayout { return this._layout; }
    set layout(layout: KtdGridLayout) {
        /**
         * Enhancement:
         * Only set layout if it's reference has changed and use a boolean to track whenever recalculate the layout on ngOnChanges.
         *
         * Why:
         * The normal use of this lib is having the variable layout in the outer component or in a store, assigning it whenever it changes and
         * binded in the component with it's input [layout]. In this scenario, we would always calculate one unnecessary change on the layout when
         * it is re-binded on the input.
         */
        this._layout = layout;
    }
    private _layout: KtdGridLayout;

    /** Grid gap in css pixels */
    @Input()
    get gap(): number { return this._gap; }
    set gap(val: number) {
        this._gap = Math.max(coerceNumberProperty(val), 0);
    }
    private _gap: number = 0;

    /**
     * If height is a number, fixes the height of the grid to it, recommended when rowHeight = 'fit' is used.
     * If height is null, height will be automatically set according to its inner grid items.
     * Defaults to null.
     * */
    @Input()
    get height(): number | null { return this._height; }
    set height(val: number | null) {
        this._height = typeof val === 'number' ? Math.max(val, 0) : null;
    }
    private _height: number | null = null;

    @Input()
    get backgroundConfig(): KtdGridBackgroundCfg | null { return this._backgroundConfig; }
    set backgroundConfig(val: KtdGridBackgroundCfg | null) {
        this._backgroundConfig = val;

        // If there is background configuration, add main grid background class. Grid background class comes with opacity 0.
        // It is done this way for adding opacity animation and to don't add any styles when grid background is null.
        const classList = this.gridElement.classList;
        this._backgroundConfig !== null ? classList.add('ktd-grid-background') : classList.remove('ktd-grid-background');

        // Set background visibility
        this.setGridBackgroundVisible(this._backgroundConfig?.show === 'always');
    }
    private _backgroundConfig: KtdGridBackgroundCfg | null = null;

    private gridCurrentHeight: number;

    get config(): KtdGridCfg {
        return {
            cols: this.cols,
            rowHeight: this.rowHeight,
            height: this.height,
            layout: this.layout,
            preventCollision: this.preventCollision,
            gap: this.gap,
            gridId: this.id,
        };
    }

    /** Reference to the view of the placeholder element. */
    private placeholderRef: EmbeddedViewRef<any> | null;

    /** Element that is rendered as placeholder when a grid item is being dragged */
    private placeholder: HTMLElement | null;

    private _gridItemsRenderData: KtdDictionary<KtdGridItemRenderData<number>>;
    private subscriptions: Subscription[];

    public get drag(): KtdGridDrag | null {
        return this._drag;
    }
    private _drag: KtdGridDrag | null = null;

    private readonly gridElement: HTMLElement;

    // endregion

    constructor(private gridService: KtdGridService,
                private ktdRegistryService: KtdRegistryService,
                private elementRef: ElementRef,
                private viewContainerRef: ViewContainerRef,
                private renderer: Renderer2,
                private ngZone: NgZone
    ) {
        this.gridElement = this.elementRef.nativeElement as HTMLElement;
        this.ktdRegistryService.registerKtdGrid(this);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.rowHeight === 'fit' && this.height == null) {
            console.warn(`KtdGridComponent: The @Input() height should not be null when using rowHeight 'fit'`);
        }

        let needsCompactLayout = false;
        let needsRecalculateRenderData = false;

        // TODO: Does fist change need to be compacted by default?
        // Compact layout whenever some dependent prop changes.
        if (changes.compactType || changes.cols || changes.layout) {
            needsCompactLayout = true;
        }

        // Check if wee need to recalculate rendering data.
        if (needsCompactLayout || changes.rowHeight || changes.height || changes.gap || changes.backgroundConfig) {
            needsRecalculateRenderData = true;
        }

        // Only compact layout if lib user has provided it. Lib users that want to save/store always the same layout  as it is represented (compacted)
        // can use KtdCompactGrid utility and pre-compact the layout. This is the recommended behaviour for always having a the same layout on this component
        // and the ones that uses it.
        if (needsCompactLayout && this.compactOnPropsChange) {
            this.compactLayout();
        }

        if (needsRecalculateRenderData) {
            this.calculateRenderData();
        }
    }

    ngAfterContentInit() {
        this.initSubscriptions();
    }

    ngAfterContentChecked() {
        this.render();
    }

    resize() {
        this.calculateRenderData();
        this.render();
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.ktdRegistryService.unregisterKtdGrid(this);
    }

    compactLayout() {
        this.layout = compact(this.layout, this.compactType, this.cols);
    }

    getItemsRenderData(): KtdDictionary<KtdGridItemRenderData<number>> {
        return {...this._gridItemsRenderData};
    }

    getItemRenderData(itemId: string): KtdGridItemRenderData<number> {
        return this._gridItemsRenderData[itemId];
    }

    calculateRenderData() {
        const clientRect = this.gridElement.getBoundingClientRect();
        this.gridCurrentHeight = this.height ?? (this.rowHeight === 'fit' ? clientRect.height : getGridHeight(this.layout, this.rowHeight, this.gap));
        const {dict} = layoutToRenderItems(this.config, clientRect.width, this.gridCurrentHeight);
        this._gridItemsRenderData = dict;

        // Set Background CSS variables
        this.setBackgroundCssVariables(getRowHeightInPixels(this.config, this.gridCurrentHeight));
    }

    render() {
        this.renderer.setStyle(this.gridElement, 'height', `${this.gridCurrentHeight}px`);
        this.updateGridItemsStyles();
    }

    private setBackgroundCssVariables(rowHeight: number) {
        const style = (this.gridElement as HTMLDivElement).style;

        if (this._backgroundConfig) {
            // structure
            style.setProperty('--gap', this.gap + 'px');
            style.setProperty('--row-height', rowHeight + 'px');
            style.setProperty('--columns', `${this.cols}`);
            style.setProperty('--border-width', (this._backgroundConfig.borderWidth ?? defaultBackgroundConfig.borderWidth) + 'px');

            // colors
            style.setProperty('--border-color', this._backgroundConfig.borderColor ?? defaultBackgroundConfig.borderColor);
            style.setProperty('--gap-color', this._backgroundConfig.gapColor ?? defaultBackgroundConfig.gapColor);
            style.setProperty('--row-color', this._backgroundConfig.rowColor ?? defaultBackgroundConfig.rowColor);
            style.setProperty('--column-color', this._backgroundConfig.columnColor ?? defaultBackgroundConfig.columnColor);
        } else {
            style.removeProperty('--gap');
            style.removeProperty('--row-height');
            style.removeProperty('--columns');
            style.removeProperty('--border-width');
            style.removeProperty('--border-color');
            style.removeProperty('--gap-color');
            style.removeProperty('--row-color');
            style.removeProperty('--column-color');
        }
    }

    private updateGridItemsStyles() {
        this._gridItems.forEach(item => {
            const gridItemRenderData: KtdGridItemRenderData<number> | undefined = this._gridItemsRenderData[item.id];
            if (gridItemRenderData == null) {
                console.error(`Couldn\'t find the specified grid item for the id: ${item.id}`);
            } else {
                item.setStyles(gridItemRenderData);
            }
        });
    }

    public setGridBackgroundVisible(visible: boolean) {
        const classList = this.gridElement.classList;
        visible ? classList.add('ktd-grid-background-visible') : classList.remove('ktd-grid-background-visible');
    }

    private initSubscriptions() {
        // const itemsConnectedToGrid$ = this.ktdRegistryService.getKtdDragItemsConnectedToGrid(this);
        this.subscriptions = [
            this._gridItems.changes.pipe(
                startWith(this._gridItems),
                switchMap((gridItems: QueryList<KtdGridItemComponent>) => {
                    return merge(
                        ...gridItems.map((gridItem) => gridItem.dragStart.pipe(map(({event}) => ({
                            event,
                            gridItem,
                            type: 'drag' as DragActionType
                        })))),
                        ...gridItems.map((gridItem) => gridItem.resizeStart$.pipe(map((event) => ({
                            event,
                            gridItem,
                            type: 'resize' as DragActionType,
                        })))),
                    ).pipe(exhaustMap((data) => of(data)));
                })
            ).subscribe(({event, gridItem, type}) => {
                // Prevents the event from bubbling up the DOM tree, preventing any parent event handlers from being notified of the event.
                // Specifically, it prevents the event from being sent to any parent event handlers that may be listening for it.
                if (type === 'resize') {
                    event.stopPropagation();
                }

                // If the event started from an element with the native HTML drag&drop, it'll interfere
                // with our positioning logic since it'll start dragging the native element.
                if (event.target && ((event.target as HTMLElement).draggable || true) && event.type === 'pointerdown') {
                    event.preventDefault();
                }

                const layoutItem = this.layout.find((item) => item.id === gridItem.id);
                const renderData = this._gridItemsRenderData[gridItem.id];

                if (layoutItem === undefined || renderData === undefined) {
                    console.error(`Couldn\'t find the specified grid item for the id: ${gridItem.id}`);
                    return;
                }

                return this.gridService.startDrag(event, gridItem.dragRef, type, this, {layoutItem, renderData});
            }),
            this.dragEntered.subscribe(({event, dragInfo }) => {
                this.startRestoreDragSequence(event, dragInfo);
            }),
            this.dragExited.subscribe(({dragInfo}) => {
                this.pauseDragSequence(dragInfo);
            }),
        ];
    }

    /**
     * Starts the drag sequence when a drag event is triggered. It will restore paused drag sequence if it's already started.
     * @param event The event that triggered the drag sequence.
     * @param dragInfo The drag info.
     */
    private startRestoreDragSequence(event: PointingDeviceEvent, dragInfo: PointerEventInfo): void {
        // Drag sequence can be paused, but the resize sequence can't be paused.
        if (this.drag !== null && dragInfo.type === 'resize') {
            return;
        }

        // Prevents the resize from starting if the resize already started on another grid.
        if (dragInfo.type === 'resize' && this.drag === null && dragInfo.fromGrid !== this) {
            return;
        }

        const scrollableParent = typeof this.scrollableParent === 'string' ? document.getElementById(this.scrollableParent) : this.scrollableParent;

        // TODO (enhancement): consider move this 'side effect' observable inside the main drag loop.
        //  - Pros are that we would not repeat subscriptions and takeUntil would shut down observables at the same time.
        //  - Cons are that moving this functionality as a side effect inside the main drag loop would be confusing.
        const scrollSubscription = this.ngZone.runOutsideAngular(() =>
            (!scrollableParent ? NEVER : this.gridService.pointerMove$.pipe(
                map((event) => ({
                    pointerX: ktdPointerClientX(event),
                    pointerY: ktdPointerClientY(event)
                })),
                ktdScrollIfNearElementClientRect$(scrollableParent, {scrollStep: this.scrollSpeed})
            )).pipe(
                takeUntil(this.gridService.pointerEnd$),
            ).subscribe());

        this._drag = {
            dragSubscription: this.createDragResizeLoop(scrollableParent, dragInfo),
            scrollSubscription,
            startEvent: event,
            newLayout: null,
        };
    }

    private pauseDragSequence(dragInfo: PointerEventInfo): void {
        // If the drag is a resize, we don't need to pause the drag sequence.
        if (dragInfo.type === 'resize') {
            return;
        }

        // Partially reset the drag sequence.
        this.clearDragSequence();
    }

    /**
     * Creates the drag loop. It listens for 'pointer move' and 'scroll' events and recalculates the layout on each emission.
     * @param scrollableParent The parent element that contains the scroll.
     * @param dragInfo The drag info.
     */
    private createDragResizeLoop(scrollableParent: HTMLElement | Document | null, dragInfo: PointerEventInfo): Subscription {
        let renderData: KtdGridItemRenderData<number> | null = null;

        // Retrieve grid (parent) and gridItem (draggedElem) client rects.
        const gridElemClientRect: KtdClientRect = getMutableClientRect(this.gridElement);
        const dragElemClientRect: KtdClientRect = getMutableClientRect(dragInfo.dragRef.elementRef.nativeElement as HTMLElement);

        this.renderer.addClass(dragInfo.dragRef.elementRef.nativeElement, 'no-transitions');
        this.renderer.addClass(dragInfo.dragRef.elementRef.nativeElement, 'ktd-grid-item-dragging');

        const placeholderClientRect: KtdClientRect = {
            ...dragElemClientRect,
            left: dragElemClientRect.left - gridElemClientRect.left,
            top: dragElemClientRect.top - gridElemClientRect.top
        }

        this.createPlaceholderElement(placeholderClientRect, dragInfo.dragRef.placeholder);

        // Main subscription, it listens for 'pointer move' and 'scroll' events and recalculates the layout on each emission
        return this.ngZone.runOutsideAngular(() =>
            merge(
                combineLatest([
                    this.gridService.pointerMove$,
                    ...(!scrollableParent ? [of({top: 0, left: 0})] : [
                        ktdGetScrollTotalRelativeDifference$(scrollableParent).pipe(
                            startWith({top: 0, left: 0}) // Force first emission to allow CombineLatest to emit even no scroll event has occurred
                        )
                    ])
                ])
            ).pipe(
                takeUntil(this.gridService.pointerEnd$),
            ).subscribe(([pointerDragEvent, scrollDifference]: [MouseEvent | TouchEvent, { top: number, left: number }]) => {
                pointerDragEvent.preventDefault();

                //
                //  Set the new layout to be the layout in which the calcNewStateFunc would be executed.
                //  NOTE: using the mutated layout is the way to go by 'react-grid-layout' utils. If we don't use the previous layout,
                //  some utilities from 'react-grid-layout' would not work as expected.
                //
                const currentLayout: KtdGridLayout = this.drag!.newLayout || this.layout;
                // const ktdLayoutItem = dragInfo.fromGrid !== this ? dragInfo.newLayoutItem : currentLayout.find(item => item.id === dragInfo.dragRef.id)!;
                const ktdLayoutItem = dragInfo.newLayoutItem;

                // Get the correct newStateFunc depending on if we are dragging or resizing
                const calcNewStateFunc = dragInfo.type === 'drag' ? ktdGridItemDragging : ktdGridItemResizing;

                const {layout, draggedItemPos, draggedLayoutItem} = calcNewStateFunc(ktdLayoutItem, {
                    layout: currentLayout,
                    rowHeight: this.rowHeight,
                    height: this.height,
                    cols: this.cols,
                    preventCollision: this.preventCollision,
                    gap: this.gap,
                    gridId: this.id,
                }, this.compactType, {
                    pointerDownEvent: this.drag!.startEvent!,
                    pointerDragEvent,
                    gridElemClientRect,
                    dragElemClientRect,
                    scrollDifference,
                    draggingFromOutside: dragInfo.fromGrid !== this,
                });
                this.drag!.newLayout = layout;

                this.gridCurrentHeight = this.height ?? (this.rowHeight === 'fit' ? gridElemClientRect.height : getGridHeight(this.drag!.newLayout, this.rowHeight, this.gap))

                const {dict, draggingItem} = layoutToRenderItems({
                    cols: this.cols,
                    rowHeight: this.rowHeight,
                    height: this.height,
                    layout: this.drag!.newLayout,
                    preventCollision: this.preventCollision,
                    gap: this.gap,
                    gridId: this.id,
                }, gridElemClientRect.width, gridElemClientRect.height, draggedLayoutItem);
                this._gridItemsRenderData = dict;

                if (dragInfo.fromGrid !== this || dragInfo.type === 'resize') {
                    dragInfo.newLayoutItem = draggedLayoutItem;
                    renderData = draggingItem!;
                }

                const newGridItemRenderData = renderData !== null && dragInfo.fromGrid !== this ? renderData : this._gridItemsRenderData[dragInfo.dragRef.id];

                // Put the real final position to the placeholder element
                this.placeholder!.style.width = `${newGridItemRenderData.width}px`;
                this.placeholder!.style.height = `${newGridItemRenderData.height}px`;
                this.placeholder!.style.transform = `translateX(${newGridItemRenderData.left}px) translateY(${newGridItemRenderData.top}px)`;

                // modify the position of the dragged item to be the once we want (for example the mouse position or whatever)
                if (renderData !== null && dragInfo.fromGrid !== this ) {
                    renderData = {
                        ...renderData,
                        ...draggedItemPos,
                    }
                } else {
                    this._gridItemsRenderData[dragInfo.dragRef.id] = {
                        ...draggedItemPos,
                        id: this._gridItemsRenderData[dragInfo.dragRef.id].id
                    };
                }

                this.setBackgroundCssVariables(this.rowHeight === 'fit' ? ktdGetGridItemRowHeight(this.drag!.newLayout, gridElemClientRect.height, this.gap) : this.rowHeight);

                this.render();

                // If we are performing a resize, and bounds have changed, emit event.
                // NOTE: Only emit on resize for now. Use case for normal drag is not justified for now. Emitting on resize is, since we may want to re-render the grid item or the placeholder in order to fit the new bounds.
                if (dragInfo.type === 'resize') {
                    const prevGridItem = currentLayout.find(item => item.id === dragInfo.dragRef.id)!;
                    const newGridItem = this.drag!.newLayout.find(item => item.id === dragInfo.dragRef.id)!;
                    // Check if item resized has changed, if so, emit resize change event
                    if (!ktdGridItemLayoutItemAreEqual(prevGridItem, newGridItem)) {
                        this.gridItemResize.emit({
                            width: newGridItemRenderData.width,
                            height: newGridItemRenderData.height,
                            gridItemRef: dragInfo.dragRef.itemRef as KtdGridItemComponent, // We always have a grid item ref when resizing
                        });
                    }
                }
            })
        );
    }

    public stopDragSequence(dragInfo: PointerEventInfo): void {
        if (this.drag === null) {
            return;
        }

        // Remove drag classes
        this.renderer.removeClass(dragInfo.dragRef.elementRef.nativeElement, 'no-transitions');
        this.renderer.removeClass(dragInfo.dragRef.elementRef.nativeElement, 'ktd-grid-item-dragging');

        this.ngZone.run(() => {
            (dragInfo.type === 'drag' ? this.dragEnded : this.resizeEnded).emit(getDragResizeEventData(dragInfo.dragRef, this.drag!.newLayout!));
        });

        this.clearDragSequence();
        this._drag = null;
        this.addGridItemAnimatingClass(dragInfo.dragRef).subscribe();
    }

    /**
     * Clears the drag sequence.
     * This is called from grid-service when drag/resize finishes.
     */
    public clearDragSequence(): void {
        if (this.drag !== null) {
            this.destroyPlaceholder();
            this.drag?.dragSubscription?.unsubscribe();
            this.drag?.scrollSubscription?.unsubscribe();
            this.drag.dragSubscription = null;
            this.drag.scrollSubscription = null;
        }
    }

    public isPointerInsideGridElement(event: MouseEvent | TouchEvent): boolean {
        const gridElemClientRect: KtdClientRect = getMutableClientRect(this.gridElement);
        const pointerX = ktdPointerClientX(event);
        const pointerY = ktdPointerClientY(event);
        return gridElemClientRect.left < pointerX && pointerX < gridElemClientRect.right && gridElemClientRect.top < pointerY && pointerY < gridElemClientRect.bottom;
    }

    public getNextId(): string {
        return this._gridItems.toArray().reduce((acc, cur) => acc > parseInt(cur.id) ? acc : parseInt(cur.id), 0) + 1 + '';
    }

    /**
     * It adds the `ktd-grid-item-animating` class and removes it when the animated transition is complete.
     * This function is meant to be executed when the drag has ended.
     * @param dragRef that has been dragged
     */
    private addGridItemAnimatingClass(dragRef: DragRef): Observable<undefined> {
        return new Observable(observer => {
            const duration = getTransformTransitionDurationInMs(dragRef.elementRef.nativeElement);

            if (duration === 0) {
                observer.next();
                observer.complete();
                return;
            }

            this.renderer.addClass(dragRef.elementRef.nativeElement, 'ktd-grid-item-animating');
            const handler = ((event: TransitionEvent) => {
                if (!event || (event.target === dragRef.elementRef.nativeElement && event.propertyName === 'transform')) {
                    this.renderer.removeClass(dragRef.elementRef.nativeElement, 'ktd-grid-item-animating');
                    removeEventListener();
                    clearTimeout(timeout);
                    observer.next();
                    observer.complete();
                }
            }) as EventListener;

            // If a transition is short enough, the browser might not fire the `transitionend` event.
            // Since we know how long it's supposed to take, add a timeout with a 50% buffer that'll
            // fire if the transition hasn't completed when it was supposed to.
            const timeout = setTimeout(handler, duration * 1.5);
            const removeEventListener = this.renderer.listen(dragRef.elementRef.nativeElement, 'transitionend', handler);
        })
    }

    /** Creates placeholder element */
    private createPlaceholderElement(clientRect: KtdClientRect, gridItemPlaceholder?: KtdGridItemPlaceholder) {
        this.placeholder = this.renderer.createElement('div');
        this.placeholder!.style.width = `${clientRect.width}px`;
        this.placeholder!.style.height = `${clientRect.height}px`;
        this.placeholder!.style.transform = `translateX(${clientRect.left}px) translateY(${clientRect.top}px)`;
        this.placeholder!.classList.add('ktd-grid-item-placeholder');
        this.renderer.appendChild(this.gridElement, this.placeholder);

        // Create and append custom placeholder if provided.
        // Important: Append it after creating & appending the container placeholder. This way we ensure parent bounds are set when creating the embeddedView.
        if (gridItemPlaceholder) {
            this.placeholderRef = this.viewContainerRef.createEmbeddedView(
                gridItemPlaceholder.templateRef,
                gridItemPlaceholder.data
            );
            this.placeholderRef.rootNodes.forEach(node => this.placeholder!.appendChild(node));
            this.placeholderRef.detectChanges();
        } else {
            this.placeholder!.classList.add('ktd-grid-item-placeholder-default');
        }
    }

    /** Destroys the placeholder element and its ViewRef. */
    private destroyPlaceholder() {
        this.placeholder?.remove();
        this.placeholderRef?.destroy();
        this.placeholder = this.placeholderRef = null!;
    }

    static ngAcceptInputType_cols: NumberInput;
    static ngAcceptInputType_rowHeight: NumberInput;
    static ngAcceptInputType_scrollSpeed: NumberInput;
    static ngAcceptInputType_compactOnPropsChange: BooleanInput;
    static ngAcceptInputType_preventCollision: BooleanInput;
    }

