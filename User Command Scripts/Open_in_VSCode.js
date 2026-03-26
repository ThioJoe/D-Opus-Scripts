// "Open_in_VSCode"
// Opens the provided filepath(s) in VS Code, and dynamically checks for a VS Code workspace to open it in.

// Instructions: Add as a User Command with "Type" set to "Script Function", then "Script Type" set to JScript
// Author: ThioJoe (https://github.com/ThioJoe/D-Opus-Scripts)
// Updated 3/26/26

// Arguments Template:
//         DEBUG/S,OPEN_WORKSPACE/O[<true>,false],NEW_WINDOW/O[<true>,false,default]

// Arguments [Optional]  (If any of these are provided, the arguments will override the corresponding hard coded settings below)
//         OPEN_WORKSPACE - Default: true | Possible values: true, false | Equivalent to "openInWorkspace" variable below.
//         NEW_WINDOW     - Default: true | Possible values: true, false, default | Equivalent to "openNewWindow" variable below.
//         DEBUG (Switch) - If provided, sets debugOutput to true

// ---------- CONFIGURATION ----------
// Whether to also look for a .code-workspace file and open the file in that context.
//     It always checks next to the file, and also in paths set by workspacePathsToCheck
//     If a folder is selected and a code-workspace file is found, it will simply open the code workspace
var openInWorkspace = true; 

// Whether to force a new window, reuse the window, or let VS Code decide ("default")
//     Possible values: "true" (new window), "false" (reuse window), "default" (no flag)
var openNewWindow = "default";

// If openInWorkspace, these relative paths will also be checked for a .code-workspace file (opens the first one found).
//     Note: Remember to use "\\" for backslashes in JScript strings (e.g. "..\\.vscode")
var workspacePathsToCheck = [
    ".vscode"
    , "..\\"         // Parent Directory
    , "..\\.vscode"  // In .vscode folder within parent directory
]; 

// Map of VS Code profile names to a list of file extensions (no dot).
//     Use this to open certain file types with a specific profile you have in VS Code.
//     Note: This is only used if no .code-workspace file is found for the item.
var extensionProfileMap = {
    //"AutoHotkey": ["ahk", "ahk2"] // Example
};

// Set to true to show log messages in the Directory Opus Script Log (Help -> Script Log)
var debugOutput = false;


// --------------------------------------------------
function Log(msg) {
    if (debugOutput) DOpus.Output(msg);
}

