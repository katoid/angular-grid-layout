import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KtdPlaygroundModule } from './playground/playground.module';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'playground',
        pathMatch: 'full'
    },
    {
        path: 'custom-handlers',
        redirectTo: 'custom-handlers',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'playground'
    },
];

@NgModule({
    imports: [
        KtdPlaygroundModule,
        RouterModule.forRoot(routes, {
        enableTracing: false
    })],
    exports: [RouterModule]
})
export class KtdAppRoutingModule {}


