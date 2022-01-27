import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { KtdGridComponent, KtdGridLayout, ktdTrackById } from '@katoid/angular-grid-layout';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { DOCUMENT } from '@angular/common';
import { coerceNumberProperty } from '@angular/cdk/coercion';

function generateLayout2(cols: number, size: number) {
    const rows = cols;
    const layout: any[] = [];
    let counter = 0;
    for (let i = 0; i < rows; i += size) {
        for (let j = i; j < cols; j += size) {
            layout.push({
                id: `${counter}`,
                x: j,
                y: i,
                w: size,
                h: size
            });
            counter++;
        }
    }

    return layout;
}

@Component({
    selector: 'ktd-scroll-test',
    templateUrl: './scroll-test.component.html',
    styleUrls: ['./scroll-test.component.scss']
})
export class KtdScrollTestComponent implements OnInit, OnDestroy {
    @ViewChild('grid1', {static: true, read: KtdGridComponent}) grid1: KtdGridComponent;
    @ViewChild('grid2', {static: true, read: KtdGridComponent}) grid2: KtdGridComponent;

    trackById = ktdTrackById;
    cols = 12;
    rowHeight = 50;
    compactType: 'vertical' | 'horizontal' | null = 'vertical';
    scrollSpeed = 2;
    layout1: KtdGridLayout = [
        {id: '0', x: 0, y: 0, w: 3, h: 3},
        {id: '1', x: 3, y: 0, w: 3, h: 3},
        {id: '2', x: 6, y: 0, w: 3, h: 3},
        {id: '3', x: 9, y: 0, w: 3, h: 3},
        {id: '4', x: 3, y: 3, w: 3, h: 3},
        {id: '5', x: 6, y: 3, w: 3, h: 3},
        {id: '6', x: 9, y: 3, w: 3, h: 3},
        {id: '7', x: 3, y: 6, w: 3, h: 3},


        {id: '8', x: 3, y: 9, w: 3, h: 3},
        {id: '9', x: 3, y: 12, w: 3, h: 3},
        {id: '10', x: 3, y: 15, w: 3, h: 3},
        {id: '11', x: 3, y: 18, w: 3, h: 3}
    ];

    cols2 = 36;
    layout2: KtdGridLayout = generateLayout2(this.cols2, 3);

    private resizeSubscription: Subscription;

    constructor(@Inject(DOCUMENT) public document) { }

    ngOnInit() {
        this.resizeSubscription = merge(
            fromEvent(window, 'resize'),
            fromEvent(window, 'orientationchange')
        ).pipe(
            debounceTime(50)
        ).subscribe(() => {
            this.grid1.resize();
            this.grid2.resize();
        });
    }

    ngOnDestroy() {
        this.resizeSubscription.unsubscribe();
    }

    onScrollSpeedChange(event: Event) {
        this.scrollSpeed = coerceNumberProperty((event.target as HTMLInputElement).value);
    }
}
