import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KtdGridComponent } from './grid.component';
import { KtdGridItemComponent } from './grid-item/grid-item.component';
import { KtdGridDragHandle } from './directives/drag-handle';
import { KtdGridResizeHandle } from './directives/resize-handle';
import { KtdGridService } from './grid.service';
import { KtdGridItemPlaceholder } from '../public-api';
import { KtdDrag } from './directives/ktd-drag';

@NgModule({
    declarations: [
        KtdGridComponent,
        KtdGridItemComponent,
        KtdGridDragHandle,
        KtdGridResizeHandle,
        KtdGridItemPlaceholder,
        KtdDrag
    ],
    exports: [
        KtdGridComponent,
        KtdGridItemComponent,
        KtdGridDragHandle,
        KtdGridResizeHandle,
        KtdGridItemPlaceholder,
        KtdDrag
    ],
    providers: [
        KtdGridService
    ],
    imports: [
        CommonModule
    ]
})
export class KtdGridModule {}
