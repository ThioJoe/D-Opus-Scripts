// Copy a tree view of selected files/folders
// By ThioJoe
// Updated: 7/2/24 (First Version)

//   Argument Template:
//   UP_ONE_CONTEXT/O/S,FILES_FIRST/O/S,EXPAND_DEPTH/O/N,CONTEXT_LINE/O

function OnClick(clickData)
{
    // ------- Options (These values will be used if no corresponding argument is specified when calling script --------
    // True/False - Whether to list files before folders
    // >  Optional Argument Name: FILES_FIRST (Switch, no value needed)
    var filesFirst = false;
    
    // Integer - Depth to expand folders. 0 for no expansion, -1 for unlimited depth
    // >  Optional Argument Name: EXPAND_DEPTH (Integer value)
    var expandDepth = -1;
    
    // String - What to show as the top line. Nothing, name of the source folder, or path of the source folder
    // Possible Values: "none", "folder", "path"
    // >  Optional Argument Name: CONTEXT_LINE (String value)
    var contextLine = "folder";
    
    // True/False - If true (or argument included), the context line will be moved up by one folder.
    // >  Optional Argument Name: UP_ONE_CONTEXT (Switch, no value needed)
    var showSourceOneUpContext = false;

    // -----------------------------------------------------------------------------------------------------------------
    // Example usage of arguments:
    // Copy_Tree_View UP_ONE_CONTEXT FILES_FIRST EXPAND_DEPTH=1 CONTEXT_LINE="path"
    // -----------------------------------------------------------------------------------------------------------------

    // ------------------------ APPEARANCE SETTINGS ------------------------
    // The character(s) to use for files at a middle branch of the tree
    var middleFileBranch = "├───";
    // The character(s) to use for files at an end branch of the tree
    var endFileBranch = "└───";
    // The character(s) to use for folders at a middle branch of the tree
    var middleFolderBranch = "├───";
    // The character(s) to use for folders at an end branch of the tree
    var endFolderBranch = "└───";
    // The character(s) to use as a spacer and directory layers not connected to a file/folder
    var verticalBranch = "│";

    // Folder name settings, such as to add brackets surrounding folder names like this or something: [Folder Name]
    // The string to prefix folder names with (default is empty string)
    var folderPrefix = "";
    // The string to suffix folder names with (default is empty string)
    var folderSuffix = "";
    // ---------------------------------------------------------------------

    // Parse optional arguments if they're there
    if (clickData.func.args.got_arg.UP_ONE_CONTEXT) {
        showSourceOneUpContext = true;
        DOpus.Output("Received UP_ONE_CONTEXT argument");
    }
    
    if (clickData.func.args.got_arg.FILES_FIRST) {
        filesFirst = true;
        DOpus.Output("Received FILES_FIRST argument");
    }
    
    if (clickData.func.args.got_arg.EXPAND_DEPTH) {
        // Validate argument value
        var argExpandDepth = parseInt(clickData.func.args.EXPAND_DEPTH, 10);
        if (!isNaN(argExpandDepth) && (argExpandDepth >= -1)) {
            expandDepth = argExpandDepth;
        } else {
            expandDepth = -1;
            DOpus.Output("ERROR: Invalid EXPAND_DEPTH argument. Must be an integer >= -1. Got: " + clickData.func.args.EXPAND_DEPTH);
        }
        DOpus.Output("Received EXPAND_DEPTH argument: " + expandDepth);
    }
    
    if (clickData.func.args.got_arg.CONTEXT_LINE) {
        // Validate argument value
        var argContextLine = clickData.func.args.CONTEXT_LINE.toLowerCase();
        if (argContextLine === "none" || argContextLine === "folder" || argContextLine === "path") {
            contextLine = argContextLine;
        } else {
            contextLine = "folder";
            DOpus.Output("ERROR: Invalid CONTEXT_LINE argument. Must be either 'none', 'folder', or 'path'. Got: " + clickData.func.args.CONTEXT_LINE);
        }
        DOpus.Output("Received CONTEXT_LINE argument: " + contextLine);
    }

    // Make contextLine lower case
    contextLine = contextLine.toLowerCase()

    var tab = clickData.func.sourcetab;
    var selectedItems = tab.selected;
    var sourcePathDepth = tab.path.Split.count;

    // Adjust initial depth based on the context
    var initialDepth = showSourceOneUpContext ? sourcePathDepth - 1 : sourcePathDepth;

    var expandedItems = expandSelectedItems(selectedItems, expandDepth);

    // Decide top level line to print. Whether current folder name, current full path name, or up-one context
    var topLine = "";
    if (contextLine !== "none") {

        if (showSourceOneUpContext === true) {

            var parentPath = DOpus.FSUtil.NewPath(tab.path);
            parentPath.Parent();

            if (contextLine === "folder") {
                topLine = parentPath.filepart + "\n";
            } else if (contextLine === "path") {
                topLine = parentPath + "\n";
            }

        } else if (showSourceOneUpContext === false) {

            if (contextLine === "folder") {
                topLine = tab.path.filepart + "\n";
            } else if (contextLine === "path") {
                topLine = tab.path + "\n";
            }
        }
    }

    // Create the tree output
    var treeOutput = topLine;
    treeOutput += generateTree(expandedItems, initialDepth, filesFirst, middleFileBranch, endFileBranch, middleFolderBranch, endFolderBranch, verticalBranch, folderPrefix, folderSuffix);

    DOpus.SetClip(treeOutput);
}

