// Copies files or folders full paths to clipboard with quotes around it if it has spaces. Various optional behavior for multiple selected items
// By ThioJoe
// Updated: 6/13/24

//   Arguments Template (Must put this in the 'Template' box in the command editor to use arguments):
//   MULTILINE_QUOTE_MODE/O,NO_SINGLE_ITEM_QUOTES/O/S,FOLDER_TERMINATOR/O

//   Example usage of arguments:
//   Copy_File_Paths_Auto_Quoted MULTILINE_QUOTE_MODE="never" NO_SINGLE_ITEM_QUOTES FOLDER_TERMINATOR="\"

function OnClick(clickData) {
    //------------ Options (Note: If arguments are used when calling the script, these values will be overrided by the arguments) ------------
    // multiLineQuoteMode: Affects how quotes are added around each file path when multiple are selected
    // Set to 'never' to never add quotes when multiple selected. 'always' to add to all lines. 'auto' to add for lines with spaces in file path
    // >  Optional Argument Name: MULTILINE_QUOTE_MODE (string value)
    var multiLineQuoteMode = "never";
    // Which trailing path terminator to add (if any) to the end of full paths of folders (basically like the 'noterm' modifier)
    // Just set to empty string if none wanted. Don't forget to escape as necessary (to add a backslash would be like: "\\")
    // >  Optional Argument Name: FOLDER_TERMINATOR (string value)
    var includeTrailingTerminator = "";
    // forceNoSingleItemQuotes: If true, won't put quotes around a file path even if there are spaces. Only applies when ony a single item is selected.
    // >  Optional Argument Name: NO_SINGLE_ITEM_QUOTES (Switch, no value needed)
    var forceNoSingleItemQuotes = false;
    //---------------------------------
    
    var tab = clickData.func.sourcetab;
    var selectedItems = tab.selected;

    if (selectedItems.count == 0) {
        return; // No files selected, nothing to do.
    }

     // Parse optional arguments if they're there
    if (clickData.func.args.got_arg.NO_SINGLE_ITEM_QUOTES) {
        forceNoSingleItemQuotes = true;
        //DOpus.Output("Received NO_SINGLE_ITEM_QUOTES argument");
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

    if (clickData.func.args.got_arg.FOLDER_TERMINATOR) {
        includeTrailingTerminator = clickData.func.args.FOLDER_TERMINATOR;
        //DOpus.Output("Received FOLDER_TERMINATOR argument");
    }

    var clipboardText = "";
    // If single item is selected
    if (selectedItems.count == 1) {
        var singleItem = selectedItems(0);
        var filePath = String(singleItem.realpath);
        if (singleItem.is_dir) {
            filePath += includeTrailingTerminator;
        }
        // If no spaces in the filename or argument given to not use quotes
        if (filePath.indexOf(" ") == -1 || forceNoSingleItemQuotes == true) {
            // No spaces in the file path
            clipboardText = filePath;
        } else {
            // File path contains spaces
            clipboardText = '"' + filePath + '"';
        }
    } else {
        // Multiple items selected
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
