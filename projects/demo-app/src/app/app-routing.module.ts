import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KtdPlaygroundModule } from './playground/playground.module';
import { KtdCustomHandlesModule } from './custom-handles/custom-handles.module';
import { KtdRealLifeExampleModule } from './real-life-example/real-life-example.module';
import { KtdScrollTestModule } from './scroll-test/scroll-test.module';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'playground',
        pathMatch: 'full'
    },
    {
        path: 'custom-handles',
        redirectTo: 'custom-handles',
        pathMatch: 'full'
    },
    {
        path: 'real-life-example',
        redirectTo: 'real-life-example',
        pathMatch: 'full'
    },
    {
        path: 'scroll-test',
        redirectTo: 'scroll-test',
        pathMatch: 'full'
    },
    {
        path: 'row-height-fit',
        loadComponent: () => import('./row-height-fit/row-height-fit.component').then(m => m.KtdRowHeightFitComponent),
        data: {title: 'Angular Grid Layout - Row Height Fit'}
    },
    {
        path: '**',
        redirectTo: 'playground'
    },
];

@NgModule({
    imports: [
        KtdPlaygroundModule,
        KtdCustomHandlesModule,
        KtdRealLifeExampleModule,
        KtdScrollTestModule,
        RouterModule.forRoot(routes, {
            enableTracing: false
        })],
    exports: [RouterModule]
})
export class KtdAppRoutingModule {}


