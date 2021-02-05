import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KtdScrollTestComponent } from './scroll-test.component';
import { RouterModule, Routes } from '@angular/router';
import { KtdGridModule } from '@katoid/angular-grid-layout';

const routes: Routes = [
    {path: 'scroll-test', component: KtdScrollTestComponent},
];

@NgModule({
    declarations: [
        KtdScrollTestComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        KtdGridModule
    ]
})
export class KtdScrollTestModule {}
