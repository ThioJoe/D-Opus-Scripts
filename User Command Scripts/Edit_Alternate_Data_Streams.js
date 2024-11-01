//  Argument Template:
//  OPENALL/S

// Optional Arguments:
//    OPENALL (Switch)
//    Opens all the streams at once

function OnClick(clickData) {
	// Choose a default editor if desired, otherwise leave as empty string
	var customEditorPath = ""
	
	// Check whether to use custom editor. Checks if the variable exists and not commented out, and also not empty
	var editorPath;
	if ((typeof customEditorPath != "undefined") && (customEditorPath)) {
		if (DOpus.FSUtil.Exists(customEditorPath)) {
			editorPath = customEditorPath;
		} else {
			DOpus.Output("customEditorPath value (" + customEditorPath + ") doesn't seem to exist, using notepad.exe as fallback");
			editorPath = "notepad.exe";
		}
	} else {
		editorPath = "notepad.exe";
	}

    // Set openAll to true or false, or use argument, depending on whether you want to open all streams without prompting
    var openAll = false;

	// Parse optional arguments if they're there
	if (clickData.func.args.got_arg.OPENALL) {
        openAll = true;
        //DOpus.Output("Received OPENALL argument");
    }

	// Don't deselect after using command
	clickData.func.command.deselect = false;

    var item = clickData.func.sourcetab.selected_files(0); // Get the first selected file
    if (!item) {
        //DOpus.Output("No file selected");
        return;
    }

    var fsUtil = DOpus.FSUtil;
    var adsNames = fsUtil.GetADSNames(item.RealPath);

    if (adsNames.count == 0) {
        //DOpus.Output("No alternate data streams found for the selected file.");
        return;
    }

    // Function to open all streams
    function openAllStreams(adsNames, item) {
        for (var i = 0; i < adsNames.count; i++) {
            var fullPathToADS = item.RealPath + adsNames(i); // Full path to ADS
            //var cmd = 'notepad.exe "' + fullPathToADS + '"';
			var cmd = editorPath + ' "' + fullPathToADS + '"';
            //DOpus.Output("Opening: " + fullPathToADS);
            clickData.func.command.RunCommand(cmd);
        }
    }

    // If openAll is true, automatically open all alternate data streams
    if (openAll) {
        openAllStreams(adsNames, item);
        return;
    }

    // Create a dialog to show the alternate data streams with an additional "Open All" button
    var dlg = clickData.func.Dlg;
    dlg.title = "Select Alternate Data Stream";
    dlg.message = "Select the ADS you want to edit or choose 'Open All':";
    dlg.buttons = "OK||Open All|Cancel"; // Added Open All button
    dlg.choices = adsNames; // Set the choices to the ADS names
    dlg.selection = 0; // Sets default selection to the first item in the dropdown
    dlg.icon = "info";

    var result = dlg.Show();
    //DOpus.Output("Result: " + result);
    
    // Handle the dialog result
    if (result == 2) { // Open All button pressed
        openAllStreams(adsNames, item);
        return;
    }
    
    if (result != 1) { // Cancel or close dialog
        //DOpus.Output("Operation cancelled.");
        return;
    }

    // Get the selected ADS by the index from the dropdown (dlg.selection is zero-based)
    var selectedADS = adsNames(dlg.selection);
    var fullPathToADS = item.RealPath + selectedADS; // No need to add another colon

    // Open the selected ADS in Notepad
    //var cmd = 'notepad.exe "' + fullPathToADS + '"';
	var cmd = editorPath + ' "' + fullPathToADS + '"';
    //DOpus.Output("Executing: " + cmd);
    clickData.func.command.RunCommand(cmd);
}
