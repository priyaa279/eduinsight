import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ipedsPackageApprovals = sqliteTable("ipeds_package_approvals", {
  id: text("id").primaryKey(),
  surveyCode: text("survey_code").notNull(),
  collectionYear: text("collection_year").notNull(),
  specId: text("spec_id").notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull(),
  sha256: text("sha256").notNull(),
  approver: text("approver").notNull(),
  approvedAt: text("approved_at").notNull(),
  validationSummary: text("validation_summary").notNull(),
  explanationsJson: text("explanations_json").notNull(),
  status: text("status").notNull(),
  createdAtEpoch: integer("created_at_epoch").notNull(),
});
