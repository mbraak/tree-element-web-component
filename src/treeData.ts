import type { Node, NodeData } from "tree-element";

type NodeRecord = Exclude<NodeData, string>;

const skippedKeys = new Set([
  "children",
  "element",
  "idMapping",
  "is_loading",
  "isEmptyFolder",
  "nodeClass",
  "parent",
  "tree",
]);

/**
 * Like `Node.getData`, but it keeps `load_on_demand` and empty folders, so the
 * data can be loaded into a new tree without losing anything.
 */
export const getTreeData = (root: Node): NodeRecord[] => {
  const getData = (nodes: Node[]): NodeRecord[] =>
    nodes.map((node) => {
      const record: NodeRecord = {};

      for (const key of Object.keys(node)) {
        if (!skippedKeys.has(key)) {
          record[key] = node[key];
        }
      }

      if (node.children.length > 0 || node.isEmptyFolder) {
        record.children = getData(node.children);
      }

      return record;
    });

  return getData(root.children);
};
