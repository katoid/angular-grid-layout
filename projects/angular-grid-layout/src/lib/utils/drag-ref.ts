import {ElementRef, NgZone} from "@angular/core";
import {coerceBooleanProperty} from "../coercion/boolean-property";
import {BehaviorSubject, combineLatest, iif, merge, NEVER, Observable, of, Subject, Subscription} from "rxjs";
import {exhaustMap, filter, map, startWith, switchMap, take, takeUntil} from "rxjs/operators";
import {ktdPointerClient, ktdPointerClientX, ktdPointerClientY, ktdPointerDown} from './pointer.utils';
import {ktdOutsideZone} from "./operators";
import {KtdGridService} from "../grid.service";
import {KtdGridDragHandle} from "../directives/drag-handle";
import {KtdGridItemPlaceholder} from "../directives/placeholder";
import {KtdGridItemComponent} from "../grid-item/grid-item.component";
import {KtdDrag} from "../directives/ktd-drag";
import {ktdGetScrollTotalRelativeDifference$, ktdScrollIfNearElementClientRect$} from "./scroll";
import {PointingDeviceEvent} from "../grid.component";
import {KtdGridResizeHandle} from "../directives/resize-handle";

export class DragRef<T = any> {
    private static _nextUniqueId: number = 0;

    id: string = `ktd-drag-${DragRef._nextUniqueId++}`;
    width: number = 0;
    height: number = 0;
    dragStartThreshold: number = 0;
    data: T;

    get scrollableParent(): HTMLElement | Document | string | null {
        return this._scrollableParent;
    }
    set scrollableParent(val: HTMLElement | Document | string | null) {
        this._scrollableParent = val;
        this.scrollableParent$.next(this._scrollableParent);
    }
    private _scrollableParent: HTMLElement | Document | string | null = null;
    private scrollableParent$: BehaviorSubject<HTMLElement | Document | string | null> = new BehaviorSubject<HTMLElement | Document | string | null>(this._scrollableParent);
    placeholder: KtdGridItemPlaceholder;
    scrollSpeed: number = 2;

    transformX: number = 0;
    transformY: number = 0;

    get dragHandles(): KtdGridDragHandle[] {
        return this._dragHandles;
    }
    set dragHandles(val: KtdGridDragHandle[]) {
        this._dragHandles = val;
        this._dragHandles$.next(this._dragHandles);
    }
    private _dragHandles: KtdGridDragHandle[] = [];
    private _dragHandles$: BehaviorSubject<KtdGridDragHandle[]> = new BehaviorSubject<KtdGridDragHandle[]>(this._dragHandles);

    get resizeHandles(): KtdGridDragHandle[] {
        return this._resizeHandles;
    }
    set resizeHandles(val: KtdGridResizeHandle[]) {
        this._resizeHandles = val;
        this._resizeHandles$.next(this._resizeHandles);
    }
    private _resizeHandles: KtdGridResizeHandle[] = [];
    private _resizeHandles$: BehaviorSubject<KtdGridResizeHandle[]> = new BehaviorSubject<KtdGridResizeHandle[]>(this._resizeHandles);

