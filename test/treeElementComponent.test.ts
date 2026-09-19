import type { Node, TreeEvent } from "tree-element";

import { fireEvent, screen } from "@testing-library/dom";

import type { TreeElementComponent } from "../src/index";

import "../src/index";

const exampleData = [
  {
    children: [
      { id: 2, name: "child1" },
      { id: 3, name: "child2" },
    ],
    id: 1,
    name: "node1",
  },
  { id: 4, name: "node2" },
];

// The tree is created in a microtask after the element is connected.
const nextTick = () =>
  new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });

const createElement = async (
  html = "<tree-element></tree-element>",
  setup?: (element: TreeElementComponent) => void,
): Promise<TreeElementComponent> => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();

  const element = template.content.firstElementChild as TreeElementComponent;
  setup?.(element);
  document.body.append(element);

  await nextTick();
  return element;
};

const getTitles = (element: HTMLElement): string[] =>
  [...element.querySelectorAll(".tree-element-title")].map(
    (title) => title.textContent,
  );

const getLi = (name: string): HTMLElement =>
  screen.getByText(name).closest("li") as HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("registration", () => {
  it("defines the tree-element element", () => {
    expect(customElements.get("tree-element")).toBeDefined();
  });
});

describe("data", () => {
  it("renders the data property", async () => {
    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });

    expect(getTitles(element)).toEqual(["node1", "node2"]);
    expect(element.tree).not.toBeNull();
  });

  it("renders json from a child script element", async () => {
    const element = await createElement(`
      <tree-element>
        <script type="application/json">${JSON.stringify(exampleData)}</script>
      </tree-element>
    `);

    expect(getTitles(element)).toEqual(["node1", "node2"]);
    expect(element.querySelector("script")).toBeNull();
    expect(element.data).toEqual(exampleData);
  });

  it("logs an error and renders an empty tree for invalid json", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const element = await createElement(`
      <tree-element>
        <script type="application/json">not json</script>
      </tree-element>
    `);

    expect(consoleError).toHaveBeenCalledOnce();
    expect(getTitles(element)).toEqual([]);
  });

  it("loads the data from the data-url attribute", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(exampleData));

    const element = await createElement(
      `<tree-element data-url="/nodes/"></tree-element>`,
    );

    await new Promise<void>((resolve) => {
      element.addEventListener("tree.init", () => {
        resolve();
      });
    });

    // tree-element adds a cache busting parameter.
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/^\/nodes\/\?_=\d+$/);
    expect(getTitles(element)).toEqual(["node1", "node2"]);
  });

  it("reloads when the data property changes", async () => {
    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });
    const tree = element.tree;

    element.data = [{ name: "other" }];

    expect(getTitles(element)).toEqual(["other"]);
    // Only the data changed, so the tree is reused.
    expect(element.tree).toBe(tree);
  });

  it("honours a property that was set before the element was upgraded", async () => {
    // Simulate an element that got a property before the definition loaded:
    // the value is an own property that shadows the accessor.
    const treeElement = document.createElement("tree-element");
    Object.defineProperty(treeElement, "data", {
      configurable: true,
      enumerable: true,
      value: exampleData,
      writable: true,
    });
    expect(Object.hasOwn(treeElement, "data")).toBe(true);

    document.body.append(treeElement);
    await nextTick();

    expect(Object.hasOwn(treeElement, "data")).toBe(false);
    expect(getTitles(treeElement)).toEqual(["node1", "node2"]);
  });
});

