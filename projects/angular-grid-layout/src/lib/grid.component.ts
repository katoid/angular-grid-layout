import {
    AfterContentChecked, AfterContentInit, ChangeDetectionStrategy, Component, ContentChildren, ElementRef, EventEmitter, Input, NgZone, OnChanges,
    OnDestroy, Output, QueryList, Renderer2, SimpleChanges, ViewEncapsulation
} from '@angular/core';
import { coerceNumberProperty, NumberInput } from './coercion/number-property';
import { KtdGridItemComponent } from './grid-item/grid-item.component';
import { combineLatest, merge, NEVER, Observable, Observer, of, Subscription } from 'rxjs';
import { exhaustMap, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { ktdGridItemDragging, ktdGridItemResizing } from './utils/grid.utils';
import { compact, CompactType } from './utils/react-grid-layout.utils';
import {
    GRID_ITEM_GET_RENDER_DATA_TOKEN, KtdDraggingData, KtdGridCfg, KtdGridCompactType, KtdGridItemRect, KtdGridItemRenderData, KtdGridLayout,
    KtdGridLayoutItem
} from './grid.definitions';
import { ktdMouseOrTouchEnd, ktdPointerClientX, ktdPointerClientY } from './utils/pointer.utils';
import { KtdDictionary } from '../types';
import { KtdGridService } from './grid.service';
import { getMutableClientRect } from './utils/client-rect';
import { ktdGetScrollTotalRelativeDifference$, ktdScrollIfNearElementClientRect$ } from './utils/scroll';
import { BooleanInput, coerceBooleanProperty } from './coercion/boolean-property';

interface KtdDragResizeEvent {
    layout: KtdGridLayout;
    layoutItem: KtdGridLayoutItem;
    gridItemRef: KtdGridItemComponent;
}

export type KtdDragStart = KtdDragResizeEvent;
export type KtdResizeStart = KtdDragResizeEvent;
export type KtdDragEnd = KtdDragResizeEvent;
export type KtdResizeEnd = KtdDragResizeEvent;

function getDragResizeEventData(gridItem: KtdGridItemComponent, layout: KtdGridLayout): KtdDragResizeEvent {
    return {
        layout,
        layoutItem: layout.find((item) => item.id === gridItem.id)!,
        gridItemRef: gridItem
    };
}


function layoutToRenderItems(config: KtdGridCfg, width: number, height: number): KtdDictionary<KtdGridItemRenderData<number>> {
    const {cols, rowHeight, layout} = config;

    const renderItems: KtdDictionary<KtdGridItemRenderData<number>> = {};
    for (const item of layout) {
        renderItems[item.id] = {
            id: item.id,
            top: item.y === 0 ? 0 : item.y * rowHeight,
            left: item.x * (width / cols),
            width: item.w * (width / cols),
            height: item.h * rowHeight
        };
    }
    return renderItems;
}

function getGridHeight(layout: KtdGridLayout, rowHeight: number): number {
    return layout.reduce((acc, cur) => Math.max(acc, (cur.y + cur.h) * rowHeight), 0);
}

// tslint:disable-next-line
export function parseRenderItemToPixels(renderItem: KtdGridItemRenderData<number>): KtdGridItemRenderData<string> {
    return {
        id: renderItem.id,
        top: `${renderItem.top}px`,
        left: `${renderItem.left}px`,
        width: `${renderItem.width}px`,
        height: `${renderItem.height}px`
    };
}

// tslint:disable-next-line:ktd-prefix-code
export function __gridItemGetRenderDataFactoryFunc(gridCmp: KtdGridComponent) {
    // tslint:disable-next-line:only-arrow-functions
    return function(id: string) {
        return parseRenderItemToPixels(gridCmp.getItemRenderData(id));
    };
}

export function ktdGridItemGetRenderDataFactoryFunc(gridCmp: KtdGridComponent) {
    // Workaround explained: https://github.com/ng-packagr/ng-packagr/issues/696#issuecomment-387114613
    const resultFunc = __gridItemGetRenderDataFactoryFunc(gridCmp);
    return resultFunc;
}


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
    /** Query list of grid items that are being rendered. */
    @ContentChildren(KtdGridItemComponent, {descendants: true}) _gridItems: QueryList<KtdGridItemComponent>;

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

    /**
     * Parent element that contains the scroll. If an string is provided it would search that element by id on the dom.
     * If no data provided or null autoscroll is not performed.
     */
    @Input() scrollableParent: HTMLElement | Document | string | null = null;

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
    get compactType(): KtdGridCompactType {
        return this._compactType;
    }

    set compactType(val: KtdGridCompactType) {
        this._compactType = val;
    }

    private _compactType: KtdGridCompactType = 'vertical';

    /** Row height in css pixels */
    @Input()
    get rowHeight(): number { return this._rowHeight; }

    set rowHeight(val: number) {
        this._rowHeight = Math.max(1, Math.round(coerceNumberProperty(val)));
    }

    private _rowHeight: number = 100;

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

    get config(): KtdGridCfg {
        return {
            cols: this.cols,
            rowHeight: this.rowHeight,
            layout: this.layout,
            preventCollision: this.preventCollision,
        };
    }

    /** Total height of the grid */
    private _height: number;
    private _gridItemsRenderData: KtdDictionary<KtdGridItemRenderData<number>>;
    private subscriptions: Subscription[];

    constructor(private gridService: KtdGridService,
                private elementRef: ElementRef,
                private renderer: Renderer2,
                private ngZone: NgZone) {

    }

    ngOnChanges(changes: SimpleChanges) {
        let needsCompactLayout = false;
        let needsRecalculateRenderData = false;

        // TODO: Does fist change need to be compacted by default?
        // Compact layout whenever some dependent prop changes.
        if (changes.compactType || changes.cols || changes.layout) {
            needsCompactLayout = true;
        }

        // Check if wee need to recalculate rendering data.
        if (needsCompactLayout || changes.rowHeight) {
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
        const clientRect = (this.elementRef.nativeElement as HTMLElement).getBoundingClientRect();
        this._gridItemsRenderData = layoutToRenderItems(this.config, clientRect.width, clientRect.height);
        this._height = getGridHeight(this.layout, this.rowHeight);
    }

    render() {
        this.renderer.setStyle(this.elementRef.nativeElement, 'height', `${this._height}px`);
        this.updateGridItemsStyles();
    }

    private updateGridItemsStyles() {
        this._gridItems.forEach(item => {
            const gridItemRenderData: KtdGridItemRenderData<number> | undefined = this._gridItemsRenderData[item.id];
            if (gridItemRenderData == null) {
                console.error(`Couldn\'t find the specified grid item for the id: ${item.id}`);
            } else {
                item.setStyles(parseRenderItemToPixels(gridItemRenderData));
            }
        });
    }

    private initSubscriptions() {
        this.subscriptions = [
            this._gridItems.changes.pipe(
                startWith(this._gridItems),
                switchMap((gridItems: QueryList<KtdGridItemComponent>) => {
                    return merge(
                        ...gridItems.map((gridItem) => gridItem.dragStart$.pipe(map((event) => ({event, gridItem, type: 'drag'})))),
                        ...gridItems.map((gridItem) => gridItem.resizeStart$.pipe(map((event) => ({event, gridItem, type: 'resize'})))),
                    ).pipe(exhaustMap(({event, gridItem, type}) => {
                        // Emit drag or resize start events. Ensure that is start event is inside the zone.
                        this.ngZone.run(() => (type === 'drag' ? this.dragStarted : this.resizeStarted).emit(getDragResizeEventData(gridItem, this.layout)));
                        // Get the correct newStateFunc depending on if we are dragging or resizing
                        const calcNewStateFunc = type === 'drag' ? ktdGridItemDragging : ktdGridItemResizing;

                        // Perform drag sequence
                        return this.performDragSequence$(gridItem, event, (gridItemId, config, compactionType, draggingData) =>
                            calcNewStateFunc(gridItem, config, compactionType, draggingData)
                        ).pipe(map((layout) => ({layout, gridItem, type})));

                    }));
                })
            ).subscribe(({layout, gridItem, type}) => {
                this.layout = layout;
                // Calculate new rendering data given the new layout.
                this.calculateRenderData();
                // Emit drag or resize end events.
                (type === 'drag' ? this.dragEnded : this.resizeEnded).emit(getDragResizeEventData(gridItem, layout));
                // Notify that the layout has been updated.
                this.layoutUpdated.emit(layout);
            })

        ];
    }

    /**
     * Perform a general grid drag action, from start to end. A general grid drag action basically includes creating the placeholder element and adding
     * some class animations. calcNewStateFunc needs to be provided in order to calculate the new state of the layout.
     * @param gridItem that is been dragged
     * @param pointerDownEvent event (mousedown or touchdown) where the user initiated the drag
     * @param calcNewStateFunc function that return the new layout state and the drag element position
     */
    private performDragSequence$(gridItem: KtdGridItemComponent, pointerDownEvent: MouseEvent | TouchEvent,
                                 calcNewStateFunc: (gridItem: KtdGridItemComponent, config: KtdGridCfg, compactionType: CompactType, draggingData: KtdDraggingData) => { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect }): Observable<KtdGridLayout> {

        return new Observable<KtdGridLayout>((observer: Observer<KtdGridLayout>) => {
            // Retrieve grid (parent) and gridItem (draggedElem) client rects.
            const gridElemClientRect: ClientRect = getMutableClientRect(this.elementRef.nativeElement as HTMLElement);
            const dragElemClientRect: ClientRect = getMutableClientRect(gridItem.elementRef.nativeElement as HTMLElement);

            const scrollableParent = typeof this.scrollableParent === 'string' ? document.getElementById(this.scrollableParent) : this.scrollableParent;

            this.renderer.addClass(gridItem.elementRef.nativeElement, 'no-transitions');
            this.renderer.addClass(gridItem.elementRef.nativeElement, 'ktd-grid-item-dragging');

            // Create placeholder element. This element would represent the position where the dragged/resized element would be if the action ends
            const placeholderElement: HTMLDivElement = this.renderer.createElement('div');
            placeholderElement.style.width = `${dragElemClientRect.width}px`;
            placeholderElement.style.height = `${dragElemClientRect.height}px`;
            placeholderElement.style.transform = `translateX(${dragElemClientRect.left - gridElemClientRect.left}px) translateY(${dragElemClientRect.top - gridElemClientRect.top}px)`;

            this.renderer.addClass(placeholderElement, 'ktd-grid-item-placeholder');
            this.renderer.appendChild(this.elementRef.nativeElement, placeholderElement);

            let newLayout: KtdGridLayoutItem[];

            // TODO (enhancement): consider move this 'side effect' observable inside the main drag loop.
            //  - Pros are that we would not repeat subscriptions and takeUntil would shut down observables at the same time.
            //  - Cons are that moving this functionality as a side effect inside the main drag loop would be confusing.
            const scrollSubscription = this.ngZone.runOutsideAngular(() =>
                (!scrollableParent ? NEVER : this.gridService.mouseOrTouchMove$(document).pipe(
                    map((event) => ({
                        pointerX: ktdPointerClientX(event),
                        pointerY: ktdPointerClientY(event)
                    })),
                    ktdScrollIfNearElementClientRect$(scrollableParent, {scrollStep: this.scrollSpeed})
                )).pipe(
                    takeUntil(ktdMouseOrTouchEnd(document))
                ).subscribe());

            /**
             * Main subscription, it listens for 'pointer move' and 'scroll' events and recalculates the layout on each emission
             */
            const subscription = this.ngZone.runOutsideAngular(() =>
                merge(
                    combineLatest([
                        this.gridService.mouseOrTouchMove$(document),
                        ...(!scrollableParent ? [of({top: 0, left: 0})] : [
                            ktdGetScrollTotalRelativeDifference$(scrollableParent).pipe(
                                startWith({top: 0, left: 0}) // Force first emission to allow CombineLatest to emit even no scroll event has occurred
                            )
                        ])
                    ])
                ).pipe(
                    takeUntil(ktdMouseOrTouchEnd(document)),
                ).subscribe(([pointerDragEvent, scrollDifference]: [MouseEvent | TouchEvent, { top: number, left: number }]) => {
                        pointerDragEvent.preventDefault();

                        /**
                         * Set the new layout to be the layout in which the calcNewStateFunc would be executed.
                         * NOTE: using the mutated layout is the way to go by 'react-grid-layout' utils. If we don't use the previous layout,
                         * some utilities from 'react-grid-layout' would not work as expected.
                         */
                        const currentLayout: KtdGridLayout = newLayout || this.layout;

                        const {layout, draggedItemPos} = calcNewStateFunc(gridItem, {
                            layout: currentLayout,
                            rowHeight: this.rowHeight,
                            cols: this.cols,
                            preventCollision: this.preventCollision
                        }, this.compactType, {
                            pointerDownEvent,
                            pointerDragEvent,
                            gridElemClientRect,
                            dragElemClientRect,
                            scrollDifference
                        });
                        newLayout = layout;

                        this._height = getGridHeight(newLayout, this.rowHeight);

                        this._gridItemsRenderData = layoutToRenderItems({
                            cols: this.cols,
                            rowHeight: this.rowHeight,
                            layout: newLayout,
                            preventCollision: this.preventCollision,
                        }, gridElemClientRect.width, gridElemClientRect.height);

                        const placeholderStyles = parseRenderItemToPixels(this._gridItemsRenderData[gridItem.id]);

                        // Put the real final position to the placeholder element
                        placeholderElement.style.width = placeholderStyles.width;
                        placeholderElement.style.height = placeholderStyles.height;
                        placeholderElement.style.transform = `translateX(${placeholderStyles.left}) translateY(${placeholderStyles.top})`;

                        // modify the position of the dragged item to be the once we want (for example the mouse position or whatever)
                        this._gridItemsRenderData[gridItem.id] = {
                            ...draggedItemPos,
                            id: this._gridItemsRenderData[gridItem.id].id
                        };

                        this.render();
                    },
                    (error) => observer.error(error),
                    () => {
                        this.ngZone.run(() => {
                            // Remove drag classes
                            this.renderer.removeClass(gridItem.elementRef.nativeElement, 'no-transitions');
                            this.renderer.removeClass(gridItem.elementRef.nativeElement, 'ktd-grid-item-dragging');

                            // Remove placeholder element from the dom
                            // NOTE: If we don't put the removeChild inside the zone it would not work... This may be a bug from angular or maybe is the intended behaviour, although strange.
                            // It should work since AFAIK this action should not be done in a CD cycle.
                            this.renderer.removeChild(this.elementRef.nativeElement, placeholderElement);

                            if (newLayout) {
                                // TODO: newLayout should already be pruned. If not, it should have type Layout, not KtdGridLayout as it is now.
                                // Prune react-grid-layout compact extra properties.
                                observer.next(newLayout.map(item => ({
                                    id: item.id,
                                    x: item.x,
                                    y: item.y,
                                    w: item.w,
                                    h: item.h,
                                    minW: item.minW,
                                    minH: item.minH,
                                    maxW: item.maxW,
                                    maxH: item.maxH,
                                })) as KtdGridLayout);
                            } else {
                                // TODO: Need we really to emit if there is no layout change but drag started and ended?
                                observer.next(this.layout);
                            }

                            observer.complete();
                        });

                    }));


            return () => {
                scrollSubscription.unsubscribe();
                subscription.unsubscribe();
            };
        });
    }


    // tslint:disable-next-line
    static ngAcceptInputType_cols: NumberInput;
    // tslint:disable-next-line
    static ngAcceptInputType_rowHeight: NumberInput;
    // tslint:disable-next-line
    static ngAcceptInputType_scrollSpeed: NumberInput;
    // tslint:disable-next-line
    static ngAcceptInputType_compactOnPropsChange: BooleanInput;
    // tslint:disable-next-line
    static ngAcceptInputType_preventCollision: BooleanInput;
}

