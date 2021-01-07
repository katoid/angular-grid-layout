import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KtdGridComponent } from './grid.component';
import { KtdGridItemComponent } from './grid-item/grid-item.component';


@NgModule({
    declarations: [KtdGridComponent, KtdGridItemComponent],
    exports: [
        KtdGridComponent,
        KtdGridItemComponent
    ],
    imports: [
        CommonModule
    ]
})
export class KtdGridModule {}
