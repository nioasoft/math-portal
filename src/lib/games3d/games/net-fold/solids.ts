import * as THREE from 'three';
import type { SolidKind } from './problems';

/**
 * Geometry layer for net-fold (pure, no scene side effects). For each solid we
 * describe its faces TWICE:
 *   - FLAT: where the face panel sits in the unfolded 2D net (all on the z=0
 *     plane, identity rotation, spread out so the whole net is in view).
 *   - FOLDED: where the same face panel sits as a face of the assembled 3D solid
 *     (a position = the face centroid, and a quaternion rotating the panel's
 *     default +Z normal onto that face's outward normal).
 *
 * The renderer builds ONE flat panel mesh per face (a thin slab) and tweens each
 * panel between its flat and folded transform. The fold is a clean simultaneous
 * flat→assembled interpolation (lerp position + slerp quaternion) — deliberately
 * NOT rigorous hinge kinematics, which keeps it robust across all five solids.
 */

/** Local +Z is a flat panel's outward normal before any folding rotation. */
const PANEL_NORMAL = new THREE.Vector3(0, 0, 1);

export interface FacePanel {
  /** Polygon outline in the panel's local XY plane (z=0), CCW, centered on origin. */
  readonly outline: ReadonlyArray<readonly [number, number]>;
  /** Tint index (cycles through a per-face palette so faces are countable). */
  readonly tint: number;
  /** Position of the face panel when laid out FLAT in the net (z≈0 plane). */
  readonly flatPosition: THREE.Vector3;
  /** Position of the face panel as a face of the assembled solid. */
  readonly foldedPosition: THREE.Vector3;
  /** Orientation of the face panel as a face of the assembled solid. */
  readonly foldedQuaternion: THREE.Quaternion;
}

export interface SolidShape {
  readonly faces: FacePanel[];
  /** Half-width of the WIDEST layout (the flat net) — used to frame the camera. */
  readonly flatHalfExtent: number;
}

function rect(hw: number, hh: number): ReadonlyArray<readonly [number, number]> {
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
}

/** Equilateral-ish triangle centered on its centroid, pointing +Y. */
function triangle(side: number, height: number): ReadonlyArray<readonly [number, number]> {
  // Centroid at origin: base at y = -height/3, apex at y = +2height/3.
  return [
    [-side / 2, -height / 3],
    [side / 2, -height / 3],
    [0, (2 * height) / 3],
  ];
}

/** Quaternion that rotates a flat panel (+Z normal) to point along `normal`. */
function orientTo(normal: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(PANEL_NORMAL, normal.clone().normalize());
}

/**
 * Build the six faces of a box (cube or rectangular) given half-extents. The
 * folded faces sit at ±half-extent on each axis, oriented outward; the flat net
 * is a classic cross/T arrangement laid on the z-plane.
 */
function buildBox(hx: number, hy: number, hz: number): SolidShape {
  // Outline polygons per axis pair (the panel's local XY → the face plane).
  const faceXY = rect(hx, hy); // faces with normal ±Z (front/back), span x,y
  const faceXZ = rect(hx, hz); // normal ±Y (top/bottom), span x,z (z→local y)
  const faceZY = rect(hz, hy); // normal ±X (left/right), span z,y (z→local x)

  const faces: Array<Omit<FacePanel, 'flatPosition'>> = [
    { outline: faceXY, tint: 0, foldedPosition: new THREE.Vector3(0, 0, hz), foldedQuaternion: orientTo(new THREE.Vector3(0, 0, 1)) },
    { outline: faceXY, tint: 1, foldedPosition: new THREE.Vector3(0, 0, -hz), foldedQuaternion: orientTo(new THREE.Vector3(0, 0, -1)) },
    { outline: faceXZ, tint: 2, foldedPosition: new THREE.Vector3(0, hy, 0), foldedQuaternion: orientTo(new THREE.Vector3(0, 1, 0)) },
    { outline: faceXZ, tint: 3, foldedPosition: new THREE.Vector3(0, -hy, 0), foldedQuaternion: orientTo(new THREE.Vector3(0, -1, 0)) },
    { outline: faceZY, tint: 4, foldedPosition: new THREE.Vector3(hx, 0, 0), foldedQuaternion: orientTo(new THREE.Vector3(1, 0, 0)) },
    { outline: faceZY, tint: 5, foldedPosition: new THREE.Vector3(-hx, 0, 0), foldedQuaternion: orientTo(new THREE.Vector3(-1, 0, 0)) },
  ];

  // Flat net: a cross. Center column = back | bottom | front | top stacked in y;
  // left & right wings flank the front face. Gaps (GAP) keep faces visually
  // distinct so they're countable when flat.
  const GAP = 0.08;
  const colW = 2 * hx; // width of the x,y / x,z faces
  const rowFrontH = 2 * hy;
  const rowCapH = 2 * hz;
  // Vertical stack heights (center column): top(cap) / front(hy) / bottom(cap) / back(hy)
  // Place front at y=0; top above it; bottom below; back below bottom.
  const yFront = 0;
  const yTop = rowFrontH / 2 + GAP + rowCapH / 2;
  const yBottom = -(rowFrontH / 2 + GAP + rowCapH / 2);
  const yBack = yBottom - (rowCapH / 2 + GAP + rowFrontH / 2);
  // Side wings flank the front face horizontally.
  const xWing = colW / 2 + GAP + hz;

  const flatPositions: THREE.Vector3[] = [
    new THREE.Vector3(0, yFront, 0), // front (tint 0)
    new THREE.Vector3(0, yBack, 0), // back (tint 1)
    new THREE.Vector3(0, yTop, 0), // top (tint 2)
    new THREE.Vector3(0, yBottom, 0), // bottom (tint 3)
    new THREE.Vector3(xWing, yFront, 0), // right (tint 4)
    new THREE.Vector3(-xWing, yFront, 0), // left (tint 5)
  ];

  const built: FacePanel[] = faces.map((f, i) => ({ ...f, flatPosition: flatPositions[i] }));
  const flatHalfExtent = Math.max(xWing + hz, (yTop - yBack) / 2 + Math.max(rowFrontH, rowCapH) / 2);
  return { faces: built, flatHalfExtent };
}

