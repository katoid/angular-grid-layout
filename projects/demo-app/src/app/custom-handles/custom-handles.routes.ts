import { KtdCustomHandlesComponent } from './custom-handles.component';
import { Routes } from '@angular/router';

export const CUSTOM_ROUTES: Routes = [
    {
        path: '',
        component: KtdCustomHandlesComponent,
        data: {title: 'Angular Grid Layout - Custom handles'}
    },
];
