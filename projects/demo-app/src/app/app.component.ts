import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterOutlet } from '@angular/router';
import { ActivatedRoute, Router, RoutesRecognized } from '@angular/router';

const defaultTitle = 'Angular Grid Layout';

@Component({
    standalone: true,
    selector: 'ktd-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet, MatIconModule, MatButtonModule]
})
export class KtdAppComponent {
    title: string = defaultTitle;

    constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer, private router: Router, private readonly route: ActivatedRoute) {
        this.matIconRegistry.addSvgIcon(
            `github`,
            this.domSanitizer.bypassSecurityTrustResourceUrl(`assets/logos/github.svg`)
        );

        this.router.events.subscribe((data) => {
            if (data instanceof RoutesRecognized) {
                const firstChild = data.state.root;
                this.title = this.getTitle(firstChild) || defaultTitle;
            }
        });
    }

    getTitle(firstChild: ActivatedRouteSnapshot | null) {
        while (firstChild) {
            if (firstChild.data?.title) {
                return firstChild.data.title;
            }
            return this.getTitle(firstChild?.firstChild);
        }
    }
}
