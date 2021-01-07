import {
    AfterContentChecked, AfterContentInit, ChangeDetectionStrategy, Component, ContentChildren, ElementRef, EventEmitter, Input, NgZone,
    OnChanges, OnDestroy, Output, QueryList, Renderer2, ViewEncapsulation
} from '@angular/core';
import { coerceNumberProperty } from './coercion/number-property';
import { KtdGridItemComponent } from './grid-item/grid-item.component';
import { merge, Observable, Observer, Subscription } from 'rxjs';
import { startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ktdGridItemDragging, ktdGridItemResizing } from './grid.utils';
import { CompactType } from './react-grid-layout.utils';
import { GRID_ITEM_GET_RENDER_DATA_TOKEN, KtdGridCfg, KtdGridItemRect, KtdGridItemRenderData, KtdGridLayoutItem } from './grid.definitions';
import { ktdMouseOrTouchEnd, ktdMouseOrTouchMove } from './pointer.utils';
import { KtdDictionary } from '../types';


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
        return parseRenderItemToPixels(gridCmp.getItemRenderData(id)!);
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

    /** Number of columns being rendered. */
    private _cols: number;

    /** Row height value passed in by user. */
    private _rowHeight: number;

    /** Grid configuration */
    private _config: KtdGridCfg;

    private compactionType: CompactType = 'vertical';
    private _gridItemsRenderData: KtdDictionary<KtdGridItemRenderData<number>>;
    private subscriptions: Subscription[];


    /** Amount of columns in the grid list. */
    @Input()
    get config(): KtdGridCfg {
        return this._config;
    }

    set config(val: KtdGridCfg) {
        this._config = val;

        this._cols = Math.max(1, Math.round(coerceNumberProperty(this._config.cols)));
        this._rowHeight = this._config.rowHeight; // `${this._config.rowHeight == null ? '' : this._config.rowHeight}`;
    }

    constructor(private elementRef: ElementRef, private renderer: Renderer2, private ngZone: NgZone) {

    }

    ngOnChanges() {
        this.calculateRenderData();
    }

    ngAfterContentInit() {
        this.initSubscriptions();
    }

    ngAfterContentChecked() {
        this.updateGridItemsStyles();
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    getItemRenderData(itemId: string): KtdGridItemRenderData<number> | undefined {
        return this._gridItemsRenderData[itemId];
    }

    updateLayout() {
        this.calculateRenderData();
        this.updateGridItemsStyles();
    }

    calculateRenderData() {
        const clientRect = (this.elementRef.nativeElement as HTMLElement).getBoundingClientRect();
        this._gridItemsRenderData = layoutToRenderItems(this._config, clientRect.width, clientRect.height);
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
                                return this.performDragAction$(gridItem, gridItem.dragStart$(),
                                    (gridItemId, config, compactionType, draggingData) => ktdGridItemDragging(gridItemId, config, compactionType, draggingData));
                            })
                        ),

                        // resize
                        merge(...gridItems.map((gridItem) => {
                            return this.performDragAction$(gridItem, gridItem.resizeStart$(),
                                (gridItemId, config, compactionType, draggingData) => ktdGridItemResizing(gridItemId, config, compactionType, draggingData));
                        }))
                    );
                })
            ).subscribe((newConfig: KtdGridCfg) => {
                this._config = newConfig;
                this.calculateRenderData();
                this.configUpdated.next(newConfig);
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
                               calcNewStateFunc: (gridItemId: string, config: KtdGridCfg, compactionType: CompactType, draggingData: { pointerDownEvent: MouseEvent | TouchEvent, pointerDragEvent: MouseEvent | TouchEvent, parentElemClientRect: ClientRect, dragElemClientRect: ClientRect }) => { layout: KtdGridLayoutItem[]; draggedItemPos: KtdGridItemRect }) {

        return new Observable<KtdGridCfg>((observer: Observer<KtdGridCfg>) => {
            const subscription = this.ngZone.runOutsideAngular(() => source$.pipe(
                switchMap((pointerDownEvent: MouseEvent | TouchEvent) => {
                    pointerDownEvent.preventDefault();
                    pointerDownEvent.stopImmediatePropagation();
                    // Retrieve grid (parent) and gridItem (draggedElem) client rects.
                    const parentElemClientRect: ClientRect = (this.elementRef.nativeElement as HTMLElement).getBoundingClientRect();
                    const dragElemClientRect: ClientRect = (gridItem.elementRef.nativeElement as HTMLElement).getBoundingClientRect();

                    this.renderer.addClass(gridItem.elementRef.nativeElement, 'no-transitions');
                    this.renderer.addClass(gridItem.elementRef.nativeElement, 'grid-elem-dragging');

                    // Create placeholder element. This element would represent the position where the dragged/resized element would be if the action ends
                    const placeholderElement: HTMLDivElement = this.renderer.createElement('div');
                    placeholderElement.style.width = `${dragElemClientRect.width}px`;
                    placeholderElement.style.height = `${dragElemClientRect.height}px`;
                    placeholderElement.style.transform = `translateX(${dragElemClientRect.left - parentElemClientRect.left}px) translateY(${dragElemClientRect.top - parentElemClientRect.top}px)`;

                    this.renderer.addClass(placeholderElement, 'dragging-pos-element');
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

                                const {layout, draggedItemPos} = calcNewStateFunc(gridItem.id, config, this.compactionType, {
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
                                    this.renderer.removeClass(gridItem.elementRef.nativeElement, 'grid-elem-dragging');

                                    // remove placeholder element from the dom
                                    // NOTE: If we don't put the removeChild inside the zone it would not work... This may be a bug from angular or maybe is the intended behaviour, although strange
                                    this.renderer.removeChild(this.elementRef.nativeElement, placeholderElement);

                                    if (!newLayout) {
                                        return;
                                    }

                                    observer.next({
                                        ...this._config,
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

