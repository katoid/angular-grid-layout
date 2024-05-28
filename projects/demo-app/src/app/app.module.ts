import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { KtdAppComponent } from './app.component';
import { KtdAppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

@NgModule({
    declarations: [
        KtdAppComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        KtdAppRoutingModule,
        HttpClientModule,
        MatIconModule,
        MatButtonModule
    ],
    providers: [ { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }],
    bootstrap: [KtdAppComponent]
})
export class KtdAppModule {}
