import {ParsedScenario, ParsedScenarioOutline} from '../models';
import {
    generateStepCode,
    generateStepFunctionCall
} from './step-generation';
import {indent} from './utils';

const scenarioTemplate = (
        scenarioTitle: string,
        steps: string,
        stepKeywords: string[]
    ) =>
    // Tslint:disable-next-line:max-line-length
        `test('${scenarioTitle.replace(
            /'+/g,
            '\\\''
        )}', ({ ${stepKeywords.join(', ')} }) => {\n${indent(
            steps,
            1
        ).slice(
            0,
            -1
        )}\n});`,
    getStepKeywords = (scenario: ParsedScenario | ParsedScenarioOutline) => {

        const stepKeywords: string[] = [];

        scenario.steps.forEach((step) => {

            if (stepKeywords.indexOf(step.keyword) === -1) {

                stepKeywords.push(step.keyword);

            }

        });
        return stepKeywords;

    };

export const generateScenarioCode = (scenario: ParsedScenario | ParsedScenarioOutline) => {

    const stepsCode = scenario.steps.map((step, index) => generateStepCode(
            scenario.steps,
            index
        )),
        stepKeywords = getStepKeywords(scenario);

    return scenarioTemplate(
        scenario.title,
        stepsCode.join('\n\n'),
        stepKeywords
    );

};

export const generateScenarioCodeWithSeparateStepFunctions = (scenario: ParsedScenario | ParsedScenarioOutline) => {

    const stepFunctionCode = scenario.steps.map((step, index) => generateStepCode(
            scenario.steps,
            index,
            true
        )),
        stepFunctionCalls = scenario.steps.map((step, index) => generateStepFunctionCall(
            scenario.steps,
            index
        )),
        stepKeywords = getStepKeywords(scenario);

    // Tslint:disable-next-line:max-line-length
    return `${stepFunctionCode.join('\n\n')}\n\n${scenarioTemplate(
        scenario.title,
        stepFunctionCalls.join('\n'),
        stepKeywords
    )}`;

};