/** Triangular prism: 2 triangular ends + 3 rectangular sides. */
function buildTriangularPrism(): SolidShape {
  const side = 1.6; // triangle base
  const triH = (Math.sqrt(3) / 2) * side; // equilateral height
  const depth = 1.6; // prism length
  const hd = depth / 2;
  const triShape = triangle(side, triH);
  const rectShape = rect(side / 2, hd); // each side rect: side wide, depth long

  // Assembled prism axis along Z. Two triangular caps at z = ±hd facing ±Z.
  // Three rectangular sides around the triangle's three edges.
  // Triangle (in XY) vertices (centroid origin):
  const a = new THREE.Vector3(-side / 2, -triH / 3, 0);
  const b = new THREE.Vector3(side / 2, -triH / 3, 0);
  const c = new THREE.Vector3(0, (2 * triH) / 3, 0);

  const faces: Array<Omit<FacePanel, 'flatPosition'>> = [];
  // Cap +Z and -Z.
  faces.push({ outline: triShape, tint: 0, foldedPosition: new THREE.Vector3(0, 0, hd), foldedQuaternion: orientTo(new THREE.Vector3(0, 0, 1)) });
  faces.push({ outline: triShape, tint: 1, foldedPosition: new THREE.Vector3(0, 0, -hd), foldedQuaternion: orientTo(new THREE.Vector3(0, 0, -1)) });

  // Three side rectangles, one per triangle edge. Each spans the edge (width =
  // side) and the prism depth. We orient each panel so its local +Y runs along
  // the depth (Z axis) and its outward normal points away from the prism axis.
  const edges: Array<[THREE.Vector3, THREE.Vector3]> = [
    [a, b],
    [b, c],
    [c, a],
  ];
  const depthDir = new THREE.Vector3(0, 0, 1);
  let tint = 2;
  for (const [p, q] of edges) {
    const mid = p.clone().add(q).multiplyScalar(0.5).setZ(0); // edge midpoint in the cap plane
    const outward = mid.clone().normalize(); // from axis (origin) outward
    // Panel local axes: localX along the edge, localY along depth(+Z), localZ = outward.
    const localY = depthDir.clone();
    const localZ = outward.clone();
    const localX = new THREE.Vector3().crossVectors(localY, localZ).normalize();
    const m = new THREE.Matrix4().makeBasis(localX, localY, localZ);
    const quat = new THREE.Quaternion().setFromRotationMatrix(m);
    faces.push({ outline: rectShape, tint, foldedPosition: mid.clone(), foldedQuaternion: quat });
    tint += 1;
  }

  // Flat net: lay the three side rectangles in a horizontal strip, the two
  // triangular caps above the middle rectangle. All on z=0.
  const GAP = 0.1;
  const rw = side; // rect width
  const stepX = rw + GAP;
  const flatPositions: THREE.Vector3[] = [];
  // Order in `faces`: [cap0, cap1, side0, side1, side2]
  // Caps placed above the middle side rect.
  // Sides centered in a row: x = -stepX, 0, +stepX.
  const capY = depth / 2 + GAP + triH / 2;
  flatPositions[0] = new THREE.Vector3(0, capY, 0); // cap0 above middle
  flatPositions[1] = new THREE.Vector3(0, -capY, 0); // cap1 below middle
  flatPositions[2] = new THREE.Vector3(-stepX, 0, 0); // side0
  flatPositions[3] = new THREE.Vector3(0, 0, 0); // side1 (middle)
  flatPositions[4] = new THREE.Vector3(stepX, 0, 0); // side2

  const built: FacePanel[] = faces.map((f, i) => ({ ...f, flatPosition: flatPositions[i] }));
  const flatHalfExtent = Math.max(stepX + rw / 2, capY + triH / 2);
  return { faces: built, flatHalfExtent };
}

