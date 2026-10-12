import EntityNode from "$lib/components/canvas/EntityNode.svelte";
import FileNode from "$lib/components/canvas/FileNode.svelte";
import TextNode from "$lib/components/canvas/TextNode.svelte";
import DelveRoomNode from "$lib/components/canvas/DelveRoomNode.svelte";
import DelveSectorNode from "$lib/components/canvas/DelveSectorNode.svelte";
import AdventureNode from "$lib/components/canvas/AdventureNode.svelte";
import CustomEdge from "$lib/components/canvas/CustomEdge.svelte";
import DelveEdge from "$lib/components/canvas/DelveEdge.svelte";

export const nodeTypes = {
  entity: EntityNode,
  file: FileNode,
  text: TextNode,
  delveRoom: DelveRoomNode,
  delveSectorGroup: DelveSectorNode,
  adventureNode: AdventureNode,
  situation: AdventureNode,
  location: AdventureNode,
  npc: AdventureNode,
  clue: AdventureNode,
  threat: AdventureNode,
  outcome: AdventureNode,
};

export const edgeTypes = {
  straight: CustomEdge,
  smoothstep: CustomEdge,
  delveEdge: DelveEdge,
  leads_to: CustomEdge,
  holds_clue: CustomEdge,
  threatens: CustomEdge,
  resolves_to: CustomEdge,
};
