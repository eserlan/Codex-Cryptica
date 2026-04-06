export interface ThemeTokens {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  border: string;
  accent: string;
  fontHeader: string;
  fontBody: string;
  texture?: string;
}

export interface GraphStyleConfig {
  nodeShape: string;
  edgeStyle: "solid" | "dashed" | "dotted";
  nodeBorderWidth: number;
  edgeColor: string;
}

export interface StylingTemplate {
  id: string;
  name: string;
  tokens: ThemeTokens;
  graph: GraphStyleConfig;
}
