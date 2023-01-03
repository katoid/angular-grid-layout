import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KtdGridModule, KtdGridComponent, KtdGridLayout, ktdTrackById } from '@katoid/angular-grid-layout';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ktdArrayRemoveItem } from '../utils';
import { RouterModule } from '@angular/router';
import { KtdFooterComponent } from '../components/footer/footer.component';

@Component({
    selector: 'ktd-row-height-fit',
    standalone: true,
    imports: [CommonModule, KtdGridModule, RouterModule, KtdFooterComponent],
    templateUrl: './row-height-fit.component.html',
    styleUrls: ['./row-height-fit.component.scss']
})
export class KtdRowHeightFitComponent implements OnInit {
    @ViewChild(KtdGridComponent, {static: true}) grid: KtdGridComponent;
    @ViewChild('gridContainer', {static: true}) gridContainerElementRef: ElementRef<HTMLDivElement>;
    trackById = ktdTrackById;

    cols = 12;
    gridHeight: null | number = 500;
    compactType: 'vertical' | 'horizontal' | null = 'vertical';
    layout: KtdGridLayout = [
        {id: '0', x: 5, y: 0, w: 2, h: 3},
        {id: '1', x: 2, y: 2, w: 1, h: 2},
        {id: '2', x: 3, y: 7, w: 1, h: 2},
        {id: '3', x: 2, y: 0, w: 3, h: 2},
        {id: '4', x: 5, y: 3, w: 2, h: 3},
        {id: '5', x: 0, y: 4, w: 1, h: 3},
        {id: '6', x: 9, y: 0, w: 3, h: 4},
        {id: '7', x: 9, y: 4, w: 2, h: 2},
        {id: '8', x: 3, y: 2, w: 2, h: 5},
        {id: '9', x: 7, y: 0, w: 1, h: 3},
        {id: '10', x: 2, y: 4, w: 1, h: 4},
        {id: '11', x: 0, y: 0, w: 2, h: 4},
        {id: '12', x: 7, y: 3, w: 2, h: 2},
        {id: '13', x: 8, y: 5, w: 1, h: 4},
        {id: '14', x: 9, y: 6, w: 3, h: 3}
    ];
    dragStartThreshold = 0;
    gap = 0;
    disableDrag = false;
    disableResize = false;
    disableRemove = false;
    preventCollision = false;
    resizeSubscription: Subscription;

    constructor() { }

    ngOnInit() {
        this.gridHeight = this.gridContainerElementRef.nativeElement.getBoundingClientRect().height;

        this.resizeSubscription = merge(
            fromEvent(window, 'resize'),
            fromEvent(window, 'orientationchange')
        ).pipe(
            debounceTime(50),
        ).subscribe(() => {
            const newHeight = this.gridContainerElementRef.nativeElement.getBoundingClientRect().height;
            if (this.gridHeight !== newHeight) {
                this.gridHeight = this.gridContainerElementRef.nativeElement.getBoundingClientRect().height;
            } else { // If grid height is the same, resize ii in case only the width has changed.
                this.grid.resize();
            }
        });
    }

    onLayoutUpdated(layout: KtdGridLayout) {
        console.log('on layout updated', layout);
        this.layout = layout;
    }

    /**
     * Fired when a mousedown happens on the remove grid item button.
     * Stops the event from propagating an causing the drag to start.
     * We don't want to drag when mousedown is fired on remove icon button.
     */
    stopEventPropagation(event: Event) {
        event.preventDefault();
        event.stopPropagation();
    }

    /** Removes the item from the layout */
    removeItem(id: string) {
        // Important: Don't mutate the array. Let Angular know that the layout has changed creating a new reference.
        this.layout = ktdArrayRemoveItem(this.layout, (item) => item.id === id);
    }
}
