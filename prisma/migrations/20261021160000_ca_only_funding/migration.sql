ALTER TABLE "Epoch" ADD COLUMN "chain_id" INTEGER NOT NULL DEFAULT 46630,
  ADD COLUMN "tipjar_address" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "funding_finalized" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "royalty_micro_usdg" BIGINT NOT NULL DEFAULT 0;
DROP INDEX "Epoch_epoch_number_key";
CREATE UNIQUE INDEX "Epoch_number_chain_tipjar_key" ON "Epoch"("epoch_number","chain_id","tipjar_address");
CREATE INDEX "Epoch_chain_id_tipjar_address_epoch_number_idx" ON "Epoch"("chain_id","tipjar_address","epoch_number");
ALTER TABLE "VaultSnapshot" ADD COLUMN "contributors_json" JSONB;
ALTER TABLE "Bit" ADD COLUMN "chain_id" INTEGER NOT NULL DEFAULT 46630;
ALTER TABLE "CronJobRun" ADD COLUMN "chain_id" INTEGER NOT NULL DEFAULT 46630;
DROP INDEX "cronjobrun_job_epoch_stage_unique";
CREATE UNIQUE INDEX "cronjobrun_job_chain_epoch_stage_unique" ON "CronJobRun"("job_name","chain_id","epoch_number","stage");
CREATE TABLE "RewardFundingReceipt" (
  "id" TEXT NOT NULL,
  "chain_id" INTEGER NOT NULL,
  "gateway_address" TEXT NOT NULL,
  "tipjar_address" TEXT NOT NULL,
  "tx_hash" TEXT NOT NULL,
  "log_index" INTEGER NOT NULL,
  "block_number" BIGINT NOT NULL,
  "source" TEXT NOT NULL,
  "batch_id" TEXT,
  "general_micro_usdg" BIGINT NOT NULL DEFAULT 0,
  "royalty_remaining_micro" BIGINT NOT NULL DEFAULT 0,
  "contributors_json" JSONB,
  "general_epoch_id" TEXT,
  "last_royalty_epoch" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardFundingReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RewardFundingReceipt_chain_id_tx_hash_log_index_key" ON "RewardFundingReceipt"("chain_id","tx_hash","log_index");
CREATE INDEX "RewardFundingReceipt_chain_gateway_tipjar_epoch_idx" ON "RewardFundingReceipt"("chain_id","gateway_address","tipjar_address","general_epoch_id");
