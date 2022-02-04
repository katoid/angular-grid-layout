import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KtdPlaygroundComponent } from './playground.component';
import { RouterModule, Routes } from '@angular/router';
import { KtdGridModule } from '@katoid/angular-grid-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';

const routes: Routes = [
    {
        path: 'playground',
        component: KtdPlaygroundComponent,
        data: {title: 'Angular Grid Layout - Playground'}
    },
];


@NgModule({
    declarations: [KtdPlaygroundComponent],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        KtdGridModule,
        MatButtonModule,
        MatSelectModule,
        MatCheckboxModule,
        MatInputModule,
        MatChipsModule
    ]
})
export class KtdPlaygroundModule {}
