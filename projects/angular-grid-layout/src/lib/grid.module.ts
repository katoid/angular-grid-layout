import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KtdGridComponent } from './grid.component';
import { KtdGridItemComponent } from './grid-item/grid-item.component';
import { KtdGridDragHandle } from './directives/drag-handle';
import { KtdGridResizeHandle } from './directives/resize-handle';
import { KtdGridService } from './grid.service';
import { KtdGridItemPlaceholder } from '../public-api';

@NgModule({
    declarations: [
        KtdGridComponent,
        KtdGridItemComponent,
        KtdGridDragHandle,
        KtdGridResizeHandle,
        KtdGridItemPlaceholder
    ],
    exports: [
        KtdGridComponent,
        KtdGridItemComponent,
        KtdGridDragHandle,
        KtdGridResizeHandle,
        KtdGridItemPlaceholder
    ],
    providers: [
        KtdGridService
    ],
    imports: [
        CommonModule
    ]
})
export class KtdGridModule {}
