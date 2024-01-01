import {ElementRef, Inject, Injectable, NgZone} from '@angular/core';
import {KtdDrag} from "./directives/ktd-drag";
import {BehaviorSubject} from "rxjs";
import {KtdGridService} from "./grid.service";
import {DOCUMENT} from "@angular/common";
import {DragRef} from "./utils/drag-ref";
import {KtdGridItemComponent} from "./grid-item/grid-item.component";

@Injectable({
    providedIn: 'root'
})
export class KtdRegistryService<T = any> {

    /**
     * List of all ktg-drag
     */
    private _ktgDragItems: KtdDrag<T>[] = [];
    public ktgDragItems$: BehaviorSubject<KtdDrag<T>[]> = new BehaviorSubject<KtdDrag<T>[]>(this._ktgDragItems);

    private _dragRefItems: DragRef<T>[] = [];
    public dragRefItems$: BehaviorSubject<DragRef<T>[]> = new BehaviorSubject<DragRef<T>[]>(this._dragRefItems);

    constructor(
        @Inject(DOCUMENT) private document: Document,
        private _gridService: KtdGridService,
        private _ngZone: NgZone,
    ) { }

    public createKtgDrag(element: ElementRef<HTMLElement>, itemRef: KtdGridItemComponent | KtdDrag<any>, data: T | undefined = undefined): DragRef<T> {
        const dragRef = new DragRef<T>(element, this._gridService, this._ngZone, itemRef);
        if (data !== undefined) {
            dragRef.data = data;
        }
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
        this._ktgDragItems.push(item);
        this.ktgDragItems$.next(this._ktgDragItems);
    }

    public unregisterKtgDragItem(item: KtdDrag<T>) {
        this._ktgDragItems.splice(this._ktgDragItems.indexOf(item), 1);
        this.ktgDragItems$.next(this._ktgDragItems);
    }
}
