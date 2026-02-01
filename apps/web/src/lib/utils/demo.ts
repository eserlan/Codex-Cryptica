import type { Entity } from "schema";
import { MemoryAdapter } from "../cloud-bridge/memory-adapter";

export const loadDemoVault = async (initGuest: (adapter: any) => Promise<void>) => {
    const demoEntities: Record<string, Entity> = {
        "alpha": {
            id: "alpha",
            type: "location",
            title: "Outpost Alpha",
            content: "The primary research hub for temporal anomalies.",
            connections: [
                { target: "beta", type: "related", label: "Supply Link", strength: 1 },
                { target: "gamma", type: "related", label: "Observation Post", strength: 1 }
            ],
            labels: ["core", "secure"],
            tags: []
        },
        "beta": {
            id: "beta",
            type: "npc",
            title: "Commander Vane",
            content: "Lead strategist at Outpost Alpha.",
            connections: [],
            labels: ["command"],
            tags: []
        },
        "gamma": {
            id: "gamma",
            type: "npc",
            title: "Dr. Elara",
            content: "Chief scientist specializing in chroniton decay.",
            connections: [
                { target: "alpha", type: "related", strength: 1 }
            ],
            labels: ["science"],
            tags: []
        },
        "delta": {
            id: "delta",
            type: "faction",
            title: "The Archivists",
            content: "A shadow organization dedicated to preserving the timeline.",
            connections: [
                { target: "beta", type: "related", label: "Hidden Influence", strength: 1 }
            ],
            labels: ["mystery"],
            tags: []
        },
        "epsilon": {
            id: "epsilon",
            type: "location",
            title: "The Great Archive",
            content: "The legendary library and repository of all temporal records.",
            connections: [
                { target: "delta", type: "related", strength: 1 }
            ],
            labels: ["core"],
            tags: []
        }
    };

    const adapter = new MemoryAdapter();
    adapter.hydrate({
        version: 1,
        entities: demoEntities,
        assets: {}
    });

    await initGuest(adapter);
};
