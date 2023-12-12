import {Injectable} from '@angular/core';
import {KtdDrag} from "./directives/ktd-drag";
import {BehaviorSubject} from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class GridDragItemRegistryService {

    private _draggableItems: KtdDrag[] = [];
    public draggableItems$: BehaviorSubject<KtdDrag[]> = new BehaviorSubject<KtdDrag[]>(this._draggableItems);

    constructor() {
    }

    public registerDraggableItem(item: KtdDrag) {
        this._draggableItems.push(item);
        this.draggableItems$.next(this._draggableItems);
    }

    public unregisterDraggableItem(item: KtdDrag) {
        this._draggableItems.splice(this._draggableItems.indexOf(item), 1);
        this.draggableItems$.next(this._draggableItems);
    }
}
