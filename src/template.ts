export class TemplateProcessor {
    constructor(public variables: Record<string, any>) { }

    setVariable(name: string, value: any) {
        this.variables[name] = value;
    }

    evalPart(expr: string) {
        // avoid direct eval
        const evaluated = new Function(...Object.keys(this.variables), `return ${expr};`)(...Object.values(this.variables));
        if (evaluated === undefined) {
            throw Error(`The expression "${expr}" cannot be evaluated.`);
        }
        return evaluated;
    }

    evalTemplate(template: string) {
        return template.replace(/{{(.*?)}}/g, (match, expr) => this.evalPart(expr));
    }
}
