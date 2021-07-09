export const indent = (stringToIndent: string, tabsToIndent: number) => {

    let tabs = '';

    for (let i = 0; i < tabsToIndent; i++) {

        tabs += '\t';

    }

    return stringToIndent.
        split('\n').
        map((line) => {

            if (line !== '') {

                return `${tabs}${line}\n`;

            }

            return '\n';

        }).
        join('');

};
