import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KtdCustomHandlesComponent } from './custom-handles.component';
import { KtdGridModule } from '@katoid/angular-grid-layout';
import { RouterModule, Routes } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

const routes: Routes = [
    {
        path: 'custom-handles',
        component: KtdCustomHandlesComponent,
        data: {title: 'Angular Grid Layout - Custom handles'}
    },
];

@NgModule({
    declarations: [KtdCustomHandlesComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        MatIconModule,
        KtdGridModule
    ]
})
export class KtdCustomHandlesModule {}
