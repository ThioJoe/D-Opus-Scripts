// All Events Logger for Directory Opus
//
// This script implements every possible scripting event and logs the contents of the event's data object to the Script Log when the event is triggered.
//

// ======== SCRIPT INITIALIZATION ========

// Called by Directory Opus to initialize the script.
function OnInit(initData) {
    initData.name = "Events Logger";
    initData.desc = "Logs all scripting events and their data to the output window for informational purposes.";
    initData.version = "1.0";
    initData.default_enable = true;

    // --- Configuration ---
    var configDesc = DOpus.Create.OrderedMap();
    var configGroups = DOpus.Create.OrderedMap();

    var ListenOnlyOptionFriendlyName = "Use Listen Only List";
    var ExcludeOptionFriendlyName = "Use Exclusion List";

    var generalGroupName = "1 - General";
    var filteringGroupName = "2 - Filtering";
    

    // Mode Dropdown
    initData.config.Mode = DOpus.NewVector(0, "Log All Events", ListenOnlyOptionFriendlyName, ExcludeOptionFriendlyName);
    configDesc("Mode") = "Controls which events are logged.";
    configGroups("Mode") = generalGroupName;

    // Bool for whether to show additional data in the log.
    initData.config.Show_Additional_Data = true;
    configDesc("Show_Additional_Data") = "If enabled, additional data will be logged for each event where available, such as listing the items in a vector or map.";
    configGroups("Show_Additional_Data") = generalGroupName;

    // Listen Only List
    initData.config.Listen_Only_For = "";
    configDesc("Listen_Only_For") = "If Mode is '" + ListenOnlyOptionFriendlyName + "', only the events named here (one per line) will be logged.";
    configGroups("Listen_Only_For") = filteringGroupName;

    // Exclusion List
    initData.config.Exclusions = "";
    configDesc("Exclusions") = "If Mode is '" + ExcludeOptionFriendlyName + "', the events named here (one per line) will NOT be logged.";
    configGroups("Exclusions") = filteringGroupName;

    initData.config_groups = configGroups;
    initData.config_desc = configDesc;
    
}

// ======== HELPER FUNCTIONS ========

// A helper to safely log a property from a data object.
function LogProperty(data, propName) {
    // The event data objects are COM objects, not native JScript objects, and do not have the hasOwnProperty method.
    // We can check for property existence by seeing if its value is undefined.
    // We must use bracket notation since propName is a string variable.
    if (data[propName] !== undefined) {
        DOpus.Output("  " + propName + ": " + Stringify(data[propName]));
    } else {
        DOpus.Output("  " + propName + ": (not available)");
    }
}

// A helper to convert DOpus objects to more readable strings for the log.
function Stringify(val) {
    if (val === null) return "null";
    if (typeof val === "undefined") return "undefined";
    if (typeof val !== "object") return String(val);

    // DOpus.Output("DEBUG - Type: " + DOpus.TypeOf(val));
    // DOpus.Output("DEBUG - Stringify raw value output: " + val);

    try {
        if (DOpus.TypeOf(val) === "object.Item") { // Item
            return "[Item: " + val.path + "\\" + val.name + "]";
        }
        if (DOpus.TypeOf(val) === "object.Lister") { // Lister
            return "[Lister hwnd: " + val.hwnd + "]";
        }
        if (DOpus.TypeOf(val) === "object.Tab") { // Tab
            return "[Tab path: " + val.path + "]";
        }
        if (DOpus.TypeOf(val) === "object.Path") { // Path
            return "[Path: " + String(val) + "]";
        }
        if (DOpus.TypeOf(val) === "object.Viewer") { // Viewer
            return "[Viewer hwnd: " + val.hwnd + "]";
        }

        if (DOpus.TypeOf(val) === "object.Vector") { // Vector
            if (Script.config.Show_Additional_Data){
                var items = [];
                for (var i = 0; i < val.count; i++) {
                    items.push(Stringify(val(i)));
                }
                return "[Vector with " + val.count + " items: " + items.join(", ") + "]";
            } else {
                return "[Vector with " + val.count + " items]";
            }
        }

        if (DOpus.TypeOf(val) === "object.Map" || DOpus.TypeOf(val) === "object.OrderedMap") { // Map
            if (Script.config.Show_Additional_Data) {
                var items = [];
                for (var e = new Enumerator(val); !e.atEnd(); e.moveNext()) {
                    var key = e.item();
                    var value = val(key);
                    items.push(key + ": " + Stringify(value));
                }
                return "[Map/OrderedMap with " + val.count + " items: " + items.join(", ") + "]";
            } else {
                return "[Map/OrderedMap with " + val.count + " items]";
            }
        }

        if (val.sourcetab !== undefined && val.desttab !== undefined && val.args !== undefined) { // Func
            return "[Func object]";
        }
    } catch (e) {
        return "[Object - Error in Stringify: " + e + "]";
    }

    return String(val); // Fallback
}

