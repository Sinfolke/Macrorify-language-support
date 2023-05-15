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
import { type } from 'os';
import { connect } from 'http2';


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
	scope: Array<number>;
	wasUsed: boolean;
	value: string;
	reassignValue: Array<string>;
	reassignType: Array<string>
}
export let data: data[] = [];
let functions:Array<string> = [];
let classes:Array<string> = [];
function typeCheck(value:string) {
	let type;
	if (value.startsWith('"')) {
		type = '"string"';
	} else if (value.startsWith("[")) {
		type = "[]";
	} else if (Number(value.slice(0, 1)) || value.slice(0, 1) == "0") {
		type = "number";
	} else if (value.slice(0, 4) == "true" || value.slice(0, 5) == "false") {
		type = "boolean";
	} else if (value.slice(0, 4) == "null") {
		type = "null";
	} else {
		const unconstructed = value.trim().split(".");
		type = getKeyword(unconstructed[0]);
		if (type != "any") {
			for (let i = 1; i < unconstructed.length; i++) {
				type += `.${unconstructed[i].replace(";", "")}`;
			}
		}
	}
	connection.console.log(`received type for ${value} : ${type}`);
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
	} else if (string.match(/^\s*Sys.info.screen$/)) { // if PointSwipe is with brackets
		return "Sys.info.screen";
	} else if (string.match(/^\s*Sys.info.dev$/)) { // if PointSwipe is with brackets
		return "Sys.info.dev";
	} else if (string.match(/^\s*Sys.info.battery$/)) { // if PointSwipe is with brackets
		return "Sys.info.battery";
	} else if (string.match(/^\s*Sys.info.memory$/)) { // if PointSwipe is with brackets
		return "Sys.info.memory";
	} else if (string.match(/^\s*Sys.info$/)) { // if PointSwipe is with brackets
		return "Sys.info";
	} else if (string.match(/^\s*Map\s*\(.*\)$/)) {
		return "Map()";
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
		return "Stopwatch()";
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
	classes = [];
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
				message: diagnosticMessage,
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
		"Syntax doesn't support constants at all, use 'var' instead");
		// check name
		check(str, /\s*var\s+\s*([^a-z-A-Z]|[-])/, null, 1, "Incorrect name beginning. It must begins with regular letter");
		check(str, /\s*var\s+\s*([a-z-A-Z]([^a-z-A-Z0-9_=; ]+|[-]+)|[a-z-A-Z][a-z-A-Z0-9_]+([^a-z-A-Z0-9_=; ]+|[-]))/, null, 1, "Incorrect name. It must contain only regular letters and numbers");
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
							if (splitted[j].trim() == allNames[i].trim() || splitted[j].trim() == functions[j].trim()) {
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
						} else if (functions && sliced.includes(functions[i]) && sliced.match(/\(.*\)/)) {
							wasVarName = true;
							break;
						}
					}
				}
				if (!wasVarName) {
					check(str, dataCheckRegex, 
					null, 1, "Incorrect data type assigned. It's not variable, boolean, string, number, array, called function or null.");
				}	
			}
		}
		// Check for assign variable into themselves
		if (/\bvar\s+(\w+)\s*=\s*\1\s*(?:;|$)/.exec(str)) {
			check(str, /\bvar\s+(\w+)\s*=\s*\1\s*(?:;|$)/, /(?<==)([^;]+)(?=;|$)/, 1, "Incorrect value on declaration");
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
	}
	function commonExpressionCheck(str:string) {
		check(str, /&&/, null, 1, "Use 'and' instead");
		check(str, /\|\|/, null, 1, "Use 'or' instead");
		check(str, /===/, null, 1,
		"Three equal signes are not supported. You can only use '==' or '!=' with type checking yourself");
		check(str, /!==/, null, 1, 
		"Three equal signes are not supported. You can only use '==' or '!=' with type checking yourself");
		check(str, /\+=/, null, 1, 
		"Such increament is not supported. You can only declare a variable with a same value and increase it then.\n" +
		"For example: i = i + 1");
		check(str, /-=/, null, 1, 
		"Such decreament is not supported. You can only declare a variable with a same value and decrease it then.\n" +
		"For example: i = i - 1");
		check(str, /\/=/, null, 1, 
		"Such divide is not supported. You can only declare a variable with a same value and divide it then.\n" +
		"For example: i = i / 2");
		check(str, /\*=/, null, 1, 
		"Such multiple is not supported. You can only declare a variable with a same value and multiple it then.\n" +
		"For example: i = i * 2");
		check(str, /\*\*=/, null, 1, "You can't raise a value by this way. Write it in standard way:\n" +
		"i = i * i * i... * n");
		check(str, /\+\+/, null, 1, "This increament is not supported.");
		check(str, /--/, null, 1, "This decreament is not supported.");
		check(str, /(`.*`|'.*')/, null, 1, "Unsupported quotes");
	}
	function conditionCheck(str:string) {
		// Empty statement
		check(str, /^\s*(if|else\s*if|while)\s*\(\)\s*\{.*\}?\s*$/gm, null, 1, "Empty condition");
		// Statement without brackets
		check(str, /^\s*((if|else\s*if)\s*\(.*\)|do)\s*[^{]+$/gm, null, 1, "Statement requires braces after condition");
		// check(str, /^\s*do\s*[^{}]+$/, null, 1, "Statement requires braces after condition");
		if (blocksData[blocksData.length - 1] != "doWhile") {
			check(str, /^\s*while\s*\(.*\)\s*[^{]+$/gm, null, 1, "Statement requires braces after condition");
		}
		// check whether a condition is not single
		const sliced = str.slice(str.indexOf("(") + 1, str.indexOf(")"));
		if (sliced.match(/[^!a-z-A-Z()_0-9]/)) {
			// Condition is not single
			check(str, /\s*(if|else\s*if|while)\s*\(([^a-zA-Z/*!+\-=()\s]+|[a-zA-Z0-9\s]+[^a-zA-Z/*!+\-=()\s]+|[^a-zA-Z0-9\s]+[a-zA-Z/*!+\-=()\s]+)\).*/, null, 1, "Incorrect left side of condition");
			check(str, /^\s*(if|else\s*if|while)\s*\(\s*\w+\s*(>|<|>=|<=|==|!=|\*|\/|\+|-)\s*([^a-z-A-Z0-9]|[a-z-A-Z0-9]+[^a-z-A-Z\s]+|[^a-z-A-Z0-9\s]+[a-z-A-Z\s]*)\).*/, null, 1, "Incorrect right side of condition");
		}
		// Always true
		check(str, /\s*if\s*\(\s*(true|[1-9][0-9]*|-[1-9][0-9]*)\s*\).*/g, /(true|[1-9][0-9]*|-[1-9][0-9]*)\s*\)/, 0, "Condition is always true and doesn't have any sense");
		check(str, /\s*while\s*\(\s*(true|[1-9][0-9]*|-[1-9][0-9]*)\s*\).*/g, /(true|[1-9][0-9]*|-[1-9][0-9]*)\s*\)/, 1, "Condition is always true and will cause infinity loop");
		// Always false
		check(str, /\s*(if|else\s*if|while)\s*\(\s*(false|[0]+|""|null)\s*\).*/g, /(false|[0]+|""|null)/, 0, "Condition is always false and will never be executed");
		// Only one equal sign
		check(str, /\s*(if|else\s*if|while)\s*\(\s*["[\]0-9a-z]+\s*=\s*["[\]0-9a-z]+\s*\)/, /=/, 1, "'=' or '!' excepted.");
		// Includes !>
		check(str, /\s*(if|else\s*if|while)\s*\(\s*["[\]0-9a-z]+\s*!>\s*["[\]0-9a-z]+\s*\)/, /!>/, 1, "Use <= instead");
		// Includes !<
		check(str, /\s*(if|else\s*if|while)\s*\(\s*["[\]0-9a-z]+\s*!<\s*["[\]0-9a-z]+\s*\)/, /!</, 1, "Use >= instead");
		// Includes =!
		check(str, /\s*(if|else\s*if|while)\s*\(\s*["[\]0-9a-z]+\s*=!\s*["[\]0-9a-z]+\s*\)/, /!</, 1, "Move '!' before '='");
		// Includes <!
		check(str, /\s*(if|else\s*if|while)\s*\(\s*["[\]0-9a-z]+\s*(<!|>!|<=!|>=!)\s*["[\]0-9a-z]+\s*\)/, /!</, 1, "Operators are fully incorrect");
	}
	function funClassCheck(str:string) {
		const name = str.includes('fun') ? "function" : "class";
		check(str, /function/, null, 1, "You must declare the function by 'fun' keyword instead");
		// single keyword
		check(str, /\b(fun|class)\b\s*[;]*\s*$/, null, 1, `Single keyword`);
		// skipped name
		check(str, /\s*(fun|class)\s*\(/, /\s*\(/, 1, `Skipped ${name} name`);
		// check name
		check(str, /\s*(fun|class)\s+\s*([^a-z-A-Z]|[-])/, /([^a-z-A-Z0-9_ ]+|[-]+)/, 1, "Incorrect name beginning. It must begins with regular letter");
		check(str, /\s*(fun|class)\s+\s*([a-z-A-Z]([^a-z-A-Z0-9_()]+|[-]+)|[a-z-A-Z][a-z-A-Z0-9_]+([^a-z-A-Z0-9_() ]+|[-]))/, /([^a-z-A-Z0-9_() ]+|[-]+)/,
		1, "Incorrect name. It must contain only regular letters and numbers");
		// Without block declaration
		check(str, /^\s*(fun|class)\s*.*\(.*\)\s*[^{]+$/, /\).*/, 1, "Block declaration expected");
	}
	function forCheck(str:string) {
		check(str, /^\s*for\s*[^(]$/, /for/, 1, "Single for keyword");
		// Check block declaration
		check(str, /^\s*for\s*\(.*\)\s*[^{]+$/, /\).*/, 1, "Block declaration expected");
		if (str.match(/\s*for\s*\(((?:[^:ofin]*[:ofin]){2}[^]*)\)/) && str.includes(":")) {
			// For each loop defined
			check(str, /(of|in)/, null, 1, "Use ':' instead");
			check(str, /\s*for\s*\(\s*(?!var).*\)/, null, 1, "Skipped variable declaration");
			const name = str.slice(str.indexOf("var") + 3, str.indexOf(":")).trim();
			data.push({ 
				name: name, type: "any", wasUsed: false, scope: [checkIndex], value: "", 
				reassignValue: [], reassignType: []
			});
			allNames.push(name);
			blcEndInWaiters[blcEndInWaiters.length - 1].push(data.length - 1);
		} else {
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
			if (/\s*for\s*\(\s*var.*\)/.exec(str)) { // Checks whether first unit is variable declaration
				// Cutting variable from a cycle and sending on check
				varCheck(str.slice(str.indexOf("(") + 1, str.indexOf(";")));
			} else {
				// Sending that there should be declared variable
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
	}
	// Run all checks
	const funEndInWaiters:Array<Array<number>> = [];
	const classEndInWaiters:Array<Array<number>> = [];
	const blcEndInWaiters:Array<Array<number>> = [];
	const blocksData:Array<string> = [];
	for (const str of strings) {
		checkIndex++;
		if (str.replace(/ /g, "").startsWith("//")) {
			continue;
		}
		let notClogged = str.replace(/"[^"]*"/g, "");
		if (notClogged.includes("//")) {
			notClogged = notClogged.slice(0, notClogged.indexOf("//"));
		}
		if (notClogged.includes("}")) {
			const lastBl = blocksData[blocksData.length - 1];
			if (lastBl == "doWhile" || lastBl == "Block") {
				const last = blcEndInWaiters[blcEndInWaiters.length - 1]; 
				last.forEach(num => {
					data[num].scope[1] = checkIndex;
				});
				blcEndInWaiters.pop();
			} else if (lastBl == "class") {
				const last = classEndInWaiters[classEndInWaiters.length - 1];
				last.forEach(num => {
					data[num].scope[1] = checkIndex;
				});
				classEndInWaiters.pop();
			} else {
				const last = funEndInWaiters[funEndInWaiters.length - 1];
				last.forEach(num => {
					data[num].scope[1] = checkIndex;
				});
				funEndInWaiters.pop();
			}
			blocksData.pop();
		}
		if (notClogged.includes("fun")) {
			funEndInWaiters.push([]);
			const parameters = notClogged.slice(notClogged.indexOf("(") + 1, notClogged.indexOf(")")).trim().split(",");
			const funName = notClogged.slice(notClogged.indexOf("fun") + 3, notClogged.indexOf("("));
			functions.push(funName);
			parameters.forEach(parameter => {
				data.push({ 
					name: parameter, type: "any", wasUsed: false, scope: [checkIndex], value: "", 
					reassignValue: [], reassignType: []
				});
				funEndInWaiters[funEndInWaiters.length - 1].push(data.length - 1);
				allNames.push(parameter);
			});
			blocksData.push("fun");
		} else if (notClogged.includes("class")) {
			classEndInWaiters.push([]);
			const parameters = notClogged.slice(notClogged.indexOf("(") + 1, notClogged.indexOf(")")).trim().split(",");
			const className = notClogged.slice(notClogged.indexOf("class") + 5, notClogged.indexOf("("));
			classes.push(className);
			parameters.forEach(parameter => {
				data.push({ 
					name: parameter, type: "any", wasUsed: false, scope: [checkIndex], value: "", 
					reassignValue: [], reassignType: []
				});
				classEndInWaiters[classEndInWaiters.length - 1].push(data.length - 1);
				allNames.push(parameter);
			});
			blocksData.push("class");
		} else if (notClogged.includes("{")) {
			blcEndInWaiters.push([]);
			blocksData.push(notClogged.includes("do") ? "doWhile" : "Block");
		}
		if (notClogged.trim().startsWith("var")) {
			connection.console.log(`Defined variable declaration: ${checkIndex + 1}`);
			let name, type, value;
			const trimedStr = notClogged.trim();
			if (!trimedStr.includes("=")) {
				connection.console.log("Defined variable declaration without assigning");
				const symbol = trimedStr.includes(";") ? ";" : "\n";
				name = trimedStr.slice(trimedStr.indexOf("var") + 4, trimedStr.indexOf(symbol));
				type = "null";
			} else {
				connection.console.log("Defined variable declarataion with value assigned");
				name = trimedStr.slice(3, trimedStr.indexOf("="));
				value = str.slice(str.indexOf("=") + 1).replace(/^\s+/, "");
				type = typeCheck(value);
			}
			if (allNames.includes(name)) {
				data[allNames.indexOf(name)].type = type;
			} else {
				allNames.push(name);
			}
			connection.console.log([
				`name: ${name}`,
				`type: ${type}`,
				`wasUsed: false`,
				`scope: ${checkIndex}`,
				`value: ${value ? value : ""}`,
				`reassignValue: []`,
				`reassignType: []`
			].join("\n"));
			data.push({ 
				name: name, type: type, wasUsed: false, scope: [checkIndex], value: value ? value : "", 
				reassignValue: [], reassignType: []
			});
			if (blocksData.length > 0) {
				const last = blocksData[blocksData.length - 1];
				if (last == "Block" || last == "doWhile") {
					blcEndInWaiters[blcEndInWaiters.length - 1].push(data.length - 1);
				} else if (last == "fun") {
					funEndInWaiters[funEndInWaiters.length - 1].push(data.length - 1);
				} else if (last == "class") {
					classEndInWaiters[classEndInWaiters.length - 1].push(data.length - 1);
				}
			}
		} else {
			data.forEach((el, id) => {
				const trimmed = str.replace(/\s/g, "");
				if (trimmed.trim().includes(`${el.name.trim()}=`) && !trimmed.includes("==")) {
					const newValue = str.slice(str.indexOf("=") + 1).replace(/;/g, "").trim();
					let newType = typeCheck(newValue);
					if (newType == "[]") {
						newType = "array";
					} else if (newType == "1") {
						newType = "number";
					} else if (newType == '"string"') {
						newType = "string";
					}
					data[id].reassignValue.push(newValue);
					data[id].reassignType.push(newType);
				}
			});
		}
		if (strings[strings.length - 1] != str) {
			semicolonCheck(notClogged);
			varCheck(notClogged);
			conditionCheck(notClogged);
			commonExpressionCheck(notClogged);
			funClassCheck(notClogged);
			forCheck(notClogged);
		}
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
	function add(arr:Array<string>, type:CompletionItemKind, group:string) {
		if (!group) {
			group = "";
		}
		for (let i = 0; i < arr.length; i++) {
			const name = `${group}${arr[i].slice(0, 1).toUpperCase()}${arr[i].slice(1)}`;
			intellisense.push({
				label: arr[i],
				kind: type,
				data: name,
			});
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
		], CompletionItemKind.Method, "String");
	}
	function arrayMethods() {
		add([
			'push', 'pop', 'unshift', 'shift',
			'insertAt', 'insertRange', 'removeAt',
			'removeRange', 'slice', 'concat', 
			'clear', 'clone',
		], CompletionItemKind.Method, "Array");
	}
	function NumMethods() {
		add(['parse'], CompletionItemKind.Method, "Num");
	}
	function sysMethods(type:number) {
		if (type == 0) {
			add([
				'alert', 'stop', 'err', 'noti', 
				'playMedia', 'toast', 'log', 
				'info', 'currentTime', 
				'currentVersion', 'sdk',
				'lang', 'darkMode', 'globalAction',
				'dpi', 'openApp', 'wake',
				'setControlOpacity'
			], CompletionItemKind.Method, "Sys");
		} else if (type == 1) {
			add([
				'dpi', 'state', 'timeout', 'cutouts',
				'realCutouts', 'insets', 'rotation',
				'smallestWidth'
			], CompletionItemKind.Property, "SysInfoScreen");
		} else if (type == 2) {
			add([
				'isEmulator', 'darkmode', 'language', 'sdk',
				'touch', 'capture'
			], CompletionItemKind.Property, "SysInfoDev");
		} else if (type == 3) {
			add([
				'level', 'charge', 'ac', 'usb',
			], CompletionItemKind.Property, "SysInfoBattery");
		} else if (type == 4) {
			add([
				'total', 'free', 'threshold', 'low',
			], CompletionItemKind.Property, "SysInfoMemory");
		} else if (type == 5) {
			add([
				'dev', 'screen', 'battery', 'memory',
			], CompletionItemKind.Property, "SysInfo");
		}
	}
	function mapMethods() {
		add([
			'entries', 'keys', 'values',
			'containsKey', 'containsValue',
			'get', 'put', 'putAll',
			'putIfAbsent', 'remove',
			'replace', 'size', 'isEmpty',
			'clear::clearMap'
		], CompletionItemKind.Method, "Map");
	}
	function mathMethods() {
		add([
			'E', 'pl', 'cos', 'sin', 'tan',
			'acos', 'asin', 'atan', 'atan2', 'sqrt',
			'cbrt', 'hypot', 'ceil', 'floor', 'round',
			'exp', 'pow', 'log', 'log10', 'log1p',
			'abs', 'max', 'min', 'random', 'toDegrees',
			'toRadians', 'randomRange'
		], CompletionItemKind.Method, "Math");
	}
	function pointMethods(type:number) {
		if (type == 0) {
			add(['scale'], CompletionItemKind.Method, "Point");
			add(['LEFT', 'TOP', 'RIGHT', 'BOTTOM'], CompletionItemKind.Constant, "Point");
		} else {
			add(['getX','getY', 'offset', 'noScale'], CompletionItemKind.Method, "Point");
		}
	}
	function SwipePointMethods() {
		add(['getX','getY', 'getHold', 'getSpeed'], CompletionItemKind.Method, "SwipePoint");
	}
	function multiSwipeMethods(type:number) {
		if (type == 0) {
			add(['builder'], CompletionItemKind.Method, "MultiSwipe");
		} else if (type == 1) {
			add(['add','setSParam', 'build'], CompletionItemKind.Method, "MultiSwipe");
		}
	}
	function TouchMethods() {
		add(['down', 'up', 'move', 'dispatch'], CompletionItemKind.Method, "Touch");
	}
	function regionMethods(type:number) {
		if (type == 0) {
			add(['LEFT', 'TOP', 'RIGHT', 'BOTTOM'], CompletionItemKind.Constant, "Region");
			add(['deviceReg', 'macroReg', 'scale', 'highlightOff'], CompletionItemKind.Method, "Region");
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
			], CompletionItemKind.Method, "Region");
		} else {
			add(['getRegion', 'getPoint', 'click', type == 2 ? 'getScore' : 'getText'], CompletionItemKind.Method, "Region");
		}
		
	}
	function TemplateMethods(type:number) {
		if (type == 0) {
			add([
				'image', 'color', 'text'
			], CompletionItemKind.Method, "Template");
		} else {
			add([
				'value', 'mScore', 'method',
				'segment', 'mask', 'offset',
				'width', 'height', 'scale',
				'rotate', 'gray', 'threshold', 
				'build'
			], CompletionItemKind.Method, "Template");
		}
	}
	function settingMethods(type:number) {
		if (type == 0) {
			add([
				'get', 'set', 'remove', 'clear',
				'save', 'loadVars', 'setDialog', 'show',
				'builder'
			], CompletionItemKind.Method, "Setting");
		} else if (type == 1) {
			add([
				'add', 'group', 'groupEnd',
				'setTitle', 'setPositiveButton',
				'setNegativeButton', 'build'
			], CompletionItemKind.Method, "Setting");
		} else {
			add(['show', 'preview'], CompletionItemKind.Method, "Setting");
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
			], CompletionItemKind.Method, "OnScreenText");
		} else {
			add(['off'], CompletionItemKind.Method, "OnScreenText");
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
			], CompletionItemKind.Method, "dateTime");
		} else {
			add([
				'parse', 'fromUnixMillis', 'timeZoneOffset'
			], CompletionItemKind.Method, "dateTime");
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
			], CompletionItemKind.Method, "TimeSpan");
		} else {
			add([
				'fromDays', 'fromHours', 'fromMinutes',
				'fromSeconds'
			], CompletionItemKind.Method, "TimeSpan");
		}
	}
	function Stopwatch() {
		add([
			'start', 'stop', 'reset',
			'restart', 'elapsed',
			'isRunning', 'isElapsed'
		], CompletionItemKind.Method, "Stopwatch");
	}
	function Clipboard() {
		add(['clear', 'copy', 'past'], CompletionItemKind.Method, "Clipboard");
	}
	function Overlay() {
		add([
			'setOpacity', 'getState', 'setState',
			'getRegion', 'move', 'spin'
		], CompletionItemKind.Method, "Overlay");
	}
	function fileMethods() {
		add([
		'writeText', 'writeLines', 'appendText',
		'appendLines', 'readText', 'readLines', 
		'separator', 'copy', 'delete', 'exists',
		'isDir', 'mkdirs', 'list'
		], CompletionItemKind.Method, "File");
	}
	function cache() {
		add([
			'screen', 'screenOff', 'region', 
			'regionOff', 'clearImage'
		], CompletionItemKind.Method, "cache");
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
		], CompletionItemKind.Method, "env");
	}
	function Version() {
		add([
			'major', 'minor', 'build', 'revision',
			'compare'
		], CompletionItemKind.Method, "Version");
	}
	connection.console.log(`${line}`);
	const last = line?.split(".");
	let current;
	if (last) {
		current = last[last?.length - 1];
	}
	if (line?.includes(".") && ((current?.includes("(") && current.includes(")")) || !current?.includes("("))) {
		// Include methods
		connection.console.log(`Defined line with method calling: ${line}`);
		let unconstructed:Array<any>;
		if (line) {
			unconstructed = line.split(".");
			if (unconstructed.length > 1) {
				connection.console.log("Defined line with one more dots");
				if (unconstructed[0].includes("var") && unconstructed[0].includes("=")) {
					connection.console.log("This is variable declaration");
					unconstructed[0] = unconstructed[0].slice(unconstructed[0].indexOf("=") + 1);
				}
				for (let i = 0; i < data.length; i++) {
					for (let j = 0; j < unconstructed.length; j++) {
						if (unconstructed[j].trim() == data[i].name.trim()) {
							connection.console.log(`Variable defined. ${unconstructed[j].trim()} == ${data[i].name.trim()}`);
							connection.console.log(`Data type: ${data[i].type}`);
							unconstructed[j] = data[i].type;
							connection.console.log(`Assigned type: ${unconstructed[j]}`);
						} else if (unconstructed[j].includes("(")) {
							connection.console.log("Defined braces");
							if (unconstructed[j].slice(0, unconstructed[j].indexOf("(")).trim() == data[i].name.trim()) {
								connection.console.log("defined class calling writen in variable");
								unconstructed[j] = `${data[i].type}()`;
								connection.console.log(`Saved string: ${unconstructed[j]}`);
							}
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
		connection.console.log(`Result line: ${line}`);
		connection.console.log(`Result parent: ${parent}`);
		if (parent.match(/\[.*\]/)) {
			arrayMethods();
		} else if (parent.match(/".*"/)) {
			stringMethods();
		} else if (parent == "Num") {
			NumMethods();
		} else if (line.match(/\s*Sys.info.screen./)) {
			sysMethods(1);
		} else if (line.match(/\s*Sys.info.dev./)) {
			sysMethods(2);
		} else if (line.match(/\s*Sys.info.battery./)) {
			sysMethods(3);
		} else if (line.match(/\s*Sys.info.memory./)) {
			sysMethods(4);
		} else if (line.match(/\s*Sys.info./)) {
			sysMethods(5);
		} else if (parent == "Sys") {
			sysMethods(0);
		} else if (line.match(/\s*Map\s*\(.*\)/)) {
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
		} else if (line.match(/\s*Region\s*\(.*\)./)) { // Region with brackets
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
			arrayMethods();
			stringMethods();
			NumMethods();
			for (let i = 0; i < 2; i++) {
				pointMethods(i);
				multiSwipeMethods(i);
				TemplateMethods(i);
				OnScreenText(i);
				dateTimeMethods(i);
				TimeSpanMethods(i);
				for (let j = i; j < 2; j++) {
					regionMethods(j);
					settingMethods(j);
					sysMethods(j);
				}
			}
			sysMethods(5);
		}
	} else {
		// Include regular keywords
		const posInDoc = _textDocumentPosition.position.line;
		data.forEach((el, id) => {
			if (!posInDoc) {
				intellisense.push({
					label: el.name.trim(),
					kind: CompletionItemKind.Variable,
					insertText: el.name.trim(),
					data: [`varNameIntellisense`, id],
				});
			} else if (el.scope[0] <= posInDoc && (el.scope[1] == undefined || el.scope[1] >= posInDoc)) {
					intellisense.push({
						label: el.name.trim(),
						kind: CompletionItemKind.Variable,
						insertText: el.name.trim(),
						data: [`varNameIntellisense`, id],
					});
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
		add(['var'], CompletionItemKind.Variable, "Keyword");
		add([
			'Sys', 'fun', 'out', 'in',
			'wait', 'swipe', 'click', 'Map', 'Math',
			'Point', 'SwipePoint', 'MultiSwipe',
			'Touch', 'Region', "Template", 'Setting',
			'OnScreenText', 'DateTime', 'TimeSpan',
			'Stopwatch', 'Clipboard', 'Overlay',
			'File', 'Cache', 'Env', 'Version',
			'Num'
		], CompletionItemKind.Function, "Keyword");
		add(['class'], CompletionItemKind.Class, "Keyword");
		add(['if', 'while', 'do', 'for', 'return'], CompletionItemKind.Keyword, "Keyword");
	}
	return intellisense;
});

// This handler resolves additional information for the item selected in
// the completion list.
type HintsDoc = {
	[key: string]: [string, string[]];
};
function inString(arr:Array<string>) {
	let str = '';
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].includes("--c")) {
			str += arr[i].slice(0, arr[i].indexOf("--c"));
		} else {
			str += `${arr[i]}\n`;
		}
	}
	return str;
}
[

];
const hintsDoc: HintsDoc = {
	// REGULAR KEYWORDS
		KeywordVar: ["Variable declaration", [
			"Declare variable",
			"\tvar i = \"hello\"",
			"The macrorify syntax only supports 'var' --c",
			"declaration and is block variable.",
			"Syntax allow to declare variable twice beyound --c",
			"and then inside block variable with one name.--c",
			"Example:",
			"\tvar number = 0;",
			"\tif (true) {",
			"\t\tvar number = 1;",
			"\tSys.alert(number); // 1",
			"\t}",
			"\tSys.alert(number) // 0",
			"So in conclusion inside block will be value --c",
			"of just declared variable and beyound value --c",
			"of variable before."
		]],
		KeywordIf: ["Condition declaration", [
			"The condition is executing different --c",
			"codes by result of specific condition.",
			"Example:",
			"\tvar result = Region(1, 2, 3, 4).find(\"A template\"--c)",
			"FParam.timeout(1000).sRate(3).mScore(0.7)",
			"\tif (result) {",
			"\t\tSys.alert(\"The template discovered\")",
			"\t} else {",
			"\t\tSys.alert(\"Region is not discovered\")",
			"\t",
			"In the example above into variable 'result' wrote --c",
			"results of detection and if it is true then the output is: --c",
			"The template discovered",
			"Otherwise: Region is not discovered",
			"The condition is always must be either true or false.",
			"If a value is not boolean then it will be converted according: ",
			"all numbers except 0: true",
			"0: false",
			"\"\": false",
			"\"Anything here\": true",
			"[]: false",
			"[1, 2, 3]: true",
			"null: false\n",
			"The sign '!' is negative and makes condition opposite: ",
			"\tvar i = 1;",
			"\tif (i != 0) {",
			"\t\tSys.alert(\"i is not zero\")",
			"\t}"
		]],
		KeywordWhile: ["While loop", [
			"var arr = [1, 2, 3, 4, 5]",
			"while(arr.length > 0) {",
			"\tarr.pop()",
			"}",
			"The actions inside loop executes unless condition is false",
		]],
		KeywordFor: ["For loop", [
			"for (var i = 0; i <= 15; i = i + 1) {",
			"\tSys.toast(i);",
			"}",
			"The first position is variables declaration",
			"The second is condition that checks per time before loop execution",
			"The third place is an action that executed each time after loop",
			"The actions inside brackets is what should be repeated",
			"",
			"In our case it will log numbers from 0 to 15",
		]],
		KeywordFun: ["Function declaration", [
			"Function is part of code that usually --c",
			"perform specific patterns of actions that might be --c",
			"repeated in a code. Declaration syntax:",
			"\tfun add(number1, number2) {",
			"\t\tvar result = number1 + number2",
			"\t\treturn result",
			"\t}",
			"\tvar number1 = 809;",
			"\tvar added = add(number1, 94)",
			"The function above adds two numbers.",
			"After fun keyword you should indicate how does the function is named",
			"Parameters are variables that assigned by some --c",
			"values on calling and can be used inside function",
			"Return keyword is what should be returned in result",
		]],
		KeywordClass: ["Class declaration", [
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
		KeywordNum: ["Num keyword", [
			"This keyword is usually uses to parse a string to a number",
			"Available methods: ",
			'parse'
		]],
		KeywordSys: ["Sys keyword", [
			"This keyword is usually uses to provide system actions --c",
			"like output message, open app, stop macro, turn off device etc.",
			"Available methods: ",
			"alert, stop, err, noti, playMedia, toast, --c",
			"log, info, currentTime, currentVersion, sdk, lang, --c",
			"darkMode, globalAction, dpi, openApp, wake"
		]],
	// Array methods
		ArrayPush: ["Array method: push", [
			"number push(element: any)\n",
			"Adds one element to the end of an array and returns the new length of the array.",
			"Parameters: ",
			"\telement: The element to add",
			"Return: ",
			"\tThe new length of the array | number",
		]],
		ArrayPop: ["Array method: pop", [
			"any pop()\n",
			"Removes the last element from an array and returns that element. This method changes the length of the array.",
			"Return: ",
			"\tThe last element in the array | any",
		]],
		ArrayShift: ["Array method: shift", [
			"any shift()",
			"Removes the first element from an array and returns that element. This method changes the length of the array.",
			"Return: ",
			"\tThe first element in the array | any",
		]],
		ArrayUnshift: ["Array method: unshift", [
			"number unshift(element: any)\n",
			"Adds one element to the beginning of an array and returns the new length of the array.",
			"Parameters: ",
			"\telement: The element to add",
			"Return: ",
			"\tThe new length of the array | number",
		]],
		ArrayInsertAt: ["Array method: insertAt", [
			"number insertAt(index: number, element: any)\n",
			"Inserts one element at the index and returns the new length of the array.",
			"Parameters: ",
			"\tindex: The index to insert. index >= 0 and index < size",
			"\telement: The element to insert",
			"Return",
			"\tThe new length of the array | number",
		]],
		ArrayInsertRange: ["Array method: insertRange", [
			"number insertRange(index: number, elements: array)\n",
			"Inserts elements at the index and returns the new length of the array.",
			"Parameters: ",
			"\tindex: The index to insert. index >= 0 and index < size",
			"\telements: The array of elements to insert",
			"Return: ",
			"\tThe new length of the array | number",
		]],
		ArrayRemoveAt: ["Array method: removeAt", [
			"any removeAt(index: number)\n",
			"Removes one element at the index and returns the new length of the array.",
			"Parameters: ",
			"\tindex: The index of the element to remove. index >= 0 and index < size",
			"Return: ",
			"\tThe new length of the array | number",
		]],
		ArrayRemoveRange: ["Array method: removeRange", [
			"number removeRange(startIndex: number, endIndex: number)\n",
			"Removes elements from startIndex to endIndex and returns the new length of the array.",
			"Parameters: ",
			"\tstartIndex: The start index. index >= 0 and index < size",
			"\tendIndex: The end index. index >= 0 and index < size",
			"Return: ",
			"\tThe new length of the array | number",
		]],
		ArraySlice: ["Array method: slice", [
			"array slice(startIndex: number, endIndex: number)\n",
			"Returns a shallow copy of a portion of an array into --c",
			"a new array selected from startIndex to endIndex --c",
			"(end not included). The original array will not be modified.",
			"Parameters: ",
			"\tstartIndex: The start index. index >= 0 and index < size",
			"\tendIndex: The end index. index >= 0 and index <= size",
			"Return: ",
			"\tThe new array | array"
		]],
		ArrayConcat: ["Array method: concat", [
			"array concat(elements: array)\n",
			"Merges two arrays. This method does not change the existing arrays, but instead returns a new array.",
			"Parameters: ",
			"\telements: The array to merge",
			"Return: ",
			"\tThe new merged array | array",
		]],
		ArrayClear: ["Array method: clear", [
			"number clear()\n",
			"Removes all elements in the array. Return 0",
			"Return: ",
			"\tThe new size which is 0 | number",
		]],
		ArrayClone: ["Array method: clone", [
			"array clone()\n",
			"Shallow copy all the elements of the array",
			"Return: ",
			"\tThe new array | array",
		]],
	// Map methods
		MapEntries: ["Map method: entries", [
			"any[] entries()\n",
			"Returns an array of arrays where each inner array represents a key-value pair [key, value].",
			"Return: ",
			"\tAn array of arrays where each inner array represents a key-value pair [key, value]"
		]],
		MapKeys: ["Map method: keys", [
			"any[] keys()\n",
			"Returns an array of all the keys contained in this map.",
			"Return: ",
			"\tAn array of all the keys contained in this map"
		]],
		MapValues: ["Map method: values", [
			"any[] values()\n",
			"Returns an array of all the values contained in this map.",
			"Return: ",
			"\tAn array of all the values contained in this map"
		]],
		MapClear: ["Map method: clear", [
		"void clear()\n",
		"Removes all of the mappings from this map (optional operation).",
		"The map will be empty after this call returns."
		]],
		MapContainsKey: ["Map method: containsKey", [
		"boolean containsKey(Object key)\n",
		"Returns true if this map contains a mapping for the specified key.",
		"More formally, returns true if and only if this map contains --c",
		"a mapping for a key k such that (key==null ? k==null : key.equals(k)).",
		"(There can be at most one such mapping.)",
		"Parameters:",
		"\tkey: key whose presence in this map is to be tested",
		"Returns:",
		"\ttrue if this map contains a mapping for the specified key"
		]],
		MapGet: ["Map method: get", [
			"V get(Object key)\n",
			"Returns the value to which the specified key is mapped, or null if this map contains no mapping for the key.",
			"More formally, if this map contains a mapping from a --c", 
			"key k to a value v such that (key==null ? k==null : key.equals(k)), --c",
			"then this method returns v; otherwise it returns null. (There can be at most one such mapping.)",
			"If this map permits null values, then a return value of null --c",
			"does not necessarily indicate that the map contains no mapping for the key;", 
			"it's also possible that the map explicitly maps the key to null.",
			"The containsKey operation may be used to distinguish these two cases.",
			"Parameters: ",
			"\tkey: the key whose associated value is to be returned",
			"Returns: ",
			"\tthe value to which the specified key is mapped, or null if this map contains no mapping for the key"
		]],
		MapPut: ["Map method: put", [
			"V put(K key, V value)\n",
			"Associates the specified value with the specified key in this map (optional operation).",
			"If the map previously contained a mapping for the key, the old value is replaced by the specified value.",
			"(A map m is said to contain a mapping for a key k if and only if m.containsKey(k) would return true.)",
			"Parameters:",
			"\tkey: key with which the specified value is to be associated",
			"\tvalue: value to be associated with the specified key",
			"Returns:",
			"\tthe previous value associated with key, or null if there was no mapping for key.--c",
			"(A null return can also indicate that the map previously associated null with key, if the implementation supports null values.)"
		]],
		MapPutAll: ["Map method: putAll", [
			"void putAll(Map<? extends K,? extends V> m)\n",
			"Copies all of the mappings from the specified map to this map (optional operation).",
			"The effect of this call is equivalent to that of calling put(k, v) --c",
			"on this map once for each mapping from key k to value v in the specified map.",
			"The behavior of this operation is undefined if --c",
			"the specified map is modified while the operation is in progress.",
			"Parameters:",
			"\tm: mappings to be stored in this map"
		]],
		MapPutIfAbsent: ["Map method: putIfAbsent", [
			"default V putIfAbsent(K key, V value)\n",
			"If the specified key is not already associated with a value (or is mapped to null),--c", 
			"associates it with the given value and returns null;",
			"else returns the current value.",
			"Other words if a value in an object is not equals to a given value, --c",
			"the value in the object is set to value given as parameter and returned null",
			"Parameters:",
			"\tkey: key with which the specified value is to be associated",
			"\tvalue: value to be associated with the specified key",
			"Returns:",
			"\tthe previous value associated with the specified key, --c", 
			"or null if there was no mapping for the key.",
			"(A null return can also indicate that the map previously associated null with the key, if the implementation supports null values.)"
		]],
		MapRemove: ["Map method: remove", [
			"V remove(Object key)\n",
			"Removes the mapping for a key from this map if it is present (optional operation).",
			"More formally, if this map contains a mapping from --c",
			"key k to value v such that (key==null ? k==null : key.equals(k)), that mapping is removed.",
			"(The map can contain at most one such mapping.)",
			"Returns the value to which this map previously associated the key, --c",
			"or null if the map contained no mapping for the key.",
			"If this map permits null values, then a return value --c",
			"of null does not necessarily indicate that the map contained no mapping for the key;", 
			"it's also possible that the map explicitly mapped the key to null.",
			"The map will not contain a mapping for the specified key once the call returns.",
			"Parameters:",
			"\tkey - key whose mapping is to be removed from the map",
			"Returns:",
			"\tthe previous value associated with key, or null if there was no mapping for key."
		]],
		MapReplace: ["Map method: replace", [
			"default V replace(K key, V value)\n",
			"Replaces the entry for the specified key only if it is currently mapped to some value.",
			"Parameters: ",
			"\tkey: key with which the specified value is associated",
			"\tvalue: value to be associated with the specified key",
			"Returns: ",
			"\tthe previous value associated with the specified key, or null if there was no mapping for the key.",
			"(A null return can also indicate that the map previously associated null with the key, if the implementation supports null values.)"
		]],
		MapSize: ["Map method: size", [
			"int size()\n",
			"Returns the number of key-value mappings in this map.",
			"If the map contains more than Integer.MAX_VALUE elements, returns Integer.MAX_VALUE.",
			"Returns:",
			"\tthe number of key-value mappings in this map"
		]],
		MapIsEmpty: ["Map method: isEmpty", [
			"boolean isEmpty()\n",
			"Returns true if this map contains no key-value mappings.",
			"Returns:",
			"\ttrue if this map contains no key-value mappings"
		]],
	// Num methods
		NumParse: ["Num method: parse", [
			"static number parse(value: number | string, default: number = null)",
			"Try to parse the input into a number. --c",
			"If the input is already a number then it's returned. --c",
			"Default is returned if the input cannot be parsed",
			"Parameters: ",
			"\tvalue: The value to be parsed",
			"\tdefault: The default value if parse failed",
			"Return: ",
			"\tParsed number or default | number",
		]],
	// Sys methods
		SysNoti: ["Static method: noti", [
			"static void noti(name: string = null)\n",
			"Notify the user by playing the notification sound.",
			"Sound will be instantly stopped since the method --c",
			"is recalled or macro was stopped",
			"Parameters:",
			"\tname: Name of the notification sound on your device. null to use the default"
		]],
		SysPlayMedia: ["Static method: playMedia", [
			"static void playMedia(name: string, duration: number = -1, interval: number = 0, repeat: number = 1)\n",
			"Play media file on the app data folder (/sdcard/Android/data/com.kok_emm.mobile/files)",
			"Parameters:",
			"\tname: Name of the file",
			"\tduration: Custom duration. -1 for using the duration of the actual media file. Default: -1",
			"\tinterval: Time to wait after each repeat. Default: 0",
			"\trepeat: Number of times to repeat playing the file. Default: 1"
		]],
		SysToast: ["Static method: toast", [
			"static void toast(message: string)\n",
			"Notify the user by showing a toast message",
			"Parameters:",
			"\tmessage: The message"
		]],
		SysAlert: ["Sys method: alert", [
			"static void alert(message: string)\n",
			"Notify the user by showing an alert popup",
			"Parameters:",
			"\tmessage: The message",
		]],
		SysLog: ["Sys method: log", [
			"static void log(message: string)\n",
			"Log message to the console in Play Mode only if 'debug' is enabled",
			"Parameters:",
			"\tmessage: The message"
		]],
		SysErr: ["Sys method: err", [
			"static void err(message: string)\n",
			"Notify the user by showing an alert popup and stop the macro",
			"Parameters:",
			"\tmessage: The message"
		]],
		SysCurrentTime: ["Sys method: currentTime", [
			"static number currentTime()\n",
			"Return the current time in milliseconds",
			"Return:",
			"\tnumber: The current time"
		]],
		SysCurrentVersion: ["Sys method: currentVersion", [
			"static Version currentVersion()\n",
			"Return the current Version of the app",
			"Return:",
			"\tVersion: The current Version of the app"
		]],
		SysSdk: ["Sys method: sdk", [
			"static number sdk()\n",
			"Return the sdk number of the device",
			"Return:",
			"\tnumber: The sdk number of the device"
		]],
		SysLang: ["Sys method: lang", [
			"static string lang()\n",
			"Return the current language code of the device (en, fr, es, etc...)",
			"Return:",
			"\tstring: The current language code"
		]],
		SysDpi: ["Sys method: dpi", [
			"static number dpi()\n",
			"Return the current dpi",
			"Return:",
			"\tnumber: The current dpi"
		]],
		SysSetControlOpacity: ["DEPRECATED", [
			"Sys method: setControlOpacity\n",
			"Use Overlay.setOpacity() instead"
		]],
		SysInfo: ["Sys method: dpi", [
			"static any info(property: string)\n",
			"Query information about the system. --c",
			"Some of the calls are expensive so try not to query them in a constant loop manner. --c",
			"Return null if not found",
			"Properties: ",
			""
		]],
	// Function names intellisense
		funNameIntellisense: ["Function", ["This function was declared in the code."]],
};
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
	if (item.data instanceof Array && item.data[0] == "varNameIntellisense") {
		const info = data[item.data[1]];
		const doc = [];
		item.detail = `Variable: ${info.name}`;
		doc.push((`Scope: from ${info.scope[0] + 1}`));
		if (info.scope[1]) {
			doc[doc.length - 1] += (` to ${info.scope[1] + 1}`);
		}
		if (info.type == "[]") {
			doc.push(`Type: array`);
		} else if (info.type == '"string"') {
			doc.push(`Type: string`);
		} else {
			doc.push(`Type: ${info.type}`);
		}
		if (info.value == "") {
			doc.push("Value is not assigned on declaration");
		} else {
			doc.push(`Value on declaration: ${info.value}`);
		}
		if (info.reassignValue[0]) {
			doc.push("Possibly reassigned during code: ");
			info.reassignValue.forEach((value, id) => {
				doc.push(`${value} |  ${info.reassignType[id]}`);
			});
		}
		item.documentation = inString(doc);
	} else if (item.data in hintsDoc) {
		const detail = hintsDoc[item.data][0];
		const doc = hintsDoc[item.data][1];
		item.detail = detail ? detail : "no info";
		item.documentation = doc ? inString(doc) : "no info";
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