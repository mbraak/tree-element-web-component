import type { TreeElementOptions } from "tree-element";

export interface AttributeMapping {
  option: OptionName;
  parse: (value: string, attributeName: string) => unknown;
}

type OptionName = keyof TreeElementOptions;

// A boolean attribute is true when it is present, unless its value is "false".
// That way options that default to true can be switched off: selectable="false".
const parseBoolean = (value: string): boolean => value.trim() !== "false";

const parseNumber = (
  value: string,
  attributeName: string,
): number | undefined => {
  const trimmed = value.trim();
  const number = Number(trimmed);

  if (trimmed === "" || Number.isNaN(number)) {
    console.warn(
      `tree-element: ignoring attribute ${attributeName}="${value}"; it must be a number`,
    );
    return undefined;
  }

  return number;
};

const isNumeric = (value: string): boolean =>
  value.trim() !== "" && !Number.isNaN(Number(value));

const parseString = (value: string): string => value;

const parseAutoOpen = (value: string): boolean | number =>
  isNumeric(value) ? Number(value) : parseBoolean(value);

const parseSaveState = (value: string): boolean | string => {
  const trimmed = value.trim();

  if (trimmed === "" || trimmed === "true") {
    return true;
  } else if (trimmed === "false") {
    return false;
  } else {
    return trimmed;
  }
};

const parseOpenFolderDelay = (
  value: string,
  attributeName: string,
): false | number | undefined =>
  value.trim() === "false" ? false : parseNumber(value, attributeName);

const parseAnimationSpeed = (
  value: string,
  attributeName: string,
): number | string | undefined => {
  const trimmed = value.trim();

  if (trimmed === "fast" || trimmed === "slow") {
    return trimmed;
  } else {
    return parseNumber(value, attributeName);
  }
};

const boolean = (option: OptionName): AttributeMapping => ({
  option,
  parse: parseBoolean,
});

const number = (option: OptionName): AttributeMapping => ({
  option,
  parse: parseNumber,
});

const string = (option: OptionName): AttributeMapping => ({
  option,
  parse: parseString,
});

/** The attributes of the element, and the option each of them sets. */
export const attributeMappings: Record<string, AttributeMapping> = {
  "animation-speed": { option: "animationSpeed", parse: parseAnimationSpeed },
  "auto-escape": boolean("autoEscape"),
  "auto-open": { option: "autoOpen", parse: parseAutoOpen },
  "button-left": boolean("buttonLeft"),
  "class-prefix": string("classPrefix"),
  "closed-icon": string("closedIcon"),
  "common-class-name": string("commonClassName"),
  // tree-element reads data-url and data-rtl itself; they are mapped here so
  // that changing them later is picked up too.
  "data-rtl": boolean("rtl"),
  "data-url": string("dataUrl"),
  "drag-and-drop": boolean("dragAndDrop"),
  "keyboard-support": boolean("keyboardSupport"),
  "open-folder-delay": {
    option: "openFolderDelay",
    parse: parseOpenFolderDelay,
  },
  "opened-icon": string("openedIcon"),
  rtl: boolean("rtl"),
  "save-state": { option: "saveState", parse: parseSaveState },
  selectable: boolean("selectable"),
  "show-empty-folder": boolean("showEmptyFolder"),
  slide: boolean("slide"),
  "start-dnd-delay": number("startDndDelay"),
  "tab-index": number("tabIndex"),
  "tree-class-name": string("treeClassName"),
  "use-context-menu": boolean("useContextMenu"),
};

export const observedAttributes = Object.keys(attributeMappings);