// Helper function to check if an event should be logged based on script config.
function ShouldLogEvent(eventName) {
    var mode = Script.config.Mode; // 0 = All, 1 = Listen Only, 2 = Exclude

    if (mode === 0) {
        return true;

    } else if (mode === 1) { // Use Listen Only List
        if (Script.vars.Exists("ListenEventList")) {
            var listenList = Script.vars.get("ListenEventList");
            // Check if the eventName exists in the listen list. It's a StringSet, so we can use exists method.
            if (listenList.exists(eventName)) {
                return true;
            } else {
                return false;
            }
        } else {
            CreatCachedLists(); // Create the cached lists if they don't exist
            // Re-check after creating cached lists
            return ShouldLogEvent(eventName); // Recursive call to re-evaluate
        }

    } else if (mode === 2) { // Use Exclusion List
        if (Script.vars.Exists("ExcludeEventList")) {
            var excludeList = Script.vars.get("ExcludeEventList");
            if (excludeList.exists(eventName)) {
                return false;
            } else {
                return true;
            }
        } else {
            CreatCachedLists();
            // Re-check after creating cached lists
            return ShouldLogEvent(eventName); // Recursive call to re-evaluate
        }
    }

    return true; // Default fallback
}

// Helper function to create or load a cached list of events from the user's configuration.
// Converts the list to a vector for easy access, stores it in Script.vars.
function CreatCachedLists(){
    var listenOnlyVarName = "ListenEventList";
    var excludeVarName = "ExcludeEventList";

    if (Script.vars.Exists(listenOnlyVarName)) {
        Script.vars.Delete(listenOnlyVarName);
    }

    if (Script.vars.Exists(excludeVarName)) {
        Script.vars.Delete(excludeVarName);
    }

    var listenEventList = DOpus.Create.StringSet();
    var excludeEventList = DOpus.Create.StringSet();

    var listenEventListRaw = String(Script.config.Listen_Only_For).split('\n');
    var excludeEventListRaw = String(Script.config.Exclusions).split('\n');

    for (var i = 0; i < listenEventListRaw.length; i++) {
        var eventName = listenEventListRaw[i].replace(/\r/g, "").replace(/^\s+|\s+$/g, "");
        if (eventName) {
            listenEventList.insert(eventName);
        }
    }

    for (var j = 0; j < excludeEventListRaw.length; j++) {
        var eventName = excludeEventListRaw[j].replace(/\r/g, "").replace(/^\s+|\s+$/g, "");
        if (eventName) {
            excludeEventList.insert(eventName);
        }
    }

    // Store the lists in Script.vars for later use
    Script.vars.set(listenOnlyVarName) = listenEventList;
    Script.vars.set(excludeVarName) = excludeEventList;
}


// ===================================================================== EVENT HANDLERS =====================================================================

function OnAboutScript(aboutData) {
    if (!ShouldLogEvent("OnAboutScript")) return;
    try {
        DOpus.Output("--- OnAboutScript triggered ---");
        LogProperty(aboutData, "window");
    } catch (e) { DOpus.Output("Error in OnAboutScript: " + e); }
}

function OnActivateLister(activateListerData) {
    if (!ShouldLogEvent("OnActivateLister")) return;
    try {
        DOpus.Output("--- OnActivateLister triggered ---");
        LogProperty(activateListerData, "active");
        LogProperty(activateListerData, "lister");
        LogProperty(activateListerData, "qualifiers");
    } catch (e) { DOpus.Output("Error in OnActivateLister: " + e); }
}

function OnActivateTab(activateTabData) {
    if (!ShouldLogEvent("OnActivateTab")) return;
    try {
        DOpus.Output("--- OnActivateTab triggered ---");
        LogProperty(activateTabData, "closing");
        LogProperty(activateTabData, "newtab");
        LogProperty(activateTabData, "oldtab");
        LogProperty(activateTabData, "qualifiers");
    } catch (e) { DOpus.Output("Error in OnActivateTab: " + e); }
}

