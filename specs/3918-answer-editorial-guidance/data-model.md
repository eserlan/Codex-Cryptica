# Data model

No new persisted entity, migration or runtime type.

The existing AnswerConfigInput remains the authoring contract. An Answer has a direct shortAnswer and a non-empty ordered sections array. Supported block kinds remain prose, list, example, checklist and table. Optional codexConnection and default-empty related link arrays retain their current semantics. Each included block keeps its present internal validation.

Reader level, reader job, selected teaching form and source/version notes are drafting decisions, recorded in the benchmark where useful; do not introduce required metadata fields solely to police editorial judgement.

The benchmark records source snapshot, defect, proposed excerpt, reader task, observable outcome, drafting prevention and independent verification still needed. These are Markdown observations rather than a new machine score or schema.
