// Copies files or folders names to clipboard with quotes around it if it has spaces. Various optional behavior for multiple selected items
// By ThioJoe
// Updated: 6/5/24 (First Version)
// For Latest Version: https://github.com/ThioJoe/D-Opus-Scripts/blob/main/Copy_File_Names_Auto_Quoted.js

function OnClick(clickData) {
    //------------ Options ------------
    // multiLineQuoteMode: Affects how quotes are added to each file name when multiple are selected
    //    'never' to never add quotes when multiple selected. 'always' to add to all lines. 'auto' to add for lines with spaces in file name
    var multiLineQuoteMode = "never";
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
        if (singleItem.name.indexOf(" ") == -1) {
            // No spaces in the filename
            clipboardText = singleItem.name;
        } else {
            // Filename contains spaces
            clipboardText = '"' + singleItem.name + '"';
        }
    } else {
        // Multiple files selected
        for (var i = 0; i < selectedItems.count; i++) {
            var fileName = selectedItems(i).name;
            //Add a newline character to the beginning starting after the first line
            if (i > 0) {
                clipboardText += "\n";
            }
            if (multiLineQuoteMode === "always") {
                clipboardText += '"' + fileName + '"';
            } else if (multiLineQuoteMode === "auto" && fileName.indexOf(" ") !== -1) {
                clipboardText += '"' + fileName + '"';
            } else {
                clipboardText += fileName;
            }
        }
    }

    DOpus.SetClip(clipboardText);
    // For debugging:
    //DOpus.Output("--- Copied to clipboard: ---\n" + clipboardText);
}