function OnAfterFolderChange(afterFolderChangeData) {
    if (!ShouldLogEvent("OnAfterFolderChange")) return;
    try {
        DOpus.Output("--- OnAfterFolderChange triggered ---");
        LogProperty(afterFolderChangeData, "action");
        LogProperty(afterFolderChangeData, "path");
        LogProperty(afterFolderChangeData, "qualifiers");
        LogProperty(afterFolderChangeData, "result");
        LogProperty(afterFolderChangeData, "tab");
    } catch (e) { DOpus.Output("Error in OnAfterFolderChange: " + e); }
    return false;
}

function OnBeforeFolderChange(beforeFolderChangeData) {
    if (!ShouldLogEvent("OnBeforeFolderChange")) return;
    try {
        DOpus.Output("--- OnBeforeFolderChange triggered ---");
        LogProperty(beforeFolderChangeData, "action");
        LogProperty(beforeFolderChangeData, "initial");
        LogProperty(beforeFolderChangeData, "path");
        LogProperty(beforeFolderChangeData, "qualifiers");
        LogProperty(beforeFolderChangeData, "tab");
    } catch (e) { DOpus.Output("Error in OnBeforeFolderChange: " + e); }
    return false;
}

function OnClipboardChange(clipboardChangeData) {
    if (!ShouldLogEvent("OnClipboardChange")) return;
    try {
        DOpus.Output("--- OnClipboardChange triggered ---");
        LogProperty(clipboardChangeData, "count");
        LogProperty(clipboardChangeData, "has_files");
    } catch (e) { DOpus.Output("Error in OnClipboardChange: " + e); }
}

function OnCloseLister(closeListerData) {
    if (!ShouldLogEvent("OnCloseLister")) return;
    try {
        DOpus.Output("--- OnCloseLister triggered ---");
        LogProperty(closeListerData, "lister");
        LogProperty(closeListerData, "prevent_save");
        LogProperty(closeListerData, "qualifiers");
        LogProperty(closeListerData, "shutdown");
    } catch (e) { DOpus.Output("Error in OnCloseLister: " + e); }
    return false;
}

function OnCloseTab(closeTabData) {
    if (!ShouldLogEvent("OnCloseTab")) return;
    try {
        DOpus.Output("--- OnCloseTab triggered ---");
        LogProperty(closeTabData, "qualifiers");
        LogProperty(closeTabData, "tab");
    } catch (e) { DOpus.Output("Error in OnCloseTab: " + e); }
    return false;
}

function OnConfigBackup(configBackupData) {
    if (!ShouldLogEvent("OnConfigBackup")) return;
    try {
        DOpus.Output("--- OnConfigBackup triggered ---");
        LogProperty(configBackupData, "location");
        LogProperty(configBackupData, "output_dir");
        LogProperty(configBackupData, "output_name");
    } catch (e) { DOpus.Output("Error in OnConfigBackup: " + e); }
}

function OnConfigRestore(configRestoreData) {
    if (!ShouldLogEvent("OnConfigRestore")) return;
    try {
        DOpus.Output("--- OnConfigRestore triggered ---");
        LogProperty(configRestoreData, "location");
        LogProperty(configRestoreData, "step");
    } catch (e) { DOpus.Output("Error in OnConfigRestore: " + e); }
}

function OnDeleteScript(deleteScriptData) {
    if (!ShouldLogEvent("OnDeleteScript")) return;
    try {
        DOpus.Output("--- OnDeleteScript triggered ---");
        LogProperty(deleteScriptData, "file");
    } catch (e) { DOpus.Output("Error in OnDeleteScript: " + e); }
}

function OnDisplayModeChange(displayModeChangeData) {
    if (!ShouldLogEvent("OnDisplayModeChange")) return;
    try {
        DOpus.Output("--- OnDisplayModeChange triggered ---");
        LogProperty(displayModeChangeData, "mode");
        LogProperty(displayModeChangeData, "qualifiers");
        LogProperty(displayModeChangeData, "tab");
    } catch (e) { DOpus.Output("Error in OnDisplayModeChange: " + e); }
}

