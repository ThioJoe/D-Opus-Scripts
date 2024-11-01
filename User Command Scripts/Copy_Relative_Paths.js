// Copy the list of paths to selected files/folders, relative to current path (such as when using flat view)
// By ThioJoe
// Updated: 6/5/24 (First Version)

//   Argument Template:
//   INCLUDE_CURRENT_DIR/O/S,PREFIX/O,FOLDER_TERMINATOR/O

function OnClick(clickData)
{
    // ------- Options (These values will be used if no corresponding argument is specified when calling script --------
    // True/False - Whether or not to include the name of the current-level folder name as the first part of the relative path
    // >  Optional Argument Name: INCLUDE_CURRENT_DIR (Switch, no value needed)
    var includeCurrentFolderName = false;
    // This lets you prefix the relative paths with a string or character (such as a backslash) if you want. Or you can set it to a blank string.
    // Remember to escape if necessary (for backslash do two of them like "\\")
    // >  Optional Argument Name: PREFIX (string value)
    var prefix = "\\";
    // Sets which trailing path terminator to add (if any) to the end of full paths of folders (like the 'noterm' modifier). Doesn't apply to files.
    // Just set to empty string if none wanted. Don't forget to escape as necessary (to add a backslash would be like: "\\")
    // >  Optional Argument Name: FOLDER_TERMINATOR (string value)
    var trailingFolderTerminator = "\\";
    // -----------------------------------------------------------------------------------------------------------------
    // Example usage of arguments:
    // Copy_Relative_Paths INCLUDE_CURRENT_DIR PREFIX="\" FOLDER_TERM="\" 
    // -----------------------------------------------------------------------------------------------------------------

    // Parse optional arguments if they're there
    if (clickData.func.args.got_arg.INCLUDE_CURRENT_DIR) {
        includeCurrentFolderName = true;
        //DOpus.Output("Received INCLUDE_CURRENT_DIR argument");
    }
    if (clickData.func.args.got_arg.PREFIX) {
        prefix = clickData.func.args.PREFIX;
        //DOpus.Output("Received PREFIX argument");
    }
    if (clickData.func.args.got_arg.FOLDER_TERMINATOR) {
        trailingFolderTerminator = clickData.func.args.FOLDER_TERMINATOR;
        //DOpus.Output("Received FOLDER_TERMINATOR argument");
    }

    // For debugging
    //DOpus.Output("\n");
    //DOpus.Output("Include Current Dir: " + String(clickData.func.args.include_current_dir));
    //DOpus.Output("Prefix: " + String(clickData.func.args.prefix));
    //DOpus.Output("Folder Terminator: " + String(clickData.func.args.folder_terminator));
    //DOpus.Output("\n");
    
    var tab = clickData.func.sourcetab;
    var selectedItems = tab.selected;
    var sourcePathDepth = tab.path.Split.count;

    var initialDepth = 0;
    if (includeCurrentFolderName == true) {
        initialDepth = sourcePathDepth-1;
    } else {
        initialDepth = sourcePathDepth;
    }

    // For Debugging
    //DOpus.Output("Source Path: " + tab.path);
    //DOpus.Output("Source Path Depth: " + sourcePathDepth);

    var clipboardText = "";
    for (var i = 0; i < selectedItems.count; i++) {
        var relativePath = DOpus.FSUtil.NewPath();
        relativePath.set(selectedItems(i).realpath.Split(initialDepth));
        finalRelativePathString = prefix + String(relativePath);

        if (selectedItems(i).is_dir) {
            finalRelativePathString += trailingFolderTerminator;
        }
        
        // For Debugging
        //DOpus.Output("Original Path: " + String(selectedItems(i).realpath));
        //DOpus.Output("Relative Path: " + finalRelativePathString);
        
        //Add a newline character to the beginning starting after the first line
        if (i > 0) {
            clipboardText += "\n";
        }
        clipboardText += finalRelativePathString;
    }
    DOpus.SetClip(clipboardText);
}
