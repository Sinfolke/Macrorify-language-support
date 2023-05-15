/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';
import * as vscode from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind,
	CompletionItemKind
} from 'vscode-languageclient/node';
let client: LanguageClient;
export function activate(context: ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for macrorify language
		documentSelector: [{ scheme: 'file', language: 'macrorify' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'Macrorify',
		'Macrorify',
		serverOptions,
		clientOptions
	);
	// Register a completion item provider for your desired language(s)
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ scheme: 'file', language: 'macrorify' },
			{
				provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
					const linePrefix = document.lineAt(position).text.substr(0, position.character);
					if (linePrefix.endsWith('.')) {
						// If the user has typed a dot, return all available methods and properties
						let completionItems;
						if (linePrefix.match(/Sys.info.screen/)) {
							completionItems = [
								new vscode.CompletionItem("dpi", CompletionItemKind.Property),
								new vscode.CompletionItem("state", CompletionItemKind.Property),
								new vscode.CompletionItem("timeout", CompletionItemKind.Property),
								new vscode.CompletionItem("cutous", CompletionItemKind.Property),
								new vscode.CompletionItem("realCutouts", CompletionItemKind.Property),
								new vscode.CompletionItem("rotation", CompletionItemKind.Property),
								new vscode.CompletionItem("smallestWidth", CompletionItemKind.Property),
							];
							completionItems.forEach(item => {
								item.detail = "Hello";
								item.documentation = [
									"hello1", "hello2"
								].join("\n");
							});
						} else if (linePrefix.match(/Sys.info.dev/)) {
							completionItems = [
								new vscode.CompletionItem("isEmulator", CompletionItemKind.Property),
								new vscode.CompletionItem("darkmode", CompletionItemKind.Property),
								new vscode.CompletionItem("language", CompletionItemKind.Property),
								new vscode.CompletionItem("sdk", CompletionItemKind.Property),
								new vscode.CompletionItem("touch", CompletionItemKind.Property),
								new vscode.CompletionItem("capture", CompletionItemKind.Property),
							];
						} else if (linePrefix.match(/Sys.info.battery/)) {
							completionItems = [
								new vscode.CompletionItem("level", CompletionItemKind.Property),
								new vscode.CompletionItem("charge", CompletionItemKind.Property),
								new vscode.CompletionItem("ac", CompletionItemKind.Property),
								new vscode.CompletionItem("usb", CompletionItemKind.Property),
							];
						} else if (linePrefix.match(/Sys.info.memory/)) {
							completionItems = [
								new vscode.CompletionItem("total", CompletionItemKind.Property),
								new vscode.CompletionItem("free", CompletionItemKind.Property),
								new vscode.CompletionItem("threshold", CompletionItemKind.Property),
								new vscode.CompletionItem("low", CompletionItemKind.Property),
							];
						} else if (linePrefix.match(/Sys.info/)) {
							completionItems = [
								new vscode.CompletionItem("dev", CompletionItemKind.Property),
								new vscode.CompletionItem("screen", CompletionItemKind.Property),
								new vscode.CompletionItem("battery", CompletionItemKind.Property),
								new vscode.CompletionItem("memory", CompletionItemKind.Property),
							];
						} else if (linePrefix.match(/Sys/)) {
							completionItems = [
								new vscode.CompletionItem("alert", CompletionItemKind.Method),
								new vscode.CompletionItem("stop", CompletionItemKind.Method),
								new vscode.CompletionItem("err", CompletionItemKind.Method),
								new vscode.CompletionItem("noti", CompletionItemKind.Method),
								new vscode.CompletionItem("playMedia", CompletionItemKind.Method),
								new vscode.CompletionItem("toast", CompletionItemKind.Method),
								new vscode.CompletionItem("log", CompletionItemKind.Method),
								new vscode.CompletionItem("info", CompletionItemKind.Method),
								new vscode.CompletionItem("currentTime", CompletionItemKind.Method),
								new vscode.CompletionItem("currentVersion", CompletionItemKind.Method),
								new vscode.CompletionItem("sdk", CompletionItemKind.Method),
								new vscode.CompletionItem("lang", CompletionItemKind.Method),
								new vscode.CompletionItem("darkMode", CompletionItemKind.Method),
								new vscode.CompletionItem("globalAction", CompletionItemKind.Method),
								new vscode.CompletionItem("dpi", CompletionItemKind.Method),
								new vscode.CompletionItem("openApp", CompletionItemKind.Method),
								new vscode.CompletionItem("wake", CompletionItemKind.Method),
								new vscode.CompletionItem("setControlOpacity", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/Map\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("entries", CompletionItemKind.Method),
								new vscode.CompletionItem("keys", CompletionItemKind.Method),
								new vscode.CompletionItem("values", CompletionItemKind.Method),
								new vscode.CompletionItem("containsKey", CompletionItemKind.Method),
								new vscode.CompletionItem("containsValue", CompletionItemKind.Method),
								new vscode.CompletionItem("get", CompletionItemKind.Method),
								new vscode.CompletionItem("put", CompletionItemKind.Method),
								new vscode.CompletionItem("putAll", CompletionItemKind.Method),
								new vscode.CompletionItem("putIfAbsent", CompletionItemKind.Method),
								new vscode.CompletionItem("remove", CompletionItemKind.Method),
								new vscode.CompletionItem("replace", CompletionItemKind.Method),
								new vscode.CompletionItem("size", CompletionItemKind.Method),
								new vscode.CompletionItem("isEmpty", CompletionItemKind.Method),
								new vscode.CompletionItem("clear", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/Math/)) {
							completionItems = [
								new vscode.CompletionItem("E", CompletionItemKind.Method),
								new vscode.CompletionItem("pl", CompletionItemKind.Method),
								new vscode.CompletionItem("cos", CompletionItemKind.Method),
								new vscode.CompletionItem("tan", CompletionItemKind.Method),
								new vscode.CompletionItem("acros", CompletionItemKind.Method),
								new vscode.CompletionItem("asin", CompletionItemKind.Method),
								new vscode.CompletionItem("atan", CompletionItemKind.Method),
								new vscode.CompletionItem("atan2", CompletionItemKind.Method),
								new vscode.CompletionItem("sqrt", CompletionItemKind.Method),
								new vscode.CompletionItem("cbrt", CompletionItemKind.Method),
								new vscode.CompletionItem("hypot", CompletionItemKind.Method),
								new vscode.CompletionItem("ceil", CompletionItemKind.Method),
								new vscode.CompletionItem("floor", CompletionItemKind.Method),
								new vscode.CompletionItem("round", CompletionItemKind.Method),
								new vscode.CompletionItem("exp", CompletionItemKind.Method),
								new vscode.CompletionItem("pow", CompletionItemKind.Method),
								new vscode.CompletionItem("log", CompletionItemKind.Method),
								new vscode.CompletionItem("log10", CompletionItemKind.Method),
								new vscode.CompletionItem("log1p", CompletionItemKind.Method),
								new vscode.CompletionItem("abs", CompletionItemKind.Method),
								new vscode.CompletionItem("max", CompletionItemKind.Method),
								new vscode.CompletionItem("min", CompletionItemKind.Method),
								new vscode.CompletionItem("random", CompletionItemKind.Method),
								new vscode.CompletionItem("toDegrees", CompletionItemKind.Method),
								new vscode.CompletionItem("toRadians", CompletionItemKind.Method),
								new vscode.CompletionItem("randomRange", CompletionItemKind.Method),
							];
						} else if (linePrefix == "Point") {
							completionItems = [
								new vscode.CompletionItem("scale", CompletionItemKind.Method),
								new vscode.CompletionItem("LEFT", CompletionItemKind.Constant),
								new vscode.CompletionItem("TOP", CompletionItemKind.Constant),
								new vscode.CompletionItem("RIGHT", CompletionItemKind.Constant),
								new vscode.CompletionItem("BOTTOM", CompletionItemKind.Constant),
							];
						} else if (linePrefix.match(/^\s*Point\s*\(.*\)$/)) {
							completionItems = [
								new vscode.CompletionItem("getX", CompletionItemKind.Method),
								new vscode.CompletionItem("getY", CompletionItemKind.Method),
								new vscode.CompletionItem("offset", CompletionItemKind.Method),
								new vscode.CompletionItem("noScale", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/^\s*SwipePoint\s*\(.*\)$/)) {
							completionItems = [
								new vscode.CompletionItem("getX", CompletionItemKind.Method),
								new vscode.CompletionItem("getY", CompletionItemKind.Method),
								new vscode.CompletionItem("getHold", CompletionItemKind.Method),
								new vscode.CompletionItem("getSpeed", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/MultiSwipe/)) {
							completionItems = [
								new vscode.CompletionItem("builder", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/\s*MultiSwipe\s*\(.*\).builder\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("add", CompletionItemKind.Method),
								new vscode.CompletionItem("setSParam", CompletionItemKind.Method),
								new vscode.CompletionItem("build", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/Touch/)) {
							completionItems = [
								new vscode.CompletionItem("down", CompletionItemKind.Method),
								new vscode.CompletionItem("up", CompletionItemKind.Method),
								new vscode.CompletionItem("move", CompletionItemKind.Method),
								new vscode.CompletionItem("dispatch", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/\s*Region\s*\(.*\).(findText|findMultiText|findAllText|findAnyText)\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("getRegion", CompletionItemKind.Method),
								new vscode.CompletionItem("getPoint", CompletionItemKind.Method),
								new vscode.CompletionItem("click", CompletionItemKind.Method),
								new vscode.CompletionItem("getText", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/\s*Region\s*\(.*\).(find|findMulti|findAll|findAny)\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("getRegion", CompletionItemKind.Method),
								new vscode.CompletionItem("getPoint", CompletionItemKind.Method),
								new vscode.CompletionItem("click", CompletionItemKind.Method),
								new vscode.CompletionItem("getScore", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/\s*Region\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("getX", CompletionItemKind.Method),
								new vscode.CompletionItem("getY", CompletionItemKind.Method),
								new vscode.CompletionItem("getW", CompletionItemKind.Method),
								new vscode.CompletionItem("getH", CompletionItemKind.Method),
								new vscode.CompletionItem("getMiddlePoint", CompletionItemKind.Method),
								new vscode.CompletionItem("getLastMatch", CompletionItemKind.Method),
								new vscode.CompletionItem("getLastMatches", CompletionItemKind.Method),
								new vscode.CompletionItem("setX", CompletionItemKind.Method),
								new vscode.CompletionItem("setY", CompletionItemKind.Method),
								new vscode.CompletionItem("setW", CompletionItemKind.Method),
								new vscode.CompletionItem("setH", CompletionItemKind.Method),
								new vscode.CompletionItem("noScale", CompletionItemKind.Method),
								new vscode.CompletionItem("left", CompletionItemKind.Method),
								new vscode.CompletionItem("top", CompletionItemKind.Method),
								new vscode.CompletionItem("right", CompletionItemKind.Method),
								new vscode.CompletionItem("horizontal", CompletionItemKind.Method),
								new vscode.CompletionItem("vertical", CompletionItemKind.Method),
								new vscode.CompletionItem("middle", CompletionItemKind.Method),
								new vscode.CompletionItem("pad", CompletionItemKind.Method),
								new vscode.CompletionItem("leftPixel", CompletionItemKind.Method),
								new vscode.CompletionItem("topPixel", CompletionItemKind.Method),
								new vscode.CompletionItem("rightPixel", CompletionItemKind.Method),
								new vscode.CompletionItem("bottomPixel", CompletionItemKind.Method),
								new vscode.CompletionItem("horizontalPixel", CompletionItemKind.Method),
								new vscode.CompletionItem("verticalPixel", CompletionItemKind.Method),
								new vscode.CompletionItem("middlePixel", CompletionItemKind.Method),
								new vscode.CompletionItem("padPixel", CompletionItemKind.Method),
								new vscode.CompletionItem("offset", CompletionItemKind.Method),
								new vscode.CompletionItem("find", CompletionItemKind.Method),
								new vscode.CompletionItem("findMulti", CompletionItemKind.Method),
								new vscode.CompletionItem("findAll", CompletionItemKind.Method),
								new vscode.CompletionItem("findAny", CompletionItemKind.Method),
								new vscode.CompletionItem("click", CompletionItemKind.Method),
								new vscode.CompletionItem("clickAll", CompletionItemKind.Method),
								new vscode.CompletionItem("clickMulti", CompletionItemKind.Method),
								new vscode.CompletionItem("clickAny", CompletionItemKind.Method),
								new vscode.CompletionItem("wait", CompletionItemKind.Method),
								new vscode.CompletionItem("waitAll", CompletionItemKind.Method),
								new vscode.CompletionItem("findText", CompletionItemKind.Method),
								new vscode.CompletionItem("findMultiText", CompletionItemKind.Method),
								new vscode.CompletionItem("findAllText", CompletionItemKind.Method),
								new vscode.CompletionItem("findAnyText", CompletionItemKind.Method),
								new vscode.CompletionItem("clickText", CompletionItemKind.Method),
								new vscode.CompletionItem("clickMultiText", CompletionItemKind.Method),
								new vscode.CompletionItem("clickAllText", CompletionItemKind.Method),
								new vscode.CompletionItem("clickAnyText", CompletionItemKind.Method),
								new vscode.CompletionItem("waitText", CompletionItemKind.Method),
								new vscode.CompletionItem("waitAllText", CompletionItemKind.Method),
								new vscode.CompletionItem("highlight", CompletionItemKind.Method),
								new vscode.CompletionItem("highlightOff", CompletionItemKind.Method),
								new vscode.CompletionItem("capture", CompletionItemKind.Method),
								new vscode.CompletionItem("read", CompletionItemKind.Method),
								new vscode.CompletionItem("readPlain", CompletionItemKind.Method),
								new vscode.CompletionItem("readAsString", CompletionItemKind.Method),
								new vscode.CompletionItem("readAsNumber", CompletionItemKind.Method),
								new vscode.CompletionItem("padPixel", CompletionItemKind.Method),
								new vscode.CompletionItem("padPixel", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/Region/)) {
							completionItems = [
								new vscode.CompletionItem("deviceReg", CompletionItemKind.Method),
								new vscode.CompletionItem("macroReg", CompletionItemKind.Method),
								new vscode.CompletionItem("scale", CompletionItemKind.Method),
								new vscode.CompletionItem("highlightOff", CompletionItemKind.Method),
								new vscode.CompletionItem("LEFT", CompletionItemKind.Constant),
								new vscode.CompletionItem("TOP", CompletionItemKind.Constant),
								new vscode.CompletionItem("RIGHT", CompletionItemKind.Constant),
								new vscode.CompletionItem("BOTTOM", CompletionItemKind.Constant),
							];
						} else if (linePrefix.match(/Template/)) {
							completionItems = [
								new vscode.CompletionItem("image", CompletionItemKind.Method),
								new vscode.CompletionItem("color", CompletionItemKind.Method),
								new vscode.CompletionItem("text", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/Template.(image|text|color|setDefaultScale)\(.*\)./)) {
							completionItems = [
								new vscode.CompletionItem("value", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("mScore", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("method", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("segment", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("mask", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("offset", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("width", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("height", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("scale", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("rotate", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("gray", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("threshold", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("build", vscode.CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/Setting.builder\s*\(.*\).build\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("show", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("preview", vscode.CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/Setting.builder\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("value", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("mScore", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("method", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("add", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("group", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("groupEnd", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setTitle", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setPositiveButton", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setNegativeButton", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("build", vscode.CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/Setting/)) {
							completionItems = [
								new vscode.CompletionItem("value", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("mScore", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("method", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("get", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("set", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("remove", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("clear", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("save", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("loadVars", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setDialog", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("show", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("builder", vscode.CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/OnScreenText\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("getX", CompletionItemKind.Method),
								new vscode.CompletionItem("getY", CompletionItemKind.Method),
								new vscode.CompletionItem("getW", CompletionItemKind.Method),
								new vscode.CompletionItem("getH", CompletionItemKind.Method),
								new vscode.CompletionItem("getText", CompletionItemKind.Method),
								new vscode.CompletionItem("getTextColor", CompletionItemKind.Method),
								new vscode.CompletionItem("getBackgroundColor", CompletionItemKind.Method),
								new vscode.CompletionItem("getRegion", CompletionItemKind.Method),
								new vscode.CompletionItem("getClickState", CompletionItemKind.Method),
								new vscode.CompletionItem("getMoveState", CompletionItemKind.Method),
								new vscode.CompletionItem("getResizeState", CompletionItemKind.Method),
								new vscode.CompletionItem("setX", CompletionItemKind.Method),
								new vscode.CompletionItem("setY", CompletionItemKind.Method),
								new vscode.CompletionItem("setW", CompletionItemKind.Method),
								new vscode.CompletionItem("setH", CompletionItemKind.Method),
								new vscode.CompletionItem("setText", CompletionItemKind.Method),
								new vscode.CompletionItem("setTextColor", CompletionItemKind.Method),
								new vscode.CompletionItem("setBackgroundColor", CompletionItemKind.Method),
								new vscode.CompletionItem("setBackgroundImage", CompletionItemKind.Method),
								new vscode.CompletionItem("setTextSize", CompletionItemKind.Method),
								new vscode.CompletionItem("moveable", CompletionItemKind.Method),
								new vscode.CompletionItem("clickable", CompletionItemKind.Method),
								new vscode.CompletionItem("resizable", CompletionItemKind.Method),
								new vscode.CompletionItem("noScale", CompletionItemKind.Method),
								new vscode.CompletionItem("show", CompletionItemKind.Method),
								new vscode.CompletionItem("hidden", CompletionItemKind.Method),
								new vscode.CompletionItem("off", CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/OnScreenText/)) {
							completionItems = [
								new vscode.CompletionItem("off", CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/DateTime\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("date", CompletionItemKind.Method),
								new vscode.CompletionItem("year", CompletionItemKind.Method),
								new vscode.CompletionItem("month", CompletionItemKind.Method),
								new vscode.CompletionItem("day", CompletionItemKind.Method),
								new vscode.CompletionItem("dayOfWeek", CompletionItemKind.Method),
								new vscode.CompletionItem("dayOfYear", CompletionItemKind.Method),
								new vscode.CompletionItem("hour", CompletionItemKind.Method),
								new vscode.CompletionItem("minute", CompletionItemKind.Method),
								new vscode.CompletionItem("second", CompletionItemKind.Method),
								new vscode.CompletionItem("millis", CompletionItemKind.Method),
								new vscode.CompletionItem("totalMillis", CompletionItemKind.Method),
								new vscode.CompletionItem("add", CompletionItemKind.Method),
								new vscode.CompletionItem("addYears", CompletionItemKind.Method),
								new vscode.CompletionItem("addMonths", CompletionItemKind.Method),
								new vscode.CompletionItem("addDays", CompletionItemKind.Method),
								new vscode.CompletionItem("addHours", CompletionItemKind.Method),
								new vscode.CompletionItem("addMinutes", CompletionItemKind.Method),
								new vscode.CompletionItem("addSeconds", CompletionItemKind.Method),
								new vscode.CompletionItem("addMillis", CompletionItemKind.Method),
								new vscode.CompletionItem("sub", CompletionItemKind.Method),
								new vscode.CompletionItem("format", CompletionItemKind.Method)
							];
							
						} else if (linePrefix.match(/DateTime/)) {
							completionItems = [
								new vscode.CompletionItem("parse", CompletionItemKind.Method),
								new vscode.CompletionItem("fromUnixMillis", CompletionItemKind.Method),
								new vscode.CompletionItem("timeZoneOffset", CompletionItemKind.Method),
							];
						} else if (linePrefix.match(/TimeSpan\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("days", CompletionItemKind.Method),
								new vscode.CompletionItem("hours", CompletionItemKind.Method),
								new vscode.CompletionItem("minutes", CompletionItemKind.Method),
								new vscode.CompletionItem("seconds", CompletionItemKind.Method),
								new vscode.CompletionItem("millis", CompletionItemKind.Method),
								new vscode.CompletionItem("totalDays", CompletionItemKind.Method),
								new vscode.CompletionItem("totalHours", CompletionItemKind.Method),
								new vscode.CompletionItem("totalMinutes", CompletionItemKind.Method),
								new vscode.CompletionItem("totalSeconds", CompletionItemKind.Method),
								new vscode.CompletionItem("totalMillis", CompletionItemKind.Method),
								new vscode.CompletionItem("isNegative", CompletionItemKind.Method),
								new vscode.CompletionItem("isZero", CompletionItemKind.Method),
								new vscode.CompletionItem("add", CompletionItemKind.Method),
								new vscode.CompletionItem("addDays", CompletionItemKind.Method),
								new vscode.CompletionItem("addHours", CompletionItemKind.Method),
								new vscode.CompletionItem("addMinutes", CompletionItemKind.Method),
								new vscode.CompletionItem("addSeconds", CompletionItemKind.Method),
								new vscode.CompletionItem("addMillis", CompletionItemKind.Method),
								new vscode.CompletionItem("sub", CompletionItemKind.Method),
								new vscode.CompletionItem("mul", CompletionItemKind.Method),
								new vscode.CompletionItem("div", CompletionItemKind.Method),
								new vscode.CompletionItem("format", CompletionItemKind.Method)
							];
							
						} else if (linePrefix.match(/TimeSpan/)) {
							completionItems = [
								new vscode.CompletionItem("fromDays", CompletionItemKind.Method),
								new vscode.CompletionItem("fromHours", CompletionItemKind.Method),
								new vscode.CompletionItem("fromMinutes", CompletionItemKind.Method),
								new vscode.CompletionItem("fromSeconds", CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/Stopwatch\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("start", CompletionItemKind.Method),
								new vscode.CompletionItem("stop", CompletionItemKind.Method),
								new vscode.CompletionItem("reset", CompletionItemKind.Method),
								new vscode.CompletionItem("restart", CompletionItemKind.Method),
								new vscode.CompletionItem("elapsed", CompletionItemKind.Method),
								new vscode.CompletionItem("isRunning", CompletionItemKind.Method),
								new vscode.CompletionItem("isElapsed", CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/Clipboard\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("clear", CompletionItemKind.Method),
								new vscode.CompletionItem("copy", CompletionItemKind.Method),
								new vscode.CompletionItem("paste", CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/Overlay\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem('setOpacity', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('getState', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('setState', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('getRegion', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('move', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('spin', vscode.CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/File/)) {
							completionItems = [
								new vscode.CompletionItem('writeText', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('writeLines', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('appendText', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('appendLines', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('readText', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('readLines', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('separator', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('copy', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('delete', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('exists', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('isDir', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('mkdirs', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('list', vscode.CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/Cache/)) {
							completionItems = [
								new vscode.CompletionItem('screen', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('screenOff', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('region', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('regionOff', vscode.CompletionItemKind.Method),
								new vscode.CompletionItem('clearImage', vscode.CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/Env/)) {
							completionItems = [
								new vscode.CompletionItem("macroX", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setMacroX", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("macroY", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setMacroY", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("deviceX", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("deviceY", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("deviceW", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("deviceH", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("scale", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setScale", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setCompareWidth", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("isDebug", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setDebug", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setMessageDone", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setMessageStop", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setMessageError", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setMacroCutouts", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("setDeviceCutouts", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("cutouts", vscode.CompletionItemKind.Method)
							];
						} else if (linePrefix.match(/Version\s*\(.*\)/)) {
							completionItems = [
								new vscode.CompletionItem("major", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("minor", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("build", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("revision", vscode.CompletionItemKind.Method),
								new vscode.CompletionItem("compare", vscode.CompletionItemKind.Method)
							];
						} 
						return new vscode.CompletionList(completionItems);
					}
				}
			},
			'.' // Trigger completion when a dot is typed
		)
	);
	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
