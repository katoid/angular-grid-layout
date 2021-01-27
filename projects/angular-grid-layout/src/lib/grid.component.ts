import {
    AfterContentChecked, AfterContentInit, ChangeDetectionStrategy, Component, ContentChildren, ElementRef, EventEmitter, Input, NgZone,
    OnChanges, OnDestroy, Output, QueryList, Renderer2, SimpleChanges, ViewEncapsulation
} from '@angular/core';
import { coerceNumberProperty } from './coercion/number-property';
import { KtdGridItemComponent } from './grid-item/grid-item.component';
import { merge, Observable, Observer, Subscription } from 'rxjs';
import { exhaustMap, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ktdGridItemDragging, ktdGridItemResizing } from './grid.utils';
import { compact, CompactType } from './react-grid-layout.utils';
import {
    GRID_ITEM_GET_RENDER_DATA_TOKEN, KtdGridCfg, KtdGridCompactType, KtdGridItemRect, KtdGridItemRenderData, KtdGridLayout,
    KtdGridLayoutItem
} from './grid.definitions';
import { ktdMouseOrTouchEnd, ktdMouseOrTouchMove } from './pointer.utils';
import { KtdDictionary } from '../types';

export interface KtdDragStart {
    layoutItem: KtdGridLayoutItem;
    gridItemRef: KtdGridItemComponent;
}

export type KtdResizeStart = KtdDragStart;

function getDragResizeStartData(gridItem: KtdGridItemComponent, layout: KtdGridLayout): KtdDragStart | KtdResizeStart {
    return {
        layoutItem: layout.find((item) => item.id === gridItem.id)!,
        gridItemRef: gridItem
    };
}

export interface KtdDragEnd {
    layout: KtdGridLayout;
    layoutItem: KtdGridLayoutItem;
    gridItemRef: KtdGridItemComponent;
}

export type KtdResizeEnd = KtdDragEnd;

