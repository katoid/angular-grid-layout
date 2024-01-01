import {
    AfterContentInit, ContentChild, ContentChildren,
    Directive, ElementRef,
    InjectionToken, Input, OnDestroy, Output, QueryList
} from '@angular/core';
import {coerceBooleanProperty} from "../coercion/boolean-property";
import {BehaviorSubject, Observable, Observer, Subscription} from "rxjs";
import {coerceNumberProperty} from "../coercion/number-property";
import {KtdRegistryService} from "../ktd-registry.service";
import {KTD_GRID_DRAG_HANDLE, KtdGridDragHandle} from "./drag-handle";
import {DragRef} from "../utils/drag-ref";
import {KTD_GRID_ITEM_PLACEHOLDER, KtdGridItemPlaceholder} from "./placeholder";
import {ktdPointerClientX, ktdPointerClientY} from "../utils/pointer.utils";
import {takeUntil} from "rxjs/operators";


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
        return this._dragStartThreshold;
    }
    set dragStartThreshold(val: number) {
        this._dragStartThreshold = coerceNumberProperty(val);
    }
    private _dragStartThreshold: number = 0;

    /** Whether the item is draggable or not. Defaults to true. Does not affect manual dragging using the startDragManually method. */
    @Input()
    get draggable(): boolean {
        return this._draggable;
    }
    set draggable(val: boolean) {
        this._draggable = coerceBooleanProperty(val);
        this._dragRef.draggable = this._draggable;
        this._draggable$.next(this._draggable);
    }
    private _draggable: boolean = true;
    private _draggable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._draggable);

    @Input()
    get id(): string {
        return this._dragRef.id;
    }
    set id(val: string) {
        this._dragRef.id = val;
    }

    /**
     * Width of the draggable item, in cols. When set to 0 we will use the width of grid.
     */
    @Input()
    get width(): number {
        return this._dragRef.width;
    }
    set width(val: number) {
        this._dragRef.width = coerceNumberProperty(val);
    }

    /**
     * Height of the draggable item, in cols. When set to 0 we will use the height of grid.
     */
    @Input()
    get height(): number {
        return this._dragRef.height;
    }
    set height(val: number) {
        this._dragRef.height = coerceNumberProperty(val);
    }

    /**
     * TODO: Add support for custom drag data.
     */
    @Input('ktdDragData') data: T;

    @Output('dragStart')
    readonly dragStart: Observable<{source: DragRef<T>, event: MouseEvent | TouchEvent}> = new Observable(
        (observer: Observer<{source: DragRef<T>, event: MouseEvent | TouchEvent}>) => {
            const subscription = this._dragRef.dragStart$
                .subscribe(observer);

            return () => {
                subscription.unsubscribe();
            };
        },
    );

    @Output('dragMove')
    readonly dragMove: Observable<{source: DragRef<T>, event: MouseEvent | TouchEvent}> = new Observable(
        (observer: Observer<{source: DragRef<T>, event: MouseEvent | TouchEvent}>) => {
            const subscription = this._dragRef.dragMove$
                .subscribe(observer);

            return () => {
                subscription.unsubscribe();
            };
        },
    );

    @Output('dragEnd')
    readonly dragEnd: Observable<{source: DragRef<T>, event: MouseEvent | TouchEvent}> = new Observable(
        (observer: Observer<{source: DragRef<T>, event: MouseEvent | TouchEvent}>) => {
            const subscription = this._dragRef.dragEnd$
                .subscribe(observer);

            return () => {
                subscription.unsubscribe();
            };
        },
    );

    public _dragRef: DragRef<T>;
    private subscriptions: Subscription[] = [];
    private element: HTMLElement;

    constructor(
        /** Element that the draggable is attached to. */
        public elementRef: ElementRef,
        private registryService: KtdRegistryService,
    ) {
        this._dragRef = this.registryService.createKtgDrag(this.elementRef, this, this.data);
    }

    ngAfterContentInit(): void {
        this.element = this.elementRef.nativeElement as HTMLElement;
        this.registryService.registerKtgDragItem(this);
        this.initDrag();
    }

    ngOnDestroy(): void {
        this.registryService.unregisterKtgDragItem(this);
        this.registryService.destroyKtgDrag(this._dragRef);
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }

    /**
     * Initialize the drag of ktd-drag element, placeholder dragging is handled by ktd-grid.
     * The element will be freely draggable, when drag ends it will snap back to its initial place.
     */
    private initDrag() {
        this._dragRef.dragStartThreshold = this.dragStartThreshold;
        this._dragRef.placeholder = this.placeholder;
        this._dragRef.draggable = this.draggable;
        this._dragRef.dragHandles = this._dragHandles.toArray();

        const handlesSub$ = this._dragHandles.changes.subscribe(() => {
            console.log(this._dragHandles.toArray());
            this._dragRef.dragHandles = this._dragHandles.toArray();
        });

        const dragStart$ = this.dragStart.subscribe(({event}) => {
            let currentX = 0,
                currentY = 0;

            const initialX = ktdPointerClientX(event) - currentX;
            const initialY = ktdPointerClientY(event) - currentY;

            this.dragMove.pipe(
                takeUntil(this.dragEnd),
            ).subscribe(({event}) => {
                event.preventDefault();

                // Calculate the new cursor position:
                currentX = ktdPointerClientX(event) - initialX;
                currentY = ktdPointerClientY(event) - initialY;

                /**
                 * TODO: Add support handling scroll offset
                 *
                 * Possible solution would be to add for each scrollParent element observable that emits scroll offset,
                 * and use the offset when we are on top of the scrollParent.
                 * Still dont know how we would handle nested scrollParents, generated by nested grids.
                 */

                this.element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            });
        });

        const dragEnd$ = this.dragEnd.subscribe(() => {
            this.element.style.transform = 'none';
        });

        this.subscriptions.push(handlesSub$, dragStart$, dragEnd$);
    }
}
