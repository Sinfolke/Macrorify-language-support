/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
} from "vscode-languageserver/node";
import { Position, TextDocument } from "vscode-languageserver-textdocument";

  
  // Create a connection for the server, using Node's IPC as a transport.
  // Also include all preview / proposed LSP features.
  const connection = createConnection(ProposedFeatures.all);
  
  // Create a simple text document manager.
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  
  let hasConfigurationCapability = false;
  let hasWorkspaceFolderCapability = false;
  let hasDiagnosticRelatedInformationCapability = false;
  
  connection.onInitialize((params: InitializeParams) => {
  
	const capabilities = params.capabilities;
  
	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);
  
	const result: InitializeResult = {
		capabilities: {
		textDocumentSync: TextDocumentSyncKind.Incremental,
		// Tell the client that this server supports code completion.
		completionProvider: {
			resolveProvider: true,
		},
		},
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
		workspaceFolders: {
			supported: true,
		},
		};
	}
	return result;
  });

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	CheckErrors: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { 
	CheckErrors: 1000 
};
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});
interface data {
	name: string;
	type: string;
	scope: Array<number | boolean>;
	wasUsed: boolean;
  }
let data: data[] = [
	// [name:string, type:number/string/array/boolean/null/any, declaredInFunction: boolean, wasUsed: boolean]
];
let functions:Array<string> = [];
function typeCheck(value:string) {
	let type;
	if (value.startsWith('"')) {
		type = '"string"';
	} else if (value.startsWith("[")) {
		type = "[]";
	} else if (Number(value.slice(0, 1)) || value.slice(0, 1) == "0") {
		type = "1";
	} else {
		const keyword = getKeyword(value);
		type = keyword ? keyword : "any";
	}
	return type;
}
function getKeyword(string:string) {
	let parent:string | Array<string> = string.split(".");
	if (parent.length > 1) {
		parent = parent[parent.length - 2];
	} else {
		parent = parent[0];
	}
	parent = parent.trim().replace(";", "");
	const unconstructed = string.split(".");
	for (let i = 0; i < data.length; i++) {
		for (let j = 0; j < unconstructed.length; j++) {
			if (unconstructed[j].trim() == data[i].name.trim()) {
				unconstructed[j] = data[i].type;
			}
		}
	}
	string = unconstructed.join(".");
	if (parent == "Sys") {
		return "Sys";
	} else if (parent == "Map") {
		return "Map";
	} else if (parent == "Math") {
		return "Math";
	} else if (parent == "Point") { // if point without brackets
		return "Point";
	} else if (string.match(/^\s*Point\s*\(.*\)$/)) { // if Point is with brackets
		// Add methods for point with brackets
		return "Point()";
	} else if (string.match(/^\s*SwipePoint\s*\(.*\)$/)) { // if PointSwipe is with brackets
		return "SwipePoint()";
	} else if (parent == 'MultiSwipe') {
		return "MultiSwipe";
	} else if (string.match(/\s*MultiSwipe\s*\(.*\).builder\s*\(.*\)/)) {
		return "MultiSwipe.builder()";
	} else if (parent == 'Touch') {
		return "Touch";
	} else if (string?.match(/\s*Region\s*\(.*\).(findText|findMultiText|findAllText|findAnyText)\s*\(.*\)/)) { // Region with brackets
		return "Region().findText()";
	} else if (string?.match(/\s*Region\s*\(.*\).(find|findMulti|findAll|findAny)\s*\(.*\)/)) { // Region with brackets
		return "Region().find()";
	}  else if (string.match(/\s*Region\s*\(.*\)/)) { // Region with brackets
		return "Region()";
	} else if (parent == 'Region') {
		return "Region";
	} else if (parent == 'Template') {
		return "Template";
	} else if (string.match(/Template.(image|text|color|setDefaultScale)\(.*\)./)) {
		return "Template.image()";
	} else if (string.match(/Setting.builder\s*\(.*\).build\s*\(.*\)/)) {
		return "Setting.builder().build()";
	} else if (string.match(/Setting.builder\s*\(.*\)/)) {
		return "Setting.builder()";
	} else if (parent == "Setting") {
		return "Setting";
	} else if (string.match(/OnScreenText\s*\(.*\)/)) {
		return "OnScreenText()";
	} else if (parent == "OnScreenText") {
		return "OnScreenText";
	} else if (string.match(/DateTime\s*\(.*\)/)) {
		return "DateTime()";
	} else if (parent == "DateTime") {
		return "DateTime";
	} else if (string.match(/TimeSpan\s*\(.*\)/)) {
		return "TimeSpan()";
	} else if (parent == "TimeSpan") {
		return "TimeSpan";
	} else if (string.match(/Stopwatch\s*\(.*\)/)) {
		return "TimeSpan()";
	} else if (string.match(/Clipboard\s*\(.*\)/)) {
		return "Clipboard()";
	} else if (string.match(/Overlay\s*\(.*\)/)) {
		return "Overlay()";
	} else if (parent == "File") {
		return "File";
	} else if (parent == "Cache") {
		return "Cache";
	} else if (parent == "Env") {
		return "Env";
	} else if (string.match(/Version\s*\(.*\)/)) {
		return "Version()";
	} else {
		return "any";
	}
}
let allNames:Array<string> = [];
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	data = [];
	allNames = [];
	functions = [];
	let checkIndex = -1;
	const settings = await getDocumentSettings(textDocument.uri);
	const text = textDocument.getText();
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: []});
	const diagnostics: Diagnostic[] = [];
	const strings = text.split("\n");
	function check(str:string, pattern:RegExp, MatchToEmphasize:RegExp | null, type:number, message: string) {
		const match = pattern.exec(str);
		if (match) {
			addError(str, match, MatchToEmphasize, type, message);
		}
	}
	function addError(
		str: string,
		match: RegExpExecArray,
		MatchToEmphasize: RegExp | null,
		type: number,
		message: string) {
			const diagnosticMessage = message.replace(/\$\$/g, match[0]);
			const diagnosticSeverity = type === 0 ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error;
			let emphasize: RegExpExecArray = match;
			if (MatchToEmphasize != null) {
				const matchFound = MatchToEmphasize.exec(str);
				if (matchFound) {
				emphasize = matchFound;
				}
			}
			const diagnostic: Diagnostic = {
				severity: diagnosticSeverity,
				range: {
				start: textDocument.positionAt(text.indexOf(strings[checkIndex]) + strings[checkIndex].indexOf(str) + emphasize.index),
				end: textDocument.positionAt(text.indexOf(strings[checkIndex]) + strings[checkIndex].indexOf(str) + emphasize.index + emphasize[0].length),
				},
				message: `${diagnosticMessage}`,
				source: 'macr, macrorify',
			};

			diagnostics.push(diagnostic);
		}
	function semicolonCheck(str:string) {
		// Checks whether a line isn't ends with semicolon
		const regex = /^(?!\s*(?:\{\}|\})\s*$)(?!\s*$)(?!.*[;}]\s*$)[\s\S]*?(?<![\s{])$/gm;
		check(str.trim(), regex, null, 0, "It's better to end strings with semicolon");
	}
	function varCheck(str:string) {
		// Defines single "var" keyword
		check(str, /\b(var)\b\s*[;]*\s*$/, null, 1, "Single declaration keyword");
		// Defines let keyword
		check(str, /(?<!var\s)let\b/, null, 1,
		"'let' declaration isn't supported. Use 'var' instead - it has the same properties.");
		// Defines const keyword
		check(str, /(?<!var\s)const\b/, null, 1,
		"'const' declaration isn't supported. Use 'var' instead");
		// Defines nothing after assign sign
		check(str, /^var\s+\S+\s*=\s*(?:;. *)?$/g, null, 1, "You must assign a value");
		// Check for objects
		check(str, /^var\s+\S+\s*=\s*{/gm, /{.*/, 1, "Macrorify syntax doesn't support objects in this format. Use Map instead.");
		// Check whether an assigned value is function
		check(str, /\s*var.*=\s*fun.*/, /fun.*/, 1, "Variable can't contain function as value");
		// Check what type of value was assigned into a variable
		const dataCheckRegex = /^\s*var\s+[^"'[\d][^\s"'=]*\s*=\s*(?!\s*null\b|\s*false\b|\s*true\b)(?:[^"';\n\r]|"[^"\\]*(?:\\.[^"\\]*)*")*\s*;?/;
		if (dataCheckRegex.exec(str)) {
			let wasVarName = false;
			let sliced = str.slice(str.indexOf('=') + 1);
			if (sliced.includes(";")) {
				sliced = sliced.slice(0, sliced.indexOf(";"));
			} else {
				sliced = sliced.slice(0, sliced.indexOf("\n"));
			}
			// Check for keywords
			if (
				!sliced.includes("Setting") && !sliced.includes("Sys") &&
				!sliced.includes("[") && isNaN(Number(sliced.trim().slice(0, 1))) &&
				!sliced.includes("fun") && getKeyword(sliced) == "any") {
				if (sliced.includes(".") || sliced.includes("+")) {
					const splitted = sliced.split(sliced.includes("+") ? "+" : ".");
					for (let i = 0; i < allNames.length; i++) {
						for (let j = 0; j < splitted.length; j++) {
							if (splitted[j].trim() == allNames[i].trim()) {
								wasVarName = true;
								break;
							}
						}
					}
				} else {
					for (let i = 0; i < allNames.length; i++) {
						if (sliced.trim() == allNames[i].trim()) {
							wasVarName = true;
							break;
						}
					}
				}
				if (!wasVarName) {
					check(str, dataCheckRegex, 
					null, 1, "Incorrect data type assigned. It's not variable, keyword, boolean, string, number, array or null.");
				}	
			}
		}
		// Check for assign variable into themselves
		if (/\bvar\s+(\w+)\s*=\s*\1\s*(?:;|$)/.exec(str)) {
			check(str, /\bvar\s+(\w+)\s*=\s*\1\s*(?:;|$)/, /(?<==)([^;]+)(?=;|$)/, 1, "Incorrect value assigned on declaration");
		} else if (/\b(\w+)\s*=\s*\1\s*(?:;|$)/.exec(str)) {
			const name = str.slice(0, str.indexOf("=")).trim();
			for (let i = 0; i < allNames.length; i++) {
				if (allNames[i].trim() == name) {
					check(str, /\b(\w+)\s*=\s*\1\s*(?:;|$)/, /(?<==)([^;]+)(?=;|$)/, 0, "Changing variable value to the same value");
					break;
				} else if (i + 1 == allNames.length) {
					check(str, /(?<==)([^;]+)(?=;|$)/, null, 1, "Variable is not declared");
				}
			}
		}
		// Check for datatype 'undefined'
		check(str, /^var\s+\S+\s*=\s*undefined/gm, /=\s*undefined/, 1, "Macrorify syntax doesn't support undefined");
		// Check for incorrect quotes
		check(str, /^\s*var\s+\S+\s*=\s*[`']\s*.*\s*$/gm, null, 1, "Macrorify syntax supports double quotes only");
	}
	function commonExpressionCheck(str:string) {
		check(str, /&&/, /&&/, 1, "Use 'and' instead");
		check(str, /\|\|/, /\|\|/, 1, "Use 'or' instead");
		check(str, /===/, null, 1, "Three equal signes are not supported. Use '==' instead with type checking or compiling");
		check(str, /!==/, null, 1, "Three equal signes are not supported. Use '!=' instead with type checking or compiling");
		check(str, /\+=/, /\+=/, 1, 
		"Such increament is not supported. You can only declare a variable with a same value and increase it then.\n" +
		"For example: i = i + 1");
		check(str, /-=/, /-=/, 1, 
		"Such decreament is not supported. You can only declare a variable with a same value and decrease it then.\n" +
		"For example: i = i - 1");
		check(str, /\/=/, /\/=/, 1, 
		"Such divide is not supported. You can only declare a variable with a same value and divide it then.\n" +
		"For example: i = i / 2");
		check(str, /\*=/, /\*=/, 1, 
		"Such multiple is not supported. You can only declare a variable with a same value and multiple it then.\n" +
		"For example: i = i * 2");
		check(str, /\*\*=/, /\*\*=/, 1, "You can't raise a value by this way. Write it in standard way:\n" +
		"i = i * i * i... * n");
		check(str, /\+\+/, /\+\+/, 1, "This increament is not supported.");
		check(str, /--/, /--/, 1, "This decreament is not supported.");
		check(str, /(`.*`|'.*')/, null, 1, "Unsupported quotes");
	}
	function conditionCheck(str:string) {
		// Empty statement
		check(str, /^\s*(if|while)\s*\(\)\s*\{.*\}?\s*$/gm, null, 1, "Empty condition");
		// Statement without brackets
		check(str, /^\s*if\s*\(.*\)\s*[^{]+$/gm, null, 1, "Statement requires braces after condition");
		check(str, /^\s*do\s*[^{}]+$/, null, 1, "Statement requires braces after condition");
		if (blocksData[blocksData.length - 1] != "doWhile") {
			check(str, /^\s*while\s*\(.*\)\s*[^{]+$/gm, null, 1, "Statement requires braces after condition");
		}
		// Always true
		check(str, /\s*if\s*\(\s*(true|[1-9][0-9]*|-[1-9][0-9]*)\s*\).*/g, /(\s*.*\s*)/, 0, "Condition is always true and doesn't have any sense");
		check(str, /\s*while\s*\(\s*(true|[1-9][0-9]*|-[1-9][0-9]*)\s*\).*/g, /(\s*.*\s*)/, 1, "Condition is always true and will cause infinity loop");
		// Always false
		check(str, /\s*(if|while)\s*\(\s*(false|[0]+|""|null)\s*\).*/g, /false/, 0, "Condition is always false and will never be executed");
		// Only one equal sign
		check(str, /\s*(if|while)\s*\(\s*["[\]0-9a-z]+\s*=\s*["[\]0-9a-z]+\s*\)/, /=/, 1, "'=' or '!' excepted.");
		// Includes !>
		check(str, /\s*(if|while)\s*\(\s*["[\]0-9a-z]+\s*!>\s*["[\]0-9a-z]+\s*\)/, /!>/, 1, "Use <= instead");
		// Includes !<
		check(str, /\s*(if|while)\s*\(\s*["[\]0-9a-z]+\s*!<\s*["[\]0-9a-z]+\s*\)/, /!</, 1, "Use >= instead");
		// Includes =!
		check(str, /\s*(if|while)\s*\(\s*["[\]0-9a-z]+\s*=!\s*["[\]0-9a-z]+\s*\)/, /!</, 1, "Move '!' before '='");
		// Includes <!
		check(str, /\s*(if|while)\s*\(\s*["[\]0-9a-z]+\s*(<!|>!|<=!|>=!)\s*["[\]0-9a-z]+\s*\)/, /!</, 1, "Operators are fully incorrect");
		check(str, /\s*(if|while)\s*\(\s*["[\]0-9a-z]+\s*(>|<|>=|<=|!=|==)\s*\1\s*\)/, /!</, 1, "Operators are fully incorrect");
	}
	function funClassCheck(str:string) {
		const name = str.includes('fun') ? "function" : "class";
		check(str, /function/, null, 1, "You must declare the function by 'fun' keyword instead");
		// single keyword
		check(str, /\b(fun|class)\b\s*[;]*\s*$/, null, 1, `Single keyword`);
		// skipped name
		check(str, /\s*(fun|class)\s*\(/, /\s*\(/, 1, `Skipped ${name} name`);
		// Incorrect name
		check(str, /\s*(fun|class)\s+([^A-Za-z_]|[^A-Za-z_][\w]+|[A-Za-z_][^\w]+)*\s*\(.*/, /((?<=fun\s*)|(?<=class\s*))(.*?)\s*\(/, 1,
		`Incorrect ${name} name. It can include only text characters, numbers or '_' and must starts with text character`);
		// Function without block declaration
		check(str, /^\s*(fun|class)\s*.*\(.*\)\s*[^{]+$/, /\).*/, 1, "Block declaration expected");
	}
	function forCheck(str:string) {
		check(str, /^\s*for\s*[^(]$/, /for/, 1, "Single for keyword");
		// Units ends with more than one semicolon
		check(str, /\s*for\s*\((.*;)[;]+|(.*;)(.*;)[;]+\)/, null, 1, "Units must ends with only one semicolon");
		// Last unit ends with semicolon
		check(str, /\s*for\s*\((.*;)(.*;)(.*;)\)/, null, 1, "Last unit mustn't ends with semicolon");
		// One of unit isn't ends with semicolon
		if (/\s*for\s*\(/.exec(str)) { // Check whether a string is for loop declaration
			if (str.split(";").length - 1 < 2) {
				const match = /\(.*\)/.exec(str);
				if (match) {
					addError(str, match, null, 1, "First two units must ends with semicolon");
				}
			}
		}
		// Check block declaration
		check(str, /^\s*for\s*\(.*\)\s*[^{]+$/, /\).*/, 1, "Block declaration expected");
		if (/\s*for\s*\(\s*var.*\)/.exec(str)) { // Checks whether first unit is variable declaration
			// Cutting variable from a cycle and sending on check
			varCheck(str.slice(str.indexOf("(") + 1, str.indexOf(";")));
		} else {
			// Sending that there should be declared variable
			// But because it's' be syntax error sended as Warning
			const match = /for/.exec(str);
			if (match) {
				addError(str, match, /(?<=\()[^;]+/, 0, "Seems skipped variable declaration");
			}
		}
		// Sends condition on check
		const firstSemicolon = str.indexOf(";") + 1;
		const secondSemicolon = str.indexOf(";", firstSemicolon);
		const condition = str.slice(firstSemicolon, secondSemicolon); // Begins after first semicolon until second
		check(condition, /^\s*(true|[1-9]+|-[1-9]+)\s*$/, null, 1, "Condition is always true. It will cause infinity loop");
		check(condition, /^\s*(false|[0]+|-[0]+|null)\s*$/, null, 0, "Condition is always false and the loop will never be executed");
		check(condition, /^["[\]0-9a-z]+\s*=\s*["[\]0-9a-z]+\s*$/, /=/, 1, "'=' or '!' expected");
		check(condition, /^["[\]0-9a-z]+\s*!>\s*["[\]0-9a-z]+\s*$/, /!>/, 1, "Use <= instead");
		check(condition, /^["[\]0-9a-z]+\s*!<\s*["[\]0-9a-z]+\s*$/, /!</, 1, "Use >= instead");
		check(condition, /^["[\]0-9a-z]+\s*=!\s*["[\]0-9a-z]+\s*$/, /=!/, 1, "Move '!' before '='");
		check(condition, /^["[\]0-9a-z]+\s*(<!|>!|<=!|>=!)\s*["[\]0-9a-z]+\s*$/, /(<!|>!|<=!|>=!)/, 1, "Operators are fully incorrect");
	}
	// Run all checks
	const funBeginIn:Array<number> = [];
	const blcBeginIn:Array<number> = [];
	const funEndInWaiters:Array<Array<number>> = [];
	const blcEndInWaiters:Array<Array<number>> = [];
	const blocksData:Array<string> = [];
	for (const str of strings) {
		checkIndex++;
		if (str.replace(/ /g, "").startsWith("//") || strings[strings.length - 1] == str) {
			continue;
		}
		let notClogged = str.replace(/"[^"]*"/g, "");
		if (notClogged.includes("//")) {
			notClogged = notClogged.slice(0, notClogged.indexOf("//"));
		}
		if (notClogged.startsWith("fun")) {
			funEndInWaiters.push([]);
			funBeginIn.push(checkIndex);
			const parameters = notClogged.slice(notClogged.indexOf("(") + 1, notClogged.indexOf(")")).trim().split(",");
			const funName = notClogged.slice(notClogged.indexOf("fun") + 3, notClogged.indexOf("("));
			functions.push(funName);
			parameters.forEach(parameter => {
				data.push({ name: parameter, type: "any", wasUsed: false, scope: [checkIndex]});
				funEndInWaiters[funEndInWaiters.length - 1].push(data.length - 1);
				allNames.push(parameter);
			});
			blocksData.push("fun");
		} else if (notClogged.includes("do") || notClogged.includes("{")) {
			blcEndInWaiters.push([]);
			blcBeginIn.push(checkIndex);
			blocksData.push(notClogged.includes("do") ? "doWhile" : "Block");
		}
		if (notClogged.includes("}")) {
			const lastBl = blocksData[blocksData.length - 1];
			if (lastBl == "doWhile" || lastBl == "Block") {
				const lastBlc = blcEndInWaiters[blcEndInWaiters.length - 1]; 
				lastBlc.forEach(num => {
					data[num].scope[1] = checkIndex;
				});
				blcEndInWaiters.pop();
				blcBeginIn.pop();
			} else {
				const lastFun = funEndInWaiters[funEndInWaiters.length - 1];
				lastFun.forEach(num => {
					data[num].scope[1] = checkIndex;
				});
				funBeginIn.pop();
				funEndInWaiters.pop();
			}
			blocksData.pop();
		}
		if (notClogged.trim().startsWith("var")) {
			let name, type, value;
			const trimedStr = notClogged.trim();
			if (!trimedStr.includes("=")) {
				const symbol = trimedStr.includes(";") ? ";" : "\n";
				name = trimedStr.slice(trimedStr.indexOf("var") + 4, trimedStr.indexOf(symbol));
				type = "null";
			} else {
				name = trimedStr.slice(3, trimedStr.indexOf("="));
				value = str.slice(str.indexOf("=") + 1).replace(/^\s+/, "");
				type = typeCheck(value);
			}
			if (allNames.includes(name)) {
				data[allNames.indexOf(name)].type = type;
			} else {
				allNames.push(name);
				if (blocksData.length > 0) {
					const last = blocksData[blocksData.length - 1];
					if (last == "Block" || last == "doWhile") {
						data.push({ name: name, type: type, wasUsed: false, scope: [blcBeginIn[blcBeginIn.length - 1]]});
						blcEndInWaiters[blcEndInWaiters.length - 1].push(data.length - 1);
					} else if (last == "fun") {
						data.push({ name: name, type: type, wasUsed: false, scope: [funBeginIn[funBeginIn.length - 1]]});
						funEndInWaiters[funEndInWaiters.length - 1].push(data.length - 1);
					}
				} else {
					data.push({ name: name, type: type, wasUsed: false, scope: [false]});
				}
			}
		}
		semicolonCheck(notClogged);
		varCheck(notClogged);
		conditionCheck(notClogged);
		commonExpressionCheck(notClogged);
		funClassCheck(notClogged);
		forCheck(notClogged);
	}
	if (diagnostics.length > 0) {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics});
	}
}
  

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});
// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	// Create intellisense array
	const intellisense: CompletionItem[] = [];
	const document = documents.get(_textDocumentPosition.textDocument.uri);
	const position = _textDocumentPosition.position;
	let line = document?.getText({
		start: { line: position.line, character: 0 },
		end: { line: position.line, character: position.character }
	});
	// Check whether a user declares variable
	const newL = line?.replace(/ /g, "");
	if (newL?.startsWith('var') && !newL.includes("=")) {
		return [];
	}
	// Check for lines that shouldn't get intellisense
	if (line?.replace(/ /g, "").startsWith("//") || /['"][^'"]*$/.test(line || "")) {
		return [];
	}
	function add(arr:Array<any>, type:CompletionItemKind) {
		for (let i = 0; i < arr.length; i++) {
			const splitted = arr[i].split("::");
			if (splitted.length > 1) {
				intellisense.push({
					label: splitted[1],
					kind: type,
					data: splitted[2],
				});
			} else {
				intellisense.push({
					label: arr[i],
					kind: type,
					data: arr[i],
				});
			}
		}
	}
	function stringMethods() {
		add([
			'charAt', 'compare', 'concat',
			'contains', 'endsWith', 'startsWith',
			'toArray', 'length', 'indexOf', 'lastIndexOf',
			'matches', 'replace', 'replaceAll', 'split',
			'subString', 'toLowerCase', 'toUpperCase',
			'trim', 'join',
		], CompletionItemKind.Method);
	}
	function arrayMethods() {
		add([
			'push', 'pop', 'unshift', 'shift',
			'insertAt', 'insertRange', 'removeAt',
			'removeRange', 'slice', 'concat', 
			'clear', 'clone',
		], CompletionItemKind.Method);
	}
	function numberMethods() {
		add(['parse'], CompletionItemKind.Method);
	}
	function sysMethods() {
		add([
			'alert', 'stop', 'err', 'noti', 
			'playMedia', 'toast', 'log', 
			'info', 'currentTime', 
			'currentVersion', 'sdk',
			'lang', 'darkMode', 'globalAction',
			'dpi', 'openApp', 'wake', 
		], CompletionItemKind.Method);
	}
	function mapMethods() {
		add([
			'entries', 'keys', 'values',
			'containsKey', 'containsValue',
			'get', 'put', 'putAll',
			'putIfAbsent', 'remove',
			'replace', 'size', 'isEmpty',
		], CompletionItemKind.Method);
	}
	function mathMethods() {
		add([
			'E', 'pl', 'cos', 'sin', 'tan',
			'acos', 'asin', 'atan', 'atan2', 'sqrt',
			'cbrt', 'hypot', 'ceil', 'floor', 'round',
			'exp', 'pow', 'log', 'log10', 'log1p',
			'abs', 'max', 'min', 'random', 'toDegrees',
			'toRadians', 'randomRange'
		], CompletionItemKind.Method);
	}
	function pointMethods(type:number) {
		if (type == 0) {
			add(['scale'], CompletionItemKind.Method);
			add(['LEFT', 'TOP', 'RIGHT', 'BOTTOM'], CompletionItemKind.Constant);
		} else {
			add(['getX','getY', 'offset', 'noScale'], CompletionItemKind.Method);
		}
	}
	function SwipePointMethods() {
		add(['getX','getY', 'getHold', 'getSpeed'], CompletionItemKind.Method);
	}
	function multiSwipeMethods(type:number) {
		if (type == 0) {
			add(['builder'], CompletionItemKind.Method);
		} else if (type == 1) {
			add(['add','setSParam', 'build'], CompletionItemKind.Method);
		}
	}
	function TouchMethods() {
		add(['down', 'up', 'move', 'dispatch'], CompletionItemKind.Method);
	}
	function regionMethods(type:number) {
		if (type == 0) {
			add(['LEFT', 'TOP', 'RIGHT', 'BOTTOM'], CompletionItemKind.Constant);
			add(['deviceReg', 'macroReg', 'scale', 'highlightOff'], CompletionItemKind.Method);
		} else if (type == 1) {
			add([
				'getX','getY', 'getW', 'getH', 'getMiddlePoint',
				'getLastMatch', 'getLastMatches', 'setX',
				'setY', 'setW', 'setH', 'noScale', 'left', 'top',
				'right', 'horizontal', 'vertical', 'middle', 'pad',
				'leftPixel', 'topPixel', 'rightPixel', 'bottomPixel',
				'horizontalPixel', 'verticalPixel', 'middlePixel',
				'padPixel', 'offset', 'find', 'findMulti', 'findAll',
				'findAny', 'click', 'clickMulti', 'clickAll', 'clickAny',
				'wait', 'waitAll', 'findText', 'findMultiText', 'findAllText',
				'findAnyText', 'clickText', 'clickMultiText', 'clickAllText',
				'clickAnyText', 'waitText', 'waitAllText', 'highlight', 'highlightOff',
				'capture', 'read', 'readPlain', 'readAsString', 'readAsNumber'
			], CompletionItemKind.Method);
		} else if (type == 2) {
			add(['getRegion', 'getPoint', 'getScore', 'click'], CompletionItemKind.Method);
		} else if (type == 3) {
			add(['getRegion', 'getPoint', 'getText', 'click'], CompletionItemKind.Method);
		}
	}
	function TemplateMethods(type:number) {
		if (type == 0) {
			add([
				'image', 'color', 'text'
			], CompletionItemKind.Method);
		} else {
			add([
				'value', 'mScore', 'method',
				'segment', 'mask', 'offset',
				'width', 'height', 'scale',
				'rotate', 'gray', 'threshold', 
				'build'
			], CompletionItemKind.Method);
		}
	}
	function settingMethods(type:number) {
		if (type == 0) {
			add([
				'get', 'set', 'remove', 'clear',
				'save', 'loadVars', 'setDialog', 'show',
				'builder'
			], CompletionItemKind.Method);
		} else if (type == 1) {
			add([
				'add', 'group', 'groupEnd',
				'setTitle', 'setPositiveButton',
				'setNegativeButton', 'build'
			], CompletionItemKind.Method);
		} else {
			add(['show', 'preview'], CompletionItemKind.Method);
		}
	}
	function OnScreenText(type:number) {
		if (type == 0) {
			add([
				'getX', 'getY', 'getW', 'getH',
				'getText', 'getTextColor',
				'getBackgroundColor', 'getRegion',
				'getClickState', 'getMoveState',
				'getResizeState', 'setX', 
				'setY', 'setW', 'setH',
				'setText', 'setTextColor',
				'setBackgroundColor', 'setBackgroundImage',
				'setTextSize', 'moveable', 'clickable',
				'resizable', 'noScale', 'show', 'hidden', 'off'
			], CompletionItemKind.Method);
		} else {
			add(['off'], CompletionItemKind.Method);
		}
	}
	function dateTimeMethods(type:number) {
		if (type == 0) {
			add([
				'date', 'year', 'month', 'day',
				'dayOfWeek', 'dayOfYear', 'hour',
				'minute', 'second', 'millis',
				'totalMillis', 'add', 'addYears',
				'addMonths', 'addDays', 'addHours',
				'addMinutes', 'addSeconds', 'addMillis',
				'sub', 'format'
			], CompletionItemKind.Method);
		} else {
			add([
				'parse', 'fromUnixMillis', 'timeZoneOffset'
			], CompletionItemKind.Method);
		}
	}
	function TimeSpanMethods(type:number) {
		if (type == 0) {
			add([
				'days', 'hours', 'minutes',
				'seconds', 'millis', 'totalDays',
				'totalHours', 'totalMinutes',
				'totalSeconds', 'totalMillis',
				'isNegative', 'isZero', 'add',
				'addDays', 'addHours', 'addMinutese',
				'addSeconds', 'addMillis', 'sub',
				'mul', 'div', 'format'
			], CompletionItemKind.Method);
		} else {
			add([
				'fromDays', 'fromHours', 'fromMinutes',
				'fromSeconds'
			], CompletionItemKind.Method);
		}
	}
	function Stopwatch() {
		add([
			'start', 'stop', 'reset',
			'restart', 'elapsed',
			'isRunning', 'isElapsed'
		], CompletionItemKind.Method);
	}
	function Clipboard() {
		add(['clear', 'copy', 'past',], CompletionItemKind.Method);
	}
	function Overlay() {
		add([
			'setOpacity', 'getState', 'setState',
			'getRegion', 'move', 'spin'
		], CompletionItemKind.Method);
	}
	function fileMethods() {
		add(['writeText', 'writeLines', 'appendText',
		'appendLines', 'readText', 'readLines', 
		'separator', 'copy', 'delete', 'exists',
		'isDir', 'mkdirs', 'list'
		], CompletionItemKind.Method);
	}
	function cache() {
		add([
			'screen', 'screenOff', 'region', 
			'regionOff', 'clearImage'
		], CompletionItemKind.Method);
	}
	function env() {
		add([
			'macroX', 'setMacroX', 'macroY', 
			'setMacroY', 'deviceX', 'deviceY',
			'deviceW', 'deviceH', 'scale',
			'setScale', 'setCompareWidth', 'isDebug',
			'setDebug', 'setMessageDone', 'setMessageStop',
			'setMessageError', 'setMacroCutouts', 'setDeviceCutouts',
			'cutouts'
		], CompletionItemKind.Method);
	}
	function Version() {
		add([
			'major', 'minor', 'build', 'revision',
			'compare'
		], CompletionItemKind.Method);
	}
		if (line?.includes(".")) {
			// Include methods
			let unconstructed:Array<any>;
			if (line) {
				unconstructed = line.split(".");
				if (unconstructed.length > 1) {
					if (unconstructed[0].includes("var") && unconstructed[0].includes("=")) {
						unconstructed[0] = unconstructed[0].slice(unconstructed[0].indexOf("=") + 1);
					}
					for (let i = 0; i < data.length; i++) {
						for (let j = 0; j < unconstructed.length; j++) {
							if (unconstructed[j].trim() == data[i].name.trim()) {
								unconstructed[j] = data[i].type;
							}
						}
					}
					line = unconstructed.join(".");
				}
			} else {
				return [];
			}
			let parent:string;
			if (unconstructed.length > 1) {
				parent = unconstructed[unconstructed.length - 2].trim();
			} else {
				parent = unconstructed[0].trim();
			}
			if (parent.match(/\[.*\]/)) {
				arrayMethods();
			} else if (parent.match(/".*"/)) {
				stringMethods();
			} else if (parent.match(/[0-9]/)) {
				numberMethods();
			} else if (parent == "Sys") {
				sysMethods();
			} else if (parent == "Map") {
				mapMethods();
			} else if (parent == "Math") {
				mathMethods();
			} else if (parent == "Point") { // if point without brackets
				pointMethods(0);
			} else if (line.match(/\s*Point\s*\(.*\)./)) { // if Point is with brackets
				// Add methods for point with brackets
				pointMethods(1);
			} else if (line.match(/\s*SwipePoint\s*\(.*\)./)) { // if PointSwipe is with brackets
				SwipePointMethods();
			} else if (parent == 'MultiSwipe') {
				multiSwipeMethods(0);
			} else if (line.match(/\s*MultiSwipe\s*\(.*\).builder\s*\(.*\)./)) {
				multiSwipeMethods(1);
			} else if (parent == 'Touch') {
				TouchMethods();
			} else if (parent == 'Region') {
				regionMethods(0); // 
			} else if (line?.match(/\s*Region\s*\(.*\).(findText|findMultiText|findAllText|findAnyText)\s*\(.*\)./)) { // Region with brackets
				regionMethods(3);
			} else if (line?.match(/\s*Region\s*\(.*\).(find|findMulti|findAll|findAny)\s*\(.*\)./)) { // Region with brackets
				regionMethods(2);
			} else if (line.match(/\s*Region\s*\(.*\).$/)) { // Region with brackets
				regionMethods(1);
			} else if (parent == "Template") { // Region with brackets
				TemplateMethods(0);
			} else if (line.match(/Template.(image|text|color|setDefaultScale)\(.*\)./)) {
				TemplateMethods(1);
			} else if (parent == "Setting") {
				settingMethods(0);
			} else if (line.match(/Setting.builder\s*\(.*\).build\s*\(.*\)./)) {
				settingMethods(2);
			} else if (line.match(/Setting.builder\s*\(.*\)./)) {
				settingMethods(1);
			} else if (line.match(/OnScreenText\s*\(.*\)./)) {
				OnScreenText(0);
			} else if (parent == "OnScreenText") {
				OnScreenText(1);
			} else if (line.match(/DateTime\s*\(.*\)./)) {
				dateTimeMethods(0);
			} else if (parent == "DateTime") {
				dateTimeMethods(1);
			} else if (line.match(/TimeSpan\s*\(.*\)./)) {
				TimeSpanMethods(0);
			} else if (parent == "TimeSpan") {
				TimeSpanMethods(1);
			} else if (line.match(/Stopwatch\s*\(.*\)./)) {
				Stopwatch();
			} else if (line.match(/Clipboard\s*\(.*\)./)) {
				Clipboard();
			} else if (line.match(/Overlay\s*\(.*\)./)) {
				Overlay();
			} else if (parent == "File") {
				fileMethods();
			} else if (parent == "Cache") {
				cache();
			} else if (parent == "Env") {
				env();
			} else if (line.match(/Version\s*\(.*\)./)) {
				Version();
			} else {
				sysMethods();
				mapMethods();
				mathMethods();
				SwipePointMethods();
				TouchMethods();
				Stopwatch();
				Clipboard();
				Overlay();
				fileMethods();
				cache();
				env();
				Version();
				for (let i = 0; i < 2; i++) {
					pointMethods(i);
					multiSwipeMethods(i);
					TemplateMethods(i);
					OnScreenText(i);
					dateTimeMethods(i);
					TimeSpanMethods(i);
				}
				for (let i = 0; i < 4; i++) {
					regionMethods(i);
					settingMethods(i);
				}
				arrayMethods();
				stringMethods();
				numberMethods();
			}
			// Get methods for build-in functions
        } else {
			// Include regular keywords
			const posInDoc = _textDocumentPosition.position.line;
			data.forEach(el => {
				if (el.scope[0] == false || !posInDoc) {
					intellisense.push({
						label: el.name.trim(),
						kind: CompletionItemKind.Variable,
						insertText: el.name.trim(),
						data: 'varNameIntellisense',
					});
				} else if (typeof el.scope[0] == "number" && typeof el.scope[1] == "number"){
					if (el.scope[0] <= posInDoc && el.scope[1] >= posInDoc) {
						intellisense.push({
							label: el.name.trim(),
							kind: CompletionItemKind.Variable,
							insertText: el.name.trim(),
							data: 'varNameIntellisense',
						});
					}
				}
			});
			functions.forEach(fun => {
				intellisense.push({
					label: fun.trim(),
					kind: CompletionItemKind.Function,
					insertText: `${fun.trim()}()`,
					data: 'funNameIntellisense',
				});
			});
			add(['var'], CompletionItemKind.Variable);
			add([
				'Sys', 'fun', 'out', 'in', 'return',
				'wait', 'swipe', 'click', 'Map', 'Math',
				'Point', 'SwipePoint', 'MultiSwipe', 'MultiSwipe.builder()',
				'Touch', 'Region', "Template", 'Setting',
				'OnScreenText', 'DateTime', 'TimeSpan',
				'Stopwatch', 'Clipboard', 'Overlay',
				'File', "Cache", "Env", "Version"
			], CompletionItemKind.Function);
			add(['class'], CompletionItemKind.Class);
			add(['if', 'while', 'do','for'], CompletionItemKind.Keyword);
		}
        return intellisense;
    }
);

// This handler resolves additional information for the item selected in
// the completion list.
type HintsDoc = {
	[key: string]: [string, string[]];
  };
  
  function compileArray(arr: string[]): string {
	let str = "";
	arr.forEach(el => {
		str += `${el}\n`;
	});
	return str;
  }
  const hintsDoc: HintsDoc = {
	// REGULAR KEYWORDS
	var: ["Variable declaration", [
		"Declare variable",
		"\tvar i = \"hello\"",
		"You can also declare this variable within blocks and it will be shown beyound",
		"if (true) {",
		"\tvar i = 0",
		"}",
		"Sys.alert(i) // 0"
	]],
	if: ["Condition declaration", [
		"You can declare condition by \"if\" keyword.",
		"var i = 1;",
		"if (i == 0) {",
		"\t// On true",
		"\tSys.alert(\"i is equals zero\");",
		"}",
		"Above is example of single condition",
		"var i = 94",
		"if (i == 0) {",
		"\t// On true",
		"\tSys.alert(\"i is equals zero\");",
		"} else {",
		"\t// On false",
		"\tSys.alert(\"i is not equals zero\")",
		"}",
		"This is if condition, whre \"else\" condition is executed on false",
		"var i = 1",
		"if (i == 0) {",
		"\t// On true",
		"\tSys.alert(\"i is equals zero\");",
		"} else if (i == 1) {",
		"\t// if i isn't equal zero and equal 1",
		"\tSys.alert(\"i isn't equals zero and equals one\");",
		"} else {",
		"\tSys.alert(\"i is not equals both zero and one\");",
	]],
	while: ["While loop", [
		"var arr = [1, 2, 3, 4, 5]",
		"while(arr.length > 0) {",
		"\tarr.pop()",
		"}",
		"It executes until a specific condition will be false",
		"In common the actions inside loop will be executed unless condition is false",
	]],
	for: ["For loop", [
		"for (var i = 0; i <= 15; i++) {",
		"\tSys.toast(i);",
		"}",
		"The first position is declaration variables",
		"The second is condition that checks per time before loop execution",
		"The third place is an action that executed each time after loop, usually there increases iterator",
		"The action at brackets is what will be executed",
		"",
		"In our case it will log fifteenth times numbers from 0 to 15",
	]],
	fun: ["Function declaration", [
		"fun increase(number) {",
		"\treturn number + 1",
		"}",
		"",
		"var num = 0; // for now number is zero",
		"num = increase(num) // increases number at one",
		"",
		"Firstly we declare the function with name \"increase\",",
		"as parameter is \"number\".",
		"Parameters are variables that receives values when a function is called",
		"We can separate parameters by comma to let funciton have a few",
		"Parameters have same properties as regular variable and available only within funciton",
		"Then we returned number + 1 (mean number, given by user and plus one)",
		"the return keyword indicates what value a function should back",
		"Then we declared \"num\" variable and assigned 0",
		"Then we assigned into \"num\" returned value by \"increase\" funciton",
	]],
	class: ["Class declaration", [
		"class myClass(var1, var2) {",
		"\tinit(var1, var2) { // constructor",
		"\t\tthis.a = var1;",
		"\t\tthis.b = var2",
		"\t\tthis.c = \"hi\"",
		"\t}",
		"\tmethod(arg1) {",
		"\t\t// Execute something",
		"\t}",
		"}",
		"Classes are made to contain specific variables and their values, usually also methods to manage with them",
		"No explanation here as because you should understand classes work to use (and better learn not via vscode hints)",
	]],
	// Array methods
	push: ["Array's methods", [
		"Push method adds to end of an array specified value",
		"\tvar arr = [1, 2, 3]",
		"\tarr.push(4)",
		"\tSys.alert(arr) // [1, 2, 3, 4]",
	]],
	pop: ["Array's methods", [
		"Pop method removes last value from an array",
		"\tvar arr = [1, 2, 3]",
		"\tarr.pop()",
		"\tSys.alert(arr) // [1, 2]",
	]],
	shift: ["Array's methods", [
		"Shift method removes first element from an array",
		"\tvar arr = [1, 2, 3]",
		"\tarr.shift()",
		"\tSys.alert(arr) // [2, 3]",
	]],
	unshift: ["Array's methods", [
		"Unshift method adds specified value to a first index of an array",
		"\tvar arr = [1, 2, 3]",
		"\tarr.unshift(0)",
		"\tSys.alert(arr) // [0, 1, 2, 3]",
	]],
	// Sys methods
	alert: ["Outputs a message", [
		"Sys.alert(\"hello\");",
		"This will create a message for user with the specified content.",
	]],
	// Variable names intellisense
	varNameIntellisense: ["Variable", ["This variable was declared in the code."]],
	funNameIntellisense: ["Function", ["This function was declared in the code."]],
  };
  
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	if (item.data in hintsDoc) {
		const detail = hintsDoc[item.data][0];
		const doc = hintsDoc[item.data][1];
		item.detail = detail ? detail : "no info";
		item.documentation = doc ? compileArray(doc) : "no info";
	} else {
		item.detail = "no info";
		item.documentation = " ";
	}
	return item;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();