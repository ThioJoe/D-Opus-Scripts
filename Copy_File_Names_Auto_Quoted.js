// Copies files or folders names to clipboard with quotes around it if it has spaces. Various optional behavior for multiple selected items
// By ThioJoe
// Updated: 6/13/24

//   Arguments Template (Must put this in the 'Template' box in the command editor to use arguments):
//   MULTILINE_QUOTE_MODE/O,NO_SINGLE_ITEM_QUOTES/O/S

//   Example usage of arguments:
//   Copy_File_Names_Auto_Quoted MULTILINE_QUOTE_MODE="never" NO_SINGLE_ITEM_QUOTES

function OnClick(clickData) {
    //------------ Options (Note: If arguments are used when calling the script, these values will be overrided by the arguments)  ------------
    // multiLineQuoteMode: Affects how quotes are added to each file name when multiple are selected
    // Set to 'never' to never add quotes when multiple selected. 'always' to add to all lines. 'auto' to add for lines with spaces in file name
    // >  Optional Argument Name: MULTILINE_QUOTE_MODE (string value)
    var multiLineQuoteMode = "never";
    // forceNoSingleItemQuotes: If true, won't put quotes around a file name even if there are spaces. Only applies when ony a single item is selected.
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

    var clipboardText = "";
    // If single item is selected
    if (selectedItems.count == 1) {
        var singleItem = selectedItems(0);
        // If no spaces in the filename or argument given to not use quotes
        if (singleItem.name.indexOf(" ") == -1 || forceNoSingleItemQuotes == true) {
            clipboardText = singleItem.name;
        } else {
            // Filename contains spaces
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
