import styles from "./styles";

const styledRoots = new WeakSet<Document | ShadowRoot>();

/**
 * Adds tree-element's stylesheet to the document, or to the shadow root, the
 * element lives in. It is added once per root, in a cascade layer named
 * `tree-element`, so any stylesheet of the page itself takes precedence over
 * it regardless of order and specificity.
 */
export const injectStyles = (element: Element): void => {
  const root = element.getRootNode();

  if (!(root instanceof Document || root instanceof ShadowRoot)) {
    return;
  }

  if (styledRoots.has(root)) {
    return;
  }

  styledRoots.add(root);

  const style = element.ownerDocument.createElement("style");
  style.dataset.treeElementStyles = "";
  style.textContent = `@layer tree-element {\n${styles}\n}`;

  const parent = root instanceof Document ? root.head : root;
  parent.prepend(style);
};
