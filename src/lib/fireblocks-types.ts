export interface FireblocksStatus {
  configured: boolean;
  apiKeyLast4: string | null;
  baseUrl: string;
  fromEnv: boolean;
}

export interface FireblocksAsset {
  id: string;
  total?: string;
  available?: string;
  pending?: string;
  frozen?: string;
  lockedAmount?: string;
}

export interface FireblocksVault {
  id: string;
  name: string;
  hiddenOnUI?: boolean;
  autoFuel?: boolean;
  assets: FireblocksAsset[];
}

export interface FireblocksWallet {
  id: string;
  name?: string;
  assets?: Array<{ id?: string; address?: string; tag?: string }>;
}

export interface FireblocksParty {
  type?: string;
  id?: string;
  name?: string;
  address?: string;
}

export interface FireblocksTx {
  id: string;
  status: string;
  assetId?: string;
  amount?: string;
  note?: string;
  createdAt?: number;
  lastUpdated?: number;
  source?: FireblocksParty;
  destination?: FireblocksParty;
  txHash?: string;
  externalTxId?: string;
}

export interface FireblocksRuleRow {
  index: number;
  name: string;
  action: string;
  asset: string;
  source: string;
  dest: string;
}

export interface CreateTransferInput {
  assetId: string;
  amount: string;
  sourceVaultId: string;
  destType: string;
  destId?: string;
  destAddress?: string;
  note?: string;
  externalTxId?: string;
}
