import {
	AfterContentInit,
	Directive, ElementRef,
	InjectionToken, Input, NgZone, OnDestroy
} from '@angular/core';
import {coerceBooleanProperty} from "../coercion/boolean-property";
import {BehaviorSubject, merge, NEVER, Observable, Subject, Subscription} from "rxjs";
import {KtdGridService} from "../grid.service";
import {ktdMouseOrTouchDown, ktdMouseOrTouchEnd, ktdPointerClient} from "../utils/pointer.utils";
import {exhaustMap, filter, map, switchMap, take, takeUntil} from "rxjs/operators";
import {coerceNumberProperty} from "../coercion/number-property";
import {ktdOutsideZone} from "../utils/operators";
import {GridDragItemRegistryService} from "../grid-drag-item-registry.service";
import {KtdGridLayoutItem} from "../grid.definitions";


export const KTD_DRAG = new InjectionToken<KtdDrag>('KtdDrag');

@Directive({
	selector: '[ktdDrag]',
	host: {
		'class': 'ktd-drag',
		//'[class.ktd-dragging]': 'templateRef.elementRef._isDragging',
		'[class.ktd-drag-disabled]': 'disabled',
	},
	providers: [{provide: KTD_DRAG, useExisting: KtdDrag}]
})
export class KtdDrag implements AfterContentInit, OnDestroy {
	@Input()
	get disabled(): boolean {
		// return this._disabled || (this.dropContainer && this.dropContainer.disabled);
		return this._disabled;
	}
	set disabled(value: boolean) {
		this._disabled = coerceBooleanProperty(value);
		// this._dragRef.disabled = this._disabled;
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
		// this._draggable$.next(this._draggable);
	}
	private _draggable: boolean = true;
	private _draggable$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(this._draggable);

	@Input()
	get id(): string {
		return this._id;
	}
	set id(val: string) {
		this._id = val;
	}
	private _id: string = crypto.randomUUID();

	@Input('ktdDragData') data: KtdGridLayoutItem | null = null;

	private subscriptions: Array<Subscription> = [];

	dragStart$: Observable<MouseEvent | TouchEvent>;
	private dragStartSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();

	constructor(
		/** Element that the draggable is attached to. */
		public elementRef: ElementRef,
		private ngZone: NgZone,
		private gridDragItemRegistry: GridDragItemRegistryService,
		private gridService: KtdGridService
	) {
		this.dragStart$ = this.dragStartSubject.asObservable();
	}

	ngAfterContentInit(): void {
		this.subscriptions.push(
			this._dragStart$().subscribe(this.dragStartSubject),
		);

		if (this.data && 'id' in this.data) {
			this.id = this.data.id;
		}

		this.gridDragItemRegistry.registerDraggableItem(this);
	}

	ngOnDestroy(): void {
		this.subscriptions.forEach(subscription => subscription.unsubscribe());
		this.gridDragItemRegistry.unregisterDraggableItem(this);
	}

	private _dragStart$(): Observable<MouseEvent | TouchEvent> {
		return merge(
			this._draggable$.pipe(
				switchMap((draggable) => {
					return draggable ? ktdMouseOrTouchDown(this.elementRef.nativeElement) : NEVER;
				})
			)
		).pipe(
			exhaustMap(startEvent => {
				// If the event started from an element with the native HTML drag&drop, it'll interfere
				// with our own dragging (e.g. `img` tags do it by default). Prevent the default action
				// to stop it from happening. Note that preventing on `dragstart` also seems to work, but
				// it's flaky and it fails if the user drags it away quickly. Also note that we only want
				// to do this for `mousedown` since doing the same for `touchstart` will stop any `click`
				// events from firing on touch devices.
				if (startEvent.target && (startEvent.target as HTMLElement).draggable && startEvent.type === 'mousedown') {
					startEvent.preventDefault();
				}

				const startPointer = ktdPointerClient(startEvent);
				return this.gridService.mouseOrTouchMove$(document).pipe(
					takeUntil(ktdMouseOrTouchEnd(document, 1)),
					ktdOutsideZone(this.ngZone),
					filter((moveEvent: MouseEvent | TouchEvent) => {
						moveEvent.preventDefault();
						const movePointer = ktdPointerClient(moveEvent);
						const distanceX = Math.abs(startPointer.clientX - movePointer.clientX);
						const distanceY = Math.abs(startPointer.clientY - movePointer.clientY);
						// When this conditions returns true mean that we are over threshold.
						return distanceX + distanceY >= this.dragStartThreshold;
					}),
					take(1),
					// Return the original start event
					map(() => {
						return startEvent;
					})
				)
			}
		));
	}
}
