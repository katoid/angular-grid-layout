import {Injectable, NgZone} from '@angular/core';
import {Observable, Subject, Subscription} from 'rxjs';
import {DragActionType} from "./grid.definitions";
import {DragRef} from "./utils/drag-ref";
import {getDragResizeEventData, KtdGridComponent, PointingDeviceEvent} from "./grid.component";
import {KtdDrag} from "./directives/ktd-drag";
import {ktdOutsideZone} from "./utils/operators";
import {takeUntil} from "rxjs/operators";
import {ktdPointerMove, ktdPointerUp} from './utils/pointer.utils';
import {KtdRegistryService} from "./ktd-registry.service";


export interface PointerEventInfo {
    dragRef: DragRef;
    startEvent: PointingDeviceEvent;
    moveEvent: PointingDeviceEvent;
    type: DragActionType;
    fromGrid: KtdGridComponent | null; // The grid where the drag started, it can be null if the drag started outside a grid. For example, when dragging from a connected drag item
    currentGrid: KtdGridComponent | null;
}

@Injectable({providedIn: 'root'})
export class KtdGridService {
    pointerMove$: Observable<MouseEvent | TouchEvent>;
    private pointerMoveSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();
    private pointerMoveSubscription: Subscription;

    pointerEnd$: Observable<MouseEvent | TouchEvent>;
    private pointerEndSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();
    private pointerEndSubscription: Subscription;

    drag: PointerEventInfo | null = null;

    constructor(
        private ngZone: NgZone,
        private registryService: KtdRegistryService,
    ) {
        this.pointerMove$ = this.pointerMoveSubject.asObservable();
        this.pointerEnd$ = this.pointerEndSubject.asObservable();
        this.initSubscriptions();
    }

    private initSubscriptions() {
        this.pointerMoveSubscription = this.ngZone.runOutsideAngular(() =>
            ktdPointerMove(document)
                .subscribe((mouseEvent: MouseEvent | TouchEvent) => this.pointerMoveSubject.next(mouseEvent))
        );

        this.pointerEndSubscription = this.ngZone.runOutsideAngular(() =>
            ktdPointerUp(document)
                .subscribe((mouseEvent: MouseEvent | TouchEvent) => {
                    this.stopDrag();
                    this.pointerEndSubject.next(mouseEvent);
                })
        );
    }

    public startDrag(event: MouseEvent | TouchEvent | PointerEvent, dragRef: DragRef, type: DragActionType, grid: KtdGridComponent | null = null): void {
        // Make sure, this function is only being called once
        if (this.drag !== null) {
            return;
        }

        const isKtdDrag = dragRef.itemRef instanceof KtdDrag;
        this.drag = {
            dragRef,
            startEvent: event,
            moveEvent: event,
            type,
            fromGrid: isKtdDrag ? null : grid,
            currentGrid: null,
        };

        if (grid !== null) {
            grid.setGridBackgroundVisible(grid.backgroundConfig?.show === 'whenDragging' || grid.backgroundConfig?.show === 'always');
            this.ngZone.run(() => (type === 'drag' ? grid.dragStarted : grid.resizeStarted).emit(getDragResizeEventData(dragRef, grid.layout)));
        }

        this.pointerMove$.pipe(
            takeUntil(this.pointerEnd$),
            ktdOutsideZone(this.ngZone),
        ).subscribe((moveEvent: MouseEvent | TouchEvent) => {
            this.drag!.moveEvent = moveEvent;
            const connectedToGrids = isKtdDrag ? (dragRef.itemRef as KtdDrag<any>).connectedTo : this.registryService._ktgGrids;
            this.handleGridInteraction(moveEvent, connectedToGrids);
        });
    }

    public stopDrag(): void {
        this.drag?.currentGrid?.updateLayout();
        this.drag = null;
    }


    private handleGridInteraction(moveEvent: MouseEvent | TouchEvent, connectedToGrids: KtdGridComponent[]): void {
        for (const grid of connectedToGrids) {
            if (!grid.isPointerInsideGridElement(moveEvent)) {
                continue;
            }

            // When we are still in the same grid, we don't need to do anything
            if (grid.id === this.drag!.currentGrid?.id) {
                return;
            }

            // We are in new grid, so we need to notify the previous grid that the item has left it
            this.notifyGrids(grid, moveEvent);
            return;
        }

        // We are not in any grid, so we need to notify the previous grid that the item has left it
        this.notifyGrids(null, moveEvent);
    }

    /**
     * Notify the previous grid that the item has left it and notify the new grid that the item has entered it.
     */
    private notifyGrids(grid: KtdGridComponent | null, moveEvent: MouseEvent | TouchEvent): void {
        if (this.drag!.currentGrid !== null) {
            this.drag!.currentGrid.dragExited.next({
                source: this.drag!.dragRef,
                event: moveEvent,
                grid: this.drag!.currentGrid,
            });
        }

        if (grid !== null) {
            grid.dragEntered.next({
                source: this.drag!.dragRef,
                event: moveEvent,
                grid: grid,
            });
        }

        this.drag!.currentGrid = grid;
    }

    dispose() {
        this.pointerMoveSubscription.unsubscribe();
        this.pointerEndSubscription.unsubscribe();
    }
}
