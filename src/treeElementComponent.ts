import type { NodeData, TreeElementOptions } from "tree-element";

import TreeElement from "tree-element";

import type { ComponentOptions } from "./optionNames";

import { attributeMappings, observedAttributes } from "./attributes";
import { injectStyles } from "./injectStyles";
import { optionNames } from "./optionNames";
import { getTreeData } from "./treeData";

type OptionName = keyof TreeElementOptions;

/**
 * The methods of `TreeElement` that the element forwards to the tree. `deinit`
 * is left out because the element manages the lifetime of the tree, and
 * `setOption` because the options are properties of the element.
 */
const delegatedMethodNames = [
  "addNodeAfter",
  "addNodeBefore",
  "addParentNode",
  "addToSelection",
  "appendNode",
  "closeNode",
  "getNode",
  "getNodeByCallback",
  "getNodeById",
  "getNodeByName",
  "getNodeByNameMustExist",
  "getNodesByProperty",
  "getSelectedNode",
  "getSelectedNodes",
  "getState",
  "getStateFromStorage",
  "getTree",
  "getVersion",
  "isDragging",
  "isNodeSelected",
  "loadData",
  "loadDataFromUrl",
  "moveDown",
  "moveNode",
  "moveUp",
  "openNode",
  "prependNode",
  "refresh",
  "refreshHitAreas",
  "removeFromSelection",
  "removeNode",
  "scrollToNode",
  "selectNode",
  "setState",
  "toggle",
  "toJson",
  "updateNode",
] as const satisfies readonly (keyof TreeElement)[];

// The options and the delegated methods are put on the prototype in the
// static block below. This interface, merged with the class, gives them types.
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface TreeElementComponent
  extends ComponentOptions, Pick<TreeElement, DelegatedMethodName> {}

type DelegatedMethodName = (typeof delegatedMethodNames)[number];

