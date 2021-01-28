import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { KtdDragEnd, KtdDragStart, KtdGridComponent, KtdResizeEnd, KtdResizeStart, KtdGridCfg, KtdGridLayout, KtdGridLayoutItem } from '@katoid/angular-grid-layout';
import { ktdArrayRemoveItem, ktdTrackById } from '../utils';

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
    layout: KtdGridLayout = [
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
    transitions: {name: string, value: string}[] = [
        {name: 'custom', value: 'transform 500ms ease, width 500ms linear, height 500ms linear'},
        {name: 'linear', value: 'transform 500ms linear, width 500ms linear, height 500ms linear'},
        {name: 'ease', value: 'transform 500ms ease, width 500ms ease, height 500ms ease'},
        {name: 'ease-out', value: 'transform 500ms ease-out, width 500ms ease-out, height 500ms ease-out'},
        {name: 'overflowing', value: 'transform 500ms cubic-bezier(.28,.49,.79,1.35), width 500ms cubic-bezier(.28,.49,.79,1.35), height 500ms cubic-bezier(.28,.49,.79,1.35)'},
        {name: 'fast', value: 'transform 200ms ease, width 200ms linear, height 200ms linear'},
        {name: 'slow-motion', value: 'transform 1000ms linear, width 1000ms linear, height 1000ms linear'},
    ];
    currentTransition: string = this.transitions[0].value;

    dragStartThreshold = 0;
    disableDrag = false;
    disableResize = false;
    disableRemove = false;
    autoResize = true;
    isDragging = false;
    isResizing = false;
    resizeSubscription: Subscription;

    constructor(private ngZone: NgZone) {
        // this.ngZone.onUnstable.subscribe(() => console.log('UnStable'));
    }

    ngOnInit() {
        this.resizeSubscription = fromEvent(window, 'resize').pipe(
            debounceTime(50),
            filter(() => this.autoResize)
        ).subscribe(() => {
            this.grid.resize();
        });
    }

    ngOnDestroy() {
        this.resizeSubscription.unsubscribe();
    }

    onDragStarted(event: KtdDragStart) {
        this.isDragging = true;
    }

    onResizeStarted(event: KtdResizeStart) {
        this.isResizing = true;
    }

    onDragEnded(event: KtdDragEnd) {
        this.isDragging = false;
    }

    onResizeEnded(event: KtdResizeEnd) {
        this.isResizing = false;
    }

    onConfigUpdated(event: KtdGridCfg) {
        console.log('on config updated', event);
        this.layout = event.layout;
    }

    onCompactTypeChange(change: MatSelectChange) {
        console.log('onCompactTypeChange', change);
        this.compactType = change.value;
    }

    onTransitionChange(change: MatSelectChange) {
        console.log('onTransitionChange', change);
        this.currentTransition = change.value;
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

    onDragStartThresholdChange(event: Event) {
        this.dragStartThreshold = parseInt((event.target as HTMLInputElement).value, 10);
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
        // Important: Don't mutate the array. Let Angular know that the layout has changed creating a new reference.
        this.layout = ktdArrayRemoveItem(this.layout, (item) => item.id === id);
    }
}