describe("attributes", () => {
  it("parses boolean and numeric attributes", async () => {
    const element = await createElement(
      `<tree-element drag-and-drop auto-open="0" selectable="false" start-dnd-delay="100" open-folder-delay="false" animation-speed="slow" save-state="my-key"></tree-element>`,
      (el) => {
        el.data = exampleData;
      },
    );

    expect(element.dragAndDrop).toBe(true);
    expect(element.autoOpen).toBe(0);
    expect(element.selectable).toBe(false);
    expect(element.startDndDelay).toBe(100);
    expect(element.openFolderDelay).toBe(false);
    expect(element.animationSpeed).toBe("slow");
    expect(element.saveState).toBe("my-key");

    // The first level is open and drag and drop is on.
    expect(getLi("node1")).not.toHaveClass("tree-element-closed");
    expect(element.querySelector("ul.tree-element")).toHaveClass(
      "tree-element-dnd",
    );
  });

  it("warns about an attribute that is not a number", async () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const element = await createElement(
      `<tree-element start-dnd-delay="soon"></tree-element>`,
    );

    expect(consoleWarn).toHaveBeenCalledOnce();
    expect(element.startDndDelay).toBeUndefined();
  });

  it("maps tab-index to the tabIndex option", async () => {
    const element = await createElement(
      `<tree-element tab-index="3"></tree-element>`,
      (el) => {
        el.data = exampleData;
      },
    );

    expect(element.options.tabIndex).toBe(3);

    // The selected node's title is the focusable element.
    element.selectNode(element.getNodeByNameMustExist("node1"));
    expect(screen.getByText("node1")).toHaveAttribute("tabindex", "3");
  });

  it("recreates the tree when an attribute changes, keeping the nodes and the state", async () => {
    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });
    const tree = element.tree;

    element.appendNode(
      { name: "added" },
      element.getNodeByNameMustExist("node1"),
    );
    element.selectNode(element.getNodeByNameMustExist("child2"));
    expect(getLi("node1")).not.toHaveClass("tree-element-closed");

    element.setAttribute("drag-and-drop", "");

    expect(element.tree).not.toBe(tree);
    expect(element.querySelector("ul.tree-element")).toHaveClass(
      "tree-element-dnd",
    );
    expect(getTitles(element)).toEqual([
      "node1",
      "child1",
      "child2",
      "added",
      "node2",
    ]);
    expect(getLi("node1")).not.toHaveClass("tree-element-closed");
    expect(getLi("child2")).toHaveClass("tree-element-selected");
    expect(element.getSelectedNode()?.name).toBe("child2");
  });

  it("goes back to the default when an attribute is removed", async () => {
    const element = await createElement(
      `<tree-element drag-and-drop></tree-element>`,
      (el) => {
        el.data = exampleData;
      },
    );

    element.removeAttribute("drag-and-drop");

    expect(element.dragAndDrop).toBeUndefined();
    expect(element.querySelector("ul.tree-element")).not.toHaveClass(
      "tree-element-dnd",
    );
  });

  it("supports data-rtl like tree-element does", async () => {
    const element = await createElement(
      `<tree-element data-rtl></tree-element>`,
      (el) => {
        el.data = exampleData;
      },
    );

    expect(element.rtl).toBe(true);
    expect(element.querySelector("ul.tree-element")).toHaveClass(
      "tree-element-rtl",
    );
  });
});

describe("properties", () => {
  it("applies a callback option", async () => {
    const onCanSelectNode = vi.fn((node: Node) => node.name !== "node2");

    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
      el.onCanSelectNode = onCanSelectNode;
    });

    fireEvent.click(screen.getByText("node2"));
    expect(element.getSelectedNode()).toBeNull();

    fireEvent.click(screen.getByText("node1"));
    expect(element.getSelectedNode()?.name).toBe("node1");
    expect(onCanSelectNode).toHaveBeenCalled();
  });

  it("recreates the tree when a property changes", async () => {
    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });

    element.selectNode(element.getNodeByNameMustExist("node2"));
    element.autoOpen = true;

    expect(getLi("node1")).not.toHaveClass("tree-element-closed");
    expect(element.getSelectedNode()?.name).toBe("node2");
  });

  it("sets several options at once with the options property", async () => {
    const element = await createElement(undefined, (el) => {
      el.options = { data: exampleData, dragAndDrop: true };
    });

    expect(element.options).toEqual({ data: exampleData, dragAndDrop: true });

    element.options = { autoOpen: true, dragAndDrop: false };

    expect(element.options).toEqual({
      autoOpen: true,
      data: exampleData,
      dragAndDrop: false,
    });
    expect(getLi("node1")).not.toHaveClass("tree-element-closed");
    expect(element.querySelector("ul.tree-element")).not.toHaveClass(
      "tree-element-dnd",
    );
  });

  it("loads from the url when dataUrl is set later", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json([{ name: "from url" }]),
    );

    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });

    const initialized = new Promise<void>((resolve) => {
      element.addEventListener("tree.init", () => {
        resolve();
      });
    });

    // Inline data takes precedence over the url, so it is removed as well.
    element.options = { data: undefined, dataUrl: "/nodes/" };
    await initialized;

    expect(getTitles(element)).toEqual(["from url"]);
  });
});