function OnClick(clickData) {
    Log("--- Open_in_VSCode Script Function Execution Started ---");

    // Sanitize config variables in case user used booleans/strings interchangeably
    if (openNewWindow === true) openNewWindow = "true";
    if (openNewWindow === false) openNewWindow = "false";
    if (typeof openInWorkspace === "string"){
        openInWorkspace = (openInWorkspace.toLowerCase() === "true");
    }

    // Arguments
    if (clickData.func.args.got_arg.DEBUG) {
        debugOutput = true;
        //DOpus.Output("Received DEBUG switch argument");
    }

    if (clickData.func.args.got_arg.OPEN_WORKSPACE) {
        // If OPEN_WORKSPACE was provided but undefined (no value), assume user wants to use default value (true)
        if (typeof clickData.func.args.OPEN_WORKSPACE !== 'string' || clickData.func.args.OPEN_WORKSPACE === 'true') {
            openInWorkspace = true;
        } else if (clickData.func.args.OPEN_WORKSPACE === 'false') {
            openInWorkspace = false;
        } else {
            DOpus.Output("Open_in_VSCode Error: Invalid value for OPEN_WORKSPACE argument. Must be 'true' or 'false'. Got:  " + clickData.func.args.OPEN_WORKSPACE);
            return;
        }
    }

    if (clickData.func.args.got_arg.NEW_WINDOW) {
        if (typeof clickData.func.args.NEW_WINDOW !== 'string' || clickData.func.args.NEW_WINDOW === 'true') {
            openNewWindow = "true";
        } else if (clickData.func.args.NEW_WINDOW === 'false') {
            openNewWindow = "false";
        } else if (clickData.func.args.NEW_WINDOW === 'default') {
            openNewWindow = "default";
        } else {
            DOpus.Output("Open_in_VSCode Error: Invalid value for NEW_WINDOW argument. Must be 'true', 'false', or 'default'. Got: " + clickData.func.args.NEW_WINDOW);
            return;
        }
    }

    // ----------------------------
    var cmd = clickData.func.command;
    cmd.deselect = false;

    var fsu = DOpus.FSUtil();
    var itemsToProcess = [];

    // Fallback: If no files are selected (e.g. clicking folder background), target the current directory
    if (cmd.files.count === 0) {
        Log("Target items count is 0. Using current directory as target.");
        var currentPathItem = fsu.GetItem(clickData.func.sourcetab.path);
        if (currentPathItem) itemsToProcess.push(currentPathItem);
    } else {
        Log("Target items count: " + cmd.files.count);
        for (var e = new Enumerator(cmd.files); !e.atEnd(); e.moveNext()) {
            itemsToProcess.push(e.item());
        }
    }

    if (itemsToProcess.length === 0) {
        Log("No valid items to process.");
        return;
    }

    var vscodePath = "C:\\Program Files\\Microsoft VS Code\\Code.exe";

    for (var i = 0; i < itemsToProcess.length; i++) {
        var item = itemsToProcess[i];
        var itemPath = item.RealPath + "";
        Log("Processing item: " + itemPath);
        
        var isDir = item.is_dir;
        Log("Is directory: " + isDir);

        var targetDir = isDir ? itemPath : item.path + "";
        Log("Target directory to search for workspace: " + targetDir);
        
        var workspaceFile = null;
        if (openInWorkspace) {
            workspaceFile = FindWorkspace(targetDir, fsu);
        } else {
            Log("openInWorkspace is FALSE, skipping workspace check.");
        }

        Log("Final workspace selection: " + (workspaceFile ? workspaceFile : "none"));

        var runCmd = '@async:"' + vscodePath + '"';

        // Add Window Management Flags
        if (openNewWindow === "true") {
            runCmd += " -n";
        } else if (openNewWindow === "false") {
            runCmd += " -r";
        }

        if (workspaceFile) {
            if (isDir) {
                // If targeting a folder and workspace found, just open the workspace
                runCmd += ' "' + workspaceFile + '"';
            } else {
                // If targeting a file and workspace found, open file in context
                runCmd += ' "' + workspaceFile + '" "' + itemPath + '"';
            }
        } else {
            // No workspace found - Check for profile mapping if it's a file
            if (!isDir) {
                var ext = (item.ext + "").toLowerCase().replace(".", "");
                
                var matchedProfile = null;
                for (var profileName in extensionProfileMap) {
                    var extensions = extensionProfileMap[profileName];
                    for (var j = 0; j < extensions.length; j++) {
                        if (extensions[j].toLowerCase() === ext) {
                            matchedProfile = profileName;
                            break;
                        }
                    }
                    if (matchedProfile) break;
                }

                if (matchedProfile) {
                    Log("  No workspace found, but extension matched profile map: " + matchedProfile);
                    runCmd += ' --profile "' + matchedProfile + '"';
                }
            }
            runCmd += ' "' + itemPath + '"';
        }

        Log("Executing command: " + runCmd);
        cmd.RunCommand(runCmd);
    }
    Log("--- Open_in_VSCode Script Function Execution Finished ---");
}

function FindWorkspace(folderPath, fsu) {
    Log("  FindWorkspace searching root: " + folderPath);
    
    // 1. Check the immediate directory first
    var wp = SearchFolder(folderPath, fsu);
    if (wp) return wp;

    // 2. Check the list of additional paths
    for (var i = 0; i < workspacePathsToCheck.length; i++) {
        var subDirName = workspacePathsToCheck[i];
        
        var cleanSub = subDirName;
        if (cleanSub.charAt(0) == "\\") cleanSub = cleanSub.substring(1);

        // Concatenate and then use Resolve to handle the ".." logic
        var combinedPath = folderPath + "\\" + cleanSub;
        var fullSubPath = fsu.Resolve(combinedPath) + "";
        
        Log("  Checking additional path: " + fullSubPath);
        if (fsu.Exists(fullSubPath)) {
            var found = SearchFolder(fullSubPath, fsu);
            if (found) return found;
        } else {
            Log("    Path does not exist: " + fullSubPath);
        }
    }

    return null;
}

function SearchFolder(folderPath, fsu) {
    Log("    Searching for .code-workspace in: " + folderPath);
    try {
        var folderEnum = fsu.ReadDir(folderPath, false);
        while (!folderEnum.complete) {
            var fileItem = folderEnum.Next();
            if (fileItem && !fileItem.is_dir && (fileItem.ext + "").toLowerCase() === ".code-workspace") {
                Log("    FOUND: " + fileItem.RealPath);
                return fileItem.RealPath + "";
            }
        }
    } catch (e) {
        Log("    Error reading directory: " + e.message);
    }
    return null;
}