function OnDoubleClick(doubleClickData) {
    if (!ShouldLogEvent("OnDoubleClick")) return;
    try {
        DOpus.Output("--- OnDoubleClick triggered ---");
        LogProperty(doubleClickData, "call");
        LogProperty(doubleClickData, "cont");
        LogProperty(doubleClickData, "early");
        LogProperty(doubleClickData, "is_dir");
        LogProperty(doubleClickData, "item");
        LogProperty(doubleClickData, "mouse");
        LogProperty(doubleClickData, "multiple");
        LogProperty(doubleClickData, "path");
        LogProperty(doubleClickData, "qualifiers");
        LogProperty(doubleClickData, "skipfull");
        LogProperty(doubleClickData, "tab");
    } catch (e) { DOpus.Output("Error in OnDoubleClick: " + e); }
    return false;
}

function OnFileOperationComplete(fileOperationCompleteData) {
    if (!ShouldLogEvent("OnFileOperationComplete")) return;
    try {
        DOpus.Output("--- OnFileOperationComplete triggered ---");
        LogProperty(fileOperationCompleteData, "action");
        LogProperty(fileOperationCompleteData, "cmdline");
        LogProperty(fileOperationCompleteData, "data");
        LogProperty(fileOperationCompleteData, "dest");
        LogProperty(fileOperationCompleteData, "qualifiers");
        LogProperty(fileOperationCompleteData, "query");
        LogProperty(fileOperationCompleteData, "source");
        LogProperty(fileOperationCompleteData, "tab");
    } catch (e) { DOpus.Output("Error in OnFileOperationComplete: " + e); }
    if (fileOperationCompleteData.query) {
        return true;
    }
}

function OnFilesystemChange(filesystemChangeData) {
    if (!ShouldLogEvent("OnFilesystemChange")) return;
    try {
        DOpus.Output("--- OnFilesystemChange triggered ---");
        LogProperty(filesystemChangeData, "id");
    } catch (e) { DOpus.Output("Error in OnFilesystemChange: " + e); }
}

function OnFlatViewChange(flatViewChangeData) {
    if (!ShouldLogEvent("OnFlatViewChange")) return;
    try {
        DOpus.Output("--- OnFlatViewChange triggered ---");
        LogProperty(flatViewChangeData, "mode");
        LogProperty(flatViewChangeData, "qualifiers");
        LogProperty(flatViewChangeData, "tab");
    } catch (e) { DOpus.Output("Error in OnFlatViewChange: " + e); }
}

function OnGetCopyQueueName(getCopyQueueNameData) {
    if (!ShouldLogEvent("OnGetCopyQueueName")) return;
    try {
        DOpus.Output("--- OnGetCopyQueueName triggered ---");
        LogProperty(getCopyQueueNameData, "dest");
        LogProperty(getCopyQueueNameData, "desttab");
        LogProperty(getCopyQueueNameData, "dest_drives");
        LogProperty(getCopyQueueNameData, "move");
        LogProperty(getCopyQueueNameData, "name");
        LogProperty(getCopyQueueNameData, "source");
        LogProperty(getCopyQueueNameData, "sourcetab");
        LogProperty(getCopyQueueNameData, "source_drives");
    } catch (e) { DOpus.Output("Error in OnGetCopyQueueName: " + e); }
    return false;
}

function OnGetCustomFields(getCustomFieldData) {
    if (!ShouldLogEvent("OnGetCustomFields")) return;
    try {
        DOpus.Output("--- OnGetCustomFields triggered ---");
        LogProperty(getCustomFieldData, "fields");
        LogProperty(getCustomFieldData, "field_labels");
        LogProperty(getCustomFieldData, "field_tips");
        LogProperty(getCustomFieldData, "focus");
    } catch (e) { DOpus.Output("Error in OnGetCustomFields: " + e); }
}

function OnGetNewName(getNewNameData) {
    if (!ShouldLogEvent("OnGetNewName")) return;
    try {
        DOpus.Output("--- OnGetNewName triggered ---");
        LogProperty(getNewNameData, "custom");
        LogProperty(getNewNameData, "item");
        LogProperty(getNewNameData, "newname");
        LogProperty(getNewNameData, "newname_ext");
        LogProperty(getNewNameData, "newname_ext_m");
        LogProperty(getNewNameData, "newname_field");
        LogProperty(getNewNameData, "newname_stem");
        LogProperty(getNewNameData, "newname_stem_m");
        LogProperty(getNewNameData, "oldname_field");
        LogProperty(getNewNameData, "preview");
        LogProperty(getNewNameData, "tab");
    } catch (e) { DOpus.Output("Error in OnGetNewName: " + e); }
    return false;
}

