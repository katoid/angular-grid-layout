import {
    AfterContentInit, ContentChild, ContentChildren,
    Directive, ElementRef,
    InjectionToken, Input, OnDestroy, Output, QueryList
} from '@angular/core';
import {coerceBooleanProperty} from "../coercion/boolean-property";
import {Observable, Observer, Subscription} from "rxjs";
import {coerceNumberProperty} from "../coercion/number-property";
import {KtdRegistryService} from "../ktd-registry.service";
import {KTD_GRID_DRAG_HANDLE, KtdGridDragHandle} from "./drag-handle";
import {DragRef} from "../utils/drag-ref";
import {KTD_GRID_ITEM_PLACEHOLDER, KtdGridItemPlaceholder} from "./placeholder";
import {KtdGridComponent, PointingDeviceEvent} from "../grid.component";
import {KtdGridService} from "../grid.service";


export const KTD_DRAG = new InjectionToken<KtdDrag<any>>('KtdDrag');

@Directive({
    selector: '[ktdDrag]',
    host: {
        '[class.ktd-draggable]': '_dragHandles.length === 0 && draggable',
        '[class.ktd-dragging]': '_dragRef.isDragging',
        '[class.ktd-drag-disabled]': 'disabled',
    },
    providers: [{provide: KTD_DRAG, useExisting: KtdDrag}]
})
export class KtdDrag<T> implements AfterContentInit, OnDestroy {
    /** Elements that can be used to drag the draggable item. */
    @ContentChildren(KTD_GRID_DRAG_HANDLE, {descendants: true}) _dragHandles: QueryList<KtdGridDragHandle>;

    /** Template ref for placeholder */
    @ContentChild(KTD_GRID_ITEM_PLACEHOLDER) placeholder: KtdGridItemPlaceholder;

    @Input()
    get disabled(): boolean {
        return this._disabled;
    }
    set disabled(value: boolean) {
        this._disabled = coerceBooleanProperty(value);
        this._dragRef.draggable = !this._disabled;
    }
    private _disabled: boolean = false;

    /** Minimum amount of pixels that the user should move before it starts the drag sequence. */
    @Input()
    get dragStartThreshold(): number {
        return this._dragRef.dragStartThreshold;
    }
    set dragStartThreshold(val: number) {
        this._dragRef.dragStartThreshold = coerceNumberProperty(val);
    }

    /** Number of CSS pixels that would be scrolled on each 'tick' when auto scroll is performed. */
    @Input()
    get scrollSpeed(): number { return this._dragRef.scrollSpeed; }
    set scrollSpeed(value: number) {
        this._dragRef.scrollSpeed = coerceNumberProperty(value, 2);
    }

    /**
     * Parent element that contains the scroll. If an string is provided it would search that element by id on the dom.
     * If no data provided or null autoscroll is not performed.
     */
    @Input()
    get scrollableParent(): HTMLElement | Document | string | null { return this._dragRef.scrollableParent; }
    set scrollableParent(value: HTMLElement | Document | string | null) {
        this._dragRef.scrollableParent = value;
    }

    /** Whether the item is draggable or not. Defaults to true. Does not affect manual dragging using the startDragManually method. */
    @Input()
    get draggable(): boolean {
        return this._dragRef.draggable;
    }
    set draggable(val: boolean) {
        this._dragRef.draggable = coerceBooleanProperty(val);
    }

    /**
     * List of ids of grids or grid components that the item is connected to.
     */
    @Input()
    get connectedTo(): KtdGridComponent[] {
        return this._connectedTo;
    }
    set connectedTo(val: (string|KtdGridComponent|any)[]) {
        this._connectedTo = val.map((item: string|KtdGridComponent|any) => {
            if (typeof item === 'string') {
                const grid = this.registryService._ktgGrids.find(grid => grid.id === item);
                if (grid === undefined) {
                    throw new Error(`KtdDrag connectedTo: could not find grid with id ${item}`);
                }
                return grid;
            }
            if (item instanceof KtdGridComponent) {
                return item;
            }
            throw new Error(`KtdDrag connectedTo: connectedTo must be an array of KtdGridComponent or string`);
        });
        this.registryService.updateConnectedTo(this._dragRef, this._connectedTo);
    }
    private _connectedTo: KtdGridComponent[] = [];

    @Input()
    get id(): string {
        return this._dragRef.id;
    }
    set id(val: string) {
        this._dragRef.id = val;
    }

    /**
     * Width of the draggable item, in cols. Minimum value is 1. Maximum value is how many cols the grid has.
     */
    @Input()
    get width(): number {
        return this._dragRef.width;
    }
    set width(val: number) {
        const width = coerceNumberProperty(val);
        this._dragRef.width = width <= 0 ? 1 : width;
    }

    /**
     * Height of the draggable item, in cols. Minimum value is 1. Maximum value is how many rows the grid has.
     */
    @Input()
    get height(): number {
        return this._dragRef.height;
    }
    set height(val: number) {
        const height = coerceNumberProperty(val);
        this._dragRef.height = height <= 0 ? 1 : height;
    }

    @Input('ktdDragData')
    set data(val: T) {
        this._dragRef.data = val;
    }

    @Output('dragStart')
    readonly dragStart: Observable<{source: DragRef<T>, event: PointingDeviceEvent}> = new Observable(
        (observer: Observer<{source: DragRef<T>, event: PointingDeviceEvent}>) => {
            const subscription = this._dragRef.dragStart$
                .subscribe(observer);

            return () => {
                subscription.unsubscribe();
            };
        },
    );

    @Output('dragMove')
    readonly dragMove: Observable<{source: DragRef<T>, event: PointingDeviceEvent}> = new Observable(
        (observer: Observer<{source: DragRef<T>, event: PointingDeviceEvent}>) => {
            const subscription = this._dragRef.dragMove$
                .subscribe(observer);

            return () => {
                subscription.unsubscribe();
            };
        },
    );

    @Output('dragEnd')
    readonly dragEnd: Observable<{source: DragRef<T>, event: PointingDeviceEvent}> = new Observable(
        (observer: Observer<{source: DragRef<T>, event: PointingDeviceEvent}>) => {
            const subscription = this._dragRef.dragEnd$
                .subscribe(observer);

            return () => {
                subscription.unsubscribe();
            };
        },
    );

    public _dragRef: DragRef<T>;

    private subscriptions: Subscription[] = [];

    constructor(
        /** Element that the draggable is attached to. */
        public elementRef: ElementRef,
        private gridService: KtdGridService,
        private registryService: KtdRegistryService,
    ) {
        this._dragRef = this.registryService.createKtgDrag(this.elementRef, this.gridService, this);
    }

    ngAfterContentInit(): void {
        this.registryService.registerKtgDragItem(this);
        this.subscriptions.push(
            this._dragHandles.changes.subscribe(() => {
                this._dragRef.dragHandles = this._dragHandles.toArray();
            }),
            this.dragStart.subscribe(({event}) => {
                this.gridService.startDrag(event, this._dragRef, 'drag');
            }),
        );
    }

    ngOnDestroy(): void {
        this.registryService.unregisterKtgDragItem(this);
        this.registryService.destroyKtgDrag(this._dragRef);
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }
}
