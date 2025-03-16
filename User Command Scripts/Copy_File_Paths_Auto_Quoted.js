// Copies files or folders full paths to clipboard with quotes around it if it has spaces. Various optional behavior for multiple selected items
// By ThioJoe
// Updated: 3/15/25

// Discussion Thread / Latest Version: https://resource.dopus.com/t/scripts-to-copy-file-folder-name-s-or-path-s-with-automatic-surrounding-quotes-based-on-spaces/51122
// Updates also available on my GitHub repo: https://github.com/ThioJoe/D-Opus-Scripts

//   Arguments Template (Must put this in the 'Template' box in the command editor to use arguments):
//   MULTILINE_QUOTE_MODE/K[auto,always,never],SINGLE_ITEM_QUOTE_MODE/K[auto,always,never],RESOLVE_SYMLINKS/K[none,symlinkedFiles,symlinkedFolders,both],FOLDER_TERMINATOR/O,PREPEND_INSIDE_QUOTES/K,PREPEND_OUTSIDE_QUOTES/K,APPEND_INSIDE_QUOTES/K,APPEND_OUTSIDE_QUOTES/K

//   Example usage of arguments:
//   Copy_File_Paths_Auto_Quoted MULTILINE_QUOTE_MODE="never" SINGLE_ITEM_QUOTE_MODE="auto" FOLDER_TERMINATOR="\" RESOLVE_SYMLINKS="both" PREPEND_OUTSIDE_QUOTES="prefix_" APPEND_INSIDE_QUOTES="_suffix"

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
    // singleItemQuoteMode: Affects how quotes are added to each file name when a single file/folder is selected
    // >  Optional Argument Name: SINGLE_ITEM_QUOTE_MODE (string value)
    var singleItemQuoteMode = "auto";
    // resolveSymlinksAndJunctions: Whether to copy the resulting linked target path instead of the 'virtual' file/folder for symbolic links (can be either files/folders) and junctions (folders).
    // Note: Doesn't apply to shortcuts (.lnk files)
    // Possible values: none, symlinkedFiles, symlinkedFolders, both
    // >  Optional Argument Name: RESOLVE_SYMLINKS (string value)
    var resolveSymlinks = "none";
    // prependInsideQuotes: String to prepend to each file path inside quotes
    // >  Optional Argument Name: PREPEND_INSIDE_QUOTES (string value)
    var prependInsideQuotes = "";
    // prependOutsideQuotes: String to prepend to each file path outside quotes
    // >  Optional Argument Name: PREPEND_OUTSIDE_QUOTES (string value)
    var prependOutsideQuotes = "";
    // appendInsideQuotes: String to append to each file path inside quotes
    // >  Optional Argument Name: APPEND_INSIDE_QUOTES (string value)
    var appendInsideQuotes = "";
    // appendOutsideQuotes: String to append to each file path outside quotes
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

    if (clickData.func.args.got_arg.RESOLVE_SYMLINKS) {
        //Validate argument value
        argString = clickData.func.args.RESOLVE_SYMLINKS.toLowerCase();
        if (argString == "none" || argString == "symlinkedfiles" || argString == "symlinkedfolders" || argString == "both") {
            resolveSymlinks = argString;
        } else {
            resolveSymlinks = "none";
            DOpus.Output("ERROR: Invalid RESOLVE_SYMLINKS argument. Must be either 'none', 'symlinkedFiles', 'symlinkedFolders', or 'both'. Got: " + argString);
        }
        //DOpus.Output("Received RESOLVE_SYMLINKS argument: " + String(clickData.func.args.RESOLVE_SYMLINKS));
    }

    if (clickData.func.args.got_arg.FOLDER_TERMINATOR) {
        includeTrailingTerminator = clickData.func.args.FOLDER_TERMINATOR;
        //DOpus.Output("Received FOLDER_TERMINATOR argument");
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

	// Normalize variables to lower case
	multiLineQuoteMode = multiLineQuoteMode.toLowerCase();
	singleItemQuoteMode = singleItemQuoteMode.toLowerCase();
	resolveSymlinks = resolveSymlinks.toLowerCase();

    var clipboardText = "";
    // If single item is selected
    if (selectedItems.count == 1) {
        var singleItem = selectedItems(0);
        var filePath = String(singleItem.realpath);
        
        // Resolve symlink/junction if needed
        if (resolveSymlinks == "both" || (resolveSymlinks == "symlinkedfiles" && !singleItem.is_dir) || (resolveSymlinks == "symlinkedfolders" && singleItem.is_dir)) {
            var resolvedPath = DOpus.FSUtil.Resolve(String(singleItem.realpath), "j");
            filePath = String(resolvedPath);
        }
       
        if (singleItem.is_dir) {
            filePath += includeTrailingTerminator;
        }
        // If no spaces in the file path or option set to not use quotes
        if (singleItemQuoteMode != "always" && (filePath.indexOf(" ") == -1 || singleItemQuoteMode == "never")) {
            clipboardText = prependOutsideQuotes + prependInsideQuotes + filePath + appendInsideQuotes + appendOutsideQuotes;
        } else {
            // File path contains spaces or option set to always use quotes
            clipboardText = prependOutsideQuotes + '"' + prependInsideQuotes + filePath + appendInsideQuotes + '"' + appendOutsideQuotes;
        }
    } else {
        // Multiple items selected
        for (var i = 0; i < selectedItems.count; i++) {
            var filePath = String(selectedItems(i).realpath);

            // Resolve symlink/junction if needed
            if (resolveSymlinks == "both" || (resolveSymlinks == "symlinkedfiles" && !selectedItems(i).is_dir) || (resolveSymlinks == "symlinkedfolders" && selectedItems(i).is_dir)) {
                var resolvedPath = DOpus.FSUtil.Resolve(String(selectedItems(i).realpath), "j");
                filePath = String(resolvedPath);
            }
            
            if (selectedItems(i).is_dir) {
                filePath += includeTrailingTerminator;
            }
            //Add a newline character to the beginning starting after the first line
            if (i > 0) {
                clipboardText += "\n";
            }
            if (multiLineQuoteMode === "always") {
                clipboardText += prependOutsideQuotes + '"' + prependInsideQuotes + filePath + appendInsideQuotes + '"' + appendOutsideQuotes;
            } else if (multiLineQuoteMode === "auto" && filePath.indexOf(" ") !== -1) {
                clipboardText += prependOutsideQuotes + '"' + prependInsideQuotes + filePath + appendInsideQuotes + '"' + appendOutsideQuotes;
            } else {
                clipboardText += prependOutsideQuotes + prependInsideQuotes + filePath + appendInsideQuotes + appendOutsideQuotes;
            }
        }
    }

    DOpus.SetClip(clipboardText);
    // For debugging:
    //DOpus.Output("--- Copied to clipboard: ---\n" + clipboardText);
}
