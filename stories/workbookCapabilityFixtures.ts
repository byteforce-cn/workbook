import { createPluginRegistry } from "../src/react/registry";
import { validateWorkbookDocument } from "../src/schema";
import type { WorkbookDefinition } from "../src/schema/generated-types";
import dependenciesFixtureJson from "../tests/fixtures/conformance/dependencies/visibility-and-disable-state.valid.json";
import fieldsFixtureJson from "../tests/fixtures/conformance/fields/primitive-field-types.valid.json";
import rowSpanFixtureJson from "../tests/fixtures/conformance/layout/row-field-span-mixing.valid.json";
import layoutFixtureJson from "../tests/fixtures/conformance/layout/tabs-steps-repeat-and-html.valid.json";
import optionsFixtureJson from "../tests/fixtures/conformance/options/custom-option-source.valid.json";
import remoteOptionsFixtureJson from "../tests/fixtures/conformance/options/url-and-graphql-remote-options.valid.json";
import asyncValidationFixtureJson from "../tests/fixtures/conformance/validation/async-custom-validator.valid.json";
import conditionalValidationFixtureJson from "../tests/fixtures/conformance/validation/conditional-validation.valid.json";
import syncValidatorsFixtureJson from "../tests/fixtures/conformance/validation/sync-validators-showcase.valid.json";

const cityOptionsByRegion: Record<string, Array<{ label: string; value: string }>> = {
  east: [
    { label: "上海", value: "sh" },
    { label: "杭州", value: "hz" },
  ],
  west: [
    { label: "成都", value: "cd" },
    { label: "重庆", value: "cq" },
  ],
};

function cloneWorkbook(workbook: WorkbookDefinition): WorkbookDefinition {
  return structuredClone(workbook);
}

function loadValidatedFixture(fixture: unknown): WorkbookDefinition {
  const validation = validateWorkbookDocument(fixture);
  if (!validation.valid) {
    throw new Error(`Invalid workbook story fixture: ${validation.errors.map((error) => error.message).join(", ")}`);
  }

  return cloneWorkbook(fixture as WorkbookDefinition);
}

export function createFieldsCapabilityWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(fieldsFixtureJson);
}

export function createLayoutCapabilityWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(layoutFixtureJson);
}

export function createRowSpanWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(rowSpanFixtureJson);
}

export function createDependencyCapabilityWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(dependenciesFixtureJson);
}

export function createOptionsCapabilityWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(optionsFixtureJson);
}

export function createRemoteOptionsCapabilityWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(remoteOptionsFixtureJson);
}

export function createOptionsCapabilityRegistry() {
  const registry = createPluginRegistry();

  registry.optionSource.set("storybook:cities", async ({ data }) => {
    const region = typeof data.region === "string" ? data.region : "";
    return cityOptionsByRegion[region] ?? [];
  });

  return registry;
}

export function createSyncValidatorsWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(syncValidatorsFixtureJson);
}

export function createAsyncValidationWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(asyncValidationFixtureJson);
}

export function createConditionalValidationWorkbook(): WorkbookDefinition {
  return loadValidatedFixture(conditionalValidationFixtureJson);
}

const TAKEN_USERNAMES = new Set(["admin", "root", "taken", "管理员"]);

/** Mock async username-uniqueness check (simulates a remote endpoint). */
export function createAsyncValidationRegistry() {
  const registry = createPluginRegistry();

  registry.validation.set("uniqueUsername", async ({ value }) => {
    if (typeof value !== "string" || value.trim() === "") {
      return undefined;
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    return TAKEN_USERNAMES.has(value.trim()) ? "用户名已被占用" : undefined;
  });

  return registry;
}
