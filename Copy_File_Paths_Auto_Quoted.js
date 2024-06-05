// Copies files or folders full paths to clipboard with quotes around it if it has spaces. Various optional behavior for multiple selected items
// By ThioJoe
// Updated: 6/5/24 (First Version)
// For Latest Version: https://github.com/ThioJoe/D-Opus-Scripts/blob/main/Copy_File_Paths_Auto_Quoted.js

function OnClick(clickData) {
    //------------ Options ------------
    // multiLineQuoteMode: Affects how quotes are added around each file path when multiple are selected
    //    'never' to never add quotes when multiple selected. 'always' to add to all lines. 'auto' to add for lines with spaces in file path
    var multiLineQuoteMode = "never";
    // Which trailing path terminator to add (if any) to the end of full paths of folders (basically like the 'noterm' modifier)
    // Just set to empty string if none wanted. Don't forget to escape as necessary (to add a backslash would be like: "\\")
    var includeTrailingTerminator = "";
    //---------------------------------
    
    var cmd = clickData.func.command;
    var tab = clickData.func.sourcetab;
    var selectedItems = tab.selected;

    if (selectedItems.count == 0) {
        return; // No files selected, nothing to do.
    }

    var clipboardText = "";
    if (selectedItems.count == 1) {
        var singleItem = selectedItems(0);
        var filePath = String(singleItem.realpath);
        if (singleItem.is_dir) {
            filePath += includeTrailingTerminator;
        }
        if (filePath.indexOf(" ") == -1) {
            // No spaces in the file path
            clipboardText = filePath;
        } else {
            // File path contains spaces
            clipboardText = '"' + filePath + '"';
        }
    } else {
        // Multiple files selected
        for (var i = 0; i < selectedItems.count; i++) {
            var filePath = String(selectedItems(i).realpath);
            if (selectedItems(i).is_dir) {
                filePath += includeTrailingTerminator;
            }
            //Add a newline character to the beginning starting after the first line
            if (i > 0) {
                clipboardText += "\n";
            }
            if (multiLineQuoteMode === "always") {
                clipboardText += '"' + filePath + '"';
            } else if (multiLineQuoteMode === "auto" && filePath.indexOf(" ") !== -1) {
                clipboardText += '"' + filePath + '"';
            } else {
                clipboardText += filePath;
            }
        }
    }

    DOpus.SetClip(clipboardText);
    // For debugging:
    //DOpus.Output("--- Copied to clipboard: ---\n" + clipboardText);
}