    get draggable(): boolean {
        return this._draggable;
    }
    set draggable(val: boolean) {
        this._draggable = coerceBooleanProperty(val);
        this._draggable$.next(this._draggable);
    }
    private _draggable: boolean = true;
    private _draggable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._draggable);

    get itemRef(): KtdGridItemComponent | KtdDrag<any> {
        return this._itemRef;
    }

    get isDragging(): boolean {
        return this._isDragging;
    }
    private _isDragging: boolean = false;

    private _manualDragEvents$: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();

    private dragStartSubject: Subject<{source: DragRef; event: MouseEvent | TouchEvent}> = new Subject<{source: DragRef; event: MouseEvent | TouchEvent}>();
    private dragMoveSubject: Subject<{source: DragRef; event: MouseEvent | TouchEvent}> = new Subject<{source: DragRef; event: MouseEvent | TouchEvent}>();
    private dragEndSubject: Subject<{source: DragRef; event: MouseEvent | TouchEvent}> = new Subject<{source: DragRef; event: MouseEvent | TouchEvent}>();

    readonly dragStart$ = new Observable<{source: DragRef; event: MouseEvent | TouchEvent}>();
    readonly dragMove$ = new Observable<{source: DragRef; event: MouseEvent | TouchEvent}>();
    readonly dragEnd$ = new Observable<{source: DragRef; event: MouseEvent | TouchEvent}>();

    private subscriptions: Subscription[] = [];
    private dragStartSubscription: Subscription;

    private readonly element: HTMLElement;

    constructor(
        public elementRef: ElementRef<HTMLElement>,
        private _gridService: KtdGridService,
        private _ngZone: NgZone,
        private _itemRef: KtdGridItemComponent | KtdDrag<any>,
    ) {
        this.dragStart$ = this.dragStartSubject.asObservable();
        this.dragMove$ = this.dragMoveSubject.asObservable();
        this.dragEnd$ = this.dragEndSubject.asObservable();

        this.dragStartSubscription = this._dragStart$().subscribe(this.dragStartSubject);

        this.element = this.elementRef.nativeElement as HTMLElement;
        this.initDrag();
    }

    public dispose() {
        this._manualDragEvents$.complete();
        this.dragStartSubject.complete();
        this.dragMoveSubject.complete();
        this.dragEndSubject.complete();

        this._manualDragEvents$.unsubscribe();
        this.dragStartSubject.unsubscribe();
        this.dragMoveSubject.unsubscribe();
        this.dragEndSubject.unsubscribe();
        this.dragStartSubscription.unsubscribe();

        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }

    /**
     * Initialize the drag of ktd-drag element, placeholder dragging is handled by ktd-grid.
     * The element will be freely draggable, when drag ends it will snap back to its initial place.
     */
    private initDrag(): Subscription {
        return this.scrollableParent$.pipe(
            switchMap((newScrollableParent) => {
                this.subscriptions.forEach(subscription => subscription.unsubscribe());

                const scrollableParent = typeof newScrollableParent === 'string' ? document.getElementById(newScrollableParent) : newScrollableParent;

                let scrollSubscription: Subscription | null = null;
                let dragSubscription: Subscription | null = null;

                const dragStart$ = this.dragStart$.subscribe(({event}) => {
                    const initialX = ktdPointerClientX(event) - this.transformX;
                    const initialY = ktdPointerClientY(event) - this.transformY;

                    scrollSubscription = this._ngZone.runOutsideAngular(() =>
                        (!scrollableParent ? NEVER : this.dragMove$.pipe(
                            map(({event}) => ({
                                pointerX: ktdPointerClientX(event),
                                pointerY: ktdPointerClientY(event)
                            })),
                            ktdScrollIfNearElementClientRect$(scrollableParent, {scrollStep: 2}),
                            takeUntil(this.dragEnd$)
                        )).subscribe());

                    dragSubscription = this._ngZone.runOutsideAngular(() =>
                        merge(
                            combineLatest([
                                this.dragMove$,
                                ...(!scrollableParent ? [of({top: 0, left: 0})] : [
                                    ktdGetScrollTotalRelativeDifference$(scrollableParent).pipe(
                                        startWith({top: 0, left: 0}) // Force first emission to allow CombineLatest to emit even no scroll event has occurred
                                    )
                                ])
                            ])
                        ).pipe(
                            takeUntil(this.dragEnd$),
                        ).subscribe(([{event}, scrollDifference]: [{source: DragRef<T>, event: PointingDeviceEvent}, { top: number, left: number }]) => {
                            event.preventDefault();

                            const currentX = ktdPointerClientX(event) - initialX - scrollDifference.left;
                            const currentY = ktdPointerClientY(event) - initialY - scrollDifference.top;

                            this.element.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
                        }));
                });

                const dragEnd$ = this.dragEnd$.subscribe(() => {
                    scrollSubscription?.unsubscribe();
                    dragSubscription?.unsubscribe();
                    this.element.style.transform = `translate3d(${this.transformX}px, ${this.transformY}px, 0)`;
                });

                this.subscriptions = [dragStart$, dragEnd$];
                // Return an observable that completes when the dragEnd$ observable completes
                return this.dragEnd$.pipe(takeUntil(this.dragEnd$));
            })
        ).subscribe();
    }

    public startDragManual(event: MouseEvent | TouchEvent) {
        this._manualDragEvents$.next(event);
    }

    private _dragStart$(): Observable<{source: DragRef, event: MouseEvent | TouchEvent}> {
        return merge(
            this._manualDragEvents$,
            this._draggable$.pipe(
                filter(draggable => draggable),
                switchMap(() => this._dragHandles$.pipe(
                    switchMap(dragHandles =>
                        iif(() => dragHandles.length > 0,
                            merge(...dragHandles.map(dragHandle => ktdPointerDown(dragHandle.element.nativeElement))),
                            ktdPointerDown(this.elementRef.nativeElement)
                        )
                    )
                ))
            )
        ).pipe(
            exhaustMap((startEvent) => {
                // If the event started from an element with the native HTML drag&drop, it'll interfere
                // with our positioning logic since it'll start dragging the native element.
                if (startEvent.target && (startEvent.target as HTMLElement).draggable && startEvent.type === 'pointerdown') {
                    startEvent.preventDefault();
                }

                const startPointer = ktdPointerClient(startEvent);
                return this._gridService.pointerMove$.pipe(
                    takeUntil(this._gridService.pointerEnd$),
                    ktdOutsideZone(this._ngZone),
                    filter((moveEvent) => {
                        moveEvent.preventDefault();
                        const movePointer = ktdPointerClient(moveEvent);
                        const distanceX = Math.abs(startPointer.clientX - movePointer.clientX);
                        const distanceY = Math.abs(startPointer.clientY - movePointer.clientY);
                        // When this conditions returns true mean that we are over threshold.
                        return distanceX + distanceY >= this.dragStartThreshold;
                    }),
                    take(1),
                    map((moveEvent) => {
                        // Emit the move event, so the user can perform any action while dragging.
                        this._gridService.pointerMove$.pipe(
                            takeUntil(this._gridService.pointerEnd$),
                        ).subscribe((moveEvent) => {
                            this._isDragging = true;
                            this.dragMoveSubject.next({source: this, event: moveEvent});
                        });

                        // Emit the end event, so the user can perform any action when the drag stops;
                        this._gridService.pointerEnd$.pipe(
                            filter(() => this._isDragging),
                            take(1),
                        ).subscribe((event) => {
                            this._isDragging = false;
                            this.dragEndSubject.next({source: this, event});
                        });

                        // Emit the start event, so the user can perform any action when the drag starts.
                        return {source: this, event: moveEvent};
                    }),
                );
            })
        );
    }
}
