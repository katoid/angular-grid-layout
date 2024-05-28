import { KtdPlaygroundComponent } from './playground.component';
import { Routes } from '@angular/router';

export const PLAYGROUND_ROUTES: Routes = [
    {
        path: '',
        component: KtdPlaygroundComponent,
        data: {title: 'Angular Grid Layout - Playground'}
    },
];
