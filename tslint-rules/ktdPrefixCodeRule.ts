import { IRuleMetadata, RuleFailure, Rules, WalkContext } from 'tslint';
import {
    forEachChild, isClassDeclaration, isFunctionDeclaration, isInterfaceDeclaration, isTypeAliasDeclaration, Node, SourceFile,
    SyntaxKind, Token
} from 'typescript';

const KTD_PREFIX = 'ktd';

// tslint:disable-next-line:ktd-prefix-code
export class Rule extends Rules.AbstractRule {
    static readonly metadata: IRuleMetadata = {
        description: `Forces to add the ${KTD_PREFIX} prefix to every class/interface/function/constant that is exported and consumed in other modules`,
        options: null,
        optionsDescription: 'Not configurable.',
        ruleName: 'ktd-prefix-code',
        type: 'functionality',
        typescriptOnly: true
    };

    static readonly FAILURE_STRING = `Exported members need to be prefixed with ${KTD_PREFIX}`;

    apply(sourceFile: SourceFile): RuleFailure[] {
        return this.applyWithFunction(sourceFile, walk);
    }
}

function hasExportModifier(node: Node): boolean {
    return !!(node.modifiers || []).find((keyword: Token<SyntaxKind>) => keyword.kind === SyntaxKind.ExportKeyword);
}

function walk(ctx: WalkContext) {
    return forEachChild(ctx.sourceFile, function cb(node: Node): void {
        if ((isClassDeclaration(node) || isInterfaceDeclaration(node) || isFunctionDeclaration(node) || isTypeAliasDeclaration(node)) && node.name !== undefined) {
            if (hasExportModifier(node) && !node.name!.text.toLocaleLowerCase().startsWith(KTD_PREFIX)) {
                ctx.addFailureAtNode(node.name!, Rule.FAILURE_STRING);
            }
        }
        return forEachChild(node, cb);
    });
}

