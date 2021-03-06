﻿///<reference path="../Interfaces.ts" />

module wx.internal {
    "use strict";

    /**
    * VirtualChildNodes implements consisent and predictable manipulation 
    * of a DOM Node's childNodes collection regardless its the true contents
    * @class
    **/
    export class VirtualChildNodes {
        constructor(targetNode: Node, initialSyncToTarget: boolean,
            insertCB?: (node: Node, callbackData: any) => void, removeCB?: (node: Node) => void) {
            this.targetNode = targetNode;
            this.insertCB = insertCB;
            this.removeCB = removeCB;

            if (initialSyncToTarget) {
                for (var i = 0; i < targetNode.childNodes.length; i++) {
                    this.childNodes.push(targetNode.childNodes[i]);
                }
            }
        }

        public appendChilds(nodes: Node[], callbackData?: any) {
            var length = nodes.length;
            var i;

            // append to proxy array
            if (nodes.length > 1)
                Array.prototype.push.apply(this.childNodes, nodes);
            else
                this.childNodes.push(nodes[0]);

            // append to DOM
            for (i = 0; i < length; i++) {
                this.targetNode.appendChild(nodes[i]);
            }

            // callback
            if (this.insertCB) {
                for (i = 0; i < length; i++) {
                    this.insertCB(nodes[i], callbackData);
                }
            }
        }

        public insertChilds(index: number, nodes: Node[], callbackData?: any) {
            if (index === this.childNodes.length) {
                this.appendChilds(nodes, callbackData);
            } else {
                var refNode = this.childNodes[index];
                var length = nodes.length;
                var i;

                // insert into proxy array
                Array.prototype.splice.apply(this.childNodes, [index, 0].concat(<any> nodes));

                // insert into DOM
                for (i = 0; i < length; i++) {
                    this.targetNode.insertBefore(nodes[i], refNode);
                }

                // callback
                if (this.insertCB) {
                    for (i = 0; i < length; i++) {
                        this.insertCB(nodes[i], callbackData);
                    }
                }
            }
        }

        public removeChilds(index: number, count: number, keepDom: boolean): Node[] {
            var node: Node;
            if (count === 0)
                return [];

            // extract removed nodes
            var nodes = this.childNodes.slice(index, index + count);

            // remove from proxy array
            this.childNodes.splice(index, count);

            if (!keepDom) {
                // remove from DOM
                var length = nodes.length;

                for (var i = 0; i < length; i++) {
                    node = nodes[i];

                    if (this.removeCB)
                        this.removeCB(node);

                    this.targetNode.removeChild(node);
                }
            }

            return nodes;
        }

        public clear(): void {
            // remove from DOM
            var length = this.childNodes.length;
            var node: Node;

            for (var i = 0; i < length; i++) {
                node = this.childNodes[i];

                if (this.removeCB)
                    this.removeCB(node);

                this.targetNode.removeChild(node);
            }

            // reset proxy array
            this.childNodes = [];
        }

        public targetNode: Node;
        public childNodes: Array<Node> = [];
        private insertCB: (node: Node, callbackData: any) => void;
        private removeCB: (node: Node) => void;
    }
}