function OnListerResize(listerResizeData) {
    if (!ShouldLogEvent("OnListerResize")) return;
    try {
        DOpus.Output("--- OnListerResize triggered ---");
        LogProperty(listerResizeData, "action");
        LogProperty(listerResizeData, "width");
        LogProperty(listerResizeData, "height");
        LogProperty(listerResizeData, "lister");
    } catch (e) { DOpus.Output("Error in OnListerResize: " + e); }
}

function OnListerUIChange(listerUIChangeData) {
    if (!ShouldLogEvent("OnListerUIChange")) return;
    try {
        DOpus.Output("--- OnListerUIChange triggered ---");
        LogProperty(listerUIChangeData, "change");
        LogProperty(listerUIChangeData, "lister");
        LogProperty(listerUIChangeData, "qualifiers");
    } catch (e) { DOpus.Output("Error in OnListerUIChange: " + e); }
}

function OnOpenLister(openListerData) {
    if (!ShouldLogEvent("OnOpenLister")) return;
    try {
        DOpus.Output("--- OnOpenLister triggered ---");
        LogProperty(openListerData, "after");
        LogProperty(openListerData, "lister");
        LogProperty(openListerData, "qualifiers");
    } catch (e) { DOpus.Output("Error in OnOpenLister: " + e); }
    if (!openListerData.after) {
        return true;
    }
}

function OnOpenTab(openTabData) {
    if (!ShouldLogEvent("OnOpenTab")) return;
    try {
        DOpus.Output("--- OnOpenTab triggered ---");
        LogProperty(openTabData, "qualifiers");
        LogProperty(openTabData, "tab");
    } catch (e) { DOpus.Output("Error in OnOpenTab: " + e); }
}

function OnPeriodicTimer(periodicTimerData) {
    if (!ShouldLogEvent("OnPeriodicTimer")) return;
    try {
        DOpus.Output("--- OnPeriodicTimer triggered ---");
        LogProperty(periodicTimerData, "id");
    } catch (e) { DOpus.Output("Error in OnPeriodicTimer: " + e); }
}

function OnPowerEvent(powerEventData) {
    if (!ShouldLogEvent("OnPowerEvent")) return;
    try {
        DOpus.Output("--- OnPowerEvent triggered ---");
        LogProperty(powerEventData, "data");
        LogProperty(powerEventData, "type");
    } catch (e) { DOpus.Output("Error in OnPowerEvent: " + e); }
}

function OnQuickFilterChange(quickFilterChangeData) {
    if (!ShouldLogEvent("OnQuickFilterChange")) return;
    try {
        DOpus.Output("--- OnQuickFilterChange triggered ---");
        LogProperty(quickFilterChangeData, "tab");
    } catch (e) { DOpus.Output("Error in OnQuickFilterChange: " + e); }
}

function OnScheduledTimer(scheduledTimerData) {
    if (!ShouldLogEvent("OnScheduledTimer")) return;
    try {
        DOpus.Output("--- OnScheduledTimer triggered ---");
        LogProperty(scheduledTimerData, "id");
    } catch (e) { DOpus.Output("Error in OnScheduledTimer: " + e); }
}

function OnScriptConfigChange(scriptConfigChangeData) {
    // We want to update the cached lists when the script config changes.
    CreatCachedLists(); // Update cached lists based on new config

    if (!ShouldLogEvent("OnScriptConfigChange")) return;
    try {
        DOpus.Output("--- OnScriptConfigChange triggered ---");
        LogProperty(scriptConfigChangeData, "changed");
    } catch (e) { DOpus.Output("Error in OnScriptConfigChange: " + e); }
}

function OnShutdown(shutdownData) {
    if (!ShouldLogEvent("OnShutdown")) return;
    try {
        DOpus.Output("--- OnShutdown triggered ---");
        LogProperty(shutdownData, "endsession");
        LogProperty(shutdownData, "qualifiers");
    } catch (e) { DOpus.Output("Error in OnShutdown: " + e); }
    return false;
}

function OnSourceDestChange(sourceDestData) {
    if (!ShouldLogEvent("OnSourceDestChange")) return;
    try {
        DOpus.Output("--- OnSourceDestChange triggered ---");
        LogProperty(sourceDestData, "dest");
        LogProperty(sourceDestData, "source");
        LogProperty(sourceDestData, "qualifiers");
        LogProperty(sourceDestData, "tab");
    } catch (e) { DOpus.Output("Error in OnSourceDestChange: " + e); }
}

