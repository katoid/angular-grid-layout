import {
    AfterContentInit,
    ChangeDetectionStrategy,
    Component,
    ContentChild,
    ContentChildren,
    ElementRef,
    Inject,
    Input,
    OnDestroy,
    OnInit,
    Output,
    QueryList,
    Renderer2,
    ViewChild
} from '@angular/core';
import {BehaviorSubject, merge, NEVER, Observable, Observer, Subject, Subscription} from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { ktdMouseOrTouchDown } from '../utils/pointer.utils';
import { GRID_ITEM_GET_RENDER_DATA_TOKEN, KtdGridItemRenderDataTokenType } from '../grid.definitions';
import { KTD_GRID_DRAG_HANDLE, KtdGridDragHandle } from '../directives/drag-handle';
import { KTD_GRID_RESIZE_HANDLE, KtdGridResizeHandle } from '../directives/resize-handle';
import { BooleanInput, coerceBooleanProperty } from '../coercion/boolean-property';
import { coerceNumberProperty, NumberInput } from '../coercion/number-property';
import { KTD_GRID_ITEM_PLACEHOLDER, KtdGridItemPlaceholder } from '../directives/placeholder';
import {DragRef} from "../utils/drag-ref";
import {KtdRegistryService} from "../ktd-registry.service";

@Component({
    selector: 'ktd-grid-item',
    templateUrl: './grid-item.component.html',
    styleUrls: ['./grid-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KtdGridItemComponent<T = any> implements OnInit, OnDestroy, AfterContentInit {
    /** Elements that can be used to drag the grid item. */
    @ContentChildren(KTD_GRID_DRAG_HANDLE, {descendants: true}) _dragHandles: QueryList<KtdGridDragHandle>;
    @ContentChildren(KTD_GRID_RESIZE_HANDLE, {descendants: true}) _resizeHandles: QueryList<KtdGridResizeHandle>;
    @ViewChild('resizeElem', {static: true, read: ElementRef}) resizeElem: ElementRef;

    /** Template ref for placeholder */
    @ContentChild(KTD_GRID_ITEM_PLACEHOLDER) placeholder: KtdGridItemPlaceholder;

    /** Min and max size input properties. Any of these would 'override' the min/max values specified in the layout. */
    @Input() minW?: number;
    @Input() minH?: number;
    @Input() maxW?: number;
    @Input() maxH?: number;

    /** CSS transition style. Note that for more performance is preferable only make transition on transform property. */
    @Input() transition: string = 'transform 500ms ease, width 500ms ease, height 500ms ease';

    resizeStart$: Observable<MouseEvent | TouchEvent>;

    /** Id of the grid item. This property is strictly compulsory. */
    @Input()
    get id(): string {
        return this._id;
    }
    set id(val: string) {
        this._id = val;
        this._dragRef.id = val;
    }
    private _id: string;

    /** Minimum amount of pixels that the user should move before it starts the drag sequence. */
    @Input()
    get dragStartThreshold(): number { return this._dragStartThreshold; }
    set dragStartThreshold(val: number) {
        this._dragStartThreshold = coerceNumberProperty(val);
        this._dragRef.dragStartThreshold = this._dragStartThreshold;
    }
    private _dragStartThreshold: number = 0;


    /** Whether the item is draggable or not. Defaults to true. Does not affect manual dragging using the startDragManually method. */
    @Input()
    get draggable(): boolean {
        return this._draggable;
    }
    set draggable(val: boolean) {
        this._draggable = coerceBooleanProperty(val);
        this._draggable$.next(this._draggable);
    }
    private _draggable: boolean = true;
    private _draggable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._draggable);

    /** Whether the item is resizable or not. Defaults to true. */
    @Input()
    get resizable(): boolean {
        return this._resizable;
    }
    set resizable(val: boolean) {
        this._resizable = coerceBooleanProperty(val);
        this._resizable$.next(this._resizable);
    }
    private _resizable: boolean = true;
    private _resizable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._resizable);

    private resizeStartSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();

    private subscriptions: Subscription[] = [];

    get dragRef(): DragRef<T> {
        return this._dragRef;
    }
    private readonly _dragRef: DragRef<T>;

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

    constructor(public elementRef: ElementRef,
                private registryService: KtdRegistryService,
                private renderer: Renderer2,
                @Inject(GRID_ITEM_GET_RENDER_DATA_TOKEN) private getItemRenderData: KtdGridItemRenderDataTokenType) {
        this.resizeStart$ = this.resizeStartSubject.asObservable();

        this._dragRef = this.registryService.createKtgDrag(this.elementRef, this);
    }

    ngOnInit() {
        const gridItemRenderData = this.getItemRenderData(this.id)!;
        this.setStyles(gridItemRenderData);
    }

    ngAfterContentInit() {
        this._dragRef.placeholder = this.placeholder;
        this.subscriptions.push(
            this._resizeStart$().subscribe(this.resizeStartSubject),
            this._dragHandles.changes.subscribe(() => {
                this._dragRef.dragHandles = this._dragHandles.toArray();
            }),
        );
    }

    ngOnDestroy() {
        this.registryService.destroyKtgDrag(this._dragRef);
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    /**
     * To manually start dragging, route the desired pointer events to this method.
     * Dragging initiated by this method will work regardless of the value of the draggable Input.
     * It is the caller's responsibility to call this method with only the events that are desired to cause a drag.
     * For example, if you only want left clicks to cause a drag, it is your responsibility to filter out other mouse button events.
     * @param startEvent The pointer event that should initiate the drag.
     */
    startDragManually(startEvent: MouseEvent | TouchEvent) {
        // this._manualDragEvents$.next(startEvent);
        this._dragRef.startDragManual(startEvent);
    }

    setStyles({top, left, width, height}: { top: string, left: string, width?: string, height?: string }) {
        // transform is 6x times faster than top/left
        this.renderer.setStyle(this.elementRef.nativeElement, 'transform', `translateX(${left}) translateY(${top})`);
        this.renderer.setStyle(this.elementRef.nativeElement, 'display', `block`);
        this.renderer.setStyle(this.elementRef.nativeElement, 'transition', this.transition);
        if (width != null) { this.renderer.setStyle(this.elementRef.nativeElement, 'width', width); }
        if (height != null) {this.renderer.setStyle(this.elementRef.nativeElement, 'height', height); }
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
                                return merge(...resizeHandles.toArray().map(resizeHandle => ktdMouseOrTouchDown(resizeHandle.element.nativeElement, 1)));
                            } else {
                                this.renderer.setStyle(this.resizeElem.nativeElement, 'display', 'block');
                                return ktdMouseOrTouchDown(this.resizeElem.nativeElement, 1);
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