/**
 * The `<tree-element>` custom element. It renders a tree-element tree inside
 * itself, in the light dom, so the tree's stylesheet, events and keyboard
 * handling work as they do for a plain element.
 *
 * - Every option of tree-element is a property of the element, and most are
 *   also attributes (`drag-and-drop`, `auto-open`, ...).
 * - The data comes from the `data` property, a `data-url` attribute, or a
 *   `<script type="application/json">` child.
 * - The methods of `TreeElement` are available on the element, and the
 *   `TreeElement` instance itself as the `tree` property.
 * - The events (`tree.select`, ...) are dispatched on the element and bubble.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class TreeElementComponent extends HTMLElement {
  static readonly observedAttributes = observedAttributes;

  static {
    for (const name of optionNames) {
      Object.defineProperty(this.prototype, name, {
        configurable: true,
        enumerable: true,
        get(this: TreeElementComponent) {
          return this.#options[name];
        },
        set(this: TreeElementComponent, value: unknown) {
          this.#storeOption(name, value);
          this.#optionsChanged([name]);
        },
      });
    }

    for (const name of delegatedMethodNames) {
      Object.defineProperty(this.prototype, name, {
        configurable: true,
        value(this: TreeElementComponent, ...args: unknown[]) {
          const tree = this.#requireTree();
          // eslint-disable-next-line @typescript-eslint/unbound-method -- it is applied to the tree below
          const method = tree[name] as (...args: unknown[]) => unknown;
          return method.apply(tree, args);
        },
        writable: true,
      });
    }
  }
  /**
   * All options at once. Setting it merges the given options into the
   * current ones and applies them.
   */
  get options(): Partial<TreeElementOptions> {
    return { ...this.#options };
  }

  set options(options: Partial<TreeElementOptions>) {
    const names = Object.keys(options) as OptionName[];

    for (const name of names) {
      this.#storeOption(name, options[name]);
    }

    this.#optionsChanged(names);
  }

  /**
   * The `TreeElement` instance, or `null` before the element is connected to
   * the document and after it is removed.
   */
  get tree(): null | TreeElement {
    return this.#tree;
  }

  #options: Partial<TreeElementOptions> = {};

  #tree: null | TreeElement = null;

  attributeChangedCallback(
    name: string,
    oldValue: null | string,
    newValue: null | string,
  ): void {
    if (oldValue === newValue) {
      return;
    }

    const mapping = attributeMappings[name];

    if (!mapping) {
      return;
    }

    const value = newValue === null ? undefined : mapping.parse(newValue, name);

    this.#storeOption(mapping.option, value);
    this.#optionsChanged([mapping.option]);
  }

  connectedCallback(): void {
    this.#upgradeProperties();

    if (this.#tree) {
      // The element was moved within the document.
      return;
    }

    if (this.ownerDocument.readyState === "loading") {
      // The parser has not reached the children yet, and the data may be in
      // a child script element.
      this.ownerDocument.addEventListener(
        "DOMContentLoaded",
        () => {
          this.#initIfConnected();
        },
        { once: true },
      );
    } else {
      // Wait a tick, so a script can add event listeners — for tree.init in
      // particular — after it inserts the element or imports this module.
      queueMicrotask(() => {
        this.#initIfConnected();
      });
    }
  }

  disconnectedCallback(): void {
    // Wait a tick: an element that is moved is disconnected and connected
    // again synchronously, and its tree can stay.
    queueMicrotask(() => {
      if (!this.isConnected && this.#tree) {
        this.#tree.deinit();
        this.#tree = null;
      }
    });
  }

  #createTree(options: Partial<TreeElementOptions>): TreeElement {
    const tree = new TreeElement({ htmlElement: this, ...options });
    this.#tree = tree;
    return tree;
  }

  #init(): void {
    if (this.#options.data === undefined) {
      const inlineData = this.#readInlineData();

      if (inlineData) {
        this.#options.data = inlineData;
      }
    }

    if (!this.hasAttribute("unstyled")) {
      injectStyles(this);
    }

    this.#createTree(this.#options);
  }

  #initIfConnected(): void {
    if (this.isConnected && !this.#tree) {
      this.#init();
    }
  }

  #optionsChanged(names: OptionName[]): void {
    const tree = this.#tree;

    if (!tree || names.length === 0) {
      return;
    }

    const changesData = names.includes("data") || names.includes("dataUrl");

    if (
      changesData &&
      names.every((name) => name === "data") &&
      this.#options.data
    ) {
      // Only the data changed: load it without recreating the tree.
      tree.loadData(this.#options.data);
    } else {
      this.#rebuild(!changesData);
    }
  }

  #readInlineData(): NodeData[] | null {
    const script = this.querySelector(
      ":scope > script[type='application/json']",
    );

    if (!script) {
      return null;
    }

    try {
      const data: unknown = JSON.parse(script.textContent);

      if (!Array.isArray(data)) {
        throw new TypeError("the json must be an array of nodes");
      }

      return data as NodeData[];
    } catch (error) {
      console.error("tree-element: could not read the json data", error);
      return null;
    }
  }

  /**
   * Recreates the tree with the current options, because most options are
   * read only when the tree is created. With `keepData`, the current nodes
   * and the open and selected nodes are carried over.
   */
  #rebuild(keepData: boolean): void {
    const oldTree = this.#tree;

    if (!oldTree) {
      return;
    }

    const state = keepData ? oldTree.getState() : null;
    const data = keepData ? getTreeData(oldTree.getTree()) : null;

    oldTree.deinit();
    this.#tree = null;

    const tree = this.#createTree(
      data ? { ...this.#options, data } : this.#options,
    );

    if (state) {
      tree.setState(state);
    }
  }

  #requireTree(): TreeElement {
    if (!this.#tree) {
      throw new Error(
        "tree-element: the tree does not exist yet. It is created right after the element is connected to the document; wait for the tree.init event.",
      );
    }

    return this.#tree;
  }

  #storeOption(name: OptionName, value: unknown): void {
    const options = this.#options as Record<string, unknown>;

    if (value === undefined) {
      Reflect.deleteProperty(options, name);
    } else {
      options[name] = value;
    }
  }

  /**
   * A property that was set before the element was upgraded is an own
   * property that shadows the accessor. Set it again through the accessor.
   */
  #upgradeProperties(): void {
    const instance = this as unknown as Record<string, unknown>;

    for (const name of [...optionNames, "options"]) {
      if (Object.hasOwn(this, name)) {
        const value = instance[name];
        Reflect.deleteProperty(instance, name);
        instance[name] = value;
      }
    }
  }
}
