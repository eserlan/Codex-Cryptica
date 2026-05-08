# Research: Progressive Node Sizing

## Decision: Connectivity Metric

We will use **Rendered Degree Centrality** as the proxy for connectivity. The `GraphTransformer` will calculate `weight` from the edges that actually render in the graph, counting both inbound and outbound visible links.

**Rationale**: Rendered degree matches what users actually see in the graph. It correctly surfaces hubs in one-way relationship models and avoids overstating nodes whose links point to hidden or stale targets.

## Decision: Discrete Size Tiers

We will implement 4 discrete tiers based on connection counts.

| Tier | Connections | Visual Size (Diameter) | Rationale                                                    |
| ---- | ----------- | ---------------------- | ------------------------------------------------------------ |
| 0    | 0-1         | 48px                   | "Islands" or minor entities. Large enough for a small image. |
| 1    | 2-5         | 64px                   | Standard connected entities.                                 |
| 2    | 6-10        | 96px                   | Significant hubs.                                            |
| 3    | 11+         | 128px                  | Major lore pillars.                                          |

**Rationale**: Discrete tiers provide the "intervals" requested by the user and ensure visual consistency (SC-004). The sizes scale from a base of 48px to a maximum of 128px (~2.6x), staying within the 3x limit.

## Decision: Image Handling

Nodes with images will inherit the same tier-based sizing. The minimum size of 48px is sufficient for a recognizable thumbnail, but Tier 1 (64px) will be the "standard" for meaningful imagery.

## Technical Implementation: Cytoscape Selectors

We will use Cytoscape data selectors in `getGraphStyle` to apply sizes based on the `weight` attribute.

```javascript
selector: 'node[weight >= 2][weight < 6]',
style: { width: 64, height: 64 }
```

We will also update the `transition-property` to include `width` and `height` to ensure smooth scaling when connections are added/removed.

## Alternatives Considered

- **Continuous Logarithmic Scaling**: Rejected per user feedback preferring "intervals".
- **Raw Out-Degree**: Rejected because it can undersize one-way hubs and oversize nodes whose targets are hidden or invalid in the rendered graph.
