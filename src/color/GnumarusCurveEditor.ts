import { LitElement, css, html } from "lit";
import {
  addCurveNode,
  curveValueAt,
  moveCurveHandle,
  moveCurveNode,
  nearestCurvePoint,
  normalizeColorCurve,
  removeCurveNode,
  type GnumarusColorCurve,
} from "./GnumarusColorCurves";

/**
 * Interactive tone-curve editor: a square with the input→output diagonal,
 * draggable nodes and Bézier handles, click-to-add on the curve and
 * right-click to delete nodes. Emits `gnumarus-curve-change` with
 * `{ nodes }` on every edit (parents re-render and re-preview).
 */
export class GnumarusCurveEditor extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }
    svg {
      display: block;
      background: #1e1e1e;
      border: 1px solid #111;
      border-radius: 4px;
      touch-action: none;
      user-select: none;
      cursor: crosshair;
    }
  `;

  static properties = {
    nodes: { type: Array },
  };

  declare nodes: GnumarusColorCurve;

  /** Active drag (absent while hovering). */
  private drag: { kind: "node"; index: number } | { kind: "handle"; index: number; which: 0 | 1 } | null =
    null;

  /** Square edge in CSS pixels (viewBox units match 1:1). */
  static readonly SIZE = 256;

  private toValue(event: PointerEvent): { x: number; y: number } {
    const svg = this.shadowRoot?.querySelector("svg");
    const rect = svg?.getBoundingClientRect() ?? new DOMRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width))),
      y: 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height))),
    };
  }

  private emit(nodes: GnumarusColorCurve): void {
    this.nodes = nodes;
    this.dispatchEvent(
      new CustomEvent("gnumarus-curve-change", { detail: { nodes }, bubbles: true, composed: true }),
    );
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.button !== 2) {
      return;
    }
    const nodes = normalizeColorCurve(this.nodes);
    const point = this.toValue(event);
    const size = GnumarusCurveEditor.SIZE;
    const hit = 10 / size;
    // Nearest grab target wins (ties go to the node): nodes are the
    // primary target when handles coincide with them (e.g. a fresh
    // endpoint whose handle sits exactly on the node).
    let bestNode = -1;
    let bestNodeDist = Number.POSITIVE_INFINITY;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (node === undefined) {
        continue;
      }
      const dist = Math.hypot(node.x - point.x, node.y - point.y);
      if (dist < bestNodeDist) {
        bestNodeDist = dist;
        bestNode = index;
      }
    }
    let bestHandle: { index: number; which: 0 | 1 } | null = null;
    let bestHandleDist = Number.POSITIVE_INFINITY;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (node === undefined) {
        continue;
      }
      for (const which of [0, 1] as const) {
        const hx = which === 0 ? node.hx0 : node.hx1;
        const hy = which === 0 ? node.hy0 : node.hy1;
        const dist = Math.hypot(hx - point.x, hy - point.y);
        if (dist < bestHandleDist) {
          bestHandleDist = dist;
          bestHandle = { index, which };
        }
      }
    }
    if (
      event.button === 0 &&
      bestHandle !== null &&
      bestHandleDist <= hit &&
      bestHandleDist < bestNodeDist - 1 / size
    ) {
      this.drag = { kind: "handle", index: bestHandle.index, which: bestHandle.which };
      (event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (event.button === 0 && bestNode >= 0 && bestNodeDist <= hit) {
      this.drag = { kind: "node", index: bestNode };
      (event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (event.button === 2) {
      return;
    }
    // Left-click near the curve adds a node on it.
    {
      const near = nearestCurvePoint(nodes, point.x, point.y);
      if (near.dist <= 14 / size) {
        const next = addCurveNode(nodes, near.x, curveValueAt(nodes, near.x));
        if (next !== nodes) {
          this.emit(next);
        }
        event.preventDefault();
      }
    }
  }

  private onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (drag === null) {
      return;
    }
    const point = this.toValue(event);
    const nodes = normalizeColorCurve(this.nodes);
    const next =
      drag.kind === "node"
        ? moveCurveNode(nodes, drag.index, point.x, point.y)
        : moveCurveHandle(nodes, drag.index, drag.which, point.x, point.y);
    if (next !== nodes) {
      this.emit(next);
    }
    event.preventDefault();
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.drag !== null) {
      this.drag = null;
      try {
        (event.currentTarget as Element | null)?.releasePointerCapture?.(event.pointerId);
      } catch {
        // Already released.
      }
    }
  }

  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    const nodes = normalizeColorCurve(this.nodes);
    const point = this.toValue(event as unknown as PointerEvent);
    const hit = 10 / GnumarusCurveEditor.SIZE;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (node !== undefined && Math.hypot(node.x - point.x, node.y - point.y) <= hit) {
        const next = removeCurveNode(nodes, index);
        if (next !== nodes) {
          this.emit(next);
        }
        return;
      }
    }
  }

  private pathFor(nodes: GnumarusColorCurve): string {
    const size = GnumarusCurveEditor.SIZE;
    const parts: string[] = [];
    for (let i = 0; i <= 128; i += 1) {
      const x = i / 128;
      const y = curveValueAt(nodes, x);
      parts.push(`${i === 0 ? "M" : "L"}${(x * size).toFixed(1)},${((1 - y) * size).toFixed(1)}`);
    }
    return parts.join(" ");
  }

  protected render(): unknown {
    const nodes = normalizeColorCurve(this.nodes);
    const size = GnumarusCurveEditor.SIZE;
    const toX = (x: number): number => x * size;
    const toY = (y: number): number => (1 - y) * size;
    const grid: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 1; i < 4; i += 1) {
      const at = (i / 4) * size;
      grid.push({ x1: at, y1: 0, x2: at, y2: size });
      grid.push({ x1: 0, y1: at, x2: size, y2: at });
    }
    return html`
      <svg
        width=${size}
        height=${size}
        viewBox="0 0 ${size} ${size}"
        data-testid="curve-editor"
        @pointerdown=${(event: PointerEvent): void => this.onPointerDown(event)}
        @pointermove=${(event: PointerEvent): void => this.onPointerMove(event)}
        @pointerup=${(event: PointerEvent): void => this.onPointerUp(event)}
        @pointercancel=${(event: PointerEvent): void => this.onPointerUp(event)}
        @contextmenu=${(event: MouseEvent): void => this.onContextMenu(event)}
      >
        ${grid.map(
          (line) =>
            html`<line
              x1=${line.x1}
              y1=${line.y1}
              x2=${line.x2}
              y2=${line.y2}
              stroke="#3a3d41"
              stroke-width="1"
            />`,
        )}
        <line x1="0" y1=${size} x2=${size} y2="0" stroke="#555" stroke-width="1" stroke-dasharray="5 4" />
        <path d=${this.pathFor(nodes)} fill="none" stroke="#ffffff" stroke-width="2" data-testid="curve-path" />
        ${nodes.flatMap((node, index) => [
          html`<line
            x1=${toX(node.x)}
            y1=${toY(node.y)}
            x2=${toX(node.hx0)}
            y2=${toY(node.hy0)}
            stroke="#0e639c"
            stroke-width="1"
          />`,
          html`<line
            x1=${toX(node.x)}
            y1=${toY(node.y)}
            x2=${toX(node.hx1)}
            y2=${toY(node.hy1)}
            stroke="#0e639c"
            stroke-width="1"
          />`,
          html`<rect
            x=${toX(node.hx0) - 4}
            y=${toY(node.hy0) - 4}
            width="8"
            height="8"
            fill="#0e639c"
            stroke="#ffffff"
            stroke-width="1"
            data-testid="curve-handle"
            data-index=${index}
            data-which="0"
          />`,
          html`<rect
            x=${toX(node.hx1) - 4}
            y=${toY(node.hy1) - 4}
            width="8"
            height="8"
            fill="#0e639c"
            stroke="#ffffff"
            stroke-width="1"
            data-testid="curve-handle"
            data-index=${index}
            data-which="1"
          />`,
          html`<circle
            cx=${toX(node.x)}
            cy=${toY(node.y)}
            r="6"
            fill="#ffffff"
            stroke="#111111"
            stroke-width="2"
            data-testid="curve-node"
            data-index=${index}
          />`,
        ])}
      </svg>
    `;
  }
}

customElements.define("gnumarus-curve-editor", GnumarusCurveEditor);