function OnStartup(startupData) {
    if (!ShouldLogEvent("OnStartup")) return;
    try {
        DOpus.Output("--- OnStartup triggered ---");
        // StartupData currently has no properties.
    } catch (e) { DOpus.Output("Error in OnStartup: " + e); }
}

function OnStyleSelected(styleSelectedData) {
    if (!ShouldLogEvent("OnStyleSelected")) return;
    try {
        DOpus.Output("--- OnStyleSelected triggered ---");
        LogProperty(styleSelectedData, "lister");
        LogProperty(styleSelectedData, "qualifiers");
        LogProperty(styleSelectedData, "style");
    } catch (e) { DOpus.Output("Error in OnStyleSelected: " + e); }
}

function OnSystemSettingChange(systemSettingChangeData) {
    if (!ShouldLogEvent("OnSystemSettingChange")) return;
    try {
        DOpus.Output("--- OnSystemSettingChange triggered ---");
        LogProperty(systemSettingChangeData, "type");
        LogProperty(systemSettingChangeData, "name");
    } catch (e) { DOpus.Output("Error in OnSystemSettingChange: " + e); }
}

function OnTabClick(tabClickData) {
    if (!ShouldLogEvent("OnTabClick")) return;
    try {
        DOpus.Output("--- OnTabClick triggered ---");
        LogProperty(tabClickData, "qualifiers");
        LogProperty(tabClickData, "tab");
    } catch (e) { DOpus.Output("Error in OnTabClick: " + e); }
    return false;
}

function OnViewerEvent(viewerEventData) {
    if (!ShouldLogEvent("OnViewerEvent")) return;
    try {
        DOpus.Output("--- OnViewerEvent triggered ---");
        LogProperty(viewerEventData, "event");
        LogProperty(viewerEventData, "item");
        LogProperty(viewerEventData, "viewer");
        LogProperty(viewerEventData, "x");
        LogProperty(viewerEventData, "y");
        LogProperty(viewerEventData, "w");
        LogProperty(viewerEventData, "h");
    } catch (e) { DOpus.Output("Error in OnViewerEvent: " + e); }
}


// ======== CUSTOM EVENT HANDLERS (for commands/columns if enabled) ========

function OnTestColumn(scriptColumnData) {
    if (!ShouldLogEvent("OnTestColumn")) return;
    try {
        DOpus.Output("--- OnTestColumn triggered ---");
        LogProperty(scriptColumnData, "col");
        LogProperty(scriptColumnData, "columns");
        LogProperty(scriptColumnData, "group");
        LogProperty(scriptColumnData, "group_type");
        LogProperty(scriptColumnData, "item");
        LogProperty(scriptColumnData, "markup");
        LogProperty(scriptColumnData, "sort");
        LogProperty(scriptColumnData, "tab");
        LogProperty(scriptColumnData, "type");
        LogProperty(scriptColumnData, "value");
        LogProperty(scriptColumnData, "userdata");
    } catch (e) { DOpus.Output("Error in OnTestColumn: " + e); }
    scriptColumnData.value = "Test OK";
}

function OnTestEventsCommand(scriptCommandData) {
    if (!ShouldLogEvent("OnTestEventsCommand")) return;
    try {
        DOpus.Output("--- OnTestEventsCommand triggered ---");
        LogProperty(scriptCommandData, "cmdline");
        LogProperty(scriptCommandData, "fayt");
        LogProperty(scriptCommandData, "func");
    } catch (e) { DOpus.Output("Error in OnTestEventsCommand: " + e); }
    return false;
}

function OnTestFAYT(scriptFAYTCommandData) {
    if (!ShouldLogEvent("OnTestFAYT")) return;
    try {
        DOpus.Output("--- OnTestFAYT triggered ---");
        LogProperty(scriptFAYTCommandData, "cmdline");
        LogProperty(scriptFAYTCommandData, "fayt");
        LogProperty(scriptFAYTCommandData, "flags");
        LogProperty(scriptFAYTCommandData, "key");
        LogProperty(scriptFAYTCommandData, "suggest");
        LogProperty(scriptFAYTCommandData, "quickkey");
        LogProperty(scriptFAYTCommandData, "tab");
    } catch (e) { DOpus.Output("Error in OnTestFAYT: " + e); }
}