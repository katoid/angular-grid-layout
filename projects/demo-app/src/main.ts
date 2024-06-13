import { enableProdMode } from '@angular/core';

import { appConfig } from './app/app.config';
import { environment } from './environments/environment';
import { bootstrapApplication } from '@angular/platform-browser';
import { KtdAppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(KtdAppComponent, appConfig)
  .catch(err => console.error(err));
