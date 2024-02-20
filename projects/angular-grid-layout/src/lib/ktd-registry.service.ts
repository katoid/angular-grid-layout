import {ElementRef, Injectable, NgZone} from '@angular/core';
import {KtdDrag} from "./directives/ktd-drag";
import {BehaviorSubject} from "rxjs";
import {KtdGridService} from "./grid.service";
import {DragRef} from "./utils/drag-ref";
import {KtdGridItemComponent} from "./grid-item/grid-item.component";
import {KtdGridComponent} from "./grid.component";

@Injectable({
    providedIn: 'root'
})
export class KtdRegistryService<T = any> {
    private _ktdDragItems: KtdDrag<T>[] = [];
    public ktdDragItems$: BehaviorSubject<KtdDrag<T>[]> = new BehaviorSubject<KtdDrag<T>[]>(this._ktdDragItems);

    // Two way binding between grids and drag items
    private gridConnectedToKtdDragItems: {[gridId: string]: BehaviorSubject<KtdDrag<T>[]>} = {};
    private gridConnectedToGridItems: {[gridId: string]: BehaviorSubject<KtdGridItemComponent<T>[]>} = {};
    private ktdDragItemConnectedToGrid: {[ktdDragItemId: string]: KtdGridComponent[]} = {};
    private gridItemConnectedToGrid: {[gridItemId: string]: KtdGridComponent[]} = {};

    private _dragRefItems: DragRef<T>[] = [];
    public dragRefItems$: BehaviorSubject<DragRef<T>[]> = new BehaviorSubject<DragRef<T>[]>(this._dragRefItems);

    public _ktgGrids: KtdGridComponent[] = [];
    public ktgGrids$: BehaviorSubject<KtdGridComponent[]> = new BehaviorSubject<KtdGridComponent[]>(this._ktgGrids);

    constructor(
        private _ngZone: NgZone,
    ) { }

    public createKtgDrag(element: ElementRef<HTMLElement>, gridService: KtdGridService, itemRef: KtdGridItemComponent | KtdDrag<any>): DragRef<T> {
        const dragRef = new DragRef<T>(element, gridService, this._ngZone, itemRef);
        this._dragRefItems.push(dragRef);
        this.dragRefItems$.next(this._dragRefItems);
        return dragRef;
    }

    public destroyKtgDrag(dragRef: DragRef<T>) {
        this._dragRefItems.splice(this._dragRefItems.indexOf(dragRef), 1);
        this.dragRefItems$.next(this._dragRefItems);
        dragRef.dispose();
    }

    public registerKtgDragItem(item: KtdDrag<T>) {
        this._ktdDragItems.push(item);

        // Check if each item has unique id
        const ids = this._dragRefItems.map(item => item.id);
        if (new Set(ids).size !== ids.length) {
            throw new Error(`KtdDrag: dragRef id must be unique`);
        }

        this.ktdDragItems$.next(this._ktdDragItems);
    }

    public unregisterKtgDragItem(item: KtdDrag<T>) {
        this._ktdDragItems.splice(this._ktdDragItems.indexOf(item), 1);
        this.ktdDragItems$.next(this._ktdDragItems);
    }

    public registerKtdGrid(grid: KtdGridComponent) {
        this._ktgGrids.push(grid);

        // Check if each grid has unique id
        const ids = this._dragRefItems.map(item => item.id);
        if (new Set(ids).size !== ids.length) {
            throw new Error(`ktd-grid id must be unique`);
        }

        this.ktgGrids$.next(this._ktgGrids);
    }

    public unregisterKtdGrid(grid: KtdGridComponent) {
        this._ktgGrids.splice(this._ktgGrids.indexOf(grid), 1);
        this.ktgGrids$.next(this._ktgGrids);
    }

    public updateConnectedTo(dragRef: DragRef, connectedTo: KtdGridComponent[]) {
        if (dragRef.itemRef instanceof KtdGridItemComponent) {
            connectedTo.forEach(grid => {
                if (!this.gridConnectedToGridItems[grid.id]) {
                    this.gridConnectedToGridItems[grid.id] = new BehaviorSubject<KtdGridItemComponent<T>[]>([]);
                }
                const connectedToSubject = this.gridConnectedToGridItems[grid.id];
                const connectedTo = connectedToSubject.getValue();
                connectedTo.push(dragRef.itemRef as KtdGridItemComponent);
                connectedToSubject.next(connectedTo);

                if (!this.gridItemConnectedToGrid[dragRef.id]) {
                    this.gridItemConnectedToGrid[dragRef.id] = [];
                }
                this.gridItemConnectedToGrid[dragRef.id].push(grid);
            });
            return;
        }

        connectedTo.forEach(grid => {
            if (!this.gridConnectedToKtdDragItems[grid.id]) {
                this.gridConnectedToKtdDragItems[grid.id] = new BehaviorSubject<KtdDrag<T>[]>([]);
            }
            const connectedToSubject = this.gridConnectedToKtdDragItems[grid.id];
            const connectedTo = connectedToSubject.getValue();
            connectedTo.push(dragRef.itemRef as KtdDrag<any>);
            connectedToSubject.next(connectedTo);

            if (!this.ktdDragItemConnectedToGrid[dragRef.id]) {
                this.ktdDragItemConnectedToGrid[dragRef.id] = [];
            }
            this.ktdDragItemConnectedToGrid[dragRef.id].push(grid);
        });
    }

    public getKtdDragItemsConnectedToGrid(grid: KtdGridComponent): BehaviorSubject<KtdDrag<T>[]> {
        return this.gridConnectedToKtdDragItems[grid.id] ? this.gridConnectedToKtdDragItems[grid.id] : new BehaviorSubject<KtdDrag<T>[]>([]);
    }

    public getGridItemsConnectedToGrid(grid: KtdGridComponent): BehaviorSubject<KtdGridItemComponent<T>[]> {
        return this.gridConnectedToGridItems[grid.id] ? this.gridConnectedToGridItems[grid.id] : new BehaviorSubject<KtdGridItemComponent<T>[]>([]);
    }
}
