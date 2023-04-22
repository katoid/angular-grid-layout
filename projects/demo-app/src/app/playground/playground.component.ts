import { Component, ElementRef, Inject, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import {
    KtdDragEnd, KtdDragStart, ktdGridCompact, KtdGridComponent, KtdGridLayout, KtdGridLayoutItem, KtdResizeEnd, KtdResizeStart, ktdTrackById
} from '@katoid/angular-grid-layout';
import { ktdArrayRemoveItem } from '../utils';
import { DOCUMENT } from '@angular/common';
import { coerceNumberProperty } from '@angular/cdk/coercion';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { KtdGridBackgroundCfg } from '../../../../angular-grid-layout/src/lib/grid.definitions';

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
    rowHeightFit = false;
    gridHeight: null | number = null;
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
    transitions: { name: string, value: string }[] = [
        {name: 'ease', value: 'transform 500ms ease, width 500ms ease, height 500ms ease'},
        {name: 'ease-out', value: 'transform 500ms ease-out, width 500ms ease-out, height 500ms ease-out'},
        {name: 'linear', value: 'transform 500ms linear, width 500ms linear, height 500ms linear'},
        {
            name: 'overflowing',
            value: 'transform 500ms cubic-bezier(.28,.49,.79,1.35), width 500ms cubic-bezier(.28,.49,.79,1.35), height 500ms cubic-bezier(.28,.49,.79,1.35)'
        },
        {name: 'fast', value: 'transform 200ms ease, width 200ms linear, height 200ms linear'},
        {name: 'slow-motion', value: 'transform 1000ms linear, width 1000ms linear, height 1000ms linear'},
        {name: 'transform-only', value: 'transform 500ms ease'},
    ];
    currentTransition: string = this.transitions[0].value;

    placeholders: string[] = [
        'None',
        'Default',
        'Custom 1',
        'Custom 2',
        'Custom 3',
    ];

    currentPlaceholder: string = 'Default';

    dragStartThreshold = 0;
    gap = 10;
    autoScroll = true;
    disableDrag = false;
    disableResize = false;
    disableRemove = false;
    autoResize = true;
    preventCollision = false;
    isDragging = false;
    isResizing = false;
    showBackground = false;
    resizeSubscription: Subscription;

    gridBackgroundVisibilityOptions = ['never', 'always', 'whenDragging'];
    gridBackgroundConfig: Required<KtdGridBackgroundCfg> = {
        show: 'always',
        borderColor: 'rgba(255, 128, 0, 0.25)',
        gapColor: 'transparent',
        borderWidth: 1,
        rowColor: 'rgba(128, 128, 128, 0.10)',
        columnColor: 'rgba(128, 128, 128, 0.10)',
    };

    constructor(private ngZone: NgZone, public elementRef: ElementRef, @Inject(DOCUMENT) public document: Document) {
        // this.ngZone.onUnstable.subscribe(() => console.log('UnStable'));
    }

    ngOnInit() {
        this.resizeSubscription = merge(
            fromEvent(window, 'resize'),
            fromEvent(window, 'orientationchange')
        ).pipe(
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

    onLayoutUpdated(layout: KtdGridLayout) {
        console.log('on layout updated', layout);
        this.layout = layout;
    }

    onCompactTypeChange(change: MatSelectChange) {
        console.log('onCompactTypeChange', change);
        this.compactType = change.value;
    }

    onTransitionChange(change: MatSelectChange) {
        console.log('onTransitionChange', change);
        this.currentTransition = change.value;
    }

    onAutoScrollChange(checked: boolean) {
        this.autoScroll = checked;
    }

    onDisableDragChange(checked: boolean) {
        this.disableDrag = checked;
    }

    onDisableResizeChange(checked: boolean) {
        this.disableResize = checked;
    }

    onShowBackgroundChange(checked: boolean) {
        this.showBackground = checked;
    }

    onDisableRemoveChange(checked: boolean) {
        this.disableRemove = checked;
    }

    onAutoResizeChange(checked: boolean) {
        this.autoResize = checked;
    }

    onPreventCollisionChange(checked: boolean) {
        this.preventCollision = checked;
    }

    onColsChange(event: Event) {
        this.cols = coerceNumberProperty((event.target as HTMLInputElement).value);
    }

    onRowHeightChange(event: Event) {
        this.rowHeight = coerceNumberProperty((event.target as HTMLInputElement).value);
    }

    onRowHeightFitChange(change: MatCheckboxChange) {
        this.rowHeightFit = change.checked;
    }

    onGridHeightChange(event: Event) {
        this.gridHeight = coerceNumberProperty((event.target as HTMLInputElement).value);
    }

    onDragStartThresholdChange(event: Event) {
        this.dragStartThreshold = coerceNumberProperty((event.target as HTMLInputElement).value);
    }

    onPlaceholderChange(change: MatSelectChange) {
        this.currentPlaceholder = change.value;
    }

    onGapChange(event: Event) {
        this.gap = coerceNumberProperty((event.target as HTMLInputElement).value);
    }

    generateLayout() {
        const layout: KtdGridLayout = [];
        for (let i = 0; i < this.cols; i++) {
            const y = Math.ceil(Math.random() * 4) + 1;
            layout.push({
                x: Math.round(Math.random() * (Math.floor((this.cols / 2) - 1))) * 2,
                y: Math.floor(i / 6) * y,
                w: 2,
                h: y,
                id: i.toString()
                // static: Math.random() < 0.05
            });
        }
        this.layout = ktdGridCompact(layout, this.compactType, this.cols);
        console.log('generateLayout', this.layout);
    }

    /** Adds a grid item to the layout */
    addItemToLayout() {
        const maxId = this.layout.reduce((acc, cur) => Math.max(acc, parseInt(cur.id, 10)), -1);
        const nextId = maxId + 1;

        const newLayoutItem: KtdGridLayoutItem = {
            id: nextId.toString(),
            x: -1,
            y: -1,
            w: 2,
            h: 2
        };

        // Important: Don't mutate the array, create new instance. This way notifies the Grid component that the layout has changed.
        this.layout = [
            newLayoutItem,
            ...this.layout
        ];

        this.layout = ktdGridCompact(this.layout, this.compactType, this.cols);
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

    updateGridBgBorderWidth(borderWidth: string) {
        this.gridBackgroundConfig = {
            ...this.gridBackgroundConfig,
            borderWidth: Number(borderWidth)
        };
    }

    updateGridBgColor(color: string, property: string) {
        this.gridBackgroundConfig = {
            ...this.gridBackgroundConfig,
            [property]: color
        };
    }

    getCurrentBackgroundVisibility() {
        return this.gridBackgroundConfig?.show ?? 'never';
    }

    gridBackgroundShowChange(change: MatSelectChange) {
        this.gridBackgroundConfig = {
            ...this.gridBackgroundConfig,
            show: change.value as (Required<KtdGridBackgroundCfg>['show'])
        };
    }
}
