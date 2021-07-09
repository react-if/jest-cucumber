import {Options} from './models';

const defaultErrorSettings = {
        'missingScenarioInFeature': true,
        'missingScenarioInStepDefinitions': true,
        'missingStepInFeature': true,
        'missingStepInStepDefinitions': true
    },

    defaultConfiguration: Options = {
        'errors': defaultErrorSettings,
        'scenarioNameTemplate': undefined,
        'tagFilter': undefined
    };

let globalConfiguration: Options = {} as Options;

export const getJestCucumberConfiguration = (options?: Options) => {

    const mergedOptions = {
        ...defaultConfiguration,
        ...globalConfiguration,
        ...options || {}
    };

    if (mergedOptions.errors === true) {

        mergedOptions.errors = defaultErrorSettings;

    }

    return mergedOptions;

};

export const setJestCucumberConfiguration = (options: Options) => {

    globalConfiguration = options;

};
