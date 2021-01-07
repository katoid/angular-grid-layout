import { Component, NgZone } from '@angular/core';
import { KtdGridCfg } from '../../../../dist/grid/lib/grid.definitions';

interface GridItem {
    id: string;
    draggable: boolean;
    removable: boolean;
    resizable: boolean;
}

function ktdTrackById(index: number, item: GridItem) {
    return item.id;
}

@Component({
    selector: 'ktd-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class KtdAppComponent {
    title = 'demo-app';
    trackById = ktdTrackById;

    gridConfig: KtdGridCfg = {
        cols: 6,
        rowHeight: 100,
        layout: [
            {x: 0, y: 0, w: 1, h: 1, id: '1'},
            {x: 1, y: 0, w: 1, h: 1, id: '2'},
            {x: 0, y: 1, w: 2, h: 2, id: '3'}
        ]
    };

    gridItems: GridItem[] = [
        {id: '1', draggable: true, removable: false, resizable: true},
        {id: '2', draggable: true, removable: false, resizable: true},
        {id: '3', draggable: true, removable: false, resizable: true},
    ];


    constructor(private ngZone: NgZone) {
        this.ngZone.onUnstable.subscribe(() => console.log('UnStable'));
    }

    onConfigUpdated(event: KtdGridCfg) {
        console.log('on config updated', event);
    }
}
