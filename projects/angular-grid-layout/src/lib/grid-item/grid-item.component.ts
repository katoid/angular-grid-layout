import {
    AfterContentInit, ChangeDetectionStrategy, Component, ContentChildren, ElementRef, Inject, Input, OnDestroy, OnInit, QueryList,
    Renderer2, ViewChild
} from '@angular/core';
import { BehaviorSubject, iif, merge, NEVER, Observable, Subject, Subscription } from 'rxjs';
import { exhaustMap, filter, map, startWith, switchMap, take, takeUntil } from 'rxjs/operators';
import { ktdMouseOrTouchDown, ktdMouseOrTouchEnd, ktdMouseOrTouchMove, ktdPointerClient } from '../pointer.utils';
import { GRID_ITEM_GET_RENDER_DATA_TOKEN, KtdGridItemRenderDataTokenType } from '../grid.definitions';
import { KTD_GRID_DRAG_HANDLE, KtdGridDragHandle } from '../directives/drag-handle';
import { KTD_GRID_RESIZE_HANDLE, KtdGridResizeHandle } from '../directives/resize-handle';

@Component({
    selector: 'ktd-grid-item',
    templateUrl: './grid-item.component.html',
    styleUrls: ['./grid-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KtdGridItemComponent implements OnInit, OnDestroy, AfterContentInit {
    /** Elements that can be used to drag the grid item. */
    @ContentChildren(KTD_GRID_DRAG_HANDLE, {descendants: true}) _dragHandles: QueryList<KtdGridDragHandle>;
    @ContentChildren(KTD_GRID_RESIZE_HANDLE, {descendants: true}) _resizeHandles: QueryList<KtdGridResizeHandle>;
    @ViewChild('resizeElem', {static: true, read: ElementRef}) resizeElem: ElementRef;

    @Input() transition: string = 'transform 500ms ease, width 500ms linear, height 500ms linear';

    /** Minimum amount of pixels that the user should move before it starts the drag sequence. */
    @Input() dragStartThreshold: number = 0;

    dragStart$: Observable<MouseEvent | TouchEvent>;
    resizeStart$: Observable<MouseEvent | TouchEvent>;

    @Input()
    get id(): string {
        return this._id;
    }

    set id(val: string) {
        this._id = val;
    }

    @Input()
    get draggable(): boolean {
        return this._draggable;
    }

    set draggable(val: boolean) {
        this._draggable = val;
        this._draggable$.next(val);
    }

    private _draggable: boolean = true;
    private _draggable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._draggable);

    @Input()
    get resizable(): boolean {
        return this._resizable;
    }

    set resizable(val: boolean) {
        this._resizable = val;
        this._resizable$.next(val);
    }

    private _resizable: boolean = true;
    private _resizable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._resizable);

    private dragStartSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();
    private resizeStartSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();

    private _id: string;
    private subscriptions: Subscription[] = [];

    constructor(public elementRef: ElementRef, private renderer: Renderer2, @Inject(GRID_ITEM_GET_RENDER_DATA_TOKEN) private getItemRenderData: KtdGridItemRenderDataTokenType) {
        this.dragStart$ = this.dragStartSubject.asObservable();
        this.resizeStart$ = this.resizeStartSubject.asObservable();
    }

    ngOnInit() {
        const gridItemRenderData = this.getItemRenderData(this.id)!;
        this.setStyles(gridItemRenderData);
    }

    ngAfterContentInit() {
        this.subscriptions.push(
            this._dragStart$().subscribe(this.dragStartSubject),
            this._resizeStart$().subscribe(this.resizeStartSubject),
        );
    }

    ngOnDestroy() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
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
        return this._draggable$.pipe(
            switchMap((draggable) => {
                if (!draggable) {
                    return NEVER;
                } else {
                    return this._dragHandles.changes.pipe(
                        startWith(this._dragHandles),
                        switchMap((dragHandles: QueryList<KtdGridDragHandle>) => {
                            return iif(
                                () => dragHandles.length > 0,
                                merge(...dragHandles.toArray().map(dragHandle => ktdMouseOrTouchDown(dragHandle.element.nativeElement, 1, false))),
                                ktdMouseOrTouchDown(this.elementRef.nativeElement, 1, false)
                            ).pipe(exhaustMap((startEvent) => {
                                const startPointer = ktdPointerClient(startEvent);
                                return ktdMouseOrTouchMove(window, 1).pipe(
                                    takeUntil(ktdMouseOrTouchEnd(window, 1)),
                                    filter((moveEvent) => {
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
                            }));
                        })
                    );
                }
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
                                return merge(...resizeHandles.toArray().map(resizeHandle => ktdMouseOrTouchDown(resizeHandle.element.nativeElement, 1, false)));
                            } else {
                                this.renderer.setStyle(this.resizeElem.nativeElement, 'display', 'block');
                                return ktdMouseOrTouchDown(this.resizeElem.nativeElement, 1, false);
                            }
                        })
                    );
                }
            })
        );
    }

}
