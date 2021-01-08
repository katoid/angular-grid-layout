import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { KtdGridCfg, KtdGridLayout } from '../../../../../dist/grid/lib/grid.definitions';
import { MatSelectChange } from '@angular/material/select';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { KtdGridComponent } from 'grid';

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
    }

    onCompactTypeChange(change: MatSelectChange) {
        console.log('onCompactTypeChange', change);
        this.compactType = change.value;
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
}
