export interface StepFromStepDefinitions {
  stepMatcher: string | RegExp;
  stepFunction(stepArguments?: any): void | PromiseLike<any>;
}

export interface ScenarioFromStepDefinitions {
  title: string;
  steps: StepFromStepDefinitions[];
}

export interface FeatureFromStepDefinitions {
  title: string;
  scenarios: ScenarioFromStepDefinitions[];
}


export interface ParsedStep {
  keyword: string;
  stepText: string;
  stepArgument: string | {};
  lineNumber: number;
}

export interface ParsedScenario {
  title: string;
  steps: ParsedStep[];
  tags: string[];
  lineNumber: number;
  skippedViaTagFilter: boolean;
}

export interface ParsedScenarioOutline {
  title: string;
  tags: string[];
  scenarios: ParsedScenario[];
  steps: ParsedStep[];
  lineNumber: number;
  skippedViaTagFilter: boolean;
}

export interface ParsedFeature {
  title: string;
  scenarios: ParsedScenario[];
  scenarioOutlines: ParsedScenarioOutline[];
  options: Options;
  tags: string[];
}

export interface ScenarioNameTemplateVars {
  featureTitle: string;
  scenarioTitle: string;
  scenarioTags: string[];
  featureTags: string[];
}

export interface ErrorOptions {
  missingScenarioInStepDefinitions: boolean;
  missingStepInStepDefinitions: boolean;
  missingScenarioInFeature: boolean;
  missingStepInFeature: boolean;
}

export interface Options {
  loadRelativePath?: boolean;
  tagFilter?: string;
  errors?: ErrorOptions | boolean;
  scenarioNameTemplate?: (vars: ScenarioNameTemplateVars) => string;
}
