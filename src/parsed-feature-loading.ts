import {AstBuilder, Dialect, Parser, dialects} from "@cucumber/gherkin";
import callsites from "callsites";
import {readFileSync} from "fs";
import {sync as globSync} from "glob";
import {dirname, resolve} from "path";
import {v4 as uuidv4} from "uuid";

import {getJestCucumberConfiguration} from "./configuration";
import {
    Options,
    ParsedFeature,
    ParsedScenario,
    ParsedScenarioOutline,
    ParsedStep
} from "./models";

const parseDataTableRow = (astDataTableRow: any) => astDataTableRow.cells.map((col: any) => col.value) as string[],

 parseDataTable = (astDataTable: any, astDataTableHeader?: any) => {

    let headerRow: string[],
   bodyRows: string[];

    if (astDataTableHeader) {

        headerRow = parseDataTableRow(astDataTableHeader);
        bodyRows = astDataTable;
    } else {

        headerRow = parseDataTableRow(astDataTable.rows[0]);
        bodyRows =
      astDataTable &&
      astDataTable.rows &&
      astDataTable.rows.length &&
      astDataTable.rows.slice(1);
    }

    if (bodyRows && bodyRows.length > 0) {

        return bodyRows.map((nextRow) => {

            const parsedRow = parseDataTableRow(nextRow);

            return parsedRow.reduce((rowObj, nextCol, index) => ({
          ...rowObj,
          [headerRow[index]]: nextCol,
        }),
{});
        });
    }
    return [];

},

 parseStepArgument = (astStep: any) => {

        if (astStep) {

            switch (astStep.argument) {

            case "dataTable":
                return parseDataTable(astStep.dataTable);
            case "docString":
                return astStep.docString.content;
            default:
                return null;
            }
        } else {

            return null;
        }

    },

    parseStep = (astStep: any) => ({
        stepText: astStep.text,
        keyword: astStep.keyword.trim().toLowerCase() as string,
        stepArgument: parseStepArgument(astStep),
        lineNumber: astStep.location.line
    } as ParsedStep),

 parseSteps = (astScenario: any) => astScenario.steps.map((astStep: any) => parseStep(astStep)),

 parseTags = (ast: any) => {

    if (!ast.tags) {

        return [] as string[];
    }
    return ast.tags.map((tag: any) => tag.name.toLowerCase());

},

 parseScenario = (astScenario: any) => ({
    "title": astScenario.name,
    "steps": parseSteps(astScenario),
    "tags": parseTags(astScenario),
    "lineNumber": astScenario.location.line
} as ParsedScenario),

 parseScenarioOutlineExampleSteps = (
    exampleTableRow: any,
    scenarioSteps: ParsedStep[]
) => scenarioSteps.map((scenarioStep) => {

    const stepText = Object.keys(exampleTableRow).reduce(
        (processedStepText, nextTableColumn) => processedStepText.replace(
          new RegExp(`<${nextTableColumn}>`, 'g'),
          exampleTableRow[nextTableColumn],
        ),
        scenarioStep.stepText
    );

    let stepArgument: string | {} = "";

    if (scenarioStep.stepArgument) {

        if (Array.isArray(scenarioStep.stepArgument)) {

            stepArgument = scenarioStep.stepArgument as any.map((stepArgumentRow: any) => {

                    const modifiedStepArgumentRow = {...stepArgumentRow};

                    Object.keys(exampleTableRow).forEach((nextTableColumn) => {

                        Object.keys(modifiedStepArgumentRow).forEach((prop) => {

                            modifiedStepArgumentRow[prop] = modifiedStepArgumentRow[
                                prop
                            ].replace(
                                new RegExp(`<${nextTableColumn}>`,
'g'),
                                exampleTableRow[nextTableColumn]
                            );
                        });
                    });

                    return modifiedStepArgumentRow;
                }
            );
        } else {

            stepArgument = scenarioStep.stepArgument;

            if (
                typeof scenarioStep.stepArgument === "string" ||
          scenarioStep.stepArgument instanceof String
            ) {

                Object.keys(exampleTableRow).forEach((nextTableColumn) => {

                    stepArgument = stepArgument as string.replace(
                        new RegExp(`<${nextTableColumn}>`,
'g'),
                        exampleTableRow[nextTableColumn]
                    );
                });
            }
        }
    
}

    return {
        ...scenarioStep,
        stepText,
        stepArgument
    } as ParsedStep;
}),

 getOutlineDynamicTitle = (exampleTableRow: any, title: string) => title.replace(/<(\S*)>/g,
(_, firstMatch) => exampleTableRow[firstMatch || '']),

 parseScenarioOutlineExample = (
    exampleTableRow: any,
    outlineScenario: ParsedScenario,
    exampleSetTags: string[]
) => ({
    "title": getOutlineDynamicTitle(exampleTableRow,
outlineScenario.title),
    "steps": parseScenarioOutlineExampleSteps(
        exampleTableRow,
        outlineScenario.steps
    ),
    "tags": Array.from(new Set<string>([...outlineScenario.tags,
...exampleSetTags])
    )
} as ParsedScenario),

 parseScenarioOutlineExampleSet = (
        astExampleSet: any,
        outlineScenario: ParsedScenario
    ) => {

        const exampleTable = parseDataTable(
            astExampleSet.tableBody,
            astExampleSet.tableHeader
        );

        return exampleTable.map((tableRow) => parseScenarioOutlineExample(
            tableRow,
            outlineScenario,
            parseTags(astExampleSet)
        ));

    },

    parseScenarioOutlineExampleSets = (
        astExampleSets: any,
        outlineScenario: ParsedScenario
    ) => {

        const exampleSets = astExampleSets.map((astExampleSet: any) => parseScenarioOutlineExampleSet(astExampleSet,
outlineScenario));

        return exampleSets.reduce(
            (scenarios: ParsedScenario[], nextExampleSet: ParsedScenario[][]) => [...scenarios,
...nextExampleSet],
    [] as ParsedScenario[]
        );

    },

    parseScenarioOutline = (astScenarioOutline: any) => {

        const outlineScenario = parseScenario(astScenarioOutline.scenario);

        return {
            title: outlineScenario.title,
            scenarios: parseScenarioOutlineExampleSets(
                astScenarioOutline.scenario.examples,
                outlineScenario
            ),
            tags: outlineScenario.tags,
            steps: outlineScenario.steps,
            lineNumber: astScenarioOutline.scenario.location.line
        } as ParsedScenarioOutline;

    },

    parseScenarios = (astFeature: any) => astFeature.children.
    filter((child: any) => {

            const keywords = ["Scenario Outline",
'Scenario Template'];

            return (
                child.scenario && keywords.indexOf(child.scenario.keyword) === -1
            );
        }).
    map((astScenario: any) => parseScenario(astScenario.scenario)),

 parseScenarioOutlines = (astFeature: any) => astFeature.children.
    filter((child: any) => {

        const keywords = ["Scenario Outline",
'Scenario Template'];

        return (
            child.scenario && keywords.indexOf(child.scenario.keyword) !== -1
        );
    
}).
    map((astScenarioOutline: any) => parseScenarioOutline(astScenarioOutline)
    ),

 collapseBackgrounds = (astChildren: any[], backgrounds: any[]) => {

        const backgroundSteps = backgrounds.reduce(
            (allBackgroundSteps, nextBackground) => [...allBackgroundSteps,
...nextBackground.steps],
            []
        );

        astChildren.forEach((child) => {

            if (child.scenario) {

                child.scenario.steps = [
...backgroundSteps,
                    ...child.scenario.steps
];
            }
        });

        return astChildren;

    },

    parseBackgrounds = (ast: any) => ast.children.
    filter((child: any) => child.background).
    map((child: any) => child.background),

 collapseRulesAndBackgrounds = (astFeature: any) => {

        const featureBackgrounds = parseBackgrounds(astFeature),

            children = collapseBackgrounds(
                astFeature.children,
                featureBackgrounds
            ).reduce(
(newChildren: [], nextChild: any) => {

                if (nextChild.rule) {

                    const {rule} = nextChild;
                    const ruleBackgrounds = parseBackgrounds(rule);

                    return [
                        ...newChildren,
                        ...collapseBackgrounds(rule.children,
[
                            ...featureBackgrounds,
                            ...ruleBackgrounds
                        ])
                    ];
                }
                return [...newChildren,
nextChild];

            },
            []
);

        return {
            ...astFeature,
            children
        };

    },

    translateKeywords = (astFeature: any) => {

        const languageDialect = dialects[astFeature.language],
            translationMap = createTranslationMap(languageDialect);

        astFeature.language = "en";
        astFeature.keyword =
    translationMap[astFeature.keyword] || astFeature.keyword;

        for (const child of astFeature.children) {

            if (child.background) {

                child.background.keyword =
        translationMap[child.background.keyword] ||
        child.background.keyword;
            }

            if (child.scenario) {

                child.scenario.keyword =
        translationMap[child.scenario.keyword] || child.scenario.keyword;

                for (const step of child.scenario.steps) {

                    step.keyword = translationMap[step.keyword] || step.keyword;
                }

                for (const example of child.scenario.examples) {

                    example.keyword =
          translationMap[example.keyword] || example.keyword;
                }
            }
        }

        return astFeature;

    },

    createTranslationMap = (translateDialect: Dialect) => {

        const englishDialect = dialects.en,
            translationMap: {[word: string]: string} = {},

            props: Array<keyof Dialect> = [
                'and',
                'background',
                'but',
                'examples',
                'feature',
                'given',
                'scenario',
                'scenarioOutline',
                'then',
                'when',
                'rule'
            ];

        for (const prop of props) {

            const dialectWords = translateDialect[prop],
                translationWords = englishDialect[prop];
            let defaultWordIndex: number | null = null,
     index = 0;

            for (const dialectWord of dialectWords) {

                // Skip "* " word
                if (dialectWord.indexOf("*") !== 0) {

                    if (translationWords[index] !== undefined) {

                        translationMap[dialectWord] = translationWords[index];
                        if (defaultWordIndex === null) {

                            // Set default when non is set yet
                            defaultWordIndex = index;
                        }
                    } else {

                        // Index has undefined value, translate to default word
                        if (defaultWordIndex !== null) {

                            translationMap[dialectWord] =
              translationWords[defaultWordIndex];
                        } else {

                            throw new Error(`No translation found for ${dialectWord}`);
                        }
                    }
                }

                index++;
            }
        }

        return translationMap;

    };

