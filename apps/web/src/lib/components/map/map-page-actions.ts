export async function handleActiveMapSelection({
  mapId,
  selectMap,
  isHosting,
  broadcastActiveMapSync,
}: {
  mapId: string;
  selectMap: (mapId: string) => void;
  isHosting: boolean;
  broadcastActiveMapSync: () => Promise<void>;
}) {
  selectMap(mapId);
  if (isHosting) {
    await broadcastActiveMapSync();
  }
}
