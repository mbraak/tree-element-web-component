import styles from "./styles";

// A custom element is display: inline by default. tree-element measures the
// element's clientWidth and clientHeight to find the drop targets during drag
// and drop, and those are 0 for an inline element, so the element must be a
// block. The rule is in a cascade layer, so any css of the page overrides it.
const hostStyles = "tree-element {\n  display: block;\n}";

const layer = (css: string): string => `@layer tree-element {\n${css}\n}`;

const injectedRoots = {
  host: new WeakSet<Document | ShadowRoot>(),
  tree: new WeakSet<Document | ShadowRoot>(),
};

const getRoot = (element: Element): Document | null | ShadowRoot => {
  const root = element.getRootNode();

  return root instanceof Document || root instanceof ShadowRoot ? root : null;
};

const prependStyle = (
  element: Element,
  root: Document | ShadowRoot,
  attribute: string,
  css: string,
): void => {
  const style = element.ownerDocument.createElement("style");
  style.setAttribute(attribute, "");
  style.textContent = css;

  const parent = root instanceof Document ? root.head : root;
  parent.prepend(style);
};

/**
 * Adds the display rule for the element itself to the document, or to the
 * shadow root, the element lives in. It is added once per root.
 */
export const injectHostStyles = (element: Element): void => {
  const root = getRoot(element);

  if (!root || injectedRoots.host.has(root)) {
    return;
  }

  injectedRoots.host.add(root);
  prependStyle(
    element,
    root,
    "data-tree-element-host-styles",
    layer(hostStyles),
  );
};

/**
 * Adds tree-element's stylesheet to the document, or to the shadow root, the
 * element lives in. It is added once per root, in a cascade layer named
 * `tree-element`, so any stylesheet of the page itself takes precedence over
 * it regardless of order and specificity.
 */
export const injectStyles = (element: Element): void => {
  const root = getRoot(element);

  if (!root || injectedRoots.tree.has(root)) {
    return;
  }

  injectedRoots.tree.add(root);
  prependStyle(element, root, "data-tree-element-styles", layer(styles));
};
