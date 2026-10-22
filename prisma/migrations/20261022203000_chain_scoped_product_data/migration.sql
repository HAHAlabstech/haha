-- Legacy product data was created while production was on Robinhood testnet.
-- Classify existing snapshots and revenue rows as testnet; all mainnet writers
-- now set chain_id explicitly.
ALTER TABLE "VaultSnapshot"
  ADD COLUMN "chain_id" INTEGER NOT NULL DEFAULT 46630;

CREATE INDEX "VaultSnapshot_chain_id_created_at_idx"
  ON "VaultSnapshot"("chain_id", "created_at");

ALTER TABLE "RevenueEvent"
  ADD COLUMN "chain_id" INTEGER NOT NULL DEFAULT 46630;

CREATE INDEX "RevenueEvent_chain_id_created_at_idx"
  ON "RevenueEvent"("chain_id", "created_at");