describe("methods and events", () => {
  it("forwards the methods of TreeElement", async () => {
    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });

    expect(element.getNodeById(1)?.name).toBe("node1");

    const node = element.getNodeByNameMustExist("node1");
    await element.openNode(node, false);
    expect(getLi("node1")).not.toHaveClass("tree-element-closed");

    element.updateNode(node, "renamed");
    expect(getTitles(element)).toContain("renamed");

    expect(element.getVersion()).toBe(element.tree?.getVersion());
    expect(JSON.parse(element.toJson())).toHaveLength(2);
  });

  it("throws when a method is called before the tree exists", () => {
    const element = document.createElement("tree-element");

    expect(() => element.getSelectedNode()).toThrow(/tree.init/);
  });

  it("dispatches bubbling events on the element", async () => {
    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });

    const onSelect = vi.fn();
    document.addEventListener("tree.select", onSelect);

    fireEvent.click(screen.getByText("node2"));

    expect(onSelect).toHaveBeenCalledOnce();
    const event = onSelect.mock.calls[0]?.[0] as TreeEvent<"tree.select">;
    expect(event.detail.node.name).toBe("node2");
    expect(event.target).toBe(element);

    document.removeEventListener("tree.select", onSelect);
  });

  it("fires tree.init for a listener added right after the element is appended", async () => {
    const element = document.createElement("tree-element");
    element.data = exampleData;
    document.body.append(element);

    const onInit = vi.fn();
    element.addEventListener("tree.init", onInit);

    await nextTick();

    expect(onInit).toHaveBeenCalledOnce();
  });
});

describe("lifecycle", () => {
  it("destroys the tree when the element is removed and creates it again when it is added", async () => {
    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });

    element.remove();
    await nextTick();

    expect(element.tree).toBeNull();
    expect(element.innerHTML).toBe("");

    document.body.append(element);
    await nextTick();

    expect(element.tree).not.toBeNull();
    expect(getTitles(element)).toEqual(["node1", "node2"]);
  });

  it("keeps the tree when the element is moved", async () => {
    const element = await createElement(undefined, (el) => {
      el.data = exampleData;
    });
    const tree = element.tree;

    const container = document.createElement("div");
    document.body.append(container);
    container.append(element);
    await nextTick();

    expect(element.tree).toBe(tree);
    expect(getTitles(element)).toEqual(["node1", "node2"]);
  });

  it("does not create a tree when the element is removed before the microtask", async () => {
    const element = document.createElement("tree-element");
    document.body.append(element);
    element.remove();
    await nextTick();

    expect(element.tree).toBeNull();
  });
});

describe("styles", () => {
  it("adds the stylesheet to the document once, in a cascade layer", async () => {
    await createElement();
    await createElement();

    const styles = document.head.querySelectorAll(
      "style[data-tree-element-styles]",
    );

    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toMatch(/^@layer tree-element \{/);
    expect(styles[0]?.textContent).toContain("ul.tree-element");
  });

  it("makes the element a block, also when it is unstyled", async () => {
    // A fresh root, because the document already has the styles.
    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    document.body.append(host);

    for (let i = 0; i < 2; i++) {
      const element = document.createElement("tree-element");
      element.setAttribute("unstyled", "");
      shadowRoot.append(element);
    }
    await nextTick();

    const hostStyles = shadowRoot.querySelectorAll(
      "style[data-tree-element-host-styles]",
    );

    expect(hostStyles).toHaveLength(1);
    expect(hostStyles[0]?.textContent).toContain(
      "tree-element {\n  display: block;\n}",
    );
    expect(
      shadowRoot.querySelectorAll("style[data-tree-element-styles]"),
    ).toHaveLength(0);
  });

  it("adds the stylesheet to a shadow root", async () => {
    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    document.body.append(host);

    const element = document.createElement("tree-element");
    element.data = exampleData;
    shadowRoot.append(element);
    await nextTick();

    expect(
      shadowRoot.querySelectorAll("style[data-tree-element-styles]"),
    ).toHaveLength(1);
  });
});
