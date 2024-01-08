import {ElementRef, NgZone} from "@angular/core";
import {coerceBooleanProperty} from "../coercion/boolean-property";
import {BehaviorSubject, iif, merge, NEVER, Observable, Subject, Subscription} from "rxjs";
import {exhaustMap, filter, map, switchMap, take, takeUntil} from "rxjs/operators";
import { ktdPointerClient, ktdPointerDown, ktdPointerMove } from './pointer.utils';
import {ktdOutsideZone} from "./operators";
import {KtdGridService} from "../grid.service";
import {KtdGridDragHandle} from "../directives/drag-handle";
import {KtdGridItemPlaceholder} from "../directives/placeholder";
import {KtdGridItemComponent} from "../grid-item/grid-item.component";
import {KtdDrag} from "../directives/ktd-drag";

export class DragRef<T = any> {
    private static _nextUniqueId: number = 0;

    get dragHandles(): KtdGridDragHandle[] {
        return this._dragHandles;
    }
    set dragHandles(val: KtdGridDragHandle[]) {
        this._dragHandles = val;
        this._dragHandles$.next(this._dragHandles);
    }
    private _dragHandles: KtdGridDragHandle[] = [];
    private _dragHandles$: BehaviorSubject<KtdGridDragHandle[]> = new BehaviorSubject<KtdGridDragHandle[]>(this._dragHandles);

    placeholder: KtdGridItemPlaceholder;

    id: string = `ktd-drag-${DragRef._nextUniqueId++}`;
    width: number = 0;
    height: number = 0;
    dragStartThreshold: number = 0;
    data: T;

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

    constructor(
        public elementRef: ElementRef<HTMLElement>,
        private _gridService: KtdGridService,
        private _ngZone: NgZone,
        private _itemRef: KtdGridItemComponent | KtdDrag<any>,
    ) {
        this.dragStart$ = this.dragStartSubject.asObservable();
        this.dragMove$ = this.dragMoveSubject.asObservable();
        this.dragEnd$ = this.dragEndSubject.asObservable();

        this.subscriptions.push(
            this._dragStart$().subscribe(this.dragStartSubject),
        );
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

        this.subscriptions.forEach(subscription => subscription.unsubscribe());
    }

    public startDragManual(event: MouseEvent | TouchEvent) {
        this._manualDragEvents$.next(event);
    }

    private _dragStart$(): Observable<{source: DragRef, event: MouseEvent | TouchEvent}> {
        return merge(
            this._manualDragEvents$,
            this._draggable$.pipe(
                switchMap((draggable) => {
                    if (!draggable) {
                        return NEVER;
                    }

                    return this._dragHandles$.pipe(
                        switchMap((dragHandles: KtdGridDragHandle[]) => {
                            return iif(
                                () => dragHandles.length > 0,
                                merge(...dragHandles.map(dragHandle => ktdPointerDown(dragHandle.element.nativeElement))),
                                ktdPointerDown(this.elementRef.nativeElement)
                            )
                        })
                    );
                })
            )
        ).pipe(
            exhaustMap((startEvent) => {
                // If the event started from an element with the native HTML drag&drop, it'll interfere
                // with our positioning logic since it'll start dragging the native element.
                if (startEvent.target && (startEvent.target as HTMLElement).draggable && startEvent.type === 'mousedown') {
                    startEvent.preventDefault();
                }

                const startPointer = ktdPointerClient(startEvent);
                return this._gridService.mouseTouchMove$.pipe(
                    takeUntil(this._gridService.mouseTouchEnd$),
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
                        this._gridService.mouseTouchMove$.pipe(
                            takeUntil(this._gridService.mouseTouchEnd$),
                        ).subscribe((moveEvent) => {
                            this._isDragging = true;
                            this.dragMoveSubject.next({source: this, event: moveEvent});
                        });

                        // Emit the end event, so the user can perform any action when the drag stops;
                        this._gridService.mouseTouchEnd$.pipe(
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
