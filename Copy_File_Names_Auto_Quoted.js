// Copies files or folders names to clipboard with quotes around it if it has spaces. Various optional behavior for multiple selected items
// By ThioJoe
// Updated: 6/13/24

// Discussion Thread / Latest Version: https://resource.dopus.com/t/scripts-to-copy-file-folder-name-s-or-path-s-with-automatic-surrounding-quotes-based-on-spaces/51122
// Updates also available on my GitHub repo: https://github.com/ThioJoe/D-Opus-Scripts

//   Arguments Template (Must put this in the 'Template' box in the command editor to use arguments):
//   MULTILINE_QUOTE_MODE/O,SINGLE_ITEM_QUOTE_MODE/O

//   Example usage of arguments:
//   Copy_File_Names_Auto_Quoted MULTILINE_QUOTE_MODE="never" SINGLE_ITEM_QUOTE_MODE="auto"

function OnClick(clickData) {
    //------------ Options (Note: If arguments are used when calling the script, these values will be overrided by the arguments)  ------------
    // multiLineQuoteMode: Affects how quotes are added to each file name when multiple are selected
    // Set to 'never' to never add quotes when multiple selected. 'always' to add to all lines. 'auto' to add for lines with spaces in file name
    // >  Optional Argument Name: MULTILINE_QUOTE_MODE (string value)
    var multiLineQuoteMode = "never";
    // singleItemQuoteMode: Affects how quotes are added to each file name when a single file/folder is selected
    // >  Optional Argument Name: SINGLE_ITEM_QUOTE_MODE (string value)
    var singleItemQuoteMode = "auto";
    //---------------------------------
    
    var tab = clickData.func.sourcetab;
    var selectedItems = tab.selected;

    if (selectedItems.count == 0) {
        return; // No files selected, nothing to do.
    }

    if (clickData.func.args.got_arg.SINGLE_ITEM_QUOTE_MODE) {
        //Validate argument value
        argString = clickData.func.args.SINGLE_ITEM_QUOTE_MODE.toLowerCase();
        if (argString == "never" || argString == "always" || argString == "auto") {
            singleItemQuoteMode = argString;
        } else {
            singleItemQuoteMode = "auto";
            DOpus.Output("ERROR: Invalid SINGLE_ITEM_QUOTE_MODE argument. Must be either 'never', 'always', or 'auto'. Got: " + argString);
        }
        //DOpus.Output("Received SINGLE_ITEM_QUOTE_MODE argument: " + String(clickData.func.args.SINGLE_ITEM_QUOTE_MODE));
    }

    if (clickData.func.args.got_arg.MULTILINE_QUOTE_MODE) {
        //Validate argument value
        argString = clickData.func.args.MULTILINE_QUOTE_MODE.toLowerCase();
        if (argString == "never" || argString == "always" || argString == "auto") {
            multiLineQuoteMode = argString;
        } else {
            multiLineQuoteMode = "never";
            DOpus.Output("ERROR: Invalid MULTILINE_QUOTE_MODE argument. Must be either 'never', 'always', or 'auto'. Got: " + argString);
        }
        //DOpus.Output("Received MULTILINE_QUOTE_MODE argument: " + String(clickData.func.args.MULTILINE_QUOTE_MODE));
    }

    var clipboardText = "";
    // If single item is selected
    if (selectedItems.count == 1) {
        var singleItem = selectedItems(0);
        // If no spaces in the filename or option set to not use quotes
        if (singleItemQuoteMode != "always" && (singleItem.name.indexOf(" ") == -1 || singleItemQuoteMode == "never")) {
            clipboardText = singleItem.name;
        } else {
            // Filename contains spaces or option set to always use quotes
            clipboardText = '"' + singleItem.name + '"';
        }
    // Multiple files are selected
    } else {
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
