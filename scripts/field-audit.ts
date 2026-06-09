import { createFieldAuditReport } from "../src/lib/workspace/field-audit-report";
import {
  createFieldPackingScenarios,
  runFieldPackingScenarioPerformanceAudit
} from "../src/lib/workspace/packing-field-scenarios";
import { runPackingEngineV0 } from "../src/lib/workspace/packing-engine";

const audit = runFieldPackingScenarioPerformanceAudit(createFieldPackingScenarios(), runPackingEngineV0);
const report = createFieldAuditReport(audit);

console.log(report.text);

process.exitCode = report.exitCode;