export const parseFeature = (
    featureText: string,
    options?: Options
): ParsedFeature => {

    let ast: any;

    try {

        const builder = new AstBuilder(uuidv4 as any);
        ast = new Parser(builder).parse(featureText);
    
} catch (err) {

        throw new Error(`Error parsing feature Gherkin: ${err.message}`);
    
}

    let astFeature = collapseRulesAndBackgrounds(ast.feature);

    if (astFeature.language !== "en") {

        astFeature = translateKeywords(astFeature);
    
}

    return {
        "title": astFeature.name,
        "scenarios": parseScenarios(astFeature),
        "scenarioOutlines": parseScenarioOutlines(astFeature),
        "tags": parseTags(astFeature),
        options
    } as ParsedFeature;

};

export const loadFeature = (
    featureFilePath: string,
    options?: Options
) => {

    options = getJestCucumberConfiguration(options);

    const callSite = callsites()[1],
        fileOfCaller = callSite && callSite.getFileName() || "",
     dirOfCaller = dirname(fileOfCaller),
        absoluteFeatureFilePath = resolve(
            options.loadRelativePath
                ? dirOfCaller
                : "",
            featureFilePath
        );

    try {

        const featureText: string = readFileSync(
            absoluteFeatureFilePath,
            "utf8"
        );
        return parseFeature(
featureText,
            options
);
    
} catch (err) {

        if (err.code === "ENOENT") {

            throw new Error(`Feature file not found (${absoluteFeatureFilePath})`);
        
}

        throw err;
    
}

};

export const loadFeatures = (globPattern: string, options?: Options) => {

    const featureFiles = globSync(globPattern);

    return featureFiles.map((featureFilePath) => loadFeature(
featureFilePath,
        options
));

};
