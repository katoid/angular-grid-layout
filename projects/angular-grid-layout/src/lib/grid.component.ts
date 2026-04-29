import {
  AfterContentChecked, AfterContentInit, ChangeDetectionStrategy, Component, ContentChildren, DestroyRef, DOCUMENT, effect, ElementRef, EmbeddedViewRef, inject, input,
  NgZone, output, QueryList, Renderer2, ViewContainerRef, ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { coerceNumberProperty, NumberInput } from './coercion/number-property';
import { KtdGridItemComponent } from './grid-item/grid-item.component';
import { combineLatest, merge, NEVER, Observable, Observer, of } from 'rxjs';
import { exhaustMap, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { ktdGetGridItemRowHeight, ktdGridItemDragging, ktdGridItemLayoutItemAreEqual, ktdGridItemResizing, ktdGridItemsDragging } from './utils/grid.utils';
import { compact } from './utils/react-grid-layout.utils';
import {
    GRID_ITEM_GET_RENDER_DATA_TOKEN, KtdGridBackgroundCfg, KtdGridCfg, KtdGridCompactType, KtdGridItemRect, KtdGridItemRenderData, KtdGridLayout, KtdGridLayoutItem
} from './grid.definitions';
import { ktdPointerUp, ktdPointerClientX, ktdPointerClientY } from './utils/pointer.utils';
import { KtdDictionary } from '../types';
import { KtdGridService } from './grid.service';
import { getMutableClientRect, KtdClientRect } from './utils/client-rect';
import { ktdGetScrollTotalRelativeDifference$, ktdScrollIfNearElementClientRect$ } from './utils/scroll';
import { BooleanInput, coerceBooleanProperty } from './coercion/boolean-property';
import { KtdGridItemPlaceholder } from './directives/placeholder';
import { getTransformTransitionDurationInMs } from './utils/transition-duration';


interface KtdDragResizeEvent {
    layout: KtdGridLayout;
    layoutItem: KtdGridLayoutItem;
    gridItemRef: KtdGridItemComponent;
    selectedItems?: {
        layoutItem: KtdGridLayoutItem;
        gridItemRef: KtdGridItemComponent;
    }[];
}

export type KtdDragStart = KtdDragResizeEvent;
export type KtdResizeStart = KtdDragResizeEvent;
export type KtdDragEnd = KtdDragResizeEvent;
export type KtdResizeEnd = KtdDragResizeEvent;

export interface KtdGridItemResizeEvent {
    width: number;
    height: number;
    gridItemRef: KtdGridItemComponent;
}

type DragActionType = 'drag' | 'resize';

function getDragResizeEventData(gridItem: KtdGridItemComponent, layout: KtdGridLayout, multipleSelection?: KtdGridItemComponent[]): KtdDragResizeEvent {
    return {
        layout,
        layoutItem: layout.find((item) => item.id === gridItem.id)!,
        gridItemRef: gridItem,
        selectedItems: multipleSelection && multipleSelection.map(selectedItem=>(
            {
                layoutItem: layout.find((layoutItem: KtdGridLayoutItem) => layoutItem.id === selectedItem.id)!,
                gridItemRef: selectedItem
            })
        )
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

function layoutToRenderItems(config: KtdGridCfg, width: number, height: number): KtdDictionary<KtdGridItemRenderData<number>> {
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
    return renderItems;
}

function getGridHeight(layout: KtdGridLayout, rowHeight: number, gap: number): number {
    return layout.reduce((acc, cur) => Math.max(acc, (cur.y + cur.h) * rowHeight + Math.max(cur.y + cur.h - 1, 0) * gap), 0);
}

// eslint-disable-next-line @katoid/prefix-exported-code
export function parseRenderItemToPixels(renderItem: KtdGridItemRenderData<number>): KtdGridItemRenderData<string> {
    return {
        id: renderItem.id,
        top: `${renderItem.top}px`,
        left: `${renderItem.left}px`,
        width: `${renderItem.width}px`,
        height: `${renderItem.height}px`
    };
}

// eslint-disable-next-line @katoid/prefix-exported-code
export function __gridItemGetRenderDataFactoryFunc(gridCmp: KtdGridComponent) {
    return function(id: string) {
        const renderData = gridCmp.getItemRenderData(id);
        return renderData ? parseRenderItemToPixels(renderData) : undefined;
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

@Component({
    standalone: true,
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
export class KtdGridComponent implements AfterContentInit, AfterContentChecked {
    /** Query list of grid items that are being rendered. */
    @ContentChildren(KtdGridItemComponent, {descendants: true}) _gridItems: QueryList<KtdGridItemComponent>;

    /** Emits when layout change */
    layoutUpdated = output<KtdGridLayout>();

    /** Emits when drag starts */
    dragStarted = output<KtdDragStart>();

    /** Emits when resize starts */
    resizeStarted = output<KtdResizeStart>();

    /** Emits when drag ends */
    dragEnded = output<KtdDragEnd>();

    /** Emits when resize ends */
    resizeEnded = output<KtdResizeEnd>();

    /** Emits when a grid item is being resized and its bounds have changed */
    gridItemResize = output<KtdGridItemResizeEvent>();

    /**
     * Parent element that contains the scroll. If an string is provided it would search that element by id on the dom.
     * If no data provided or null autoscroll is not performed.
     */
    readonly scrollableParent = input<HTMLElement | Document | string | null>(null);

    /** Whether or not to update the internal layout when some dependent property change. */
    readonly compactOnPropsChange = input(true, {
        transform: (value: BooleanInput) => coerceBooleanProperty(value)
    });

    /** If true, grid items won't change position when being dragged over. Handy when using no compaction */
    readonly preventCollision = input(false, {
        transform: (value: BooleanInput) => coerceBooleanProperty(value)
    });

    /** Number of CSS pixels that would be scrolled on each 'tick' when auto scroll is performed. */
    readonly scrollSpeed = input(2, {
        transform: (value: NumberInput) => coerceNumberProperty(value, 2)
    });

    /** Type of compaction that will be applied to the layout (vertical, horizontal or free). Defaults to 'vertical' */
    readonly compactType = input<KtdGridCompactType>('vertical');

    /**
     * Row height as number or as 'fit'.
     * If rowHeight is a number value, it means that each row would have those css pixels in height.
     * if rowHeight is 'fit', it means that rows will fit in the height available. If 'fit' value is set, a 'height' should be also provided.
     */
    readonly rowHeight = input<number | 'fit', NumberInput | 'fit'>(100, {
        transform: (value: NumberInput | 'fit') => value === 'fit' ? value : Math.max(1, Math.round(coerceNumberProperty(value)))
    });

    /** Number of columns  */
    readonly cols = input(6, {
        transform: (value: NumberInput) => Math.max(1, Math.round(coerceNumberProperty(value)))
    });

    /** Layout of the grid. Array of all the grid items with its 'id' and position on the grid. */
    readonly layoutInput = input<KtdGridLayout>([], {alias: 'layout'});
    private _layout: KtdGridLayout = [];

    get layout(): KtdGridLayout {
        return this._layout;
    }

    /** Grid gap in css pixels */
    readonly gap = input(0, {
        transform: (value: NumberInput) => Math.max(coerceNumberProperty(value), 0)
    });


    /**
     * If height is a number, fixes the height of the grid to it, recommended when rowHeight = 'fit' is used.
     * If height is null, height will be automatically set according to its inner grid items.
     * Defaults to null.
     * */
    readonly height = input<number | null, number | null>(null, {
        transform: (value: number | null) => typeof value === 'number' ? Math.max(value, 0) : null
    });

    /**
     * Multiple items drag/resize
     * A list of selected items to move (drag or resize) together as a group.
     * The multi-selection of items is managed externally. By default, the library manages a single item, but if a set of item IDs is provided, the specified group will be handled as a unit."
     */
    readonly selectedItemsIdsInput = input<string[] | null>(null, {alias: 'selectedItemsIds'});

    get selectedItemsIds(): string[] | null {
        return this._selectedItemsIds;
    }

    private _selectedItemsIds: string[] | null = null;
    selectedItems: KtdGridItemComponent[] | undefined;


    readonly backgroundConfig = input<KtdGridBackgroundCfg | null>(null);

    private gridCurrentHeight: number;

    get config(): KtdGridCfg {
        return {
            cols: this.cols(),
            rowHeight: this.rowHeight(),
            height: this.height(),
            layout: this.layout,
            preventCollision: this.preventCollision(),
            gap: this.gap(),
        };
    }

    /** References to the views of the placeholder elements. */
    private placeholderRef: KtdDictionary<EmbeddedViewRef<any> | null>={};

    /** Elements that are rendered as placeholder when a list of grid items are being dragged */
    private placeholder: KtdDictionary<HTMLElement | null>={};

    private _gridItemsRenderData: KtdDictionary<KtdGridItemRenderData<number>> = {};
    private readonly destroyRef = inject(DestroyRef);
    private readonly gridService = inject(KtdGridService);
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly viewContainerRef = inject(ViewContainerRef);
    private readonly renderer = inject(Renderer2);
    private readonly ngZone = inject(NgZone);
    private readonly document = inject(DOCUMENT);
    private previousInputs: {
        compactType: KtdGridCompactType;
        cols: number;
        rowHeight: number | 'fit';
        height: number | null;
        gap: number;
        layout: KtdGridLayout;
        selectedItemsIds: string[] | null;
        backgroundConfig: KtdGridBackgroundCfg | null;
    } | null = null;
    private readonly syncInputStateEffect = effect(() => {
        const nextInputs = {
            compactType: this.compactType(),
            cols: this.cols(),
            rowHeight: this.rowHeight(),
            height: this.height(),
            gap: this.gap(),
            layout: this.layoutInput(),
            selectedItemsIds: this.selectedItemsIdsInput(),
            backgroundConfig: this.backgroundConfig(),
        };

        const previousInputs = this.previousInputs;
        this.previousInputs = nextInputs;

        this._layout = nextInputs.layout;
        this._selectedItemsIds = nextInputs.selectedItemsIds;
        this.syncSelectedItems();
        this.applyBackgroundConfig(nextInputs.backgroundConfig);

        if (nextInputs.rowHeight === 'fit' && nextInputs.height == null) {
            console.warn(`KtdGridComponent: The height input should not be null when using rowHeight 'fit'`);
        }

        const changes = {
            compactType: !previousInputs || previousInputs.compactType !== nextInputs.compactType,
            cols: !previousInputs || previousInputs.cols !== nextInputs.cols,
            layout: !previousInputs || previousInputs.layout !== nextInputs.layout,
            rowHeight: !previousInputs || previousInputs.rowHeight !== nextInputs.rowHeight,
            height: !previousInputs || previousInputs.height !== nextInputs.height,
            gap: !previousInputs || previousInputs.gap !== nextInputs.gap,
            backgroundConfig: !previousInputs || previousInputs.backgroundConfig !== nextInputs.backgroundConfig,
        };

        this.handleInputStateChanges(changes);
    });

    ngAfterContentInit() {
        this.syncSelectedItems();
        this.initSubscriptions();
    }

    ngAfterContentChecked() {
        this.render();
    }

    resize() {
        this.calculateRenderData();
        this.render();
    }

    compactLayout() {
        this.setInternalLayout(compact(this.layout, this.compactType(), this.cols()));
    }

    getItemsRenderData(): KtdDictionary<KtdGridItemRenderData<number>> {
        return {...this._gridItemsRenderData};
    }

    getItemRenderData(itemId: string): KtdGridItemRenderData<number> {
        return this._gridItemsRenderData[itemId];
    }

    calculateRenderData() {
        const clientRect = (this.elementRef.nativeElement as HTMLElement).getBoundingClientRect();
        const rowHeight = this.rowHeight();
        const gap = this.gap();
        this.gridCurrentHeight = this.height() ?? (rowHeight === 'fit' ? clientRect.height : getGridHeight(this.layout, rowHeight, gap));
        this._gridItemsRenderData = layoutToRenderItems(this.config, clientRect.width, this.gridCurrentHeight);

        // Set Background CSS variables
        this.setBackgroundCssVariables(getRowHeightInPixels(this.config, this.gridCurrentHeight));
    }

    render() {
        this.renderer.setStyle(this.elementRef.nativeElement, 'height', `${this.gridCurrentHeight}px`);
        this.updateGridItemsStyles();
    }

    private setBackgroundCssVariables(rowHeight: number) {
        const style = (this.elementRef.nativeElement as HTMLDivElement).style;

        const backgroundConfig = this.backgroundConfig();

        if (backgroundConfig) {
            // structure
            style.setProperty('--gap', this.gap() + 'px');
            style.setProperty('--row-height', rowHeight + 'px');
            style.setProperty('--columns', `${this.cols()}`);
            style.setProperty('--border-width', (backgroundConfig.borderWidth ?? defaultBackgroundConfig.borderWidth) + 'px');

            // colors
            style.setProperty('--border-color', backgroundConfig.borderColor ?? defaultBackgroundConfig.borderColor);
            style.setProperty('--gap-color', backgroundConfig.gapColor ?? defaultBackgroundConfig.gapColor);
            style.setProperty('--row-color', backgroundConfig.rowColor ?? defaultBackgroundConfig.rowColor);
            style.setProperty('--column-color', backgroundConfig.columnColor ?? defaultBackgroundConfig.columnColor);
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
                item.setStyles(parseRenderItemToPixels(gridItemRenderData));
            }
        });
    }


    private setGridBackgroundVisible(visible: boolean) {
        const classList = (this.elementRef.nativeElement as HTMLDivElement).classList;
        visible ? classList.add('ktd-grid-background-visible') : classList.remove('ktd-grid-background-visible');
    }

    private initSubscriptions() {
        this._gridItems.changes.pipe(
                startWith(this._gridItems),
                switchMap((gridItems: QueryList<KtdGridItemComponent>) => {
                    this.syncSelectedItems();
                    return merge(
                        ...gridItems.map((gridItem) => gridItem.dragStart$.pipe(map((event) => ({event, gridItem, type: 'drag' as DragActionType})))),
                        ...gridItems.map((gridItem) => gridItem.resizeStart$.pipe(map((event) => ({
                            event,
                            gridItem,
                            type: 'resize' as DragActionType
                        })))),
                    ).pipe(exhaustMap(({event, gridItem, type}) => {
                        const multipleSelection: KtdGridItemComponent[] | undefined = this.selectedItems && [...this.selectedItems];
                        // Emit drag or resize start events. Ensure that is start event is inside the zone.
                        this.ngZone.run(() => (type === 'drag' ? this.dragStarted : this.resizeStarted).emit(getDragResizeEventData(gridItem, this.layout, multipleSelection)));
                        this.setGridBackgroundVisible(this.backgroundConfig()?.show === 'whenDragging' || this.backgroundConfig()?.show === 'always');
                        // Perform drag sequence
                        let gridItemsSelected: KtdGridItemComponent[] = [gridItem];
                        if (multipleSelection && multipleSelection.some((currItem) => currItem.id === gridItem.id)) {
                            gridItemsSelected = multipleSelection
                        }
                        return this.performDragSequence$(gridItemsSelected, event, type).pipe(
                            map((layout) => ({layout, gridItem, type, multipleSelection})));

                    }));
                }),
                takeUntilDestroyed(this.destroyRef)
            ).subscribe(({layout, gridItem, type, multipleSelection} : {layout: KtdGridLayout, gridItem: KtdGridItemComponent, type: DragActionType, multipleSelection?: KtdGridItemComponent[]}) => {
                this.setInternalLayout(layout);
                // Calculate new rendering data given the new layout.
                this.calculateRenderData();
                // Emit drag or resize end events.
                (type === 'drag' ? this.dragEnded : this.resizeEnded).emit(getDragResizeEventData(gridItem, layout, multipleSelection));
                // Notify that the layout has been updated.
                this.layoutUpdated.emit(layout);

                this.setGridBackgroundVisible(this.backgroundConfig()?.show === 'always');
            })
    }

    /**
     * Perform a general grid drag action, from start to end. A general grid drag action basically includes creating the placeholder element and adding
     * some class animations. calcNewStateFunc needs to be provided in order to calculate the new state of the layout.
     * @param gridItem that is been dragged
     * @param pointerDownEvent event (mousedown or touchdown) where the user initiated the drag
     * @param calcNewStateFunc function that return the new layout state and the drag element position
     */
    private performDragSequence$(gridItems: KtdGridItemComponent[], pointerDownEvent: MouseEvent | TouchEvent, type: DragActionType): Observable<KtdGridLayout> {

        return new Observable<KtdGridLayout>((observer: Observer<KtdGridLayout>) => {
            const scrollableParentInput = this.scrollableParent();
            const scrollableParent = typeof scrollableParentInput === 'string' ? this.document.getElementById(scrollableParentInput) : scrollableParentInput;
            // Retrieve grid (parent) client rect.
            const gridElemClientRect: KtdClientRect = getMutableClientRect(this.elementRef.nativeElement as HTMLElement);

            const dragElemClientRect: KtdDictionary<KtdClientRect> = {};
            const newGridItemRenderData: KtdDictionary<KtdGridItemRenderData<number>> = {};
            let draggedItemsPos: KtdDictionary<KtdGridItemRect> = {};

            gridItems.forEach((gridItem)=>{
                // Retrieve gridItem (draggedElem) client rect.
                dragElemClientRect[gridItem.id] = getMutableClientRect(gridItem.elementRef.nativeElement as HTMLElement);
                this.renderer.addClass(gridItem.elementRef.nativeElement, 'no-transitions');
                this.renderer.addClass(gridItem.elementRef.nativeElement, 'ktd-grid-item-dragging');
                const placeholderClientRect: KtdClientRect = {
                    ...dragElemClientRect[gridItem.id],
                    left: dragElemClientRect[gridItem.id].left - gridElemClientRect.left,
                    top: dragElemClientRect[gridItem.id].top - gridElemClientRect.top
                }
                this.createPlaceholderElement(gridItem.id, placeholderClientRect, gridItem.placeholder);
            });

            let newLayout: KtdGridLayoutItem[];

            // TODO (enhancement): consider move this 'side effect' observable inside the main drag loop.
            //  - Pros are that we would not repeat subscriptions and takeUntil would shut down observables at the same time.
            //  - Cons are that moving this functionality as a side effect inside the main drag loop would be confusing.
            const scrollSubscription = this.ngZone.runOutsideAngular(() =>
                (!scrollableParent ? NEVER : this.gridService.mouseOrTouchMove$(this.document).pipe(
                    map((event) => ({
                        pointerX: ktdPointerClientX(event),
                        pointerY: ktdPointerClientY(event)
                    })),
                    ktdScrollIfNearElementClientRect$(scrollableParent, {scrollStep: this.scrollSpeed()})
                )).pipe(
                    takeUntil(ktdPointerUp(this.document))
                ).subscribe());

            /**
             * Main subscription, it listens for 'pointer move' and 'scroll' events and recalculates the layout on each emission
             */
            const subscription = this.ngZone.runOutsideAngular(() =>
                merge(
                    combineLatest([
                        this.gridService.mouseOrTouchMove$(this.document),
                        ...(!scrollableParent ? [of({top: 0, left: 0})] : [
                            ktdGetScrollTotalRelativeDifference$(scrollableParent).pipe(
                                startWith({top: 0, left: 0}) // Force first emission to allow CombineLatest to emit even no scroll event has occurred
                            )
                        ])
                    ])
                ).pipe(
                    takeUntil(ktdPointerUp(this.document)),
                ).subscribe(([pointerDragEvent, scrollDifference]: [MouseEvent | TouchEvent | PointerEvent, { top: number, left: number }]) => {
                        pointerDragEvent.preventDefault();
                        /**
                         * Set the new layout to be the layout in which the calcNewStateFunc would be executed.
                         * NOTE: using the mutated layout is the way to go by 'react-grid-layout' utils. If we don't use the previous layout,
                         * some utilities from 'react-grid-layout' would not work as expected.
                         */
                        const currentLayout: KtdGridLayout = newLayout || this.layout;
                        // Get the correct newStateFunc depending on if we are dragging or resizing
                        if (type === 'drag' && gridItems.length > 1) {
                            const {layout, draggedItemPos} = ktdGridItemsDragging(gridItems, {
                                layout: currentLayout,
                                rowHeight: this.rowHeight(),
                                height: this.height(),
                                cols: this.cols(),
                                preventCollision: this.preventCollision(),
                                gap: this.gap(),
                            }, this.compactType(), {
                                pointerDownEvent,
                                pointerDragEvent,
                                gridElemClientRect,
                                dragElementsClientRect: dragElemClientRect,
                                scrollDifference
                            });
                            newLayout = layout;
                            draggedItemsPos = draggedItemPos;
                        }  else {
                            const calcNewStateFunc = type === 'drag' ? ktdGridItemDragging : ktdGridItemResizing;
                            newLayout = currentLayout;
                            gridItems.forEach((gridItem)=>{
                                const {layout, draggedItemPos} = calcNewStateFunc(gridItem, {
                                    layout: newLayout,
                                    rowHeight: this.rowHeight(),
                                    height: this.height(),
                                    cols: this.cols(),
                                    preventCollision: this.preventCollision(),
                                    gap: this.gap(),
                                }, this.compactType(), {
                                    pointerDownEvent,
                                    pointerDragEvent,
                                    gridElemClientRect,
                                    dragElemClientRect: dragElemClientRect[gridItem.id],
                                    scrollDifference
                                });
                                newLayout = layout;
                                draggedItemsPos[gridItem.id]=draggedItemPos;
                            });
                        }

                        const rowHeight = this.rowHeight();
                        const gap = this.gap();
                        this.gridCurrentHeight = this.height() ?? (rowHeight === 'fit' ? gridElemClientRect.height : getGridHeight(newLayout, rowHeight, gap))
                        this._gridItemsRenderData = layoutToRenderItems({
                            cols: this.cols(),
                            rowHeight,
                            height: this.height(),
                            layout: newLayout,
                            preventCollision: this.preventCollision(),
                            gap,
                        }, gridElemClientRect.width, gridElemClientRect.height);

                        // Modify the position of the dragged item to be the once we want (for example the mouse position or whatever)
                        gridItems.forEach((gridItem)=>{
                            newGridItemRenderData[gridItem.id] = {...this._gridItemsRenderData[gridItem.id]}
                            const placeholderStyles = parseRenderItemToPixels(newGridItemRenderData[gridItem.id]);

                            // Put the real final position to the placeholder element
                            this.placeholder[gridItem.id]!.style.width = placeholderStyles.width;
                            this.placeholder[gridItem.id]!.style.height = placeholderStyles.height;
                            this.placeholder[gridItem.id]!.style.transform = `translateX(${placeholderStyles.left}) translateY(${placeholderStyles.top})`;

                            this._gridItemsRenderData[gridItem.id] = {
                                ...draggedItemsPos[gridItem.id],
                                id: this._gridItemsRenderData[gridItem.id].id
                            };
                        });

                        this.setBackgroundCssVariables(rowHeight === 'fit' ? ktdGetGridItemRowHeight(newLayout, gridElemClientRect.height, gap) : rowHeight);
                        this.render();

                        gridItems.forEach((gridItem)=>{
                            // If we are performing a resize, and bounds have changed, emit event.
                            // NOTE: Only emit on resize for now. Use case for normal drag is not justified for now. Emitting on resize is, since we may want to re-render the grid item or the placeholder in order to fit the new bounds.
                            if (type === 'resize') {
                                const prevGridItem = currentLayout.find(item => item.id === gridItem.id)!;
                                const newGridItem = newLayout.find(item => item.id === gridItem.id)!;
                                // Check if item resized has changed, if so, emit resize change event
                                if (!ktdGridItemLayoutItemAreEqual(prevGridItem, newGridItem)) {
                                    this.gridItemResize.emit({
                                        width: newGridItemRenderData[gridItem.id].width,
                                        height: newGridItemRenderData[gridItem.id].height,
                                        gridItemRef: getDragResizeEventData(gridItem, newLayout).gridItemRef as KtdGridItemComponent
                                    });
                                }
                            }
                        });
                    },
                    (error) => observer.error(error),
                    () => {
                        this.ngZone.run(() => {
                            gridItems.forEach((gridItem)=>{
                                // Remove drag classes
                                this.renderer.removeClass(gridItem.elementRef.nativeElement, 'no-transitions');
                                this.renderer.removeClass(gridItem.elementRef.nativeElement, 'ktd-grid-item-dragging');

                                this.addGridItemAnimatingClass(gridItem).subscribe();
                                // Consider destroying the placeholder after the animation has finished.
                                this.destroyPlaceholder(gridItem.id);
                            });

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


    /**
     * It adds the `ktd-grid-item-animating` class and removes it when the animated transition is complete.
     * This function is meant to be executed when the drag has ended.
     * @param gridItem that has been dragged
     */
    private addGridItemAnimatingClass(gridItem: KtdGridItemComponent): Observable<undefined> {

        return new Observable(observer => {

            const duration = getTransformTransitionDurationInMs(gridItem.elementRef.nativeElement);

            if (duration === 0) {
                observer.next(undefined);
                observer.complete();
                return;
            }

            this.renderer.addClass(gridItem.elementRef.nativeElement, 'ktd-grid-item-animating');
            const handler = ((event: TransitionEvent) => {
                if (!event || (event.target === gridItem.elementRef.nativeElement && event.propertyName === 'transform')) {
                    this.renderer.removeClass(gridItem.elementRef.nativeElement, 'ktd-grid-item-animating');
                    removeEventListener();
                    clearTimeout(timeout);
                    observer.next(undefined);
                    observer.complete();
                }
            }) as EventListener;

            // If a transition is short enough, the browser might not fire the `transitionend` event.
            // Since we know how long it's supposed to take, add a timeout with a 50% buffer that'll
            // fire if the transition hasn't completed when it was supposed to.
            const timeout = setTimeout(handler, duration * 1.5);
            const removeEventListener = this.renderer.listen(gridItem.elementRef.nativeElement, 'transitionend', handler);
        })
    }

    /** Creates placeholder element */
    private createPlaceholderElement(gridItemId: string, clientRect: KtdClientRect, gridItemPlaceholder?: KtdGridItemPlaceholder) {
        this.placeholder[gridItemId] = this.renderer.createElement('div');
        this.placeholder[gridItemId]!.style.width = `${clientRect.width}px`;
        this.placeholder[gridItemId]!.style.height = `${clientRect.height}px`;
        this.placeholder[gridItemId]!.style.transform = `translateX(${clientRect.left}px) translateY(${clientRect.top}px)`;
        this.placeholder[gridItemId]!.classList.add('ktd-grid-item-placeholder');
        this.renderer.appendChild(this.elementRef.nativeElement, this.placeholder[gridItemId]);

        // Create and append custom placeholder if provided.
        // Important: Append it after creating & appending the container placeholder. This way we ensure parent bounds are set when creating the embeddedView.
        if (gridItemPlaceholder) {
            this.placeholderRef[gridItemId] = this.viewContainerRef.createEmbeddedView(
                gridItemPlaceholder.templateRef,
                gridItemPlaceholder.data
            );
            this.placeholderRef[gridItemId]!.rootNodes.forEach(node => this.placeholder[gridItemId]!.appendChild(node));
            this.placeholderRef[gridItemId]!.detectChanges();
        } else {
            this.placeholder[gridItemId]!.classList.add('ktd-grid-item-placeholder-default');
        }
    }

    /** Destroys the placeholder element and its ViewRef. */
    private destroyPlaceholder(gridItemId: string) {
        this.placeholder[gridItemId]?.remove();
        this.placeholderRef[gridItemId]?.destroy();
        this.placeholder[gridItemId] = this.placeholderRef[gridItemId] = null!;
    }

    private setInternalLayout(layout: KtdGridLayout) {
        this._layout = layout;
    }

    private syncSelectedItems() {
        if (!this._selectedItemsIds?.length || !this._gridItems) {
            this.selectedItems = undefined;
            return;
        }

        this.selectedItems = this._selectedItemsIds.map(
            (layoutItemId: string) =>
                this._gridItems.find(
                    (gridItem: KtdGridItemComponent) =>
                        gridItem.id === layoutItemId
                )!
        );
    }

    private applyBackgroundConfig(backgroundConfig: KtdGridBackgroundCfg | null) {
        const classList = (this.elementRef.nativeElement as HTMLDivElement).classList;
        backgroundConfig !== null ? classList.add('ktd-grid-background') : classList.remove('ktd-grid-background');
        this.setGridBackgroundVisible(backgroundConfig?.show === 'always');
    }

    private handleInputStateChanges(changes: {
        compactType: boolean;
        cols: boolean;
        layout: boolean;
        rowHeight: boolean;
        height: boolean;
        gap: boolean;
        backgroundConfig: boolean;
    }) {
        let needsCompactLayout = false;
        let needsRecalculateRenderData = false;

        if (changes.compactType || changes.cols || changes.layout) {
            needsCompactLayout = true;
        }

        if (needsCompactLayout || changes.rowHeight || changes.height || changes.gap || changes.backgroundConfig) {
            needsRecalculateRenderData = true;
        }

        if (needsCompactLayout && this.compactOnPropsChange()) {
            this.compactLayout();
        }

        if (needsRecalculateRenderData) {
            this.calculateRenderData();
        }
    }

    static ngAcceptInputType_cols: NumberInput;
    static ngAcceptInputType_rowHeight: NumberInput;
    static ngAcceptInputType_scrollSpeed: NumberInput;
    static ngAcceptInputType_compactOnPropsChange: BooleanInput;
    static ngAcceptInputType_preventCollision: BooleanInput;
}

