import {Injectable, NgZone} from '@angular/core';
import {Observable, Subject, Subscription} from 'rxjs';
import {DragActionType, KtdGridItemRenderData} from "./grid.definitions";
import {DragRef} from "./utils/drag-ref";
import {getDragResizeEventData, KtdGridComponent, PointingDeviceEvent} from "./grid.component";
import {KtdDrag} from "./directives/ktd-drag";
import {ktdOutsideZone} from "./utils/operators";
import {takeUntil} from "rxjs/operators";
import {ktdPointerMove, ktdPointerUp} from './utils/pointer.utils';
import {KtdRegistryService} from "./ktd-registry.service";
import {LayoutItem} from "./utils/react-grid-layout.utils";


export interface PointerEventInfo {
    dragRef: DragRef;
    startEvent: PointingDeviceEvent;
    moveEvent: PointingDeviceEvent;
    type: DragActionType;
    newLayoutItem: LayoutItem;
    renderData: KtdGridItemRenderData<number> | null;
    fromGrid: KtdGridComponent | null; // The grid where the drag started, it can be null if the drag started outside a grid. For example, when dragging from a connected drag item
    currentGrid: KtdGridComponent | null;
    lastGrid: KtdGridComponent | null; // The last grid that we were in, is used so when we stop resizing outside a grid, we can notify the last grid of new layout
}

@Injectable({providedIn: 'root'})
export class KtdGridService {
    pointerMove$: Observable<MouseEvent | TouchEvent>;
    private pointerMoveSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();
    private pointerMoveSubscription: Subscription;

    pointerEnd$: Observable<MouseEvent | TouchEvent>;
    private pointerEndSubject: Subject<MouseEvent | TouchEvent> = new Subject<MouseEvent | TouchEvent>();
    private pointerEndSubscription: Subscription;

    private drag: PointerEventInfo | null = null;

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
                    this.pointerEndSubject.next(mouseEvent);
                    if (this.drag !== null) {
                        this.updateGrids(this.drag);
                    }
                    this.drag = null;
                })
        );
    }

    /**
     * Start a drag sequence.
     * @param event The event that triggered the drag sequence.
     * @param dragRef The dragRef that started the drag sequence.
     * @param type The type of drag sequence.
     * @param grid The grid where the drag sequence started. It can be null if the drag sequence started outside a grid.
     * @param gridItem The grid item that is being dragged. It can be null if the drag sequence started from outside a grid.
     */
    public startDrag(event: MouseEvent | TouchEvent | PointerEvent, dragRef: DragRef, type: DragActionType, grid: KtdGridComponent | null = null, gridItem: {layoutItem: LayoutItem, renderData: KtdGridItemRenderData<number>} | null = null): void {
        // Make sure, this function is only being called once
        if (this.drag !== null) {
            return;
        }

        const isKtdDrag = dragRef.itemRef instanceof KtdDrag;

        if (!isKtdDrag && gridItem === null) {
            throw new Error('layoutItem must be provided when dragging from a connected drag item');
        }

        this.drag = {
            dragRef,
            startEvent: event,
            moveEvent: event,
            type,
            fromGrid: isKtdDrag ? null : grid,
            currentGrid: null,
            lastGrid: isKtdDrag ? null : grid,
            newLayoutItem: isKtdDrag ? {
                id: dragRef.id,
                w: dragRef.width,
                h: dragRef.height,
                x: -1,
                y: -1,
                data: dragRef.data,
            } : gridItem!.layoutItem!,
            renderData: isKtdDrag ? null : gridItem!.renderData!,
        };

        if (grid !== null) {
            grid.setGridBackgroundVisible(grid.backgroundConfig?.show === 'whenDragging' || grid.backgroundConfig?.show === 'always');
            this.ngZone.run(() => (type === 'drag' ? grid.dragStarted : grid.resizeStarted).emit(getDragResizeEventData(dragRef, grid.layout)));
        }

        const connectedToGrids = isKtdDrag ? (dragRef.itemRef as KtdDrag<any>).connectedTo : this.registryService._ktgGrids;
        this.pointerMove$.pipe(
            takeUntil(this.pointerEnd$),
            ktdOutsideZone(this.ngZone),
        ).subscribe((moveEvent: MouseEvent | TouchEvent) => {
            this.drag!.moveEvent = moveEvent;
            this.handleGridInteraction(moveEvent, connectedToGrids);
        });
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
                dragInfo: this.drag!,
            });
        }

        if (grid !== null) {
            grid.dragEntered.next({
                source: this.drag!.dragRef,
                event: moveEvent,
                grid: grid,
                dragInfo: this.drag!,
            });
        }

        this.drag!.currentGrid = grid;
        this.drag!.lastGrid = grid === null ? this.drag!.lastGrid : grid;
    }

    private updateGrids(drag: PointerEventInfo): void {
        // If the drag ended outside a grid, we don't need to do anything
        if (drag.currentGrid === null && drag.type === 'drag') {
            /*
            * This emit is not required, but when it is not here, it cases a bug where the grid-element,
            * does not return to its original position when the drag ends outside the grid.
            * The same thing happens when the resize ends outside the grid.
            * */
            drag.fromGrid?.layoutUpdated.emit(drag.fromGrid!.layout);
            drag.fromGrid?.stopDragSequence(drag);
            return;
        }

        if (drag.type === 'resize') {
            if (drag.lastGrid === null) {
                console.error('lastGrid is null');
                return;
            }
            drag.lastGrid.layoutUpdated.emit(drag.lastGrid.drag!.newLayout!);
            //
            // if (drag.fromGrid === drag.currentGrid) {
            //     drag.currentGrid!.layoutUpdated.emit(drag.currentGrid!.drag!.newLayout!);
            // } else {
            //     /*
            //      * This emit is not required, but when it is not here, it cases a bug where the grid-element,
            //      * does not return to its original position when the resize ends on another grid than the one it started.
            //      */
            //     if (drag.fromGrid !== null && drag.fromGrid.drag !== null) {
            //         drag.fromGrid.layoutUpdated.emit(drag.fromGrid.drag.newLayout!);
            //     }
            // }

        } else {
            const currentLayoutItem = drag.fromGrid === null ? {
                ...drag.newLayoutItem,
                id: drag.currentGrid!.getNextId()
            } : drag.newLayoutItem;

            // Dragging between two distinct grids
            if (drag.fromGrid !== drag.currentGrid) {
                // Notify the previous grid that the item has left it
                drag.fromGrid?.layoutUpdated.emit(drag.fromGrid!.layout.filter(item => item.id !== drag.dragRef.id));

                // Notify the new grid that we dropped new item that was not in any grid
                drag.currentGrid?.dropped.emit({
                    event: drag.moveEvent,
                    currentLayout: drag.currentGrid.drag!.newLayout!.map(item => ({...item})),
                    currentLayoutItem: currentLayoutItem,
                });
            } else {
                // Update the new grid layout
                drag.currentGrid!.layoutUpdated.emit(drag.currentGrid!.drag!.newLayout!);
            }
        }

        // Clean up
        drag.fromGrid?.stopDragSequence(drag);
        drag.currentGrid?.stopDragSequence(drag);
        this.registryService._ktgGrids.forEach(grid => grid.clearDragSequence());
    }

    dispose() {
        this.pointerMoveSubscription.unsubscribe();
        this.pointerEndSubscription.unsubscribe();
    }
}
