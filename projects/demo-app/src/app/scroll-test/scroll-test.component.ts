import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KtdGridComponent, KtdGridLayout, ktdTrackById, KtdGridItemComponent } from '@katoid/angular-grid-layout';
import { fromEvent, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { coerceNumberProperty } from '@angular/cdk/coercion';
import { KtdFooterComponent } from '../components/footer/footer.component';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

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
    styleUrls: ['./scroll-test.component.scss'],
    imports: [MatFormFieldModule, MatInputModule, KtdGridComponent, KtdGridItemComponent, KtdFooterComponent]
})
export class KtdScrollTestComponent implements OnInit {
    @ViewChild('grid1', {static: true, read: KtdGridComponent}) grid1: KtdGridComponent;
    @ViewChild('grid2', {static: true, read: KtdGridComponent}) grid2: KtdGridComponent;
    private readonly destroyRef = inject(DestroyRef);

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

    ngOnInit() {
        merge(
            fromEvent(window, 'resize'),
            fromEvent(window, 'orientationchange')
        ).pipe(
            debounceTime(50),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.grid1.resize();
            this.grid2.resize();
        });
    }

    onScrollSpeedChange(event: Event) {
        this.scrollSpeed = coerceNumberProperty((event.target as HTMLInputElement).value);
    }

    onLayout1Updated(layout: KtdGridLayout) {
        this.layout1 = layout;
    }

    onLayout2Updated(layout: KtdGridLayout) {
        this.layout2 = layout;
    }
}
