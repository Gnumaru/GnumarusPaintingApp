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
  type GnumarusCurveNode,
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

  /** Node hit radius in normalized units (generous grab area). */
  static readonly NODE_HIT = 11 / 256;

  /** Handle hit radius in normalized units. */
  static readonly HANDLE_HIT = 10 / 256;

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
    const hit = this.hitTest(nodes, point);
    if (event.button === 0 && hit !== null && (hit.kind === "node" || hit.kind === "handle")) {
      this.drag = hit.kind === "node" ? { kind: "node", index: hit.index } : { kind: "handle", index: hit.index, which: hit.which };
      this.hover = null;
      (event.currentTarget as Element | null)?.setPointerCapture?.(event.pointerId);
      this.requestUpdate();
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

  /** Nearest grab target (ties go to the node): nodes stay primary when a handle coincides with them. */
  private hitTest(
    nodes: GnumarusCurveNode[],
    point: { x: number; y: number },
  ): { kind: "node"; index: number } | { kind: "handle"; index: number; which: 0 | 1 } | null {
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
      bestHandle !== null &&
      bestHandleDist <= GnumarusCurveEditor.HANDLE_HIT &&
      bestHandleDist < bestNodeDist - 1 / GnumarusCurveEditor.SIZE
    ) {
      return { kind: "handle", index: bestHandle.index, which: bestHandle.which };
    }
    if (bestNode >= 0 && bestNodeDist <= GnumarusCurveEditor.NODE_HIT) {
      return { kind: "node", index: bestNode };
    }
    return null;
  }

  /** Hover highlight target (drives node/handle emphasis and cursors). */
  private hover:
    | { kind: "node"; index: number }
    | { kind: "handle"; index: number; which: 0 | 1 }
    | null = null;

  private onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (drag !== null) {
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
      return;
    }
    const hit = this.hitTest(normalizeColorCurve(this.nodes), this.toValue(event));
    const changed =
      (hit === null) !== (this.hover === null) ||
      (hit !== null &&
        this.hover !== null &&
        (hit.kind !== this.hover.kind ||
          hit.index !== this.hover.index ||
          (hit.kind === "handle" &&
            this.hover.kind === "handle" &&
            hit.which !== this.hover.which)));
    if (changed) {
      this.hover = hit;
      this.requestUpdate();
    }
  }

  private onPointerLeave(): void {
    if (this.hover !== null) {
      this.hover = null;
      this.requestUpdate();
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.drag !== null) {
      this.drag = null;
      this.hover = null;
      this.requestUpdate();
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
    const hit = this.hitTest(nodes, this.toValue(event as unknown as PointerEvent));
    if (hit !== null && hit.kind === "node") {
      const next = removeCurveNode(nodes, hit.index);
      if (next !== nodes) {
        this.emit(next);
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
    const active = this.drag ?? this.hover;
    const isActiveNode = (index: number): boolean =>
      active !== null && active.kind === "node" && active.index === index;
    const isActiveHandle = (index: number, which: 0 | 1): boolean =>
      active !== null && active.kind === "handle" && active.index === index && active.which === which;
    const cursor =
      this.drag !== null
        ? this.drag.kind === "node"
          ? "grabbing"
          : "move"
        : this.hover !== null
          ? this.hover.kind === "node"
            ? "grab"
            : "move"
          : "crosshair";
    return html`
      <svg
        width=${size}
        height=${size}
        viewBox="0 0 ${size} ${size}"
        style="cursor: ${cursor}"
        data-testid="curve-editor"
        @pointerdown=${(event: PointerEvent): void => this.onPointerDown(event)}
        @pointermove=${(event: PointerEvent): void => this.onPointerMove(event)}
        @pointerup=${(event: PointerEvent): void => this.onPointerUp(event)}
        @pointercancel=${(event: PointerEvent): void => this.onPointerUp(event)}
        @pointerleave=${(): void => this.onPointerLeave()}
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
        ${nodes.flatMap((node, index) => {
          const emphasized = isActiveNode(index) || isActiveHandle(index, 0) || isActiveHandle(index, 1);
          const half = emphasized ? 6 : 5;
          return [
            // Single tangent bar through the node, like vector editors.
            html`<line
              x1=${toX(node.hx0)}
              y1=${toY(node.hy0)}
              x2=${toX(node.hx1)}
              y2=${toY(node.hy1)}
              stroke="#0e639c"
              stroke-width=${emphasized ? 2.5 : 1.5}
            />`,
            html`<rect
              x=${toX(node.hx0) - half}
              y=${toY(node.hy0) - half}
              width=${half * 2}
              height=${half * 2}
              transform=${`rotate(45 ${toX(node.hx0)} ${toY(node.hy0)})`}
              fill="#0e639c"
              stroke="#ffffff"
              stroke-width="1.5"
              data-testid="curve-handle"
              data-index=${index}
              data-which="0"
            />`,
            html`<rect
              x=${toX(node.hx1) - half}
              y=${toY(node.hy1) - half}
              width=${half * 2}
              height=${half * 2}
              transform=${`rotate(45 ${toX(node.hx1)} ${toY(node.hy1)})`}
              fill="#0e639c"
              stroke="#ffffff"
              stroke-width="1.5"
              data-testid="curve-handle"
              data-index=${index}
              data-which="1"
            />`,
            html`<circle
              cx=${toX(node.x)}
              cy=${toY(node.y)}
              r=${isActiveNode(index) ? 8.5 : 7}
              fill="#ffffff"
              stroke=${isActiveNode(index) ? "#0e639c" : "#111111"}
              stroke-width="2.5"
              data-testid="curve-node"
              data-index=${index}
            />`,
          ];
        })}
      </svg>
    `;
  }
}

customElements.define("gnumarus-curve-editor", GnumarusCurveEditor);
