import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KtdScrollTestComponent } from './scroll-test.component';
import { RouterModule, Routes } from '@angular/router';
import { KtdGridModule } from '@katoid/angular-grid-layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { KtdFooterComponent } from '../components/footer/footer.component';

const routes: Routes = [
    {
        path: 'scroll-test',
        component: KtdScrollTestComponent,
        data: {title: 'Angular Grid Layout - Scroll test'}
    },
];

@NgModule({
    declarations: [
        KtdScrollTestComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        KtdGridModule,
        MatFormFieldModule,
        MatInputModule,
        KtdFooterComponent
    ]
})
export class KtdScrollTestModule {}
