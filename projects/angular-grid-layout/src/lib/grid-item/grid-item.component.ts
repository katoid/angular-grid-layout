import {
  AfterContentInit, ChangeDetectionStrategy, Component, ContentChild, ContentChildren, DestroyRef, DOCUMENT, effect, ElementRef, HostBinding, inject, input, NgZone, OnInit,
  QueryList, Renderer2, ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, NEVER, Observable, Subject, iif, merge } from 'rxjs';
import { exhaustMap, filter, map, startWith, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { BooleanInput, coerceBooleanProperty } from '../coercion/boolean-property';
import { NumberInput, coerceNumberProperty } from '../coercion/number-property';
import { KTD_GRID_DRAG_HANDLE, KtdGridDragHandle } from '../directives/drag-handle';
import { KTD_GRID_ITEM_PLACEHOLDER, KtdGridItemPlaceholder } from '../directives/placeholder';
import { KTD_GRID_RESIZE_HANDLE, KtdGridResizeHandle } from '../directives/resize-handle';
import { GRID_ITEM_GET_RENDER_DATA_TOKEN, KtdGridItemRenderDataTokenType } from '../grid.definitions';
import { KtdGridService } from '../grid.service';
import { ktdOutsideZone } from '../utils/operators';
import { ktdIsMouseEventOrMousePointerEvent, ktdPointerClient, ktdPointerDown, ktdPointerUp } from '../utils/pointer.utils';


@Component({
    standalone: true,
    selector: 'ktd-grid-item',
    templateUrl: './grid-item.component.html',
    styleUrls: ['./grid-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KtdGridItemComponent implements OnInit, AfterContentInit {
    /** Elements that can be used to drag the grid item. */
    @ContentChildren(KTD_GRID_DRAG_HANDLE, {descendants: true}) _dragHandles: QueryList<KtdGridDragHandle>;
    @ContentChildren(KTD_GRID_RESIZE_HANDLE, {descendants: true}) _resizeHandles: QueryList<KtdGridResizeHandle>;
    @ViewChild('resizeElem', {static: true, read: ElementRef}) resizeElem: ElementRef;

    /** Template ref for placeholder */
    @ContentChild(KTD_GRID_ITEM_PLACEHOLDER) placeholder: KtdGridItemPlaceholder;

    /** Min and max size input properties. Any of these would 'override' the min/max values specified in the layout. */
    readonly _minWInput = input<number | undefined, NumberInput>(undefined, {
        alias: 'minW',
        transform: (value: NumberInput) => value == null ? undefined : coerceNumberProperty(value)
    });
    readonly _minHInput = input<number | undefined, NumberInput>(undefined, {
        alias: 'minH',
        transform: (value: NumberInput) => value == null ? undefined : coerceNumberProperty(value)
    });
    readonly _maxWInput = input<number | undefined, NumberInput>(undefined, {
        alias: 'maxW',
        transform: (value: NumberInput) => value == null ? undefined : coerceNumberProperty(value)
    });
    readonly _maxHInput = input<number | undefined, NumberInput>(undefined, {
        alias: 'maxH',
        transform: (value: NumberInput) => value == null ? undefined : coerceNumberProperty(value)
    });

    /** CSS transition style. Note that for more performance is preferable only make transition on transform property. */
    readonly _transitionInput = input('transform 500ms ease, width 500ms ease, height 500ms ease', {alias: 'transition'});

    /** Dynamically apply `touch-action` to the host element based on draggable */
    @HostBinding('style.touch-action') get touchAction(): string {
        return this.draggable ? 'none' : 'auto';
    }

    /** Id of the grid item. This property is strictly compulsory. */
    readonly _idInput = input.required<string>({alias: 'id'});

    /** Minimum amount of pixels that the user should move before it starts the drag sequence. */
    readonly _dragStartThresholdInput = input(0, {
        alias: 'dragStartThreshold',
        transform: (value: NumberInput) => coerceNumberProperty(value)
    });


    /** Whether the item is draggable or not. Defaults to true. Does not affect manual dragging using the startDragManually method. */
    readonly _draggableInput = input(true, {
        alias: 'draggable',
        transform: (value: BooleanInput) => coerceBooleanProperty(value)
    });
    private _draggable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.draggable);

    private _manualDragEvents$: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();

    /** Whether the item is resizable or not. Defaults to true. */
    readonly _resizableInput = input(true, {
        alias: 'resizable',
        transform: (value: BooleanInput) => coerceBooleanProperty(value)
    });
    private _resizable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this.resizable);

    private dragStartSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();
    private resizeStartSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();

    readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);
    private readonly gridService = inject(KtdGridService);
    private readonly renderer = inject(Renderer2);
    private readonly ngZone = inject(NgZone);
    private readonly document = inject<Document>(DOCUMENT);
    private readonly getItemRenderData = inject<KtdGridItemRenderDataTokenType>(GRID_ITEM_GET_RENDER_DATA_TOKEN);

    dragStart$ = this.dragStartSubject.asObservable();
    resizeStart$ = this.resizeStartSubject.asObservable();

    get minW(): number | undefined { return this._minWInput(); }
    get minH(): number | undefined { return this._minHInput(); }
    get maxW(): number | undefined { return this._maxWInput(); }
    get maxH(): number | undefined { return this._maxHInput(); }
    get transition(): string { return this._transitionInput(); }
    get id(): string { return this._idInput(); }
    get dragStartThreshold(): number { return this._dragStartThresholdInput(); }
    get draggable(): boolean { return this._draggableInput(); }
    get resizable(): boolean { return this._resizableInput(); }

    private readonly _draggableEffect = effect(() => {
        this._draggable$.next(this.draggable);
    });

    private readonly _resizableEffect = effect(() => {
        this._resizable$.next(this.resizable);
    });

    ngOnInit() {
        const gridItemRenderData = this.getItemRenderData(this.id);
        if (gridItemRenderData) {
            this.setStyles(gridItemRenderData);
        }
    }

    ngAfterContentInit() {
        this._dragStart$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(this.dragStartSubject);
        this._resizeStart$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(this.resizeStartSubject);
    }

    /**
     * To manually start dragging, route the desired pointer events to this method.
     * Dragging initiated by this method will work regardless of the value of the draggable Input.
     * It is the caller's responsibility to call this method with only the events that are desired to cause a drag.
     * For example, if you only want left clicks to cause a drag, it is your responsibility to filter out other mouse button events.
     * @param startEvent The pointer event that should initiate the drag.
     */
    startDragManually(startEvent: MouseEvent | TouchEvent) {
        this._manualDragEvents$.next(startEvent);
    }

    setStyles({top, left, width, height}: { top: string, left: string, width?: string, height?: string }) {
        // transform is 6x times faster than top/left
        this.renderer.setStyle(this.elementRef.nativeElement, 'transform', `translateX(${left}) translateY(${top})`);
        this.renderer.setStyle(this.elementRef.nativeElement, 'display', `block`);
        this.renderer.setStyle(this.elementRef.nativeElement, 'transition', this.transition);
        if (width != null) { this.renderer.setStyle(this.elementRef.nativeElement, 'width', width); }
        if (height != null) {this.renderer.setStyle(this.elementRef.nativeElement, 'height', height); }
    }

    private _dragStart$(): Observable<MouseEvent | TouchEvent> {
        return merge(
            this._manualDragEvents$,
            this._draggable$.pipe(
                switchMap((draggable) => {
                    if (!draggable) {
                        return NEVER;
                    }
                    return this._dragHandles.changes.pipe(
                        startWith(this._dragHandles),
                        switchMap((dragHandles: QueryList<KtdGridDragHandle>) => {
                            return iif(
                                () => dragHandles.length > 0,
                                merge(...dragHandles.toArray().map(dragHandle => ktdPointerDown(dragHandle.element.nativeElement))),
                                ktdPointerDown(this.elementRef.nativeElement)
                            )
                        })
                    );
                })
            )
        ).pipe(
            exhaustMap(startEvent => {
                // If the event started from an element with the native HTML drag&drop, it'll interfere
                // with our own dragging (e.g. `img` tags do it by default). Prevent the default action
                // to stop it from happening. Note that preventing on `dragstart` also seems to work, but
                // it's flaky and it fails if the user drags it away quickly. Also note that we only want
                // to do this for `mousedown` and `pointerdown` since doing the same for `touchstart` will
                // stop any `click` events from firing on touch devices.
                if (ktdIsMouseEventOrMousePointerEvent(startEvent)) {
                    startEvent.preventDefault();
                }

                const startPointer = ktdPointerClient(startEvent);
                return this.gridService.mouseOrTouchMove$(this.document).pipe(
                    takeUntil(ktdPointerUp(this.document)),
                    ktdOutsideZone(this.ngZone),
                    filter((moveEvent) => {
                        moveEvent.preventDefault();
                        const movePointer = ktdPointerClient(moveEvent);
                        const distanceX = Math.abs(startPointer.clientX - movePointer.clientX);
                        const distanceY = Math.abs(startPointer.clientY - movePointer.clientY);
                        // When this conditions returns true mean that we are over threshold.
                        return distanceX + distanceY >= this.dragStartThreshold;
                    }),
                    take(1),
                    // Return the original start event
                    map(() => startEvent)
                );
            })
        );
    }

    private _resizeStart$(): Observable<MouseEvent | TouchEvent> {
        return this._resizable$.pipe(
            switchMap((resizable) => {
                if (!resizable) {
                    // Side effect to hide the resizeElem if resize is disabled.
                    this.renderer.setStyle(this.resizeElem.nativeElement, 'display', 'none');
                    return NEVER;
                } else {
                    return this._resizeHandles.changes.pipe(
                        startWith(this._resizeHandles),
                        switchMap((resizeHandles: QueryList<KtdGridResizeHandle>) => {
                            if (resizeHandles.length > 0) {
                                // Side effect to hide the resizeElem if there are resize handles.
                                this.renderer.setStyle(this.resizeElem.nativeElement, 'display', 'none');
                                return merge(...resizeHandles.toArray().map(resizeHandle => ktdPointerDown(resizeHandle.element.nativeElement)));
                            } else {
                                this.renderer.setStyle(this.resizeElem.nativeElement, 'display', 'block');
                                return ktdPointerDown(this.resizeElem.nativeElement);
                            }
                        }),
                        tap((startEvent) => {
                            if (ktdIsMouseEventOrMousePointerEvent(startEvent)) {
                                startEvent.preventDefault();
                            }
                        })
                    );
                }
            })
        );
    }


    static ngAcceptInputType_minW: NumberInput;
    static ngAcceptInputType_minH: NumberInput;
    static ngAcceptInputType_maxW: NumberInput;
    static ngAcceptInputType_maxH: NumberInput;
    static ngAcceptInputType_draggable: BooleanInput;
    static ngAcceptInputType_resizable: BooleanInput;
    static ngAcceptInputType_dragStartThreshold: NumberInput;

}