/** Square pyramid: 1 square base + 4 triangular sides. */
function buildSquarePyramid(): SolidShape {
  const base = 1.6;
  const hb = base / 2;
  const apexH = 1.5; // height of the apex above the base plane
  // Slant triangle: base = `base`, height = slant height.
  const slant = Math.sqrt(apexH * apexH + hb * hb);
  const triShape = triangle(base, slant);
  const squareShape = rect(hb, hb);

  const faces: Array<Omit<FacePanel, 'flatPosition'>> = [];
  // Base: at y=0 facing down (−Y) so the pyramid sits apex-up.
  faces.push({ outline: squareShape, tint: 0, foldedPosition: new THREE.Vector3(0, 0, 0), foldedQuaternion: orientTo(new THREE.Vector3(0, -1, 0)) });

  // Apex above the base center.
  const apex = new THREE.Vector3(0, apexH, 0);
  // Base square corners (in the y=0 plane), CCW.
  const corners = [
    new THREE.Vector3(-hb, 0, hb),
    new THREE.Vector3(hb, 0, hb),
    new THREE.Vector3(hb, 0, -hb),
    new THREE.Vector3(-hb, 0, -hb),
  ];
  let tint = 1;
  for (let i = 0; i < 4; i++) {
    const p = corners[i];
    const q = corners[(i + 1) % 4];
    const edgeMid = p.clone().add(q).multiplyScalar(0.5);
    const centroid = p.clone().add(q).add(apex).multiplyScalar(1 / 3);
    // Outward normal of this slant face.
    const e1 = q.clone().sub(p);
    const e2 = apex.clone().sub(p);
    let normal = new THREE.Vector3().crossVectors(e1, e2).normalize();
    // Ensure it points away from the pyramid axis (outward).
    if (normal.dot(edgeMid.clone().setY(0)) < 0) normal = normal.multiplyScalar(-1);
    // Panel local +Y should point from base edge toward apex (the triangle apex).
    const localY = apex.clone().sub(edgeMid).normalize();
    const localZ = normal.clone();
    const localX = new THREE.Vector3().crossVectors(localY, localZ).normalize();
    const m = new THREE.Matrix4().makeBasis(localX, localY, localZ);
    const quat = new THREE.Quaternion().setFromRotationMatrix(m);
    faces.push({ outline: triShape, tint, foldedPosition: centroid, foldedQuaternion: quat });
    tint += 1;
  }

  // Flat net: base square in the center, four slant triangles flanking its four
  // edges (top/right/bottom/left), all on z=0.
  const GAP = 0.1;
  // The triangles flank the square's four edges. For a clean, robust flat net we
  // simply position the four triangles around the square (the fold tween handles
  // the orientation regardless of exact net hinge positions).
  const flatPositions: THREE.Vector3[] = [];
  flatPositions[0] = new THREE.Vector3(0, 0, 0); // base square center
  flatPositions[1] = new THREE.Vector3(0, hb + GAP + slant / 2, 0); // top
  flatPositions[2] = new THREE.Vector3(hb + GAP + slant / 2, 0, 0); // right
  flatPositions[3] = new THREE.Vector3(0, -(hb + GAP + slant / 2), 0); // bottom
  flatPositions[4] = new THREE.Vector3(-(hb + GAP + slant / 2), 0, 0); // left

  // The folded pyramid spans y∈[0, apexH] (base at y=0, apex at y=apexH), so its
  // assembled center sits at apexH/2 ABOVE the origin. Shift every folded
  // position down by apexH/2 so the assembled solid straddles the origin too
  // (orientation untouched — position only). The flat net is centered separately
  // by centerFlatNet().
  const foldShift = new THREE.Vector3(0, -apexH / 2, 0);
  const built: FacePanel[] = faces.map((f, i) => ({
    ...f,
    foldedPosition: f.foldedPosition.clone().add(foldShift),
    flatPosition: flatPositions[i],
  }));
  const reach = hb + GAP + slant;
  const flatHalfExtent = reach;
  return { faces: built, flatHalfExtent };
}

