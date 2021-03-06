﻿/// <reference path="../Core/DomManager.ts" />
/// <reference path="../Interfaces.ts" />

module wx {
    "use strict";

    export interface IKeyPressBindingOptions {
        [key: string]: (ctx: IDataContext, event: Event) => any|ICommand<any>|{ command: ICommand<any>; parameter: any };
    }

    var keysByCode = {
        8: 'backspace',
        9: 'tab',
        13: 'enter',
        27: 'esc',
        32: 'space',
        33: 'pageup',
        34: 'pagedown',
        35: 'end',
        36: 'home',
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        45: 'insert',
        46: 'delete'
    };

    class KeyPressBinding implements IBindingHandler {
        constructor(domManager: IDomManager) {
            this.domManager = domManager;
        } 

        ////////////////////
        // IBinding

        public applyBinding(node: Node, options: string, ctx: IDataContext, state: INodeState, module: IModule): void {
            if (node.nodeType !== 1)
                internal.throwError("keyPress-binding only operates on elements!");

            if (options == null)
                internal.throwError("invalid binding-options!");

            var el = <HTMLElement> node;

            // create an observable for key combination
            var tokens = this.domManager.getObjectLiteralTokens(options);
            var obs = Rx.Observable.fromEvent<KeyboardEvent>(el, "keydown")
                .where(x=> !x.repeat)
                .publish()
                .refCount();

            tokens.forEach(token => {
                var keyDesc = token.key;
                var combination, combinations = [];

                // parse key combinations
                keyDesc.split(' ').forEach(variation => {
                    combination = {
                        expression: keyDesc,
                        keys: {}
                    };

                    variation.split('-').forEach(value => {
                        combination.keys[value.trim()] = true;
                    });

                    combinations.push(combination);
                });

                this.wireKey(token.value, obs, combinations, ctx, state, module);
            });

            // release closure references to GC 
            state.cleanup.add(Rx.Disposable.create(() => {
                // nullify args
                node = null;
                options = null;
                ctx = null;
                state = null;

                // nullify common locals
                el = null;

                // nullify locals
            }));
        }

        public configure(options): void {
            // intentionally left blank
        }

        public priority = 0;

        ////////////////////
        // Implementation

        protected domManager: IDomManager;

        private testCombination(combination, event: KeyboardEvent): boolean {
            var metaPressed = !!(event.metaKey && !event.ctrlKey);
            var altPressed = !!event.altKey;
            var ctrlPressed = !!event.ctrlKey;
            var shiftPressed = !!event.shiftKey;
            var keyCode = event.keyCode;

            var metaRequired = !!combination.keys.meta;
            var altRequired = !!combination.keys.alt;
            var ctrlRequired = !!combination.keys.ctrl;
            var shiftRequired = !!combination.keys.shift;

            // normalize keycodes
            if ((!shiftPressed || shiftRequired) && keyCode >= 65 && keyCode <= 90)
                keyCode = keyCode + 32;

            var mainKeyPressed = combination.keys[keysByCode[keyCode]] || combination.keys[keyCode.toString()] || combination.keys[String.fromCharCode(keyCode)];

            return (
                mainKeyPressed &&
                (metaRequired === metaPressed) &&
                (altRequired === altPressed) &&
                (ctrlRequired === ctrlPressed) &&
                (shiftRequired === shiftPressed)
            );
        }

        private testCombinations(combinations, event: KeyboardEvent): boolean {
            for (var i = 0; i < combinations.length; i++) {
                if (this.testCombination(combinations[i], event))
                    return true;
            }

            return false;
        }

        private wireKey(value: any, obs: Rx.Observable<KeyboardEvent>, combinations, ctx: IDataContext, state: INodeState, module: IModule) {
            var exp = this.domManager.compileBindingOptions(value, module);
            var command: ICommand<any>;
            var commandParameter = undefined;

            if (typeof exp === "function") {
                var handler = this.domManager.evaluateExpression(exp, ctx);
                handler = unwrapProperty(handler);

                if (!isCommand(handler)) {
                    state.cleanup.add(obs.where(e => this.testCombinations(combinations, e)).subscribe(e => {
                        try {
                            handler.apply(ctx.$data, [ctx]);

                            e.preventDefault();
                        } catch(e) {
                            app.defaultExceptionHandler.onNext(e);
                        }
                    }));
                } else {
                    command = <ICommand<any>> <any> handler;

                    state.cleanup.add(obs.where(e => this.testCombinations(combinations, e)).subscribe(e => {
                        try {
                            command.execute(undefined);
    
                            e.preventDefault();
                        } catch(e) {
                            app.defaultExceptionHandler.onNext(e);
                        }
                    }));
                }
            } else if (typeof exp === "object") {
                command = <ICommand<any>> <any> this.domManager.evaluateExpression(exp.command, ctx);
                command = unwrapProperty(command);

                if (exp.hasOwnProperty("parameter"))
                    commandParameter = this.domManager.evaluateExpression(exp.parameter, ctx);

                state.cleanup.add(obs.where(e => this.testCombinations(combinations, e)).subscribe(e => {
                    try {
                        command.execute(commandParameter);
    
                        e.preventDefault();
                    } catch(e) {
                        app.defaultExceptionHandler.onNext(e);
                    }
                }));
            } else {
                internal.throwError("invalid binding options");
            }
        }
    }

    export module internal {
        export var keyPressBindingConstructor = <any> KeyPressBinding;
    }
}