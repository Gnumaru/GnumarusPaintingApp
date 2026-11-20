/**
 * Focus helpers shared by keyboard-shortcut gates.
 *
 * The canvas element is not focusable, so after interacting with any panel
 * control the focus stays on that control — even while the user paints with
 * the mouse. A blanket "any input/select/textarea blocks shortcuts" check
 * then silently swallows Ctrl+Z whenever a slider, dropdown or spinner was
 * touched last. Non-text controls (sliders, checkboxes, dropdowns, buttons,
 * color wells, ...) have no native text undo, so document shortcuts such as
 * undo/redo must keep working while they are focused. Only genuine text
 * editing targets keep their native behavior.
 */

/** Input types with no text-undo semantics: focusing them must not block document shortcuts. */
const NON_TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  "button",
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "hidden",
  "image",
  "reset",
  "submit",
]);

/**
 * Pure, DOM-free decision: is an `<input>` of the given type a text-editing
 * target? Unknown/empty types fall back to `"text"` semantics (editable),
 * matching how browsers treat unrecognized input types.
 */
export function isTextInputType(type: string | null | undefined): boolean {
  return !NON_TEXT_INPUT_TYPES.has((type ?? "text").toLowerCase());
}

/**
 * Whether a DOM node is a genuine text-editing target (native undo/redo
 * applies to its contents). `<select>` is deliberately excluded: it has no
 * text undo, so document undo must win while it is focused. Total (returns
 * false) outside DOM environments so the logic stays unit-testable in Node.
 */
export function isTextEditingNode(node: unknown): boolean {
  if (typeof HTMLTextAreaElement !== "undefined" && node instanceof HTMLTextAreaElement) {
    return true;
  }
  if (
    typeof HTMLElement !== "undefined" &&
    node instanceof HTMLElement &&
    node.isContentEditable
  ) {
    return true;
  }
  if (typeof HTMLInputElement !== "undefined" && node instanceof HTMLInputElement) {
    return isTextInputType(node.type);
  }
  return false;
}

/**
 * Whether a keyboard event originates from inside a text-editing target.
 * Pierces shadow-DOM retargeting via `composedPath`, like the existing
 * `inField` checks in the engine and shell.
 */
export function eventInTextField(event: Event): boolean {
  if (typeof event.composedPath === "function") {
    for (const node of event.composedPath()) {
      if (isTextEditingNode(node)) {
        return true;
      }
    }
  }
  return isTextEditingNode(event.target);
}
