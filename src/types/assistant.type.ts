export interface Assistant {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  routingType: "fast" | "smart";
  avatar: string; // emoji or icon name
  createdAt: string;
}

export interface CreditUsage {
  totalCredits: number;
  usedCredits: number;
  fastCount: number;
  smartCount: number;
}