function getDragResizeEndData(gridItem: KtdGridItemComponent, layout: KtdGridLayout): KtdDragEnd | KtdResizeEnd {
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
    @Output() configUpdated: EventEmitter<KtdGridCfg> = new EventEmitter<KtdGridCfg>();

    @Output() dragStarted: EventEmitter<KtdDragStart> = new EventEmitter<KtdDragStart>();
    @Output() resizeStarted: EventEmitter<KtdResizeStart> = new EventEmitter<KtdResizeStart>();
    @Output() dragEnded: EventEmitter<KtdDragEnd> = new EventEmitter<KtdDragEnd>();
    @Output() resizeEnded: EventEmitter<KtdResizeEnd> = new EventEmitter<KtdResizeEnd>();

    @Input() compactOnPropsChange = true;

    @Input()
    get compactType(): KtdGridCompactType {
        return this._compactType;
    }

    set compactType(val: KtdGridCompactType) {
        this._compactType = val;
    }

    private _compactType: KtdGridCompactType = 'vertical';

    @Input()
    get rowHeight(): number { return this._rowHeight; }

    set rowHeight(val: number) {
        this._rowHeight = Math.max(1, Math.round(coerceNumberProperty(val)));
    }

    private _rowHeight: number = 100;

    @Input()
    get cols(): number { return this._cols; }

    set cols(val: number) {
        this._cols = Math.max(1, Math.round(coerceNumberProperty(val)));
    }

    private _cols: number = 6;

    @Input()
    get layout(): KtdGridLayout { return this._layout; }

    set layout(layout: KtdGridLayout) {
        this._layout = layout;
    }

    private _layout: KtdGridLayout;


    get config(): KtdGridCfg {
        return {
            cols: this.cols,
            rowHeight: this.rowHeight,
            layout: this.layout
        };
    }

    set config(config: KtdGridCfg) {
        this.layout = config.layout;
        this.cols = config.cols;
        this.rowHeight = config.rowHeight;
    }

    /** Total height of the grid */
    private _height: number;
    private _gridItemsRenderData: KtdDictionary<KtdGridItemRenderData<number>>;
    private subscriptions: Subscription[];

    constructor(private elementRef: ElementRef, private renderer: Renderer2, private ngZone: NgZone) {

    }

    ngOnChanges(changes: SimpleChanges) {
        let pendingCompactLayout = false;
        // TODO: refactor and this when/how to compact layout
        if (changes.compactType && !changes.compactType.firstChange) {
            pendingCompactLayout = true;
        }
        if (changes.rowHeight && !changes.rowHeight.firstChange) {
            pendingCompactLayout = true;
        }
        if (changes.layout && !changes.layout.firstChange) {
            pendingCompactLayout = true;
        }

        if (pendingCompactLayout) {
            this.compactLayout();
        }
        this.calculateRenderData();
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
        this.layout = compact(
            this.layout.map((item) => ({...item, i: item.id})),
            this.compactType,
            this.cols
        ).map((item) => ({...item, id: item.i}));
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
                        // move
                        merge(...gridItems.map((gridItem) => {
                                return this.performDragAction$(
                                    gridItem,
                                    gridItem.dragStart$.pipe(tap(() => this.dragStarted.emit(getDragResizeStartData(gridItem, this.layout)))),
                                    (gridItemId, config, compactionType, draggingData) => ktdGridItemDragging(gridItemId, config, compactionType, draggingData)
                                ).pipe(
                                    tap((gridCfg) => this.dragEnded.emit(getDragResizeEndData(gridItem, gridCfg.layout)))
                                );
                            })
                        ),

                        // resize
                        merge(...gridItems.map((gridItem) => {
                            return this.performDragAction$(
                                gridItem,
                                gridItem.resizeStart$.pipe(tap(() => this.resizeStarted.emit(getDragResizeStartData(gridItem, this.layout)))),
                                (gridItemId, config, compactionType, draggingData) => ktdGridItemResizing(gridItemId, config, compactionType, draggingData)
                            ).pipe(
                                tap((gridCfg) => this.resizeEnded.emit(getDragResizeEndData(gridItem, gridCfg.layout)))
                            );
                        }))
                    );
                })
            ).subscribe((newConfig: KtdGridCfg) => {
                this.config = newConfig;
                this.calculateRenderData();
                this.configUpdated.emit(newConfig);
            })

        ];
    }

    /**
     * Perform a general grid drag action given a source$. A general grid drag action basically includes creating the placeholder element and adding
     * some class animations. calcNewStateFunc needs to be provided in order to calculate the new state of the layout.
     * @param gridItem that is been dragged
     * @param source$ input observable where when emit will start the drag action
     * @param calcNewStateFunc function that return the new layout state and the drag element position
     */
    private performDragAction$(gridItem: KtdGridItemComponent, source$: Observable<MouseEvent | TouchEvent>,
                               calcNewStateFunc: (gridItemId: string, config: KtdGridCfg, compactionType: CompactType, draggingData: { pointerDownEvent: MouseEvent | TouchEvent, pointerDragEvent: MouseEvent | TouchEvent, parentElemClientRect: ClientRect, dragElemClientRect: ClientRect }) => { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect }): Observable<KtdGridCfg> {

        return new Observable<KtdGridCfg>((observer: Observer<KtdGridCfg>) => {
            const subscription = this.ngZone.runOutsideAngular(() => source$.pipe(
                exhaustMap((pointerDownEvent: MouseEvent | TouchEvent) => {
                    pointerDownEvent.preventDefault();
                    pointerDownEvent.stopImmediatePropagation();
                    // Retrieve grid (parent) and gridItem (draggedElem) client rects.
                    const parentElemClientRect: ClientRect = (this.elementRef.nativeElement as HTMLElement).getBoundingClientRect();
                    const dragElemClientRect: ClientRect = (gridItem.elementRef.nativeElement as HTMLElement).getBoundingClientRect();

                    this.renderer.addClass(gridItem.elementRef.nativeElement, 'no-transitions');
                    this.renderer.addClass(gridItem.elementRef.nativeElement, 'ktd-grid-item-dragging');

                    // Create placeholder element. This element would represent the position where the dragged/resized element would be if the action ends
                    const placeholderElement: HTMLDivElement = this.renderer.createElement('div');
                    placeholderElement.style.width = `${dragElemClientRect.width}px`;
                    placeholderElement.style.height = `${dragElemClientRect.height}px`;
                    placeholderElement.style.transform = `translateX(${dragElemClientRect.left - parentElemClientRect.left}px) translateY(${dragElemClientRect.top - parentElemClientRect.top}px)`;

                    this.renderer.addClass(placeholderElement, 'ktd-grid-dragging-placeholder');
                    this.renderer.appendChild(this.elementRef.nativeElement, placeholderElement);

                    let newLayout: KtdGridLayoutItem[];

                    return ktdMouseOrTouchMove(window).pipe(
                        takeUntil(ktdMouseOrTouchEnd(window)),
                        tap((pointerDragEvent: MouseEvent | TouchEvent) => {
                                /**
                                 * Set the new layout to be the layout in which the calcNewStateFunc would be executed.
                                 * NOTE: using the mutated layout is the way to go by 'react-grid-layout' utils. If we don't use the previous layout,
                                 * some utilities from 'react-grid-layout' would not work as expected.
                                 */
                                const config: KtdGridCfg = {
                                    ...this.config,
                                    layout: newLayout || this.config.layout
                                };

                                const {layout, draggedItemPos} = calcNewStateFunc(gridItem.id, config, this.compactType, {
                                    pointerDownEvent,
                                    pointerDragEvent,
                                    parentElemClientRect,
                                    dragElemClientRect
                                });
                                newLayout = layout;

                                this._gridItemsRenderData = layoutToRenderItems({
                                    ...this.config,
                                    layout: newLayout
                                }, parentElemClientRect.width, parentElemClientRect.height);

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

                                this.updateGridItemsStyles();
                            },
                            (error) => observer.error(error),
                            () => {
                                this.ngZone.run(() => {
                                    // remove drag classes
                                    this.renderer.removeClass(gridItem.elementRef.nativeElement, 'no-transitions');
                                    this.renderer.removeClass(gridItem.elementRef.nativeElement, 'ktd-grid-item-dragging');

                                    // remove placeholder element from the dom
                                    // NOTE: If we don't put the removeChild inside the zone it would not work... This may be a bug from angular or maybe is the intended behaviour, although strange
                                    this.renderer.removeChild(this.elementRef.nativeElement, placeholderElement);

                                    if (!newLayout) {
                                        return;
                                    }

                                    observer.next({
                                        ...this.config,
                                        layout: newLayout
                                    });
                                });

                            }),
                    );
                }),
            ).subscribe());

            return () => subscription.unsubscribe();
        });
    }
}