/** Tetrahedron: 4 equilateral triangular faces. */
function buildTetrahedron(): SolidShape {
  const side = 1.8;
  const triH = (Math.sqrt(3) / 2) * side;
  const triShape = triangle(side, triH);

  // Regular tetrahedron vertices (centered at origin). Using cube-corner
  // vertices (±s,±s,±s) on alternating corners, the edge length is 2√2·s, so
  // s = side / (2√2) makes each edge exactly `side` — matching the triangular
  // face panels (drawn at `side`) so the folded faces sit flush.
  const s = side / (2 * Math.sqrt(2));
  const verts = [
    new THREE.Vector3(s, s, s),
    new THREE.Vector3(s, -s, -s),
    new THREE.Vector3(-s, s, -s),
    new THREE.Vector3(-s, -s, s),
  ];
  // Faces as triples (each omits one vertex).
  const faceIdx: Array<[number, number, number]> = [
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3],
    [1, 3, 2],
  ];

  const faces: Array<Omit<FacePanel, 'flatPosition'>> = [];
  let tint = 0;
  for (const [i, j, k] of faceIdx) {
    const A = verts[i];
    const B = verts[j];
    const C = verts[k];
    const centroid = A.clone().add(B).add(C).multiplyScalar(1 / 3);
    let normal = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A)).normalize();
    // Outward = away from the solid center (origin).
    if (normal.dot(centroid) < 0) normal = normal.multiplyScalar(-1);
    const quat = orientTo(normal);
    faces.push({ outline: triShape, tint, foldedPosition: centroid, foldedQuaternion: quat });
    tint += 1;
  }

  // Flat net: the classic tetra net — one central triangle (apex up) with three
  // triangles attached to its three edges. For robustness + clarity we lay them
  // as a central triangle plus three flanking triangles (positions only; the
  // fold tween animates orientation regardless).
  const GAP = 0.12;
  const r = triH / 2 + GAP + triH / 2;
  const flatPositions: THREE.Vector3[] = [];
  flatPositions[0] = new THREE.Vector3(0, 0, 0); // center
  flatPositions[1] = new THREE.Vector3(0, r, 0); // above
  flatPositions[2] = new THREE.Vector3(r * 0.95, -r * 0.55, 0); // lower-right
  flatPositions[3] = new THREE.Vector3(-r * 0.95, -r * 0.55, 0); // lower-left

  const built: FacePanel[] = faces.map((f, i) => ({ ...f, flatPosition: flatPositions[i] }));
  const flatHalfExtent = r + triH / 2 + 0.2;
  return { faces: built, flatHalfExtent };
}

/**
 * Generic post-process: re-center a solid's FLAT net on the origin and recompute
 * `flatHalfExtent` from the actual centered layout. We build each net by stacking
 * panels around y≈0, but the layouts aren't symmetric (e.g. the box cross extends
 * mostly below the front face), so the assembled flat net is biased off-origin
 * and the locked camera (looking at origin) shows it pushed to one side. This
 * computes the true 2D bounding box of all flat panels (panel flatPosition +
 * each outline vertex, since outlines are centered on their own origin) and
 * subtracts the box center from every flatPosition. FOLDED transforms are left
 * untouched. Returns a new SolidShape (immutable — no in-place mutation).
 */
function centerFlatNet(shape: SolidShape): SolidShape {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const f of shape.faces) {
    for (const [ox, oy] of f.outline) {
      const x = f.flatPosition.x + ox;
      const y = f.flatPosition.y + oy;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const faces: FacePanel[] = shape.faces.map((f) => ({
    ...f,
    flatPosition: f.flatPosition.clone().sub(new THREE.Vector3(cx, cy, 0)),
  }));
  // After centering, the net spans [minX-cx, maxX-cx] = ±(width/2). The half
  // extent the camera must frame is the larger of half-width and half-height.
  const flatHalfExtent = Math.max(maxX - minX, maxY - minY) / 2;
  return { faces, flatHalfExtent };
}

/** Build the full face description (flat + folded) for a solid. */
export function buildSolid(kind: SolidKind): SolidShape {
  switch (kind) {
    case 'cube':
      return centerFlatNet(buildBox(0.9, 0.9, 0.9));
    case 'rectangularBox':
      return centerFlatNet(buildBox(1.1, 0.7, 0.85));
    case 'triangularPrism':
      return centerFlatNet(buildTriangularPrism());
    case 'squarePyramid':
      return centerFlatNet(buildSquarePyramid());
    case 'tetrahedron':
      return centerFlatNet(buildTetrahedron());
  }
}

/**
 * Build a thin slab geometry for a polygon outline (so faces read as PAPER
 * panels with visible thickness, not zero-width planes). The outline is a flat
 * polygon in local XY (z=0) with +Z normal; we extrude it a hair along ±Z.
 */
export function panelGeometry(outline: ReadonlyArray<readonly [number, number]>, thickness: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) shape.lineTo(outline[i][0], outline[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    steps: 1,
  });
  // Extrude builds from z=0 upward; recenter so the slab straddles z=0 and its
  // outward face (the +Z side) sits at the panel origin's +Z.
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}
