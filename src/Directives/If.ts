﻿///<reference path="../../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../Core/Utils.ts" />
/// <reference path="../Services/DomService.ts" />
/// <reference path="../Interfaces.ts" />
/// <reference path="../Core/Resources.ts" />

module xi {
    class IfDirective implements IDirective {
        constructor(domService: IDomService) {
            this.domService = domService;
        } 
 
        ////////////////////
        // IDirective

        public apply(node: Node, options: any, ctx: IModelContext, state: IDomElementState): boolean {
            if (node.nodeType !== 1)
                throw new Error("** xircular: if binding only operates on elements!");

            if (utils.isNull(options))
                throw new Error("** xircular: Invalid binding options!");

            var el = <HTMLElement> node;
            var self = this;
            var initialApply = true;
            var exp = <ICompiledExpression> options;
            var obs = this.domService.expressionToObservable(exp, ctx);

            // backup inner HTML
            var template = new Array<Node>();

            // subscribe
            state.disposables.add(obs.subscribe(x => {
                self.applyValue(el, x, template, ctx, initialApply);

                initialApply = false;
            }));

            // release closure references to GC 
            state.disposables.add(Rx.Disposable.create(() => {
                // nullify args
                node = null;
                options = null;
                ctx = null;
                state = null;

                // nullify common locals
                obs = null;
                el = null;
                self = null;

                // nullify locals
                template = null;
            }));

            return true;
        }

        configure(options): void {
            // intentionally left blank
        }

        ////////////////////
        // implementation

        protected inverse: boolean = false;
        protected domService: IDomService;

        protected applyValue(el: HTMLElement, value: any, template: Array<Node>, ctx: IModelContext, initialApply: boolean): void {
            var i;

            if (initialApply) {
                // clone to template
                for (i = 0; i < el.childNodes.length; i++) {
                    template.push(el.childNodes[i].cloneNode(true));
                }

                // clear
                while (el.firstChild) {
                    el.removeChild(el.firstChild);
                }
            }

            value = this.inverse ? !value : value;

            if (!value) {
                // clean first
                this.domService.cleanDescendants(el);

                // clear
                while (el.firstChild) {
                    el.removeChild(el.firstChild);
                }
            } else {
                // clone nodes and inject
                for (i = 0; i < template.length; i++) {
                    var node = template[i].cloneNode(true);
                    el.appendChild(node);
                }

                this.domService.applyDirectivesToDescendants(ctx, el);
            }
        }
    }

    class NotIfDirective extends IfDirective {
        constructor(domService: IDomService) {
            super(domService);

            this.inverse = true;
        } 
    }

    export module internals {
        export var ifDirectiveConstructor = <any> IfDirective;
        export var notifDirectiveConstructor = <any> NotIfDirective;
    }
}