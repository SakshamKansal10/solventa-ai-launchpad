import type { InstancedMesh, Material, Mesh, Object3D } from "three";

type Kind = "plain" | "instanced" | "instanced+color";

const kindOf = (o: Mesh): Kind =>
  (o as InstancedMesh).isInstancedMesh
    ? (o as InstancedMesh).instanceColor
      ? "instanced+color"
      : "instanced"
    : "plain";

/**
 * three.js keys a material's program on how it is drawn — instanced or not, with per-instance
 * colour or not. One material shared between such meshes makes the renderer re-derive (and
 * re-key, allocating) its program on every draw that switches kind: measured, five shared
 * materials did this every frame. Each instanced kind gets its own copy instead (same look:
 * the copy keeps the shader hook and its cache key, so it reuses the already-compiled program).
 * Returns the undo (restores the originals and disposes the copies).
 */
export function dedicateInstancedMaterials(root: Object3D): () => void {
  const kinds = new Map<Material, Set<Kind>>();
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    meshes.push(mesh);
    const set = kinds.get(mesh.material) ?? new Set<Kind>();
    set.add(kindOf(mesh));
    kinds.set(mesh.material, set);
  });
  const copies = new Map<string, Material>();
  const swapped: [Mesh, Material][] = [];
  for (const mesh of meshes) {
    const original = mesh.material as Material;
    const kind = kindOf(mesh);
    if ((kinds.get(original)?.size ?? 0) < 2 || kind === "plain") continue;
    const key = `${original.uuid}:${kind}`;
    let copy = copies.get(key);
    if (!copy) {
      copy = original.clone();
      copy.onBeforeCompile = original.onBeforeCompile;
      copy.customProgramCacheKey = original.customProgramCacheKey;
      copies.set(key, copy);
    }
    swapped.push([mesh, original]);
    mesh.material = copy;
  }
  return () => {
    for (const [mesh, original] of swapped) mesh.material = original;
    for (const copy of copies.values()) copy.dispose();
  };
}
