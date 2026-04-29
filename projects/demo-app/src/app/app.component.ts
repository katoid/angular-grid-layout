import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, Router, RouterOutlet, RoutesRecognized } from '@angular/router';

const defaultTitle = 'Angular Grid Layout';

@Component({
    selector: 'ktd-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet, MatIconModule, MatButtonModule]
})
export class KtdAppComponent {
    title: string = defaultTitle;
    private readonly destroyRef = inject(DestroyRef);
    private readonly changeDetectorRef = inject(ChangeDetectorRef);
    private readonly matIconRegistry = inject(MatIconRegistry);
    private readonly domSanitizer = inject(DomSanitizer);
    private readonly router = inject(Router);

    constructor() {
        this.matIconRegistry.addSvgIcon(
            `github`,
            this.domSanitizer.bypassSecurityTrustResourceUrl(`assets/logos/github.svg`)
        );

        this.router.events
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
            if (data instanceof RoutesRecognized) {
                const firstChild = data.state.root;
                this.title = this.getTitle(firstChild) || defaultTitle;
                this.changeDetectorRef.markForCheck();
            }
        });
    }

    getTitle(firstChild: ActivatedRouteSnapshot | null) {
        while (firstChild) {
            if (firstChild.title) {
                return firstChild.title;
            }
            return this.getTitle(firstChild?.firstChild);
        }
    }
}
