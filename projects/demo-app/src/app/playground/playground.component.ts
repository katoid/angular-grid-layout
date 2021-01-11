import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { KtdGridCfg, KtdGridLayout, KtdGridLayoutItem } from '../../../../../dist/grid/lib/grid.definitions';
import { MatSelectChange } from '@angular/material/select';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { KtdGridComponent } from 'grid';
import { ktdArrayRemoveItem } from '../utils';

interface GridItem {
    id: string;
}

function ktdTrackById(index: number, item: GridItem) {
    return item.id;
}

@Component({
    selector: 'ktd-playground',
    templateUrl: './playground.component.html',
    styleUrls: ['./playground.component.scss']
})
export class KtdPlaygroundComponent implements OnInit, OnDestroy {
    @ViewChild(KtdGridComponent, {static: true}) grid: KtdGridComponent;
    trackById = ktdTrackById;

    cols = 12;
    rowHeight = 50;
    compactType: 'vertical' | 'horizontal' | null = 'vertical';
    layout = [
        {id: '0', x: 5, y: 0, w: 2, h: 3},
        {id: '1', x: 2, y: 2, w: 1, h: 2},
        {id: '2', x: 3, y: 7, w: 1, h: 2},
        {id: '3', x: 2, y: 0, w: 3, h: 2},
        {id: '4', x: 5, y: 3, w: 2, h: 3},
        {id: '5', x: 0, y: 4, w: 1, h: 3},
        {id: '6', x: 9, y: 0, w: 2, h: 4},
        {id: '7', x: 9, y: 4, w: 2, h: 2},
        {id: '8', x: 3, y: 2, w: 2, h: 5},
        {id: '9', x: 7, y: 0, w: 1, h: 3},
        {id: '10', x: 2, y: 4, w: 1, h: 4},
        {id: '11', x: 0, y: 0, w: 2, h: 4}
    ];
    disableDrag = false;
    disableResize = false;
    disableRemove = false;
    autoResize = true;
    resizeSubscription: Subscription;

    constructor(private ngZone: NgZone) {
        this.ngZone.onUnstable.subscribe(() => console.log('UnStable'));
    }

    ngOnInit() {
        this.resizeSubscription = fromEvent(window, 'resize').pipe(
            debounceTime(300),
            filter(() => this.autoResize)
        ).subscribe(() => {
            this.grid.resize();
        });
    }

    ngOnDestroy() {
        this.resizeSubscription.unsubscribe();
    }

    onConfigUpdated(event: KtdGridCfg) {
        console.log('on config updated', event);
        this.layout = event.layout;
    }

    onCompactTypeChange(change: MatSelectChange) {
        console.log('onCompactTypeChange', change);
        this.compactType = change.value;
    }

    onDisableDragChange(checked: boolean) {
        this.disableDrag = checked;
    }

    onDisableResizeChange(checked: boolean) {
        this.disableResize = checked;
    }

    onDisableRemoveChange(checked: boolean) {
        this.disableRemove = checked;
    }

    onAutoResizeChange(checked: boolean) {
        this.autoResize = checked;
    }

    onRowHeightChange(event: Event) {
        this.rowHeight = parseInt((event.target as HTMLInputElement).value, 10);
    }

    generateLayout() {
        const layout: KtdGridLayout = [];
        for (let i = 0; i < 12; i++) {
            const y = Math.ceil(Math.random() * 4) + 1;
            layout.push({
                x: Math.round(Math.random() * 5) * 2,
                y: Math.floor(i / 6) * y,
                w: 2,
                h: y,
                id: i.toString()
                // static: Math.random() < 0.05
            });
        }
        console.log('layout', layout);
        this.layout = layout;
    }

    /** Adds a grid item to the layout */
    addItemToLayout() {
        const maxId = this.layout.reduce((acc, cur) => Math.max(acc, parseInt(cur.id, 10)), -1);
        const nextId = maxId + 1;

        const newLayoutItem: KtdGridLayoutItem = {
            id: nextId.toString(),
            x: 0,
            y: 0,
            w: 2,
            h: 2
        };

        // Important: Don't mutate the array, create new instance. This way notifies the Grid component that the layout has changed.
        this.layout = [
            newLayoutItem,
            ...this.layout
        ];
    }

    /** Removes the item from the layout */
    removeItem(id: string) {
        this.layout = ktdArrayRemoveItem(this.layout, (item) => item.id === id);
    }
}
