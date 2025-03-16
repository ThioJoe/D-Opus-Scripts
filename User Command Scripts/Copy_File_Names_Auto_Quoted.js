// Copies files or folders names to clipboard with quotes around it if it has spaces. Various optional behavior for multiple selected items
// By ThioJoe
// Updated: 3/15/2025

//   Arguments Template (Must put this in the 'Template' box in the command editor to use arguments):
//   MULTILINE_QUOTE_MODE/K[auto,always,never],SINGLE_ITEM_QUOTE_MODE/K[auto,always,never],PREPEND_INSIDE_QUOTES/K,PREPEND_OUTSIDE_QUOTES/K,APPEND_INSIDE_QUOTES/K,APPEND_OUTSIDE_QUOTES/K

//   Example usage of arguments:
//   Copy_File_Names_Auto_Quoted MULTILINE_QUOTE_MODE="never" SINGLE_ITEM_QUOTE_MODE="auto" PREPEND_OUTSIDE_QUOTES="prefix_" APPEND_INSIDE_QUOTES="_suffix"

function OnClick(clickData) {
    //------------ Options (Note: If arguments are used when calling the script, these values will be overrided by the arguments)  ------------
    // multiLineQuoteMode: Affects how quotes are added to each file name when multiple are selected
    // Set to 'never' to never add quotes when multiple selected. 'always' to add to all lines. 'auto' to add for lines with spaces in file name
    // >  Optional Argument Name: MULTILINE_QUOTE_MODE (string value)
    var multiLineQuoteMode = "never";
    // singleItemQuoteMode: Affects how quotes are added to each file name when a single file/folder is selected
    // >  Optional Argument Name: SINGLE_ITEM_QUOTE_MODE (string value)
    var singleItemQuoteMode = "auto";
    // prependInsideQuotes: String to prepend to each file name inside quotes
    // >  Optional Argument Name: PREPEND_INSIDE_QUOTES (string value)
    var prependInsideQuotes = "";
    // prependOutsideQuotes: String to prepend to each file name outside quotes
    // >  Optional Argument Name: PREPEND_OUTSIDE_QUOTES (string value)
    var prependOutsideQuotes = "";
    // appendInsideQuotes: String to append to each file name inside quotes
    // >  Optional Argument Name: APPEND_INSIDE_QUOTES (string value)
    var appendInsideQuotes = "";
    // appendOutsideQuotes: String to append to each file name outside quotes
    // >  Optional Argument Name: APPEND_OUTSIDE_QUOTES (string value)
    var appendOutsideQuotes = "";
    //---------------------------------
    
    var tab = clickData.func.sourcetab;
    var selectedItems = tab.selected;
    clickData.func.command.deselect = false

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

    if (clickData.func.args.got_arg.PREPEND_INSIDE_QUOTES) {
        prependInsideQuotes = clickData.func.args.PREPEND_INSIDE_QUOTES;
        //DOpus.Output("Received PREPEND_INSIDE_QUOTES argument: " + String(prependInsideQuotes));
    }

    if (clickData.func.args.got_arg.PREPEND_OUTSIDE_QUOTES) {
        prependOutsideQuotes = clickData.func.args.PREPEND_OUTSIDE_QUOTES;
        //DOpus.Output("Received PREPEND_OUTSIDE_QUOTES argument: " + String(prependOutsideQuotes));
    }

    if (clickData.func.args.got_arg.APPEND_INSIDE_QUOTES) {
        appendInsideQuotes = clickData.func.args.APPEND_INSIDE_QUOTES;
        //DOpus.Output("Received APPEND_INSIDE_QUOTES argument: " + String(appendInsideQuotes));
    }

    if (clickData.func.args.got_arg.APPEND_OUTSIDE_QUOTES) {
        appendOutsideQuotes = clickData.func.args.APPEND_OUTSIDE_QUOTES;
        //DOpus.Output("Received APPEND_OUTSIDE_QUOTES argument: " + String(appendOutsideQuotes));
    }

	multiLineQuoteMode = multiLineQuoteMode.toLowerCase();
	singleItemQuoteMode = singleItemQuoteMode.toLowerCase();

    var clipboardText = "";
    // If single item is selected
    if (selectedItems.count == 1) {
        var singleItem = selectedItems(0);
        // If no spaces in the filename or argument given to not use quotes
        if (singleItemQuoteMode != "always" && (singleItem.name.indexOf(" ") == -1 || singleItemQuoteMode == "never")) {
            clipboardText = prependOutsideQuotes + prependInsideQuotes + singleItem.name + appendInsideQuotes + appendOutsideQuotes;
        } else {
            // Filename contains spaces
            clipboardText = prependOutsideQuotes + '"' + prependInsideQuotes + singleItem.name + appendInsideQuotes + '"' + appendOutsideQuotes;
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
                clipboardText += prependOutsideQuotes + '"' + prependInsideQuotes + fileName + appendInsideQuotes + '"' + appendOutsideQuotes;
            } else if (multiLineQuoteMode === "auto" && fileName.indexOf(" ") !== -1) {
                clipboardText += prependOutsideQuotes + '"' + prependInsideQuotes + fileName + appendInsideQuotes + '"' + appendOutsideQuotes;
            } else {
                clipboardText += prependOutsideQuotes + prependInsideQuotes + fileName + appendInsideQuotes + appendOutsideQuotes;
            }
        }
    }

    DOpus.SetClip(clipboardText);
    // For debugging:
    //DOpus.Output("--- Copied to clipboard: ---\n" + clipboardText);
}
