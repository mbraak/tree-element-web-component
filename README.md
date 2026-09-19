# tree-element web component

The `<tree-element>` custom element: a web component around
[tree-element](https://github.com/mbraak/tree-element), the tree widget in
plain javascript.

```html
<tree-element drag-and-drop auto-open="0">
  <script type="application/json">
    [
      {
        "name": "Saurischia",
        "id": 1,
        "children": [
          { "name": "Herrerasaurians", "id": 2 },
          { "name": "Theropods", "id": 3 }
        ]
      }
    ]
  </script>
</tree-element>

<script type="module" src="tree_element_web_component.js"></script>
```

- Every option of tree-element is a property of the element, and most are
  attributes too
- Data comes from a `data` property, a `data-url` attribute, or json inside
  the element
- The methods of tree-element are methods of the element
- The events of tree-element (`tree.select`, `tree.move`, ...) are dispatched
  on the element
- The stylesheet is added to the page by the component, in a cascade layer,
  so your own css always wins
- Written in Typescript, ships with type declarations

## Install

```sh
npm install tree-element-web-component
```

```js
import "tree-element-web-component";
```

Importing the package registers the element. Or use the bundle, which
includes tree-element itself, with a script tag:

```html
<script type="module" src="tree_element_web_component.js"></script>
```

The bundle is a plain script, so a classic `<script src>` works as well.

## Data

There are three ways to give the tree its nodes. See the
[tree-element documentation](https://mbraak.github.io/tree-element/guide/data)
for the format of a node.

**The `data` property**

```js
const tree = document.querySelector("tree-element");
tree.data = [{ name: "node1", id: 1, children: [{ name: "child1", id: 2 }] }];
```

Setting `data` on an existing tree loads the new data into it.

**Json inside the element**

```html
<tree-element>
  <script type="application/json">
    [{ "name": "node1", "id": 1 }]
  </script>
</tree-element>
```

**A url**

```html
<tree-element data-url="/nodes/"></tree-element>
```

Or set the `dataUrl` property, which can also be a function, for
[loading on demand](https://mbraak.github.io/tree-element/guide/loading-on-demand):

```js
tree.dataUrl = (node) => (node ? `/nodes/?node=${node.id}` : "/nodes/");
```

## Attributes

Options with a simple value are attributes, in kebab-case. An attribute that
is not set leaves the option at tree-element's default.

| Attribute           | Option            | Value                                        |
| ------------------- | ----------------- | -------------------------------------------- |
| `animation-speed`   | `animationSpeed`  | `fast`, `slow` or milliseconds               |
| `auto-escape`       | `autoEscape`      | boolean                                      |
| `auto-open`         | `autoOpen`        | boolean or a number of levels                |
| `button-left`       | `buttonLeft`      | boolean                                      |
| `class-prefix`      | `classPrefix`     | string                                       |
| `closed-icon`       | `closedIcon`      | html string                                  |
| `common-class-name` | `commonClassName` | string                                       |
| `data-url`          | `dataUrl`         | url                                          |
| `drag-and-drop`     | `dragAndDrop`     | boolean                                      |
| `keyboard-support`  | `keyboardSupport` | boolean                                      |
| `open-folder-delay` | `openFolderDelay` | milliseconds, or `false`                     |
| `opened-icon`       | `openedIcon`      | html string                                  |
| `rtl`               | `rtl`             | boolean (`data-rtl` works too)               |
| `save-state`        | `saveState`       | boolean, or the storage key                  |
| `selectable`        | `selectable`      | boolean                                      |
| `show-empty-folder` | `showEmptyFolder` | boolean                                      |
| `slide`             | `slide`           | boolean                                      |
| `start-dnd-delay`   | `startDndDelay`   | milliseconds                                 |
| `tab-index`         | `tabIndex`        | number                                       |
| `tree-class-name`   | `treeClassName`   | string                                       |
| `use-context-menu`  | `useContextMenu`  | boolean                                      |
| `unstyled`          |                   | Do not add the stylesheet to the page        |

A boolean attribute is true when it is present: `<tree-element drag-and-drop>`.
Options that default to true are switched off with the value `false`:
`<tree-element selectable="false">`.

Changing an attribute after the tree is created applies the new value. See
[Changing options later](#changing-options-later).

## Properties

Every option of tree-element is a property of the element, with the same name
as the option. That includes the callbacks and the options that have no
attribute:

```js
tree.dragAndDrop = true;
tree.onCanMoveTo = (node, target, position) => position !== "inside";
tree.dataFilter = (response) => response.nodes;
```

`options` gets or sets all options at once. Setting it merges the given
options into the current ones:

```js
tree.options = { autoOpen: true, saveState: "my-tree" };
```

`tree` is the underlying `TreeElement` instance. It is `null` before the
element is connected to the document, and after it is removed from it.

`tabIndex` is the one option that is not a property, because `HTMLElement`
already has one. Use the `tab-index` attribute or `options` instead.

### Changing options later

tree-element reads most options when the tree is created. So when an option
changes, the element creates the tree again with the current nodes, and keeps
the open and selected nodes. This means `tree.init` is dispatched again.
Changing `data` is the exception: the data is loaded into the existing tree.

## Methods

The [methods of tree-element](https://mbraak.github.io/tree-element/reference/methods)
are available on the element:

```js
const node = tree.getNodeById(1);
tree.selectNode(node);
tree.appendNode({ name: "new child" }, node);
await tree.openNode(node);
```

The tree is created right after the element is connected to the document, in
a microtask. Calling a method before that throws. When the element is in the
html, the tree exists by the time a module script runs:

```html
<tree-element id="tree">...</tree-element>

<script type="module">
  import "tree-element-web-component";

  const tree = document.getElementById("tree");
  tree.addEventListener("tree.init", () => {
    tree.selectNode(tree.getNodeById(1));
  });
</script>
```

With a `data-url`, the tree is ready when `tree.init` is dispatched, like
with tree-element itself.

`deinit` and `setOption` are not forwarded: the element removes the tree when
it leaves the document, and options are properties.

## Events

The [events of tree-element](https://mbraak.github.io/tree-element/reference/events)
are dispatched on the element, and they bubble:

```js
tree.addEventListener("tree.select", (e) => {
  console.log(e.detail.node.name);
});
```

## Styling

The component adds tree-element's stylesheet to the document, or to the
shadow root it is in, once. The css is in a cascade layer named
`tree-element`, so any css of your own overrides it, whatever its specificity
or order:

```css
ul.tree-element li.tree-element-selected > .tree-element-element {
  background: gold;
}
```

Add the `unstyled` attribute to bring your own stylesheet instead.

The tree is rendered in the light dom, not in a shadow root. tree-element's
keyboard handling, drag and drop and stylesheet rely on that.

## Lifecycle

- The tree is created when the element is connected to the document.
- Moving the element within the document keeps the tree.
- Removing the element from the document destroys the tree. Adding it again
  creates a new tree from the attributes and properties. With `saveState`,
  the open and selected nodes come back.

## Typescript

```ts
import type { TreeElementComponent, Node } from "tree-element-web-component";

const tree = document.querySelector("tree-element")!; // TreeElementComponent
const node: Node | null = tree.getNodeById(1);
```

The types of tree-element (`Node`, `NodeData`, `TreeElementOptions`,
`TreeEvent`, ...) are re-exported.

## Development

```sh
pnpm install
pnpm devserver     # http://localhost:8081
pnpm build         # lib/ and the bundle
pnpm run ci        # lint, typecheck, test and build
```

`src/styles.ts` is generated from tree-element's stylesheet by the build and
by the test and typecheck scripts.

## License

Apache-2.0. See [LICENSE](LICENSE).
