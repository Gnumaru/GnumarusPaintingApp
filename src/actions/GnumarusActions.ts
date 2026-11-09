/**
 * Named application actions with context prerequisites and a similarity
 * search for the quick action palette. Pure data and string matching (no
 * DOM or WebGL) so everything stays unit-testable; the shell owns the
 * registry and binds each action's run callback to its methods.
 */

/** Snapshot of the UI state an action's prerequisites are checked against. */
export interface GnumarusActionContext {
  /** Active tool id (e.g. "pencil", "rectselect"). */
  tool: string;
  /** True while a floating selection cut is in progress. */
  hasFloatingSelection: boolean;
}

/** One prerequisite; `describe` names it for the failure message. */
export interface GnumarusActionRequirement {
  satisfiedBy(context: GnumarusActionContext): boolean;
  describe(): string;
}

/** Requires a specific tool to be selected. */
export function requireTool(toolId: string, toolLabel: string): GnumarusActionRequirement {
  return {
    satisfiedBy: (context): boolean => context.tool === toolId,
    describe: (): string => `the ${toolLabel} tool selected`,
  };
}

/** Requires an in-progress floating selection. */
export function requireFloatingSelection(): GnumarusActionRequirement {
  return {
    satisfiedBy: (context): boolean => context.hasFloatingSelection,
    describe: (): string => "an active floating selection",
  };
}

export interface GnumarusAction {
  /** Stable id used to run the action (e.g. "reset-canvas-transform"). */
  id: string;
  /** Display name shown in the palette (e.g. "Reset Canvas Transform"). */
  name: string;
  /** Prerequisites; empty means the action always runs. */
  requirements: GnumarusActionRequirement[];
  /** The work itself, bound by the shell. */
  run(): void;
}

export type GnumarusActionResult = { ok: true } | { ok: false; reasons: string[] };

export class GnumarusActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GnumarusActionError";
  }
}

export class GnumarusActionRegistry {
  private readonly byId = new Map<string, GnumarusAction>();

  register(action: GnumarusAction): void {
    if (typeof action.id !== "string" || action.id.trim() === "") {
      throw new GnumarusActionError("Actions need a non-empty id.");
    }
    if (typeof action.name !== "string" || action.name.trim() === "") {
      throw new GnumarusActionError("Actions need a non-empty name.");
    }
    if (typeof action.run !== "function" || !Array.isArray(action.requirements)) {
      throw new GnumarusActionError(`Action "${action.id}" needs requirements and a run callback.`);
    }
    if (this.byId.has(action.id)) {
      throw new GnumarusActionError(`Duplicate action id "${action.id}".`);
    }
    this.byId.set(action.id, action);
  }

  get(id: string): GnumarusAction | undefined {
    return this.byId.get(id);
  }

  /** All registered actions, alphabetically by name. */
  actions(): GnumarusAction[] {
    return [...this.byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Descriptions of the prerequisites the context does not satisfy. */
  check(action: GnumarusAction, context: GnumarusActionContext): string[] {
    const reasons: string[] = [];
    for (const requirement of action.requirements) {
      if (!requirement.satisfiedBy(context)) {
        reasons.push(requirement.describe());
      }
    }
    return reasons;
  }

  /**
   * Run an action by id when its prerequisites hold. Unknown ids and
   * unmet prerequisites fail without running anything.
   */
  execute(id: string, context: GnumarusActionContext): GnumarusActionResult {
    const action = this.byId.get(id);
    if (action === undefined) {
      return { ok: false, reasons: [`unknown action "${id}"`] };
    }
    const reasons = this.check(action, context);
    if (reasons.length > 0) {
      return { ok: false, reasons };
    }
    action.run();
    return { ok: true };
  }
}

/** User-facing failure line, e.g. `Cannot run "X": requires a and b.` */
export function actionBlockedMessage(actionName: string, reasons: string[]): string {
  return `Cannot run "${actionName}": requires ${reasons.join(" and ")}.`;
}

function isWordStart(name: string, index: number): boolean {
  return index === 0 || name[index - 1] === " " || name[index - 1] === "-" || name[index - 1] === "_";
}

function similarityScore(query: string, name: string): number {
  const q = query.toLowerCase();
  const n = name.toLowerCase();
  if (q === n) {
    return 100;
  }
  if (n.startsWith(q)) {
    return 50;
  }
  const at = n.indexOf(q);
  if (at >= 0) {
    return 30 - at / n.length;
  }
  // Ordered-subsequence fallback anchored at a word start, so "rct"
  // finds "Reset Canvas Transform" but "res" skips "Merge floating…".
  let qi = -1;
  for (let i = 0; i < n.length && qi < 0; i += 1) {
    if (n[i] === q[0] && isWordStart(n, i)) {
      qi = i;
    }
  }
  if (qi < 0) {
    return 0;
  }
  let gaps = 0;
  let pos = qi + 1;
  for (let k = 1; k < q.length; k += 1) {
    const found = n.indexOf(q[k] as string, pos);
    if (found < 0) {
      return 0;
    }
    gaps += found - pos;
    pos = found + 1;
  }
  return Math.max(1, 10 - gaps);
}

/**
 * Rank actions by similarity between the query and the action name.
 * An empty query lists everything alphabetically; non-matching actions
 * are dropped. Ties break alphabetically so the order is stable.
 */
export function searchActions(actions: readonly GnumarusAction[], query: string): GnumarusAction[] {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [...actions].sort((a, b) => a.name.localeCompare(b.name));
  }
  return actions
    .map((action) => ({ action, score: similarityScore(trimmed, action.name) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.action.name.localeCompare(b.action.name))
    .map((entry) => entry.action);
}
