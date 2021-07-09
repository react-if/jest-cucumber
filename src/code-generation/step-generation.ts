import {ParsedStep} from '../models';
import {indent} from './utils';

const stepTemplate = (
        stepKeyword: string,
        stepMatcher: string,
        stepArgumentVariables: string[]
    ) => `${stepKeyword}(${stepMatcher}, (${stepArgumentVariables.join(', ')}) => {\n\n});`,

    getStepFunctionWrapperName = (
        stepKeyword: string,
        stepText: string
    ) =>
    // Tslint:disable-next-line:max-line-length
        `${stepKeyword}_${stepText.
            replace(
                stepTextArgumentRegex,
                'X'
            ).
            replace(
                /\s/g,
                '_'
            ).
            replace(
                /[^A-Za-z0-9_]/g,
                ''
            )}`,
    stepWrapperFunctionTemplate = (
        stepKeyword: string,
        stepText: string,
        stepMatcher: string,
        stepArgumentVariables: string[]
    ) =>
    // Tslint:disable-next-line:max-line-length
        `export const ${getStepFunctionWrapperName(
            stepKeyword,
            stepText
        )} = (${stepKeyword}) => {\n${indent(
            stepTemplate(
                stepKeyword,
                stepMatcher,
                stepArgumentVariables
            ),
            1
        ).slice(
            0,
            -1
        )}\n}`,
    stepWrapperFunctionCallTemplate = (
        stepText: string,
        stepKeyword: string
    ) => `${getStepFunctionWrapperName(
        stepKeyword,
        stepText
    )}(${stepKeyword})`,

    stepTextArgumentRegex = /([-+]?[0-9]*\.?[0-9]+)|\"([^"<]+)\"|\"?\<([^"<]*)\>\"?/g,

    escapeRegexCharacters = (text: string) => text.
        replace(
            /\$/g,
            '\\$'
        ).
        replace(
            /\(/g,
            '\\('
        ).
        replace(
            /\)/g,
            '\\)'
        ),

    convertStepTextToRegex = (step: ParsedStep) => {

        const stepText = escapeRegexCharacters(step.stepText);
        let matches: RegExpExecArray | null,
            finalStepText = stepText;

        while (matches = stepTextArgumentRegex.exec(stepText)) {

            const [
                fullMatch,
                numberMatch,
                stringMatch
            ] = matches;

            if (numberMatch) {

                finalStepText = finalStepText.replace(
                    numberMatch,
                    '(.*)'
                );

            } else if (stringMatch) {

                finalStepText = finalStepText.replace(
                    stringMatch,
                    '(.*)'
                );

            } else {

                finalStepText = finalStepText.replace(
                    fullMatch,
                    '(.*)'
                );

            }

        }

        return `/^${finalStepText}$/`;

    },

    getStepArguments = (step: ParsedStep) => {

        const stepArgumentVariables: string[] = [];

        let index = 0,
            match: RegExpExecArray | null;

        while (match = stepTextArgumentRegex.exec(step.stepText)) {

            stepArgumentVariables.push(`arg${index}`);
            index++;

        }

        if (step.stepArgument) {

            if (typeof step.stepArgument === 'string') {

                stepArgumentVariables.push('docString');

            } else {

                stepArgumentVariables.push('table');

            }

        }

        return stepArgumentVariables;

    },

    getStepMatcher = (step: ParsedStep) => {

        let stepMatcher = '';

        if (step.stepText.match(stepTextArgumentRegex)) {

            stepMatcher = convertStepTextToRegex(step);

        } else {

            stepMatcher = `'${step.stepText.replace(
                /'+/g,
                '\\\''
            )}'`;

        }

        return stepMatcher;

    };

export const getStepKeyword = (
    steps: ParsedStep[],
    stepPosition: number
) => steps[stepPosition].keyword;

export const generateStepCode = (
    steps: ParsedStep[],
    stepPosition: number,
    generateWrapperFunction = false
) => {

    const step = steps[stepPosition],
        stepKeyword = getStepKeyword(
            steps,
            stepPosition
        ),
        stepMatcher = getStepMatcher(step),
        stepArguments = getStepArguments(step);

    if (generateWrapperFunction) {

        return stepWrapperFunctionTemplate(
            stepKeyword,
            step.stepText,
            stepMatcher,
            stepArguments
        );

    }
    return stepTemplate(
        stepKeyword,
        stepMatcher,
        stepArguments
    );

};

export const generateStepFunctionCall = (
    steps: ParsedStep[],
    stepPosition: number
) => {

    const step = steps[stepPosition],
        stepKeyword = getStepKeyword(
            steps,
            stepPosition
        );

    return stepWrapperFunctionCallTemplate(
        step.stepText,
        stepKeyword
    );

};
