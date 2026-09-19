import { TreeElementComponent } from "./treeElementComponent";

export type { ComponentOptions as TreeElementComponentOptions } from "./optionNames";
export type {
  MoveInfo,
  Node,
  NodeData,
  NodeId,
  Position,
  SavedState,
  TreeElementOptions,
  TreeEvent,
  TreeEventName,
  TreeEvents,
} from "tree-element";
export { TreeElementComponent };

export const TAG_NAME = "tree-element";

declare global {
  interface HTMLElementTagNameMap {
    "tree-element": TreeElementComponent;
  }
}

if (typeof customElements !== "undefined" && !customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, TreeElementComponent);
}