function expandSelectedItems(items, expandDepth) {
    var expandedItems = DOpus.Create().Vector();

    function expand(item, depth) {
        expandedItems.push_back(item);
        if (item.is_dir && (expandDepth === -1 || depth < expandDepth)) {
            var folderEnum = DOpus.FSUtil.ReadDir(item, false);
            while (!folderEnum.complete) {
                var subItem = folderEnum.Next();
                if (subItem) {
                    expand(subItem, depth + 1);
                }
            }
        }
    }

    for (var i = 0; i < items.count; i++) {
        expand(items(i), 0);
    }

    return expandedItems;
}

function generateTree(items, baseDepth, filesFirst, middleFileBranch, endFileBranch, middleFolderBranch, endFolderBranch, verticalBranch, folderPrefix, folderSuffix) {
    var treeText = "";
    var pathTree = {};

    // Build the tree structure
    for (var i = 0; i < items.count; i++) {
        var item = items(i);
        var relativePathParts = item.realpath.Split(baseDepth);

        // Navigate through the tree structure
        var currentLevel = pathTree;
        for (var j = 0; j < relativePathParts.count; j++) {
            var part = relativePathParts(j);
            if (!currentLevel[part]) {
                currentLevel[part] = { "_isDir": (j < relativePathParts.count - 1 || item.is_dir) };
            }
            currentLevel = currentLevel[part];
        }
    }

    // Convert the tree structure to text
    treeText = convertTreeToText(pathTree, "", "", filesFirst, middleFileBranch, endFileBranch, middleFolderBranch, endFolderBranch, verticalBranch, folderPrefix, folderSuffix, true);

    return treeText;
}

function convertTreeToText(tree, folderTerminator, indent, filesFirst, middleFileBranch, endFileBranch, middleFolderBranch, endFolderBranch, verticalBranch, folderPrefix, folderSuffix, isRoot) {
    var treeText = "";
    var entries = [];
    var dirs = [];
    var files = [];

    for (var key in tree) {
        if (tree.hasOwnProperty(key) && key !== "_isDir") {
            if (tree[key]["_isDir"]) {
                dirs.push(key);
            } else {
                files.push(key);
            }
        }
    }

    // Sort files and directories as needed
    if (filesFirst) {
        entries = files.concat(dirs);
    } else {
        entries = dirs.concat(files);
    }

    for (var i = 0; i < entries.length; i++) {
        var key = entries[i];
        var isDir = tree[key]["_isDir"];
        var isLastEntry = (i === entries.length - 1);
        var isLastFile = (i === files.length - 1 && filesFirst && i < files.length);

        var line = indent + (isDir ? (isLastEntry ? endFolderBranch : middleFolderBranch) : (isLastEntry || isLastFile ? endFileBranch : middleFileBranch)) + (isDir ? folderPrefix + key + folderSuffix : key) + "\n";
        treeText += line;

        if (isDir) {
            var subTreeText = convertTreeToText(tree[key], folderTerminator, indent + (isLastEntry ? "    " : verticalBranch + "   "), filesFirst, middleFileBranch, endFileBranch, middleFolderBranch, endFolderBranch, verticalBranch, folderPrefix, folderSuffix, false);
            treeText += subTreeText;

            // Add a blank line after each directory for readability, but not if it's the last entry in the root and only if the folder has sub-items
            if (isDir && !isLastEntry && subTreeText.replace(/^\s+|\s+$/g, '').length > 0) {
                treeText += indent + verticalBranch + "\n";
            }
        }

        // Add a vertical line after the last file and before the first folder
        if (isLastFile && filesFirst && dirs.length > 0) {
            treeText += indent + verticalBranch + "\n";
        }
    }

    return treeText;
}
