import { Component, OnInit } from '@angular/core';
import { ktdTrackById } from '../utils';
import { KtdGridCfg } from '../../../../../dist/grid/lib/grid.definitions';

@Component({
    selector: 'ktd-custom-handles',
    templateUrl: './custom-handles.component.html',
    styleUrls: ['./custom-handles.component.scss']
})
export class KtdCustomHandlesComponent implements OnInit {
    trackById = ktdTrackById;
    cols = 12;
    rowHeight = 50;
    compactType: 'vertical' | 'horizontal' | null = 'vertical';
    layout = [
        {id: '0', x: 0, y: 0, w: 3, h: 3},
        {id: '1', x: 3, y: 0, w: 3, h: 4},
        {id: '2', x: 6, y: 0, w: 3, h: 5},
        {id: '3', x: 9, y: 0, w: 3, h: 6}
    ];

    constructor() { }

    ngOnInit(): void {
    }

    onConfigUpdated(event: KtdGridCfg) {
        this.layout = event.layout;
    }

}
