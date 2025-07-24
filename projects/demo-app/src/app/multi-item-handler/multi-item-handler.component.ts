import {
    Component,
    ElementRef,
    Inject,
    NgZone,
    OnDestroy,
    OnInit,
    ViewChild
} from '@angular/core';
import {MatSelectChange, MatSelectModule} from '@angular/material/select';
import {
    KtdDragEnd,
    KtdDragStart,
    ktdGridCompact,
    KtdGridComponent,
    KtdGridLayout,
    KtdGridLayoutItem,
    KtdResizeEnd,
    KtdResizeStart,
    ktdTrackById,
    KtdGridItemComponent,
    KtdGridItemPlaceholder
} from '@katoid/angular-grid-layout';
import {ktdArrayRemoveItem} from '../utils';
import {DOCUMENT, NgClass, NgFor, NgIf} from '@angular/common';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {KtdFooterComponent} from '../components/footer/footer.component';
import {ColorPickerModule} from 'ngx-color-picker';
import {MatChipsModule} from '@angular/material/chips';
import {MatInputModule} from '@angular/material/input';
import {MatOptionModule} from '@angular/material/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
import {ktdGetOS} from './multi-item-handler.utils';

@Component({
    standalone: true,
    selector: 'ktd-playground',
    templateUrl: './multi-item-handler.component.html',
    styleUrls: ['./multi-item-handler.component.scss'],
    imports: [
        MatButtonModule,
        MatFormFieldModule,
        MatSelectModule,
        MatOptionModule,
        MatInputModule,
        MatCheckboxModule,
        NgFor,
        NgClass,
        MatChipsModule,
        ColorPickerModule,
        KtdGridComponent,
        KtdGridItemComponent,
        KtdGridItemPlaceholder,
        KtdFooterComponent
    ]
})
export class KtdMultiItemHandlerComponent implements OnInit, OnDestroy {
    @ViewChild(KtdGridComponent, {static: true}) grid: KtdGridComponent;
    trackById = ktdTrackById;

    cols = 12;
    rowHeight = 50;
    compactType: 'vertical' | 'horizontal' | null = 'vertical';
    preventCollision = false;
    selectedItems: string[] = [];
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

    private _isDraggingResizing: boolean = false;

    constructor(
        private ngZone: NgZone,
        public elementRef: ElementRef,
        @Inject(DOCUMENT) public document: Document
    ) {
        // this.ngZone.onUnstable.subscribe(() => console.log('UnStable'));
    }

    ngOnInit() {}

    ngOnDestroy() {}

    onDragStarted(event: KtdDragStart) {
        this._isDraggingResizing = true;
        console.log('onDragStarted', event);
    }

    onDragEnded(event: KtdDragEnd) {
        this._isDraggingResizing = false;
        console.log('onDragEnded', event);
    }

    onResizeStarted(event: KtdResizeStart) {
        this._isDraggingResizing = true;
        console.log('onResizeStarted', event);
    }

    onResizeEnded(event: KtdResizeEnd) {
        this._isDraggingResizing = false;
        console.log('onResizeEnded', event);
    }

    onCompactTypeChange(change: MatSelectChange) {
        console.log('onCompactTypeChange', change);
        this.compactType = change.value;
    }

    onPreventCollisionChange(checked: boolean) {
        console.log('onPreventCollisionChange', checked);
        this.preventCollision = checked;
    }

    onLayoutUpdated(layout: KtdGridLayout) {
        console.log('onLayoutUpdated', layout);
        this.layout = layout;
    }

    generateLayout() {
        const layout: KtdGridLayout = [];
        for (let i = 0; i < this.cols; i++) {
            const y = Math.ceil(Math.random() * 4) + 1;
            layout.push({
                x:
                    Math.round(Math.random() * Math.floor(this.cols / 2 - 1)) *
                    2,
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
        const maxId = this.layout.reduce(
            (acc, cur) => Math.max(acc, parseInt(cur.id, 10)),
            -1
        );
        const nextId = maxId + 1;
        const newLayoutItem: KtdGridLayoutItem = {
            id: nextId.toString(),
            x: -1,
            y: -1,
            w: 2,
            h: 2
        };
        // Important: Don't mutate the array, create new instance. This way notifies the Grid component that the layout has changed.
        this.layout = [newLayoutItem, ...this.layout];
        this.layout = ktdGridCompact(this.layout, this.compactType, this.cols);
        console.log('addItemToLayout', newLayoutItem);
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
        this.selectedItems = [];
        // Important: Don't mutate the array. Let Angular know that the layout has changed creating a new reference.
        this.layout = ktdArrayRemoveItem(this.layout, item => item.id === id);
    }

    /**
     * Check if 'selectedItem' is on the multi item selection
     */
    isItemSelected(selectedItem: KtdGridLayoutItem): boolean {
        return this.selectedItems.includes(selectedItem.id);
    }

    /*
     * Select an item outside of the group
     */
    pointerDownItemSelection(
        event: MouseEvent,
        selectedItem: KtdGridLayoutItem
    ) {
        const ctrlOrCmd = ktdGetOS() == 'macos' ? event.metaKey : event.ctrlKey;
        if (!ctrlOrCmd) {
            const selectedItemExist = this.selectedItems.includes(
                selectedItem.id
            );
            if (!selectedItemExist) {
                // Click an element outside selection group
                // Clean all selections and select the new item
                if (event.button == 2) {
                    this.selectedItems = [];
                } else {
                    this.selectedItems = [selectedItem.id];
                }
            }
        }
    }

    /*
     * Select an item inside the group or multiselect with Control button
     */
    pointerUpItemSelection(event: MouseEvent, selectedItem: KtdGridLayoutItem) {
        const ctrlOrCmd = ktdGetOS() == 'macos' ? event.metaKey : event.ctrlKey;
        if (event.button !== 2) {
            //Only select with primary button click
            const selectedItemExist = this.selectedItems.includes(
                selectedItem.id
            );
            if (ctrlOrCmd) {
                if (selectedItemExist) {
                    // Control + click an element inside the selection group
                    if (!this._isDraggingResizing) {
                        // If not dragging, remove the selected item from the group
                        this.selectedItems = ktdArrayRemoveItem(
                            this.selectedItems,
                            itemId => itemId === selectedItem.id
                        );
                    }
                } else {
                    // Control + click an element outside the selection group
                    // Add the new selected item to the current group
                    this.selectedItems = [
                        ...this.selectedItems,
                        selectedItem.id
                    ];
                }
            } else if (!this._isDraggingResizing && selectedItemExist) {
                // Click an element inside the selection group
                this.selectedItems = [selectedItem.id];
            }
        }
    }
}
