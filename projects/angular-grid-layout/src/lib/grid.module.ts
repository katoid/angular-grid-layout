import { NgModule } from '@angular/core';
import { KtdGridComponent } from './grid.component';
import { KtdGridItemComponent } from './grid-item/grid-item.component';
import { KtdGridDragHandle } from './directives/drag-handle';
import { KtdGridResizeHandle } from './directives/resize-handle';
import { KtdGridService } from './grid.service';
import { KtdGridItemPlaceholder } from '../public-api';

@NgModule({
    imports: [
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
    ]
})
/**
 * @deprecated Use `KtdGridComponent` instead.
 */
export class KtdGridModule {}
