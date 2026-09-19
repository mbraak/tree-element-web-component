import type { TreeElementOptions } from "tree-element";

/**
 * The options that are also properties of the element. `tabIndex` is left
 * out because `HTMLElement` already has a `tabIndex` property; set it through
 * the `tab-index` attribute or the `options` property instead.
 */
export type ComponentOptionName = Exclude<keyof TreeElementOptions, "tabIndex">;

export type ComponentOptions = Partial<Omit<TreeElementOptions, "tabIndex">>;

// A record instead of an array, so typescript complains when an option is
// missing or misspelled.
const optionNameRecord: Record<ComponentOptionName, true> = {
  animationSpeed: true,
  autoEscape: true,
  autoOpen: true,
  buttonLeft: true,
  classPrefix: true,
  closedIcon: true,
  commonClassName: true,
  data: true,
  dataFilter: true,
  dataUrl: true,
  dragAndDrop: true,
  keyboardSupport: true,
  nodeClass: true,
  onCanMove: true,
  onCanMoveTo: true,
  onCanSelectNode: true,
  onCreateLi: true,
  onDragMove: true,
  onDragStop: true,
  onGetStateFromStorage: true,
  onIsMoveHandle: true,
  onSetStateFromStorage: true,
  openedIcon: true,
  openFolderDelay: true,
  rtl: true,
  saveState: true,
  selectable: true,
  showEmptyFolder: true,
  slide: true,
  startDndDelay: true,
  treeClassName: true,
  useContextMenu: true,
};

export const optionNames = Object.keys(
  optionNameRecord,
) as ComponentOptionName[];
