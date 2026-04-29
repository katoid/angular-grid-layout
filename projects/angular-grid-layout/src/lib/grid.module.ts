import { NgModule } from '@angular/core';
import { KtdGridComponent } from './grid.component';
import { KtdGridItemComponent } from './grid-item/grid-item.component';
import { KtdGridDragHandle } from './directives/drag-handle';
import { KtdGridResizeHandle } from './directives/resize-handle';
import { KtdGridItemPlaceholder } from './directives/placeholder';
import { KtdGridService } from './grid.service';

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
 * Legacy compatibility wrapper for NgModule-based applications.
 *
 * @deprecated Use the standalone components and directives directly.
 * This NgModule is kept only for legacy compatibility and will be removed in the next major version.
 */
export class KtdGridModule {}
