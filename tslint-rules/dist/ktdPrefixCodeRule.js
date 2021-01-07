"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var tslint_1 = require("tslint");
var typescript_1 = require("typescript");
var KTD_PREFIX = 'ktd';
var Rule = (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Rule.prototype.apply = function (sourceFile) {
        return this.applyWithFunction(sourceFile, walk);
    };
    Rule.metadata = {
        description: "Forces to add the " + KTD_PREFIX + " prefix to every class/interface/function/constant that is exported and consumed in other modules",
        options: null,
        optionsDescription: 'Not configurable.',
        ruleName: 'ktd-prefix-code',
        type: 'functionality',
        typescriptOnly: true
    };
    Rule.FAILURE_STRING = "Exported members need to be prefixed with " + KTD_PREFIX;
    return Rule;
}(tslint_1.Rules.AbstractRule));
exports.Rule = Rule;
function hasExportModifier(node) {
    return !!(node.modifiers || []).find(function (keyword) { return keyword.kind === typescript_1.SyntaxKind.ExportKeyword; });
}
function walk(ctx) {
    return typescript_1.forEachChild(ctx.sourceFile, function cb(node) {
        if ((typescript_1.isClassDeclaration(node) || typescript_1.isInterfaceDeclaration(node) || typescript_1.isFunctionDeclaration(node) || typescript_1.isTypeAliasDeclaration(node)) && node.name !== undefined) {
            if (hasExportModifier(node) && !node.name.text.toLocaleLowerCase().startsWith(KTD_PREFIX)) {
                ctx.addFailureAtNode(node.name, Rule.FAILURE_STRING);
            }
        }
        return typescript_1.forEachChild(node, cb);
    });
}
