import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
    {
        path: 'playground',
        loadChildren: () => import('./playground/playground.routes').then(m => m.PLAYGROUND_ROUTES),
    },
    {
        path: '',
        redirectTo: 'playground',
        pathMatch: 'full'
    },
    {
        path: 'custom-handles',
        loadChildren: () => import('./custom-handles/custom-handles.routes').then(m => m.CUSTOM_ROUTES),
    },
    {
        path: 'real-life-example',
        loadChildren: () => import('./real-life-example/real-life-example.routes').then(m => m.REAL_LIFE_ROUTES),
    },
    {
        path: 'scroll-test',
        loadChildren: () => import('./scroll-test/scroll-test.routes').then(m => m.SCROLL_TEST_ROUTES),
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

